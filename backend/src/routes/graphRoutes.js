import { Router } from "express";
import { getGraph, reorganizeUserNodes } from "../services/graphService.js";
import { getProfile, setGraphState } from "../store/graphStore.js";
import { getBoundaryNodes, getRecommendations } from "../services/recommendationService.js";
import { createPersonalGraph } from "../services/graphService.js";

const router = Router();

router.get("/graph", (req, res) => {
  const graph = getGraph();
  res.json({ nodes: graph.nodes, edges: graph.edges, metadata: graph.metadata });
});

router.post("/graph/reorganize", async (req, res) => {
  try {
    res.json(await reorganizeUserNodes());
  } catch (error) {
    console.error("Graph reorganization error:", error.message);
    res.status(502).json({ error: "Не удалось перераспределить слова по смысловым паутинам" });
  }
});

router.post("/generate-seed", (req, res) => {
  const graph = createPersonalGraph(req.body);
  const profile = {
    ...getProfile()
  };
  setGraphState(graph, profile);
  res.json({
    graph,
    boundary: getBoundaryNodes(graph, profile),
    recommendations: getRecommendations(graph, profile)
  });
});

export default router;
