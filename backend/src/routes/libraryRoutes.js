import { Router } from "express";
import { addPersonalNode, addPersonalNodes, deletePersonalNode, getGraph, updatePersonalNode } from "../services/graphService.js";
import { expandVocabulary } from "../services/vocabularyExpansionService.js";

const router = Router();

router.get("/library", (req, res) => {
  const query = String(req.query.q || "").toLowerCase().trim();
  const status = String(req.query.status || "");
  const topic = String(req.query.topic || "");
  const nodes = getGraph().nodes
    .filter((node) => node.type !== "topic")
    .filter((node) => !query || [node.label, node.translationRu, node.topic].some((value) => String(value).toLowerCase().includes(query)))
    .filter((node) => !status || node.status === status)
    .filter((node) => !topic || node.topic === topic);
  res.json(nodes);
});

router.post("/nodes", async (req, res) => {
  try {
    res.status(201).json(await addPersonalNode(req.body));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/nodes/batch", async (req, res) => {
  if (!Array.isArray(req.body.items)) return res.status(400).json({ error: "Поле items должно быть массивом" });
  const existingLabels = new Set(getGraph().nodes.map((node) => node.label.toLowerCase()));
  let added = [];
  const skipped = [];
  const pending = [];
  for (const item of req.body.items.slice(0, 30)) {
    const label = String(item?.label || "").trim();
    if (!label || existingLabels.has(label.toLowerCase())) {
      skipped.push(label);
      continue;
    }
    pending.push(item);
    existingLabels.add(label.toLowerCase());
  }
  try {
    added = await addPersonalNodes(pending);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
  return res.status(201).json({ added, skipped });
});

router.delete("/nodes/:id", (req, res) => {
  if (!deletePersonalNode(req.params.id)) return res.status(404).json({ error: "Добавленное слово не найдено" });
  return res.json({ ok: true });
});

router.patch("/nodes/:id", (req, res) => {
  const node = updatePersonalNode(req.params.id, req.body);
  if (!node) return res.status(404).json({ error: "Добавленное слово не найдено" });
  return res.json(node);
});

router.post("/library/expand", async (req, res) => {
  try {
    res.status(201).json(await expandVocabulary(req.body));
  } catch (error) {
    console.error("Vocabulary expansion error:", error.message);
    res.status(502).json({ error: "Не удалось расширить словарь. Проверь AI API или попробуй позже." });
  }
});

export default router;
