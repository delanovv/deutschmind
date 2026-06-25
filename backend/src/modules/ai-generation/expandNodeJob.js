import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { query } from "../../db/pool.js";
import { upsertGeneratedBatch } from "../graph/graphRepository.js";
import { cacheGet, cacheSet } from "../jobs/redis.js";

const CollocationSchema = z.object({
  de: z.string(),
  ru: z.string(),
});

const ExampleSchema = z.object({
  de: z.string(),
  ru: z.string(),
});

const NodeSchema = z.object({
  clientId: z.string(),
  canonicalKey: z.string(),
  label: z.string(),
  type: z.enum(["word", "verb", "phrase", "concept"]),
  article: z.string().nullable(),
  plural: z.string().nullable(),
  cefr: z.enum(["A1", "A2", "B1", "B2", "C1"]),
  translationRu: z.string(),
  explanationRu: z.string(),
  collocations: z.array(CollocationSchema),
  examples: z.array(ExampleSchema),
});

const EdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  type: z.enum([
    "related_to",
    "verb_for",
    "collocation",
    "prerequisite",
    "opposite_of",
  ]),
  labelRu: z.string(),
});

const BatchSchema = z.object({
  web: z.object({
    name: z.string(),
    slug: z.string(),
    description: z.string(),
  }),
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
});

function normalizeArray(value) {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function validateCount(rawCount) {
  const count = Number(rawCount);

  if (!Number.isInteger(count) || count < 1 || count > 30) {
    throw new Error("Некорректный count. Допустимый диапазон: 1-30");
  }

  return count;
}

function buildSourceForAI(source) {
  return {
    clientId: "source",
    canonicalKey: source.canonical_key,
    label: source.label,
    type: source.type,
    article: source.article,
    plural: source.plural,
    cefr: source.cefr,
    translationRu: source.translation_ru,
    explanationRu: source.explanation_ru,
    collocations: normalizeArray(source.collocations),
    examples: normalizeArray(source.examples),
    webName: source.web_name,
  };
}

function buildSourceNode(source) {
  return {
    clientId: "source",
    canonicalKey: source.canonical_key,
    label: source.label,
    type: source.type,
    article: source.article,
    plural: source.plural,
    cefr: source.cefr,
    translationRu: source.translation_ru,
    explanationRu: source.explanation_ru,
    collocations: normalizeArray(source.collocations),
    examples: normalizeArray(source.examples),
  };
}

function normalizeCachedGenerated(value) {
  if (!value) return null;

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  return value;
}

function prepareBatchForDb(generated, source) {
  const sourceClientId = "source";
  const sourceNode = buildSourceNode(source);

  const batch = deepClone(generated);

  const sourceCanonicalKey = source.canonical_key;

  const generatedNodes = batch.nodes.filter(
    (node) =>
      node.clientId !== sourceClientId &&
      node.canonicalKey !== sourceCanonicalKey,
  );

  batch.nodes = [sourceNode, ...generatedNodes];

  const validClientIds = new Set(batch.nodes.map((node) => node.clientId));

  batch.edges = batch.edges
    .map((edge) => {
      let edgeSource = edge.source;
      let edgeTarget = edge.target;

      if (edgeSource === sourceCanonicalKey) {
        edgeSource = sourceClientId;
      }

      if (edgeTarget === sourceCanonicalKey) {
        edgeTarget = sourceClientId;
      }

      return {
        ...edge,
        source: edgeSource,
        target: edgeTarget,
      };
    })
    .filter((edge) => {
      return validClientIds.has(edge.source) && validClientIds.has(edge.target);
    });

  return batch;
}

async function generateVocabularyBatch({
  source,
  preferences,
  count,
  existing,
}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY не настроен");
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const sourceForAI = buildSourceForAI(source);

  const existingForAI = existing.map((row) => ({
    canonicalKey: row.canonical_key,
    label: row.label,
  }));
  console.log("Existing for AI:", existingForAI);
  const response = await client.chat.completions.parse({
    model: process.env.OPENAI_MODEL || "gpt-5.0-nano",
    messages: [
      {
        role: "system",
        content: `Создай небольшой пакет связанной немецкой лексики для персонального графа.

Правила:
- Соблюдай preferences пользователя.
- Не повторяй existing.
- Не включай исходный узел в nodes.
- Для связей с исходным узлом используй clientId "source".
- Для всех остальных связей используй clientId из nodes.
- edges.source и edges.target должны ссылаться только на clientId узлов.
- Не используй label или canonicalKey в edges.source / edges.target.
- Для существительных label должен содержать артикль.
- canonicalKey — нормализованный уникальный ключ.
- canonicalKey должен быть стабильным, lowercase, без артикля, желательно в форме леммы.
- Верни естественные связи, коллокации и примеры.
- Каждый example.de должен быть естественным немецким предложением, в котором слово или выражение реально употреблено по смыслу.
- example.ru должен быть естественным переводом всего предложения, а не переводом отдельного слова.
- Не используй мета-примеры вроде "Heute lerne ich ...", "Das Wort bedeutet ...", "Ich kenne das Wort ..." или предложения о процессе изучения языка.
- Пример должен показывать управление, сочетаемость или типичную жизненную ситуацию и содержать не менее четырёх слов.
- Не создавай слишком общие слова, если можно дать более полезные связанные слова.
- Все объяснения, переводы и подписи связей должны быть на русском языке.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          source: sourceForAI,
          preferences,
          count,
          existing: existingForAI,
        }),
      },
    ],
    response_format: zodResponseFormat(BatchSchema, "vocabulary_batch"),
  });
  console.log("OpenAI response:", response);
  const message = response.choices[0]?.message;

  if (message?.refusal) {
    throw new Error(`OpenAI отказался выполнить запрос: ${message.refusal}`);
  }

  const generated = message?.parsed;

  if (!generated) {
    throw new Error("OpenAI не вернул parsed structured output");
  }

  const usage = {
    model: response.model,
    inputTokens: response.usage?.prompt_tokens,
    outputTokens: response.usage?.completion_tokens,
  };

  return {
    generated,
    usage,
  };
}

export async function processExpandNodeJob({ userId, payload }) {
  const count = validateCount(payload.count);

  const sourceResult = await query(
    `SELECT 
       n.*,
       w.name AS web_name,
       u.preferences
     FROM nodes n
     JOIN users u ON u.id = n.user_id
     LEFT JOIN webs w ON w.id = n.web_id
     WHERE n.id = $1 
       AND n.user_id = $2`,
    [payload.nodeId, userId],
  );

  const source = sourceResult.rows[0];

  if (!source) {
    throw new Error("Исходный узел не найден");
  }

  const preferences = source.preferences ?? {};

  const cacheKey = `ai:expand:${source.canonical_key}:${JSON.stringify(
    preferences,
  )}:${count}`;

  let generated = normalizeCachedGenerated(await cacheGet(cacheKey));
  let usage = {};

  if (!generated) {
    const existingResult = await query(
      `SELECT canonical_key, label
       FROM nodes
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 500`,
      [userId],
    );

    const generatedResult = await generateVocabularyBatch({
      source,
      preferences,
      count,
      existing: existingResult.rows,
    });

    generated = generatedResult.generated;
    usage = generatedResult.usage;

    await cacheSet(cacheKey, generated, 7 * 24 * 3600);
  }

  const batchForDb = prepareBatchForDb(generated, source);

  const result = await upsertGeneratedBatch(
    userId,
    batchForDb.web,
    batchForDb.nodes,
    batchForDb.edges,
  );

  return {
    result,
    usage,
  };
}
