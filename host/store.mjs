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

const jsonCache = new Map();

function readJson(file, fallback) {
  try {
    const stat = fs.statSync(file);
    const cached = jsonCache.get(file);
    if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
      return cached.value;
    }
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    jsonCache.set(file, { mtimeMs: stat.mtimeMs, size: stat.size, value: parsed });
    return parsed;
  } catch {
    jsonCache.delete(file);
    return fallback;
  }
}

function writeJson(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
  try {
    const stat = fs.statSync(file);
    jsonCache.set(file, { mtimeMs: stat.mtimeMs, size: stat.size, value });
  } catch {
    jsonCache.delete(file);
  }
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

export function clipsMediaDir() {
  return path.join(dataRoot(), "clips-media");
}

const mediaDataUrlCache = new Map();

function extractPngBase64(dataUrl) {
  const raw = String(dataUrl || "").trim();
  const match = raw.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!match) return null;
  return { mime: `image/${match[1].toLowerCase()}`, base64: match[2] };
}

function writeMediaFileForClip(id, imageDataUrl) {
  const parsed = extractPngBase64(imageDataUrl);
  if (!parsed || !id) return "";
  const safeId = String(id).replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safeId) return "";
  const fileName = `${safeId}.png`;
  const dir = clipsMediaDir();
  ensureDir(dir);
  const fullPath = path.join(dir, fileName);
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, Buffer.from(parsed.base64, "base64"));
  }
  mediaDataUrlCache.set(fullPath, `data:${parsed.mime};base64,${parsed.base64}`);
  return fileName;
}

export function readClipMediaBuffer(rowOrId) {
  const id = typeof rowOrId === "string" ? rowOrId : rowOrId?.id;
  const mediaFile =
    typeof rowOrId === "object" && rowOrId?.imageMediaFile
      ? String(rowOrId.imageMediaFile)
      : `${String(id || "").replace(/[^a-zA-Z0-9_-]/g, "")}.png`;
  if (!mediaFile) return null;
  const fullPath = path.join(clipsMediaDir(), path.basename(mediaFile));
  try {
    if (fs.existsSync(fullPath)) return fs.readFileSync(fullPath);
  } catch {
    /* ignore */
  }
  return null;
}

export function hydrateClipImage(row) {
  if (!row) return row;
  if (row.imageDataUrl) return row;
  if (!row.imageMediaFile && row.contentType !== "image" && !row.hasImage) return row;
  const fileName = row.imageMediaFile || `${String(row.id || "").replace(/[^a-zA-Z0-9_-]/g, "")}.png`;
  const fullPath = path.join(clipsMediaDir(), path.basename(fileName));
  const cached = mediaDataUrlCache.get(fullPath);
  if (cached) {
    return { ...row, imageDataUrl: cached };
  }
  try {
    if (fs.existsSync(fullPath)) {
      const b64 = fs.readFileSync(fullPath).toString("base64");
      const dataUrl = `data:image/png;base64,${b64}`;
      mediaDataUrlCache.set(fullPath, dataUrl);
      return { ...row, imageDataUrl: dataUrl };
    }
  } catch {
    /* ignore */
  }
  return row;
}

function removeMediaFileIfUnused(id) {
  const safeId = String(id || "").replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safeId) return;
  const fullPath = path.join(clipsMediaDir(), `${safeId}.png`);
  mediaDataUrlCache.delete(fullPath);
  try {
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch {
    /* ignore */
  }
}

export const SEED_SAMPLES = [
  { name: "Follow up", text: "Following up on this — happy to jump on a call if useful." },
  { name: "Received", text: "Got it, thanks. I'll review and reply shortly." },
  { name: "Workspace", text: "E:\\Dev" },
  { name: "Clips UI", text: "http://127.0.0.1:5180/clips" },
];

const HISTORY_CAP = 500;
const IMAGE_HISTORY_CAP = 25;
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

function normalizeClip(row, kind, { hydrate = true } = {}) {
  const id = String(row?.id || newId());
  let imageDataUrl = String(row?.imageDataUrl || "").trim();
  let imageMediaFile = String(row?.imageMediaFile || "").trim();
  if (imageDataUrl.startsWith("data:image/")) {
    const written = writeMediaFileForClip(id, imageDataUrl);
    if (written) imageMediaFile = written;
  }
  const hasImage = Boolean(imageDataUrl.startsWith("data:image/") || imageMediaFile || row?.contentType === "image" || row?.hasImage);
  const imageWidth = Number(row?.imageWidth) || 0;
  const imageHeight = Number(row?.imageHeight) || 0;
  const defaultImgLabel = imageWidth && imageHeight ? `[Image ${imageWidth}×${imageHeight}]` : "[Image]";
  const text = String(row?.text || (hasImage ? defaultImgLabel : ""));
  const createdAt = row?.createdAt || nowIso();
  const deletedAt = row?.deletedAt ? String(row.deletedAt) : null;
  const project = String(row?.project || inferClipProject(text) || "").trim();
  const contentType = hasImage ? "image" : "text";
  const base = {
    id,
    name: String(row?.name || (hasImage ? `Image ${imageWidth && imageHeight ? `(${imageWidth}×${imageHeight})` : ""}`.trim() : "")).trim(),
    text,
    contentType,
    ...(hasImage
      ? {
          hasImage: true,
          ...(imageMediaFile ? { imageMediaFile } : {}),
          ...(imageWidth ? { imageWidth } : {}),
          ...(imageHeight ? { imageHeight } : {}),
        }
      : {}),
    kind,
    pinned: Boolean(row?.pinned),
    source: String(row?.source || (kind === "sample" ? "sample" : "clipboard")),
    project,
    createdAt,
    updatedAt: row?.updatedAt || createdAt,
    deletedAt,
  };
  if (!hydrate || !hasImage) return base;
  if (imageDataUrl.startsWith("data:image/")) {
    return { ...base, imageDataUrl };
  }
  return hydrateClipImage(base);
}

function serializeClipForDisk(row, kind) {
  const norm = normalizeClip(row, kind, { hydrate: false });
  const { imageDataUrl: _omit, ...diskRow } = norm;
  return diskRow;
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

export function listHistory(options = {}) {
  const hydrate = options.hydrate !== false;
  const file = clipsPath();
  const rows = readJson(file, []);
  const list = Array.isArray(rows) ? rows : [];
  const hadInlineBase64 = list.some((r) => typeof r?.imageDataUrl === "string" && r.imageDataUrl.startsWith("data:image/"));
  const normalized = list.map((row) => normalizeClip(row, "history", { hydrate }));
  if (hadInlineBase64) {
    saveHistory(normalized);
  }
  return normalized;
}

export function listSamples(options = {}) {
  const hydrate = options.hydrate !== false;
  const file = samplesPath();
  const rows = readJson(file, []);
  const list = Array.isArray(rows) ? rows : [];
  const hadInlineBase64 = list.some((r) => typeof r?.imageDataUrl === "string" && r.imageDataUrl.startsWith("data:image/"));
  const normalized = list.map((row) => normalizeClip(row, "sample", { hydrate }));
  if (hadInlineBase64) {
    saveSamples(normalized);
  }
  return normalized;
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
  const hydrate = options.summary ? false : options.hydrate !== false;
  const currentHistory = listHistory({ hydrate });
  const currentSamples = listSamples({ hydrate });
  const purgedHistory = purgeExpiredTrash(currentHistory);
  const purgedSamples = purgeExpiredTrash(currentSamples);
  if (purgedHistory.length !== currentHistory.length) saveHistory(purgedHistory);
  if (purgedSamples.length !== currentSamples.length) saveSamples(purgedSamples);
  const active = [...purgedSamples, ...purgedHistory];
  if (lifecycle === "trash") {
    return active.filter((row) => isTrashRow(row));
  }
  return active.filter((row) => !row.deletedAt);
}

export function listClips(options = {}) {
  return listClipRows(options);
}

function compactHistoryRows(rows) {
  let imageCount = 0;
  const kept = [];
  for (const raw of rows) {
    const row = serializeClipForDisk(raw, "history");
    const isLiveImage = !row.deletedAt && !row.pinned && (row.contentType === "image" || Boolean(row.hasImage));
    if (isLiveImage) {
      imageCount += 1;
      if (imageCount > IMAGE_HISTORY_CAP) {
        removeMediaFileIfUnused(row.id);
        continue;
      }
    }
    kept.push(row);
    if (kept.length >= HISTORY_CAP) break;
  }
  return kept;
}

export function saveHistory(rows) {
  writeJson(clipsPath(), compactHistoryRows(rows));
}

export function saveSamples(rows) {
  writeJson(samplesPath(), rows.map((row) => serializeClipForDisk(row, "sample")));
}

export function saveClips(rows) {
  saveHistory(rows.filter((row) => (row.kind || "history") !== "sample"));
}

export function findClip(id) {
  return [...listSamples(), ...listHistory()].find((row) => row.id === id) || null;
}

export function addClip(partial) {
  const imageDataUrl = String(partial?.imageDataUrl || "").trim();
  const hasImage = imageDataUrl.startsWith("data:image/");
  const imageWidth = Number(partial?.imageWidth) || 0;
  const imageHeight = Number(partial?.imageHeight) || 0;
  const defaultImgLabel = imageWidth && imageHeight ? `[Image ${imageWidth}×${imageHeight}]` : "[Image]";
  const text = String(partial?.text || (hasImage ? defaultImgLabel : "")).slice(0, 100_000);
  if (!text.trim() && !hasImage) return null;
  const rows = listHistory().filter((row) => !row.deletedAt);
  const top = rows[0];
  const topSameImageDimsSoon =
    hasImage &&
    top?.contentType === "image" &&
    imageWidth > 0 &&
    top.imageWidth === imageWidth &&
    top.imageHeight === imageHeight &&
    Math.abs(Date.now() - Date.parse(top.updatedAt || top.createdAt || "")) < 4000;
  if (hasImage && (top?.imageDataUrl === imageDataUrl || topSameImageDimsSoon)) {
    rows[0] = { ...rows[0], updatedAt: nowIso(), source: String(partial.source || rows[0].source) };
    saveHistory(rows);
    return rows[0];
  }
  if (!hasImage && rows[0] && !rows[0].imageDataUrl && rows[0].text === text) {
    rows[0] = { ...rows[0], updatedAt: nowIso(), source: String(partial.source || rows[0].source) };
    saveHistory(rows);
    return rows[0];
  }
  const row = normalizeClip(
    {
      id: newId(),
      name: partial?.name,
      text,
      contentType: hasImage ? "image" : "text",
      imageDataUrl: hasImage ? imageDataUrl : undefined,
      imageWidth: hasImage ? imageWidth : undefined,
      imageHeight: hasImage ? imageHeight : undefined,
      pinned: Boolean(partial?.pinned),
      source: String(partial?.source || "manual"),
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
  const imageDataUrl = String(partial?.imageDataUrl || "").trim();
  const hasImage = imageDataUrl.startsWith("data:image/");
  const imageWidth = Number(partial?.imageWidth) || 0;
  const imageHeight = Number(partial?.imageHeight) || 0;
  const defaultImgLabel = imageWidth && imageHeight ? `[Image ${imageWidth}×${imageHeight}]` : "[Image]";
  const text = String(partial?.text || (hasImage ? defaultImgLabel : "")).slice(0, 100_000);
  if (!text.trim() && !hasImage) return null;
  const rows = listSamples();
  const row = normalizeClip(
    {
      id: newId(),
      name: String(partial?.name || text.slice(0, 40)),
      text,
      contentType: hasImage ? "image" : "text",
      imageDataUrl: hasImage ? imageDataUrl : undefined,
      imageWidth: hasImage ? imageWidth : undefined,
      imageHeight: hasImage ? imageHeight : undefined,
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
  return addSample({
    name: row.name || row.text.slice(0, 40),
    text: row.text,
    imageDataUrl: row.imageDataUrl,
    imageWidth: row.imageWidth,
    imageHeight: row.imageHeight,
  });
}

export function patchClip(id, patch) {
  const onlyPin = Boolean(patch && Object.keys(patch).length === 1 && "pinned" in patch);
  const history = listHistory();
  const hIdx = history.findIndex((r) => r.id === id);
  if (hIdx >= 0) {
    const prevUpdatedAt = history[hIdx].updatedAt || history[hIdx].createdAt || nowIso();
    history[hIdx] = normalizeClip(
      { ...history[hIdx], ...patch, id, updatedAt: onlyPin ? prevUpdatedAt : nowIso() },
      "history",
    );
    saveHistory(history);
    return history[hIdx];
  }
  const samples = listSamples();
  const sIdx = samples.findIndex((r) => r.id === id);
  if (sIdx < 0) return null;
  const prevSampleUpdatedAt = samples[sIdx].updatedAt || samples[sIdx].createdAt || nowIso();
  samples[sIdx] = normalizeClip(
    { ...samples[sIdx], ...patch, id, updatedAt: onlyPin ? prevSampleUpdatedAt : nowIso() },
    "sample",
  );
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
  const history = listHistory({ hydrate: false });
  const nextHistory = history.filter((r) => r.id !== id);
  if (nextHistory.length !== history.length) {
    saveHistory(nextHistory);
    removeMediaFileIfUnused(id);
    return true;
  }
  const samples = listSamples({ hydrate: false });
  const nextSamples = samples.filter((r) => r.id !== id);
  if (nextSamples.length === samples.length) return false;
  saveSamples(nextSamples);
  removeMediaFileIfUnused(id);
  return true;
}
