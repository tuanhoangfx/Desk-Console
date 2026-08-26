import { useCallback, useEffect, useMemo, useState } from "react";
import { getDirectorySearchHighlight } from "../lib/directory-id-search";

/** Note rail highlights text terms only — id/numeric search targets Credentials · Log, not date substrings in note. */
export function getHubAccountDetailNoteHighlightTerms(searchQuery: string): string[] {
  const highlight = getDirectorySearchHighlight(searchQuery, { mixedRequiresWhitespace: false });
  if (!highlight) return [];
  return highlight.textTerms.filter(Boolean);
}

export type HubAdmNoteMatchRange = { start: number; end: number };

export type HubAdmNoteMirrorSegment = { text: string; kind: "plain" | "match" | "active" };

export function findHubAdmNoteMatchRanges(text: string, terms: string[]): HubAdmNoteMatchRange[] {
  if (!text || terms.length === 0) return [];

  const lower = text.toLowerCase();
  const ranges: HubAdmNoteMatchRange[] = [];

  for (const term of terms) {
    const needle = term.trim();
    if (!needle) continue;
    const tLower = needle.toLowerCase();
    let from = 0;
    while (from < lower.length) {
      const idx = lower.indexOf(tLower, from);
      if (idx === -1) break;
      ranges.push({ start: idx, end: idx + tLower.length });
      from = idx + 1;
    }
  }

  ranges.sort((a, b) => a.start - b.start);
  return ranges;
}

export function buildHubAdmNoteMirrorSegments(
  text: string,
  ranges: HubAdmNoteMatchRange[],
  activeIndex: number,
): HubAdmNoteMirrorSegment[] {
  if (!text) return [];
  if (!ranges.length) return [{ text, kind: "plain" }];

  const segments: HubAdmNoteMirrorSegment[] = [];
  let pos = 0;

  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i]!;
    if (pos < range.start) {
      segments.push({ text: text.slice(pos, range.start), kind: "plain" });
    }
    segments.push({
      text: text.slice(range.start, range.end),
      kind: activeIndex >= 0 && activeIndex === i ? "active" : "match",
    });
    pos = range.end;
  }

  if (pos < text.length) {
    segments.push({ text: text.slice(pos), kind: "plain" });
  }

  return segments;
}

export function useHubAdmNoteSearch(text: string) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMatch, setActiveMatch] = useState(0);
  const [matchRevealed, setMatchRevealed] = useState(false);

  const highlightTerms = useMemo(() => {
    const highlight = getDirectorySearchHighlight(searchQuery, { mixedRequiresWhitespace: false });
    return highlight?.textTerms ?? [];
  }, [searchQuery]);

  const matchRanges = useMemo(
    () => findHubAdmNoteMatchRanges(text, highlightTerms),
    [highlightTerms, text],
  );

  const hasSearch = highlightTerms.length > 0;
  const mirrorActiveIndex = matchRevealed ? activeMatch : -1;
  const matchLabel =
    matchRanges.length > 0
      ? matchRevealed
        ? `${activeMatch + 1}/${matchRanges.length}`
        : `0/${matchRanges.length}`
      : hasSearch
        ? "0/0"
        : "";

  useEffect(() => {
    setActiveMatch(0);
    setMatchRevealed(false);
  }, [searchQuery]);

  const revealMatch = useCallback(
    (index: number, scrollTo: (start: number) => void) => {
      if (!matchRanges.length) return;
      const normalized = ((index % matchRanges.length) + matchRanges.length) % matchRanges.length;
      scrollTo(matchRanges[normalized]!.start);
      setActiveMatch(normalized);
      setMatchRevealed(true);
    },
    [matchRanges],
  );

  const stepMatch = useCallback(
    (delta: number, scrollTo: (start: number) => void) => {
      if (!matchRanges.length) return;
      revealMatch(activeMatch + delta, scrollTo);
    },
    [activeMatch, matchRanges.length, revealMatch],
  );

  return {
    searchQuery,
    setSearchQuery,
    activeMatch,
    matchRevealed,
    setMatchRevealed,
    highlightTerms,
    matchRanges,
    hasSearch,
    mirrorActiveIndex,
    matchLabel,
    revealMatch,
    stepMatch,
  };
}
