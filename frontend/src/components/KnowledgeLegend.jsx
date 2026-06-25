import { useLanguage } from "../i18n.jsx";

export default function KnowledgeLegend() {
  const { t } = useLanguage();
  return (
    <div className="legend">
      <span><i className="dot known" /> {t("legendKnown")}</span>
      <span><i className="dot boundary" /> {t("legendBoundary")}</span>
      <span><i className="dot unknown" /> {t("legendUnknown")}</span>
    </div>
  );
}
