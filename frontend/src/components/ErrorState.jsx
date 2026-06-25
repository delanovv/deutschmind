export default function ErrorState({ message, onRetry }) {
  return (
    <div className="state-screen">
      <div className="state-icon">!</div>
      <h2>Связь потерялась</h2>
      <p>{message}</p>
      {onRetry && <button className="primary-button" onClick={onRetry}>Попробовать снова</button>}
    </div>
  );
}
