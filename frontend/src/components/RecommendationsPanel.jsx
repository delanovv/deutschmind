import { useLanguage } from "../i18n.jsx";

export default function RecommendationsPanel({ items = [], compact = false, onSelect }) {
  const { language } = useLanguage();
  return (
    <section className="panel-section">
      <div className="section-heading">
        <div><span className="eyebrow purple">{language === "de" ? "SMARTE EMPFEHLUNG" : "УМНАЯ РЕКОМЕНДАЦИЯ"}</span><h2>{language === "de" ? "Der nächste sinnvolle Schritt" : "Следующий логичный шаг"}</h2></div>
      </div>
      <div className="recommendation-list">
        {items.slice(0, compact ? 1 : 6).map((item) => (
          <article className="recommendation-card" key={item.node.id}>
            <div className="recommendation-orbit"><span>{item.node.knowledgeScore}%</span></div>
            <div className="recommendation-copy">
              <div className="rec-title"><div><h3>{item.node.label}</h3><p>{item.node.translationRu}</p></div><button onClick={() => onSelect?.(item.node)}>↗</button></div>
              <p>{item.reasonRu}</p>
              {!!item.relatedKnownWords?.length && <div className="known-links">{language === "de" ? "Verknüpft" : "Связано"}: {item.relatedKnownWords.join(" · ")}</div>}
              {item.suggestedCollocations?.map((collocation) => (
                <div className="phrase-chip" key={collocation.de}><b>“</b><span>{collocation.de}<small>{collocation.ru}</small></span></div>
              ))}
              <strong className="next-action">{item.nextActionRu}</strong>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
