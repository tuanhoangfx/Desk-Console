import type { ReactNode } from "react";
import type { HubGlyphComponent } from "../types/filter-badge";

/** Sheet sticker + label — directory header / tool-detail panel / rail parity. */
export function hubToolDetailTitleWithEmoji(title: string, emoji: string): ReactNode {
  return (
    <span className="hub-users-th-heading">
      <span className="hub-users-th-emoji" aria-hidden>
        {emoji}
      </span>
      <span className="hub-users-th-text">{title}</span>
    </span>
  );
}

/** Rail/panel head — emoji sticker replaces Lucide icon (Note · History · Console). */
export function resolveHubToolDetailRailHead({
  title,
  titleEmoji,
  icon,
  iconClassName,
}: {
  title: ReactNode;
  titleEmoji?: string;
  icon?: HubGlyphComponent;
  iconClassName?: string;
}): { titleNode: ReactNode; icon?: HubGlyphComponent; iconClassName?: string } {
  if (!titleEmoji) {
    return { titleNode: title, icon, iconClassName };
  }
  const titleNode =
    typeof title === "string" ? (
      hubToolDetailTitleWithEmoji(title, titleEmoji)
    ) : (
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <span className="hub-users-th-emoji shrink-0" aria-hidden>
          {titleEmoji}
        </span>
        {title}
      </span>
    );
  return { titleNode, icon: undefined, iconClassName: undefined };
}
