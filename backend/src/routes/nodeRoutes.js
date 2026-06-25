import { Router } from "express";
import { getNodeById, updateNodeKnowledge } from "../services/graphService.js";
import { generateRelatedUnknownNode } from "../services/relatedWordService.js";

const router = Router();

router.get("/nodes/:id", (req, res) => {
  const node = getNodeById(req.params.id);
  if (!node) return res.status(404).json({ error: "Node не найден" });
  return res.json(node);
});

router.patch("/nodes/:id/knowledge", (req, res) => {
  try {
    const node = updateNodeKnowledge(req.params.id, req.body);
    if (!node) return res.status(404).json({ error: "Node не найден" });
    return res.json(node);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.post("/nodes/:id/continue", async (req, res) => {
  try {
    return res.status(201).json(await generateRelatedUnknownNode(req.params.id));
  } catch (error) {
    console.error("Related word generation error:", error.message);
    return res.status(error.message.includes("не найдено") ? 404 : 502).json({ error: error.message });
  }
});

export default router;
