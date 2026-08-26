import type { ReactNode } from "react";

/** P0004 HubToolCard surface — list/grid tiles (channels, integrations). */
export function HubDirectoryCard({
  title,
  badge,
  children,
  footer,
}: {
  title: string;
  badge?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <article className="hub-directory-card-surface group flex h-full min-h-[var(--hub-card-min-h,140px)] flex-col rounded-xl border bg-[var(--panel)] p-4 transition-[border-color,box-shadow,background-color] duration-200">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--text)]">{title}</h3>
        {badge}
      </div>
      <div className="min-h-0 flex-1 text-sm text-[var(--muted)]">{children}</div>
      {footer ? <footer className="mt-3 border-t border-white/5 pt-3 text-xs text-[var(--muted)]">{footer}</footer> : null}
    </article>
  );
}
