import {
  applyStandardDirectoryColumnHints,
  createDirectoryColumnMetaHelpers,
  HUB_DIRECTORY_LOG_COL_WIDTH,
  HUB_DIRECTORY_PLAN_DATE_COL_WIDTH,
  HUB_DIRECTORY_PLAN_DUE_COL_WIDTH,
} from "@tool-workspace/hub-ui";
import {
  DIRECTORY_GMAIL_EMOJI,
  DIRECTORY_STATUS_EMOJI,
  DRIVES_DIRECTORY_HINT_DESCRIPTIONS,
  DRIVES_DIRECTORY_HINT_LINES,
} from "./folder-sync-directory-column-hints";

/** Drives directory — Created · Update · ID · Account · Gmail · Jobs · Status · Storage · Files · Log. */
export const DRIVES_COLUMN_KEYS = ["created", "updated", "code", "account", "gmail", "jobs", "status", "storage", "files", "log"] as const;
export type DrivesColumnKey = (typeof DRIVES_COLUMN_KEYS)[number];

const { col, toHubDirectoryColumnMeta } = createDirectoryColumnMetaHelpers();

export { toHubDirectoryColumnMeta as toDrivesHubDirectoryColumnMeta };

export const DRIVES_COLUMN_META = applyStandardDirectoryColumnHints({
  code: col("ID", "hub-users-col--job-id", "code", "col.directory.code", "8.75rem", {
    columnKind: "code",
    headerEmoji: "🆔",
  }),
  account: col("Account", "hub-users-col--user", "user", "col.directory.username", "12rem", {
    headerEmoji: "👤",
  }),
  gmail: col("Gmail", "hub-users-col--email", "email", "col.directory.email", "16rem", {
    headerEmoji: DIRECTORY_GMAIL_EMOJI,
  }),
  jobs: col("Jobs", "hub-users-col--members", "members", "col.directory.members", "6.25rem", {
    columnKind: "compact",
    headerEmoji: "📁",
  }),
  status: col("Status", "hub-users-col--status", "status", "col.directory.status", "8rem", {
    columnKind: "compact",
    headerEmoji: DIRECTORY_STATUS_EMOJI,
  }),
  storage: col("Storage", "hub-users-col--storage", "load", "col.directory.number", "9.5rem", {
    columnKind: "compact",
    headerEmoji: "💾",
  }),
  files: col("Files", "hub-users-col--files", "load", "col.directory.number", "11.5rem", {
    headerEmoji: "📄",
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
  created: col("Created", "hub-users-col--created", "created", "col.directory.created", HUB_DIRECTORY_PLAN_DATE_COL_WIDTH, {
    columnKind: "date",
    headerEmoji: "📅",
  }),
}, DRIVES_DIRECTORY_HINT_DESCRIPTIONS, DRIVES_DIRECTORY_HINT_LINES);
