import { useEffect, useRef, useState } from "react";
import { analyzeImage, analyzeText } from "../api.js";
import StatCard from "./StatCard.jsx";
import { useLanguage } from "../i18n.jsx";

const progressStages = {
  image: [
    [0, "Подготавливаем фотографию"],
    [18, "Понимаем структуру страницы"],
    [42, "Разбираем предложения и формы слов"],
    [68, "Сверяем лексику с твоей картой"],
    [84, "Готовим объяснения и примеры"]
  ],
  text: [
    [0, "Читаем текст"],
    [22, "Определяем леммы и устойчивые фразы"],
    [50, "Сверяем лексику с твоей картой"],
    [76, "Готовим объяснения и примеры"]
  ]
};

function stageLabel(type, progress) {
  return [...progressStages[type]].reverse().find(([threshold]) => progress >= threshold)?.[1];
}

export default function AnalyzeTextPanel({ onAddWord, onAddWords }) {
  const { language, t } = useLanguage();
  const localizedProgressStages = language === "de" ? {
    image: [[0, "Foto wird vorbereitet"], [18, "Seitenstruktur wird erkannt"], [42, "Sätze und Wortformen werden analysiert"], [68, "Wortschatz wird mit deiner Karte verglichen"], [84, "Erklärungen und Beispiele werden vorbereitet"]],
    text: [[0, "Text wird gelesen"], [22, "Grundformen und Wendungen werden erkannt"], [50, "Wortschatz wird mit deiner Karte verglichen"], [76, "Erklärungen und Beispiele werden vorbereitet"]],
  } : progressStages;
  const localizedStageLabel = (type, progress) =>
    [...localizedProgressStages[type]].reverse().find(([threshold]) => progress >= threshold)?.[1];
  const [mode, setMode] = useState("image");
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState("");
  const [imageData, setImageData] = useState("");
  const [preparingImage, setPreparingImage] = useState(false);
  const [job, setJob] = useState({ active: false, progress: 0, type: "image", label: "" });
  const [error, setError] = useState("");
  const [addingId, setAddingId] = useState("");
  const [addingAll, setAddingAll] = useState(false);
  const [addedIds, setAddedIds] = useState(new Set());
  const [notice, setNotice] = useState("");
  const progressTimer = useRef(null);
  const abortController = useRef(null);
  const requestTimeout = useRef(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
    if (progressTimer.current) clearInterval(progressTimer.current);
    if (requestTimeout.current) clearTimeout(requestTimeout.current);
    abortController.current?.abort();
  }, [preview]);

  const prepareImage = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(language === "de" ? "Das Foto konnte nicht gelesen werden" : "Не удалось прочитать фотографию"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error(language === "de" ? "Das Foto konnte nicht geöffnet werden" : "Не удалось открыть фотографию"));
      image.onload = () => {
        const maxSide = 1800;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        context.fillStyle = "#fff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", .86));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  const chooseFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setImageData("");
    setResult(null);
    setError("");
    setNotice("");
    setPreparingImage(true);
    try {
      setImageData(await prepareImage(file));
    } catch (imageError) {
      setError(imageError.message);
    } finally {
      setPreparingImage(false);
    }
  };

  const startProgress = (type) => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    setJob({ active: true, progress: 4, type, label: localizedStageLabel(type, 4) });
    progressTimer.current = setInterval(() => {
      setJob((current) => {
        if (!current.active || current.progress >= 91) return current;
        const increment = current.progress < 45 ? 4 : current.progress < 75 ? 2 : 1;
        const progress = Math.min(91, current.progress + increment);
        return { ...current, progress, label: localizedStageLabel(type, progress) };
      });
    }, 650);
  };

  const finishProgress = async () => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    setJob((current) => ({ ...current, progress: 100, label: t("done") }));
    await new Promise((resolve) => setTimeout(resolve, 350));
    setJob((current) => ({ ...current, active: false }));
  };

  const failProgress = () => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    setJob((current) => ({ ...current, active: false }));
  };

  const runAnalysis = async (type) => {
    if (job.active) return;
    setError("");
    setNotice("");
    setResult(null);
    setAddedIds(new Set());
    setAddingId("");
    startProgress(type);
    abortController.current = new AbortController();
    requestTimeout.current = setTimeout(() => abortController.current?.abort(), 120000);
    try {
      const data = type === "image"
        ? await analyzeImage(imageData, abortController.current.signal)
        : await analyzeText(text, abortController.current.signal);
      setResult(data);
      if (data.sourceText) setText(data.sourceText);
      await finishProgress();
      requestAnimationFrame(() => document.querySelector(".analysis-results")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (requestError) {
      failProgress();
      setError(requestError.message);
    } finally {
      if (requestTimeout.current) clearTimeout(requestTimeout.current);
      requestTimeout.current = null;
      abortController.current = null;
    }
  };

  const cancelAnalysis = () => {
    abortController.current?.abort();
    failProgress();
  };

  const addVocabulary = async (word) => {
    const id = word.id || word.display || word.label;
    if (addingId || addedIds.has(id)) return;
    setAddingId(id);
    setError("");
    try {
      await onAddWord({
        label: word.display || word.label,
        translationRu: word.translationRu,
        type: word.type,
        cefr: word.cefr,
        explanationRu: word.explanationRu,
        topicSuggestion: word.topicSuggestion,
        relatedTerms: word.relatedTerms || [],
        collocations: word.collocations || [],
        examples: word.examples || [],
        source: mode === "image" ? "ai-image-analysis" : "ai-text-analysis"
      });
      setAddedIds((current) => new Set([...current, id]));
      setResult((current) => current ? {
        ...current,
        vocabulary: current.vocabulary?.map((item) => item.id === word.id ? { ...item, alreadyInMap: true } : item)
      } : current);
      setNotice(language === "de" ? `„${word.display || word.label}“ wurde zur Karte hinzugefügt` : `«${word.display || word.label}» добавлено в карту`);
      setTimeout(() => setNotice(""), 2500);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setAddingId("");
    }
  };

  const addAllVocabulary = async () => {
    const newWords = vocabulary.filter((word) => {
      const id = word.id || word.display || word.label;
      return !word.alreadyInMap && !word.nodeId && !addedIds.has(id) && word.importance !== "low";
    });
    if (!newWords.length || addingAll) return;
    setAddingAll(true);
    setError("");
    try {
      const payload = newWords.map((word) => ({
        label: word.display || word.label,
        translationRu: word.translationRu,
        type: word.type,
        cefr: word.cefr,
        explanationRu: word.explanationRu,
        topicSuggestion: word.topicSuggestion,
        relatedTerms: word.relatedTerms || [],
        collocations: word.collocations || [],
        examples: word.examples || [],
        source: mode === "image" ? "ai-image-analysis" : "ai-text-analysis"
      }));
      const data = await onAddWords(payload);
      const addedLabels = new Set(data.added.map((node) => node.label.toLowerCase()));
      const newIds = newWords
        .filter((word) => addedLabels.has((word.display || word.label).toLowerCase()))
        .map((word) => word.id || word.display || word.label);
      setAddedIds((current) => new Set([...current, ...newIds]));
      setResult((current) => current ? {
        ...current,
        vocabulary: current.vocabulary?.map((item) =>
          addedLabels.has((item.display || item.label).toLowerCase()) ? { ...item, alreadyInMap: true } : item
        )
      } : current);
      setNotice(language === "de" ? `Hinzugefügte Wörter: ${data.added.length}` : `Добавлено слов: ${data.added.length}`);
      setTimeout(() => setNotice(""), 2500);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setAddingAll(false);
    }
  };

  const vocabulary = (result?.vocabulary || result?.unknownWords || []).filter((word) => word.status !== "known");

  return (
    <section className="screen-section analyze-screen">
      <div className="plain-page-header">
        <span>{t("newMaterial")}</span>
        <h1>{t("importTitle")}</h1>
        <p>{t("importLegacyIntro")}</p>
      </div>

      <div className="import-mode-tabs">
        <button className={mode === "image" ? "active" : ""} onClick={() => setMode("image")} disabled={job.active}>
          <b>▧</b><span>{t("photo")}</span>
        </button>
        <button className={mode === "text" ? "active" : ""} onClick={() => setMode("text")} disabled={job.active}>
          <b>≡</b><span>{t("text")}</span>
        </button>
      </div>

      {mode === "image" ? (
        <div className="image-import-card">
          {preview ? (
            <div className="image-preview-large">
              <img src={preview} alt={t("selectedMaterial")} />
              <label className="replace-image">
                <input type="file" accept="image/*" capture="environment" onChange={chooseFile} />
                {t("replacePhoto")}
              </label>
            </div>
          ) : (
            <label className="camera-picker">
              <input type="file" accept="image/*" capture="environment" onChange={chooseFile} />
              <span className="camera-icon">▧</span>
              <strong>{t("photoPage")}</strong>
              <small>{t("chooseGallery")}</small>
            </label>
          )}
          {preparingImage && <div className="image-preparing">{t("prepareImage")}</div>}
          {preview && !preparingImage && (
            <button className="analyze-main-button" disabled={!imageData || job.active} onClick={() => runAnalysis("image")}>
              <span>{t("analyzePhoto")}</span><b>✦</b>
            </button>
          )}
          <p className="privacy-note">{t("privacyPhoto")}</p>
        </div>
      ) : (
        <div className="glass-card text-analyzer">
          <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={t("pasteGerman")} />
          <div className="analyzer-footer">
            <span>{text.trim() ? text.trim().split(/\s+/).length : 0} {t("words").toLowerCase()}</span>
            <button className="analyze-main-button compact" disabled={!text.trim() || job.active} onClick={() => runAnalysis("text")}>{t("analyze")} <b>✦</b></button>
          </div>
        </div>
      )}

      {job.active && (
        <div className="analysis-progress" aria-live="polite">
          <div className="progress-copy"><span>{job.label}</span><b>{job.progress}%</b></div>
          <div className="progress-track"><i style={{ width: `${job.progress}%` }} /></div>
          <div className="progress-bottom"><small>{job.label}</small><button onClick={cancelAnalysis}>{t("cancelAnalysis")}</button></div>
        </div>
      )}

      {error && <div className="inline-error import-error">{error}<button onClick={() => setError("")}>×</button></div>}
      {notice && <div className="success-toast">✓ {notice}</div>}

      {result && !job.active && (
        <div className="analysis-results">
          {result.provider === "openai" && (
            <div className="ai-analysis-overview">
              <div><span>AI-ANALYSE · {result.difficulty}</span><h2>{result.titleRu}</h2></div>
              <p>{result.summaryRu}</p>
              <small>{result.textTypeRu}</small>
            </div>
          )}

          <div className="stats-grid four">
            <StatCard value={result.summary.totalTokens} label={t("words")} />
            <StatCard value={result.summary.knownCount} label={t("familiar")} tone="green" />
            <StatCard value={result.summary.boundaryCount} label={t("review")} tone="yellow" />
            <StatCard value={result.summary.unknownCount} label={t("useful")} tone="red" />
          </div>

          <details className="source-text-card">
            <summary>{t("showSource")} <span>⌄</span></summary>
            <div className="highlighted-text">
              {(result.highlightedTokens || []).map((token, index) => <span className={token.status} key={`${index}-${token.text}`}>{token.text}</span>)}
            </div>
          </details>

          <div className="ai-vocabulary">
            <div className="results-heading">
              <div><span>{t("forLearning")}</span><h2>{t("usefulVocabulary")}</h2></div>
              <div className="results-actions"><small>{vocabulary.length} {t("elements")}</small><button disabled={addingAll} onClick={addAllVocabulary}>{addingAll ? t("adding") : t("addImportant")}</button></div>
            </div>
            <div className="vocabulary-grid">
              {vocabulary.slice(0, 30).map((word) => {
                const id = word.id || word.display || word.label;
                const label = word.display || word.label;
                const added = word.alreadyInMap || Boolean(word.nodeId) || addedIds.has(id);
                return (
                  <article key={id} className={added ? "added" : ""}>
                    <div className="vocab-main">
                      <div><strong>{label}</strong><span>{word.translationRu}</span></div>
                      <small>{word.cefr || ""}</small>
                    </div>
                    {word.grammarRu && <p className="vocab-grammar">{word.grammarRu}</p>}
                    {!!word.collocations?.length && <div className="vocab-chips">{word.collocations.slice(0, 3).map((item) => <span key={item.de}>{item.de}</span>)}</div>}
                    {!!word.examples?.length && <blockquote><b>{word.examples[0].de}</b><span>{word.examples[0].ru}</span></blockquote>}
                    {!!word.antonyms?.length && <div className="vocab-antonyms">{t("antonyms")}: {word.antonyms.join(", ")}</div>}
                    <button disabled={added || addingId === id} onClick={() => addVocabulary(word)}>
                      {addingId === id ? t("adding") : added ? t("inMap") : t("addToMap")}
                    </button>
                  </article>
                );
              })}
            </div>
          </div>

          {!!result.usefulPhrases?.length && (
            <div className="useful-phrases-card">
              <div className="results-heading"><div><span>{t("sourceMaterial")}</span><h2>{t("readyPhrases")}</h2></div></div>
              {result.usefulPhrases.map((phrase) => <article key={phrase.de}><strong>{phrase.de}</strong><span>{phrase.ru}</span><p>{phrase.explanationRu}</p></article>)}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
