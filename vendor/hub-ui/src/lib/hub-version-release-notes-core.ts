/**
 * Pure helpers for `HubVersionReleaseNotes`:
 * `/release-notes.json` payload parse + localStorage "NEW" seen logic. No DOM imports —
 * unit-testable without rendering.
 */

export type HubReleaseNoteKind = "new" | "improve" | "fix";

export type HubReleaseNoteEntry = {
  version: string;
  /** Changelog header date `YYYY-MM-DD` (search / TOC). */
  date: string;
  /**
   * Precise activity stamp (ISO) — CHANGELOG `- Timestamp:` when present.
   * Prefer this for hub age (`13m ago`); `date`-only skews UTC noon → calendar.
   */
  at?: string;
  /** Technical / agent title (changelog). */
  title: string;
  /** Technical bullets (changelog). */
  bullets: string[];
  /** Retained for feeds / search — UI shows Latest/Update freshness instead. */
  kind: HubReleaseNoteKind;
  /** User-facing headline (auto from title when missing). */
  userTitle: string;
  /** One-line user summary (optional; UI skips when it duplicates a highlight). */
  userSummary: string;
  /** Short user highlights (auto from bullets when missing). */
  userHighlights: string[];
};

/** Feed written by `Tool/scripts/generate-release-notes.mjs` into each product `public/`. */
export const HUB_RELEASE_NOTES_FILENAME = "release-notes.json";

/** @deprecated Prefer `hubReleaseNotesFetchUrl()` — absolute `/` breaks Electron `file://` dist loads. */
export const HUB_RELEASE_NOTES_URL = `/${HUB_RELEASE_NOTES_FILENAME}`;

/** Resolve fetch URL — respects Vite `base` (`./` desktop dist vs `/` dev server). */
export function hubReleaseNotesFetchUrl(baseUrl?: string): string {
  const fromEnv =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    typeof import.meta.env.BASE_URL === "string"
      ? import.meta.env.BASE_URL
      : "";
  const base = (baseUrl ?? fromEnv) || "/";
  const normalized = base.endsWith("/") ? base : `${base}/`;
  return `${normalized}${HUB_RELEASE_NOTES_FILENAME}`;
}

export function hubReleaseNotesSeenKey(code: string): string {
  return `hub:release-notes-seen:${code}`;
}

export function normalizeReleaseNotesVersion(version: string | null | undefined): string {
  return String(version ?? "")
    .trim()
    .replace(/^v/i, "");
}

/** Strip header meta noise (`v1.2.3 · 3m ago`) → semver token for running-bundle match. */
export function extractHubReleaseNotesSemver(version: string | null | undefined): string {
  const raw = normalizeReleaseNotesVersion(version);
  const match = raw.match(/^(\d+(?:\.\d+)*(?:-[0-9A-Za-z.]+)?)/);
  return match?.[1] ?? raw.split(/\s+/)[0] ?? raw;
}

const CONVENTIONAL_PREFIX =
  /^(fix|feat|feature|chore|refactor|perf|docs|style|test|build|ci)(\([^)]*\))?:\s*/i;

/** Infer kind from conventional-commit style title (kept in feed JSON). */
export function inferHubReleaseNoteKind(title: string): HubReleaseNoteKind {
  const t = title.trim();
  if (/^fix\b/i.test(t) || /\bfix\b/i.test(t.slice(0, 24))) return "fix";
  if (/^(feat|feature|new)\b/i.test(t)) return "new";
  return "improve";
}

function softenTechPhrase(raw: string): string {
  let text = String(raw ?? "").trim();
  text = text.replace(CONVENTIONAL_PREFIX, "");
  text = text.replace(/\b[A-Za-z0-9_./-]+\.(tsx?|jsx?|mjs|cjs|css)\b/g, "");
  text = text.replace(/\b(SSOT|OE|KPI|IDB|rAF|IME)\b/g, (m) => {
    if (m === "SSOT") return "shared UI";
    if (m === "OE") return "extra work";
    if (m === "KPI") return "stats";
    return m;
  });
  text = text.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  text = text.replace(/\bprop\b/gi, "");
  text = text.replace(/\s*[—–-]\s*no\b.+$/i, "");
  text = text.replace(/\s*\([^)]*\)\s*/g, " ");
  text = text.replace(/[_/|]+/g, " ");
  text = text.replace(/\s{2,}/g, " ").trim();
  return text;
}

/** Strip conventional prefix → readable headline for User view. */
export function humanizeHubReleaseNoteTitle(title: string): string {
  const softened = softenTechPhrase(title);
  if (!softened) return "Update";
  const capped = softened.charAt(0).toUpperCase() + softened.slice(1);
  if (capped.length > 72) return `${capped.slice(0, 69).trim()}…`;
  return capped;
}

/** Soften a tech bullet into a short user line. */
export function humanizeHubReleaseBullet(bullet: string): string {
  let text = softenTechPhrase(bullet);
  // Prefer the lead clause before a semicolon.
  const semi = text.indexOf(";");
  if (semi > 24) text = text.slice(0, semi).trim();
  if (text.length > 100) text = `${text.slice(0, 97).trim()}…`;
  if (!text) return "Improved reliability";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function buildHubReleaseUserSummary(userTitle: string, highlights: string[]): string {
  if (highlights[0]) {
    const first = highlights[0].replace(/\.$/, "");
    // Avoid baking a duplicate of the first highlight into summary.
    if (first.toLowerCase() === userTitle.replace(/\.$/, "").toLowerCase()) {
      return "";
    }
    return `${first}.`;
  }
  return `${userTitle}.`;
}

/** True when summary repeats the title or the first highlight (User card should hide it). */
export function hubReleaseSummaryIsRedundant(
  summary: string,
  title: string,
  highlights: readonly string[],
): boolean {
  const s = summary.trim().replace(/\.$/, "").toLowerCase();
  if (!s) return true;
  if (s === title.trim().replace(/\.$/, "").toLowerCase()) return true;
  const first = (highlights[0] ?? "").trim().replace(/\.$/, "").toLowerCase();
  return Boolean(first) && s === first;
}

function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

function parseStampMs(value: string | null | undefined): number {
  const ms = Date.parse(String(value ?? "").trim());
  return Number.isFinite(ms) ? ms : Number.NEGATIVE_INFINITY;
}

/** Prefer the newer ISO stamp so tab chrome and Update Release modal share one clock. */
export function pickNewerReleaseNoteStamp(
  a?: string | null,
  b?: string | null,
): string | undefined {
  const left = String(a ?? "").trim();
  const right = String(b ?? "").trim();
  if (!left) return right || undefined;
  if (!right) return left || undefined;
  return parseStampMs(right) > parseStampMs(left) ? right : left;
}

/**
 * Header may show package version newer than the last *documented* changelog entry
 * (auto bump-noise drops). Prepend a Latest stub so TOC/main match the header chip.
 *
 * Prefer `currentPublishedAt` (hub tab version meta / CHANGELOG Timestamp / Vite builtAt)
 * for the current row age chip so modal header · card · hub chrome share one stamp —
 * never leave a stale `/release-notes.json` deploy stamp when chrome already shows a
 * fresher builtAt (local: "4m ago" vs modal "3h ago").
 */
export function ensureHubReleaseNotesIncludeCurrent(
  entries: readonly HubReleaseNoteEntry[],
  currentVersion: string | null | undefined,
  currentPublishedAt?: string | null,
): HubReleaseNoteEntry[] {
  const cur = normalizeReleaseNotesVersion(currentVersion);
  if (!cur) return [...entries];

  // Drop feed rows newer than the running bundle (stale Vite bake vs Deploy regen).
  const notNewerThanCurrent = entries.filter((e) => compareSemver(e.version, cur) <= 0);

  const withFresherCurrent = (list: readonly HubReleaseNoteEntry[]): HubReleaseNoteEntry[] =>
    list.map((entry) => {
      if (entry.version !== cur) return entry;
      const nextAt = pickNewerReleaseNoteStamp(entry.at, currentPublishedAt);
      if (!nextAt || nextAt === entry.at) return entry;
      const nextDate = nextAt.slice(0, 10) || entry.date;
      return { ...entry, at: nextAt, date: nextDate || entry.date };
    });

  if (notNewerThanCurrent.some((e) => e.version === cur)) {
    return withFresherCurrent(notNewerThanCurrent);
  }

  const top = notNewerThanCurrent[0];
  // Only stub when current is strictly newer than filtered feed head (or feed empty).
  if (top && compareSemver(cur, top.version) <= 0) return withFresherCurrent(notNewerThanCurrent);

  const activityAt = hubReleaseNoteActivityAt(
    new Date().toISOString().slice(0, 10),
    currentPublishedAt,
  );
  const today = (activityAt ?? new Date().toISOString()).slice(0, 10);
  const stub: HubReleaseNoteEntry = {
    version: cur,
    date: today,
    at: activityAt ?? new Date().toISOString(),
    title: `chore: release v${cur}`,
    bullets: [],
    kind: "improve",
    userTitle: "Current version",
    userSummary: "",
    userHighlights: ["Maintenance and polish since the last documented release."],
  };
  return [stub, ...notNewerThanCurrent];
}

/** Insert GitHub pending version when electron-updater reports a build not yet in the feed. */
export function ensureHubReleaseNotesIncludePendingUpdate(
  entries: readonly HubReleaseNoteEntry[],
  currentVersion: string,
  pendingVersion: string | null | undefined,
): HubReleaseNoteEntry[] {
  const pending = normalizeReleaseNotesVersion(pendingVersion);
  const cur = normalizeReleaseNotesVersion(currentVersion);
  if (!pending || !cur || compareSemver(pending, cur) <= 0) return [...entries];
  if (entries.some((e) => normalizeReleaseNotesVersion(e.version) === pending)) return [...entries];
  const today = new Date().toISOString().slice(0, 10);
  const stub: HubReleaseNoteEntry = {
    version: pending,
    date: today,
    at: new Date().toISOString(),
    title: `Update v${pending}`,
    bullets: [],
    kind: "improve",
    userTitle: "Update available",
    userSummary: "Download from Update Release to install this build.",
    userHighlights: [],
  };
  return [stub, ...entries];
}

/**
 * Activity stamp for Update Release age chip — same scale as hub header (`13m ago`).
 * Prefer `at` (CHANGELOG Timestamp); date-only → local noon (not UTC) + clamp future.
 */
export function hubReleaseNoteActivityAt(date: string, at?: string | null): string | null {
  const precise = String(at ?? "").trim();
  if (precise) {
    const ms = Date.parse(precise);
    if (Number.isFinite(ms)) {
      return ms > Date.now() ? new Date().toISOString() : precise;
    }
  }
  const d = String(date ?? "").trim();
  if (!d) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const localNoon = new Date(`${d}T12:00:00`);
    const ms = localNoon.getTime();
    if (!Number.isFinite(ms)) return null;
    if (ms > Date.now()) return new Date().toISOString();
    return localNoon.toISOString();
  }
  return d;
}

function asStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((b): b is string => typeof b === "string" && b.trim().length > 0);
}

function parseKind(raw: unknown, title: string): HubReleaseNoteKind {
  if (raw === "new" || raw === "improve" || raw === "fix") return raw;
  return inferHubReleaseNoteKind(title);
}

/** Tolerant payload parse — malformed feed / wrong shape → [] ; fills user fields when absent. */
export function parseHubReleaseNotesPayload(raw: unknown): HubReleaseNoteEntry[] {
  if (!raw || typeof raw !== "object") return [];
  const entries = (raw as { entries?: unknown }).entries;
  if (!Array.isArray(entries)) return [];
  const out: HubReleaseNoteEntry[] = [];
  for (const item of entries) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const version = normalizeReleaseNotesVersion(
      typeof record.version === "string" ? record.version : "",
    );
    if (!version) continue;
    const bullets = asStringList(record.bullets);
    const title = typeof record.title === "string" ? record.title : "";
    const kind = parseKind(record.kind, title);
    const userTitle =
      typeof record.userTitle === "string" && record.userTitle.trim()
        ? record.userTitle.trim()
        : humanizeHubReleaseNoteTitle(title);
    const userHighlights =
      asStringList(record.userHighlights).length > 0
        ? asStringList(record.userHighlights)
        : bullets.map(humanizeHubReleaseBullet).slice(0, 4);
    const userSummary =
      typeof record.userSummary === "string"
        ? record.userSummary.trim()
        : buildHubReleaseUserSummary(userTitle, userHighlights);
    const atRaw = typeof record.at === "string" ? record.at.trim() : "";
    out.push({
      version,
      date: typeof record.date === "string" ? record.date : "",
      ...(atRaw ? { at: atRaw } : {}),
      title,
      bullets,
      kind,
      userTitle,
      userSummary: hubReleaseSummaryIsRedundant(userSummary, userTitle, userHighlights)
        ? ""
        : userSummary,
      userHighlights,
    });
  }
  return out;
}

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function resolveStorage(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function readHubReleaseNotesSeen(code: string, storage?: StorageLike): string | null {
  const store = resolveStorage(storage);
  if (!store) return null;
  try {
    return store.getItem(hubReleaseNotesSeenKey(code));
  } catch {
    return null;
  }
}

export function markHubReleaseNotesSeen(code: string, version: string, storage?: StorageLike): void {
  const store = resolveStorage(storage);
  const normalized = normalizeReleaseNotesVersion(version);
  if (!store || !normalized) return;
  try {
    store.setItem(hubReleaseNotesSeenKey(code), normalized);
  } catch {
    /* quota / privacy */
  }
}

export function hasUnseenHubReleaseNotes(
  currentVersion: string | null | undefined,
  seenVersion: string | null | undefined,
): boolean {
  const current = normalizeReleaseNotesVersion(currentVersion);
  if (!current) return false;
  return normalizeReleaseNotesVersion(seenVersion) !== current;
}
