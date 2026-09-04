#!/usr/bin/env node
/** Block common broken Electron launch patterns before dev stack starts. */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(root, "package.json"));

try {
  require.resolve("electron/cli.js");
} catch {
  console.error("[predev] electron not installed — run: pnpm install (from repo root or P0001)");
  process.exit(1);
}

const argv = process.argv.join(" ");
if (/\belectron\b.*\s-e\s/.test(argv) || argv.includes("win-paste.cjs';")) {
  console.error("[predev] Forbidden: electron -e inline script — use: pnpm dev");
  process.exit(1);
}
