#!/usr/bin/env node
/**
 * P0001 Desk Console — pin known-good (git commit + tag; no Vercel).
 *
 *   node scripts/snapshot-known-good.mjs
 *   node scripts/snapshot-known-good.mjs --label stable-2026-08-24
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configPath = path.join(root, "config", "known-good.json");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : "";
}

const label = arg("--label") || `stable-${pkg.version}`;
const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
const dirty = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" });

if (dirty.stdout?.trim()) {
  console.error("snapshot-known-good: refuse — working tree not clean (commit first)");
  process.exit(1);
}

const commit = head.stdout?.trim() || null;
const next = {
  schemaVersion: 1,
  label,
  version: pkg.version,
  gitCommit: commit,
  gitTag: `v${pkg.version}-stable`,
  productType: "Desktop",
  backup: {
    dir: "dist-desktop/known-good",
    capturedAt: new Date().toISOString(),
    note: "Run pnpm desktop:dist before snapshot to copy installer into backup dir",
  },
  notes: "Restore: git checkout v0.1.8-stable · pnpm install · pnpm dev",
  restore: {
    gitCheckout: `v${pkg.version}-stable`,
    verify: "node host/desk-host.test.mjs",
    purgeRuntime: null,
  },
};

fs.mkdirSync(path.dirname(configPath), { recursive: true });
fs.writeFileSync(configPath, `${JSON.stringify(next, null, 2)}\n`);
console.log(`Wrote ${configPath} (commit ${commit?.slice(0, 7) ?? "?"})`);
