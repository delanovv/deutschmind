import { getGraphState, getMemory, getProfile, appendPracticeSession } from "../store/graphStore.js";
import { calculateProximityScore } from "./recommendationService.js";
import { isCefrAllowed, isNodeTypeAllowed } from "./learningPreferencesService.js";

function daysSince(date) {
  if (!date) return 999;
  return Math.max(0, (Date.now() - new Date(date).getTime()) / 86400000);
}

export function calculateReviewPriority(node, graph, profile) {
  const age = Math.min(daysSince(node.lastSeenAt), 30);
  const uncertainty = 100 - node.knowledgeScore;
  const errors = Math.max(0, node.seenCount - node.correctCount);
  const proximity = calculateProximityScore(node, graph, profile);
  const importedBonus = node.userAdded ? 60 : 0;
  return Math.round(uncertainty * 0.45 + age * 1.5 + errors * 7 + proximity + importedBonus);
}

export function getTodayPractice(limit) {
  const graph = getGraphState();
  const profile = getProfile();
  const preferences = profile.learningPreferences;
  const resolvedLimit = Number(limit) || preferences?.practiceSize || 12;
  const candidates = graph.nodes
    .filter((node) => node.type !== "topic" && node.status !== "known" && isCefrAllowed(node.cefr, preferences) && isNodeTypeAllowed(node.type, preferences))
    .map((node) => ({ node, priority: calculateReviewPriority(node, graph, profile) }))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, resolvedLimit);

  return {
    estimatedMinutes: Math.max(5, Math.round(candidates.length * 0.8)),
    items: candidates.map(({ node, priority }, index) => ({
      node,
      priority,
      prompt: index % 3 === 0
        ? `Как по-немецки: «${node.translationRu}»?`
        : index % 3 === 1
          ? `Составь короткое предложение с «${node.label}».`
          : `Насколько уверенно ты понимаешь «${node.label}» в реальном тексте?`,
      mode: index % 3 === 0 ? "recall" : index % 3 === 1 ? "production" : "recognition"
    }))
  };
}

export function completePracticeSession(payload = {}) {
  return appendPracticeSession({
    answers: payload.answers || [],
    durationSeconds: Number(payload.durationSeconds) || 0,
    completedCount: (payload.answers || []).length
  });
}

export function getMemorySummary() {
  const graph = getGraphState();
  const memory = getMemory();
  const learning = graph.nodes.filter((node) => node.type !== "topic");
  const addedByUser = learning.filter((node) => node.userAdded);
  const weak = [...learning]
    .sort((a, b) => calculateReviewPriority(b, graph, getProfile()) - calculateReviewPriority(a, graph, getProfile()))
    .slice(0, 8);
  const activityByDay = Array.from({ length: 14 }, (_, offset) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (13 - offset));
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    const count = memory.events.filter((event) => {
      const time = new Date(event.createdAt).getTime();
      return time >= date.getTime() && time < next.getTime();
    }).length;
    return { date: date.toISOString().slice(0, 10), count };
  });
  return {
    totals: {
      words: learning.length,
      personal: addedByUser.length,
      known: learning.filter((node) => node.status === "known").length,
      boundary: learning.filter((node) => node.status === "boundary").length,
      sessions: memory.practiceSessions.length,
      aiConversations: memory.aiHistory.length,
      importedTexts: memory.importedTexts.length
    },
    activityByDay,
    weakNodes: weak,
    recentEvents: memory.events.slice(0, 20),
    aiHistory: memory.aiHistory.slice(0, 10),
    importedTexts: memory.importedTexts.slice(0, 10)
  };
}
