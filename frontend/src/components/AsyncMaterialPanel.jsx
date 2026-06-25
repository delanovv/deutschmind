import { useEffect, useRef, useState } from "react";
import { getJobV2, getMaterialV2, submitTextV2, uploadImageV2 } from "../api.js";
import { useLanguage } from "../i18n.jsx";

export default function AsyncMaterialPanel() {
  const { t } = useLanguage();
  const [mode, setMode] = useState("image");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [text, setText] = useState("");
  const [job, setJob] = useState(null);
  const [material, setMaterial] = useState(null);
  const [error, setError] = useState("");
  const timer = useRef(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
    if (timer.current) clearInterval(timer.current);
  }, [preview]);

  const monitor = (jobId, materialId) => {
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(async () => {
      try {
        const [jobData, materialData] = await Promise.all([getJobV2(jobId), getMaterialV2(materialId)]);
        setJob(jobData);
        setMaterial(materialData);
        if (["completed", "failed"].includes(jobData.status)) {
          clearInterval(timer.current);
          timer.current = null;
        }
      } catch (requestError) {
        clearInterval(timer.current);
        setError(requestError.message);
      }
    }, 1500);
  };

  const submit = async () => {
    setError("");
    setMaterial(null);
    try {
      const response = mode === "image" ? await uploadImageV2(file) : await submitTextV2(text);
      setJob(response.job);
      setMaterial(response.material);
      monitor(response.job.id, response.material.id);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const progress = job?.status === "completed" ? 100 : job?.status === "active" ? 62 : job?.status === "failed" ? 100 : job ? 18 : 0;
  return (
    <section className="screen-section analyze-screen">
      <div className="plain-page-header"><span>{t("importEyebrow")}</span><h1>{t("importTitle")}</h1><p>{t("importIntro")}</p></div>
      <div className="import-mode-tabs">
        <button className={mode === "image" ? "active" : ""} onClick={() => setMode("image")}>{t("photo")}</button>
        <button className={mode === "text" ? "active" : ""} onClick={() => setMode("text")}>{t("text")}</button>
      </div>
      {mode === "image" ? (
        <label className="camera-picker">
          <input type="file" accept="image/*" capture="environment" onChange={(event) => {
            const next = event.target.files?.[0];
            if (!next) return;
            if (preview) URL.revokeObjectURL(preview);
            setFile(next);
            setPreview(URL.createObjectURL(next));
          }} />
          {preview ? <img src={preview} alt="" /> : <><span className="camera-icon">▧</span><strong>{t("takePhoto")}</strong><small>{t("fileDeleted")}</small></>}
        </label>
      ) : (
        <div className="glass-card text-analyzer"><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={t("pasteGerman")} /></div>
      )}
      <button className="analyze-main-button" disabled={Boolean(job && !["completed", "failed"].includes(job.status)) || (mode === "image" ? !file : !text.trim())} onClick={submit}>
        {t("sendAnalysis")} <b>✦</b>
      </button>
      {job && (
        <div className="analysis-progress">
          <div className="progress-copy"><span>{job.status === "queued" ? t("queued") : job.status === "active" ? t("analyzing") : job.status === "completed" ? t("done") : t("error")}</span><b>{progress}%</b></div>
          <div className="progress-track"><i style={{ width: `${progress}%` }} /></div>
        </div>
      )}
      {error && <div className="inline-error">{error}</div>}
      {material?.analysis && (
        <div className="analysis-results">
          <div className="ai-analysis-overview"><div><span>{material.analysis.difficulty}</span><h2>{material.analysis.titleRu}</h2></div><p>{material.analysis.summaryRu}</p></div>
          <div className="vocabulary-grid">
            {(material.analysis.vocabulary || []).map((word) => <article key={word.label}><div className="vocab-main"><div><strong>{word.label}</strong><span>{word.translationRu}</span></div><small>{word.cefr}</small></div><p>{word.explanationRu}</p></article>)}
          </div>
        </div>
      )}
    </section>
  );
}
