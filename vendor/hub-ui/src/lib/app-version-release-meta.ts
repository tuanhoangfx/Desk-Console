import { formatTabHeaderTimestamp } from "./tab-header-timestamp";

export type ToolManifestReleaseSlice = {
  release?: {
    version?: string;
    latestPublished?: {
      tag?: string;
      publishedAt?: string;
    };
  };
  manifestUpdatedAt?: string;
};

export type AppVersionReleaseMeta = {
  shortLabel: string;
  live: boolean;
  publishedAt?: string;
};

function normalizeVersion(value?: string) {
  return value?.replace(/^v/i, "") ?? "";
}

function parseStampMs(value: string): number {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : Number.NEGATIVE_INFINITY;
}

/** Parse `YYYY-MM-DD HH:mm (UTC+7)` changelog timestamps to ISO. */
export function normalizeChangelogTimestampRaw(raw: string): string | undefined {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+\(UTC([+-]\d{1,2})\)$/i);
  if (!match) return trimmed || undefined;
  const [, date, time, offset] = match;
  const sign = offset.startsWith("-") ? "-" : "+";
  const hour = offset.replace(/^[+-]/, "").padStart(2, "0");
  return `${date}T${time}:00${sign}${hour}:00`;
}

export function parseChangelogReleaseTimestamp(version: string, changelog: string): string | undefined {
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const entry = changelog.match(
    new RegExp(`- Version:\\s*\`${escaped}\`[\\s\\S]*?- Timestamp:\\s*([^\\n]+)`, "i"),
  );
  const raw = entry?.[1]?.trim();
  if (!raw) return undefined;
  return normalizeChangelogTimestampRaw(raw);
}

type StampCandidate = { at: string; live: boolean };

/**
 * Resolve build / GitHub release timestamp for Hub tab headers (SSOT).
 *
 * Prefer the **newest** stamp among:
 * - `builtAtIso` (Vite boot / Vercel build) — can go stale on long-lived `vite serve`
 * - matching `latestPublished.publishedAt`
 * - CHANGELOG timestamp for the current version
 * - `manifestUpdatedAt`
 *
 * So local Dev after Deploy/bump shows version activity (minutes ago), not Vite process age (14h ago).
 */
export function resolveAppVersionReleaseMeta(input: {
  appVersion: string;
  manifest?: ToolManifestReleaseSlice;
  builtAtIso?: string;
  changelogPublishedAt?: string;
}): AppVersionReleaseMeta {
  const candidates: StampCandidate[] = [];

  const builtAt = input.builtAtIso?.trim();
  if (builtAt) candidates.push({ at: builtAt, live: true });

  const currentVersion = normalizeVersion(input.appVersion);
  const latest = input.manifest?.release?.latestPublished;
  if (normalizeVersion(latest?.tag) === currentVersion && latest?.publishedAt) {
    candidates.push({ at: latest.publishedAt, live: true });
  }

  if (input.changelogPublishedAt) {
    candidates.push({ at: input.changelogPublishedAt, live: false });
  }

  const manifestUpdatedAt = input.manifest?.manifestUpdatedAt;
  if (manifestUpdatedAt) {
    candidates.push({ at: manifestUpdatedAt, live: false });
  }

  if (!candidates.length) return { shortLabel: "—", live: false };

  const best = candidates.reduce((winner, next) =>
    parseStampMs(next.at) >= parseStampMs(winner.at) ? next : winner,
  );

  return {
    shortLabel: formatTabHeaderTimestamp(best.at),
    live: best.live,
    publishedAt: best.at,
  };
}
