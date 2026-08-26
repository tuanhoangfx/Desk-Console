import { X } from "lucide-react";
import { compactIconSize } from "../ui-scale";

export type HubModalCloseButtonProps = {
  onClose: () => void;
  className?: string;
  iconSize?: number;
  "aria-label"?: string;
};

/** Red circular close control — sits on the modal frame edge (does not cover content). */
export function HubModalCloseButton({
  onClose,
  className = "",
  iconSize,
  "aria-label": ariaLabel = "Close",
}: HubModalCloseButtonProps) {
  return (
    <button
      type="button"
      className={`hub-modal-close${className ? ` ${className}` : ""}`}
      onClick={onClose}
      aria-label={ariaLabel}
    >
      <X size={iconSize ?? compactIconSize(16)} aria-hidden />
    </button>
  );
}
