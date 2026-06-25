import { Router } from "express";
import { analyzeTextWithAI } from "../services/aiAnalyzeService.js";
import { getGraphState } from "../store/graphStore.js";
import { appendImportedText } from "../store/graphStore.js";

const router = Router();

router.post("/analyze-text", async (req, res) => {
  if (typeof req.body.text !== "string") {
    return res.status(400).json({ error: "Поле text обязательно" });
  }
  try {
    const result = await analyzeTextWithAI(req.body.text, getGraphState());
    appendImportedText({
      text: req.body.text.slice(0, 5000),
      titleRu: result.titleRu || "Импортированный текст",
      textTypeRu: result.textTypeRu || "Текст",
      difficulty: result.difficulty || null,
      totalTokens: result.summary.totalTokens,
      unknownCount: result.summary.unknownCount,
      provider: result.provider
    });
    return res.json(result);
  } catch (error) {
    console.error("AI text analysis error:", error.message);
    const status = error.message.includes("OPENAI_API_KEY") ? 503 : 502;
    return res.status(status).json({ error: status === 503 ? error.message : "Не удалось выполнить AI-анализ текста. Проверь API и попробуй снова." });
  }
});

export default router;
