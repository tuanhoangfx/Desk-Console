import { RefreshCw, Search, X } from "lucide-react";
import { startTransition, useEffect, useRef, useState, type Ref } from "react";
import { HUB_MODAL_SEARCH_ATTR } from "../keyboard/hub-modal-search";
import { HUB_NO_SPELLCHECK_PROPS } from "../lib/no-spellcheck";
import { compactIconSize } from "../ui-scale";
import { useHubDirectoryFieldQueryPendingReport } from "./HubDirectoryFieldQueryPending";

export type HubSearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputRef?: Ref<HTMLInputElement>;
  /** Show `F` focus hint when empty (directory FilterBar). Off in modals. */
  showShortcutHint?: boolean;
  /** Debounce / fetch pending — swap loupe for spinning RefreshCw (same as Sync chip). */
  queryPending?: boolean;
  /** Keyboard focus scope — FilterBar registers shortcuts when embedded. */
  shortcutScope?: string;
  /** Debounce parent onChange — keeps draft local so directory chrome does not re-render per keystroke. */
  debounceMs?: number;
  /** When true, tags input for global modal `F` shortcut (`data-hub-modal-search`). */
  modalSearch?: boolean;
};

/** Golden directory search input — P0004 FilterBar row-1 (shared across tools). */
export function HubSearchField({
  value,
  onChange,
  placeholder = "Search…",
  className = "",
  inputRef,
  showShortcutHint = true,
  queryPending = false,
  debounceMs = 0,
  modalSearch = false,
}: HubSearchFieldProps) {
  const debounced = debounceMs > 0;
  const [draft, setDraft] = useState(value);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  /** Last value we pushed to parent — used to accept external clears/resets without clobbering typing. */
  const lastFlushedRef = useRef(value);
  /** True after flush until parent value catches up — blocks lagging "" from wiping VN IME drafts. */
  const awaitingAckRef = useRef(false);
  const composingRef = useRef(false);
  const reportFieldPending = useHubDirectoryFieldQueryPendingReport();
  const localPending = debounced && draft !== value;

  const flushToParent = (next: string) => {
    lastFlushedRef.current = next;
    awaitingAckRef.current = true;
    onChange(next);
  };

  // External value sync (clear / deep-link / tab reset).
  // Never overwrite a newer local draft with a lagging parent value — that jump
  // is especially bad for Vietnamese IME (multi-keystroke → transition-delayed filterQuery).
  useEffect(() => {
    if (!debounced) return;
    if (value === lastFlushedRef.current) {
      awaitingAckRef.current = false;
    }
    if (value === draftRef.current) return;
    if (composingRef.current) return;
    if (value === lastFlushedRef.current) return;
    // Parent still behind our flush (often "") — keep draft.
    if (awaitingAckRef.current) return;
    setDraft(value);
    lastFlushedRef.current = value;
  }, [debounced, value]);

  useEffect(() => {
    if (!debounced) return;
    if (composingRef.current) return;
    if (draft === lastFlushedRef.current) return;
    const id = window.setTimeout(() => {
      if (composingRef.current) return;
      startTransition(() => flushToParent(draftRef.current));
    }, debounceMs);
    return () => window.clearTimeout(id);
    // flushToParent closes over onChange — intentionally omit to avoid re-arm storms
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onChange identity usually stable
  }, [debounced, debounceMs, draft]);

  useEffect(() => {
    reportFieldPending(localPending);
    return () => reportFieldPending(false);
  }, [localPending, reportFieldPending]);

  const displayValue = debounced ? draft : value;
  const glyphPending = queryPending || localPending;

  const setDisplayValue = (next: string, flush = false) => {
    if (debounced) {
      setDraft(next);
      if (flush || next === "") flushToParent(next);
      return;
    }
    onChange(next);
  };

  return (
    <div className={`relative min-w-[var(--hub-search-min-w)] flex-1 ${className}`.trim()}>
      <span
        className={`hub-search-field__glyph pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 ${
          glyphPending ? "hub-search-field__glyph--pending" : "text-[var(--muted)]"
        }`}
        aria-hidden
      >
        {glyphPending ? (
          <RefreshCw size={compactIconSize(14)} className="animate-spin" aria-hidden />
        ) : (
          <Search size={compactIconSize(14)} />
        )}
      </span>
      <input
        ref={inputRef}
        type="text"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        {...HUB_NO_SPELLCHECK_PROPS}
        name="hub-directory-search"
        value={displayValue}
        onChange={(e) => setDisplayValue(e.target.value)}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onCompositionEnd={(e) => {
          composingRef.current = false;
          // Final composed string (Vietnamese Telex/VNI) — update draft + flush.
          setDisplayValue(e.currentTarget.value, debounced);
        }}
        placeholder={placeholder}
        className="field h-[var(--hub-control-h)] w-full min-w-0 text-xs"
        style={{ paddingLeft: 31, paddingRight: displayValue ? 25 : 36 }}
        aria-label={placeholder}
        role="searchbox"
        {...(modalSearch ? { [HUB_MODAL_SEARCH_ATTR]: "" } : {})}
      />
      {showShortcutHint && !displayValue ? (
        <span className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 sm:flex">
          <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-indigo-200/90">
            F
          </kbd>
        </span>
      ) : null}
      {displayValue ? (
        <button
          type="button"
          onClick={() => setDisplayValue("", true)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]"
          aria-label="Clear search"
        >
          <X size={compactIconSize(12)} />
        </button>
      ) : null}
    </div>
  );
}
