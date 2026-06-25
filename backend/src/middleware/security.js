import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Слишком много попыток. Попробуй позже." }
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 180,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Слишком много запросов" }
});

export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: Number(process.env.AI_HOURLY_REQUEST_LIMIT) || 30,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { error: "Лимит AI-запросов временно исчерпан" }
});

