import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { HUB_NO_SPELLCHECK_PROPS } from "../lib/no-spellcheck";
import { HubAdmNoteHighlightText } from "./HubAdmNoteHighlightText";
import { HubAdmNoteSearchBar } from "./HubAdmNoteSearchBar";
import { useHubAdmNoteSearch } from "./hubAdmNoteSearch";
import { useHubAccountDetailSearchOptional } from "./hubAccountDetailSearch";

const NOTE_MARK_SELECTOR = ".hub-adm-note-mark, .hub-adm-search-mark";

export type HubAdmNoteEditorFieldProps = {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  placeholder?: string;
  controlClassName?: string;
  rows?: number;
  searchLabel?: string;
  searchPlaceholder?: string;
  /** When false, note rail is plain textarea; modal header search handles highlight. */
  searchInRail?: boolean;
  /** When true (default), textarea fills note rail height with internal scroll. */
  fillHeight?: boolean;
};

function resolveNoteMirrorActiveIndex(
  editorRoot: HTMLElement | null,
  activeMatch: number,
  matchRevealed: boolean,
): number {
  if (!editorRoot || !matchRevealed || activeMatch < 0) return -1;
  const modal = editorRoot.closest(".hub-account-detail-modal");
  if (!modal) return -1;
  const allMarks = Array.from(modal.querySelectorAll(NOTE_MARK_SELECTOR)).filter(
    (node): node is HTMLElement => node instanceof HTMLElement,
  );
  const activeEl = allMarks[activeMatch];
  if (!activeEl || !editorRoot.contains(activeEl)) return -1;
  const noteMarks = Array.from(editorRoot.querySelectorAll(NOTE_MARK_SELECTOR)).filter(
    (node): node is HTMLElement => node instanceof HTMLElement,
  );
  return noteMarks.indexOf(activeEl);
}

/** Editable note rail — optional in-rail search or plain note + header search mirror. */
export function HubAdmNoteEditorField({
  value,
  onChange,
  name = "hub-adm-note",
  placeholder = "Optional notes…",
  controlClassName = "field auth-gate-field hub-adm-note-textarea",
  rows = 8,
  searchLabel,
  searchPlaceholder,
  searchInRail = false,
  fillHeight = true,
}: HubAdmNoteEditorFieldProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const modalSearch = useHubAccountDetailSearchOptional();
  const [noteMirrorActiveIndex, setNoteMirrorActiveIndex] = useState(-1);

  const syncBackdropScroll = useCallback(() => {
    const textarea = textareaRef.current;
    const backdrop = backdropRef.current;
    if (!textarea || !backdrop) return;
    backdrop.scrollTop = textarea.scrollTop;
    backdrop.scrollLeft = textarea.scrollLeft;
  }, []);

  const scrollToOffset = useCallback(
    (start: number) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const lineHeight = Number.parseFloat(getComputedStyle(textarea).lineHeight) || 16;
      const linesBefore = value.slice(0, start).split("\n").length - 1;
      textarea.scrollTop = Math.max(0, linesBefore * lineHeight - textarea.clientHeight / 3);
      syncBackdropScroll();
    },
    [syncBackdropScroll, value],
  );

  const refocusSearch = useCallback(() => {
    requestAnimationFrame(() => searchRef.current?.focus());
  }, []);

  const railSearch = useHubAdmNoteSearch(value);

  const matchRanges = useMemo(() => {
    if (searchInRail) return railSearch.matchRanges;
    if (!modalSearch?.noteHighlightTerms.length) return [];
    return modalSearch.matchNoteRangesFor(value);
  }, [modalSearch, railSearch.matchRanges, searchInRail, value]);

  const hasSearch = searchInRail ? railSearch.hasSearch : Boolean(modalSearch?.hasSearch);
  const useNoteSearchMirror = hasSearch && Boolean(value) && matchRanges.length > 0;

  useLayoutEffect(() => {
    if (!useNoteSearchMirror || searchInRail) {
      setNoteMirrorActiveIndex(-1);
      return;
    }
    setNoteMirrorActiveIndex(
      resolveNoteMirrorActiveIndex(
        editorRef.current,
        modalSearch?.activeMatch ?? -1,
        modalSearch?.matchRevealed ?? false,
      ),
    );
  }, [
    modalSearch?.activeMatch,
    modalSearch?.matchRevealed,
    modalSearch?.searchQuery,
    matchRanges,
    searchInRail,
    useNoteSearchMirror,
    value,
  ]);

  useLayoutEffect(() => {
    if (!useNoteSearchMirror || noteMirrorActiveIndex < 0) return;
    const range = matchRanges[noteMirrorActiveIndex];
    if (!range) return;
    scrollToOffset(range.start);
  }, [matchRanges, noteMirrorActiveIndex, scrollToOffset, useNoteSearchMirror]);

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
          placeholder={searchPlaceholder}
        />
      ) : null}
      <div ref={editorRef} className="hub-adm-note-editor">
        {useNoteSearchMirror ? (
          <div ref={backdropRef} className="hub-adm-note-editor__backdrop" aria-hidden>
            <span className="hub-adm-note-editor__mirror">
              <HubAdmNoteHighlightText
                text={value}
                ranges={matchRanges}
                activeIndex={noteMirrorActiveIndex}
                markClassName="hub-adm-search-mark"
              />
            </span>
          </div>
        ) : null}
        <textarea
          ref={textareaRef}
          className={`${controlClassName}${useNoteSearchMirror ? " hub-adm-note-textarea--searching" : ""}${fillHeight ? " hub-adm-note-textarea--fill" : ""}`}
          name={name}
          autoComplete="off"
          {...HUB_NO_SPELLCHECK_PROPS}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={syncBackdropScroll}
          {...(fillHeight ? {} : { rows })}
        />
      </div>
    </div>
  );
}
