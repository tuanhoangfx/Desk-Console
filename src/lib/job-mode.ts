import { formatHubDurationLong, hubDebounceOptionDetail, HUB_DEBOUNCE_EMOJI, type FilterOption } from "@tool-workspace/hub-ui";
import {
  formatJobLiveProgressBadge as formatJobLiveProgressBadgeRaw,
  formatJobLiveProgressTooltip as formatJobLiveProgressTooltipRaw,
  jobNextText as jobNextTextRaw,
  jobRunAction as jobRunActionRaw,
  jobStatusLive as jobStatusLiveRaw,
  jobStatusView as jobStatusViewRaw,
} from "./job-row-chrome.mjs";
import type { SyncJob, SyncJobLiveProgress } from "./sync-api";

/** V1 Ledger — Debounce (hub-ui SSOT). 0 turns auto sync off for that job. */
export const JOB_SETTLE_OPTIONS: FilterOption[] = [
  { value: "0", label: "Manual", emoji: "✋", detail: "Only the Start button syncs this job." },
  ...[20, 60, 300].map((sec) => ({
    value: String(sec),
    label: formatHubDurationLong(sec),
    emoji: HUB_DEBOUNCE_EMOJI,
    detail: hubDebounceOptionDetail(sec, "Sync"),
  })),
];

export function jobSettleSec(value: number | string | null | undefined): number {
  const n = Number(value);
  return n === 0 || n === 20 || n === 60 || n === 300 ? n : 20;
}

export function jobSettleLabel(value: number | string | null | undefined): string {
  const n = jobSettleSec(value);
  return JOB_SETTLE_OPTIONS.find((option) => option.value === String(n))?.label ?? `${n}s`;
}

export const JOB_MAX_FILE_SIZE_OPTIONS: FilterOption[] = [
  { value: "UNLIMITED", label: "Unlimited", emoji: "♾️", detail: "Sync files of any size." },
  { value: "500M", label: "500 MB", emoji: "📏", detail: "Skip files larger than 500 MB (--max-size 500M)." },
  { value: "1G", label: "1 GB", emoji: "📏", detail: "Skip files larger than 1 GB (--max-size 1G)." },
  { value: "2G", label: "2 GB", emoji: "📏", detail: "Skip files larger than 2 GB (--max-size 2G)." },
  { value: "5G", label: "5 GB", emoji: "📏", detail: "Skip files larger than 5 GB (--max-size 5G)." },
  { value: "10G", label: "10 GB", emoji: "📏", detail: "Skip files larger than 10 GB (--max-size 10G)." },
];

export type JobExcludePreset = {
  id: string;
  label: string;
  emoji: string;
  tokens: string[];
};

export const JOB_EXCLUDE_PRESETS: JobExcludePreset[] = [
  {
    id: "node_build",
    label: "Node / Build",
    emoji: "📦",
    tokens: ["node_modules", "dist", ".git", ".next", "build", "coverage", ".env", ".env.local", "*.log"],
  },
  {
    id: "media_cache",
    label: "Video / Adobe Cache",
    emoji: "🎬",
    tokens: [
      "Adobe Premiere Pro Auto-Save",
      "Adobe Premiere Pro Preview Files",
      "Media Cache",
      "Media Cache Files",
      "Peak Files",
      "*.pek",
      "*.cfa",
    ],
  },
  {
    id: "office_temp",
    label: "Office / Temp",
    emoji: "📄",
    tokens: ["*.tmp", "*.temp", "*.bak", "~$*", "~*.tmp", "*.crdownload", "*.part"],
  },
  {
    id: "system_hidden",
    label: "System Hidden",
    emoji: "🖥️",
    tokens: [
      ".DS_Store",
      "Thumbs.db",
      "desktop.ini",
      "$RECYCLE.BIN",
      "System Volume Information",
      ".folder-sync-backup",
      "_FolderSyncBackups",
    ],
  },
];

/** Folders and junk files rclone and the watchers skip by default (includes all 4 preset groups). */
export const DEFAULT_JOB_EXCLUDES = JOB_EXCLUDE_PRESETS.flatMap((p) => p.tokens).join(",");

const LEGACY_EXCLUDES = new Set([
  "node_modules,dist,.git",
  "node_modules,dist,.git,.env",
  "node_modules,dist,.git,.env,.env.local,*.log",
  "node_modules,dist,.git,.env,.env.local,*.log,*.tmp",
  "node_modules,dist,.git,.env,.env.local,*.log,*.tmp,~$*",
  "node_modules,dist,.git,.env,.env.local,*.log,*.tmp,~$*,.folder-sync-backup,_FolderSyncBackups",
  "node_modules,dist,.git,.next,build,coverage,.env,.env.local,*.log,Adobe Premiere Pro Auto-Save,Adobe Premiere Pro Preview Files,Media Cache,Media Cache Files,Peak Files,*.pek,*.cfa,*.tmp,*.temp,*.bak,~$*,~*.tmp,*.crdownload,*.part,.DS_Store,Thumbs.db,desktop.ini,$RECYCLE.BIN,System Volume Information",
]);

function isLegacyExcludeString(value: string | null | undefined): boolean {
  if (value == null) return true;
  const trimmed = String(value).trim();
  if (LEGACY_EXCLUDES.has(trimmed)) return true;
  const stripped = trimmed
    .split(/[,;\n]/)
    .map((t) => t.trim())
    .filter((t) => t && t !== ".folder-sync-backup" && t !== "_FolderSyncBackups")
    .join(",");
  return LEGACY_EXCLUDES.has(stripped);
}

export function jobExcludeText(value: string | null | undefined): string {
  if (isLegacyExcludeString(value)) return DEFAULT_JOB_EXCLUDES;
  return String(value ?? "");
}

export function splitExcludeTokens(value: string | null | undefined): string[] {
  return String(value ?? "")
    .split(/[,;\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function isExcludePresetActive(value: string | null | undefined, preset: JobExcludePreset): boolean {
  const activeSet = new Set(splitExcludeTokens(jobExcludeText(value)).map((t) => t.toLowerCase()));
  return preset.tokens.every((t) => activeSet.has(t.toLowerCase()));
}

const ALL_PRESET_TOKENS_LOWER = new Set(
  JOB_EXCLUDE_PRESETS.flatMap((p) => p.tokens.map((t) => t.toLowerCase())),
);

export function customExcludeTokens(value: string | null | undefined): string[] {
  return splitExcludeTokens(jobExcludeText(value)).filter(
    (t) => !ALL_PRESET_TOKENS_LOWER.has(t.toLowerCase()),
  );
}

export function selectedExcludeOptionIds(value: string | null | undefined): string[] {
  const normalized = jobExcludeText(value);
  const presetIds = JOB_EXCLUDE_PRESETS.filter((p) => isExcludePresetActive(normalized, p)).map((p) => p.id);
  const customIds = customExcludeTokens(normalized).map((t) => `custom:${t}`);
  return [...presetIds, ...customIds];
}

export function excludeTextFromSelectedOptionIds(selectedIds: readonly string[]): string {
  const set = new Set(selectedIds);
  const out: string[] = [];
  const seenLower = new Set<string>();
  for (const preset of JOB_EXCLUDE_PRESETS) {
    if (!set.has(preset.id)) continue;
    for (const token of preset.tokens) {
      const lower = token.toLowerCase();
      if (!seenLower.has(lower)) {
        seenLower.add(lower);
        out.push(token);
      }
    }
  }
  for (const id of selectedIds) {
    if (!id.startsWith("custom:")) continue;
    const token = id.slice("custom:".length).trim();
    if (!token) continue;
    const lower = token.toLowerCase();
    if (!seenLower.has(lower)) {
      seenLower.add(lower);
      out.push(token);
    }
  }
  return out.join(",");
}

export function addCustomExcludeToken(value: string | null | undefined, rawToken: string): string {
  const current = splitExcludeTokens(jobExcludeText(value));
  const seenLower = new Set(current.map((t) => t.toLowerCase()));
  for (const token of splitExcludeTokens(rawToken)) {
    const lower = token.toLowerCase();
    if (!seenLower.has(lower)) {
      seenLower.add(lower);
      current.push(token);
    }
  }
  return current.join(",");
}

export function formatExcludeDropdownSummary(value: string | null | undefined): string {
  const normalized = jobExcludeText(value);
  const activePresets = JOB_EXCLUDE_PRESETS.filter((p) => isExcludePresetActive(normalized, p));
  const customs = customExcludeTokens(normalized);
  if (activePresets.length === JOB_EXCLUDE_PRESETS.length && customs.length === 0) {
    return `All Junk Files (${JOB_EXCLUDE_PRESETS.map((p) => p.label).join(" · ")})`;
  }
  const labels = [...activePresets.map((p) => p.label), ...customs];
  if (labels.length === 0) return "None (Sync all files)";
  return labels.join(" · ");
}

export function redactProxyDisplay(rawUrl: string | null | undefined): string {
  const clean = String(rawUrl || "").trim();
  if (!clean || clean.toLowerCase() === "direct") return clean;
  const parts = clean.split(":");
  if (parts.length === 4 && /^\d+$/.test(parts[1]!)) {
    return `${parts[0]}:${parts[1]}:${parts[2]}:***`;
  }
  return clean.replace(/:([^:@/]+)@/, ":***@");
}

export function describeEffectiveJobProxy(
  jobProxyUrl: string | null | undefined,
  driveProxyUrl: string | null | undefined,
  globalProxyUrl: string | null | undefined,
): {
  effectiveProxyUrl: string;
  inheritOptionLabel: string;
  inheritOptionDetail: string;
  inheritOptionTip: string;
  sourceLabel: string;
} {
  const dClean = String(driveProxyUrl || "").trim();
  const gClean = String(globalProxyUrl || "").trim();
  let inheritedUrl = "";
  let inheritOptionLabel = "Follow Drive";
  let inheritOptionDetail = "Direct (No proxy)";
  let inheritOptionTip =
    "Follow the proxy setting of this Job's Google Drive account (currently Direct / no proxy).";
  let inheritedSource = "Direct (No proxy)";

  if (dClean && dClean.toLowerCase() !== "direct") {
    const redacted = redactProxyDisplay(dClean);
    inheritedUrl = dClean;
    inheritOptionLabel = "Follow Drive";
    inheritOptionDetail = redacted;
    inheritOptionTip = `Follow the proxy configured on this Job's Google Drive account (${redacted}).`;
    inheritedSource = `Drive (${redacted})`;
  } else if (dClean.toLowerCase() === "direct") {
    inheritedUrl = "";
    inheritOptionLabel = "Follow Drive";
    inheritOptionDetail = "Direct (No proxy)";
    inheritOptionTip = "Follow the Google Drive account setting (explicitly set to Direct / no proxy).";
    inheritedSource = "Drive (Direct)";
  } else if (gClean && gClean.toLowerCase() !== "direct") {
    const redacted = redactProxyDisplay(gClean);
    inheritedUrl = gClean;
    inheritOptionLabel = "Follow Global";
    inheritOptionDetail = redacted;
    inheritOptionTip = `Follow the global default proxy (${redacted}).`;
    inheritedSource = `Global (${redacted})`;
  }

  const jClean = String(jobProxyUrl || "").trim();
  if (!jClean) {
    return {
      effectiveProxyUrl: inheritedUrl,
      inheritOptionLabel,
      inheritOptionDetail,
      inheritOptionTip,
      sourceLabel: inheritedSource,
    };
  }
  if (jClean.toLowerCase() === "direct") {
    return {
      effectiveProxyUrl: "",
      inheritOptionLabel,
      inheritOptionDetail,
      inheritOptionTip,
      sourceLabel: "Direct (bypass proxy)",
    };
  }
  return {
    effectiveProxyUrl: jClean,
    inheritOptionLabel,
    inheritOptionDetail,
    inheritOptionTip,
    sourceLabel: `Job Custom (${redactProxyDisplay(jClean)})`,
  };
}

export function addExcludeToken(value: string | null | undefined, token: string): string {
  const cleanToken = String(token || "").trim();
  const baseText = jobExcludeText(value);
  if (!cleanToken) return baseText;
  const current = splitExcludeTokens(baseText);
  const exists = current.some((t) => t.toLowerCase() === cleanToken.toLowerCase());
  if (exists) return current.join(",");
  return [...current, cleanToken].join(",");
}

export function toggleExcludePresetTokens(value: string | null | undefined, preset: JobExcludePreset): string {
  const current = splitExcludeTokens(value);
  const presetLower = new Set(preset.tokens.map((t) => t.toLowerCase()));
  const allPresent = isExcludePresetActive(value, preset);
  if (allPresent) {
    return current.filter((t) => !presetLower.has(t.toLowerCase())).join(",");
  }
  const existingLower = new Set(current.map((t) => t.toLowerCase()));
  const added = [...current];
  for (const token of preset.tokens) {
    if (!existingLower.has(token.toLowerCase())) {
      added.push(token);
      existingLower.add(token.toLowerCase());
    }
  }
  return added.join(",");
}

/** Column header sticker. Each mode keeps its own glyph in the filter and the cell. */
export const JOB_MODE_EMOJI = "🔁";

export const JOB_MODE_OPTIONS: FilterOption[] = [
  { value: "bisync", label: "Two-way", emoji: "🔁", detail: "Bidirectional bisync (full mirror)." },
  { value: "mirror-local", label: "→ Remote", emoji: "⬆️", detail: "Push local → remote." },
  { value: "mirror-remote", label: "→ Local", emoji: "⬇️", detail: "Pull remote → local." },
];

export function jobModeLabel(mode: SyncJob["mode"] | string): string {
  return JOB_MODE_OPTIONS.find((option) => option.value === mode)?.label ?? mode;
}

export function jobModeEmoji(mode: SyncJob["mode"] | string): string {
  return JOB_MODE_OPTIONS.find((option) => option.value === mode)?.emoji ?? JOB_MODE_EMOJI;
}

export type JobStatusTone = "online" | "offline" | "idle" | "active";

type JobChromeInput = Pick<SyncJob, "status" | "lastResult" | "lastSuccessfulSyncAt" | "nextSyncAt" | "settleSec"> & {
  busy?: boolean;
};

/** Status pill shared by the jobs table, the job detail strip, and the Drive job list. */
export function jobStatusView(job: JobChromeInput): { label: string; tone: JobStatusTone } {
  return jobStatusViewRaw(job);
}

/** Pulse the Status dot only while a pass is running or still starting. */
export function jobStatusLive(job: Pick<SyncJob, "status"> & { busy?: boolean }): boolean {
  return jobStatusLiveRaw(job);
}

/** Run column. Stop holds 24/7 or cuts a live pass. Retry runs a failed pass again. */
export function jobRunAction(
  job: Pick<SyncJob, "status" | "settleSec" | "lastResult">,
  busy: boolean,
): {
  kind: "start" | "pause" | "retry" | "stop";
  label: "Start" | "Retry" | "Stop";
  pending: boolean;
} {
  return jobRunActionRaw(job, busy);
}

/** Debounce column. `live` is the armed countdown; otherwise it is the saved debounce. */
export function jobNextText(job: Pick<SyncJob, "nextSyncAt" | "settleSec">, now: number): { label: string; live: boolean } {
  return jobNextTextRaw(job, now);
}

export function formatJobLiveProgressBadge(progress?: SyncJobLiveProgress | null): string {
  return formatJobLiveProgressBadgeRaw(progress);
}

export function formatJobLiveProgressTooltip(progress?: SyncJobLiveProgress | null): string {
  return formatJobLiveProgressTooltipRaw(progress);
}
