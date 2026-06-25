import React from "react";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("DeutschMind UI error:", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="crash-screen">
        <div className="crash-icon">!</div>
        <h1>Экран споткнулся</h1>
        <p>Твои сохранённые слова не потеряны. Можно безопасно восстановить интерфейс.</p>
        <button onClick={() => this.setState({ error: null })}>Вернуться в приложение</button>
        <button className="crash-reload" onClick={() => window.location.reload()}>Перезагрузить страницу</button>
      </main>
    );
  }
}
