import { useState } from "react";
import { login, register, saveAccessToken } from "../api.js";
import { LanguageSwitch, useLanguage } from "../i18n.jsx";

export default function AuthScreen({ onAuthenticated }) {
  const { t } = useLanguage();
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
      <LanguageSwitch />
      <div className="auth-orbit"><i /><i /><i /><strong>D</strong></div>
      <span className="eyebrow">{t("personalMap")}</span>
      <h1>{mode === "login" ? t("welcomeBack") : t("createMap")}</h1>
      <p>{t("authIntro")}</p>
      <form onSubmit={submit}>
        {mode === "register" && <input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} placeholder={t("name")} />}
        <input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email" autoComplete="email" />
        <input type="password" required minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={t("passwordHint")} autoComplete={mode === "login" ? "current-password" : "new-password"} />
        {error && <div className="auth-error">{error}</div>}
        <button disabled={loading}>{loading ? t("wait") : mode === "login" ? t("login") : t("createAccount")}</button>
      </form>
      <button className="auth-switch" onClick={() => setMode(mode === "login" ? "register" : "login")}>
        {mode === "login" ? t("noAccount") : t("hasAccount")}
      </button>
    </main>
  );
}
