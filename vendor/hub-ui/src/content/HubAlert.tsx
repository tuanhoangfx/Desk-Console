import type { ReactNode } from "react";

type Tone = "danger" | "warn" | "info";

const TONE_CLASS: Record<Tone, string> = {
  danger: "border-rose-500/30 bg-rose-500/5 text-rose-200",
  warn: "border-amber-500/30 bg-amber-500/5 text-amber-100",
  info: "border-indigo-500/25 bg-indigo-500/5 text-[var(--text)]",
};

export function HubAlert({ tone = "danger", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${TONE_CLASS[tone]}`}>{children}</div>
  );
}
