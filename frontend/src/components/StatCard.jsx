export default function StatCard({ value, label, tone }) {
  return (
    <div className={`stat-card ${tone || ""}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
