import { useState } from "react";
import { askTutor } from "../api.js";
import { useLanguage } from "../i18n.jsx";

export default function AITutorPanel() {
  const { language } = useLanguage();
  const modes = language === "de"
    ? [["explain", "Erklären"], ["correct", "Text korrigieren"], ["practice", "Übung erstellen"]]
    : [["explain", "Объяснить"], ["correct", "Исправить текст"], ["practice", "Дать практику"]];
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
        <div><span className="eyebrow purple">{language === "de" ? "SPRACHASSISTENT" : "ЯЗЫКОВОЙ ПОМОЩНИК"}</span><h2>{language === "de" ? "Wort oder Wendung verstehen" : "Разобрать слово или фразу"}</h2><p>{language === "de" ? "Erklärt Bedeutung, Rektion, Beispiele, Synonyme und Antonyme." : "Покажет значение, управление, примеры, синонимы и антонимы."}</p></div>
      </div>
      <div className="mode-tabs">
        {modes.map(([id, label]) => <button className={mode === id ? "active" : ""} key={id} onClick={() => setMode(id)}>{label}</button>)}
      </div>
      <div className="tutor-composer">
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder={mode === "correct" ? (language === "de" ? "Deutschen Text zur Prüfung einfügen…" : "Вставь немецкий текст для проверки…") : (language === "de" ? "Zum Beispiel: Was ist der Unterschied zwischen dennoch und trotzdem?" : "Например: объясни разницу zwischen dennoch и trotzdem")} />
        <button onClick={submit} disabled={!message.trim() || loading}>{loading ? (language === "de" ? "Denke nach…" : "Думаю…") : (language === "de" ? "Fragen ✦" : "Спросить ✦")}</button>
      </div>
      {error && <div className="inline-error">{error}</div>}
      {answer && <div className="tutor-answer"><span>{answer.provider === "openai" ? "OPENAI" : "DEMO MODE"}</span><p>{answer.text}</p>{answer.notice && <small>{answer.notice}</small>}</div>}
    </section>
  );
}
