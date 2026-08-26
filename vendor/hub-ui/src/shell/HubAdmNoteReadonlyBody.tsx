import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { HubAdmNoteHighlightText } from "./HubAdmNoteHighlightText";
import { HubAdmNoteSearchBar } from "./HubAdmNoteSearchBar";
import { useHubAdmNoteSearch } from "./hubAdmNoteSearch";
import { useHubAccountDetailSearchOptional } from "./hubAccountDetailSearch";

export type HubAdmNoteReadonlyBodyProps = {
  note: string;
  emptyMessage?: string;
  searchLabel?: string;
  placeholder?: string;
  searchInRail?: boolean;
};

/** Read-only note rail — plain body or legacy in-rail search. */
export function HubAdmNoteReadonlyBody({
  note,
  emptyMessage = "No notes.",
  searchLabel,
  placeholder,
  searchInRail = false,
}: HubAdmNoteReadonlyBodyProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const text = (note ?? "").trim();
  const modalSearch = useHubAccountDetailSearchOptional();
  const [noteActiveIndex, setNoteActiveIndex] = useState(-1);

  const scrollToOffset = useCallback(
    (start: number) => {
      const el = bodyRef.current;
      if (!el) return;
      const lineHeight = 16;
      const linesBefore = text.slice(0, start).split("\n").length - 1;
      el.scrollTop = Math.max(0, linesBefore * lineHeight - el.clientHeight / 3);
    },
    [text],
  );

  const refocusSearch = useCallback(() => {
    requestAnimationFrame(() => searchRef.current?.focus());
  }, []);

  const railSearch = useHubAdmNoteSearch(text);

  const matchRanges = useMemo(() => {
    if (searchInRail) return railSearch.matchRanges;
    if (!modalSearch?.noteHighlightTerms.length) return [];
    return modalSearch.matchNoteRangesFor(text);
  }, [modalSearch, railSearch.matchRanges, searchInRail, text]);

  const hasSearch = searchInRail ? railSearch.hasSearch : Boolean(modalSearch?.hasSearch);
  const highlightNote = hasSearch && Boolean(text) && matchRanges.length > 0;

  useLayoutEffect(() => {
    if (searchInRail || !highlightNote) {
      setNoteActiveIndex(-1);
      return;
    }
    const body = bodyRef.current;
    if (!body || !modalSearch?.matchRevealed) {
      setNoteActiveIndex(-1);
      return;
    }
    const modal = body.closest(".hub-account-detail-modal");
    if (!modal) return;
    const allMarks = Array.from(
      modal.querySelectorAll(".hub-adm-note-mark, .hub-adm-search-mark"),
    ).filter((node): node is HTMLElement => node instanceof HTMLElement);
    const activeEl = allMarks[modalSearch.activeMatch];
    if (!activeEl || !body.contains(activeEl)) {
      setNoteActiveIndex(-1);
      return;
    }
    const noteMarks = Array.from(body.querySelectorAll(".hub-adm-search-mark, .hub-adm-note-mark"));
    setNoteActiveIndex(noteMarks.indexOf(activeEl));
  }, [
    highlightNote,
    modalSearch?.activeMatch,
    modalSearch?.matchRevealed,
    modalSearch?.searchQuery,
    matchRanges,
    searchInRail,
    text,
  ]);

  useLayoutEffect(() => {
    if (!highlightNote || noteActiveIndex < 0) return;
    const range = matchRanges[noteActiveIndex];
    if (!range) return;
    scrollToOffset(range.start);
  }, [highlightNote, matchRanges, noteActiveIndex, scrollToOffset]);

  const onRevealFirst = useCallback(() => {
    if (searchInRail) {
      railSearch.revealMatch(0, scrollToOffset);
      refocusSearch();
      return;
    }
    modalSearch?.revealFirst();
  }, [modalSearch, railSearch, refocusSearch, scrollToOffset, searchInRail]);

  const onStepMatch = useCallback(
    (delta: number) => {
      if (searchInRail) {
        railSearch.stepMatch(delta, scrollToOffset);
        refocusSearch();
        return;
      }
      modalSearch?.stepMatch(delta);
    },
    [modalSearch, railSearch, refocusSearch, scrollToOffset, searchInRail],
  );

  return (
    <div className="hub-adm-note-editor-field">
      {searchInRail ? (
        <HubAdmNoteSearchBar
          searchQuery={railSearch.searchQuery}
          onSearchQueryChange={railSearch.setSearchQuery}
          hasSearch={railSearch.hasSearch}
          matchLabel={railSearch.matchLabel}
          matchRangesLength={railSearch.matchRanges.length}
          matchRevealed={railSearch.matchRevealed}
          onRevealFirst={onRevealFirst}
          onStepMatch={onStepMatch}
          inputRef={searchRef}
          searchLabel={searchLabel}
          placeholder={placeholder}
        />
      ) : null}
      <div ref={bodyRef} className="hub-adm-note-readonly-body">
        {text ? (
          <HubAdmNoteHighlightText
            text={text}
            ranges={highlightNote ? matchRanges : []}
            activeIndex={noteActiveIndex}
            markClassName="hub-adm-search-mark"
          />
        ) : (
          <span className="text-[var(--muted)]">{emptyMessage}</span>
        )}
      </div>
    </div>
  );
}
