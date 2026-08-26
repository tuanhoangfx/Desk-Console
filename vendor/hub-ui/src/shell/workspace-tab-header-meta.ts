import { Tag } from "lucide-react";
import type { TabHeaderMetaItem } from "./AppTabHeader";

/** Left meta: `vX.Y.Z · [activity dot] just now` (P0004 Hub / P0020 workspace SSOT). */
export function buildVersionMetaItems(
  version: string,
  publishedAt?: string | null,
  live?: boolean,
  extra?: TabHeaderMetaItem[],
): TabHeaderMetaItem[];
/** @deprecated Pass semver + `publishedAt` for activity timestamp label. */
export function buildVersionMetaItems(
  versionLine: string,
  live: boolean | undefined,
  extra: TabHeaderMetaItem[],
): TabHeaderMetaItem[];
export function buildVersionMetaItems(
  version: string,
  arg2?: string | null | boolean,
  arg3?: boolean | TabHeaderMetaItem[],
  arg4: TabHeaderMetaItem[] = [],
): TabHeaderMetaItem[] {
  if (typeof arg2 === "boolean") {
    const extra = Array.isArray(arg3) ? arg3 : arg4;
    return [{ icon: Tag, value: version, live: arg2 }, ...extra];
  }

  const publishedAt = arg2;
  const live = typeof arg3 === "boolean" ? arg3 : undefined;
  const extra = Array.isArray(arg3) ? arg3 : arg4;
  const semver = version.replace(/^v/i, "").trim();
  return [
    {
      icon: Tag,
      value: `v${semver}`,
      activityAt: publishedAt ?? undefined,
      live,
    },
    ...extra,
  ];
}
