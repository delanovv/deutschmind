import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authLimiter } from "../../middleware/security.js";
import { requireAuth, signAccessToken } from "../../middleware/auth.js";
import { createUser, findUserByEmail, findUserById } from "./userRepository.js";
import { updateUserPreferences } from "./userRepository.js";
import { normalizeLearningPreferences } from "../../services/learningPreferencesService.js";
import { seedUserGraph } from "./seedUserGraph.js";

const router = Router();
const Credentials = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
  displayName: z.string().trim().min(1).max(80).optional()
});

router.post("/auth/register", authLimiter, async (req, res) => {
  const parsed = Credentials.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Проверь email и пароль: минимум 8 символов" });
  if (await findUserByEmail(parsed.data.email)) return res.status(409).json({ error: "Этот email уже зарегистрирован" });
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await createUser({ ...parsed.data, passwordHash });
  await seedUserGraph(user.id);
  res.status(201).json({ user, token: signAccessToken(user) });
});

router.post("/auth/login", authLimiter, async (req, res) => {
  const parsed = Credentials.omit({ displayName: true }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Некорректный email или пароль" });
  const record = await findUserByEmail(parsed.data.email);
  if (!record || !await bcrypt.compare(parsed.data.password, record.password_hash)) {
    return res.status(401).json({ error: "Некорректный email или пароль" });
  }
  const user = await findUserById(record.id);
  res.json({ user, token: signAccessToken(user) });
});

router.get("/auth/me", requireAuth, async (req, res) => {
  const user = await findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: "Пользователь не найден" });
  res.json(user);
});

router.patch("/v2/me/preferences", requireAuth, async (req, res) => {
  const current = await findUserById(req.user.id);
  if (!current) return res.status(404).json({ error: "Пользователь не найден" });
  const preferences = normalizeLearningPreferences({ ...current.preferences, ...req.body });
  res.json(await updateUserPreferences(req.user.id, preferences));
});

export default router;
