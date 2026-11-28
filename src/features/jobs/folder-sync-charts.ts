import { topChartItems, type ChartRow, type HubUsersStatusTone } from "@tool-workspace/hub-ui";
import { jobModeEmoji, jobModeLabel, jobStatusView } from "../../lib/job-mode";
import { remoteNameFromSpec } from "../../lib/remote-name";
import type { DriveAccount, SyncJob } from "../../lib/sync-api";

function countToTopRows<T>(
  rows: readonly T[],
  pickLabel: (row: T) => string,
  opts: {
    emojiFor?: (label: string) => string;
    statusDotFor?: (label: string) => HubUsersStatusTone;
  } = {},
): ChartRow[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const label = pickLabel(r).trim();
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return topChartItems(
    Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({
        label,
        value,
        ...(opts.statusDotFor
          ? { statusDot: opts.statusDotFor(label) }
          : { emojiGlyph: opts.emojiFor ? opts.emojiFor(label) : "📦" }),
      })),
    3,
  );
}

const JOB_STATUS_DOT: Record<string, HubUsersStatusTone> = {
  Synced: "online",
  Idle: "online",
  Waiting: "active",
  Analyzing: "active",
  Syncing: "active",
  Failed: "off",
  Stopped: "idle",
};

const MODE_EMOJI_BY_LABEL: Record<string, string> = {
  "Two-way": jobModeEmoji("bisync"),
  "Mirror": jobModeEmoji("sync"),
  "Push": jobModeEmoji("copy_up"),
  "Pull": jobModeEmoji("copy_down"),
  "Move up": jobModeEmoji("move_up"),
  "Move down": jobModeEmoji("move_down"),
};

export function buildJobsChartData(
  filtered: readonly SyncJob[],
  allRows: readonly SyncJob[],
  driveAccounts: readonly DriveAccount[],
  busyId: string | null,
): Record<string, ChartRow[] | undefined> {
  const src = filtered.length > 0 ? filtered : allRows;
  const accountByName = new Map(driveAccounts.map((a) => [a.name, a]));

  return {
    status_bar: countToTopRows(src, (j) => jobStatusView({ ...j, busy: busyId === j.id }).label, {
      statusDotFor: (label) => JOB_STATUS_DOT[label] || "muted",
    }),
    drive_bar: countToTopRows(
      src,
      (j) => {
        const remote = remoteNameFromSpec(j.remote, "");
        const acc = accountByName.get(remote);
        return acc?.code ? `${acc.code} · ${acc.displayName || remote}` : remote || "Unassigned";
      },
      { emojiFor: () => "☁️" },
    ),
    mode_bar: countToTopRows(src, (j) => jobModeLabel(j.mode), {
      emojiFor: (label) => MODE_EMOJI_BY_LABEL[label] || "🔄",
    }),
    result_bar: countToTopRows(
      src,
      (j) => {
        if (!j.lastResult) return "Pending";
        return j.lastResult.ok === false ? "Error" : "Succeeded";
      },
      {
        emojiFor: (label) => (label === "Succeeded" ? "✅" : label === "Error" ? "⚠️" : "⏳"),
      },
    ),
  };
}

export function buildDrivesChartData(
  filtered: readonly (DriveAccount & { jobCount: number })[],
  allRows: readonly (DriveAccount & { jobCount: number })[],
): Record<string, ChartRow[] | undefined> {
  const src = filtered.length > 0 ? filtered : allRows;

  return {
    status_bar: countToTopRows(src, (a) => (a.authorized ? "Signed in" : "Sign in"), {
      statusDotFor: (label) => (label === "Signed in" ? "online" : "idle"),
    }),
    jobs_bar: countToTopRows(
      src,
      (a) => {
        if (a.jobCount >= 3) return "3+ jobs";
        if (a.jobCount >= 1) return "1–2 jobs";
        return "No jobs";
      },
      { emojiFor: (label) => (label === "No jobs" ? "📭" : "📁") },
    ),
    storage_bar: countToTopRows(
      src,
      (a) => {
        const limit = a.storage?.limitBytes;
        const used = a.storage?.usedBytes ?? 0;
        if (limit == null) return "Unlimited";
        if (limit <= 0) return "Unknown";
        const pct = (used / limit) * 100;
        if (pct >= 80) return "80%+ Used";
        if (pct >= 40) return "40–79% Used";
        return "<40% Used";
      },
      { emojiFor: () => "💾" },
    ),
    activity_bar: countToTopRows(
      src,
      (a) => (a.contentUpdatedAt ? "Synced Inventory" : a.authorized ? "OAuth Ready" : "Needs OAuth"),
      { emojiFor: (label) => (label === "Synced Inventory" ? "⚡" : label === "OAuth Ready" ? "✅" : "🔑") },
    ),
  };
}
