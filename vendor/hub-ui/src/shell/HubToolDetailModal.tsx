import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { HubDetailModal, type HubDetailModalSize } from "./HubDetailModal";
import { HubAccountDetailAdmBody } from "./HubAccountDetailAdmBody";
import { HUB_DETAIL_MODAL_SAVING_LABEL } from "./hubToolDetailModalFooter";
import {
  HUB_TOOL_DETAIL_BODY_SCROLL_CLASS,
  HUB_TOOL_DETAIL_SCROLL_ROOT,
  HUB_TOOL_DETAIL_TITLE_ID,
} from "./hubToolDetailModalChrome";

export {
  HUB_TOOL_DETAIL_BODY_SCROLL_CLASS,
  HUB_TOOL_DETAIL_SCROLL_CLASS,
  HUB_TOOL_DETAIL_SCROLL_ROOT,
  HUB_TOOL_DETAIL_TITLE_ID,
} from "./hubToolDetailModalChrome";
export {
  HubToolDetailModalTocLayout,
  type HubToolDetailModalTocLayoutProps,
} from "./HubToolDetailModalTocLayout";
export {
  HubToolDetailModalPrimaryAction,
  HubToolDetailModalSecondaryAction,
  type HubToolDetailModalPrimaryActionProps,
  type HubToolDetailModalSecondaryActionProps,
  type HubToolDetailModalSecondaryTone,
} from "./HubToolDetailModalActions";

export type HubToolDetailModalProps = {
  open?: boolean;
  onClose: () => void;
  /** When omitted, use custom `header` only. */
  title?: string;
  titleId?: string;
  headerImageUrl?: string;
  headerIcon?: LucideIcon;
  headerIconClassName?: string;
  headerLeading?: ReactNode;
  headerTrailing?: ReactNode;
  /** Center slot — account-detail global search (golden Mail modal). */
  headerCenter?: ReactNode;
  /** Right-corner slot before the frame close X (optional; Notify Mark all read sits beside search). */
  headerActions?: ReactNode;
  /** Full header override (User access, etc.). */
  header?: ReactNode;
  /** Left TOC column. */
  toc?: ReactNode;
  /** When set with `toc`, pointer + scroll highlight matching TOC labels. */
  sectionIds?: string[];
  /** Scroll root for TOC spy + jump (default modal content column). */
  scrollRootSelector?: string;
  footer?: ReactNode;
  shellClassName?: string;
  shellStyle?: CSSProperties;
  bodyClassName?: string;
  size?: HubDetailModalSize;
  ariaLabelledBy?: string;
  /** When no visible title — accessibility name for the dialog. */
  ariaLabel?: string;
  children: ReactNode;
  /** Inline tab/page — same chrome as modal, no overlay (P0004 System Overview). */
  embedded?: boolean;
  /**
   * Stacked child detail — parent Order/Team stays open (View customer / Mail recover).
   * Escape + backdrop close only the top stack layer.
   */
  stacked?: boolean;
  /**
   * Save / cloud sync in flight — footer primary shows spinner + busyLabel (Delete parity).
   * No body HubLoaderOrb — button busy is the SSOT signal.
   */
  busy?: boolean;
  /** Reserved for callers / aria; footer uses its own saveBusyLabel. */
  busyLabel?: string;
};

/**
 * Golden tool-detail modal — header identity · TOC left · content right · footer actions.
 * Reference: P0020 Cookie Auto extension download FAB.
 */
export function HubToolDetailModal({
  open = true,
  onClose,
  title,
  titleId = HUB_TOOL_DETAIL_TITLE_ID,
  headerImageUrl,
  headerIcon: HeaderIcon,
  headerIconClassName = "text-indigo-200",
  headerLeading,
  headerTrailing,
  headerCenter,
  headerActions,
  header,
  toc,
  sectionIds,
  scrollRootSelector = HUB_TOOL_DETAIL_SCROLL_ROOT,
  footer,
  shellClassName = "",
  shellStyle,
  bodyClassName = "",
  size = "detail",
  ariaLabelledBy,
  ariaLabel,
  children,
  embedded = false,
  stacked = false,
  busy = false,
  busyLabel: _busyLabel = HUB_DETAIL_MODAL_SAVING_LABEL,
}: HubToolDetailModalProps) {
  const resolvedHeader =
    header ??
    (title || headerTrailing || headerCenter || headerActions ? (
      <header className="user-access-modal__header">
        <div className="user-access-modal__header-main min-w-0 flex-1">
          {title ? (
            <>
              {headerLeading ??
                (headerImageUrl ? (
                  <img
                    src={headerImageUrl}
                    alt=""
                    width={32}
                    height={32}
                    className="user-access-modal__avatar h-8 w-8 shrink-0 rounded-lg object-cover"
                  />
                ) : HeaderIcon ? (
                  <span
                    className="user-access-modal__avatar grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-500/20"
                    aria-hidden
                  >
                    <HeaderIcon size={18} className={headerIconClassName} />
                  </span>
                ) : null)}
              <h2
                id={titleId}
                className="user-access-modal__header-name min-w-0 truncate text-sm font-semibold text-[var(--text)]"
              >
                {title}
              </h2>
            </>
          ) : null}
          {headerTrailing}
        </div>
        {headerCenter ? (
          <div className="user-access-modal__header-center min-w-0">{headerCenter}</div>
        ) : null}
        {headerActions ? (
          <div className="user-access-modal__header-actions">{headerActions}</div>
        ) : null}
      </header>
    ) : undefined);

  const resolvedFooter = footer ? (
    <footer className="hub-tool-detail-modal__footer">
      <div className="hub-tool-detail-modal__footer-inner">{footer}</div>
    </footer>
  ) : undefined;

  const bodyInner = toc ? (
    <HubAccountDetailAdmBody
      toc={toc}
      content={children}
      sectionIds={sectionIds ?? []}
      scrollRootSelector={scrollRootSelector}
      highlightClassName={bodyClassName}
      wrapBody
    />
  ) : (
    <div className={`${HUB_TOOL_DETAIL_BODY_SCROLL_CLASS}${bodyClassName ? ` ${bodyClassName}` : ""}`}>{children}</div>
  );

  const body = <div className="hub-tool-detail-modal__body-frame">{bodyInner}</div>;

  return (
    <HubDetailModal
      open={open}
      onClose={onClose}
      embedded={embedded}
      stacked={stacked}
      ariaLabel={ariaLabel}
      ariaLabelledBy={ariaLabelledBy ?? (title ? titleId : undefined)}
      size={size}
      shellClassName={`hub-tool-detail-modal${busy ? " hub-tool-detail-modal--busy" : ""}${shellClassName ? ` ${shellClassName}` : ""}`}
      shellStyle={shellStyle}
      header={resolvedHeader}
      footer={resolvedFooter}
    >
      {body}
    </HubDetailModal>
  );
}
