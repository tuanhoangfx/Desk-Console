import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { HubRuntimeConsoleTerm } from "./HubRuntimeConsoleTerm";

/** Newest-first console body — P0003 / P0010 SSOT (limit + scroll-to-top on new line). */
export const HUB_RUNTIME_CONSOLE_RENDER_LIMIT = 200;

export type HubRuntimeConsoleEntry = {
  id: string;
};

export function HubRuntimeConsoleContent<T extends HubRuntimeConsoleEntry>({
  logs,
  renderLimit = HUB_RUNTIME_CONSOLE_RENDER_LIMIT,
  emptyHint = "Waiting for commands…",
  legend,
  className = "",
  wrapClassName = "",
  renderLine,
}: {
  /** Newest-first array (index 0 = latest). */
  logs: readonly T[];
  renderLimit?: number;
  emptyHint?: ReactNode;
  legend?: ReactNode;
  className?: string;
  wrapClassName?: string;
  renderLine: (log: T) => ReactNode;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const visibleLogs = useMemo(() => logs.slice(0, renderLimit), [logs, renderLimit]);
  const newestId = visibleLogs[0]?.id;

  useEffect(() => {
    const scrollEl = bodyRef.current?.querySelector<HTMLElement>(".hub-runtime-term__body");
    if (!scrollEl) return;
    scrollEl.scrollTop = 0;
  }, [newestId, visibleLogs.length]);

  return (
    <div ref={bodyRef} className={wrapClassName} role="log" aria-live="polite">
      <HubRuntimeConsoleTerm legend={legend} className={className}>
        {visibleLogs.length === 0 ? (
          <div className="text-hub-muted">{emptyHint}</div>
        ) : (
          visibleLogs.map((log) => renderLine(log))
        )}
        {logs.length > renderLimit ? (
          <div className="text-hub-muted">
            Showing latest {renderLimit} of {logs.length} lines
          </div>
        ) : null}
      </HubRuntimeConsoleTerm>
    </div>
  );
}
