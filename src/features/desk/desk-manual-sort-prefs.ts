import { createDirectoryManualSortPrefs, type DirectoryManualSortPrefs } from "@tool-workspace/hub-ui";
import type { AppScreen } from "../../lib/app-screen";

const cache = new Map<AppScreen, DirectoryManualSortPrefs>();

/** Per-tab manual sort — default OFF; storage key matches DirectoryTableLegacyDisplaySettings `id`. */
export function deskManualSortPrefsFor(screen: AppScreen): DirectoryManualSortPrefs {
  const hit = cache.get(screen);
  if (hit) return hit;
  const prefs = createDirectoryManualSortPrefs({
    storageKey: `directory-manual-sort:${screen}:v1`,
    changeEvent: `directory-manual-sort-${screen}-change`,
  });
  cache.set(screen, prefs);
  return prefs;
}
