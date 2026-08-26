/**
 * Single product version clock for WorkspaceTabHeader / HubVersionReleaseNotes.
 * Prefer host portal override when embedded; else resolveAppVersionReleaseMeta.
 */
import {
  getHubHostVersionPublishedAtOverride,
  readHubEmbedHostCode,
  resolveHubDisplayAppVersion,
} from "../shell/hub-embed-mode";
import {
  resolveAppVersionReleaseMeta,
  type ToolManifestReleaseSlice,
} from "./app-version-release-meta";

export type HubProductVersionMeta = {
  line: string;
  publishedAt?: string;
  live: boolean;
  releaseNotesCode: string;
};

export function resolveHubProductVersionMeta(input: {
  appVersion: string;
  releaseNotesCode: string;
  manifest?: ToolManifestReleaseSlice;
  builtAtIso?: string;
  changelogPublishedAt?: string;
}): HubProductVersionMeta {
  const display = resolveHubDisplayAppVersion(input.appVersion);
  const hostPublishedAt = getHubHostVersionPublishedAtOverride();
  const release = resolveAppVersionReleaseMeta({
    appVersion: display,
    manifest: input.manifest,
    builtAtIso: input.builtAtIso,
    changelogPublishedAt: input.changelogPublishedAt,
  });
  return {
    line: `v${display}`,
    publishedAt: hostPublishedAt || release.publishedAt,
    live: Boolean(hostPublishedAt) || release.live,
    releaseNotesCode: readHubEmbedHostCode() || input.releaseNotesCode,
  };
}
