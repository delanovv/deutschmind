import OpenAI from "openai";
import { appendAiHistory } from "../store/graphStore.js";

const MOCK_RESPONSES = {
  explain: "Важно не только знать перевод, но и видеть управление и типичные сочетания. Попробуй использовать выражение в одном формальном и одном разговорном примере.",
  correct: "Текст понятен. Чтобы он звучал естественнее, добавь связки, точнее обозначь причину и следствие и избегай повторения одинаковых глаголов.",
  practice: "Aufgabe: Du hast von einer Behörde eine unklare Antwort bekommen. Erkläre das Problem, stelle zwei konkrete Fragen und bitte höflich um eine Fristverlängerung."
};

export async function askTutor({ message, mode = "explain", context = {} }) {
  if (!process.env.OPENAI_API_KEY) {
    const result = {
      text: MOCK_RESPONSES[mode] || MOCK_RESPONSES.explain,
      provider: "mock",
      notice: "Добавь новый OPENAI_API_KEY в окружение backend, чтобы включить персонального AI-тьютора."
    };
    appendAiHistory({ message, mode, answer: result.text, provider: result.provider });
    return result;
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5.5",
    instructions: `Ты персональный помощник по немецкой лексике для русскоязычного пользователя.
Отвечай компактно и практично. Объяснения давай по-русски, примеры — по-немецки с переводом.
Исправляй ошибки доброжелательно. Показывай артикль, plural, управление, 2–4 естественных сочетания,
пример предложения, а также синонимы и антонимы, если они действительно существуют.
Не оценивай общий уровень пользователя и не превращай ответ в курс.
Режим: ${mode}. Контекст пользователя: ${JSON.stringify(context)}.`,
    input: message
  });
  const result = { text: response.output_text, provider: "openai" };
  appendAiHistory({ message, mode, answer: result.text, provider: result.provider });
  return result;
}
