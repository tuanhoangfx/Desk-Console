/** Minimal spawn helpers — P0003 parity (no workspace dep). */
import fs from "node:fs";
import path from "node:path";

export function resolveNodeExe() {
  if (process.platform !== "win32") return process.execPath;
  const sys = path.join(process.env.ProgramFiles || "C:\\Program Files", "nodejs", "node.exe");
  if (fs.existsSync(sys)) return sys;
  return process.execPath;
}

export function winSpawnOpts(opts = {}) {
  if (process.platform !== "win32") return opts;
  return { ...opts, windowsHide: true };
}
