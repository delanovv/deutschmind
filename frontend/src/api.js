const API_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const TOKEN_KEY = "deutschmind:accessToken";

async function request(path, options = {}) {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(localStorage.getItem(TOKEN_KEY)
          ? { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` }
          : {}),
        ...options.headers,
      },
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      // Чистим токен только если это НЕ auth-эндпоинт
      // (логин/регистрация сами возвращают 401 при неверных данных — это не протухший токен)
      if (!path.startsWith("/auth/")) {
        localStorage.removeItem(TOKEN_KEY);
        window.dispatchEvent(new CustomEvent("auth:expired"));
      }
      throw new Error(data.error || "Ошибка авторизации");
    }
    if (!response.ok) throw new Error(data.error || "Ошибка запроса");
    return data;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(
        "Анализ был отменён или занял слишком много времени. Попробуй ещё раз.",
      );
    }
    if (error instanceof TypeError) {
      throw new Error(
        "Backend недоступен. Проверь порт 4000 и перезапусти frontend после настройки proxy.",
      );
    }
    throw error;
  }
}

async function requestForm(path, formData, options = {}) {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: options.method || "POST",
      headers: {
        ...(localStorage.getItem(TOKEN_KEY)
          ? { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` }
          : {}),
        ...options.headers,
      },
      body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new CustomEvent("auth:expired"));
      throw new Error(data.error || "Ошибка авторизации");
    }
    if (!response.ok) throw new Error(data.error || "Ошибка загрузки");
    return data;
  } catch (error) {
    if (error instanceof TypeError) throw new Error("Backend недоступен");
    throw error;
  }
}

export const getHealth = () => request("/health");
export const register = (payload) =>
  request("/auth/register", { method: "POST", body: JSON.stringify(payload) });
export const login = (payload) =>
  request("/auth/login", { method: "POST", body: JSON.stringify(payload) });
export const getCurrentUser = () => request("/auth/me");
export const saveAccessToken = (token) =>
  localStorage.setItem(TOKEN_KEY, token);
export const clearAccessToken = () => localStorage.removeItem(TOKEN_KEY);
export const hasAccessToken = () => Boolean(localStorage.getItem(TOKEN_KEY));
export const getWebsV2 = () => request("/v2/webs");
export const getWebV2 = (id, params = "") => request(`/v2/webs/${id}${params}`);
export const getNeighborsV2 = (id, depth = 1) =>
  request(`/v2/nodes/${id}/neighbors?depth=${depth}`);
export const expandNodeV2 = (id, count = 5, operationId = "") =>
  request(`/v2/nodes/${id}/expand`, {
    method: "POST",
    headers: {
      "Idempotency-Key": `expand:${id}:${count}:${operationId || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
    },
    body: JSON.stringify({ count }),
  });
export const getJobV2 = (id) => request(`/v2/jobs/${id}`);
export const getDueReviewsV2 = () => request("/v2/reviews/due");
export const submitReviewV2 = (id, payload) =>
  request(`/v2/nodes/${id}/reviews`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const getMaterialsV2 = () => request("/v2/materials");
export const getMaterialV2 = (id) => request(`/v2/materials/${id}`);
export const uploadImageV2 = (file) => {
  const form = new FormData();
  form.append("image", file);
  return requestForm("/v2/materials/image", form);
};
export const submitTextV2 = (text) =>
  request("/v2/materials/text", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
export const updatePreferencesV2 = (payload) =>
  request("/v2/me/preferences", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
export const getGraph = () => request("/graph");
export const getProfile = () => request("/profile");
export const updateLearningPreferences = (payload) =>
  request("/profile/preferences", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
export const reorganizeGraph = () =>
  request("/graph/reorganize", { method: "POST" });
export const getNode = (id) => request(`/nodes/${id}`);
export const continueFromNode = (id) =>
  request(`/nodes/${id}/continue`, { method: "POST" });
export const updateKnowledge = (id, payload) =>
  request(`/nodes/${id}/knowledge`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
export const bootstrapApp = () => request("/bootstrap", { method: "POST" });
export const generateSeed = (payload) =>
  request("/generate-seed", {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const getBoundary = () => request("/boundary");
export const getRecommendations = () => request("/recommendations");
export const analyzeText = (text, signal) =>
  request("/analyze-text", {
    method: "POST",
    body: JSON.stringify({ text }),
    signal,
  });
export const resetApp = () => request("/reset", { method: "POST" });
export const askTutor = (payload) =>
  request("/ai/tutor", {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const getTodayPractice = () => request("/practice/today");
export const completePractice = (payload) =>
  request("/practice/complete", {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const getMemory = () => request("/memory");
export const getLibrary = (query = "") =>
  request(`/library?q=${encodeURIComponent(query)}`);
export const addPersonalWord = (payload) =>
  request("/nodes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const addPersonalWords = (items) =>
  request("/nodes/batch", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
export const deletePersonalWord = (id) =>
  request(`/nodes/${id}`, { method: "DELETE" });
export const editPersonalWord = (id, payload) =>
  request(`/nodes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
export const expandLibrary = (payload) =>
  request("/library/expand", {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const analyzeImage = (image, signal) =>
  request("/analyze-image", {
    method: "POST",
    body: JSON.stringify({ image }),
    signal,
  });
