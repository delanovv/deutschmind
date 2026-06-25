import { Router } from "express";
import { completePracticeSession, getMemorySummary, getTodayPractice } from "../services/practiceService.js";

const router = Router();
router.get("/practice/today", (req, res) => res.json(getTodayPractice(req.query.limit ? Number(req.query.limit) : undefined)));
router.post("/practice/complete", (req, res) => res.status(201).json(completePracticeSession(req.body)));
router.get("/memory", (req, res) => res.json(getMemorySummary()));
export default router;
