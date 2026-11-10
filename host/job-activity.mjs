import { redactProxyUrl } from "./network-qos.mjs";

const TRACKED = [
  ["code", "Job ID"],
  ["name", "Name"],
  ["localPath", "Local"],
  ["remote", "Remote"],
  ["mode", "Mode"],
  ["settleSec", "Debounce"],
  ["proxyUrl", "Proxy"],
  ["maxFileSize", "Max File Size"],
  ["exclude", "Exclude"],
  ["note", "Note"],
];

function clip(value) {
  const text = String(value || "");
  return text.length > 80 ? `${text.slice(0, 77)}…` : text;
}

const ACTOR_SOURCES = new Set(["hub", "store", "system"]);

/** Actor sent with a save. Falls back to Folder Sync when the client has no email. */
export function readActivityActor(input) {
  const raw = input?.activityActor;
  const label = String(raw?.label || "").trim().slice(0, 120);
  if (!label) return { label: "Folder Sync", source: "system" };
  const source = ACTOR_SOURCES.has(raw?.source) ? raw.source : "hub";
  const id = String(raw?.id || "").trim().slice(0, 80);
  return { label, source, ...(id ? { id } : {}) };
}

function trackedChanges(beforeRow, afterRow) {
  const changes = [];
  for (const [key, label] of TRACKED) {
    const rawBefore = String(beforeRow?.[key] || "");
    const rawAfter = String(afterRow?.[key] || "");
    const before = key === "proxyUrl" ? redactProxyUrl(rawBefore) : rawBefore;
    const after = key === "proxyUrl" ? redactProxyUrl(rawAfter) : rawAfter;
    if (before !== after) changes.push({ field: key, label, before, after });
  }
  return changes;
}

function activityEntry(changes, now, actor) {
  return {
    at: now,
    message: changes
      .map((change) => `${change.label}: ${clip(change.before) || "—"} → ${clip(change.after) || "—"}`)
      .join(" · "),
    changes: changes.map(({ field, before, after }) => ({ field, before, after })),
    actor: actor?.label ? actor : { label: "Folder Sync", source: "system" },
  };
}

/** One Created row for a job that has no log yet. Later edits append above it. */
export function ensureCreatedJobLogs(jobs) {
  let changed = false;
  const next = (jobs || []).map((job) => {
    if (Array.isArray(job?.activityLog) && job.activityLog.length > 0) return job;
    changed = true;
    return {
      ...job,
      activityLog: [
        {
          at: job?.createdAt || new Date().toISOString(),
          message: "Created",
          actor: { label: "Folder Sync", source: "system" },
        },
      ],
    };
  });
  return { jobs: next, changed };
}

/** Append one Layout 3 log row when a tracked job field changes. A new job logs the filled fields. */
export function withJobActivity(existing, next, now = new Date().toISOString(), actor) {
  const prior = Array.isArray(existing?.activityLog) ? existing.activityLog : [];
  const changes = trackedChanges(existing, next);
  if (!changes.length) return { ...next, activityLog: prior };
  return { ...next, activityLog: [activityEntry(changes, now, actor), ...prior].slice(0, 40) };
}
