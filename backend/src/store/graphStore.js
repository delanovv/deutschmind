import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateSeedGraph } from "../services/seedGenerationService.js";
import { DEFAULT_LEARNING_PREFERENCES, normalizeLearningPreferences } from "../services/learningPreferencesService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, "..", "data", "seedGraph.json");

const defaultOptions = {
  targetLanguage: "de",
  nativeLanguage: "ru",
  topics: ["Deutsch", "Alltag", "Arbeit", "Wohnung", "Behörde", "Gesundheit", "Familie", "Einkaufen", "Essen", "Reisen", "Verkehr", "Bildung", "Freizeit", "Beziehungen", "Gesellschaft", "Natur", "Kultur", "Finanzen", "Emotionen"],
  wordsPerTopic: 10
};

function removeLegacyPersonalWeb(nextGraph) {
  const legacyTopicNames = new Set(["Личное", "Personal"]);
  const legacyTopicIds = new Set(
    nextGraph.nodes.filter((node) => node.type === "topic" && legacyTopicNames.has(node.label)).map((node) => node.id)
  );
  const topics = nextGraph.nodes.filter((node) => node.type === "topic" && !legacyTopicIds.has(node.id));
  const fallbackTopic = topics.find((node) => node.label === "Alltag") || topics[0];
  const originalEdges = [...nextGraph.edges];

  nextGraph.nodes = nextGraph.nodes.filter((node) => !legacyTopicIds.has(node.id));
  nextGraph.edges = nextGraph.edges.filter((edge) => !legacyTopicIds.has(edge.source) && !legacyTopicIds.has(edge.target));

  nextGraph.nodes.filter((node) => legacyTopicNames.has(node.topic)).forEach((node, index) => {
    const connected = originalEdges
      .filter((edge) => edge.source === node.id || edge.target === node.id)
      .map((edge) => nextGraph.nodes.find((candidate) => candidate.id === (edge.source === node.id ? edge.target : edge.source)))
      .find((candidate) => candidate && candidate.type !== "topic" && !legacyTopicNames.has(candidate.topic));
    const sourceTopic = String(node.source || "").startsWith("expansion:")
      ? String(node.source).slice("expansion:".length)
      : "";
    const targetTopic = topics.find((topic) => topic.label === sourceTopic)
      || topics.find((topic) => topic.label === connected?.topic)
      || fallbackTopic;
    if (!targetTopic) return;
    const angle = (index * 2.399) % (Math.PI * 2);
    node.topic = targetTopic.label;
    node.userAdded = true;
    node.position = {
      x: Math.round(targetTopic.position.x + Math.cos(angle) * 116),
      y: Math.round(targetTopic.position.y + Math.sin(angle) * 98)
    };
    nextGraph.edges.push({
      id: `${targetTopic.id}-${node.id}`,
      source: targetTopic.id,
      target: node.id,
      type: "parent_of",
      labelRu: "перенесено в смысловую паутину"
    });
  });
  return nextGraph;
}

let initialGraph = generateSeedGraph(defaultOptions);
let graph = structuredClone(initialGraph);
let profile = {
  initialized: false,
  createdAt: null,
  profileId: "local-default",
  learningPreferences: DEFAULT_LEARNING_PREFERENCES
};
let memory = {
  events: [],
  aiHistory: [],
  practiceSessions: [],
  importedTexts: []
};

try {
  const saved = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  if (Array.isArray(saved.nodes) && saved.nodes.length && Array.isArray(saved.edges)) {
    const blockedTopics = new Set(["IT", "Backend"]);
    const nodes = saved.nodes.filter((node) => !blockedTopics.has(node.topic) && !blockedTopics.has(node.label));
    const ids = new Set(nodes.map((node) => node.id));
    const edges = saved.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target));
    graph = removeLegacyPersonalWeb({ nodes, edges, metadata: saved.metadata || {} });
    profile = {
      ...saved.profile,
      initialized: true,
      createdAt: saved.profile?.createdAt || null,
      profileId: saved.profile?.profileId || "local-default",
      learningPreferences: normalizeLearningPreferences(saved.profile?.learningPreferences)
    };
    memory = saved.memory || memory;
    memory.events = (memory.events || []).filter((event) => !event.nodeId || ids.has(event.nodeId));
    memory.practiceSessions = (memory.practiceSessions || []).map((session) => ({
      ...session,
      answers: (session.answers || []).filter((answer) => ids.has(answer.nodeId))
    }));
  }
} catch {
  // The generated in-memory graph is used when the JSON snapshot is missing or invalid.
}

function persist() {
  fs.writeFileSync(DATA_PATH, JSON.stringify({ ...graph, profile, memory }, null, 2), "utf8");
}

export function getGraphState() {
  return graph;
}

export function setGraphState(nextGraph, nextProfile = profile) {
  graph = structuredClone(nextGraph);
  profile = { ...profile, ...nextProfile };
  persist();
  return graph;
}

export function getProfile() {
  return profile;
}

export function setProfile(nextProfile) {
  profile = {
    ...profile,
    ...nextProfile,
    learningPreferences: normalizeLearningPreferences(
      nextProfile.learningPreferences || profile.learningPreferences
    )
  };
  persist();
  return profile;
}

export function getMemory() {
  return memory;
}

export function appendMemoryEvent(event) {
  const item = {
    id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    profileId: profile.profileId || "local-default",
    ...event
  };
  memory.events.unshift(item);
  memory.events = memory.events.slice(0, 1000);
  persist();
  return item;
}

export function appendAiHistory(entry) {
  const item = {
    id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    profileId: profile.profileId || "local-default",
    ...entry
  };
  memory.aiHistory.unshift(item);
  memory.aiHistory = memory.aiHistory.slice(0, 100);
  persist();
  return item;
}

export function appendPracticeSession(session) {
  const item = {
    id: `session-${Date.now()}`,
    createdAt: new Date().toISOString(),
    profileId: profile.profileId || "local-default",
    ...session
  };
  memory.practiceSessions.unshift(item);
  memory.practiceSessions = memory.practiceSessions.slice(0, 200);
  persist();
  return item;
}

export function appendImportedText(entry) {
  const item = {
    id: `import-${Date.now()}`,
    createdAt: new Date().toISOString(),
    profileId: profile.profileId || "local-default",
    ...entry
  };
  memory.importedTexts.unshift(item);
  memory.importedTexts = memory.importedTexts.slice(0, 50);
  persist();
  return item;
}

export function resetStore() {
  initialGraph = generateSeedGraph(defaultOptions);
  graph = structuredClone(initialGraph);
  profile = {
    initialized: false,
    createdAt: null,
    profileId: "local-default",
    learningPreferences: DEFAULT_LEARNING_PREFERENCES
  };
  memory = { events: [], aiHistory: [], practiceSessions: [], importedTexts: [] };
  persist();
  return { graph, profile };
}

persist();
