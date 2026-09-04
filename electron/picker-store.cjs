const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { resolveDeskDataRoot } = require("../host/lib/data-root.cjs");

function dataRoot() {
  return resolveDeskDataRoot();
}

function readJson(file, fallback) {
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(raw) ? raw : fallback;
  } catch {
    return fallback;
  }
}

function normalize(row, kind) {
  const createdAt = String(row?.createdAt || "");
  return {
    id: String(row?.id || ""),
    name: String(row?.name || "").trim(),
    text: String(row?.text || ""),
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
  const samples = readJson(path.join(dataRoot(), "samples.json"), []).map((row) => normalize(row, "sample"));
  const history = readJson(path.join(dataRoot(), "clips.json"), []).map((row) => normalize(row, "history"));
  const keys = readHotkeys();
  return {
    rows: [...samples, ...history].filter((row) => row.id && row.text),
    labels: keys.labels,
  };
}

module.exports = { readPickerSnapshot, snapshotSignature, dataRoot };
