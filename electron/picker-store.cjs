const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { resolveDeskDataRoot } = require("../host/lib/data-root.cjs");

function dataRoot() {
  return resolveDeskDataRoot();
}

const jsonCache = new Map();

function readJson(file, fallback) {
  try {
    const stat = fs.statSync(file);
    const cached = jsonCache.get(file);
    if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
      return cached.value;
    }
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    const value = Array.isArray(raw) ? raw : fallback;
    jsonCache.set(file, { mtimeMs: stat.mtimeMs, size: stat.size, value });
    return value;
  } catch {
    jsonCache.delete(file);
    return fallback;
  }
}

const mediaDataUrlCache = new Map();

function hydrateMediaDataUrl(id, imageMediaFile) {
  const fileName = imageMediaFile || `${String(id || "").replace(/[^a-zA-Z0-9_-]/g, "")}.png`;
  if (!fileName) return "";
  const fullPath = path.join(dataRoot(), "clips-media", path.basename(fileName));
  const cached = mediaDataUrlCache.get(fullPath);
  if (cached) return cached;
  try {
    if (fs.existsSync(fullPath)) {
      const dataUrl = `data:image/png;base64,${fs.readFileSync(fullPath).toString("base64")}`;
      mediaDataUrlCache.set(fullPath, dataUrl);
      return dataUrl;
    }
  } catch {
    /* ignore */
  }
  return "";
}

function normalize(row, kind) {
  const id = String(row?.id || "");
  const createdAt = String(row?.createdAt || "");
  let imageDataUrl = String(row?.imageDataUrl || "").trim();
  const imageMediaFile = String(row?.imageMediaFile || "").trim();
  if (!imageDataUrl && (imageMediaFile || row?.contentType === "image" || row?.hasImage)) {
    imageDataUrl = hydrateMediaDataUrl(id, imageMediaFile);
  }
  const hasImage = imageDataUrl.startsWith("data:image/");
  const imageWidth = Number(row?.imageWidth) || 0;
  const imageHeight = Number(row?.imageHeight) || 0;
  return {
    id,
    name: String(row?.name || "").trim(),
    text: String(row?.text || (hasImage ? `[Image ${imageWidth}×${imageHeight}]` : "")),
    contentType: hasImage || row?.contentType === "image" ? "image" : "text",
    ...(hasImage ? { hasImage: true, imageDataUrl, imageWidth, imageHeight } : {}),
    ...(imageMediaFile ? { imageMediaFile } : {}),
    kind,
    pinned: Boolean(row?.pinned),
    source: String(row?.source || (kind === "sample" ? "sample" : "clipboard")),
    createdAt,
    updatedAt: String(row?.updatedAt || createdAt),
  };
}

function formatHotkeyLabel(acc) {
  return String(acc || "")
    .replace(/CommandOrControl/gi, "Ctrl")
    .replace(/Command/gi, "Ctrl")
    .replace(/Control/gi, "Ctrl")
    .replace(/Super/gi, "Win")
    .replace(/Meta/gi, "Win");
}

function readHotkeys() {
  let raw = {};
  try {
    raw = JSON.parse(fs.readFileSync(path.join(dataRoot(), "hotkeys.json"), "utf8"));
  } catch {
    raw = {};
  }
  const pickerRaw = String(raw.picker || "CommandOrControl+Shift+Q");
  const retired = /(^|\+)alt(\+|$)/i.test(pickerRaw) || /shift\+v$/i.test(pickerRaw);
  const picker = retired ? "CommandOrControl+Shift+Q" : pickerRaw;
  return {
    picker,
    labels: { picker: formatHotkeyLabel(picker) },
  };
}

function snapshotSignature() {
  const root = dataRoot();
  return ["clips.json", "samples.json", "hotkeys.json"]
    .map((name) => {
      const file = path.join(root, name);
      try {
        return `${name}:${fs.statSync(file).mtimeMs}`;
      } catch {
        return `${name}:0`;
      }
    })
    .join("|");
}

function readPickerSnapshot() {
  const samples = readJson(path.join(dataRoot(), "samples.json"), [])
    .filter((row) => !row?.deletedAt)
    .map((row) => normalize(row, "sample"));
  const history = readJson(path.join(dataRoot(), "clips.json"), [])
    .filter((row) => !row?.deletedAt)
    .map((row) => normalize(row, "history"));
  const keys = readHotkeys();
  return {
    rows: [...samples, ...history].filter((row) => row.id && (row.text || row.imageDataUrl)),
    labels: keys.labels,
  };
}

module.exports = { readPickerSnapshot, snapshotSignature, dataRoot };
