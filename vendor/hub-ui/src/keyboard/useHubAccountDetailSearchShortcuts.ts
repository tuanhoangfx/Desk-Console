import { useEffect, type RefObject } from "react";
import { focusHubModalSearch } from "./hub-modal-search";
import {
  getHubActiveScreen,
  isHubTypingTarget,
  registerHubSearchClear,
  registerHubSearchFocus,
} from "./hub-keyboard-shortcuts";

export type UseHubAccountDetailSearchShortcutsProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  onClear: () => void;
  /** Defaults to `account-detail` — shared across Services/Mail/Browser/Facebook/Quota modals. */
  scopeSuffix?: string;
};

/** Golden account-detail modal search shortcuts — `F` focus · Ctrl+Q clear. */
export function useHubAccountDetailSearchShortcuts({
  inputRef,
  onClear,
  scopeSuffix = "account-detail",
}: UseHubAccountDetailSearchShortcutsProps) {
  useEffect(() => {
    const focusSearch = () => {
      focusHubModalSearch(inputRef.current);
    };
    const shortcutScope = `${getHubActiveScreen()}::${scopeSuffix}`;
    const unregisterFocus = registerHubSearchFocus(shortcutScope, focusSearch);
    const unregisterClear = registerHubSearchClear(shortcutScope, onClear, () => inputRef.current);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "f" || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isHubTypingTarget(event.target)) return;
      if (!focusHubModalSearch(inputRef.current)) return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      unregisterFocus();
      unregisterClear();
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [inputRef, onClear, scopeSuffix]);
}
