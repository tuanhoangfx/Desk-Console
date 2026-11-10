import { useMemo, useState } from "react";
import { HubRuntimeConsolePanel } from "@tool-workspace/hub-ui";
import type { SyncJob } from "../../lib/sync-api";

type JobConsoleChannel = "SYNC" | "DIFF" | "CONF" | "SYS";

type ParsedConsoleEntry = {
  id: string;
  at: string;
  channel: JobConsoleChannel;
  level: "info" | "success" | "warn" | "error";
  text: string;
  durationMs?: number;
};

type Props = {
  lines: string[];
  focusedJob?: SyncJob | null;
  emptyHint?: string;
};

const CHANNEL_FILTERS: readonly JobConsoleChannel[] = [
  "SYNC",
  "DIFF",
  "CONF",
  "SYS",
];

// eslint-disable-next-line no-control-regex
const ANSI_RE = /\u001b\[[0-9;]*[a-zA-Z]/g;
const RCLONE_LINE_RE = /^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}:\d{2}:\d{2})\s+(INFO|NOTICE|WARNING|ERROR)\s*:\s*(.*)$/;
const ELAPSED_RE = /Elapsed time:\s*([\d.]+)s/i;
const RCLONE_STATS_ONE_LINE_RE =
  /^(?:Transferred:\s*)?[\d.]+\s*[KMGTPE]?i?B\s*\/\s*[\d.]+\s*[KMGTPE]?i?B,\s*(?:\d+%|-),\s*[\d.]+\s*[KMGTPE]?i?B\/s,\s*ETA\s+\S+/i;

function compactPathToken(rawPath: string): string {
  const norm = rawPath.trim().replace(/\\/g, "/");
  const parts = norm.split("/").filter(Boolean);
  if (parts.length <= 2) return norm;
  return `${parts[0]}/…/${parts.slice(-2).join("/")}`;
}

function formatBackupOrConflictLine(cleaned: string): string {
  if (cleaned.startsWith("backup:")) {
    const rest = cleaned.slice("backup:".length).trim();
    const sides = rest.split("|").map((s) => compactPathToken(s));
    return `backup: ${sides.join(" ↔ ")}`;
  }
  if (cleaned.startsWith("conflicts:")) {
    const rest = cleaned.slice("conflicts:".length).trim();
    return `conflicts: ${compactPathToken(rest)}`;
  }
  return cleaned;
}

function parseJobConsoleEntries(lines: string[], fallbackIso: string): ParsedConsoleEntry[] {
  const entries: ParsedConsoleEntry[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const rawBlock = lines[i] || "";
    const subLines = rawBlock.split(/\r?\n/);
    for (let j = 0; j < subLines.length; j += 1) {
      const cleaned = subLines[j]!.replace(ANSI_RE, "").trim();
      if (!cleaned || cleaned === "--- stdout ---" || cleaned === "--- stderr ---" || cleaned === "(empty)") {
        continue;
      }
      if (cleaned === "{" || cleaned === "}") continue;

      let at = fallbackIso;
      let text = cleaned;
      let level: ParsedConsoleEntry["level"] = "info";
      let channel: JobConsoleChannel = "SYNC";
      let durationMs: number | undefined;

      const m = RCLONE_LINE_RE.exec(cleaned);
      if (m) {
        at = `${m[1]}-${m[2]}-${m[3]}T${m[4]}`;
        const sev = m[5];
        text = m[6]!.trim();
        if (!text || text === "{" || text === "}") continue;
        if (sev === "ERROR") level = "error";
        else if (sev === "WARNING" || sev === "NOTICE") level = "warn";
      } else if (cleaned.startsWith("# ")) {
        channel = "SYS";
        text = cleaned.slice(2).trim();
      } else if (cleaned.startsWith("backup:") || cleaned.startsWith("conflicts:") || cleaned.startsWith("trash:")) {
        channel = "CONF";
        text = formatBackupOrConflictLine(cleaned);
      } else if (cleaned.startsWith('"') && cleaned.includes(":")) {
        channel = "CONF";
        text = cleaned.replace(/,$/, "");
      }

      if (/Bisync successful/i.test(text)) {
        level = "success";
        channel = "SYNC";
      } else if (/error|failed|critical/i.test(text)) {
        level = "error";
      } else if (/checking for diffs|No changes found|Validating listings|Building Path/i.test(text)) {
        channel = "DIFF";
      } else if (/Comparison Settings|Setting --ignore-listing-checksum/i.test(text)) {
        channel = "CONF";
      }

      const elapsedMatch = ELAPSED_RE.exec(text);
      if (elapsedMatch) {
        const sec = Number.parseFloat(elapsedMatch[1]!);
        if (Number.isFinite(sec)) durationMs = Math.round(sec * 1000);
      }

      const isStatsTick = RCLONE_STATS_ONE_LINE_RE.test(text);
      if (isStatsTick && entries.length > 0 && RCLONE_STATS_ONE_LINE_RE.test(entries[entries.length - 1]!.text)) {
        entries[entries.length - 1] = {
          id: `${i}-${j}-stats-live`,
          at,
          channel: "SYNC",
          level,
          text,
          durationMs,
        };
        continue;
      }

      entries.push({
        id: `${i}-${j}-${text.slice(0, 24)}`,
        at,
        channel,
        level,
        text,
        durationMs,
      });
    }
  }
  return entries;
}

/** Console rail — P0019 CommentRail / P0003 Runtime Console SSOT parity. */
export function JobsConsoleRail({
  lines,
  focusedJob = null,
  emptyHint = "Ready. Select a job or click Start to stream rclone bisync output.",
}: Props) {
  const [clearedForJobKey, setClearedForJobKey] = useState<string>("");

  const jobRunKey = `${focusedJob?.id || ""}:${focusedJob?.lastRunAt || ""}:${lines.length}`;
  const isCleared = clearedForJobKey === jobRunKey;

  const parsedEntries = useMemo(() => {
    if (isCleared) return [];
    const fallbackIso = focusedJob?.lastRunAt || focusedJob?.updatedAt || new Date().toISOString();
    return parseJobConsoleEntries(lines, fallbackIso);
  }, [focusedJob?.lastRunAt, focusedJob?.updatedAt, isCleared, lines]);

  return (
    <HubRuntimeConsolePanel
      logs={parsedEntries}
      channels={CHANNEL_FILTERS}
      getChannel={(entry) => entry.channel}
      getChannelBadgeVariant={(ch) =>
        ch === "SYNC"
          ? "job"
          : ch === "DIFF"
            ? "api"
            : ch === "CONF"
              ? "worker"
              : "system"
      }
      getLevel={(entry) => entry.level}
      getTime={(entry) => entry.at}
      getSource={() => focusedJob?.code || "bisync"}
      getMessage={(entry) => entry.text}
      getDurationMs={(entry) => entry.durationMs}
      focusedSource={focusedJob?.code || null}
      emptyHint={emptyHint}
      clearDisabled={parsedEntries.length === 0}
      onClear={() => setClearedForJobKey(jobRunKey)}
    />
  );
}
