export default function LoadingState({ message = "Строим карту твоего немецкого…" }) {
  return (
    <div className="state-screen">
      <div className="brain-loader"><span /><span /><span /></div>
      <p>{message}</p>
    </div>
  );
}
