import { useEffect, useState } from "react";
import { useLanguage } from "../i18n.jsx";

export default function MemoryPanel({ memory, profile, user, onSelect, onSavePreferences, saving, onLogout }) {
  const { t, locale } = useLanguage();
  const presets = [
    { label: t("allLevelsPreset"), minCefr: "A1", maxCefr: "C1" },
    { label: "A2+", minCefr: "A2", maxCefr: "C1" },
    { label: "B1+", minCefr: "B1", maxCefr: "C1" },
    { label: "B2+", minCefr: "B2", maxCefr: "C1" },
    { label: t("onlyC1"), minCefr: "C1", maxCefr: "C1" }
  ];
  const [preferences, setPreferences] = useState(profile?.learningPreferences || {});
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (profile?.learningPreferences) setPreferences(profile.learningPreferences);
  }, [profile?.learningPreferences]);
  const maxActivity = Math.max(1, ...(memory?.activityByDay || []).map((day) => day.count));
  const eventLabels = {
    knowledge_updated: t("statusChanged"),
    node_added: t("nodeAdded"),
    node_deleted: t("nodeDeleted"),
    node_edited: t("nodeEdited")
  };
  return (
    <section className="memory-screen">
      <header className="plain-page-header"><span>{t("historyEyebrow")}</span><h1>{t("memoryTitle")}</h1><p>{t("memoryIntro")}</p></header>
      {user && <div className="account-strip"><div><strong>{user.display_name || user.email}</strong><span>{user.email}</span></div>{onLogout && <button onClick={onLogout}>{t("logout")}</button>}</div>}
      <div className="memory-summary">
        <article><strong>{memory?.totals?.words || 0}</strong><span>{t("wordsInMap")}</span></article>
        <article><strong>{memory?.totals?.personal || 0}</strong><span>{t("addedByYou")}</span></article>
        <article><strong>{memory?.totals?.sessions || 0}</strong><span>{t("sessions")}</span></article>
      </div>
      <section className="learning-settings">
        <div className="simple-heading">
          <div><span>{t("personalization")}</span><h2>{t("suggestions")}</h2></div>
          <small>{preferences.minCefr || "A1"}{preferences.maxCefr === "C1" ? "+" : `–${preferences.maxCefr || "C1"}`}</small>
        </div>
        <p>{t("settingsIntro")}</p>
        <div className="level-presets">
          {presets.map((preset) => {
            const active = preferences.minCefr === preset.minCefr && preferences.maxCefr === preset.maxCefr;
            return <button className={active ? "active" : ""} key={preset.label} onClick={() => setPreferences({ ...preferences, minCefr: preset.minCefr, maxCefr: preset.maxCefr })}>{preset.label}</button>;
          })}
        </div>
        <div className="custom-range">
          <label>{t("from")}<select value={preferences.minCefr || "A1"} onChange={(event) => {
            const minCefr = event.target.value;
            const levels = ["A1", "A2", "B1", "B2", "C1"];
            const maxCefr = levels.indexOf(preferences.maxCefr || "C1") < levels.indexOf(minCefr) ? minCefr : preferences.maxCefr;
            setPreferences({ ...preferences, minCefr, maxCefr });
          }}>{["A1", "A2", "B1", "B2", "C1"].map((level) => <option key={level}>{level}</option>)}</select></label>
          <label>{t("to")}<select value={preferences.maxCefr || "C1"} onChange={(event) => setPreferences({ ...preferences, maxCefr: event.target.value })}>{["A1", "A2", "B1", "B2", "C1"].map((level) => <option key={level}>{level}</option>)}</select></label>
          <label>{t("practiceSize")}<select value={preferences.practiceSize || 12} onChange={(event) => setPreferences({ ...preferences, practiceSize: Number(event.target.value) })}>{[5, 8, 12, 20, 30].map((count) => <option key={count} value={count}>{count}</option>)}</select></label>
        </div>
        <div className="content-toggles">
          <label><input type="checkbox" checked={preferences.includeVerbs !== false} onChange={(event) => setPreferences({ ...preferences, includeVerbs: event.target.checked })} /><span>{t("verbs")}</span></label>
          <label><input type="checkbox" checked={preferences.includePhrases !== false} onChange={(event) => setPreferences({ ...preferences, includePhrases: event.target.checked })} /><span>{t("phrases")}</span></label>
          <label><input type="checkbox" checked={preferences.includeAntonyms !== false} onChange={(event) => setPreferences({ ...preferences, includeAntonyms: event.target.checked })} /><span>{t("antonyms")}</span></label>
        </div>
        <button className="save-preferences" disabled={saving} onClick={async () => {
          await onSavePreferences(preferences);
          setSaved(true);
          setTimeout(() => setSaved(false), 2200);
        }}>{saving ? t("saving") : saved ? t("settingsSaved") : t("saveLearning")}</button>
      </section>
      <section className="memory-block">
        <div className="simple-heading"><div><span>{t("activity14")}</span><h2>{t("activity")}</h2></div></div>
        <div className="activity-chart">
          {(memory?.activityByDay || []).map((day) => <i key={day.date} title={`${day.date}: ${day.count}`} style={{ height: `${Math.max(8, (day.count / maxActivity) * 100)}%` }} />)}
        </div>
      </section>
      <section className="memory-block">
        <div className="simple-heading"><div><span>{t("needsReview")}</span><h2>{t("weakPoints")}</h2></div></div>
        <div className="weak-list">
          {(memory?.weakNodes || []).slice(0, 6).map((node) => (
            <button key={node.id} onClick={() => onSelect(node)}>
              <span className={node.status} /><div><strong>{node.label}</strong><small>{node.topic} · {node.translationRu}</small></div><b>{node.knowledgeScore}%</b>
            </button>
          ))}
        </div>
      </section>
      <section className="memory-block">
        <div className="simple-heading"><div><span>{t("recently")}</span><h2>{t("materials")}</h2></div><small>{memory?.totals?.importedTexts || 0}</small></div>
        <div className="materials-list">
          {(memory?.importedTexts || []).slice(0, 6).map((item) => (
            <article key={item.id}>
              <div><strong>{item.titleRu || t("germanMaterial")}</strong><span>{item.textTypeRu || t("text")}{item.difficulty ? ` · ${item.difficulty}` : ""}</span></div>
              <p>{item.text?.replace(/\s+/g, " ").slice(0, 135)}{item.text?.length > 135 ? "…" : ""}</p>
            </article>
          ))}
          {!memory?.importedTexts?.length && <p className="empty-copy">{t("noMaterials")}</p>}
        </div>
      </section>
      <section className="memory-block">
        <div className="simple-heading"><div><span>{t("recentActions")}</span><h2>{t("history")}</h2></div></div>
        <div className="timeline">
          {(memory?.recentEvents || []).slice(0, 12).map((event) => (
            <article key={event.id}><i /><div><strong>{eventLabels[event.type] || event.type}</strong><span>{event.label || "DeutschMind"} · {new Date(event.createdAt).toLocaleDateString(locale)}</span></div></article>
          ))}
          {!memory?.recentEvents?.length && <p className="empty-copy">{t("noHistory")}</p>}
        </div>
      </section>
    </section>
  );
}
