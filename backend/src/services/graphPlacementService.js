import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const PlacementSchema = z.object({
  placements: z.array(z.object({
    index: z.number().int(),
    topic: z.string(),
    createTopic: z.boolean(),
    relatedNodeIds: z.array(z.string()).max(6)
  }))
});

const normalize = (value) => String(value || "")
  .toLocaleLowerCase("de-DE")
  .replace(/^(der|die|das)\s+/, "")
  .replace(/[^\p{L}\p{N}]+/gu, " ")
  .trim();

function fallbackPlacement(item, graph) {
  const topics = graph.nodes.filter((node) => node.type === "topic");
  const words = graph.nodes.filter((node) => node.type !== "topic");
  const haystack = normalize([
    item.label,
    item.translationRu,
    item.explanationRu,
    ...(item.relatedTerms || [])
  ].join(" "));

  const scoredTopics = topics.map((topic) => {
    const members = words.filter((node) => node.topic === topic.label);
    const tokens = new Set(
      [topic.label, topic.translationRu, ...members.flatMap((node) => [node.label, node.translationRu])]
        .flatMap((value) => normalize(value).split(" "))
        .filter((token) => token.length > 3)
    );
    const score = [...tokens].reduce((total, token) => total + (haystack.includes(token) ? 1 : 0), 0);
    return { topic: topic.label, score, members };
  }).sort((a, b) => b.score - a.score);

  const suggested = String(item.topicSuggestion || item.topic || "").trim();
  const exactTopic = topics.find((topic) => normalize(topic.label) === normalize(suggested));
  const winner = exactTopic
    ? { topic: exactTopic.label, score: 10, members: words.filter((node) => node.topic === exactTopic.label) }
    : scoredTopics[0];
  const specificFallback = `Wortfeld: ${String(item.translationRu || item.label || "Deutsch").split(/[,;—-]/)[0].trim()}`;
  const topic = winner?.score > 0 ? winner.topic : (suggested || specificFallback);
  const createTopic = !topics.some((node) => normalize(node.label) === normalize(topic));
  const relatedNodeIds = words
    .filter((node) => node.topic === topic)
    .map((node) => ({
      id: node.id,
      score: normalize(node.label).split(" ").filter((token) => token.length > 3 && haystack.includes(token)).length
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((node) => node.id);

  return { topic, createTopic, relatedNodeIds };
}

export async function placeNodesInGraph(items, graph) {
  const fallback = items.map((item) => fallbackPlacement(item, graph));
  if (!process.env.OPENAI_API_KEY || !items.length) return fallback;

  const topics = graph.nodes
    .filter((node) => node.type === "topic")
    .map((topic) => ({
      topic: topic.label,
      examples: graph.nodes
        .filter((node) => node.type !== "topic" && node.topic === topic.label)
        .slice(0, 8)
        .map((node) => ({ id: node.id, label: node.label, translationRu: node.translationRu }))
    }));

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.parse({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      reasoning: { effort: "low" },
      text: {
        verbosity: "low",
        format: zodTextFormat(PlacementSchema, "knowledge_graph_placement")
      },
      input: [
        {
          role: "system",
          content: `Ты распределяешь немецкую лексику по смысловым паутинам графа знаний.
Выбирай существующую тему, если слово естественно к ней относится.
Если ни одна тема не подходит, придумай короткое понятное название новой темы на русском или немецком и поставь createTopic=true.
relatedNodeIds должны содержать только действительно близкие слова: коллокации, типичные глаголы, антонимы или понятия того же контекста.
Не создавай темы "Личное", "Разное", "Другое" или "Новые слова".`
        },
        {
          role: "user",
          content: JSON.stringify({
            topics,
            items: items.map((item, index) => ({
              index,
              label: item.label,
              translationRu: item.translationRu,
              explanationRu: item.explanationRu,
              suggestedTopic: item.topicSuggestion || item.topic || null,
              relatedTerms: item.relatedTerms || []
            }))
          })
        }
      ]
    });
    const byIndex = new Map(response.output_parsed.placements.map((placement) => [placement.index, placement]));
    return items.map((item, index) => byIndex.get(index) || fallback[index]);
  } catch (error) {
    console.warn("AI graph placement fallback:", error.message);
    return fallback;
  }
}
