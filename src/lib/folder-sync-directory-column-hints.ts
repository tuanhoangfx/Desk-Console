import { createElement } from "react";
import {
  colHint,
  HUB_DEBOUNCE_DESCRIPTION,
  HUB_DEBOUNCE_EMOJI,
  HUB_DEBOUNCE_LABEL,
  HUB_ACTIVITY_AGE_HINT_LINES,
  hubDirectoryRunToggleHintLines,
  withFilterLabelHints,
  type FilterDef,
  type HubDirectoryColumnHintContent,
  type HubDirectoryColumnHintLine,
} from "@tool-workspace/hub-ui";
import type { DrivesColumnKey } from "./drives-directory-meta";
import { JOB_MODE_EMOJI, JOB_MODE_OPTIONS } from "./job-mode";
import type { JobsColumnKey } from "./jobs-directory-meta";

/** One Status sticker for the directory header, the filter chip, and detail fields. */
export const DIRECTORY_STATUS_EMOJI = "🚦";
/** One Gmail sticker for the Drives column, the log cell, and Drive detail. */
export const DIRECTORY_GMAIL_EMOJI = "✉️";

/** Directory header emoji — filter chips use the same sticker, not the Lucide role icon. */
const JOBS_FILTER_EMOJI: Record<string, string> = {
  drive: "☁️",
  mode: JOB_MODE_EMOJI,
  status: DIRECTORY_STATUS_EMOJI,
  debounce: HUB_DEBOUNCE_EMOJI,
  proxy: "🌐",
};

const DRIVES_FILTER_EMOJI: Record<string, string> = {
  status: DIRECTORY_STATUS_EMOJI,
};

/** File compare status — filter, tree column, and the outline hint share these words. */
export const FOLDER_COMPARE_STATUS = [
  { value: "in-sync", label: "Synced", detail: "Same size on both sides", tone: "online" },
  { value: "local", label: "Local", detail: "Only on this PC", tone: "idle" },
  { value: "cloud", label: "Drive", detail: "Only on Drive", tone: "active" },
  { value: "different", label: "Diff", detail: "Both sides exist and the size differs", tone: "offline" },
  { value: "both", label: "Both", detail: "Folder exists on both sides", tone: "idle" },
] as const;

export function folderCompareStatusView(status: string | undefined) {
  return FOLDER_COMPARE_STATUS.find((row) => row.value === status);
}

/** Job folder tree filter. Labels match the Status column in that tree. */
export function folderCompareStatusFilter(): FilterDef {
  return {
    key: "status",
    label: "Status",
    triggerEmoji: DIRECTORY_STATUS_EMOJI,
    suppressDefaultTriggerIcon: true,
    labelHint: colHint(
      "Status",
      "Whether the file matches on this PC and Drive.",
      FOLDER_COMPARE_STATUS.map((row) => ({ statusDot: row.tone, label: row.label, detail: row.detail })),
    ),
    options: FOLDER_COMPARE_STATUS.map((row) => ({
      value: row.value,
      label: row.label,
      tip: row.detail,
      glyph: createElement("span", {
        className: `hub-users-status-dot hub-users-status-dot--${row.tone}`,
        "aria-hidden": true,
      }),
    })),
  };
}

/** Item kind filter (Folders vs Files) for Drive Files and Job Folders trees. */
export function folderOutlineKindFilter(): FilterDef {
  return {
    key: "kind",
    label: "Kind",
    triggerEmoji: "📁",
    suppressDefaultTriggerIcon: true,
    labelHint: colHint("Kind", "Filter tree items by Folders or Files.", [
      { emoji: "📁", label: "Folders", detail: "Show directories" },
      { emoji: "📄", label: "Files", detail: "Show files" },
    ]),
    options: [
      { value: "folder", label: "Folders", emoji: "📁", tip: "Show folders" },
      { value: "file", label: "Files", emoji: "📄", tip: "Show files" },
    ],
  };
}

/** File extension / format filter synchronized with Drive inventory formats and loaded tree cache. */
export function folderOutlineFormatFilter(formats: readonly string[]): FilterDef {
  return {
    key: "format",
    label: "Format",
    triggerEmoji: "🧩",
    suppressDefaultTriggerIcon: true,
    labelHint: colHint("Format", "Filter files by extension (.xlsx, .png, .pdf, .mp4…)."),
    options: formats.map((ext) => ({
      value: ext,
      label: `.${ext}`,
      emoji: "📄",
      tip: `.${ext.toUpperCase()} files`,
    })),
  };
}

/** Same Run legend as P0003 Profiles — filled square is Stop. */
export const JOBS_RUN_HINT_LINES: HubDirectoryColumnHintLine[] = hubDirectoryRunToggleHintLines({
  start: "Job is idle, stopped, or manual — run one sync, or resume 24/7",
  stop: "24/7 watch is on, or a pass is running — hold watch, or abort rclone",
  retry: "Last pass failed — run that sync again",
  pending: "Start is in progress — action disabled until the host reports running",
});

export const JOBS_STATUS_HINT_LINES: HubDirectoryColumnHintLine[] = [
  { statusDot: "idle", label: "Idle", detail: "No pass yet, and 24/7 is off" },
  { statusDot: "active", label: "Waiting", detail: "A change is waiting out the debounce" },
  { statusDot: "active", label: "Analyzing", detail: "Host is reading the folders before rclone" },
  { statusDot: "active", label: "Syncing", detail: "rclone pass is running" },
  { statusDot: "online", label: "Synced", detail: "Last pass succeeded — the dot pulses while 24/7 is armed" },
  { statusDot: "offline", label: "Failed", detail: "Last pass ended with an error" },
  { statusDot: "idle", label: "Stopped", detail: "24/7 watch is off — Start resumes it" },
];

export const JOBS_MODE_HINT_LINES: HubDirectoryColumnHintLine[] = JOB_MODE_OPTIONS.map((option) => ({
  emoji: option.emoji,
  label: option.label,
  detail: option.detail,
}));

export const JOBS_NEXT_HINT_LINES: HubDirectoryColumnHintLine[] = [
  { statusDot: "active", label: "15s", detail: "Live countdown — sync starts if nothing else changes" },
  { emoji: HUB_DEBOUNCE_EMOJI, label: "20s · 1m · 5m", detail: "Saved debounce — wait after the last change, then sync once" },
  { emoji: "✋", label: "Manual", detail: "Only Start syncs this job" },
  { emoji: "⏹", label: "Stopped", detail: "24/7 watch is off" },
  { emoji: "☁️", label: "Drive check · 20s", detail: "Drive has no live watch — the host compares its listing every 20s, then the debounce starts" },
];

const JOBS_LABELS: Record<JobsColumnKey, string> = {
  code: "Job ID",
  name: "Name",
  local: "Local",
  remote: "Remote",
  status: "Status",
  run: "Run",
  next: HUB_DEBOUNCE_LABEL,
  mode: "Mode",
  log: "Log",
  updated: "Update",
  created: "Created",
  folder: "Folder",
};

export const JOBS_DIRECTORY_HINT_DESCRIPTIONS: Record<JobsColumnKey, string> = {
  code: "Stable job code such as JB0001 — click the cell to copy.",
  name: "Sync job display name — primary row identifier.",
  local: "Folder on this PC that rclone mirrors.",
  remote: "Signed-in Drive path, shown as email/folder.",
  status: "Read-only state. Not the Start or Stop button.",
  run: "Start runs one sync. Stop holds 24/7 watch, or aborts a pass that is still running.",
  next: HUB_DEBOUNCE_DESCRIPTION,
  mode: "How files move between this PC and Drive.",
  log: "Latest activity line for this job.",
  updated: "Last change to this job — relative under 24h.",
  created: "When this job row was first created.",
  folder: "Drive folder name only. The Jobs screen keeps the full remote path.",
};

export const JOBS_DIRECTORY_HINT_LINES: Partial<Record<JobsColumnKey, HubDirectoryColumnHintLine[]>> = {
  status: JOBS_STATUS_HINT_LINES,
  run: JOBS_RUN_HINT_LINES,
  next: JOBS_NEXT_HINT_LINES,
  mode: JOBS_MODE_HINT_LINES,
  updated: HUB_ACTIVITY_AGE_HINT_LINES,
  created: HUB_ACTIVITY_AGE_HINT_LINES,
};

export function jobsColumnHintContent(key: JobsColumnKey, title?: string): HubDirectoryColumnHintContent {
  return colHint(title ?? JOBS_LABELS[key], JOBS_DIRECTORY_HINT_DESCRIPTIONS[key], JOBS_DIRECTORY_HINT_LINES[key]);
}

const DRIVES_LABELS: Record<DrivesColumnKey, string> = {
  code: "ID",
  account: "Account",
  gmail: "Gmail",
  jobs: "Jobs",
  status: "Status",
  storage: "Storage",
  files: "Files",
  log: "Log",
  updated: "Update",
  created: "Created",
};

export const DRIVES_DIRECTORY_HINT_DESCRIPTIONS: Record<DrivesColumnKey, string> = {
  code: "Stable Drive account ID such as GG0001 — click the cell to copy.",
  account: "Google account display name.",
  gmail: "Google account email used for this remote.",
  jobs: "Sync jobs that point at this Drive.",
  status: "Signed in, or still waiting for Google consent.",
  storage: "Drive quota used versus the account limit.",
  files: "Files and folders listed on this Drive, excluding backup dirs.",
  log: "Latest sign-in or inventory line for this account.",
  updated: "Last change to this Drive account — relative under 24h.",
  created: "When this Drive account row was first created.",
};

export const DRIVES_STATUS_HINT_LINES: HubDirectoryColumnHintLine[] = [
  { statusDot: "online", label: "Signed in", detail: "Google token is stored — jobs can use this remote" },
  { statusDot: "idle", label: "Sign in", detail: "Consent is still required" },
];

export const DRIVES_DIRECTORY_HINT_LINES: Partial<Record<DrivesColumnKey, HubDirectoryColumnHintLine[]>> = {
  status: DRIVES_STATUS_HINT_LINES,
  updated: HUB_ACTIVITY_AGE_HINT_LINES,
  created: HUB_ACTIVITY_AGE_HINT_LINES,
};

export function drivesColumnHintContent(key: DrivesColumnKey, title?: string): HubDirectoryColumnHintContent {
  return colHint(title ?? DRIVES_LABELS[key], DRIVES_DIRECTORY_HINT_DESCRIPTIONS[key], DRIVES_DIRECTORY_HINT_LINES[key]);
}

function withDirectoryFilterEmoji(filters: readonly FilterDef[], emoji: Record<string, string>): FilterDef[] {
  return filters.map((filter) => {
    const triggerEmoji = emoji[filter.key];
    if (!triggerEmoji) return filter;
    return { ...filter, triggerEmoji, suppressDefaultTriggerIcon: true };
  });
}

export function applyJobsDirectoryFilterHints(filters: readonly FilterDef[]): FilterDef[] {
  return withDirectoryFilterEmoji(
    withFilterLabelHints(filters, (key, label) => {
      if (key === "drive") return jobsColumnHintContent("remote", label);
      if (key === "mode") return jobsColumnHintContent("mode", label);
      if (key === "status") return jobsColumnHintContent("status", label);
      if (key === "debounce") return jobsColumnHintContent("next", label);
      if (key === "proxy") {
        return colHint(label, "Filter jobs by proxy routing mode.", [
          { emoji: "🔗", label: "Inherit", detail: "Inherits Drive or Global System proxy" },
          { emoji: "⚡", label: "Direct", detail: "Bypasses proxy for this job" },
          { emoji: "🌐", label: "Custom Proxy", detail: "Uses a dedicated per-job proxy URL" },
        ]);
      }
      return colHint(label, `${label} filter on the Jobs directory.`);
    }),
    JOBS_FILTER_EMOJI,
  );
}

export function applyDrivesDirectoryFilterHints(filters: readonly FilterDef[]): FilterDef[] {
  return withDirectoryFilterEmoji(
    withFilterLabelHints(filters, (key, label) => {
      if (key === "status") return drivesColumnHintContent("status", label);
      return colHint(label, `${label} filter on the Drives directory.`);
    }),
    DRIVES_FILTER_EMOJI,
  );
}

export const FOLDER_OUTLINE_HINTS = {
  name: colHint("Name", "File or folder name in this tree."),
  size: colHint("Size", "File size. A mismatch shows local / Drive."),
  local: colHint("Local", "Last write time of the file on this PC. Folders show (folder)."),
  drive: colHint("Drive", "Last write time of the file on Drive. Folders show (folder)."),
  date: colHint("Date", "Last write time on Drive."),
  status: colHint(
    "Status",
    "Whether the file matches on this PC and Drive.",
    FOLDER_COMPARE_STATUS.map((row) => ({ statusDot: row.tone, label: row.label, detail: row.detail })),
  ),
};
