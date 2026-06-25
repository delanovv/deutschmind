import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { addNodeRelation, addNodeWithPlacement, getGraph, getNodeById } from "./graphService.js";
import { getProfile } from "../store/graphStore.js";
import { isCefrAllowed, isNodeTypeAllowed, preferenceLabel } from "./learningPreferencesService.js";

const RelatedWordSchema = z.object({
  label: z.string(),
  translationRu: z.string(),
  type: z.enum(["word", "verb", "phrase", "concept"]),
  cefr: z.enum(["A1", "A2", "B1", "B2", "C1"]),
  plural: z.string().nullable(),
  explanationRu: z.string(),
  relationType: z.enum(["related_to", "verb_for", "collocation", "prerequisite", "opposite_of"]),
  relationLabelRu: z.string(),
  collocations: z.array(z.object({ de: z.string(), ru: z.string() })).max(4),
  examples: z.array(z.object({ de: z.string(), ru: z.string() })).max(2),
  topicSuggestion: z.string()
});

const normalize = (value) => String(value || "")
  .toLocaleLowerCase("de-DE")
  .replace(/^(der|die|das)\s+/, "")
  .replace(/[^\p{L}\p{N}]+/gu, " ")
  .trim();

function findExisting(label, graph) {
  const normalized = normalize(label);
  return graph.nodes.find((node) => node.type !== "topic" && normalize(node.label) === normalized);
}

function existingContinuation(sourceId, graph, profile) {
  const continuation = graph.nodes.find((node) =>
    node.generatedFromNodeId === sourceId
    && (!node.ownerProfileId || node.ownerProfileId === profile.profileId)
    && isCefrAllowed(node.cefr, profile.learningPreferences)
    && isNodeTypeAllowed(node.type, profile.learningPreferences)
  );
  if (!continuation) return null;
  return {
    node: continuation,
    created: false,
    reasonRu: "Это продолжение уже было найдено раньше."
  };
}

function knownContentLabels(graph, sourceId) {
  return graph.nodes
    .filter((node) => node.type !== "topic" && node.status === "known" && node.id !== sourceId)
    .map((node) => node.label)
    .slice(0, 180);
}

function exampleContainsKnownContent(example, knownLabels) {
  const normalizedExample = normalize(example);
  return knownLabels.some((label) => {
    const word = normalize(label);
    return word.length > 3 && new RegExp(`(^|\\s)${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|\\s)`, "u").test(normalizedExample);
  });
}

export async function generateRelatedUnknownNode(sourceId) {
  const graph = getGraph();
  const profile = getProfile();
  const preferences = profile.learningPreferences;
  const source = getNodeById(sourceId);
  if (!source || source.type === "topic") throw new Error("Исходное слово не найдено");

  const previous = existingContinuation(sourceId, graph, profile);
  if (previous) return previous;
  if (!process.env.OPENAI_API_KEY) throw new Error("Для продолжения ветки нужен OPENAI_API_KEY на backend");

  const knownLabels = knownContentLabels(graph, sourceId);
  const existingLabels = graph.nodes.filter((node) => node.type !== "topic").map((node) => node.label);
  const nearby = graph.edges
    .filter((edge) => edge.source === sourceId || edge.target === sourceId)
    .map((edge) => getNodeById(edge.source === sourceId ? edge.target : edge.source))
    .filter((node) => node && node.type !== "topic")
    .map((node) => ({ label: node.label, status: node.status, topic: node.topic }));

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.parse({
    model: process.env.OPENAI_MODEL || "gpt-5.5",
    reasoning: { effort: "low" },
    text: {
      verbosity: "low",
      format: zodTextFormat(RelatedWordSchema, "related_unknown_word")
    },
    input: [
      {
        role: "system",
        content: `Ты продолжаешь смысловую ветку персонального графа немецкой лексики.
Верни ровно один новый полезный элемент: близкое слово, типичный глагол, устойчивую фразу, prerequisite или естественный антоним.
Допустимый диапазон сложности нового элемента: ${preferenceLabel(preferences)}. Никогда не выходи за него.
Разрешённые типы: слово, понятие${preferences.includeVerbs ? ", глагол" : ""}${preferences.includePhrases ? ", фраза" : ""}. ${preferences.includeAntonyms ? "Антонимы разрешены." : "Не предлагай антонимы."}
Элемент должен быть новым для карты и находиться рядом с исходным словом по смыслу.
Не выбирай слово только из-за одинакового уровня CEFR.
Примеры должны тренировать новый элемент. Не используй в примерах содержательные слова, которые пользователь уже знает и которые перечислены в knownLabels.
Служебные слова, артикли, местоимения и вспомогательные глаголы допустимы.
Для существительного обязательно добавь артикль в label. Не создавай темы "Личное", "Разное" или "Другое".`
      },
      {
        role: "user",
        content: JSON.stringify({
          source: {
            label: source.label,
            translationRu: source.translationRu,
            explanationRu: source.explanationRu,
            type: source.type,
            cefr: source.cefr,
            topic: source.topic,
            collocations: source.collocations
          },
          nearby,
          knownLabels,
          forbiddenExistingLabels: existingLabels.slice(0, 300)
        })
      }
    ]
  });

  const generated = response.output_parsed;
  if (!isCefrAllowed(generated.cefr, preferences)) {
    throw new Error(`AI предложил ${generated.cefr}, но в настройках выбран диапазон ${preferenceLabel(preferences)}. Попробуй ещё раз.`);
  }
  if (!isNodeTypeAllowed(generated.type, preferences) || (!preferences.includeAntonyms && generated.relationType === "opposite_of")) {
    throw new Error("AI предложил тип элемента, который отключён в настройках. Попробуй ещё раз.");
  }
  const duplicate = findExisting(generated.label, graph);
  if (duplicate) {
    if (duplicate.status === "known" || !isCefrAllowed(duplicate.cefr, preferences)) {
      throw new Error("AI предложил уже известное слово. Нажми повторить, чтобы найти другое.");
    }
    addNodeRelation(source.id, duplicate.id, generated.relationType, generated.relationLabelRu);
    return {
      node: duplicate,
      created: false,
      reasonRu: "AI нашёл близкое слово, которое уже было в карте."
    };
  }

  const safeExamples = generated.examples.filter((example) =>
    !exampleContainsKnownContent(example.de, knownLabels)
  );
  const node = addNodeWithPlacement({
    ...generated,
    examples: safeExamples,
    knowledgeScore: 10,
    source: `ai-branch:${source.id}`,
    generatedFromNodeId: source.id,
    userAdded: true
  }, {
    topic: generated.topicSuggestion || source.topic,
    createTopic: generated.topicSuggestion !== source.topic,
    relatedNodeIds: [source.id]
  });
  addNodeRelation(source.id, node.id, generated.relationType, generated.relationLabelRu);

  return {
    node,
    created: true,
    reasonRu: `AI добавил новое продолжение ветки от «${source.label}».`
  };
}
