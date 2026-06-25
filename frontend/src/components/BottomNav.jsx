import { useLanguage } from "../i18n.jsx";

export default function BottomNav({ active, onChange }) {
  const { t } = useLanguage();
  const items = [
    { id: "today", icon: "✓", label: t("navToday") },
    { id: "map", icon: "⌘", label: t("navMap") },
    { id: "import", icon: "+", label: t("navImport") },
    { id: "memory", icon: "◫", label: t("navMemory") }
  ];
  return (
    <nav className="bottom-nav" aria-label={t("mainNavigation")}>
      {items.map((item) => (
        <button
          key={item.id}
          className={active === item.id ? "active" : ""}
          onClick={() => onChange(item.id)}
          aria-label={item.label}
        >
          <b>{item.icon}</b>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
