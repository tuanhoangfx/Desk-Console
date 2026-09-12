#!/usr/bin/env node
/** Thin product wrapper → Tool/scripts/smoke-packaged-shell-icon.mjs */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const shared = path.resolve(root, "..", "scripts", "smoke-packaged-shell-icon.mjs");
const r = spawnSync(process.execPath, [shared, "--product-root", root, ...process.argv.slice(2)], {
  stdio: "inherit",
  windowsHide: true,
});
process.exit(r.status ?? 1);
