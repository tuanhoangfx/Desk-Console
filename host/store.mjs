import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { resolveDeskDataRoot } = require("./lib/data-root.cjs");

export function dataRoot() {
  return resolveDeskDataRoot();
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
}

export function newId() {
  return crypto.randomUUID();
}

export function nowIso() {
  return new Date().toISOString();
}

export function clipsPath() {
  return path.join(dataRoot(), "clips.json");
}

export function samplesPath() {
  return path.join(dataRoot(), "samples.json");
}

export const SEED_SAMPLES = [
  { name: "Follow up", text: "Following up on this — happy to jump on a call if useful." },
  { name: "Received", text: "Got it, thanks. I'll review and reply shortly." },
  { name: "Workspace", text: "E:\\Dev" },
  { name: "Clips UI", text: "http://127.0.0.1:5180/clips" },
];

const HISTORY_CAP = 500;
const SAMPLE_CAP = 200;

const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export function inferClipProject(text) {
  const raw = String(text || "");
  const code = raw.match(/\bP\d{4}\b/);
  if (code) return code[0];
  const folder = raw.match(/Tool[\\/]P\d{4}[^\\/]*/i);
  if (folder) {
    const fromFolder = folder[0].match(/P\d{4}/i);
    if (fromFolder) return fromFolder[0].toUpperCase();
  }
  return "";
}

function normalizeClip(row, kind) {
  const text = String(row?.text || "");
  const createdAt = row?.createdAt || nowIso();
  const deletedAt = row?.deletedAt ? String(row.deletedAt) : null;
  const project = String(row?.project || inferClipProject(text) || "").trim();
  return {
    id: String(row?.id || newId()),
    name: String(row?.name || "").trim(),
    text,
    kind,
    pinned: Boolean(row?.pinned),
    source: String(row?.source || (kind === "sample" ? "sample" : "clipboard")),
    project,
    createdAt,
    updatedAt: row?.updatedAt || createdAt,
    deletedAt,
  };
}

function isTrashRow(row, now = Date.now()) {
  if (!row?.deletedAt) return false;
  const deletedMs = Date.parse(row.deletedAt);
  if (Number.isNaN(deletedMs)) return false;
  return now - deletedMs <= TRASH_RETENTION_MS;
}

function purgeExpiredTrash(rows) {
  const now = Date.now();
  return rows.filter((row) => !row.deletedAt || isTrashRow(row, now));
}

export function listHistory() {
  const rows = readJson(clipsPath(), []);
  return (Array.isArray(rows) ? rows : []).map((row) => normalizeClip(row, "history"));
}

export function listSamples() {
  const rows = readJson(samplesPath(), []);
  return (Array.isArray(rows) ? rows : []).map((row) => normalizeClip(row, "sample"));
}

export function ensureSampleSeed() {
  if (fs.existsSync(samplesPath())) return listSamples();
  const seeded = SEED_SAMPLES.map((row) =>
    normalizeClip({ ...row, source: "sample", pinned: true }, "sample"),
  );
  saveSamples(seeded);
  return seeded;
}

/** Combined directory — samples first, then history. */
export function listClipRows(options = {}) {
  const lifecycle = options.lifecycle === "trash" ? "trash" : "live";
  const rows = [...listSamples(), ...listHistory()];
  const purgedHistory = purgeExpiredTrash(listHistory());
  const purgedSamples = purgeExpiredTrash(listSamples());
  if (purgedHistory.length !== listHistory().length) saveHistory(purgedHistory);
  if (purgedSamples.length !== listSamples().length) saveSamples(purgedSamples);
  const active = [...purgedSamples, ...purgedHistory];
  if (lifecycle === "trash") {
    return active.filter((row) => isTrashRow(row));
  }
  return active.filter((row) => !row.deletedAt);
}

export function listClips(options = {}) {
  return listClipRows(options);
}

export function saveHistory(rows) {
  writeJson(clipsPath(), rows.map((row) => normalizeClip(row, "history")));
}

export function saveSamples(rows) {
  writeJson(samplesPath(), rows.map((row) => normalizeClip(row, "sample")));
}

export function saveClips(rows) {
  saveHistory(rows.filter((row) => (row.kind || "history") !== "sample"));
}

export function findClip(id) {
  return [...listSamples(), ...listHistory()].find((row) => row.id === id) || null;
}

export function addClip(partial) {
  const text = String(partial.text || "").slice(0, 100_000);
  if (!text.trim()) return null;
  const rows = listHistory().filter((row) => !row.deletedAt);
  if (rows[0]?.text === text) {
    rows[0] = { ...rows[0], updatedAt: nowIso(), source: String(partial.source || rows[0].source) };
    saveHistory(rows);
    return rows[0];
  }
  const row = normalizeClip(
    {
      id: newId(),
      text,
      pinned: Boolean(partial.pinned),
      source: String(partial.source || "manual"),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    "history",
  );
  rows.unshift(row);
  saveHistory(rows.slice(0, HISTORY_CAP));
  return row;
}

export function addSample(partial) {
  const text = String(partial.text || "").slice(0, 100_000);
  if (!text.trim()) return null;
  const rows = listSamples();
  const row = normalizeClip(
    {
      id: newId(),
      name: String(partial.name || text.slice(0, 40)),
      text,
      pinned: true,
      source: "sample",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    "sample",
  );
  rows.unshift(row);
  saveSamples(rows.slice(0, SAMPLE_CAP));
  return row;
}

export function promoteClipToSample(id) {
  const row = findClip(id);
  if (!row) return null;
  if (row.kind === "sample") return row;
  return addSample({ name: row.name || row.text.slice(0, 40), text: row.text });
}

export function patchClip(id, patch) {
  const history = listHistory();
  const hIdx = history.findIndex((r) => r.id === id);
  if (hIdx >= 0) {
    history[hIdx] = normalizeClip({ ...history[hIdx], ...patch, id, updatedAt: nowIso() }, "history");
    saveHistory(history);
    return history[hIdx];
  }
  const samples = listSamples();
  const sIdx = samples.findIndex((r) => r.id === id);
  if (sIdx < 0) return null;
  samples[sIdx] = normalizeClip({ ...samples[sIdx], ...patch, id, updatedAt: nowIso() }, "sample");
  saveSamples(samples);
  return samples[sIdx];
}

export function softDeleteClip(id) {
  const row = findClip(id);
  if (!row || row.deletedAt) return null;
  return patchClip(id, { deletedAt: nowIso() });
}

export function restoreClip(id) {
  const row = findClip(id);
  if (!row || !row.deletedAt) return null;
  return patchClip(id, { deletedAt: null });
}

/** Hard delete — Trash forever or legacy purge. */
export function removeClip(id) {
  const history = listHistory();
  const nextHistory = history.filter((r) => r.id !== id);
  if (nextHistory.length !== history.length) {
    saveHistory(nextHistory);
    return true;
  }
  const samples = listSamples();
  const nextSamples = samples.filter((r) => r.id !== id);
  if (nextSamples.length === samples.length) return false;
  saveSamples(nextSamples);
  return true;
}
