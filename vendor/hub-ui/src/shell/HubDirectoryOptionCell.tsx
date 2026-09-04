import { DIRECTORY_CELL_TRUNCATE } from "../lib/directory-cell-hover";
import { HubDirectoryEmptyCell } from "../lib/directory-empty-label";
import { HubDirectorySearchHighlightText } from "../content/HubDirectorySearchHighlightText";
import { hubFilterEmojiToneClass, hubFilterOptionEmojiClass } from "./filter-dropdown-primitives";
import { HubDirectoryCopyText } from "./HubDirectoryCopyText";

export type HubDirectoryOptionCellProps = {
  emoji: string;
  label: string;
  highlightTerms?: readonly string[];
  /** Color emoji (flags / catalog). Default: directory sticker (inherit). */
  emojiColor?: boolean;
};

/** Directory enum cell — Filter/Modal glyph + label, one line, click-to-copy. */
export function HubDirectoryOptionCell({
  emoji,
  label,
  highlightTerms,
  emojiColor,
}: HubDirectoryOptionCellProps) {
  const text = label.trim();
  if (!text) {
    return <HubDirectoryEmptyCell className="hub-users-directory-body-text hub-users-cell-muted" />;
  }
  return (
    <HubDirectoryCopyText
      value={text}
      display={
        <span className="inline-flex max-w-full min-w-0 items-center gap-1">
          <span className={hubFilterOptionEmojiClass(hubFilterEmojiToneClass(emoji, emojiColor))} aria-hidden>
            {emoji}
          </span>
          <span className={`min-w-0 ${DIRECTORY_CELL_TRUNCATE}`}>
            {highlightTerms?.length ? (
              <HubDirectorySearchHighlightText text={text} terms={[...highlightTerms]} />
            ) : (
              text
            )}
          </span>
        </span>
      }
    />
  );
}
