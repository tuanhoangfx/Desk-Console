#!/usr/bin/env node
/**
 * P0001 Desk Console — pin known-good (git commit + tag; no Vercel).
 *
 *   node scripts/snapshot-known-good.mjs
 *   node scripts/snapshot-known-good.mjs --label stable-2026-08-24
 *   node scripts/snapshot-known-good.mjs --with-artifacts
 */
import crypto from "node:crypto";
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
const withArtifacts = process.argv.includes("--with-artifacts");

function sha512File(filePath) {
  const hash = crypto.createHash("sha512");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function copyArtifacts() {
  const srcDesktop = path.join(root, "dist-desktop");
  const installerName = `Desk Console Setup ${pkg.version}.exe`;
  const installerSrc = path.join(srcDesktop, installerName);
  if (!fs.existsSync(installerSrc)) {
    console.error(`snapshot-known-good: missing installer ${installerSrc} (run pnpm desktop:dist first)`);
    process.exit(1);
  }
  const backupRoot = path.join(srcDesktop, "known-good", `v${pkg.version}-stable`);
  fs.mkdirSync(backupRoot, { recursive: true });
  fs.copyFileSync(installerSrc, path.join(backupRoot, installerName));
  const blockmap = `${installerSrc}.blockmap`;
  if (fs.existsSync(blockmap)) {
    fs.copyFileSync(blockmap, path.join(backupRoot, path.basename(blockmap)));
  }
  const unpackedSrc = path.join(srcDesktop, "win-unpacked");
  const unpackedDst = path.join(backupRoot, "win-unpacked");
  if (fs.existsSync(unpackedSrc)) {
    fs.cpSync(unpackedSrc, unpackedDst, { recursive: true });
  }
  return {
    dir: path.relative(root, backupRoot).replace(/\\/g, "/"),
    installer: installerName,
    installerSha512: sha512File(installerSrc),
    unpacked: fs.existsSync(unpackedDst) ? "win-unpacked" : null,
  };
}
const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
const dirty = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" });

if (dirty.stdout?.trim()) {
  console.error("snapshot-known-good: refuse — working tree not clean (commit first)");
  process.exit(1);
}

const commit = head.stdout?.trim() || null;
const artifactMeta = withArtifacts ? copyArtifacts() : null;
const next = {
  schemaVersion: 1,
  label,
  version: pkg.version,
  gitCommit: commit,
  gitTag: `v${pkg.version}-stable`,
  productType: "Desktop",
  backup: {
    dir: artifactMeta?.dir ?? "dist-desktop/known-good",
    capturedAt: new Date().toISOString(),
    ...(artifactMeta
      ? {
          installer: artifactMeta.installer,
          installerSha512: artifactMeta.installerSha512,
          unpacked: artifactMeta.unpacked,
        }
      : {
          note: "Run pnpm desktop:dist then snapshot-known-good.mjs --with-artifacts",
        }),
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
