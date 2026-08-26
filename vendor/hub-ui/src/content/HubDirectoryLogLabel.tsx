import type { ReactNode } from "react";
import {
  HUB_DIRECTORY_LOG_CLASS,
  HUB_DIRECTORY_LOG_NOTE_CLASS,
} from "../lib/hub-directory-timestamp";

export type HubDirectoryLogLabelProps = {
  /** Action label — string for directory cells; ReactNode for ADM search highlight / multi-part messages. */
  note: ReactNode;
  /** Hover tooltip — directory body cells usually omit; detail modals may set. */
  title?: string;
  /** Field glyph, emoji, or brand icon — rendered before note. */
  leading?: ReactNode;
  className?: string;
};

/** Directory table Log column — glyph + label SSOT (gap/icon parity with column header). */
export function HubDirectoryLogLabel({
  note,
  title,
  leading,
  className = "",
}: HubDirectoryLogLabelProps) {
  return (
    <span
      className={`${HUB_DIRECTORY_LOG_CLASS} twofa-log-cell${className ? ` ${className}` : ""}`}
      title={title}
    >
      {leading}
      <span className={`${HUB_DIRECTORY_LOG_NOTE_CLASS} twofa-log-cell__note`}>{note}</span>
    </span>
  );
}
