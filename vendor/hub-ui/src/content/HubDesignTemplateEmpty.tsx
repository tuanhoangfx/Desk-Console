import { Palette } from "lucide-react";
import type { ReactNode } from "react";

export type HubDesignTemplateEmptyProps = {
  title?: string;
  description?: ReactNode;
  hint?: string;
};

/** Empty state for System → Design Template tabs across Hub tools. */
export function HubDesignTemplateEmpty({
  title = "No active designs",
  description = (
    <>
      Mockups appear here only while you are reviewing. After you lock a variant (
      <span className="font-mono text-indigo-200/90">Design: V1</span> …{" "}
      <span className="font-mono text-indigo-200/90">V5</span>), preview code and mock data are removed from
      this tab.
    </>
  ),
  hint = "Ask the agent to scaffold a new review when you need another feature designed.",
}: HubDesignTemplateEmptyProps) {
  return (
    <div className="flex min-h-[min(420px,50vh)] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[var(--panel)]/40 px-6 py-16 text-center">
      <Palette size={40} className="text-indigo-300/50" aria-hidden />
      <h3 className="mt-4 text-lg font-semibold text-[var(--text)]">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-[var(--muted)]">{description}</p>
      {hint ? <p className="mt-3 text-xs text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}
