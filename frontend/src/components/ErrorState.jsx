import { useLanguage } from "../i18n.jsx";

export default function ErrorState({ message, onRetry }) {
  const { t } = useLanguage();
  return (
    <div className="state-screen">
      <div className="state-icon">!</div>
      <h2>{t("connectionLost")}</h2>
      <p>{message}</p>
      {onRetry && <button className="primary-button" onClick={onRetry}>{t("retry")}</button>}
    </div>
  );
}
