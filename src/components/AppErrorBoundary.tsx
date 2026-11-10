import { Component, type ErrorInfo, type ReactNode } from "react";
import {
  checkAndReloadIfBundleSkewed,
  recordHubCaughtBoundaryError,
} from "@tool-workspace/hub-ui";
import packageJson from "../../package.json";

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
  componentStack: string | null;
  devAutoRetried: boolean;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: null, devAutoRetried: false };
  private devRetryTimer: ReturnType<typeof setTimeout> | null = null;

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  private clearError = () => {
    if (this.state.error) {
      this.setState({ error: null, componentStack: null, devAutoRetried: false });
    }
  };

  componentDidMount() {
    window.addEventListener("popstate", this.clearError);
    if (import.meta.hot) {
      import.meta.hot.on("vite:afterUpdate", this.clearError);
    }
  }

  componentWillUnmount() {
    window.removeEventListener("popstate", this.clearError);
    if (import.meta.hot) {
      import.meta.hot.off("vite:afterUpdate", this.clearError);
    }
    if (this.devRetryTimer) {
      clearTimeout(this.devRetryTimer);
      this.devRetryTimer = null;
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[P0001] Uncaught render error:", error, info.componentStack);
    recordHubCaughtBoundaryError("screen", error);
    this.setState({ componentStack: info.componentStack ?? null });
    void checkAndReloadIfBundleSkewed(packageJson.version);

    if (import.meta.env.DEV && !this.state.devAutoRetried) {
      if (this.devRetryTimer) clearTimeout(this.devRetryTimer);
      this.devRetryTimer = setTimeout(() => {
        this.devRetryTimer = null;
        this.setState({ error: null, componentStack: null, devAutoRetried: true });
      }, 800);
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    const msg = this.state.error.message || String(this.state.error);
    const stack = [this.state.error.stack, this.state.componentStack].filter(Boolean).join("\n\n");

    return (
      <div
        role="alert"
        style={{
          minHeight: "100vh",
          width: "100%",
          padding: "24px",
          background: "var(--hub-surface-canvas, #090d16)",
          color: "var(--hub-text-primary, #e2e8f0)",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          boxSizing: "border-box",
        }}
      >
        <div style={{ maxWidth: 880, margin: "24px auto" }}>
          <h1 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 8px", color: "#f87171" }}>
            Desk Console encountered a render error
          </h1>
          <p style={{ margin: "0 0 16px", color: "#94a3b8", fontSize: 13 }}>
            A runtime exception stopped this screen from rendering. Retry or reload to recover cleanly.
          </p>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button
              type="button"
              onClick={this.clearError}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "1px solid rgba(148, 163, 184, 0.35)",
                background: "rgba(30, 41, 59, 0.55)",
                color: "#e2e8f0",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Retry
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "1px solid rgba(56, 189, 248, 0.4)",
                background: "rgba(14, 165, 233, 0.18)",
                color: "#e0f2fe",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Reload App
            </button>
          </div>
          <pre
            style={{
              margin: 0,
              padding: 12,
              borderRadius: 8,
              background: "rgba(15, 23, 42, 0.75)",
              border: "1px solid rgba(248, 113, 113, 0.28)",
              overflow: "auto",
              fontSize: 12,
              lineHeight: 1.45,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {stack || msg}
          </pre>
        </div>
      </div>
    );
  }
}
