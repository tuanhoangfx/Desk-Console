import fs from "node:fs";
import path from "node:path";
import { dataRoot } from "./store.mjs";

export const DEFAULT_HOTKEYS = {
  picker: "CommandOrControl+Alt+V",
  capture: "CommandOrControl+Alt+S",
};

const BLOCKED = new Set([
  "super+v",
  "meta+v",
  "win+v",
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
  return /(^|\+)(super|meta|win)\+v$/.test(f);
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
    return { ok: false, error: "Reserved shortcut. Do not use Win+V, Ctrl+C, Ctrl+V, or Alt+Tab." };
  }
  const parts = value.split("+");
  const key = parts[parts.length - 1] || "";
  const mods = parts.slice(0, -1);
  const isFn = /^F([1-9]|1[0-9]|2[0-4])$/i.test(key);
  if (!isFn && mods.length === 0) return { ok: false, error: "Add Ctrl, Alt, or Shift" };
  return { ok: true, value };
}

export function readHotkeys() {
  let raw = {};
  try {
    raw = JSON.parse(fs.readFileSync(hotkeysPath(), "utf8"));
  } catch {
    raw = {};
  }
  const picker = validateAccelerator(raw.picker || DEFAULT_HOTKEYS.picker);
  const capture = validateAccelerator(raw.capture || DEFAULT_HOTKEYS.capture);
  return {
    picker: picker.ok ? picker.value : DEFAULT_HOTKEYS.picker,
    capture: capture.ok ? capture.value : DEFAULT_HOTKEYS.capture,
  };
}

export function writeHotkeys(patch) {
  const next = { ...readHotkeys() };
  if (patch?.picker != null) {
    const parsed = validateAccelerator(patch.picker);
    if (!parsed.ok) throw new Error(parsed.error);
    next.picker = parsed.value;
  }
  if (patch?.capture != null) {
    const parsed = validateAccelerator(patch.capture);
    if (!parsed.ok) throw new Error(parsed.error);
    next.capture = parsed.value;
  }
  if (fold(next.picker) === fold(next.capture)) throw new Error("Picker and capture must use different shortcuts");
  fs.mkdirSync(path.dirname(hotkeysPath()), { recursive: true });
  fs.writeFileSync(hotkeysPath(), JSON.stringify(next, null, 2), "utf8");
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
      capture: formatHotkeyLabel(keys.capture),
    },
    defaults: {
      ...DEFAULT_HOTKEYS,
      labels: {
        picker: formatHotkeyLabel(DEFAULT_HOTKEYS.picker),
        capture: formatHotkeyLabel(DEFAULT_HOTKEYS.capture),
      },
    },
  };
}
