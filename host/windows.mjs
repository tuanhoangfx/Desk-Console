import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dataRoot } from "./store.mjs";

const HOST_DIR = path.dirname(fileURLToPath(import.meta.url));
const TOOL_ROOT = path.resolve(HOST_DIR, "..");

function findDevRoot() {
  if (process.env.DESK_DEV_ROOT) return path.resolve(process.env.DESK_DEV_ROOT);
  let dir = HOST_DIR;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, "Tool", "scripts", "lib", "workspace-ports.json"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(TOOL_ROOT, "../..");
}

const DEV_ROOT = findDevRoot();

export function winSpawn(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    encoding: "utf8",
    windowsHide: true,
    timeout: opts.timeout ?? 30_000,
    maxBuffer: 16 * 1024 * 1024,
    cwd: opts.cwd || DEV_ROOT,
  });
}

export function readClipboardText() {
  const r = winSpawn(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Clipboard -Raw",
    ],
    { timeout: 2_000 },
  );
  if (r.status !== 0) return "";
  return String(r.stdout || "").replace(/\r\n/g, "\n").trimEnd();
}

/** Non-blocking clipboard read — watch must not freeze GET /api/clips. */
export function readClipboardTextAsync(timeoutMs = 2000) {
  return new Promise((resolve) => {
    const child = spawn(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Clipboard -Raw",
      ],
      { windowsHide: true },
    );
    let out = "";
    const timer = setTimeout(() => {
      child.kill();
      resolve("");
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      out += chunk;
    });
    child.on("error", () => {
      clearTimeout(timer);
      resolve("");
    });
    child.on("close", () => {
      clearTimeout(timer);
      resolve(String(out || "").replace(/\r\n/g, "\n").trimEnd());
    });
  });
}

let ignoreClipboardText = "";

function runPsAsync(args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn("powershell", ["-NoProfile", "-Command", ...args], {
      windowsHide: true,
      env: opts.env || process.env,
    });
    let out = "";
    const timer = setTimeout(() => {
      child.kill();
      resolve({ ok: false, stdout: out });
    }, opts.timeoutMs ?? 2000);
    child.stdout.on("data", (chunk) => {
      out += chunk;
    });
    child.on("error", () => {
      clearTimeout(timer);
      resolve({ ok: false, stdout: out });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, stdout: out });
    });
  });
}

export function writeClipboardText(text) {
  const value = String(text ?? "");
  ignoreClipboardText = value;
  const r = spawnSync(
    "powershell",
    ["-NoProfile", "-Command", "Set-Clipboard -Value $env:DESK_CLIP"],
    {
      encoding: "utf8",
      windowsHide: true,
      timeout: 2_000,
      env: { ...process.env, DESK_CLIP: value },
    },
  );
  return r.status === 0;
}

export async function writeClipboardTextAsync(text) {
  const value = String(text ?? "");
  ignoreClipboardText = value;
  const r = await runPsAsync(["Set-Clipboard -Value $env:DESK_CLIP"], {
    timeoutMs: 2000,
    env: { ...process.env, DESK_CLIP: value },
  });
  return r.ok;
}

export function shouldIgnoreClipboardText(text) {
  return Boolean(ignoreClipboardText) && text === ignoreClipboardText;
}

const HWND_PS = `Add-Type @"
using System;
using System.Runtime.InteropServices;
public class DeskHwnd {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
}
"@
[int64][DeskHwnd]::GetForegroundWindow()`;

export function captureForegroundHwnd() {
  const r = winSpawn("powershell", ["-NoProfile", "-Command", HWND_PS], { timeout: 2_000 });
  return String(r.stdout || "").trim();
}

export function pasteToForegroundHwnd(hwnd) {
  const handle = String(hwnd || "").trim();
  if (!handle || handle === "0") return false;
  const r = winSpawn(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      `Add-Type @"
using System;
using System.Runtime.InteropServices;
public class DeskPaste {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
}
"@
$h = [IntPtr][int64]${handle}
[DeskPaste]::ShowWindow($h, 9) | Out-Null
[DeskPaste]::SetForegroundWindow($h) | Out-Null
Start-Sleep -Milliseconds 90
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait('^v')`,
    ],
    { timeout: 2_500 },
  );
  return r.status === 0;
}

export async function pasteToForegroundHwndAsync(hwnd) {
  const handle = String(hwnd || "").trim();
  if (!handle || handle === "0") return false;
  const r = await runPsAsync(
    [
      `Add-Type @"
using System;
using System.Runtime.InteropServices;
public class DeskPaste {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
}
"@
$h = [IntPtr][int64]${handle}
[DeskPaste]::ShowWindow($h, 9) | Out-Null
[DeskPaste]::SetForegroundWindow($h) | Out-Null
Start-Sleep -Milliseconds 90
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait('^v')`,
    ],
    { timeoutMs: 2500 },
  );
  return r.ok;
}

export function captureScreenPng(destPath) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  const destLit = destPath.replace(/'/g, "''");
  const ps = `
Add-Type -AssemblyName System.Windows.Forms,System.Drawing
$b = [System.Windows.Forms.SystemInformation]::VirtualScreen
$bmp = New-Object System.Drawing.Bitmap $b.Width, $b.Height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size)
$bmp.Save('${destLit}', [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
`;
  const r = winSpawn("powershell", ["-NoProfile", "-Command", ps], { timeout: 45_000 });
  if (r.status !== 0 || !fs.existsSync(destPath)) {
    throw new Error((r.stderr || r.stdout || "capture failed").trim().slice(0, 400));
  }
  return destPath;
}

export function cropPng(srcPath, destPath, box) {
  if (!fs.existsSync(srcPath)) throw new Error("source missing");
  const srcLit = srcPath.replace(/'/g, "''");
  const destLit = destPath.replace(/'/g, "''");
  const x = Math.max(0, Math.round(Number(box.x) || 0));
  const y = Math.max(0, Math.round(Number(box.y) || 0));
  const width = Math.max(1, Math.round(Number(box.width) || 0));
  const height = Math.max(1, Math.round(Number(box.height) || 0));
  const ps = `
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('${srcLit}')
try {
  $x = [Math]::Min([Math]::Max(0, ${x}), $img.Width - 1)
  $y = [Math]::Min([Math]::Max(0, ${y}), $img.Height - 1)
  $w = [Math]::Min(${width}, $img.Width - $x)
  $h = [Math]::Min(${height}, $img.Height - $y)
  if ($w -lt 1 -or $h -lt 1) { throw 'empty crop' }
  $rect = New-Object System.Drawing.Rectangle $x, $y, $w, $h
  $crop = $img.Clone($rect, $img.PixelFormat)
  try { $crop.Save('${destLit}', [System.Drawing.Imaging.ImageFormat]::Png) }
  finally { $crop.Dispose() }
} finally { $img.Dispose() }
`;
  const r = winSpawn("powershell", ["-NoProfile", "-Command", ps], { timeout: 45_000 });
  if (r.status !== 0 || !fs.existsSync(destPath)) {
    throw new Error((r.stderr || r.stdout || "crop failed").trim().slice(0, 400));
  }
  return destPath;
}

function spawnWinAsync(cmd, args, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { windowsHide: true, cwd: DEV_ROOT });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      resolve({ ok: false, stdout, stderr });
    }, timeoutMs);
    child.stdout?.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", () => {
      clearTimeout(timer);
      resolve({ ok: false, stdout, stderr });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, stdout, stderr });
    });
  });
}

export function parseSchtasksListVerbose(text) {
  const blocks = String(text || "").split(/^\s*TaskName:\s+/im).slice(1);
  const seen = new Set();
  const rows = [];
  for (const block of blocks) {
    const name = (block.split(/\r?\n/, 1)[0] || "").replace(/^\\/, "").trim();
    if (!name || !/^Dev-/i.test(name) || seen.has(name)) continue;
    seen.add(name);
    const pick = (re) => (block.match(re)?.[1] || "").trim();
    rows.push({
      id: name,
      name,
      status: pick(/^\s*Status:\s+(.+)$/im),
      lastRun: pick(/^\s*Last Run Time:\s+(.+)$/im),
      lastResult: pick(/^\s*Last Result:\s+(.+)$/im),
      nextRun: pick(/^\s*Next Run Time:\s+(.+)$/im),
    });
  }
  return rows;
}

let tasksCache = { at: 0, rows: [] };
const TASKS_TTL_MS = 15_000;
const NAMES_TTL_MS = 10 * 60_000;

export function taskNamesPath() {
  return path.join(dataRoot(), "task-names.json");
}

export function readTaskNames() {
  try {
    const raw = JSON.parse(fs.readFileSync(taskNamesPath(), "utf8"));
    const names = (Array.isArray(raw.names) ? raw.names : []).map((n) => String(n || "")).filter((n) => /^Dev-/i.test(n));
    return { names, at: Number(raw.at) || 0 };
  } catch {
    return { names: [], at: 0 };
  }
}

export function writeTaskNames(names) {
  const next = [...new Set((names || []).filter((n) => /^Dev-/i.test(n)))];
  fs.mkdirSync(dataRoot(), { recursive: true });
  fs.writeFileSync(taskNamesPath(), JSON.stringify({ at: Date.now(), names: next }, null, 2), "utf8");
  return next;
}

async function queryNamedTask(name) {
  const r = await spawnWinAsync("schtasks", ["/Query", "/TN", name, "/FO", "LIST"], 2500);
  return parseSchtasksListVerbose(r.stdout)[0] || null;
}

async function discoverDevTasks() {
  const r = await spawnWinAsync("schtasks", ["/Query", "/FO", "LIST"], 5000);
  const rows = parseSchtasksListVerbose(r.stdout);
  writeTaskNames(rows.map((row) => row.name));
  return rows;
}

export async function listDevTasks(force = false) {
  if (!force && Date.now() - tasksCache.at < TASKS_TTL_MS && tasksCache.rows.length) {
    return tasksCache.rows;
  }
  const stored = readTaskNames();
  if (stored.names.length) {
    const rows = (await Promise.all(stored.names.map(queryNamedTask))).filter(Boolean);
    if (rows.length) {
      tasksCache = { at: Date.now(), rows };
      if (force || Date.now() - stored.at > NAMES_TTL_MS) void discoverDevTasks();
      return rows;
    }
  }
  const rows = await discoverDevTasks();
  tasksCache = { at: Date.now(), rows };
  return rows;
}

export async function runTask(taskName) {
  const name = String(taskName || "").replace(/^\\/, "");
  if (!/^Dev-/i.test(name)) throw new Error("only Dev-* tasks");
  const r = await spawnWinAsync("schtasks", ["/Run", "/TN", name], 4000);
  tasksCache.at = 0;
  if (!r.ok) throw new Error((r.stderr || r.stdout || "run failed").trim());
  return { ok: true, name };
}

export async function setTaskEnabled(taskName, enabled) {
  const name = String(taskName || "").replace(/^\\/, "");
  if (!/^Dev-/i.test(name)) throw new Error("only Dev-* tasks");
  const r = await spawnWinAsync("schtasks", ["/Change", "/TN", name, enabled ? "/ENABLE" : "/DISABLE"], 4000);
  tasksCache.at = 0;
  if (!r.ok) throw new Error((r.stderr || r.stdout || "change failed").trim());
  return { ok: true, name, enabled };
}

export function cursorCount() {
  const r = winSpawn(
    "powershell",
    ["-NoProfile", "-Command", "(Get-Process -Name Cursor -ErrorAction SilentlyContinue | Measure-Object).Count"],
    { timeout: 2_000 },
  );
  return Number(String(r.stdout || "0").trim()) || 0;
}

export async function cursorCountAsync() {
  const r = await runPsAsync(
    ["(Get-Process -Name Cursor -ErrorAction SilentlyContinue | Measure-Object).Count"],
    { timeoutMs: 1500 },
  );
  return Number(String(r.stdout || "0").trim()) || 0;
}

export function startDetached(nodeArgs) {
  const child = spawn(process.execPath, nodeArgs, {
    cwd: DEV_ROOT,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
  return child.pid;
}

export { DEV_ROOT, TOOL_ROOT };
