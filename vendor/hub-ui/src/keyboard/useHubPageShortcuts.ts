import { useEffect, useRef } from "react";
import { registerHubPageShortcuts, type HubPageShortcutHandlers } from "./hub-keyboard-shortcuts";

/**
 * Register N/E handlers for a screen scope (library | users | system-<tab>).
 * Safe with keep-mounted tabs — only `useHubActiveScreenSync` picks which scope runs.
 */
export function useHubPageShortcuts(screenId: string, handlers: HubPageShortcutHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    return registerHubPageShortcuts(screenId, {
      onNew: () => handlersRef.current.onNew?.(),
      onEdit: () => handlersRef.current.onEdit?.(),
      canNew: () => handlersRef.current.canNew?.() ?? true,
      canEdit: () => handlersRef.current.canEdit?.() ?? true,
    });
  }, [screenId]);
}
