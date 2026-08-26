import { useCallback, useRef } from "react";
import { useHubAccountDetailSearchShortcuts } from "../keyboard/useHubAccountDetailSearchShortcuts";
import { HubAdmNoteSearchBar } from "./HubAdmNoteSearchBar";
import { useHubAccountDetailSearch } from "./hubAccountDetailSearch";

export type HubAccountDetailHeaderSearchProps = {
  placeholder?: string;
  ariaLabel?: string;
};

/** Centered account-detail header search — highlights Credentials · Note · Log. */
export function HubAccountDetailHeaderSearch({
  placeholder = "Search credentials, note, log…",
  ariaLabel = "Search account details",
}: HubAccountDetailHeaderSearchProps = {}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    searchQuery,
    setSearchQuery,
    hasSearch,
    matchLabel,
    matchRevealed,
    totalMatches,
    revealFirst,
    stepMatch,
  } = useHubAccountDetailSearch();

  const onRevealFirst = useCallback(() => {
    revealFirst();
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [revealFirst]);

  const onStepMatch = useCallback(
    (delta: number) => {
      stepMatch(delta);
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [stepMatch],
  );

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    inputRef.current?.focus();
  }, [setSearchQuery]);

  useHubAccountDetailSearchShortcuts({ inputRef, onClear: clearSearch });

  return (
    <HubAdmNoteSearchBar
      variant="header"
      modalSearch
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      hasSearch={hasSearch}
      matchLabel={matchLabel}
      matchRangesLength={totalMatches}
      matchRevealed={matchRevealed}
      onRevealFirst={onRevealFirst}
      onStepMatch={onStepMatch}
      inputRef={inputRef}
      placeholder={placeholder}
      ariaLabel={ariaLabel}
    />
  );
}
