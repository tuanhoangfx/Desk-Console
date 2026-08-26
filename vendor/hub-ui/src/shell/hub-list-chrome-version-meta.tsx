import { type ReactNode } from "react";
import type { TabHeaderMetaItem } from "./AppTabHeader";

/**
 * Single header icon SSOT (WorkspaceTabHeader parity):
 * HubVersionReleaseNotes owns Latest / Update / Download.
 * Do not concatenate `versionAfter` (HubVersionUpdateStatusIcon) beside it.
 */
export function mergeHubListVersionMetaAfter(
  first: TabHeaderMetaItem,
  releaseNotesAfter: ReactNode,
): TabHeaderMetaItem {
  if (!releaseNotesAfter) return first;
  return { ...first, after: releaseNotesAfter };
}

/** Apply release-notes badge to the first meta item when code is set. */
export function applyHubListVersionReleaseNotesMeta(
  metaItems: TabHeaderMetaItem[],
  releaseNotesAfter: ReactNode | null,
): TabHeaderMetaItem[] {
  if (!releaseNotesAfter || !metaItems[0]) return metaItems;
  return [mergeHubListVersionMetaAfter(metaItems[0], releaseNotesAfter), ...metaItems.slice(1)];
}
