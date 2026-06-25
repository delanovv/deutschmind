import { useEffect, useState } from "react";

const presets = [
  { label: "Все уровни", minCefr: "A1", maxCefr: "C1" },
  { label: "A2+", minCefr: "A2", maxCefr: "C1" },
  { label: "B1+", minCefr: "B1", maxCefr: "C1" },
  { label: "B2+", minCefr: "B2", maxCefr: "C1" },
  { label: "Только C1", minCefr: "C1", maxCefr: "C1" }
];

export default function MemoryPanel({ memory, profile, user, onSelect, onSavePreferences, saving, onLogout }) {
  const [preferences, setPreferences] = useState(profile?.learningPreferences || {});
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (profile?.learningPreferences) setPreferences(profile.learningPreferences);
  }, [profile?.learningPreferences]);
  const maxActivity = Math.max(1, ...(memory?.activityByDay || []).map((day) => day.count));
  const eventLabels = {
    knowledge_updated: "Изменена уверенность",
    node_added: "Добавлено новое слово",
    node_deleted: "Удалено личное слово",
    node_edited: "Отредактировано личное слово"
  };
  return (
    <section className="memory-screen">
      <header className="plain-page-header"><span>ЛИЧНАЯ ИСТОРИЯ</span><h1>Память</h1><p>Здесь видно не абстрактный уровень, а то, что ты добавлял, повторял и начинал забывать.</p></header>
      {user && <div className="account-strip"><div><strong>{user.display_name || user.email}</strong><span>{user.email}</span></div>{onLogout && <button onClick={onLogout}>Выйти</button>}</div>}
      <div className="memory-summary">
        <article><strong>{memory?.totals?.words || 0}</strong><span>слов в карте</span></article>
        <article><strong>{memory?.totals?.personal || 0}</strong><span>добавлено тобой</span></article>
        <article><strong>{memory?.totals?.sessions || 0}</strong><span>практик</span></article>
      </div>
      <section className="learning-settings">
        <div className="simple-heading">
          <div><span>ПЕРСОНАЛИЗАЦИЯ</span><h2>Что мне предлагать</h2></div>
          <small>{preferences.minCefr || "A1"}{preferences.maxCefr === "C1" ? "+" : `–${preferences.maxCefr || "C1"}`}</small>
        </div>
        <p>Этот диапазон применяется к новым AI-словам, практике, рекомендациям и разбору материалов. Уже сохранённые слова не удаляются.</p>
        <div className="level-presets">
          {presets.map((preset) => {
            const active = preferences.minCefr === preset.minCefr && preferences.maxCefr === preset.maxCefr;
            return <button className={active ? "active" : ""} key={preset.label} onClick={() => setPreferences({ ...preferences, minCefr: preset.minCefr, maxCefr: preset.maxCefr })}>{preset.label}</button>;
          })}
        </div>
        <div className="custom-range">
          <label>От<select value={preferences.minCefr || "A1"} onChange={(event) => {
            const minCefr = event.target.value;
            const levels = ["A1", "A2", "B1", "B2", "C1"];
            const maxCefr = levels.indexOf(preferences.maxCefr || "C1") < levels.indexOf(minCefr) ? minCefr : preferences.maxCefr;
            setPreferences({ ...preferences, minCefr, maxCefr });
          }}>{["A1", "A2", "B1", "B2", "C1"].map((level) => <option key={level}>{level}</option>)}</select></label>
          <label>До<select value={preferences.maxCefr || "C1"} onChange={(event) => setPreferences({ ...preferences, maxCefr: event.target.value })}>{["A1", "A2", "B1", "B2", "C1"].map((level) => <option key={level}>{level}</option>)}</select></label>
          <label>Слов в практике<select value={preferences.practiceSize || 12} onChange={(event) => setPreferences({ ...preferences, practiceSize: Number(event.target.value) })}>{[5, 8, 12, 20, 30].map((count) => <option key={count} value={count}>{count}</option>)}</select></label>
        </div>
        <div className="content-toggles">
          <label><input type="checkbox" checked={preferences.includeVerbs !== false} onChange={(event) => setPreferences({ ...preferences, includeVerbs: event.target.checked })} /><span>Глаголы</span></label>
          <label><input type="checkbox" checked={preferences.includePhrases !== false} onChange={(event) => setPreferences({ ...preferences, includePhrases: event.target.checked })} /><span>Фразы</span></label>
          <label><input type="checkbox" checked={preferences.includeAntonyms !== false} onChange={(event) => setPreferences({ ...preferences, includeAntonyms: event.target.checked })} /><span>Антонимы</span></label>
        </div>
        <button className="save-preferences" disabled={saving} onClick={async () => {
          await onSavePreferences(preferences);
          setSaved(true);
          setTimeout(() => setSaved(false), 2200);
        }}>{saving ? "Сохраняем…" : saved ? "✓ Настройки сохранены" : "Сохранить обучение"}</button>
      </section>
      <section className="memory-block">
        <div className="simple-heading"><div><span>14 ДНЕЙ</span><h2>Активность</h2></div></div>
        <div className="activity-chart">
          {(memory?.activityByDay || []).map((day) => <i key={day.date} title={`${day.date}: ${day.count}`} style={{ height: `${Math.max(8, (day.count / maxActivity) * 100)}%` }} />)}
        </div>
      </section>
      <section className="memory-block">
        <div className="simple-heading"><div><span>НУЖНО ВЕРНУТЬ</span><h2>Слабые места</h2></div></div>
        <div className="weak-list">
          {(memory?.weakNodes || []).slice(0, 6).map((node) => (
            <button key={node.id} onClick={() => onSelect(node)}>
              <span className={node.status} /><div><strong>{node.label}</strong><small>{node.topic} · {node.translationRu}</small></div><b>{node.knowledgeScore}%</b>
            </button>
          ))}
        </div>
      </section>
      <section className="memory-block">
        <div className="simple-heading"><div><span>НЕДАВНО</span><h2>Материалы</h2></div><small>{memory?.totals?.importedTexts || 0}</small></div>
        <div className="materials-list">
          {(memory?.importedTexts || []).slice(0, 6).map((item) => (
            <article key={item.id}>
              <div><strong>{item.titleRu || "Немецкий материал"}</strong><span>{item.textTypeRu || "Текст"}{item.difficulty ? ` · ${item.difficulty}` : ""}</span></div>
              <p>{item.text?.replace(/\s+/g, " ").slice(0, 135)}{item.text?.length > 135 ? "…" : ""}</p>
            </article>
          ))}
          {!memory?.importedTexts?.length && <p className="empty-copy">Здесь появятся проанализированные фотографии и тексты.</p>}
        </div>
      </section>
      <section className="memory-block">
        <div className="simple-heading"><div><span>ПОСЛЕДНИЕ ДЕЙСТВИЯ</span><h2>История</h2></div></div>
        <div className="timeline">
          {(memory?.recentEvents || []).slice(0, 12).map((event) => (
            <article key={event.id}><i /><div><strong>{eventLabels[event.type] || event.type}</strong><span>{event.label || "DeutschMind"} · {new Date(event.createdAt).toLocaleDateString("ru-RU")}</span></div></article>
          ))}
          {!memory?.recentEvents?.length && <p className="empty-copy">История появится после первой практики или добавленного слова.</p>}
        </div>
      </section>
    </section>
  );
}
