import { useMemo } from "react";
import { buildHighlightSegments } from "../lib/directory-id-search";

type Props = {
  text: string;
  terms: string[];
  className?: string;
  markClassName?: string;
};

export function HubDirectorySearchHighlightText({
  text,
  terms,
  className = "",
  markClassName = "hub-directory-search-highlight",
}: Props) {
  const segments = useMemo(() => buildHighlightSegments(text, terms), [text, terms]);

  if (!terms.length) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {segments.map((segment, index) =>
        segment.highlight ? (
          <mark key={index} className={markClassName}>
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </span>
  );
}
