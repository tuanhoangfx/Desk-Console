#!/usr/bin/env node
/**
 * Probe whether Electron can register Ctrl+Shift+Q and list known OS/app overlaps.
 * Run: node scripts/probe-picker-hotkey.mjs
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(root, "package.json"));
const electronCli = require.resolve("electron/cli.js");
const probeMain = path.join(root, "scripts", "_probe-hotkey-main.cjs");

const KEYS = [
  "CommandOrControl+Shift+Q",
  "CommandOrControl+Shift+Period",
  "CommandOrControl+Shift+V",
  "CommandOrControl+Alt+V",
];

fs.writeFileSync(
  probeMain,
  `const { app, globalShortcut } = require("electron");
const keys = ${JSON.stringify(KEYS)};
app.whenReady().then(() => {
  const out = {};
  for (const k of keys) {
    const ok = globalShortcut.register(k, () => {});
    out[k] = ok;
    if (ok) globalShortcut.unregister(k);
  }
  console.log(JSON.stringify({ register: out }, null, 2));
  app.quit();
});
`,
  "utf8",
);

const env = {
  ...process.env,
  ELECTRON_USER_DATA: path.join(process.env.TEMP || "C:\\Temp", "desk-hotkey-probe"),
};

const child = spawn(process.execPath, [electronCli, probeMain], {
  cwd: root,
  env,
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true,
});

let buf = "";
child.stdout.on("data", (d) => {
  buf += d.toString();
});
child.on("exit", () => {
  try {
    fs.unlinkSync(probeMain);
  } catch {
    /* ignore */
  }
  let register = {};
  try {
    register = JSON.parse(buf.trim()).register || {};
  } catch {
    console.error(buf.trim() || "(no output)");
    process.exit(1);
  }

  const known = [
    {
      chord: "Ctrl+Shift+Q",
      app: "Google Chrome",
      effect: "Quit Chrome — only when Chrome is focused. Desk registers globally.",
    },
    {
      chord: "Ctrl+Shift+V",
      app: "Cursor / VS Code Markdown",
      effect: "Open Preview / tab jump — Desk rejects this chord.",
    },
    {
      chord: "Ctrl+Alt+V",
      app: "Cursor IntelliJ keymap",
      effect: "Refactor — Desk rejects Alt.",
    },
  ];

  console.log(
    JSON.stringify(
      {
        electronGlobalShortcut: register,
        deskDefault: "CommandOrControl+Shift+Q",
        deskCanBind: Boolean(register["CommandOrControl+Shift+Q"]),
        knownOverlaps: known,
        mitigation: [
          "Default Ctrl+Shift+Q — Alt and Ctrl+Shift+V rejected",
          "Disk Ctrl+Alt+V / Ctrl+Shift+V migrate once to Ctrl+Shift+Q",
          "Wait for modifier release; timeout while keys held = showInactive without focus",
          "Click row = paste at previous caret; Shift+click = copy only",
        ],
      },
      null,
      2,
    ),
  );
});
