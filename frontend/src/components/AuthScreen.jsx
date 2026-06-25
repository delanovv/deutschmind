import { useState } from "react";
import { login, register, saveAccessToken } from "../api.js";

export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", displayName: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = mode === "login" ? await login(form) : await register(form);
      saveAccessToken(result.token);
      onAuthenticated(result.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-screen">
      <div className="auth-orbit"><i /><i /><i /><strong>D</strong></div>
      <span className="eyebrow">ПЕРСОНАЛЬНАЯ КАРТА ЯЗЫКА</span>
      <h1>{mode === "login" ? "С возвращением" : "Создай свою карту"}</h1>
      <p>У каждого пользователя — отдельные паутины, знания, материалы, настройки и история повторений.</p>
      <form onSubmit={submit}>
        {mode === "register" && <input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} placeholder="Имя" />}
        <input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email" autoComplete="email" />
        <input type="password" required minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Пароль — минимум 8 символов" autoComplete={mode === "login" ? "current-password" : "new-password"} />
        {error && <div className="auth-error">{error}</div>}
        <button disabled={loading}>{loading ? "Подождите…" : mode === "login" ? "Войти" : "Создать аккаунт"}</button>
      </form>
      <button className="auth-switch" onClick={() => setMode(mode === "login" ? "register" : "login")}>
        {mode === "login" ? "У меня ещё нет аккаунта" : "У меня уже есть аккаунт"}
      </button>
    </main>
  );
}
