import { useLanguage } from "../i18n.jsx";

export default function LoadingState({ message }) {
  const { t } = useLanguage();
  return (
    <div className="state-screen">
      <div className="brain-loader"><span /><span /><span /></div>
      <p>{message || t("loadingMap")}</p>
    </div>
  );
}
