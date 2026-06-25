export default function BoundaryPanel({ items = [], compact = false, onSelect }) {
  return (
    <section className="panel-section">
      <div className="section-heading">
        <div><span className="eyebrow">ТЕКУЩИЙ РУБЕЖ</span><h2>Граница знаний</h2></div>
        <span className="count-pill">{items.length}</span>
      </div>
      <p className="section-subtitle">Слова, которые находятся рядом с тем, что ты уже знаешь.</p>
      <div className="boundary-list">
        {items.slice(0, compact ? 3 : 10).map(({ node, proximityScore, reasonRu }) => (
          <button className="boundary-item" key={node.id} onClick={() => onSelect?.(node)}>
            <div className="word-icon">{node.label.replace(/^(der|die|das)\s/i, "").slice(0, 1).toUpperCase()}</div>
            <div className="boundary-copy">
              <div><strong>{node.label}</strong><span>{node.cefr} · +{proximityScore}</span></div>
              <p>{node.translationRu}</p>
              {!compact && <small>{reasonRu}</small>}
              <i><b style={{ width: `${node.knowledgeScore}%` }} /></i>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
