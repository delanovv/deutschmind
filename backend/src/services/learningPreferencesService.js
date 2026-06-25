export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1"];

export const DEFAULT_LEARNING_PREFERENCES = {
  minCefr: "A1",
  maxCefr: "C1",
  newWordsPerBranch: 1,
  practiceSize: 12,
  includePhrases: true,
  includeVerbs: true,
  includeAntonyms: true
};

export function normalizeLearningPreferences(input = {}) {
  const minIndex = Math.max(0, CEFR_LEVELS.indexOf(input.minCefr));
  const requestedMax = CEFR_LEVELS.indexOf(input.maxCefr);
  const maxIndex = Math.max(minIndex, requestedMax < 0 ? CEFR_LEVELS.length - 1 : requestedMax);
  return {
    minCefr: CEFR_LEVELS[minIndex],
    maxCefr: CEFR_LEVELS[maxIndex],
    newWordsPerBranch: Math.max(1, Math.min(3, Number(input.newWordsPerBranch) || 1)),
    practiceSize: Math.max(5, Math.min(30, Number(input.practiceSize) || 12)),
    includePhrases: input.includePhrases !== false,
    includeVerbs: input.includeVerbs !== false,
    includeAntonyms: input.includeAntonyms !== false
  };
}

export function isCefrAllowed(cefr, preferences = DEFAULT_LEARNING_PREFERENCES) {
  const normalized = normalizeLearningPreferences(preferences);
  const levelIndex = CEFR_LEVELS.indexOf(cefr);
  if (levelIndex < 0) return true;
  return levelIndex >= CEFR_LEVELS.indexOf(normalized.minCefr)
    && levelIndex <= CEFR_LEVELS.indexOf(normalized.maxCefr);
}

export function isNodeTypeAllowed(type, preferences = DEFAULT_LEARNING_PREFERENCES) {
  const normalized = normalizeLearningPreferences(preferences);
  if (type === "verb") return normalized.includeVerbs;
  if (type === "phrase") return normalized.includePhrases;
  return true;
}

export function preferenceLabel(preferences = DEFAULT_LEARNING_PREFERENCES) {
  const normalized = normalizeLearningPreferences(preferences);
  return normalized.maxCefr === "C1"
    ? `${normalized.minCefr}+`
    : `${normalized.minCefr}–${normalized.maxCefr}`;
}
