import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { getNodeNeighbors, getWeb, listWebs } from "./graphRepository.js";
import { enqueueAiJob, getJobStatus } from "../jobs/jobService.js";

const router = Router();
router.use(requireAuth);

router.get("/v2/webs", async (req, res) => res.json(await listWebs(req.user.id)));

router.get("/v2/webs/:id", async (req, res) => {
  const result = await getWeb(req.user.id, req.params.id, req.query);
  if (!result) return res.status(404).json({ error: "Паутина не найдена" });
  res.json(result);
});

router.get("/v2/nodes/:id/neighbors", async (req, res) => {
  res.json(await getNodeNeighbors(req.user.id, req.params.id, req.query.depth, req.query.limit));
});

router.post("/v2/nodes/:id/expand", async (req, res) => {
  const key = req.headers["idempotency-key"] || `expand:${req.params.id}:${req.body?.count || 5}`;
  const job = await enqueueAiJob({
    userId: req.user.id,
    type: "expand-node",
    idempotencyKey: key,
    payload: { nodeId: req.params.id, count: Math.min(Number(req.body?.count) || 5, 12) }
  });
  res.status(job.reused ? 200 : 202).json(job);
});

router.get("/v2/jobs/:id", async (req, res) => {
  const job = await getJobStatus(req.user.id, req.params.id);
  if (!job) return res.status(404).json({ error: "Задача не найдена" });
  res.json(job);
});

export default router;

