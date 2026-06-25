import { Router } from "express";
import { analyzeImageWithAI } from "../services/aiAnalyzeService.js";
import { appendImportedText, getGraphState } from "../store/graphStore.js";

const router = Router();

router.post("/analyze-image", async (req, res) => {
  try {
    const result = await analyzeImageWithAI(req.body.image, getGraphState());
    appendImportedText({
      text: result.sourceText.slice(0, 5000),
      titleRu: result.titleRu,
      textTypeRu: result.textTypeRu,
      difficulty: result.difficulty,
      totalTokens: result.summary.totalTokens,
      unknownCount: result.summary.unknownCount,
      provider: "openai-image"
    });
    return res.json(result);
  } catch (error) {
    console.error("AI image analysis error:", error.message);
    const status = error.message.includes("OPENAI_API_KEY") ? 503 : 400;
    return res.status(status).json({ error: error.message });
  }
});

export default router;
