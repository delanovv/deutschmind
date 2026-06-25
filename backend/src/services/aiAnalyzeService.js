import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { normalizeText } from "./analyzeService.js";
import { getProfile } from "../store/graphStore.js";
import { isCefrAllowed, isNodeTypeAllowed, preferenceLabel } from "./learningPreferencesService.js";

const VocabularyItem = z.object({
  lemma: z.string(),
  display: z.string(),
  translationRu: z.string(),
  type: z.enum(["word", "verb", "phrase", "concept"]),
  cefr: z.enum(["A1", "A2", "B1", "B2", "C1"]),
  surfaceForms: z.array(z.string()),
  explanationRu: z.string(),
  grammarRu: z.string(),
  importance: z.enum(["high", "medium", "low"]),
  topicSuggestion: z.string(),
  relatedTerms: z.array(z.string()).max(8),
  collocations: z.array(z.object({ de: z.string(), ru: z.string() })),
  examples: z.array(z.object({ de: z.string(), ru: z.string() })),
  antonyms: z.array(z.string())
});

const AnalysisSchema = z.object({
  sourceText: z.string(),
  titleRu: z.string(),
  summaryRu: z.string(),
  textTypeRu: z.string(),
  difficulty: z.enum(["A1", "A2", "B1", "B2", "C1"]),
  vocabulary: z.array(VocabularyItem),
  usefulPhrases: z.array(z.object({
    de: z.string(),
    ru: z.string(),
    explanationRu: z.string()
  }))
});

const articleFree = (value) => normalizeText(value).replace(/^(der|die|das|den|dem|des|ein|eine|einen|einem|einer)\s+/, "");
const IMAGE_DATA_URL = /^data:image\/(jpeg|jpg|png|webp|gif);base64,/i;

function findExistingNode(item, graph) {
  const aliases = [item.lemma, item.display, ...item.surfaceForms].map(articleFree);
  return graph.nodes.find((node) => {
    if (node.type === "topic") return false;
    const nodeAliases = [node.label, node.id.replaceAll("-", " ")].map(articleFree);
    return aliases.some((alias) => nodeAliases.includes(alias));
  }) || null;
}

function buildSegments(text, vocabulary) {
  const forms = vocabulary.flatMap((item) =>
    item.surfaceForms.map((form) => ({ form, item }))
  ).filter(({ form }) => form.trim().length > 1)
    .sort((a, b) => b.form.length - a.form.length);

  if (!forms.length) return [{ text, status: "neutral", nodeId: null, vocabularyId: null }];
  const escaped = forms.map(({ form }) => form.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "giu");
  const lookup = new Map(forms.map(({ form, item }) => [form.toLocaleLowerCase("de-DE"), item]));

  return text.split(regex).filter(Boolean).map((part) => {
    const item = lookup.get(part.toLocaleLowerCase("de-DE"));
    return item
      ? { text: part, status: item.status, nodeId: item.nodeId, vocabularyId: item.id }
      : { text: part, status: "neutral", nodeId: null, vocabularyId: null };
  });
}

function buildResult(parsed, sourceText, graph) {
  const preferences = getProfile().learningPreferences;
  const usefulPhrases = preferences.includePhrases ? parsed.usefulPhrases : [];
  const knownContent = graph.nodes
    .filter((node) => node.type !== "topic" && node.status === "known")
    .map((node) => articleFree(node.label))
    .filter((label) => label.length > 3);
  const containsKnownContent = (text) => {
    const normalized = ` ${normalizeText(text)} `;
    return knownContent.some((label) => normalized.includes(` ${label} `));
  };
  const vocabulary = parsed.vocabulary
    .filter((item) => isCefrAllowed(item.cefr, preferences) && isNodeTypeAllowed(item.type, preferences))
    .map((item, index) => {
    const existing = findExistingNode(item, graph);
    return {
      ...item,
      examples: item.examples.filter((example) => !containsKnownContent(example.de)),
      id: `ai-vocab-${index}`,
      nodeId: existing?.id || null,
      status: existing?.status || "new",
      alreadyInMap: Boolean(existing)
    };
  });
  const highlightedTokens = buildSegments(sourceText, vocabulary);
  const knownWords = vocabulary.filter((item) => item.status === "known");
  const boundaryWords = vocabulary.filter((item) => item.status === "boundary");
  const unknownWords = vocabulary.filter((item) => item.status === "unknown" || item.status === "new");

  return {
    provider: "openai",
    sourceText,
    titleRu: parsed.titleRu,
    summaryRu: parsed.summaryRu,
    textTypeRu: parsed.textTypeRu,
    difficulty: parsed.difficulty,
    vocabulary,
    usefulPhrases,
    knownWords,
    boundaryWords,
    unknownWords,
    recommendedWords: unknownWords.filter((item) => item.importance !== "low").slice(0, 10),
    matchedPhrases: usefulPhrases.map((phrase) => ({
      node: { id: null, label: phrase.de, translationRu: phrase.ru },
      collocations: [{ de: phrase.de, ru: phrase.ru }],
      explanationRu: phrase.explanationRu
    })),
    summary: {
      totalTokens: sourceText.trim() ? sourceText.trim().split(/\s+/).length : 0,
      knownCount: knownWords.length,
      boundaryCount: boundaryWords.length,
      unknownCount: unknownWords.length
    },
    highlightedTokens
  };
}

const analysisInstructions = `Ты лингвистический анализатор немецкого материала для русскоязычного пользователя.
Сначала точно восстанови исходный немецкий текст в sourceText, сохрани абзацы, пунктуацию и ä ö ü ß.
Если материал является упражнением, отделяй инструкции от основного текста, но сохраняй всё в sourceText.
Выделяй только полезную для изучения лексику: смысловые существительные, глаголы, прилагательные,
наречия, устойчивые сочетания и фразовые конструкции.
Не включай отдельно артикли, местоимения, числа, имена людей, адреса, буквы вариантов ответа,
частые служебные слова, разорванные переносом части слова и случайные визуальные артефакты.
Распознавай лемму независимо от склонения, спряжения, разделяемой формы и регистра.
surfaceForms должны содержать точные формы, реально встречающиеся в sourceText.
Не придумывай контекстно неверный перевод. Для существительных display должен включать артикль.
CEFR относится только к конкретному слову или фразе.
Для каждого элемента укажи topicSuggestion — конкретную смысловую тему вроде Behörde, Wohnung, Gesundheit, Reisen или новую узкую тему.
В relatedTerms добавь до 8 немецких слов и выражений, которые семантически близки элементу и помогут встроить его в паутину знаний.
В учебных examples не используй содержательную лексику из текущей карты со status known. Служебные слова, артикли, местоимения и вспомогательные глаголы допустимы.
Не используй темы "Личное", "Разное", "Другое" или "Новые слова".`;

async function runOpenAIAnalysis({ text, image, graph }) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY не настроен на backend");
  const compactGraph = graph.nodes
    .filter((node) => node.type !== "topic")
    .map((node) => ({ id: node.id, label: node.label, status: node.status }));
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const preferences = getProfile().learningPreferences;
  const userContent = image
    ? [
        {
          type: "input_text",
          text: `Непосредственно проанализируй фотографию немецкого материала.
Для учебной выдачи выбирай лексику только диапазона ${preferenceLabel(preferences)}.
Типы для выдачи: слова и понятия${preferences.includeVerbs ? ", глаголы" : ""}${preferences.includePhrases ? ", фразы" : ""}.
Не ограничивайся распознаванием символов: пойми структуру, предложения, переносы и учебный контекст.
Текущая карта пользователя: ${JSON.stringify(compactGraph)}`
        },
        { type: "input_image", image_url: image, detail: "high" }
      ]
    : `Проанализируй немецкий текст.
Для учебной выдачи выбирай лексику только диапазона ${preferenceLabel(preferences)}.
Типы для выдачи: слова и понятия${preferences.includeVerbs ? ", глаголы" : ""}${preferences.includePhrases ? ", фразы" : ""}.

Текущая карта пользователя:
${JSON.stringify(compactGraph)}

Исходный текст:
${text.slice(0, 12000)}`;

  const response = await client.responses.parse({
    model: process.env.OPENAI_MODEL || "gpt-5.5",
    reasoning: { effort: "low" },
    text: {
      verbosity: "low",
      format: zodTextFormat(AnalysisSchema, "german_material_analysis")
    },
    input: [
      { role: "system", content: analysisInstructions },
      { role: "user", content: userContent }
    ]
  });
  return response.output_parsed;
}

export async function analyzeTextWithAI(text, graph) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY не настроен на backend");
  }
  const parsed = await runOpenAIAnalysis({ text, graph });
  return buildResult(parsed, text, graph);
}

export async function analyzeImageWithAI(image, graph) {
  if (typeof image !== "string" || !IMAGE_DATA_URL.test(image)) {
    throw new Error("Поддерживаются изображения JPEG, PNG, WebP и GIF");
  }
  if (image.length > 10_000_000) {
    throw new Error("Фотография слишком большая. Выбери изображение меньшего размера");
  }
  const parsed = await runOpenAIAnalysis({ image, graph });
  const sourceText = parsed.sourceText.trim();
  if (!sourceText) throw new Error("На фотографии не найден немецкий текст");
  return buildResult(parsed, sourceText, graph);
}
