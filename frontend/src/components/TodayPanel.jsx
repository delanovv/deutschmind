import { useMemo, useState } from "react";
import { useLanguage } from "../i18n.jsx";

export default function TodayPanel({ practice, recommendations, onAnswer, onComplete, onSelect }) {
  const { t, locale } = useLanguage();
  const answers = [["known", t("easy")], ["boundary", t("hard")], ["unknown", t("forgot")]];
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [sessionAnswers, setSessionAnswers] = useState([]);
  const item = practice?.items?.[index];
  const progress = practice?.items?.length ? Math.round((index / practice.items.length) * 100) : 0;
  const date = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(new Date()), [locale]);

  const answer = async (status) => {
    await onAnswer(item.node.id, { status });
    const nextAnswers = [...sessionAnswers, { nodeId: item.node.id, status }];
    setSessionAnswers(nextAnswers);
    if (index + 1 >= practice.items.length) {
      await onComplete(nextAnswers);
      setStarted(false);
      setIndex(0);
      setSessionAnswers([]);
    } else {
      setIndex(index + 1);
    }
  };

  if (started && item) {
    return (
      <section className="today-screen practice-mode">
        <div className="practice-top"><button onClick={() => setStarted(false)}>×</button><span>{index + 1} {t("of")} {practice.items.length}</span></div>
        <div className="practice-progress"><i style={{ width: `${progress}%` }} /></div>
        <article className="practice-card">
          <span className="practice-kind">{item.mode === "recall" ? t("recall") : item.mode === "production" ? t("use") : t("rate")}</span>
          <h1>{item.prompt}</h1>
          <button className="show-answer" onClick={() => onSelect(item.node)}>{t("showCard")}</button>
          <div className="practice-word"><strong>{item.node.label}</strong><span>{item.node.translationRu}</span></div>
        </article>
        <div className="practice-answers">
          {answers.map(([status, label]) => <button key={status} className={status} onClick={() => answer(status)}>{label}</button>)}
        </div>
      </section>
    );
  }

  return (
    <section className="today-screen">
      <header className="today-header">
        <span>{date}</span>
        <h1>{t("todayTitle")}</h1>
        <p>{t("todayIntro")}</p>
      </header>
      <article className="daily-focus">
        <div className="focus-top"><span>{t("yourPractice")}</span><b>{practice?.estimatedMinutes || 8} {t("minutes")}</b></div>
        <h2>{practice?.items?.length || 0} {t("wordsNeedAttention")}</h2>
        <p>{t("practiceIntro")}</p>
        <div className="focus-preview">
          {(practice?.items || []).slice(0, 5).map(({ node }) => <span key={node.id}>{node.label.replace(/^(der|die|das)\s/i, "")}</span>)}
        </div>
        <button onClick={() => setStarted(true)} disabled={!practice?.items?.length}>{t("startPractice")} <span>→</span></button>
      </article>
      <section className="today-next">
        <div className="simple-heading"><div><span>{t("next")}</span><h2>{t("nearestWords")}</h2></div><small>{t("basedOnMap")}</small></div>
        <div className="next-word-list">
          {(recommendations || []).slice(0, 4).map((item) => (
            <button key={item.node.id} onClick={() => onSelect(item.node)}>
              <div><strong>{item.node.label}</strong><span>{item.node.translationRu}</span></div>
              <b>{item.node.knowledgeScore}%</b>
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}
