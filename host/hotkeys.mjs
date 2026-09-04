import fs from "node:fs";
import path from "node:path";
import { dataRoot } from "./store.mjs";

export const DEFAULT_HOTKEYS = {
  picker: "CommandOrControl+Shift+Q",
};

/**
 * One-shot migrate: Win+Z, Ctrl+Alt+V (Alt jumps tabs), Ctrl+Shift+V (Cursor/Chrome tab/preview).
 */
const LEGACY_PICKERS = [
  "Super+Shift+Z",
  "Super+Z",
  "Meta+Z",
  "Win+Z",
  "CommandOrControl+Alt+V",
  "Control+Alt+V",
  "Ctrl+Alt+V",
  "Alt+Shift+V",
  "CommandOrControl+Shift+V",
  "Control+Shift+V",
  "Ctrl+Shift+V",
];

const BLOCKED = new Set([
  "super+v",
  "meta+v",
  "win+v",
  "super+z",
  "meta+z",
  "win+z",
  "commandorcontrol+v",
  "control+v",
  "commandorcontrol+c",
  "control+c",
  "commandorcontrol+x",
  "alt+tab",
  "alt+f4",
]);

export function hotkeysPath() {
  return path.join(dataRoot(), "hotkeys.json");
}

export function formatHotkeyLabel(acc) {
  return String(acc || "")
    .replace(/CommandOrControl/gi, "Ctrl")
    .replace(/Command/gi, "Ctrl")
    .replace(/Control/gi, "Ctrl")
    .replace(/Super/gi, "Win")
    .replace(/Meta/gi, "Win");
}

function fold(acc) {
  return String(acc || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

export function isBlockedAccelerator(acc) {
  const f = fold(acc);
  if (BLOCKED.has(f)) return true;
  return /(^|\+)(super|meta|win)\+v$/.test(f) || /(^|\+)(super|meta|win)\+z$/.test(f);
}

export function normalizeAccelerator(raw) {
  const parts = String(raw || "")
    .split("+")
    .map((p) => p.trim())
    .filter(Boolean);
  const mods = [];
  let key = "";
  for (const part of parts) {
    const u = part.toLowerCase();
    if (["commandorcontrol", "cmdorctrl", "command", "cmd", "control", "ctrl"].includes(u)) {
      if (!mods.includes("CommandOrControl")) mods.push("CommandOrControl");
    } else if (u === "alt" || u === "option") {
      if (!mods.includes("Alt")) mods.push("Alt");
    } else if (u === "shift") {
      if (!mods.includes("Shift")) mods.push("Shift");
    } else if (["super", "meta", "win", "windows"].includes(u)) {
      if (!mods.includes("Super")) mods.push("Super");
    } else {
      key = part.length === 1 ? part.toUpperCase() : part;
    }
  }
  return key ? [...mods, key].join("+") : "";
}

export function validateAccelerator(acc) {
  const raw = String(acc || "").trim();
  if (!raw) return { ok: false, error: "empty shortcut" };
  const value = normalizeAccelerator(raw);
  if (!value) return { ok: false, error: "invalid shortcut" };
  if (isBlockedAccelerator(value)) {
    return { ok: false, error: "Reserved shortcut. Do not use Win+V, Win+Z, Ctrl+C, Ctrl+V, or Alt+Tab." };
  }
  if (/(^|\+)alt(\+|$)/i.test(value)) {
    return {
      ok: false,
      error: "Do not use Alt — it jumps Cursor/Chrome tabs and menus. Use Ctrl+Shift+Q (or Record a chord without Alt).",
    };
  }
  if (/(^|\+)shift\+v$/i.test(value)) {
    return {
      ok: false,
      error: "Ctrl+Shift+V collides with Cursor/Chrome. Use Ctrl+Shift+Q (or Record another chord without V/Alt).",
    };
  }
  const parts = value.split("+");
  const key = parts[parts.length - 1] || "";
  const mods = parts.slice(0, -1);
  const isFn = /^F([1-9]|1[0-9]|2[0-4])$/i.test(key);
  if (/^(tab|pageup|pagedown)$/i.test(key)) {
    return { ok: false, error: "Do not use Tab, PageUp, or PageDown — they switch editor tabs." };
  }
  if (!isFn && mods.length === 0) return { ok: false, error: "Add Ctrl or Shift" };
  return { ok: true, value };
}

export function readHotkeys() {
  let raw = {};
  try {
    raw = JSON.parse(fs.readFileSync(hotkeysPath(), "utf8"));
  } catch {
    raw = {};
  }
  let pickerRaw = raw.picker || DEFAULT_HOTKEYS.picker;
  let migrated = false;
  if (LEGACY_PICKERS.some((legacy) => fold(pickerRaw) === fold(legacy))) {
    pickerRaw = DEFAULT_HOTKEYS.picker;
    migrated = true;
  }
  const picker = validateAccelerator(pickerRaw);
  const next = {
    picker: picker.ok ? picker.value : DEFAULT_HOTKEYS.picker,
  };
  // Drop retired capture key from on-disk hotkeys.json when present.
  if (migrated || raw.capture != null) {
    try {
      fs.mkdirSync(path.dirname(hotkeysPath()), { recursive: true });
      fs.writeFileSync(hotkeysPath(), JSON.stringify(next, null, 2), "utf8");
    } catch {
      /* keep in-memory */
    }
  }
  return next;
}

export function writeHotkeys(patch) {
  const next = { ...readHotkeys() };
  if (patch?.picker != null) {
    const parsed = validateAccelerator(patch.picker);
    if (!parsed.ok) throw new Error(parsed.error);
    next.picker = parsed.value;
  }
  fs.mkdirSync(path.dirname(hotkeysPath()), { recursive: true });
  fs.writeFileSync(hotkeysPath(), JSON.stringify({ picker: next.picker }, null, 2), "utf8");
  return next;
}

export function resetHotkeys() {
  return writeHotkeys({ ...DEFAULT_HOTKEYS });
}

export function hotkeysPayload(keys = readHotkeys()) {
  return {
    ok: true,
    ...keys,
    labels: {
      picker: formatHotkeyLabel(keys.picker),
    },
    defaults: {
      ...DEFAULT_HOTKEYS,
      labels: {
        picker: formatHotkeyLabel(DEFAULT_HOTKEYS.picker),
      },
    },
  };
}
