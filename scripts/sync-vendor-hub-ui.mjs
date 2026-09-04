#!/usr/bin/env node
/**
 * P0001 — fan-out packages/hub-ui → vendor/hub-ui (wraps workspace SSOT sync).
 *
 * Usage:
 *   node scripts/sync-vendor-hub-ui.mjs
 *   node scripts/sync-vendor-hub-ui.mjs --files src/styles/hub-profile-split-layout.css
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const devRoot = path.resolve(toolRoot, "../..");
const syncScript = path.join(devRoot, "Tool", "scripts", "sync-hub-ui-vendor.cjs");
const extra = process.argv.slice(2);
const args = ["--target", "P0001", ...extra];

const result = spawnSync(process.execPath, [syncScript, ...args], {
  cwd: devRoot,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
