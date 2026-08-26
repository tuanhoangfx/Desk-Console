import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import { HubDetailModal, type HubDetailModalSize } from "./HubDetailModal";
import { HubAccountDetailAdmBody } from "./HubAccountDetailAdmBody";
import { HUB_DETAIL_MODAL_SAVING_LABEL } from "./hubToolDetailModalFooter";

export const HUB_TOOL_DETAIL_TITLE_ID = "hub-tool-detail-modal-title";
/** Scroll container when modal has TOC — content column only. */
export const HUB_TOOL_DETAIL_SCROLL_CLASS = "hub-tool-detail-modal__scroll";
export const HUB_TOOL_DETAIL_SCROLL_ROOT = ".hub-tool-detail-modal__scroll";
/** Fallback single-column body (no TOC). */
export const HUB_TOOL_DETAIL_BODY_SCROLL_CLASS = "modal-shell__scroll modal-shell__scroll--user-access";

export type HubToolDetailModalTocLayoutProps = {
  toc: ReactNode;
  children: ReactNode;
  className?: string;
};

/** TOC left · content right — scroll isolated to content column (aligned tops). */
export function HubToolDetailModalTocLayout({ toc, children, className = "" }: HubToolDetailModalTocLayoutProps) {
  return (
    <div className={`hub-tool-detail-modal__layout${className ? ` ${className}` : ""}`}>
      <aside className="hub-tool-detail-modal__toc">{toc}</aside>
      <div className="hub-tool-detail-modal__content">
        <div className={HUB_TOOL_DETAIL_SCROLL_CLASS}>
          <div className="hub-tool-detail-modal__scroll-inner">{children}</div>
        </div>
      </div>
    </div>
  );
}

export type HubToolDetailModalPrimaryActionProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  /** Shown instead of `label` while `busy` (default: Please wait…). */
  busyLabel?: string;
  danger?: boolean;
  /** Emerald create CTA — matches directory `New` bulk action. */
  variant?: "default" | "create";
  icon?: LucideIcon;
};

export function HubToolDetailModalPrimaryAction({
  label,
  onClick,
  disabled,
  busy,
  busyLabel = "Please wait…",
  danger,
  variant = "default",
  icon: Icon,
}: HubToolDetailModalPrimaryActionProps) {
  return (
    <button
      type="button"
      className={[
        "hub-tool-detail-modal__confirm",
        danger ? "hub-tool-detail-modal__confirm--danger" : "",
        variant === "create" ? "hub-tool-detail-modal__confirm--create" : "",
        busy ? "hub-tool-detail-modal__confirm--busy" : "",
        disabled && !busy ? "hub-tool-detail-modal__confirm--disabled" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={disabled || busy}
      onClick={onClick}
      aria-label={busy ? busyLabel : label}
      aria-busy={busy || undefined}
    >
      {busy ? (
        <Loader2 size={16} className="hub-tool-detail-modal__confirm-icon--busy animate-spin" aria-hidden />
      ) : Icon ? (
        <Icon size={16} aria-hidden />
      ) : null}
      <span>{busy ? busyLabel : label}</span>
    </button>
  );
}

/** Accent tone for cross-entity footer nav (View orders / customer / catalog). */
export type HubToolDetailModalSecondaryTone = "emerald" | "sky" | "violet" | "amber" | "rose";

export type HubToolDetailModalSecondaryActionProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  /** Required — Layout-3 / form footer SSOT (Close=X, Reset=RotateCcw, …). */
  icon: LucideIcon;
  /** Optional accent — hover brightens border (not neutral gray wash). */
  tone?: HubToolDetailModalSecondaryTone;
};

export function HubToolDetailModalSecondaryAction({
  label,
  onClick,
  disabled,
  icon: Icon,
  tone,
}: HubToolDetailModalSecondaryActionProps) {
  return (
    <button
      type="button"
      className={[
        "hub-tool-detail-modal__secondary",
        tone ? `hub-tool-detail-modal__secondary--${tone}` : "",
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon size={16} aria-hidden />
      <span>{label}</span>
    </button>
  );
}

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
