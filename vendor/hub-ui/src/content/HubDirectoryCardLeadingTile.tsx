import type { ReactNode } from "react";

export type HubDirectoryCardLeadingTileProps = {
  children: ReactNode;
  statusColor?: string;
  statusTitle?: string;
  className?: string;
  tileClassName?: string;
};

/** Golden 22px bordered tile for directory card headers — custom glyph, favicon, or platform logo. */
export function HubDirectoryCardLeadingTile({
  children,
  statusColor,
  statusTitle,
  className = "",
  tileClassName = "",
}: HubDirectoryCardLeadingTileProps) {
  return (
    <div className={`relative shrink-0 ${className}`.trim()}>
      <span className={["hub-directory-card-leading-tile", tileClassName].filter(Boolean).join(" ")}>
        {children}
      </span>
      {statusColor ? (
        <span
          className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full ring-2 ring-[var(--panel)]"
          style={{ background: statusColor }}
          title={statusTitle}
          aria-hidden
        />
      ) : null}
    </div>
  );
}
