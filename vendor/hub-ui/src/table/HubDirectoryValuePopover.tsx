import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { measureHubDirectoryPopoverPosition } from "../lib/hub-directory-popover";
import "../styles/hub-directory-popover.css";

export type HubDirectoryValuePopoverProps = {
  /** Full text shown in the popover body. */
  value: string;
  title?: string;
  /** Rich popover body for structured directory metadata. */
  content?: ReactNode;
  children: ReactNode;
  className?: string;
  /** When false, children render without hover popover. */
  enabled?: boolean;
};

/** Hover popover for truncated or multiline values — adm fields + selective directory cells. */
export function HubDirectoryValuePopover({
  value,
  title,
  content,
  children,
  className = "",
  enabled = true,
}: HubDirectoryValuePopoverProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const text = value.trim();

  const updatePosition = useCallback(() => {
    const next = measureHubDirectoryPopoverPosition(anchorRef.current, popoverRef.current);
    if (next) setPos(next);
  }, []);

  const show = useCallback(() => {
    if (!enabled || !text) return;
    setOpen(true);
  }, [enabled, text]);

  const hide = useCallback(() => setOpen(false), []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition, text, title]);

  if (!enabled || !text) {
    return <>{children}</>;
  }

  const popover =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={popoverRef}
            className="hub-directory-popover hub-directory-popover--value"
            style={{ top: pos.top, left: pos.left }}
            role="tooltip"
            onMouseEnter={show}
            onMouseLeave={hide}
          >
            {title ? <p className="hub-directory-popover__title">{title}</p> : null}
            {content ?? <p className="hub-directory-popover__body">{text}</p>}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <span
        ref={anchorRef}
        className={`hub-directory-popover-anchor${className ? ` ${className}` : ""}`}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </span>
      {popover}
    </>
  );
}
