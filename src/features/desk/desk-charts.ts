import { topChartItems, type ChartRow, type HubUsersStatusTone } from "@tool-workspace/hub-ui";
import type { AppScreen } from "../../lib/app-screen";
import type { DeskRow } from "./desk-directory-cells";
import { deskStatusDotTone } from "./desk-directory-stickers";

function countToTopRows(
  rows: readonly DeskRow[],
  pickLabel: (row: DeskRow) => string,
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

const CLIP_FORMAT_EMOJI: Record<string, string> = {
  Text: "📝",
  Link: "🌐",
  Image: "🖼️",
  JSON: "🧩",
  Color: "🎨",
  Path: "📁",
};

export function buildDeskDirectoryChartData(
  screen: AppScreen,
  filtered: readonly DeskRow[],
  allRows: readonly DeskRow[],
): Record<string, ChartRow[] | undefined> {
  const src = filtered.length > 0 ? filtered : allRows;

  if (screen === "clips") {
    return {
      format_bar: countToTopRows(src, (r) => r.clipFormat || "Text", {
        emojiFor: (l) => CLIP_FORMAT_EMOJI[l] || "📄",
      }),
      status_bar: countToTopRows(src, (r) => r.status || "History", {
        statusDotFor: (l) => deskStatusDotTone(l),
      }),
      source_bar: countToTopRows(src, (r) => r.clipSource || "Clipboard", {
        emojiFor: () => "📡",
      }),
      pin_bar: countToTopRows(src, (r) => (r.pinned ? "Pinned" : "Unpinned"), {
        emojiFor: (l) => (l === "Pinned" ? "📌" : "📋"),
      }),
    };
  }

  if (screen === "runners") {
    return {
      status_bar: countToTopRows(src, (r) => r.status || "Down", {
        statusDotFor: (l) => deskStatusDotTone(l),
      }),
      kind_bar: countToTopRows(
        src,
        (r) => (r.id.startsWith("worker:") ? "Host Worker" : "Vite UI App"),
        { emojiFor: (l) => (l === "Host Worker" ? "⚙️" : "🖥️") },
      ),
      stack_bar: countToTopRows(src, (r) => r.stack || r.extra || "Node / Vite", {
        emojiFor: () => "🗂️",
      }),
      project_bar: countToTopRows(src, (r) => r.project || "Workspace", {
        emojiFor: () => "📦",
      }),
    };
  }

  if (screen === "cron") {
    return {
      project_bar: countToTopRows(src, (r) => r.project || "Task Scheduler", {
        emojiFor: (l) => (l === "Host Daemon" ? "⚡" : "📅"),
      }),
      status_bar: countToTopRows(src, (r) => r.status || "Active", {
        statusDotFor: (l) => deskStatusDotTone(l),
      }),
      schedule_bar: countToTopRows(src, (r) => r.schedule || "Scheduled", {
        emojiFor: () => "🕒",
      }),
      result_bar: countToTopRows(
        src,
        (r) =>
          !r.opsLastResult || r.opsLastResult === "0"
            ? "Exit 0 (Healthy)"
            : `Exit ${r.opsLastResult}`,
        {
          statusDotFor: (l) => (l.startsWith("Exit 0") ? "online" : "age-recent"),
        },
      ),
    };
  }

  if (screen === "apps") {
    return {
      project_bar: countToTopRows(src, (r) => r.project || "Runtime", {
        emojiFor: (l) =>
          l.includes("Zalo")
            ? "💬"
            : l.includes("Cursor")
              ? "🖱️"
              : l.includes("Claude")
                ? "🤖"
                : "🚀",
      }),
      status_bar: countToTopRows(src, (r) => r.status || "Installed", {
        statusDotFor: (l) => deskStatusDotTone(l),
      }),
      guard_bar: countToTopRows(
        src,
        (r) => (r.outdated ? "Outdated" : r.pinned ? "Update Locked" : "Standard"),
        {
          emojiFor: (l) => (l === "Update Locked" ? "🔒" : l === "Outdated" ? "⚠️" : "✅"),
        },
      ),
      kind_bar: countToTopRows(
        src,
        (r) =>
          r.appKind === "sxs"
            ? "Side-by-Side"
            : r.appKind === "portable"
              ? "Portable Fleet"
              : "Primary Install",
        {
          emojiFor: (l) => (l === "Side-by-Side" ? "🔀" : l === "Portable Fleet" ? "💼" : "📦"),
        },
      ),
    };
  }

  return {};
}
