import { appendMemoryEvent, getGraphState, getProfile, setGraphState, setProfile } from "../store/graphStore.js";
import { generateSeedGraph } from "./seedGenerationService.js";
import { placeNodesInGraph } from "./graphPlacementService.js";

const STATUS_SCORES = { known: 90, boundary: 50, unknown: 10 };

export function recalculateStatus(score) {
  if (score >= 70) return "known";
  if (score >= 30) return "boundary";
  return "unknown";
}

export function getGraph() {
  return getGraphState();
}

export function getNodeById(id) {
  return getGraphState().nodes.find((node) => node.id === id);
}

export function updateNodeKnowledge(id, payload = {}) {
  const graph = getGraphState();
  const node = graph.nodes.find((item) => item.id === id);
  if (!node) return null;
  const rawScore = payload.knowledgeScore ?? STATUS_SCORES[payload.status];
  if (!Number.isFinite(Number(rawScore))) {
    throw new Error("knowledgeScore должен быть числом от 0 до 100");
  }
  const score = Math.max(0, Math.min(100, Number(rawScore)));
  node.knowledgeScore = score;
  node.status = recalculateStatus(score);
  node.seenCount += 1;
  if (node.status === "known") node.correctCount += 1;
  node.lastSeenAt = new Date().toISOString();
  setGraphState(graph);
  appendMemoryEvent({
    type: "knowledge_updated",
    nodeId: node.id,
    label: node.label,
    score,
    status: node.status
  });
  return node;
}

const slugify = (value) => String(value || "")
  .toLocaleLowerCase("de-DE")
  .replace(/^(der|die|das)\s+/i, "")
  .replace(/[ä]/g, "ae").replace(/[ö]/g, "oe").replace(/[ü]/g, "ue").replace(/[ß]/g, "ss")
  .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function ensureTopic(graph, topicName, cefr = "B1") {
  const normalized = String(topicName || "").trim() || "Neue Sprache";
  let topicNode = graph.nodes.find((node) => node.type === "topic" && node.label.toLocaleLowerCase("de-DE") === normalized.toLocaleLowerCase("de-DE"));
  if (topicNode) return topicNode;

  const topicCount = graph.nodes.filter((node) => node.type === "topic").length;
  const centerX = 130 + (topicCount % 2) * 245;
  const centerY = 100 + Math.floor(topicCount / 2) * 205;
  let id = `topic-${slugify(normalized) || `web-${topicCount + 1}`}`;
  if (graph.nodes.some((node) => node.id === id)) id = `${id}-${topicCount + 1}`;
  topicNode = {
    id,
    label: normalized,
    type: "topic",
    lang: "de",
    article: null,
    plural: null,
    cefr: null,
    topic: normalized,
    status: "boundary",
    knowledgeScore: 50,
    seenCount: 0,
    correctCount: 0,
    lastSeenAt: null,
    translationRu: normalized,
    explanationRu: `Смысловая паутина «${normalized}», созданная для связанной лексики.`,
    related: [],
    collocations: [],
    examples: [],
    generated: true,
    position: { x: centerX, y: centerY }
  };
  graph.nodes.push(topicNode);
  return topicNode;
}

function addPlacedNode(payload = {}, placement = {}) {
  const label = String(payload.label || "").trim();
  if (!label) throw new Error("Немецкое слово или фраза обязательны");
  const graph = getGraphState();
  const idBase = slugify(label);
  let id = idBase || `personal-${Date.now()}`;
  if (graph.nodes.some((node) => node.id === id)) id = `${id}-${Date.now().toString().slice(-5)}`;
  const score = Number.isFinite(Number(payload.knowledgeScore)) ? Math.max(0, Math.min(100, Number(payload.knowledgeScore))) : 10;
  const topicNode = ensureTopic(graph, placement.topic || payload.topicSuggestion || payload.topic, payload.cefr);
  const topicNodes = graph.nodes.filter((node) => node.type !== "topic" && node.topic === topicNode.label);
  const angle = (topicNodes.length * 2.399) % (Math.PI * 2);
  const ring = 78 + Math.floor(topicNodes.length / 8) * 34;
  const article = label.match(/^(der|die|das)\s/i)?.[1] || payload.article || null;
  const node = {
    id, label, type: payload.type || "word", lang: "de", article,
    plural: payload.plural || null, cefr: payload.cefr || "B1", topic: topicNode.label,
    status: recalculateStatus(score), knowledgeScore: score, seenCount: 0, correctCount: 0,
    lastSeenAt: null, translationRu: payload.translationRu || "Перевод не добавлен",
    explanationRu: payload.explanationRu || "Слово из добавленного тобой материала.",
    related: payload.related || [], collocations: payload.collocations || [],
    examples: payload.examples || [], source: payload.source || "manual",
    userAdded: true,
    ownerProfileId: getProfile().profileId || "local-default",
    generatedFromNodeId: payload.generatedFromNodeId || null,
    position: {
      x: Math.round(topicNode.position.x + Math.cos(angle) * ring),
      y: Math.round(topicNode.position.y + Math.sin(angle) * ring * .88)
    }
  };
  graph.nodes.push(node);
  graph.edges.push({
    id: `${topicNode.id}-${id}`, source: topicNode.id, target: id,
    type: "parent_of", labelRu: "принадлежит смысловой паутине"
  });
  [...new Set([...(payload.related || []), ...(placement.relatedNodeIds || [])])].forEach((target) => {
    if (graph.nodes.some((item) => item.id === target)) {
      graph.edges.push({ id: `related-${id}-${target}`, source: id, target, type: "related_to", labelRu: "связано по смыслу" });
    }
  });
  setGraphState(graph);
  appendMemoryEvent({ type: "node_added", nodeId: id, label, source: node.source, topic: node.topic });
  return node;
}

export async function addPersonalNode(payload = {}) {
  const graph = getGraphState();
  const [placement] = await placeNodesInGraph([payload], graph);
  return addPlacedNode(payload, placement);
}

export function addNodeWithPlacement(payload = {}, placement = {}) {
  return addPlacedNode(payload, placement);
}

export async function addPersonalNodes(payloads = []) {
  const graph = getGraphState();
  const placements = await placeNodesInGraph(payloads, graph);
  return payloads.map((payload, index) => addPlacedNode(payload, placements[index]));
}

export function deletePersonalNode(id) {
  const graph = getGraphState();
  const node = graph.nodes.find((item) => item.id === id);
  if (!node || !node.userAdded) return false;
  graph.nodes = graph.nodes.filter((item) => item.id !== id);
  graph.edges = graph.edges.filter((edge) => edge.source !== id && edge.target !== id);
  const topicHasMembers = graph.nodes.some((item) => item.type !== "topic" && item.topic === node.topic);
  const topicNode = graph.nodes.find((item) => item.type === "topic" && item.label === node.topic);
  if (!topicHasMembers && topicNode?.generated) {
    graph.nodes = graph.nodes.filter((item) => item.id !== topicNode.id);
    graph.edges = graph.edges.filter((edge) => edge.source !== topicNode.id && edge.target !== topicNode.id);
  }
  setGraphState(graph);
  appendMemoryEvent({ type: "node_deleted", nodeId: id, label: node.label });
  return true;
}

export function updatePersonalNode(id, payload = {}) {
  const graph = getGraphState();
  const node = graph.nodes.find((item) => item.id === id);
  if (!node || !node.userAdded) return null;
  ["label", "translationRu", "explanationRu", "plural", "cefr", "type"].forEach((field) => {
    if (payload[field] !== undefined) node[field] = payload[field];
  });
  if (Array.isArray(payload.collocations)) node.collocations = payload.collocations;
  if (Array.isArray(payload.examples)) node.examples = payload.examples;
  node.article = node.label.match(/^(der|die|das)\s/i)?.[1] || null;
  setGraphState(graph);
  appendMemoryEvent({ type: "node_edited", nodeId: id, label: node.label });
  return node;
}

export function addNodeRelation(source, target, type = "related_to", labelRu = "связано") {
  const graph = getGraphState();
  if (!graph.nodes.some((node) => node.id === source) || !graph.nodes.some((node) => node.id === target)) return false;
  if (graph.edges.some((edge) => edge.source === source && edge.target === target && edge.type === type)) return true;
  graph.edges.push({ id: `${type}-${source}-${target}`, source, target, type, labelRu });
  setGraphState(graph);
  return true;
}

export async function reorganizeUserNodes() {
  const graph = getGraphState();
  const userNodes = graph.nodes.filter((node) => node.type !== "topic" && node.userAdded);
  if (!userNodes.length) return { graph, moved: 0, createdTopics: [] };

  const beforeTopics = new Set(graph.nodes.filter((node) => node.type === "topic").map((node) => node.label));
  const placements = await placeNodesInGraph(userNodes, graph);
  const userIds = new Set(userNodes.map((node) => node.id));
  graph.edges = graph.edges.filter((edge) => !(edge.type === "parent_of" && userIds.has(edge.target)));

  userNodes.forEach((node, index) => {
    const placement = placements[index] || {};
    const topicNode = ensureTopic(graph, placement.topic || node.topic, node.cefr);
    const peers = graph.nodes.filter((item) => item.type !== "topic" && item.topic === topicNode.label && item.id !== node.id);
    const angle = (peers.length * 2.399) % (Math.PI * 2);
    const ring = 78 + Math.floor(peers.length / 8) * 34;
    node.topic = topicNode.label;
    node.position = {
      x: Math.round(topicNode.position.x + Math.cos(angle) * ring),
      y: Math.round(topicNode.position.y + Math.sin(angle) * ring * .88)
    };
    graph.edges.push({
      id: `${topicNode.id}-${node.id}`,
      source: topicNode.id,
      target: node.id,
      type: "parent_of",
      labelRu: "принадлежит смысловой паутине"
    });
    (placement.relatedNodeIds || []).forEach((target) => {
      if (target === node.id || !graph.nodes.some((item) => item.id === target)) return;
      if (!graph.edges.some((edge) => edge.type === "related_to" && [edge.source, edge.target].includes(node.id) && [edge.source, edge.target].includes(target))) {
        graph.edges.push({
          id: `related-${node.id}-${target}`,
          source: node.id,
          target,
          type: "related_to",
          labelRu: "связано по смыслу"
        });
      }
    });
  });

  const occupiedTopics = new Set(graph.nodes.filter((node) => node.type !== "topic").map((node) => node.topic));
  const removedTopicIds = new Set(
    graph.nodes.filter((node) => node.type === "topic" && node.generated && !occupiedTopics.has(node.label)).map((node) => node.id)
  );
  graph.nodes = graph.nodes.filter((node) => !removedTopicIds.has(node.id));
  graph.edges = graph.edges.filter((edge) => !removedTopicIds.has(edge.source) && !removedTopicIds.has(edge.target));
  setGraphState(graph);

  const createdTopics = graph.nodes
    .filter((node) => node.type === "topic" && !beforeTopics.has(node.label))
    .map((node) => node.label);
  appendMemoryEvent({ type: "graph_reorganized", moved: userNodes.length, createdTopics });
  return { graph, moved: userNodes.length, createdTopics };
}

export function createPersonalGraph(payload = {}) {
  const topics = payload.topics?.length
    ? payload.topics
    : ["Deutsch", "Alltag", "Arbeit", "Wohnung", "Behörde", "Gesundheit", "Familie", "Einkaufen", "Essen", "Reisen", "Verkehr", "Bildung", "Freizeit", "Beziehungen", "Gesellschaft", "Natur", "Kultur", "Finanzen", "Emotionen"];
  const graph = generateSeedGraph({
    targetLanguage: "de",
    nativeLanguage: "ru",
    topics,
    wordsPerTopic: payload.wordsPerTopic || 10
  });
  return graph;
}

export function initializeGeneralGraph() {
  const current = getGraphState();
  const currentProfile = getProfile();
  const previousById = new Map(current.nodes.map((node) => [node.id, node]));
  const graph = createPersonalGraph({ wordsPerTopic: 10 });
  graph.nodes.forEach((node) => {
    const previous = previousById.get(node.id);
    if (!previous || node.type === "topic") return;
    Object.assign(node, {
      status: previous.status,
      knowledgeScore: previous.knowledgeScore,
      seenCount: previous.seenCount,
      correctCount: previous.correctCount,
      lastSeenAt: previous.lastSeenAt
    });
  });
  const profile = {
    ...currentProfile,
    initialized: true,
    createdAt: currentProfile.createdAt || new Date().toISOString()
  };
  setGraphState(graph, profile);
  setProfile(profile);
  return { graph, profile };
}
