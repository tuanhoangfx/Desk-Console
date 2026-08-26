import type { ReactNode } from "react";
import { HUB_DIRECTORY_CARD_TITLE_TYPO_SSOT } from "../shell/hub-typography";

export type HubDirectoryCardHeaderProps = {
  /** Avatar, icon box, or HubCardAvatar — shrink-0. */
  leading?: ReactNode;
  /** Chips/badges rendered before the title in the badge row. */
  badges?: ReactNode;
  /** Primary title — string uses golden line-clamp styles. */
  title: ReactNode;
  /** Optional mono subtitle (id, path) below the title row. */
  subtitle?: ReactNode;
  /** Header actions (Active pill, allowlist toggle, status badges). */
  trailing?: ReactNode;
  className?: string;
};

function titleNode(title: ReactNode) {
  if (typeof title === "string") {
    return (
      <span className={`min-w-0 line-clamp-2 ${HUB_DIRECTORY_CARD_TITLE_TYPO_SSOT}`}>{title}</span>
    );
  }
  return title;
}

function subtitleNode(subtitle: ReactNode) {
  if (typeof subtitle === "string") {
    return <p className="mt-1 truncate font-mono text-[10px] text-indigo-200/75">{subtitle}</p>;
  }
  return subtitle;
}

/** Golden directory card header — avatar/icon + badge row + title + optional trailing. */
export function HubDirectoryCardHeader({
  leading,
  badges,
  title,
  subtitle,
  trailing,
  className = "",
}: HubDirectoryCardHeaderProps) {
  return (
    <div className={["mb-3 flex shrink-0 items-center gap-2.5", className].filter(Boolean).join(" ")}>
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
          {badges}
          {titleNode(title)}
        </div>
        {subtitle ? subtitleNode(subtitle) : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}
