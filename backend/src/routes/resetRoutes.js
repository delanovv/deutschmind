import { Router } from "express";
import { resetStore } from "../store/graphStore.js";
import { getBoundaryNodes, getRecommendations } from "../services/recommendationService.js";

const router = Router();

router.post("/reset", (req, res) => {
  const { graph, profile } = resetStore();
  res.json({
    profile,
    graph,
    boundary: getBoundaryNodes(graph, profile),
    recommendations: getRecommendations(graph, profile)
  });
});

export default router;
