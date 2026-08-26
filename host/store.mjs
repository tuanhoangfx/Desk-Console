import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

export function dataRoot() {
  const override = process.env.DESK_CONSOLE_DATA;
  if (override) return path.resolve(override);
  return path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "desk-console");
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
  { name: "Clips UI", text: "http://127.0.0.1:5180/?screen=clips" },
];

const HISTORY_CAP = 500;
const SAMPLE_CAP = 200;

function normalizeClip(row, kind) {
  const text = String(row?.text || "");
  const createdAt = row?.createdAt || nowIso();
  return {
    id: String(row?.id || newId()),
    name: String(row?.name || "").trim(),
    text,
    kind,
    pinned: Boolean(row?.pinned),
    source: String(row?.source || (kind === "sample" ? "sample" : "clipboard")),
    createdAt,
    updatedAt: row?.updatedAt || createdAt,
  };
}

export function capturesMetaPath() {
  return path.join(dataRoot(), "captures.json");
}

export function capturesDir() {
  const dir = path.join(dataRoot(), "captures");
  ensureDir(dir);
  return dir;
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
export function listClipRows() {
  return [...listSamples(), ...listHistory()];
}

export function listClips() {
  return listClipRows();
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

export function listCaptures() {
  const rows = readJson(capturesMetaPath(), []);
  return Array.isArray(rows) ? rows : [];
}

export function saveCaptures(rows) {
  writeJson(capturesMetaPath(), rows);
}

export function findClip(id) {
  return listClipRows().find((row) => row.id === id) || null;
}

export function addClip(partial) {
  const text = String(partial.text || "").slice(0, 100_000);
  if (!text.trim()) return null;
  const rows = listHistory();
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

export function addCapture(partial) {
  const rows = listCaptures();
  const row = {
    id: newId(),
    mode: String(partial.mode || "screen"),
    fileName: String(partial.fileName || ""),
    bytes: Number(partial.bytes || 0),
    createdAt: nowIso(),
  };
  rows.unshift(row);
  saveCaptures(rows.slice(0, 500));
  return row;
}

export function patchCapture(id, patch) {
  const rows = listCaptures();
  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  rows[idx] = { ...rows[idx], ...patch, id };
  saveCaptures(rows);
  return rows[idx];
}

export function removeCapture(id) {
  const rows = listCaptures();
  const row = rows.find((r) => r.id === id);
  if (!row) return false;
  saveCaptures(rows.filter((r) => r.id !== id));
  if (row.fileName) {
    try {
      fs.unlinkSync(path.join(capturesDir(), row.fileName));
    } catch {
      /* already gone */
    }
  }
  return true;
}
