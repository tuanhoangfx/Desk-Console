import {
  applyStandardDirectoryColumnHints,
  createDirectoryColumnMetaHelpers,
  HUB_ACTIVITY_AGE_HINT_LINES,
  HUB_DIRECTORY_HEADER_EMOJI,
  withDirectoryColumnStickers,
  type HubDirectoryColumnHintLine,
} from "@tool-workspace/hub-ui";
import {
  DESK_DIRECTORY_FILTER_EMOJI,
  deskStatusDotTone,
  deskStatusKpiDetail,
} from "./desk-directory-stickers";
import type { DeskDirectoryScreen } from "./desk-table-prefs";

const { col } = createDirectoryColumnMetaHelpers();

function buildStatusHintLines(statuses: readonly string[]): HubDirectoryColumnHintLine[] {
  return statuses.map((label) => ({
    statusDot: deskStatusDotTone(label),
    label,
    detail: deskStatusKpiDetail(label),
  }));
}

const DEFAULT_DESK_STATUS_HINT_LINES = buildStatusHintLines([
  "Active",
  "Up",
  "Running",
  "Disabled",
  "Failed",
  "Down",
]);

const SCREEN_STATUS_HINT_LINES: Record<DeskDirectoryScreen, HubDirectoryColumnHintLine[]> = {
  cron: buildStatusHintLines(["Active", "Running", "Disabled", "Failed"]),
  runners: buildStatusHintLines(["Up", "Starting", "Running", "Stopping", "Down"]),
  clips: buildStatusHintLines(["History", "Sample"]),
};

const FORMAT_HINT_LINES: HubDirectoryColumnHintLine[] = [
  { emoji: "📝", label: "Text", detail: "Plain text or multi-line snippet." },
  { emoji: "🌐", label: "Link", detail: "HTTP / HTTPS URL captured from clipboard." },
  { emoji: "🖼️", label: "Image", detail: "Screenshot or bitmap image stored in Clips." },
  { emoji: "🧩", label: "JSON", detail: "Structured JSON payload." },
  { emoji: "🎨", label: "Color", detail: "HEX / RGB / HSL color token." },
  { emoji: "📁", label: "Path", detail: "Local file or directory path." },
];

const RUN_HINT_LINES: HubDirectoryColumnHintLine[] = [
  { emoji: "▶️", label: "Start / Run", detail: "Trigger immediate execution or start the service." },
  { emoji: "⏹️", label: "Stop / Disable", detail: "Stop the running service or disable scheduled trigger." },
];

const SCHEDULE_HINT_LINES: HubDirectoryColumnHintLine[] = [
  { emoji: "🔄", label: "Interval / Cycle", detail: "Automatic recurrence interval (e.g. Every 10 min, Every 6 hours)." },
  { emoji: "📅", label: "Daily / Weekly Window", detail: "Fixed time window (e.g. Daily 04:15, Daily 06:45, Weekly 04:00)." },
  { emoji: "⚡", label: "Threshold Trigger", detail: "Event-driven guard (e.g. Auto when RAM > 80%)." },
];

const baseMeta = withDirectoryColumnStickers(
  applyStandardDirectoryColumnHints({
    created: col("Created", "hub-desk-col--created", "created", "col.directory.created", "7.5rem", {
      columnKind: "date",
    }),
    updated: col("Update", "hub-desk-col--updated", "updated", "col.directory.updated", "7.5rem", {
      columnKind: "date",
    }),
    name: col("Name", "hub-desk-col--name", "name", "col.directory.name", "18rem"),
    format: col("Format", "hub-desk-col--format", "kind", "col.directory.status", "8.5rem"),
    run: col("Run", "hub-desk-col--run", "tools", "col.directory.status", "6.5rem"),
    schedule: col("Schedule", "hub-desk-col--schedule", "extra", "col.directory.updated", "10.5rem"),
    status: col("Status", "hub-desk-col--status", "status", "col.directory.status", "9rem"),
    extra: col("Detail", "hub-desk-col--detail", "email", "col.directory.email", "18rem"),
    log: col("Log", "hub-desk-col--log", "log", "log.panel", "14rem", {
      columnKind: "compact",
      headerAlign: "start",
    }),
  }),
  {
    created: "📅",
    updated: "🔄",
    /** 📛 = Name Badge — Windows/Electron Segoe draws it as red/yellow warning tofu. */
    name: HUB_DIRECTORY_HEADER_EMOJI.displayName,
    format: "🗂️",
    run: DESK_DIRECTORY_FILTER_EMOJI.runner,
    schedule: "🕒",
    status: DESK_DIRECTORY_FILTER_EMOJI.status,
    extra: "📝",
    log: "📋",
  },
);

export const DESK_COLUMN_META = {
  ...baseMeta,
  created: {
    ...baseMeta.created,
    headerHint: {
      title: "Created",
      description: "When this row was first created or registered.",
      lines: HUB_ACTIVITY_AGE_HINT_LINES,
    },
  },
  updated: {
    ...baseMeta.updated,
    headerHint: {
      title: "Update",
      description: "Most recent execution or change — relative under 24h.",
      lines: HUB_ACTIVITY_AGE_HINT_LINES,
    },
  },
  format: {
    ...baseMeta.format,
    headerHint: { title: "Format", lines: FORMAT_HINT_LINES },
  },
  run: {
    ...baseMeta.run,
    headerHint: { title: "Run", lines: RUN_HINT_LINES },
  },
  schedule: {
    ...baseMeta.schedule,
    headerHint: { title: "Schedule", lines: SCHEDULE_HINT_LINES },
  },
  status: {
    ...baseMeta.status,
    headerHint: { title: "Status", lines: DEFAULT_DESK_STATUS_HINT_LINES },
  },
  log: {
    ...baseMeta.log,
    headerHint: {
      title: "Log",
      description: "Latest execution summary, duration, freed disk, or activity note.",
      lines: [],
    },
  },
};

export function getDeskColumnMeta(screen?: DeskDirectoryScreen) {
  if (!screen) return DESK_COLUMN_META;
  return {
    ...DESK_COLUMN_META,
    status: {
      ...DESK_COLUMN_META.status,
      headerHint: {
        title: "Status",
        lines: SCREEN_STATUS_HINT_LINES[screen] || DEFAULT_DESK_STATUS_HINT_LINES,
      },
    },
  };
}
