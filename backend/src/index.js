import "dotenv/config";
import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import graphRoutes from "./routes/graphRoutes.js";
import nodeRoutes from "./routes/nodeRoutes.js";
import recommendationRoutes from "./routes/recommendationRoutes.js";
import analyzeRoutes from "./routes/analyzeRoutes.js";
import resetRoutes from "./routes/resetRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import libraryRoutes from "./routes/libraryRoutes.js";
import practiceRoutes from "./routes/practiceRoutes.js";
import bootstrapRoutes from "./routes/bootstrapRoutes.js";
import imageAnalyzeRoutes from "./routes/imageAnalyzeRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import authRoutes from "./modules/users/authRoutes.js";
import graphRoutesV2 from "./modules/graph/graphRoutesV2.js";
import knowledgeRoutesV2 from "./modules/knowledge/knowledgeRoutesV2.js";
import materialRoutesV2 from "./modules/materials/materialRoutesV2.js";
import { apiLimiter } from "./middleware/security.js";
import { checkDatabase, databaseEnabled } from "./db/pool.js";

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const allowedOrigins = process.env.FRONTEND_ORIGIN
  ?.split(",")
  .map((item) => item.trim())
  .filter(Boolean);

app.set("trust proxy", process.env.TRUST_PROXY === "true" ? 1 : false);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression());
app.use(cors({
  origin: allowedOrigins?.length ? allowedOrigins : process.env.NODE_ENV !== "production",
  credentials: false
}));
app.use(express.json({ limit: "12mb" }));
app.use("/api", apiLimiter);

app.get("/api/health", async (req, res) => {
  const database = await checkDatabase().catch(() => ({ enabled: databaseEnabled, ok: false }));
  res.status(database.enabled && !database.ok ? 503 : 200).json({ ok: !database.enabled || database.ok, mode: databaseEnabled ? "postgres" : "legacy-json", database });
});

if (databaseEnabled) {
  app.use("/api", authRoutes);
  app.use("/api", graphRoutesV2);
  app.use("/api", knowledgeRoutesV2);
  app.use("/api", materialRoutesV2);
}

if (!databaseEnabled || process.env.ENABLE_LEGACY_API === "true") {
  app.use("/api", graphRoutes);
  app.use("/api", nodeRoutes);
  app.use("/api", recommendationRoutes);
  app.use("/api", analyzeRoutes);
  app.use("/api", resetRoutes);
  app.use("/api", aiRoutes);
  app.use("/api", libraryRoutes);
  app.use("/api", practiceRoutes);
  app.use("/api", bootstrapRoutes);
  app.use("/api", imageAnalyzeRoutes);
  app.use("/api", profileRoutes);
}

app.use((err, req, res, next) => {
  console.error(err);
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: "Фотография слишком большая для отправки. Попробуй снять её с меньшим разрешением." });
  }
  res.status(500).json({ error: process.env.NODE_ENV === "production" ? "Внутренняя ошибка сервера" : err.message });
});

app.listen(PORT, () => {
  console.log(`DeutschMind backend: http://localhost:${PORT}`);
});
