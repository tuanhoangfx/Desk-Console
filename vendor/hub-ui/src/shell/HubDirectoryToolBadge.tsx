import type { LucideIcon } from "lucide-react";
import { compactIconSize } from "../ui-scale";

export type HubDirectoryToolBadgeProps = {
  label: string;
  icon: LucideIcon;
  empty?: boolean;
  /** @deprecated Body cells use no hover tooltip — header hints only. */
  title?: string;
  className?: string;
  countClassName?: string;
};

/** Directory table/card chip — `hub-users-tool-badge` SSOT (Prompt Ready, model, tool count). */
export function HubDirectoryToolBadge({
  label,
  icon: Icon,
  empty = false,
  className = "",
  countClassName = "",
}: HubDirectoryToolBadgeProps) {
  return (
    <span
      className={`hub-users-tool-badge${empty ? " hub-users-tool-badge--empty" : ""}${className ? ` ${className}` : ""}`}
    >
      <Icon size={compactIconSize(11)} className="hub-users-tool-badge__icon" aria-hidden />
      <span className={`hub-users-tool-badge__count text-[10px]${countClassName ? ` ${countClassName}` : ""}`}>
        {label}
      </span>
    </span>
  );
}
