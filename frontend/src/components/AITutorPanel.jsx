import { useState } from "react";
import { askTutor } from "../api.js";

const modes = [
  ["explain", "Объяснить"],
  ["correct", "Исправить текст"],
  ["practice", "Дать практику"]
];

export default function AITutorPanel() {
  const [mode, setMode] = useState("explain");
  const [message, setMessage] = useState("");
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      setAnswer(await askTutor({ message, mode }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="ai-tutor">
      <div className="ai-heading">
        <div className="ai-avatar"><span>✦</span></div>
        <div><span className="eyebrow purple">ЯЗЫКОВОЙ ПОМОЩНИК</span><h2>Разобрать слово или фразу</h2><p>Покажет значение, управление, примеры, синонимы и антонимы.</p></div>
      </div>
      <div className="mode-tabs">
        {modes.map(([id, label]) => <button className={mode === id ? "active" : ""} key={id} onClick={() => setMode(id)}>{label}</button>)}
      </div>
      <div className="tutor-composer">
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder={mode === "correct" ? "Вставь немецкий текст для проверки…" : "Например: объясни разницу zwischen dennoch и trotzdem"} />
        <button onClick={submit} disabled={!message.trim() || loading}>{loading ? "Думаю…" : "Спросить ✦"}</button>
      </div>
      {error && <div className="inline-error">{error}</div>}
      {answer && <div className="tutor-answer"><span>{answer.provider === "openai" ? "OPENAI" : "DEMO MODE"}</span><p>{answer.text}</p>{answer.notice && <small>{answer.notice}</small>}</div>}
    </section>
  );
}
