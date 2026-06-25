import { useEffect, useState } from "react";

const statusNames = { known: "Знаю", boundary: "На границе", unknown: "Новое" };

const normalizeContent = (value) => String(value || "")
  .toLocaleLowerCase("de-DE")
  .replace(/^(der|die|das)\s+/, "")
  .replace(/[^\p{L}\p{N}]+/gu, " ")
  .trim();

const isRealUsageExample = (example) => {
  const text = String(example?.de || "").trim();
  if (!text) return false;
  if (/^(heute\s+)?lerne\s+ich\b/i.test(text)) return false;
  if (/^das\s+wort\b.*\b(bedeutet|heißt)\b/i.test(text)) return false;
  if (/^ich\s+kenne\s+(das\s+)?wort\b/i.test(text)) return false;
  return text.split(/\s+/).length >= 4;
};

export default function NodeCard({ node, graph, onClose, onNavigate, onKnowledgeChange, onEdit, onDelete, saving, branchLoading, branchSuggestion, onRetryBranch }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  useEffect(() => {
    setDraft({ label: node?.label || "", translationRu: node?.translationRu || "", explanationRu: node?.explanationRu || "", cefr: node?.cefr || "B1" });
    setEditing(false);
  }, [node?.id]);
  if (!node) return null;
  const nodeMap = new Map((graph?.nodes || []).map((item) => [item.id, item]));
  const relations = (graph?.edges || [])
    .filter((edge) => edge.source === node.id || edge.target === node.id)
    .map((edge) => ({
      type: edge.type,
      node: nodeMap.get(edge.source === node.id ? edge.target : edge.source)
    }))
    .filter((item) => item.node && item.node.label !== node.topic);
  const opposites = relations.filter((item) => item.type === "opposite_of").map((item) => item.node);
  const verbs = relations.filter((item) => item.type === "verb_for").map((item) => item.node);
  const connected = relations.filter((item) => !["opposite_of", "verb_for", "parent_of"].includes(item.type)).map((item) => item.node);
  const knownContent = (graph?.nodes || [])
    .filter((item) => item.type !== "topic" && item.status === "known" && item.id !== node.id)
    .map((item) => normalizeContent(item.label))
    .filter((label) => label.length > 3);
  const visibleExamples = (node.examples || []).filter(isRealUsageExample).filter((example) => {
    const sentence = ` ${normalizeContent(example.de)} `;
    return !knownContent.some((label) => sentence.includes(` ${label} `));
  });
  const relationButtons = (items) => (
    <div className="relation-links">
      {[...new Map(items.map((item) => [item.id, item])).values()].map((item) => (
        <button key={item.id} onClick={() => onNavigate?.(item)}>
          <span>{item.label}</span>
          {item.topic !== node.topic && <small>другая паутина · {item.topic}</small>}
          <b>→</b>
        </button>
      ))}
    </div>
  );
  return (
    <div className="node-sheet-backdrop" onClick={onClose}>
      <aside className="node-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-handle" />
        <button className="sheet-close" onClick={onClose}>×</button>
        <span className={`status-badge ${node.status}`}>{statusNames[node.status]}</span>
        {editing ? <form className="node-edit-form" onSubmit={async (event) => { event.preventDefault(); await onEdit(node.id, draft); setEditing(false); }}>
          <input value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} />
          <input value={draft.translationRu} onChange={(event) => setDraft({ ...draft, translationRu: event.target.value })} />
          <textarea value={draft.explanationRu} onChange={(event) => setDraft({ ...draft, explanationRu: event.target.value })} />
          <div><select value={draft.cefr} onChange={(event) => setDraft({ ...draft, cefr: event.target.value })}><option>A1</option><option>A2</option><option>B1</option><option>B2</option><option>C1</option></select><button>Сохранить</button><button type="button" onClick={() => setEditing(false)}>Отмена</button></div>
        </form> : <>
          <h2>{node.label}</h2>
          <p className="translation">{node.translationRu}</p>
        </>}
        <div className="node-meta">
          {node.cefr && node.type !== "topic" && <span>{node.cefr}</span>}<span>{node.type}</span><span>{node.topic}</span>
          {node.plural && <span>Plural: {node.plural}</span>}
        </div>
        <div className="score-row"><span>Уверенность</span><strong>{node.knowledgeScore}%</strong></div>
        <div className="score-bar"><i style={{ width: `${node.knowledgeScore}%` }} /></div>
        <p className="explanation">{node.explanationRu}</p>
        {(branchLoading || branchSuggestion) && <div className={`ai-branch-card ${branchLoading ? "loading" : ""}`}>
          <small>AI-ПРОДОЛЖЕНИЕ ПАУТИНЫ</small>
          {branchLoading && <>
            <div className="branch-loader"><i /><i /><i /></div>
            <p>Ищу новое близкое слово, которого ещё нет в твоей карте…</p>
          </>}
          {!branchLoading && branchSuggestion?.node && (
            <button onClick={() => onNavigate?.(branchSuggestion.node)}>
              <div>
                <strong>{branchSuggestion.node.label}</strong>
                <span>{branchSuggestion.node.translationRu}</span>
              </div>
              <b>→</b>
            </button>
          )}
          {!branchLoading && branchSuggestion?.pending && <>
            <div className="branch-loader"><i /><i /><i /></div>
            <p>{branchSuggestion.reasonRu || "AI расширяет паутину в фоне. Новые узлы появятся после завершения задачи."}</p>
          </>}
          {!branchLoading && branchSuggestion?.completed && (
            <p>{branchSuggestion.reasonRu || "Ветка расширена."}</p>
          )}
          {!branchLoading && branchSuggestion?.error && <>
            <p>{branchSuggestion.error}</p>
            <button className="branch-retry" onClick={onRetryBranch}>Попробовать ещё раз</button>
          </>}
        </div>}
        {!!verbs.length && <div className="detail-block"><small>ТИПИЧНЫЕ ГЛАГОЛЫ</small>{relationButtons(verbs)}</div>}
        {!!opposites.length && <div className="detail-block"><small>АНТОНИМЫ</small>{relationButtons(opposites)}</div>}
        {!!connected.length && <div className="detail-block"><small>ПЕРЕЙТИ К ПОХОЖИМ</small>{relationButtons(connected)}</div>}
        {!!node.collocations?.length && (
          <div className="detail-block"><small>СЛОВОСОЧЕТАНИЯ</small>
            {node.collocations.map((item) => <p className="example-line" key={item.de}><b>{item.de}</b><span>{item.ru}</span></p>)}
          </div>
        )}
        {!!visibleExamples.length && (
          <div className="detail-block"><small>ПРИМЕР</small>
            {visibleExamples.map((item) => <p className="example-line" key={item.de}><b>{item.de}</b><span>{item.ru}</span></p>)}
          </div>
        )}
        <div className="knowledge-actions">
          <button disabled={saving} onClick={() => onKnowledgeChange(node.id, { status: "known" })}>Знаю</button>
          <button disabled={saving} onClick={() => onKnowledgeChange(node.id, { status: "boundary" })}>Частично</button>
          <button disabled={saving} onClick={() => onKnowledgeChange(node.id, { status: "unknown" })}>Не знаю</button>
        </div>
        {node.userAdded && <div className="personal-word-actions"><button onClick={() => setEditing(true)}>Редактировать</button><button onClick={() => onDelete?.(node.id)}>Удалить</button></div>}
      </aside>
    </div>
  );
}
