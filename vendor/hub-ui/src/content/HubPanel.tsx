import type { ReactNode } from "react";

export function HubPanel({
  title,
  titleIcon,
  desc,
  actions,
  children,
  className = "",
}: {
  title?: ReactNode;
  titleIcon?: ReactNode;
  desc?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/5 bg-[var(--panel)] shadow-[0_8px_24px_rgba(0,0,0,0.12)] ${className}`}
    >
      {title ? (
        <header className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-white/5 px-4 py-3">
          <div>
            <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
              {titleIcon ? <span className="inline-flex shrink-0 text-[var(--muted)]">{titleIcon}</span> : null}
              {title}
            </h3>
            {desc ? <p className="mt-0.5 text-xs text-[var(--muted)]">{desc}</p> : null}
          </div>
          {actions}
        </header>
      ) : null}
      <div className={`min-h-0 flex-1 overflow-hidden ${title ? "px-4 pb-4" : "p-0"}`}>{children}</div>
    </section>
  );
}
