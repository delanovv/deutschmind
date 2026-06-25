import OpenAI from "openai";
import { addNodeRelation, addPersonalNodes, getGraph } from "./graphService.js";
import { getProfile } from "../store/graphStore.js";
import { isCefrAllowed, isNodeTypeAllowed, preferenceLabel } from "./learningPreferencesService.js";

const FALLBACK_WORDS = [
  ["die Voraussetzung", "предпосылка, условие", "word", "B2"],
  ["berücksichtigen", "учитывать", "verb", "B2"],
  ["die Vorgehensweise", "порядок действий, подход", "word", "B2"],
  ["in Betracht ziehen", "принимать во внимание", "phrase", "B2"],
  ["zur Verfügung stehen", "быть в распоряжении", "phrase", "B2"],
  ["die Rückmeldung", "обратная связь, ответ", "word", "B1"],
  ["nachvollziehbar", "понятный, логически объяснимый", "concept", "B2"],
  ["gegebenenfalls", "при необходимости", "concept", "B2"],
  ["etwas in Anspruch nehmen", "воспользоваться чем-либо", "phrase", "B2"],
  ["die Zuständigkeit", "компетенция, зона ответственности", "word", "B2"],
  ["sich auseinandersetzen mit", "подробно разбираться с", "verb", "B2"],
  ["einen Beitrag leisten", "внести вклад", "phrase", "B2"]
];

function extractJson(text) {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start < 0 || end < 0) throw new Error("AI не вернул список слов");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function expandVocabulary({ topic = "повседневная жизнь", count = 15 }) {
  const graph = getGraph();
  const preferences = getProfile().learningPreferences;
  const existing = new Set(graph.nodes.map((node) => node.label.toLowerCase()));
  let generated;

  if (process.env.OPENAI_API_KEY) {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      instructions: `Создай полезную немецкую лексику диапазона ${preferenceLabel(preferences)} для русскоязычного пользователя.
Разрешённые типы: слова и понятия${preferences.includeVerbs ? ", глаголы" : ""}${preferences.includePhrases ? ", устойчивые фразы" : ""}. ${preferences.includeAntonyms ? "Добавляй естественные антонимы." : "Антонимы не добавляй."}
Верни только JSON-массив. Каждый объект: label, translationRu, type (word|verb|phrase|concept), cefr,
plural или null, explanationRu, collocations (массив {de,ru}), examples (массив {de,ru}).
Каждый examples.de — естественное немецкое предложение с реальным употреблением элемента в бытовом, рабочем или общественном контексте.
Каждый examples.ru — перевод всего предложения. Не используй мета-фразы об изучении слова: "Heute lerne ich ...", "Das Wort bedeutet ...", "Ich kenne das Wort ...".
Добавь antonyms как массив немецких слов, только когда естественный антоним действительно существует.
Предпочитай частотные слова, глаголы, управление, устойчивые выражения, антонимы и естественные предложения.
Не составляй учебный курс и не описывай уровень пользователя: cefr указывается только у каждого отдельного элемента.`,
      input: `Тема: ${topic}. Нужно ${Math.min(Number(count) || 15, 30)} элементов.
Не повторяй эти слова: ${[...existing].slice(0, 200).join(", ")}`
    });
    generated = extractJson(response.output_text);
  } else {
    generated = FALLBACK_WORDS.filter(([, , , cefr]) => isCefrAllowed(cefr, preferences)).map(([label, translationRu, type, cefr]) => ({
      label, translationRu, type, cefr,
      explanationRu: `Полезное выражение по теме «${topic}».`,
      collocations: [], examples: []
    }));
  }

  let added = [];
  const pending = [];
  for (const item of generated.slice(0, Math.min(Number(count) || 15, 30))) {
    if (!item?.label || !isCefrAllowed(item.cefr, preferences) || !isNodeTypeAllowed(item.type, preferences) || existing.has(item.label.toLowerCase())) continue;
    existing.add(item.label.toLowerCase());
    pending.push({ ...item, topicSuggestion: topic, source: `expansion:${topic}` });
  }
  added = await addPersonalNodes(pending);
  const sourceItems = pending.map((item, index) => ({ item, node: added[index] }));
  const allNodes = getGraph().nodes;
  const byLabel = new Map(allNodes.map((node) => [node.label.toLowerCase(), node.id]));
  sourceItems.forEach(({ item, node }) => {
    (item.antonyms || []).forEach((label) => {
      const target = byLabel.get(String(label).toLowerCase());
      if (target) addNodeRelation(node.id, target, "opposite_of", "противоположное значение");
    });
  });
  return { topic, added, provider: process.env.OPENAI_API_KEY ? "openai" : "mock" };
}
