import { useMemo, useState } from "react";

const answers = [
  ["known", "Легко"],
  ["boundary", "С трудом"],
  ["unknown", "Не помню"]
];

export default function TodayPanel({ practice, recommendations, onAnswer, onComplete, onSelect }) {
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [sessionAnswers, setSessionAnswers] = useState([]);
  const item = practice?.items?.[index];
  const progress = practice?.items?.length ? Math.round((index / practice.items.length) * 100) : 0;
  const date = useMemo(() => new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" }).format(new Date()), []);

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
        <div className="practice-top"><button onClick={() => setStarted(false)}>×</button><span>{index + 1} из {practice.items.length}</span></div>
        <div className="practice-progress"><i style={{ width: `${progress}%` }} /></div>
        <article className="practice-card">
          <span className="practice-kind">{item.mode === "recall" ? "ВСПОМНИ" : item.mode === "production" ? "ИСПОЛЬЗУЙ" : "ОЦЕНИ"}</span>
          <h1>{item.prompt}</h1>
          <button className="show-answer" onClick={() => onSelect(item.node)}>Показать карточку слова</button>
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
        <h1>Сегодня</h1>
        <p>Небольшая практика из слов, которые начинают забываться или находятся рядом с твоей границей.</p>
      </header>
      <article className="daily-focus">
        <div className="focus-top"><span>ТВОЯ ПРАКТИКА</span><b>{practice?.estimatedMinutes || 8} мин</b></div>
        <h2>{practice?.items?.length || 0} слов требуют внимания</h2>
        <p>Узнавание, активное вспоминание и короткие предложения — без лишней теории.</p>
        <div className="focus-preview">
          {(practice?.items || []).slice(0, 5).map(({ node }) => <span key={node.id}>{node.label.replace(/^(der|die|das)\s/i, "")}</span>)}
        </div>
        <button onClick={() => setStarted(true)} disabled={!practice?.items?.length}>Начать практику <span>→</span></button>
      </article>
      <section className="today-next">
        <div className="simple-heading"><div><span>ДАЛЬШЕ</span><h2>Ближайшие слова</h2></div><small>по твоей карте</small></div>
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
