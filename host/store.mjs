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

function computeImageDataUrlMeta(imageDataUrl) {
  const parsed = extractPngBase64(imageDataUrl);
  if (!parsed) return null;
  const sha256 = crypto.createHash("sha256").update(parsed.mime).update(":").update(parsed.base64).digest("hex");
  return {
    mime: parsed.mime,
    base64: parsed.base64,
    sha256,
    fileName: `sha256-${sha256}.png`,
  };
}

function writeMediaFileForClip(_id, imageDataUrl) {
  const meta = computeImageDataUrlMeta(imageDataUrl);
  if (!meta) return null;
  const dir = clipsMediaDir();
  ensureDir(dir);
  const fullPath = path.join(dir, meta.fileName);
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, Buffer.from(meta.base64, "base64"));
  }
  mediaDataUrlCache.set(fullPath, `data:${meta.mime};base64,${meta.base64}`);
  return { fileName: meta.fileName, sha256: meta.sha256 };
}

function migrateLegacyMediaFileToSha256(legacyFileName) {
  const baseName = path.basename(String(legacyFileName || ""));
  if (!baseName || baseName.startsWith("sha256-")) return null;
  const dir = clipsMediaDir();
  const legacyPath = path.join(dir, baseName);
  if (!fs.existsSync(legacyPath)) return null;
  try {
    const buf = fs.readFileSync(legacyPath);
    const b64 = buf.toString("base64");
    const sha256 = crypto.createHash("sha256").update("image/png:").update(b64).digest("hex");
    const fileName = `sha256-${sha256}.png`;
    const newPath = path.join(dir, fileName);
    if (!fs.existsSync(newPath)) {
      fs.writeFileSync(newPath, buf);
    }
    mediaDataUrlCache.set(newPath, `data:image/png;base64,${b64}`);
    return { fileName, sha256 };
  } catch {
    return null;
  }
}

export function readClipMediaBuffer(rowOrId) {
  let row = typeof rowOrId === "object" && rowOrId ? rowOrId : null;
  const id = typeof rowOrId === "string" ? rowOrId : row?.id;
  if (!row && id) {
    const rawClips = readJson(clipsPath(), []);
    const rawSamples = readJson(samplesPath(), []);
    row =
      (Array.isArray(rawSamples) && rawSamples.find((r) => r?.id === id)) ||
      (Array.isArray(rawClips) && rawClips.find((r) => r?.id === id)) ||
      null;
  }
  const candidates = [];
  if (row?.imageMediaFile) candidates.push(path.basename(String(row.imageMediaFile)));
  const safeId = String(id || "").replace(/[^a-zA-Z0-9_-]/g, "");
  if (safeId) candidates.push(`${safeId}.png`);
  for (const mediaFile of candidates) {
    if (!mediaFile) continue;
    const fullPath = path.join(clipsMediaDir(), mediaFile);
    try {
      if (fs.existsSync(fullPath)) return fs.readFileSync(fullPath);
    } catch {
      /* ignore */
    }
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

export function pruneUnreferencedClipMediaFiles() {
  const dir = clipsMediaDir();
  if (!fs.existsSync(dir)) return 0;
  const referenced = new Set();
  for (const file of [clipsPath(), samplesPath()]) {
    const list = readJson(file, []);
    if (!Array.isArray(list)) continue;
    for (const r of list) {
      if (!r) continue;
      if (r.imageMediaFile) referenced.add(path.basename(String(r.imageMediaFile)));
      const safeId = String(r.id || "").replace(/[^a-zA-Z0-9_-]/g, "");
      if (safeId && !r.imageMediaFile && (r.contentType === "image" || r.hasImage)) {
        referenced.add(`${safeId}.png`);
      }
    }
  }
  let removed = 0;
  let entries = [];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return 0;
  }
  for (const name of entries) {
    if (!name.endsWith(".png")) continue;
    if (referenced.has(name)) continue;
    const fullPath = path.join(dir, name);
    mediaDataUrlCache.delete(fullPath);
    try {
      fs.unlinkSync(fullPath);
      removed += 1;
    } catch {
      /* ignore */
    }
  }
  return removed;
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
  let imageSha256 = String(row?.imageSha256 || "").trim();
  if (imageDataUrl.startsWith("data:image/")) {
    const written = writeMediaFileForClip(id, imageDataUrl);
    if (written) {
      imageMediaFile = written.fileName;
      imageSha256 = written.sha256;
    }
  } else if (imageMediaFile && !imageMediaFile.startsWith("sha256-")) {
    const migrated = migrateLegacyMediaFileToSha256(imageMediaFile);
    if (migrated) {
      imageMediaFile = migrated.fileName;
      imageSha256 = migrated.sha256;
    }
  } else if (!imageMediaFile && (row?.contentType === "image" || row?.hasImage)) {
    const safeId = String(id).replace(/[^a-zA-Z0-9_-]/g, "");
    if (safeId) {
      const migrated = migrateLegacyMediaFileToSha256(`${safeId}.png`);
      if (migrated) {
        imageMediaFile = migrated.fileName;
        imageSha256 = migrated.sha256;
      }
    }
  }
  if (!imageSha256 && imageMediaFile.startsWith("sha256-") && imageMediaFile.endsWith(".png")) {
    imageSha256 = imageMediaFile.slice("sha256-".length, -".png".length);
  }
  const hasImage = Boolean(
    imageDataUrl.startsWith("data:image/") || imageMediaFile || row?.contentType === "image" || row?.hasImage,
  );
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
    name: String(
      row?.name || (hasImage ? `Image ${imageWidth && imageHeight ? `(${imageWidth}×${imageHeight})` : ""}`.trim() : ""),
    ).trim(),
    text,
    contentType,
    ...(hasImage
      ? {
          hasImage: true,
          ...(imageMediaFile ? { imageMediaFile } : {}),
          ...(imageSha256 ? { imageSha256 } : {}),
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
  const needsRewrite = list.some(
    (r) =>
      (typeof r?.imageDataUrl === "string" && r.imageDataUrl.startsWith("data:image/")) ||
      (typeof r?.imageMediaFile === "string" && r.imageMediaFile && !r.imageMediaFile.startsWith("sha256-")),
  );
  const normalized = list.map((row) => normalizeClip(row, "history", { hydrate }));
  if (needsRewrite) {
    saveHistory(normalized);
    pruneUnreferencedClipMediaFiles();
  }
  return normalized;
}

export function listSamples(options = {}) {
  const hydrate = options.hydrate !== false;
  const file = samplesPath();
  const rows = readJson(file, []);
  const list = Array.isArray(rows) ? rows : [];
  const needsRewrite = list.some(
    (r) =>
      (typeof r?.imageDataUrl === "string" && r.imageDataUrl.startsWith("data:image/")) ||
      (typeof r?.imageMediaFile === "string" && r.imageMediaFile && !r.imageMediaFile.startsWith("sha256-")),
  );
  const normalized = list.map((row) => normalizeClip(row, "sample", { hydrate }));
  if (needsRewrite) {
    saveSamples(normalized);
    pruneUnreferencedClipMediaFiles();
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
  let evictedImage = false;
  const kept = [];
  for (const raw of rows) {
    const row = serializeClipForDisk(raw, "history");
    const isLiveImage = !row.deletedAt && !row.pinned && (row.contentType === "image" || Boolean(row.hasImage));
    if (isLiveImage) {
      imageCount += 1;
      if (imageCount > IMAGE_HISTORY_CAP) {
        evictedImage = true;
        continue;
      }
    }
    kept.push(row);
    if (kept.length >= HISTORY_CAP) break;
  }
  return { kept, evictedImage };
}

export function saveHistory(rows) {
  const { kept, evictedImage } = compactHistoryRows(rows);
  writeJson(clipsPath(), kept);
  if (evictedImage) {
    pruneUnreferencedClipMediaFiles();
  }
}

export function saveSamples(rows) {
  writeJson(samplesPath(), rows.map((row) => serializeClipForDisk(row, "sample")));
}

export function saveClips(rows) {
  saveHistory(rows.filter((row) => (row.kind || "history") !== "sample"));
}

export function findClip(id, options = {}) {
  const hydrate = options.hydrate !== false;
  const hit =
    listSamples({ hydrate: false }).find((row) => row.id === id) ||
    listHistory({ hydrate: false }).find((row) => row.id === id) ||
    null;
  if (!hit) return null;
  return hydrate ? hydrateClipImage(hit) : hit;
}

export function addClip(partial) {
  const imageDataUrl = String(partial?.imageDataUrl || "").trim();
  const hasImage = imageDataUrl.startsWith("data:image/");
  const imageWidth = Number(partial?.imageWidth) || 0;
  const imageHeight = Number(partial?.imageHeight) || 0;
  const defaultImgLabel = imageWidth && imageHeight ? `[Image ${imageWidth}×${imageHeight}]` : "[Image]";
  const text = String(partial?.text || (hasImage ? defaultImgLabel : "")).slice(0, 100_000);
  if (!text.trim() && !hasImage) return null;

  // Fast path: never hydrate existing image base64 payloads when inserting a clip!
  const allRows = purgeExpiredTrash(listHistory({ hydrate: false }));
  const topIdx = allRows.findIndex((row) => !row.deletedAt);
  const top = topIdx >= 0 ? allRows[topIdx] : null;
  const incomingMeta = hasImage ? computeImageDataUrlMeta(imageDataUrl) : null;

  const topSameImageDimsSoon =
    hasImage &&
    top?.contentType === "image" &&
    imageWidth > 0 &&
    top.imageWidth === imageWidth &&
    top.imageHeight === imageHeight &&
    Math.abs(Date.now() - Date.parse(top.updatedAt || top.createdAt || "")) < 4000;

  const topSameImageHash =
    hasImage &&
    Boolean(incomingMeta?.sha256) &&
    top?.contentType === "image" &&
    (top.imageSha256 === incomingMeta.sha256 || top.imageMediaFile === incomingMeta.fileName);

  if (hasImage && (topSameImageHash || topSameImageDimsSoon)) {
    allRows[topIdx] = { ...top, updatedAt: nowIso(), source: String(partial.source || top.source) };
    saveHistory(allRows);
    return hydrateClipImage(allRows[topIdx]);
  }
  if (!hasImage && top && top.contentType !== "image" && !top.hasImage && top.text === text) {
    allRows[topIdx] = { ...top, updatedAt: nowIso(), source: String(partial.source || top.source) };
    saveHistory(allRows);
    return allRows[topIdx];
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
  allRows.unshift(row);
  saveHistory(allRows.slice(0, HISTORY_CAP));
  return row;
}

export function addSample(partial) {
  const imageDataUrl = String(partial?.imageDataUrl || "").trim();
  const imageMediaFile = String(partial?.imageMediaFile || "").trim();
  const imageSha256 = String(partial?.imageSha256 || "").trim();
  const hasImage = Boolean(imageDataUrl.startsWith("data:image/") || imageMediaFile);
  const imageWidth = Number(partial?.imageWidth) || 0;
  const imageHeight = Number(partial?.imageHeight) || 0;
  const defaultImgLabel = imageWidth && imageHeight ? `[Image ${imageWidth}×${imageHeight}]` : "[Image]";
  const text = String(partial?.text || (hasImage ? defaultImgLabel : "")).slice(0, 100_000);
  if (!text.trim() && !hasImage) return null;
  const rows = listSamples({ hydrate: false });
  const row = normalizeClip(
    {
      id: newId(),
      name: String(partial?.name || text.slice(0, 40)),
      text,
      contentType: hasImage ? "image" : "text",
      imageDataUrl: imageDataUrl.startsWith("data:image/") ? imageDataUrl : undefined,
      imageMediaFile: imageMediaFile || undefined,
      imageSha256: imageSha256 || undefined,
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
  const row = findClip(id, { hydrate: false });
  if (!row) return null;
  if (row.kind === "sample") return hydrateClipImage(row);
  // Share the exact same content-addressed sha256-<hash>.png file without re-writing bytes!
  return addSample({
    name: row.name || row.text.slice(0, 40),
    text: row.text,
    imageMediaFile: row.imageMediaFile,
    imageSha256: row.imageSha256,
    imageWidth: row.imageWidth,
    imageHeight: row.imageHeight,
  });
}

export function patchClip(id, patch) {
  const onlyPin = Boolean(patch && Object.keys(patch).length === 1 && "pinned" in patch);
  const history = listHistory({ hydrate: false });
  const hIdx = history.findIndex((r) => r.id === id);
  if (hIdx >= 0) {
    const prevUpdatedAt = history[hIdx].updatedAt || history[hIdx].createdAt || nowIso();
    history[hIdx] = normalizeClip(
      { ...history[hIdx], ...patch, id, updatedAt: onlyPin ? prevUpdatedAt : nowIso() },
      "history",
      { hydrate: false },
    );
    saveHistory(history);
    return hydrateClipImage(history[hIdx]);
  }
  const samples = listSamples({ hydrate: false });
  const sIdx = samples.findIndex((r) => r.id === id);
  if (sIdx < 0) return null;
  const prevSampleUpdatedAt = samples[sIdx].updatedAt || samples[sIdx].createdAt || nowIso();
  samples[sIdx] = normalizeClip(
    { ...samples[sIdx], ...patch, id, updatedAt: onlyPin ? prevSampleUpdatedAt : nowIso() },
    "sample",
    { hydrate: false },
  );
  saveSamples(samples);
  return hydrateClipImage(samples[sIdx]);
}

export function softDeleteClip(id) {
  const row = findClip(id, { hydrate: false });
  if (!row || row.deletedAt) return null;
  return patchClip(id, { deletedAt: nowIso() });
}

export function restoreClip(id) {
  const row = findClip(id, { hydrate: false });
  if (!row || !row.deletedAt) return null;
  return patchClip(id, { deletedAt: null });
}

/** Hard delete — Trash forever or legacy purge. */
export function removeClip(id) {
  const history = listHistory({ hydrate: false });
  const nextHistory = history.filter((r) => r.id !== id);
  if (nextHistory.length !== history.length) {
    saveHistory(nextHistory);
    pruneUnreferencedClipMediaFiles();
    return true;
  }
  const samples = listSamples({ hydrate: false });
  const nextSamples = samples.filter((r) => r.id !== id);
  if (nextSamples.length === samples.length) return false;
  saveSamples(nextSamples);
  pruneUnreferencedClipMediaFiles();
  return true;
}
