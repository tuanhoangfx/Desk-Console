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
  openDesktopExeWithPolicy,
  parseDesktopOpenFlags,
  resolveDesktopProductExe,
} from "../../scripts/lib/desktop-exe-products.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const devRoot = path.resolve(root, "..", "..");
const require = createRequire(path.join(root, "package.json"));
const { spawnInteractiveDesktopProcess } = require(path.join(root, "..", "scripts", "lib", "win-shell-env.cjs"));
const spec = DESKTOP_EXE_PRODUCTS.P0001;
const flags = parseDesktopOpenFlags(process.argv, process.env);

const exePath = resolveDesktopProductExe(devRoot, "P0001", { syncUnpacked: !flags.noHotPatch });
if (!exePath) {
  console.error(`desktop-open: missing packaged exe for P0001 (${spec.exeName}) — run: pnpm desktop:dist`);
  process.exit(1);
}

const res = await openDesktopExeWithPolicy({
  devRoot,
  code: "P0001",
  exePath,
  cwd: path.dirname(exePath),
  env: cleanDesktopElectronEnv(),
  replaceRunning: flags.replace,
  noHotPatch: flags.noHotPatch,
  skipBuild: flags.skipBuild,
  spawnInteractiveDesktopProcess,
});

console.log(`desktop-open: P0001 (${spec.productName}) open via ${res.method} (ok=${res.ok}, hotPatched=${Boolean(res.hotPatched)}): ${exePath}`);
process.exit(res.ok ? 0 : 1);
