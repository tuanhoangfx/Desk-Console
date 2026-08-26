import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist-desk-win", "win-unpacked");

function walkBytes(dir) {
  let n = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const next = path.join(dir, entry.name);
    n += entry.isDirectory() ? walkBytes(next) : fs.statSync(next).size;
  }
  return n;
}

const ram = Number(
  execSync(
    'powershell -NoProfile -Command "(Get-Process -Name \\"Desk Console\\" -ErrorAction SilentlyContinue | Measure-Object WorkingSet64 -Sum).Sum"',
    { encoding: "utf8" },
  ).trim() || "0",
);

console.log(
  JSON.stringify(
    {
      diskMB: Number((walkBytes(root) / 1048576).toFixed(1)),
      ramMB: Number((ram / 1048576).toFixed(1)),
      unpacked: root,
    },
    null,
    2,
  ),
);
