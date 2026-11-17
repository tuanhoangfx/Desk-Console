import {
  applyStandardDirectoryColumnHints,
  createDirectoryColumnMetaHelpers,
  HUB_DEBOUNCE_EMOJI,
  HUB_DEBOUNCE_LABEL,
  HUB_DIRECTORY_LOG_COL_WIDTH,
  HUB_DIRECTORY_PLAN_DATE_COL_WIDTH,
  HUB_DIRECTORY_PLAN_DUE_COL_WIDTH,
} from "@tool-workspace/hub-ui";
import {
  DIRECTORY_STATUS_EMOJI,
  JOBS_DIRECTORY_HINT_DESCRIPTIONS,
  JOBS_DIRECTORY_HINT_LINES,
} from "./folder-sync-directory-column-hints";
import { JOB_MODE_EMOJI } from "./job-mode";

/** Jobs directory — Created · Update · Job ID · Name · Local · Remote · Status · Run · Debounce · Mode · Log. */
export const JOBS_COLUMN_KEYS = [
  "created",
  "updated",
  "code",
  "name",
  "local",
  "remote",
  "status",
  "run",
  "next",
  "mode",
  "log",
  "folder",
] as const;
export type JobsColumnKey = (typeof JOBS_COLUMN_KEYS)[number];

/** Drive detail Jobs block — full SSOT directory columns with Drive Folder + Local Path + Mode + Log. */
export const DRIVE_JOB_COLUMN_KEYS: JobsColumnKey[] = ["created", "updated", "code", "name", "local", "folder", "status", "run", "next", "mode", "log"];

const { col, toHubDirectoryColumnMeta } = createDirectoryColumnMetaHelpers();

export { toHubDirectoryColumnMeta as toJobsHubDirectoryColumnMeta };

export const JOBS_COLUMN_META = applyStandardDirectoryColumnHints({
  code: col("Job ID", "hub-users-col--job-id", "code", "col.directory.code", "8.75rem", {
    columnKind: "code",
    headerEmoji: "🆔",
  }),
  name: col("Name", "hub-users-col--name", "name", "col.directory.name", "12rem", {
    headerEmoji: "📁",
  }),
  local: col("Local", "hub-users-col--path", "path", "col.directory.path", "14rem", {
    headerEmoji: "💻",
  }),
  remote: col("Remote", "hub-users-col--email", "sync", "col.directory.synced", "16rem", {
    headerEmoji: "☁️",
  }),
  status: col("Status", "hub-users-col--status", "status", "col.directory.status", "8.75rem", {
    columnKind: "compact",
    headerEmoji: DIRECTORY_STATUS_EMOJI,
  }),
  run: col("Action", "hub-users-col--run", "status", "col.directory.status", "7.25rem", {
    columnKind: "compact",
    headerEmoji: "▶️",
  }),
  next: col(HUB_DEBOUNCE_LABEL, "hub-users-col--next", "updated", "col.directory.updated", "9.5rem", {
    columnKind: "date",
    headerEmoji: HUB_DEBOUNCE_EMOJI,
  }),
  mode: col("Mode", "hub-users-col--mode", "mode", "col.directory.mode", "8.5rem", {
    columnKind: "compact",
    headerEmoji: JOB_MODE_EMOJI,
  }),
  log: col("Log", "hub-users-col--notes", "log", "log.panel", HUB_DIRECTORY_LOG_COL_WIDTH, {
    columnKind: "compact",
    headerAlign: "start",
    headerEmoji: "📋",
  }),
  updated: col("Update", "hub-users-col--updated", "updated", "col.directory.updated", HUB_DIRECTORY_PLAN_DUE_COL_WIDTH, {
    columnKind: "date",
    headerEmoji: "🔄",
  }),
  folder: col("Folder", "hub-users-col--folder", "path", "col.directory.path", "8rem", {
    headerEmoji: "📁",
  }),
  created: col("Created", "hub-users-col--created", "created", "col.directory.created", HUB_DIRECTORY_PLAN_DATE_COL_WIDTH, {
    columnKind: "date",
    headerEmoji: "📅",
  }),
}, JOBS_DIRECTORY_HINT_DESCRIPTIONS, JOBS_DIRECTORY_HINT_LINES);
