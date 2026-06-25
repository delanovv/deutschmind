import { isCefrAllowed, isNodeTypeAllowed } from "./learningPreferencesService.js";

const sameEdge = (edge, nodeId) => edge.source === nodeId || edge.target === nodeId;
const otherEnd = (edge, nodeId) => edge.source === nodeId ? edge.target : edge.source;

export function getRelatedKnownWords(node, graph) {
  const nodeMap = new Map(graph.nodes.map((item) => [item.id, item]));
  return [...new Set(graph.edges
    .filter((edge) => sameEdge(edge, node.id))
    .map((edge) => nodeMap.get(otherEnd(edge, node.id)))
    .filter((item) => item && item.type !== "topic" && item.status === "known")
    .map((item) => item.label))];
}

export function calculateProximityScore(node, graph, profile = {}) {
  const nodeMap = new Map(graph.nodes.map((item) => [item.id, item]));
  const knownConnections = graph.edges
    .filter((edge) => sameEdge(edge, node.id))
    .map((edge) => nodeMap.get(otherEnd(edge, node.id)))
    .filter((item) => item?.status === "known").length;
  const boundaryBonus = node.status === "boundary" ? 2 : 0;
  const importedBonus = node.userAdded ? 5 : 0;
  return knownConnections * 10 + boundaryBonus + importedBonus;
}

export function getBoundaryNodes(graph, profile = {}) {
  const nodeMap = new Map(graph.nodes.map((item) => [item.id, item]));
  const preferences = profile.learningPreferences;
  return graph.nodes
    .filter((node) => {
      if (node.type === "topic") return false;
      if (!isCefrAllowed(node.cefr, preferences)) return false;
      if (!isNodeTypeAllowed(node.type, preferences)) return false;
      if (node.status === "boundary") return true;
      if (node.status !== "unknown") return false;
      return graph.edges
        .filter((edge) => sameEdge(edge, node.id))
        .some((edge) => nodeMap.get(otherEnd(edge, node.id))?.status === "known");
    })
    .map((node) => {
      const relatedKnownWords = getRelatedKnownWords(node, graph);
      const reasonRu = relatedKnownWords.length
        ? `Это слово связано с тем, что ты уже знаешь: ${relatedKnownWords.join(", ")}.`
        : "Это слово находится рядом с уже знакомыми словами и полезно для расширения словаря.";
      return {
        node,
        proximityScore: calculateProximityScore(node, graph, profile),
        reasonRu
      };
    })
    .sort((a, b) => b.proximityScore - a.proximityScore || b.node.knowledgeScore - a.node.knowledgeScore)
    .slice(0, 10);
}

export function getRecommendations(graph, profile = {}) {
  return getBoundaryNodes(graph, profile).slice(0, 6).map((item) => {
    const relatedKnownWords = getRelatedKnownWords(item.node, graph);
    const knownText = relatedKnownWords.length
      ? `Ты уже знаешь ${relatedKnownWords.join(" и ")}, поэтому ${item.node.label} находится рядом с твоей текущей границей.`
      : `${item.node.label} дополняет ближайшую область твоей карты знаний.`;
    const suggestedCollocations = item.node.collocations || [];
    return {
      ...item,
      reasonRu: knownText,
      relatedKnownWords,
      suggestedCollocations,
      nextActionRu: suggestedCollocations.length
        ? `Выучи фразу «${suggestedCollocations[0].de}», а не только отдельное слово.`
        : `Открой карточку и запомни слово «${item.node.label}» в примере.`
    };
  });
}
