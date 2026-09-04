import {
  createContext,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getDirectorySearchHighlight } from "../lib/directory-id-search";
import {
  findHubAdmNoteMatchRanges,
  getHubAccountDetailNoteHighlightTerms,
} from "./hubAdmNoteSearch";

export type HubAccountDetailSearchContextValue = {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  highlightTerms: string[];
  noteHighlightTerms: string[];
  hasSearch: boolean;
  matchLabel: string;
  matchRevealed: boolean;
  activeMatch: number;
  totalMatches: number;
  revealFirst: () => void;
  stepMatch: (delta: number) => void;
  matchRangesFor: (text: string) => ReturnType<typeof findHubAdmNoteMatchRanges>;
  matchNoteRangesFor: (text: string) => ReturnType<typeof findHubAdmNoteMatchRanges>;
};

const HubAccountDetailSearchContext = createContext<HubAccountDetailSearchContextValue | null>(null);

const MARK_SELECTOR = ".hub-adm-note-mark, .hub-adm-search-mark";

function collectModalMarks(): HTMLElement[] {
  const root = document.querySelector(".hub-account-detail-modal");
  if (!root) return [];
  return Array.from(root.querySelectorAll(MARK_SELECTOR)).filter(
    (node): node is HTMLElement => node instanceof HTMLElement,
  );
}

/** Modal-wide search — header query highlights Credentials · Note · Log. */
export function HubAccountDetailSearchProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMatch, setActiveMatch] = useState(0);
  const [matchRevealed, setMatchRevealed] = useState(false);
  const [totalMatches, setTotalMatches] = useState(0);

  /** Keep the input snappy; defer mark/highlight work on heavy Team modals. */
  const deferredQuery = useDeferredValue(searchQuery);

  const highlightTerms = useMemo(() => {
    const highlight = getDirectorySearchHighlight(deferredQuery, { mixedRequiresWhitespace: false });
    if (!highlight) return [];
    return [...highlight.textTerms, ...highlight.idTerms].filter(Boolean);
  }, [deferredQuery]);

  const noteHighlightTerms = useMemo(
    () => getHubAccountDetailNoteHighlightTerms(deferredQuery),
    [deferredQuery],
  );

  const hasSearch = highlightTerms.length > 0;

  const matchLabel = useMemo(() => {
    if (!hasSearch) return "";
    if (!totalMatches) return "0/0";
    if (!matchRevealed) return `0/${totalMatches}`;
    return `${activeMatch + 1}/${totalMatches}`;
  }, [activeMatch, hasSearch, matchRevealed, totalMatches]);

  useEffect(() => {
    setActiveMatch(0);
    setMatchRevealed(false);
  }, [deferredQuery]);

  const syncActiveMark = useCallback((index: number, revealed: boolean) => {
    const marks = collectModalMarks();
    marks.forEach((mark, i) => {
      mark.classList.toggle("hub-adm-note-mark--active", revealed && i === index);
      mark.classList.toggle("hub-adm-search-mark--active", revealed && i === index);
    });
    if (revealed && marks[index]) {
      marks[index]!.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, []);

  useLayoutEffect(() => {
    setTotalMatches(collectModalMarks().length);
    if (!matchRevealed) {
      syncActiveMark(0, false);
      return;
    }
    syncActiveMark(activeMatch, true);
  }, [activeMatch, matchRevealed, deferredQuery, highlightTerms, syncActiveMark]);

  const revealFirst = useCallback(() => {
    const marks = collectModalMarks();
    if (!marks.length) return;
    setActiveMatch(0);
    setMatchRevealed(true);
  }, []);

  const stepMatch = useCallback(
    (delta: number) => {
      const marks = collectModalMarks();
      if (!marks.length) return;
      if (!matchRevealed) {
        revealFirst();
        return;
      }
      const next = (activeMatch + delta + marks.length) % marks.length;
      setActiveMatch(next);
      setMatchRevealed(true);
    },
    [activeMatch, matchRevealed, revealFirst],
  );

  const matchRangesFor = useCallback(
    (text: string) => findHubAdmNoteMatchRanges(text, highlightTerms),
    [highlightTerms],
  );

  const matchNoteRangesFor = useCallback(
    (text: string) => findHubAdmNoteMatchRanges(text, noteHighlightTerms),
    [noteHighlightTerms],
  );

  const value = useMemo(
    (): HubAccountDetailSearchContextValue => ({
      searchQuery,
      setSearchQuery,
      highlightTerms,
      noteHighlightTerms,
      hasSearch,
      matchLabel,
      matchRevealed,
      activeMatch,
      totalMatches,
      revealFirst,
      stepMatch,
      matchRangesFor,
      matchNoteRangesFor,
    }),
    [
      activeMatch,
      hasSearch,
      highlightTerms,
      matchLabel,
      matchNoteRangesFor,
      matchRangesFor,
      matchRevealed,
      noteHighlightTerms,
      revealFirst,
      searchQuery,
      setSearchQuery,
      stepMatch,
      totalMatches,
    ],
  );

  return (
    <HubAccountDetailSearchContext.Provider value={value}>{children}</HubAccountDetailSearchContext.Provider>
  );
}

export function useHubAccountDetailSearch(): HubAccountDetailSearchContextValue {
  const ctx = useContext(HubAccountDetailSearchContext);
  if (!ctx) {
    throw new Error("useHubAccountDetailSearch must be used within HubAccountDetailSearchProvider");
  }
  return ctx;
}

export function useHubAccountDetailSearchOptional(): HubAccountDetailSearchContextValue | null {
  return useContext(HubAccountDetailSearchContext);
}
