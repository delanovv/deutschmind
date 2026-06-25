import { Router } from "express";
import { getGraphState, getProfile } from "../store/graphStore.js";
import { getBoundaryNodes, getRecommendations } from "../services/recommendationService.js";

const router = Router();

router.get("/boundary", (req, res) => {
  res.json(getBoundaryNodes(getGraphState(), getProfile()));
});

router.get("/recommendations", (req, res) => {
  res.json(getRecommendations(getGraphState(), getProfile()));
});

export default router;
