const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function prefsPath() {
  const root = process.env.DESK_CONSOLE_DATA
    ? path.resolve(process.env.DESK_CONSOLE_DATA)
    : path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "desk-console");
  return path.join(root, "prefs.json");
}

function readPrefs() {
  try {
    const raw = JSON.parse(fs.readFileSync(prefsPath(), "utf8"));
    return { openAtLogin: raw.openAtLogin !== false };
  } catch {
    return { openAtLogin: true };
  }
}

function writePrefs(patch) {
  const next = { ...readPrefs(), ...patch };
  fs.mkdirSync(path.dirname(prefsPath()), { recursive: true });
  fs.writeFileSync(prefsPath(), JSON.stringify(next, null, 2), "utf8");
  return next;
}

module.exports = { prefsPath, readPrefs, writePrefs };
