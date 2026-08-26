import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { createElement } from "react";
import { HubBrandIcon } from "../shell/HubBrandIcon";
import type { HubBrandIconId } from "../lib/resolve-hub-brand-icon";
import { compactIconSize } from "../ui-scale";

export type HubDirectoryCardMetaRowProps = {
  /** Lucide leading icon — omit when using `brandIcon` or sheet-parity `emoji`. */
  icon?: LucideIcon;
  /** Hub brand mark (Zalo / Facebook / Telegram). Takes precedence over `emoji` / `icon`. */
  brandIcon?: HubBrandIconId;
  /** Sheet-parity emoji glyph. Takes precedence over `icon` when `brandIcon` is absent. */
  emoji?: string;
  /** CSS color for Lucide icon tint (e.g. `#38bdf8`). Ignored when `brandIcon` / `emoji` is set. */
  tint?: string;
  iconSize?: number;
  children: ReactNode;
  className?: string;
};

function isRenderableIcon(icon: LucideIcon | undefined): icon is LucideIcon {
  return typeof icon === "function" || (typeof icon === "object" && icon !== null);
}

/** Golden directory card meta line — brand mark, emoji, or tinted Lucide + truncated content. */
export function HubDirectoryCardMetaRow({
  icon,
  brandIcon,
  emoji,
  tint = "#94a3b8",
  iconSize = 12,
  children,
  className = "",
}: HubDirectoryCardMetaRowProps) {
  const glyph = typeof emoji === "string" ? emoji.trim() : "";
  const size = compactIconSize(iconSize);

  let leading: ReactNode = null;
  if (brandIcon) {
    leading = <HubBrandIcon brandId={brandIcon} size={size} className="shrink-0" />;
  } else if (glyph) {
    leading = (
      <span
        className="inline-flex shrink-0 items-center justify-center leading-none"
        style={{ fontSize: size }}
        aria-hidden
      >
        {glyph}
      </span>
    );
  } else if (isRenderableIcon(icon)) {
    leading = createElement(icon, {
      size,
      className: "shrink-0",
      strokeWidth: 2,
      style: { color: tint, opacity: 0.72 },
      "aria-hidden": true,
    });
  }

  return (
    <div className={["flex items-center gap-2", className].filter(Boolean).join(" ")}>
      {leading}
      <div className="min-w-0 flex-1 truncate">{children}</div>
    </div>
  );
}
