#!/usr/bin/env node
/**
 * Logon task: keep Desk host API :6010 up without opening the UI.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apply = process.argv.includes("--apply");
const TASK = "Dev-Desk-Console-Host";
const wrap = path.join(root, "scripts", "desk-host.cmd");
const nodeExe = process.env.NODE_EXE || process.execPath;
const server = path.join(root, "host", "server.mjs");

const body = `@echo off
"${nodeExe}" "${server}"
`;

if (!apply) {
  console.log(JSON.stringify({ ok: true, dryRun: true, task: TASK, wrap }, null, 2));
  process.exit(0);
}

fs.writeFileSync(wrap, body, "utf8");
const create = spawnSync(
  "schtasks",
  ["/Create", "/TN", TASK, "/TR", wrap, "/SC", "ONLOGON", "/RL", "LIMITED", "/F"],
  { encoding: "utf8", windowsHide: true },
);
console.log(
  JSON.stringify(
    { ok: create.status === 0, task: TASK, stdout: (create.stdout || "").trim(), stderr: (create.stderr || "").trim() },
    null,
    2,
  ),
);
process.exit(create.status === 0 ? 0 : 1);
