import { useMemo, useState } from "react";

export default function WordLibrary({ graph, onSelect, onAdd, onExpand, readOnly = false }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [cefr, setCefr] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [showExpand, setShowExpand] = useState(false);
  const [expandTopic, setExpandTopic] = useState("");
  const [expanding, setExpanding] = useState(false);
  const [form, setForm] = useState({ label: "", translationRu: "", cefr: "B1", type: "word" });
  const nodes = useMemo(() => (graph?.nodes || [])
    .filter((node) => node && node.type !== "topic")
    .filter((node) => status === "all" || node.status === status)
    .filter((node) => cefr === "all" || node.cefr === cefr)
    .filter((node) => !query || `${node.label || ""} ${node.translationRu || ""} ${node.topic || ""}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      const topicOrder = String(a.topic || "").localeCompare(String(b.topic || ""), "de");
      if (topicOrder) return topicOrder;
      return String(a.label || "").localeCompare(String(b.label || ""), "de");
    }), [graph?.nodes, query, status, cefr]);

  const submit = async (event) => {
    event.preventDefault();
    await onAdd(form);
    setForm({ label: "", translationRu: "", cefr: "B1", type: "word" });
    setShowAdd(false);
  };

  const expand = async (event) => {
    event.preventDefault();
    setExpanding(true);
    try {
      await onExpand(expandTopic);
      setShowExpand(false);
      setExpandTopic("");
    } finally {
      setExpanding(false);
    }
  };

  return (
    <section className="library-panel">
      <div className="library-actions">
        <label><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти слово, перевод или тему" /></label>
        {!readOnly && <button onClick={() => setShowAdd(!showAdd)}>+</button>}
      </div>
      {showAdd && <form className="add-word-form" onSubmit={submit}>
        <div><input required value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} placeholder="das Anliegen" /><input value={form.translationRu} onChange={(event) => setForm({ ...form, translationRu: event.target.value })} placeholder="обращение, вопрос" /></div>
        <div><select value={form.cefr} onChange={(event) => setForm({ ...form, cefr: event.target.value })}><option>A1</option><option>A2</option><option>B1</option><option>B2</option><option>C1</option></select><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option value="word">Слово</option><option value="verb">Глагол</option><option value="phrase">Фраза</option><option value="concept">Понятие</option></select><button>Добавить</button></div>
      </form>}
      {!readOnly && <button className="expand-library-button" onClick={() => setShowExpand(!showExpand)}>✦ Расширить карту по теме</button>}
      {showExpand && <form className="expand-library-form" onSubmit={expand}><input required value={expandTopic} onChange={(event) => setExpandTopic(event.target.value)} placeholder="Например: собеседование, налоги, архитектура ПО" /><button disabled={expanding}>{expanding ? "Создаём…" : "Добавить 15"}</button></form>}
      <div className="library-filters">
        {[["all", "Все"], ["known", "Знаю"], ["boundary", "Граница"], ["unknown", "Новые"]].map(([id, label]) => <button className={status === id ? "active" : ""} key={id} onClick={() => setStatus(id)}>{label}</button>)}
        <select value={cefr} onChange={(event) => setCefr(event.target.value)} aria-label="Уровень слова">
          <option value="all">Все уровни</option><option>A1</option><option>A2</option><option>B1</option><option>B2</option><option>C1</option>
        </select>
      </div>
      <div className="library-count">{nodes.length} элементов</div>
      <div className="library-list">
        {nodes.map((node) => <button key={node.id} onClick={() => onSelect(node)}>
          <i className={node.status} /><div><strong>{node.label}</strong><span>{node.translationRu}</span></div><small>{node.cefr}</small>
        </button>)}
      </div>
    </section>
  );
}
