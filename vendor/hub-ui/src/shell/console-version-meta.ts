import {
  getHubHostVersionPublishedAtOverride,
  resolveHubDisplayAppVersion,
} from "./hub-embed-mode";
import { Tag } from "lucide-react";
import { resolveAppVersionReleaseMeta, type ToolManifestReleaseSlice } from "../lib/app-version-release-meta";
import type { TabHeaderMetaItem } from "./AppTabHeader";
import { buildVersionMetaItems } from "./workspace-tab-header-meta";

/** `vX.Y.Z · activity timestamp` — thin wrapper over manifest + build meta. */
export function buildConsoleVersionMetaItems(
  appVersion: string,
  manifest?: ToolManifestReleaseSlice,
  options?: {
    builtAtIso?: string;
    changelogPublishedAt?: string;
    extra?: TabHeaderMetaItem[];
    /** @deprecated Use `versionReleaseNotesCode` on the header wrapper instead. */
    versionAfter?: TabHeaderMetaItem["after"];
  },
): TabHeaderMetaItem[] {
  const toolSemver = String(appVersion).replace(/^v/i, "").trim();
  const displayVersion = resolveHubDisplayAppVersion(appVersion);
  const hostPublishedAt = getHubHostVersionPublishedAtOverride();
  // Host portal (P0015) version inside embed — one clock for every ENZY screen.
  let items: TabHeaderMetaItem[];
  if (displayVersion !== toolSemver) {
    items = buildVersionMetaItems(displayVersion, hostPublishedAt, true, options?.extra ?? []);
  } else {
    const release = resolveAppVersionReleaseMeta({
      appVersion: displayVersion,
      manifest,
      builtAtIso: options?.builtAtIso,
      changelogPublishedAt: options?.changelogPublishedAt,
    });
    items = buildVersionMetaItems(
      displayVersion,
      hostPublishedAt || release.publishedAt,
      release.live,
      options?.extra ?? [],
    );
  }
  if (options?.versionAfter && items[0]) {
    items = [{ ...items[0], after: options.versionAfter }, ...items.slice(1)];
  }
  return items;
}

/**
 * Legacy `vX.Y.Z · dd/mm/yy` string meta (scaffold / simple headers).
 *
 * Pass `options.builtAtIso` (`VITE_APP_BUILT_AT`): `tool.manifest.json` is stamped *after* the
 * bundle is built, so a manifest-only header always shows the previous deploy.
 */
export function buildConsoleVersionMetaItemsLegacy(
  appVersion: string,
  manifest?: ToolManifestReleaseSlice,
  extra: TabHeaderMetaItem[] = [],
  options?: { builtAtIso?: string; changelogPublishedAt?: string },
): TabHeaderMetaItem[] {
  const displayVersion = resolveHubDisplayAppVersion(appVersion);
  const toolSemver = String(appVersion).replace(/^v/i, "").trim();
  if (displayVersion !== toolSemver) {
    return [{ icon: Tag, value: `v${displayVersion}`, live: true }, ...extra];
  }
  const release = resolveAppVersionReleaseMeta({
    appVersion: displayVersion,
    manifest,
    builtAtIso: options?.builtAtIso,
    changelogPublishedAt: options?.changelogPublishedAt,
  });
  return [
    {
      icon: Tag,
      value: `v${displayVersion.replace(/^v/i, "")} · ${release.shortLabel}`,
      live: release.live,
    },
    ...extra,
  ];
}
