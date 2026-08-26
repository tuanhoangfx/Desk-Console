import { focusHubModalSearch } from "./hub-modal-search";

export type HubShortcutId = "search" | "clear" | "new" | "edit" | "settings" | "dismiss";

export const HUB_SHORTCUT_LEGEND: { id: HubShortcutId; keys: string; label: string }[] = [
  { id: "search", keys: "F", label: "Search" },
  { id: "clear", keys: "Ctrl+Q", label: "Clear search" },
  { id: "new", keys: "N", label: "New / create" },
  { id: "edit", keys: "E", label: "Edit selection" },
  { id: "settings", keys: "S", label: "Settings" },
  { id: "dismiss", keys: "Esc", label: "Blur search · close modal" },
];

export type HubPageShortcutHandlers = {
  onNew?: () => void;
  onEdit?: () => void;
  canNew?: () => boolean;
  canEdit?: () => boolean;
};

type SearchClearEntry = {
  clear: () => void;
  getInput?: () => HTMLInputElement | null;
};

let activeScreenId = "default";
const searchFocusByScreen = new Map<string, () => void>();
const searchClearByScreen = new Map<string, SearchClearEntry>();
const handlersByScreen = new Map<string, HubPageShortcutHandlers>();
let settingsOpenFn: (() => void) | null = null;
let listenerAttached = false;

/** Call from app shell when sidebar tab changes (library | users | system-*). */
export function setHubActiveScreen(screenId: string) {
  activeScreenId = screenId || "default";
}

export function getHubActiveScreen(): string {
  return activeScreenId;
}

export function isHubTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const el = target;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return Boolean(el.closest("[contenteditable='true']"));
}

export function registerHubSearchFocus(screenId: string, fn: () => void): () => void {
  searchFocusByScreen.set(screenId, fn);
  ensureHubKeyboardListener();
  return () => {
    searchFocusByScreen.delete(screenId);
  };
}

export function registerHubSearchClear(
  screenId: string,
  clear: () => void,
  getInput?: () => HTMLInputElement | null,
): () => void {
  searchClearByScreen.set(screenId, { clear, getInput });
  ensureHubKeyboardListener();
  return () => {
    searchClearByScreen.delete(screenId);
  };
}

/** Tab header Settings panel (scope !== global). */
export function registerHubSettingsOpen(open: () => void): () => void {
  settingsOpenFn = open;
  ensureHubKeyboardListener();
  return () => {
    if (settingsOpenFn === open) settingsOpenFn = null;
  };
}

export function registerHubPageShortcuts(screenId: string, handlers: HubPageShortcutHandlers): () => void {
  handlersByScreen.set(screenId, handlers);
  ensureHubKeyboardListener();
  return () => {
    handlersByScreen.delete(screenId);
  };
}

/** @deprecated Use registerHubPageShortcuts(screenId, handlers) */
export function configureHubPageShortcuts(handlers: HubPageShortcutHandlers): void {
  registerHubPageShortcuts(activeScreenId, handlers);
}

function hasModifier(e: KeyboardEvent): boolean {
  return e.ctrlKey || e.metaKey || e.altKey;
}

function activeHandlers(): HubPageShortcutHandlers {
  return handlersByScreen.get(activeScreenId) ?? {};
}

function isActiveSearchInput(target: EventTarget | null, screenId: string): boolean {
  const input = searchClearByScreen.get(screenId)?.getInput?.();
  return Boolean(input && target === input);
}

function isHubModalOpen(): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(document.querySelector(".modal-backdrop [role='dialog'][aria-modal='true']"));
}


function onGlobalKeyDown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    const entry = searchClearByScreen.get(activeScreenId);
    const input = entry?.getInput?.();
    if (input && document.activeElement === input) {
      e.preventDefault();
      input.blur();
    }
    return;
  }

  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const handlers = activeHandlers();
  const modalOpen = isHubModalOpen();

  if (key === "f" && !hasModifier(e)) {
    if (isHubTypingTarget(e.target)) return;
    if (modalOpen) {
      if (focusHubModalSearch()) {
        e.preventDefault();
      }
      return;
    }
    const focus = searchFocusByScreen.get(activeScreenId);
    if (focus) {
      e.preventDefault();
      focus();
    }
    return;
  }

  if (key === "q" && (e.ctrlKey || e.metaKey) && !e.altKey) {
    if (modalOpen) return;
    const entry = searchClearByScreen.get(activeScreenId);
    if (!entry) return;
    const inSearch = isActiveSearchInput(e.target, activeScreenId);
    if (isHubTypingTarget(e.target) && !inSearch) return;
    e.preventDefault();
    entry.clear();
    return;
  }

  if (key === "s" && !hasModifier(e)) {
    if (modalOpen || isHubTypingTarget(e.target)) return;
    if (settingsOpenFn) {
      e.preventDefault();
      settingsOpenFn();
    }
    return;
  }

  if (isHubTypingTarget(e.target) || modalOpen) return;

  if (key === "n" && !hasModifier(e)) {
    if (handlers.onNew && (handlers.canNew?.() ?? true)) {
      e.preventDefault();
      handlers.onNew();
    }
    return;
  }

  if (key === "e" && !hasModifier(e)) {
    if (handlers.onEdit && (handlers.canEdit?.() ?? true)) {
      e.preventDefault();
      handlers.onEdit();
    }
  }
}

function ensureHubKeyboardListener() {
  if (listenerAttached || typeof window === "undefined") return;
  listenerAttached = true;
  window.addEventListener("keydown", onGlobalKeyDown, true);
}
