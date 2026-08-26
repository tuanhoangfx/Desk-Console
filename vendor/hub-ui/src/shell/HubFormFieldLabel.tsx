import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  HubDirectoryColumnHint,
  type HubDirectoryColumnHintContent,
  type HubDirectoryColumnHintGlyph,
} from "../table/HubDirectoryColumnHint";
import { compactIconSize } from "../ui-scale";

export type HubFormFieldLabelProps = {
  icon?: LucideIcon;
  iconClassName?: string;
  /** Emoji glyph — matches filter trigger icons in task modal (📁, 🗓️, etc.). */
  emoji?: string;
  children: ReactNode;
  className?: string;
  /** Rich label hint — hover popover (directory column hint SSOT). */
  labelHint?: HubDirectoryColumnHintContent;
};

function resolveFormFieldLabelGlyph({
  icon,
  iconClassName,
  emoji,
}: Pick<HubFormFieldLabelProps, "icon" | "iconClassName" | "emoji">): HubDirectoryColumnHintGlyph | undefined {
  if (emoji) return { emoji };
  if (icon) return { icon, toneClass: iconClassName };
  return undefined;
}

/** Icon + label row above modal form controls — golden detail modal fields. */
export function HubFormFieldLabel({
  icon: Icon,
  iconClassName = "hub-form-field-label__icon",
  emoji,
  children,
  className = "",
  labelHint,
}: HubFormFieldLabelProps) {
  const labelNode = (
    <span className={`hub-form-field-label${className ? ` ${className}` : ""}`}>
      {emoji ? (
        <span className="hub-form-field-label__emoji" aria-hidden>
          {emoji}
        </span>
      ) : Icon ? (
        <Icon size={compactIconSize(12)} className={iconClassName} aria-hidden />
      ) : null}
      {children}
    </span>
  );

  if (!labelHint) return labelNode;

  return (
    <HubDirectoryColumnHint
      content={labelHint}
      titleGlyph={resolveFormFieldLabelGlyph({ icon: Icon, iconClassName, emoji })}
    >
      {labelNode}
    </HubDirectoryColumnHint>
  );
}
