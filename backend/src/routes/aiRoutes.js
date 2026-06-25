import { Router } from "express";
import { askTutor } from "../services/aiTutorService.js";
import { getProfile } from "../store/graphStore.js";

const router = Router();
router.post("/ai/tutor", async (req, res) => {
  if (!req.body.message?.trim()) return res.status(400).json({ error: "Напиши вопрос или текст для проверки" });
  try {
    const result = await askTutor({
      message: req.body.message,
      mode: req.body.mode,
      context: { profile: getProfile(), ...req.body.context }
    });
    return res.json(result);
  } catch (error) {
    console.error("AI tutor error:", error.message);
    return res.status(502).json({ error: "AI-тьютор временно недоступен. Проверь ключ, модель и лимиты API." });
  }
});
export default router;
