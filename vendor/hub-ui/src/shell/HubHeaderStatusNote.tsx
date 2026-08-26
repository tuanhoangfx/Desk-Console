import type { ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export type HubHeaderStatusNoteAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  spinning?: boolean;
};

export type HubHeaderStatusNoteProps = {
  children: ReactNode;
  tone?: "muted" | "warn";
  /** Full sentence on hover — the chip itself stays one short line in the header row. */
  title?: string;
  action?: HubHeaderStatusNoteAction;
};

/**
 * Degraded identity / roster / sync notice for AppTabHeader `statusSlot`.
 * Tab body stays untouched: a banner block above the screen shifts KPI + board layout.
 */
export function HubHeaderStatusNote({
  children,
  tone = "warn",
  title,
  action,
}: HubHeaderStatusNoteProps) {
  const toneClass = tone === "warn" ? "text-amber-300/90" : "text-[var(--muted)]";
  const actionClass =
    tone === "warn"
      ? "border-amber-500/30 hover:bg-amber-500/15"
      : "border-[var(--border)] hover:bg-[var(--surface-2)]";
  return (
    <span
      className={`app-tab-header__chrome-text inline-flex min-w-0 items-center gap-1.5 ${toneClass}`}
      role="status"
      title={title}
      data-hub-header-status={tone}
    >
      <AlertTriangle size={13} className="shrink-0 opacity-80" aria-hidden />
      <span className="min-w-0 max-w-[18rem] truncate">{children}</span>
      {action ? (
        <button
          type="button"
          disabled={action.disabled}
          onClick={action.onClick}
          className={`inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 disabled:opacity-50 ${actionClass}`}
        >
          <RefreshCw size={11} className={action.spinning ? "animate-spin" : ""} aria-hidden />
          {action.label}
        </button>
      ) : null}
    </span>
  );
}

/** First sentence of a long warning — chip copy; keep the full text in `title`. */
export function hubHeaderStatusSummary(message: string, maxChars = 64): string {
  const first = message.split(/(?<=[.!?])\s+/)[0]?.trim() || message.trim();
  if (first.length <= maxChars) return first;
  return `${first.slice(0, maxChars - 1).trimEnd()}…`;
}
