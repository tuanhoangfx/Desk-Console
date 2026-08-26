import { isValidElement, type ReactNode } from "react";
import type { HubGlyphComponent } from "../types/filter-badge";
import { HUB_ADM_TYPE_NAV_CLASS } from "./hubAccountDetailModal";
import { resolveHubToolDetailRailHead } from "./hubToolDetailTitleWithEmoji";

function renderHubToolDetailGlyph(
  Icon: HubGlyphComponent | ReactNode | undefined,
  iconClassName?: string,
): ReactNode {
  if (!Icon) return null;
  // Call sites sometimes pass JSX (`<span>📋</span>`) — never treat elements as components.
  if (isValidElement(Icon)) return Icon;
  if (typeof Icon === "function" || (typeof Icon === "object" && Icon !== null)) {
    const Glyph = Icon as HubGlyphComponent;
    return <Glyph size={12} className={iconClassName} aria-hidden />;
  }
  return null;
}

/**
 * Main + right rail grid — generic split (non–account-detail tools).
 *
 * @deprecated Account-detail modals must use `HubAccountDetailModalFrame` (golden
 * `hub-account-detail-modal__rail` + note/log flex fill). Parity gate fails on bare
 * `HubToolDetailSplitLayout` inside account-detail modal files.
 */
export function HubToolDetailSplitLayout({
  main,
  rail,
  className = "",
}: {
  main: ReactNode;
  rail?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`hub-tool-detail-split${className ? ` ${className}` : ""}`}>
      <div className="hub-tool-detail-split__main">{main}</div>
      {rail ? <div className="hub-tool-detail-split__rail">{rail}</div> : null}
    </div>
  );
}

export function HubToolDetailPanel({
  id,
  title,
  icon: Icon,
  iconClassName,
  headExtra,
  children,
  className = "",
  bodyClassName = "",
  ariaLabel,
}: {
  id?: string;
  title: ReactNode;
  icon?: HubGlyphComponent | ReactNode;
  iconClassName?: string;
  /** Slot below panel head — meta row, filters, etc. */
  headExtra?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  ariaLabel?: string;
}) {
  return (
    <section
      id={id}
      className={`hub-tool-detail-panel${className ? ` ${className}` : ""}`}
      aria-label={ariaLabel ?? (typeof title === "string" ? title : undefined)}
    >
      <div className={`hub-tool-detail-panel__head ${HUB_ADM_TYPE_NAV_CLASS}`}>
        {renderHubToolDetailGlyph(Icon, iconClassName)}
        {title}
      </div>
      {headExtra ? <div className="hub-tool-detail-panel__head-extra">{headExtra}</div> : null}
      <div className={`hub-tool-detail-panel__body${bodyClassName ? ` ${bodyClassName}` : ""}`}>{children}</div>
    </section>
  );
}

export function HubToolDetailRail({
  id,
  title,
  titleEmoji,
  icon: Icon,
  iconClassName,
  children,
  scroll = true,
  className = "",
  bodyClassName = "",
  ariaLabel,
}: {
  id?: string;
  title: ReactNode;
  /** Sheet sticker — replaces Lucide rail icon when set (📜 Note · 📋 Console). */
  titleEmoji?: string;
  icon?: HubGlyphComponent | ReactNode;
  iconClassName?: string;
  children: ReactNode;
  scroll?: boolean;
  className?: string;
  bodyClassName?: string;
  ariaLabel?: string;
}) {
  const head = resolveHubToolDetailRailHead({
    title,
    titleEmoji,
    icon: isValidElement(Icon) ? undefined : (Icon as HubGlyphComponent | undefined),
    iconClassName: isValidElement(Icon) ? undefined : iconClassName,
  });

  return (
    <aside
      id={id}
      className={`hub-tool-detail-rail${className ? ` ${className}` : ""}`}
      aria-label={ariaLabel ?? (typeof title === "string" ? title : undefined)}
    >
      <div className={`hub-tool-detail-rail__head ${HUB_ADM_TYPE_NAV_CLASS}`}>
        {titleEmoji ? null : renderHubToolDetailGlyph(head.icon ?? Icon, head.iconClassName ?? iconClassName)}
        {head.titleNode}
      </div>
      <div
        className={`hub-tool-detail-rail__body${scroll ? " hub-tool-detail-rail__body--scroll" : ""}${bodyClassName ? ` ${bodyClassName}` : ""}`}
      >
        {children}
      </div>
    </aside>
  );
}
