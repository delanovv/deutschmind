import React from "react";
import { useLanguage } from "../i18n.jsx";

class ErrorBoundary extends React.Component {
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
        <h1>{this.props.copy.crashTitle}</h1>
        <p>{this.props.copy.crashText}</p>
        <button onClick={() => this.setState({ error: null })}>{this.props.copy.returnApp}</button>
        <button className="crash-reload" onClick={() => window.location.reload()}>{this.props.copy.reload}</button>
      </main>
    );
  }
}

export default function AppErrorBoundary({ children }) {
  const { t } = useLanguage();
  const copy = {
    crashTitle: t("crashTitle"),
    crashText: t("crashText"),
    returnApp: t("returnApp"),
    reload: t("reload"),
  };
  return <ErrorBoundary copy={copy}>{children}</ErrorBoundary>;
}
