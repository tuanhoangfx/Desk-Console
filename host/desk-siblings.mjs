/**
 * Desk → sibling desktop tools (open only — no engine merge).
 * SSOT: Tool/docs/playbooks/_cards/p0001-desk-console.md · p0009-folder-sync.md
 *
 *   GET  /api/siblings
 *   POST /api/siblings/:code/open
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEV_ROOT } from "./windows.mjs";

const require = createRequire(import.meta.url);
const { spawnInteractiveDesktopProcess } = require(path.join(DEV_ROOT, "Tool", "scripts", "lib", "win-shell-env.cjs"));

const HOST_DIR = path.dirname(fileURLToPath(import.meta.url));

/** @typedef {{ code: string, name: string, exeCandidates: string[], winUnpackedGlob: string }} SiblingDef */

/** @type {SiblingDef[]} */
export const DESK_SIBLINGS = [
  {
    code: "P0009",
    name: "Folder Sync",
    exeCandidates: [
      path.join(process.env.LOCALAPPDATA || "", "Programs", "Folder Sync", "Folder Sync.exe"),
      path.join(process.env["ProgramFiles"] || "C:\\Program Files", "Folder Sync", "Folder Sync.exe"),
    ],
    winUnpackedGlob: path.join(DEV_ROOT, "Tool", "P0009-Folder-Sync", "dist-desktop", "win-unpacked"),
  },
  {
    code: "P0006",
    name: "Video Lab",
    exeCandidates: [
      path.join(process.env["ProgramFiles"] || "C:\\Program Files", "Video Lab", "Video Lab.exe"),
      path.join(process.env.LOCALAPPDATA || "", "Programs", "Video Lab", "Video Lab.exe"),
    ],
    winUnpackedGlob: path.join(DEV_ROOT, "Tool", "P0006-Video-Lab", "dist-desktop", "win-unpacked"),
  },
];

function findExeInDir(dir) {
  if (!dir || !fs.existsSync(dir)) return "";
  const name = fs
    .readdirSync(dir)
    .find((f) => f.toLowerCase().endsWith(".exe") && !/uninstall|elevate|crashpad/i.test(f));
  return name ? path.join(dir, name) : "";
}

/**
 * @param {string} code
 * @returns {{ code: string, name: string, exe: string, source: 'install'|'win-unpacked'|'' } | null}
 */
export function resolveSibling(code) {
  const def = DESK_SIBLINGS.find((s) => s.code.toUpperCase() === String(code || "").toUpperCase());
  if (!def) return null;
  for (const cand of def.exeCandidates) {
    if (cand && fs.existsSync(cand)) {
      return { code: def.code, name: def.name, exe: cand, source: "install" };
    }
  }
  const unpacked = findExeInDir(def.winUnpackedGlob);
  if (unpacked) {
    return { code: def.code, name: def.name, exe: unpacked, source: "win-unpacked" };
  }
  return { code: def.code, name: def.name, exe: "", source: "" };
}

export function listSiblings() {
  return DESK_SIBLINGS.map((s) => {
    const r = resolveSibling(s.code);
    return {
      code: s.code,
      name: s.name,
      available: Boolean(r?.exe),
      exe: r?.exe || "",
      source: r?.source || "",
    };
  });
}

/**
 * Launch sibling exe detached (Windows). Returns { ok, exe, error? }.
 * @param {string} code
 */
export function openSibling(code) {
  const r = resolveSibling(code);
  if (!r?.exe) {
    return { ok: false, code: String(code || "").toUpperCase(), error: "sibling exe not found (install or win-unpacked)" };
  }
  try {
    const winPid = spawnInteractiveDesktopProcess({
      exePath: r.exe,
      args: [],
      cwd: path.dirname(r.exe),
    });
    if (winPid) {
      return { ok: true, code: r.code, name: r.name, exe: r.exe, source: r.source, pid: winPid };
    }
    const child = spawn(r.exe, [], {
      detached: true,
      stdio: "ignore",
      windowsHide: false,
      cwd: path.dirname(r.exe),
    });
    child.unref();
    return { ok: true, code: r.code, name: r.name, exe: r.exe, source: r.source, pid: child.pid };
  } catch (e) {
    return { ok: false, code: r.code, exe: r.exe, error: String(e?.message || e) };
  }
}

// Keep HOST_DIR referenced for future packaged path probes.
void HOST_DIR;
