import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { getDueReviews, recordReview } from "./knowledgeService.js";

const router = Router();
router.use(requireAuth);

router.get("/v2/reviews/due", async (req, res) => {
  res.json(await getDueReviews(req.user.id, req.query.limit));
});

router.post("/v2/nodes/:id/reviews", async (req, res) => {
  try {
    res.status(201).json(await recordReview(req.user.id, req.params.id, req.body));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
