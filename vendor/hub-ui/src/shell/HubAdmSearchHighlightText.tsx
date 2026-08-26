import { useMemo } from "react";
import { HubAdmNoteHighlightText } from "./HubAdmNoteHighlightText";
import { useHubAccountDetailSearchOptional } from "./hubAccountDetailSearch";

type Props = {
  text: string;
  className?: string;
};

/** Highlight text using modal-wide account-detail search (when provider present). */
export function HubAdmSearchHighlightText({ text, className }: Props) {
  const search = useHubAccountDetailSearchOptional();
  const ranges = useMemo(() => {
    if (!search?.hasSearch || !text) return [];
    return search.matchRangesFor(text);
  }, [search, text]);

  if (!text) return null;
  if (!search?.hasSearch || !ranges.length) {
    return className ? <span className={className}>{text}</span> : <>{text}</>;
  }

  return (
    <span className={className}>
      <HubAdmNoteHighlightText text={text} ranges={ranges} activeIndex={-1} markClassName="hub-adm-search-mark" />
    </span>
  );
}
