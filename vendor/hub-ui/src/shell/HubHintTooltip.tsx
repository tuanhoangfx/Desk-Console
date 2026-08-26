import { useEffect, useId, useState } from "react";
import { CircleHelp } from "lucide-react";
import { compactIconSize } from "../ui-scale";

type HubHintTooltipProps = {
  content: string;
};

/** Compact hint for Settings toggles — hover on desktop, tap to toggle on touch. */
export function HubHintTooltip({ content }: HubHintTooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  useEffect(() => {
    if (!open) return;
    const onDocPointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(`[data-hub-hint-id="${tooltipId}"]`)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDocPointer);
    return () => document.removeEventListener("pointerdown", onDocPointer);
  }, [open, tooltipId]);

  return (
    <span
      className={`hub-hint-tooltip${open ? " is-open" : ""}`}
      data-hub-hint-id={tooltipId}
      tabIndex={0}
      aria-describedby={open ? tooltipId : undefined}
      onClick={(event) => {
        event.stopPropagation();
        setOpen((value) => !value);
      }}
      onMouseDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setOpen((value) => !value);
        }
        if (event.key === "Escape") setOpen(false);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <CircleHelp size={compactIconSize(10)} className="text-[var(--muted)]" aria-hidden />
      <span className="hub-hint-tooltip__bubble" id={tooltipId} role="tooltip">
        {content}
      </span>
    </span>
  );
}
