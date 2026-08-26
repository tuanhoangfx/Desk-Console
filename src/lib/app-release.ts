import {
  buildConsoleVersionMetaItems,
  resolveHubProductVersionMeta,
  type ToolManifestReleaseSlice,
} from "@tool-workspace/hub-ui";
import packageJson from "../../package.json";
import toolManifest from "../../tool.manifest.json";

export const APP_VERSION = packageJson.version;
export const DESK_PRODUCT = { code: "P0001", name: "Desk Console" } as const;
export const DESK_BRAND_ICON = "/icons/tools/P0001.svg";

function readBuiltAtIso(): string | undefined {
  const raw = import.meta.env.VITE_APP_BUILT_AT;
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

export function deskHostVersionMeta() {
  return resolveHubProductVersionMeta({
    appVersion: APP_VERSION,
    releaseNotesCode: "P0001",
    manifest: toolManifest as ToolManifestReleaseSlice,
    builtAtIso: readBuiltAtIso(),
  });
}

export function deskVersionMetaItems() {
  return buildConsoleVersionMetaItems(APP_VERSION, toolManifest as ToolManifestReleaseSlice, {
    builtAtIso: readBuiltAtIso(),
  });
}
