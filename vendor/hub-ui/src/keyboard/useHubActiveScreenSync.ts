import { useEffect } from "react";
import { setHubActiveScreen } from "./hub-keyboard-shortcuts";

/** FilterBar / page shortcut scope for a System sub-tab (e.g. `system-agent`). */
export function hubSystemShortcutScope(tabId: string): string {
  return `system-${tabId}`;
}

/** Active keyboard scope: top-level tab or `system-<subTab>`. */
export function resolveHubActiveScreenId(screen: string, systemTab?: string | null): string {
  if (screen === "system") {
    const tab = systemTab?.trim();
    return tab ? hubSystemShortcutScope(tab) : "system";
  }
  return screen || "default";
}

/**
 * Keep `setHubActiveScreen` in sync with sidebar + System sub-tab URL.
 * Pass `systemTab` from app shell (`readSystemTab()` + popstate).
 */
export function useHubActiveScreenSync(screen: string, systemTab?: string | null) {
  useEffect(() => {
    setHubActiveScreen(resolveHubActiveScreenId(screen, systemTab));
  }, [screen, systemTab]);
}
