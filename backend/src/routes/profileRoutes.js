import { Router } from "express";
import { appendMemoryEvent, getProfile, setProfile } from "../store/graphStore.js";
import { normalizeLearningPreferences } from "../services/learningPreferencesService.js";

const router = Router();

router.get("/profile", (req, res) => {
  res.json(getProfile());
});

router.patch("/profile/preferences", (req, res) => {
  const learningPreferences = normalizeLearningPreferences({
    ...getProfile().learningPreferences,
    ...req.body
  });
  const profile = setProfile({ learningPreferences });
  appendMemoryEvent({
    type: "preferences_updated",
    learningPreferences
  });
  res.json(profile);
});

export default router;
