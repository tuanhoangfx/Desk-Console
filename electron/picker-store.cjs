const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function dataRoot() {
  if (process.env.DESK_CONSOLE_DATA) return path.resolve(process.env.DESK_CONSOLE_DATA);
  return path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "desk-console");
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
  const picker = String(raw.picker || "CommandOrControl+Alt+V");
  const capture = String(raw.capture || "CommandOrControl+Alt+S");
  return {
    picker,
    capture,
    labels: { picker: formatHotkeyLabel(picker), capture: formatHotkeyLabel(capture) },
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
