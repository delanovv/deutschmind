const items = [
  { id: "today", icon: "✓", label: "Сегодня" },
  { id: "map", icon: "⌘", label: "Карта" },
  { id: "import", icon: "+", label: "Импорт" },
  { id: "memory", icon: "◫", label: "Память" }
];

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="bottom-nav" aria-label="Основная навигация">
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
