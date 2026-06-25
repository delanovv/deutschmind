import { Router } from "express";
import { initializeGeneralGraph } from "../services/graphService.js";
import { getBoundaryNodes, getRecommendations } from "../services/recommendationService.js";

const router = Router();

router.post("/bootstrap", (req, res) => {
  const { graph, profile } = initializeGeneralGraph();
  res.json({
    graph,
    profile,
    boundary: getBoundaryNodes(graph, profile),
    recommendations: getRecommendations(graph, profile)
  });
});

export default router;
