import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../../middleware/auth.js";
import { aiLimiter } from "../../middleware/security.js";
import { createMaterial, getMaterial, listMaterials } from "./materialRepository.js";
import { savePrivateObject } from "./objectStorage.js";
import { enqueueAiJob } from "../jobs/jobService.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.MAX_IMAGE_BYTES) || 10_000_000 },
  fileFilter: (req, file, callback) => callback(null, /^image\/(jpeg|png|webp|gif)$/i.test(file.mimetype))
});
router.use(requireAuth);

router.get("/v2/materials", async (req, res) => res.json(await listMaterials(req.user.id, req.query)));
router.get("/v2/materials/:id", async (req, res) => {
  const item = await getMaterial(req.user.id, req.params.id);
  if (!item) return res.status(404).json({ error: "Материал не найден" });
  res.json(item);
});

router.post("/v2/materials/image", aiLimiter, upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Нужно изображение JPEG, PNG, WebP или GIF" });
  const extension = req.file.mimetype.split("/")[1].replace("jpeg", "jpg");
  const storageKey = await savePrivateObject({
    userId: req.user.id,
    buffer: req.file.buffer,
    contentType: req.file.mimetype,
    extension
  });
  const material = await createMaterial({
    userId: req.user.id,
    title: req.body.title,
    type: "image",
    storageKey,
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000)
  });
  const job = await enqueueAiJob({
    userId: req.user.id,
    type: "analyze-material",
    idempotencyKey: req.headers["idempotency-key"] || `material:${material.id}`,
    payload: { materialId: material.id }
  });
  res.status(202).json({ material, job });
});

router.post("/v2/materials/text", aiLimiter, async (req, res) => {
  const text = String(req.body.text || "").trim();
  if (!text) return res.status(400).json({ error: "Текст пуст" });
  const maxTextChars = Number(process.env.MAX_TEXT_CHARS) || 50_000;
  if (text.length > maxTextChars) {
    return res.status(413).json({
      error: `Текст слишком длинный. Максимум: ${maxTextChars} символов`
    });
  }
  const material = await createMaterial({ userId: req.user.id, title: req.body.title, type: "text", sourceText: text });
  const job = await enqueueAiJob({
    userId: req.user.id,
    type: "analyze-material",
    idempotencyKey: req.headers["idempotency-key"] || `material:${material.id}`,
    payload: { materialId: material.id }
  });
  res.status(202).json({ material, job });
});

export default router;
