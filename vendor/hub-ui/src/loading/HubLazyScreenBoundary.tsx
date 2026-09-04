import { Component, useState, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  label: string;
  /** `chrome` = compact header fallback so the directory stays mounted. */
  variant?: "screen" | "chrome";
  onRetry?: () => void;
};

type State = { error: Error | null };

/**
 * Host boundary around React.lazy screens. Import/render throws used to unmount
 * #root and trip hub-boot-fallback (“This screen stopped rendering”). Sidebar stays.
 * `variant="chrome"` keeps the directory when only Notify / header ops fail.
 */
export class HubLazyScreenBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[Hub ${this.props.label}]`, error, info.componentStack);
    try {
      const w = window as Window & { __HUB_LAST_RENDER_ERROR?: string };
      w.__HUB_LAST_RENDER_ERROR = `${error.stack || error.message}\n${info.componentStack || ""}`;
    } catch {
      /* ignore */
    }
  }

  private retry = () => {
    this.setState({ error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.error) {
      if (this.props.variant === "chrome") {
        return (
          <div className="flex shrink-0 items-center" role="status" title={this.state.error.message}>
            <button type="button" className="btn text-xs opacity-70" onClick={this.retry}>
              Retry {this.props.label}
            </button>
          </div>
        );
      }
      return (
        <div className="m-6 max-w-lg rounded-xl border border-rose-500/40 bg-rose-500/10 p-5 text-sm text-rose-100">
          <h2 className="mb-2 text-base font-semibold">{this.props.label} failed to load</h2>
          <p className="mb-3 font-mono text-[12px] text-rose-200/90">{this.state.error.message}</p>
          <p className="text-xs text-[var(--muted)]">
            Reload this tab. React.lazy caches a failed import until a full refresh.
          </p>
          <button type="button" className="btn mt-4 text-[12px]" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Remount-on-retry wrapper for header Notify / Log / Settings. */
export function HubChromeBoundary({ children, label }: { children: ReactNode; label: string }) {
  const [gen, setGen] = useState(0);
  return (
    <HubLazyScreenBoundary key={gen} label={label} variant="chrome" onRetry={() => setGen((n) => n + 1)}>
      {children}
    </HubLazyScreenBoundary>
  );
}
