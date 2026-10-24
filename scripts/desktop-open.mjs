#!/usr/bin/env node
/**
 * Launch packaged P0001 Desk Console via the shared Desktop `.exe` SSOT (`desktop-exe-products.mjs`).
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DESKTOP_EXE_PRODUCTS,
  cleanDesktopElectronEnv,
  launchDesktopExeVerified,
  resolveDesktopProductExe,
} from "../../scripts/lib/desktop-exe-products.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const devRoot = path.resolve(root, "..", "..");
const require = createRequire(path.join(root, "package.json"));
const { spawnInteractiveDesktopProcess } = require(path.join(root, "..", "scripts", "lib", "win-shell-env.cjs"));
const spec = DESKTOP_EXE_PRODUCTS.P0001;
const replaceRunning = process.argv.includes("--replace");

const exePath = resolveDesktopProductExe(devRoot, "P0001");
if (!exePath) {
  console.error(`desktop-open: missing packaged exe for P0001 (${spec.exeName}) — run: pnpm desktop:dist`);
  process.exit(1);
}

const res = await launchDesktopExeVerified({
  exePath,
  cwd: path.dirname(exePath),
  env: cleanDesktopElectronEnv(),
  healthUrl: spec.healthUrl || "",
  replaceRunning,
  exeName: spec.exeName,
  spawnInteractiveDesktopProcess,
});

console.log(`desktop-open: P0001 (${spec.productName}) launched via ${res.method} (ok=${res.ok}): ${exePath}`);
process.exit(res.ok ? 0 : 1);
