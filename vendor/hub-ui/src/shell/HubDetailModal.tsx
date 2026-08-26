import { useLayoutEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { HubModalFrame } from "./HubModalFrame";
import { HUB_COMPACT_MODAL_CLASS } from "./hubAccountDetailModal";
import {
  acquireHubDetailModalStackLayer,
  hubDetailModalPendingLayer,
  hubDetailModalStackBackdropStyle,
  isTopHubDetailModalStackLayer,
  releaseHubDetailModalStackLayer,
} from "./hub-detail-modal-stack";

/** `compact` = Confirm/Prompt/Clone (28rem, centered). `detail` = Layout 2/3 (88rem). */
export type HubDetailModalSize = "detail" | "compact";

export type HubDetailModalProps = {
  /** When false, renders nothing. Default true when mounted. */
  open?: boolean;
  onClose: () => void;
  children: ReactNode;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  size?: HubDetailModalSize;
  header?: ReactNode;
  footer?: ReactNode;
  closeOnBackdrop?: boolean;
  shellClassName?: string;
  shellStyle?: CSSProperties;
  /**
   * Extra classes on HubModalFrame. Compact width is the 28rem token
   * (`.hub-compact-modal` / `--fit`) — do not pass `max-w-md` / `max-w-lg`.
   */
  frameClassName?: string;
  /** Tab/page inline — no portal, backdrop, escape, or body scroll lock. */
  embedded?: boolean;
  /**
   * Stacked child detail (View customer from Order, Mail from Team).
   * Raises backdrop z-index; Escape/backdrop only closes the top stack layer.
   * Parent stays mounted — do not unmount parent when opening the child.
   */
  stacked?: boolean;
};

/** Golden tool-detail modal — portal, backdrop, edge close, escape, body scroll lock. */
export function HubDetailModal({
  open = true,
  onClose,
  children,
  ariaLabel,
  ariaLabelledBy,
  size = "detail",
  header,
  footer,
  closeOnBackdrop = true,
  shellClassName = "",
  shellStyle,
  frameClassName,
  embedded = false,
  stacked = false,
}: HubDetailModalProps) {
  const [stackLayer, setStackLayer] = useState(0);

  useLayoutEffect(() => {
    if (!open || embedded) {
      setStackLayer(0);
      return;
    }
    const layer = acquireHubDetailModalStackLayer();
    setStackLayer(layer);
    return () => {
      releaseHubDetailModalStackLayer(layer);
      setStackLayer(0);
    };
  }, [embedded, open]);

  useLayoutEffect(() => {
    if (!open || embedded || stackLayer <= 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (!isTopHubDetailModalStackLayer(stackLayer)) return;
      e.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey);
    if (stackLayer === 1) {
      document.body.classList.add("hub-modal-open");
    }
    return () => {
      window.removeEventListener("keydown", onKey);
      if (stackLayer === 1) {
        document.body.classList.remove("hub-modal-open");
      }
    };
  }, [embedded, open, onClose, stackLayer]);

  if (!open || typeof document === "undefined") return null;

  const isCompact = size === "compact";
  const shellClasses = [
    "modal-shell",
    "modal-shell--tool-detail",
    isCompact ? "modal-shell--compact" : "",
    isCompact ? "hub-tool-detail-modal--fit" : "",
    isCompact ? HUB_COMPACT_MODAL_CLASS : "",
    embedded ? "hub-tool-detail-modal--embedded" : "",
    shellClassName,
  ]
    .filter(Boolean)
    .join(" ");

  const shell = (
    <div
      className={shellClasses}
      style={shellStyle}
      role={embedded ? "region" : "dialog"}
      aria-modal={embedded ? undefined : true}
      aria-label={ariaLabelledBy ? undefined : ariaLabel}
      aria-labelledby={ariaLabelledBy}
    >
      {header}
      {children}
      {footer}
    </div>
  );

  if (embedded) return shell;

  const resolvedFrameClass = frameClassName ?? "";
  const effectiveLayer = hubDetailModalPendingLayer(stacked, stackLayer);
  const backdropStyle = hubDetailModalStackBackdropStyle(effectiveLayer);

  const onBackdropClick = () => {
    if (!closeOnBackdrop) return;
    if (stackLayer > 0 && !isTopHubDetailModalStackLayer(stackLayer)) return;
    onClose();
  };

  return createPortal(
    <div
      className={[
        isCompact ? "modal-backdrop modal-backdrop--compact" : "modal-backdrop modal-backdrop--tool-detail",
        stacked || effectiveLayer > 1 ? "modal-backdrop--stacked" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={backdropStyle as CSSProperties}
      role="presentation"
      onClick={onBackdropClick}
      data-hub-modal-stack={effectiveLayer}
    >
      <HubModalFrame onClose={onClose} className={resolvedFrameClass}>
        {shell}
      </HubModalFrame>
    </div>,
    document.body,
  );
}
