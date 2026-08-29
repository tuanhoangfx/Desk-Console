import fs from "node:fs";
import path from "node:path";
import { dataRoot } from "./store.mjs";

const MAX_ENTRIES = 80;

export function opsHistoryPath() {
  return path.join(dataRoot(), "ops-run-history.json");
}

export function readOpsHistory(limit = MAX_ENTRIES) {
  try {
    const raw = JSON.parse(fs.readFileSync(opsHistoryPath(), "utf8"));
    const entries = Array.isArray(raw.entries) ? raw.entries : [];
    return entries.slice(0, limit);
  } catch {
    return [];
  }
}

export function appendOpsHistory(entry) {
  const entries = readOpsHistory(MAX_ENTRIES);
  const next = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    at: new Date().toISOString(),
    ...entry,
  };
  entries.unshift(next);
  fs.mkdirSync(dataRoot(), { recursive: true });
  fs.writeFileSync(opsHistoryPath(), JSON.stringify({ entries: entries.slice(0, MAX_ENTRIES) }, null, 2), "utf8");
  return next;
}
