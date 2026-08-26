import { useMemo } from "react";
import { buildHubAdmNoteMirrorSegments, type HubAdmNoteMatchRange } from "./hubAdmNoteSearch";

type Props = {
  text: string;
  ranges: HubAdmNoteMatchRange[];
  activeIndex: number;
  markClassName?: string;
};

export function HubAdmNoteHighlightText({ text, ranges, activeIndex, markClassName = "hub-adm-note-mark" }: Props) {
  const segments = useMemo(
    () => buildHubAdmNoteMirrorSegments(text, ranges, activeIndex),
    [activeIndex, ranges, text],
  );

  if (!text) return null;
  if (!segments.length) return <>{text}</>;

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.kind === "plain") {
          return <span key={index}>{segment.text}</span>;
        }
        return (
          <mark
            key={index}
            className={
              segment.kind === "active"
                ? `${markClassName} ${markClassName}--active`
                : markClassName
            }
          >
            {segment.text}
          </mark>
        );
      })}
    </>
  );
}
