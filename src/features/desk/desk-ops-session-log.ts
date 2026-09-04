import type { OpsConsoleEntry } from "../../lib/api";

const MAX = 120;
const entries: OpsConsoleEntry[] = [];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function appendDeskOpsLog(message: string, level = "info", channel = "ops") {
  entries.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    level,
    channel,
    message,
  });
  if (entries.length > MAX) entries.length = MAX;
  notify();
}

export function readDeskOpsLogs(): OpsConsoleEntry[] {
  return entries.slice();
}

export function clearDeskOpsLogs() {
  entries.length = 0;
  notify();
}

export function subscribeDeskOpsLogs(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
