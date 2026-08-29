import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { ingestClipboardText, resetClipboardWatchForTests } from "./clip-watch.mjs";
import { addClip, addSample, listClips, listHistory, promoteClipToSample, removeClip, dataRoot } from "./store.mjs";
import { resetHotkeys, validateAccelerator, writeHotkeys } from "./hotkeys.mjs";
import { parseSchtasksListVerbose, readTaskNames, writeTaskNames } from "./windows.mjs";
import { runnerTargets } from "./runners.mjs";
import { createServer } from "./server.mjs";

test("store writes clips under DESK_CONSOLE_DATA", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "desk-console-"));
  process.env.DESK_CONSOLE_DATA = dir;
  const row = addClip({ text: "hello desk", source: "test" });
  assert.equal(row.text, "hello desk");
  assert.equal(row.kind, "history");
  assert.equal(listHistory().length, 1);
  assert.equal(listClips().length, 1);
  assert.equal(removeClip(row.id), true);
  assert.equal(listClips().length, 0);
  assert.ok(dataRoot().startsWith(dir) || dataRoot() === dir);
});

test("history and samples are separate stores", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "desk-console-"));
  process.env.DESK_CONSOLE_DATA = dir;
  const history = addClip({ text: "copied from windows", source: "clipboard" });
  const again = addClip({ text: "copied from windows", source: "clipboard" });
  assert.equal(again.id, history.id);
  const sample = addSample({ name: "Follow up", text: "Following up on this." });
  assert.equal(sample.kind, "sample");
  assert.equal(listHistory().length, 1);
  const promoted = promoteClipToSample(history.id);
  assert.equal(promoted.kind, "sample");
  assert.equal(listClips().filter((row) => row.kind === "sample").length, 2);
  assert.ok(fs.existsSync(path.join(dir, "clips.json")));
  assert.ok(fs.existsSync(path.join(dir, "samples.json")));
});

test("clipboard ingest dedupes consecutive text", () => {
  resetClipboardWatchForTests();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "desk-console-"));
  process.env.DESK_CONSOLE_DATA = dir;
  assert.equal(ingestClipboardText("alpha", "test")?.text, "alpha");
  assert.equal(ingestClipboardText("alpha", "test"), null);
  assert.equal(ingestClipboardText("beta", "test")?.text, "beta");
  assert.equal(listHistory().length, 2);
});

test("crop missing capture is 404", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "desk-console-"));
  process.env.DESK_CONSOLE_DATA = dir;
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/captures/missing/crop`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ x: 0, y: 0, width: 10, height: 10 }),
  });
  assert.equal(res.status, 404);
  server.close();
});

test("paste missing clip is 404", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "desk-console-"));
  process.env.DESK_CONSOLE_DATA = dir;
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/clips/missing/paste`, { method: "POST" });
  assert.equal(res.status, 404);
  server.close();
});

test("hotkeys reject Win+V and persist picker", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "desk-console-"));
  process.env.DESK_CONSOLE_DATA = dir;
  assert.equal(validateAccelerator("Super+V").ok, false);
  assert.equal(validateAccelerator("Control+V").ok, false);
  const saved = writeHotkeys({ picker: "CommandOrControl+Shift+V" });
  assert.equal(saved.picker, "CommandOrControl+Shift+V");
  const reset = resetHotkeys();
  assert.equal(reset.picker, "CommandOrControl+Alt+V");
});

test("hotkeys HTTP get and put", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "desk-console-"));
  process.env.DESK_CONSOLE_DATA = dir;
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const got = await fetch(`http://127.0.0.1:${port}/api/hotkeys`).then((r) => r.json());
  assert.equal(got.picker, "CommandOrControl+Alt+V");
  const put = await fetch(`http://127.0.0.1:${port}/api/hotkeys`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ picker: "Alt+Shift+V" }),
  });
  assert.equal(put.status, 200);
  const blocked = await fetch(`http://127.0.0.1:${port}/api/hotkeys`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ picker: "Super+V" }),
  });
  assert.equal(blocked.status, 400);
  server.close();
});

test("picker arm stores hwnd without blocking", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "desk-console-"));
  process.env.DESK_CONSOLE_DATA = dir;
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/clips/picker/arm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hwnd: "12345" }),
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.hwnd, "12345");
  server.close();
});

test("task names persist Dev-* only", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "desk-console-"));
  process.env.DESK_CONSOLE_DATA = dir;
  writeTaskNames(["Dev-Backup", "Microsoft\\Windows\\Defrag", "Dev-Sync"]);
  const stored = readTaskNames();
  assert.deepEqual(stored.names, ["Dev-Backup", "Dev-Sync"]);
  assert.ok(stored.at > 0);
});

test("schtasks verbose parse keeps Dev-* only", () => {
  const rows = parseSchtasksListVerbose(`
TaskName:      \\Dev-Backup
Status:        Ready
Last Run Time: 8/24/2026 3:00:00 AM
Last Result:   0
Next Run Time: 8/25/2026 8:00:00 AM

TaskName:      \\Microsoft\\Windows\\Defrag
Status:        Ready
Last Run Time: N/A
`);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, "Dev-Backup");
  assert.equal(rows[0].status, "Ready");
  assert.equal(rows[0].lastResult, "0");
});

test("runner targets skip storage and stay sorted", () => {
  const rows = runnerTargets({
    products: {
      P0002: { name: "Frozen", port: 5172, tier: "storage" },
      P0005: { name: "CRM", port: 3005 },
      P0004: { name: "Hub", port: 5176 },
    },
    workers: { P0016: { code: "P0016", label: "Chat", port: 3016, healthPath: "/health" } },
  });
  assert.deepEqual(
    rows.map((r) => r.id),
    ["P0004", "P0005", "worker:P0016"],
  );
  assert.equal(rows[2].url, "http://127.0.0.1:3016/health");
});

test("ops history append and list", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "desk-console-"));
  process.env.DESK_CONSOLE_DATA = dir;
  const { appendOpsHistory, readOpsHistory } = await import("./ops-history.mjs");
  appendOpsHistory({ kind: "task", targetId: "Dev-Backup", action: "run", ok: true, message: "ok" });
  const entries = readOpsHistory();
  assert.equal(entries.length, 1);
  assert.equal(entries[0].targetId, "Dev-Backup");
});

test("ops log path resolves cursor prune", async () => {
  const { resolveOpsLogPath } = await import("./ops-log-paths.mjs");
  const file = resolveOpsLogPath("Dev-Cursor-Chat-Auto-Prune", "task");
  assert.match(file, /cursor-chat-auto-prune\.log$|terminals\/task-dev-cursor-chat-auto-prune\.log$/);
});

test("ops terminal log append", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "desk-console-"));
  process.env.DESK_CONSOLE_DATA = dir;
  const { appendTerminalLine, terminalLogPath } = await import("./ops-terminal.mjs");
  const file = appendTerminalLine("P0004", "runner", "start test");
  assert.equal(file, terminalLogPath("P0004", "runner"));
  assert.match(fs.readFileSync(file, "utf8"), /start test/);
});

test("runners and tasks screens use DeskDirectoryScreen", () => {
  const srcRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
  const app = fs.readFileSync(path.join(srcRoot, "App.tsx"), "utf8");
  const runners = fs.readFileSync(path.join(srcRoot, "features", "runners", "RunnersScreen.tsx"), "utf8");
  const tasks = fs.readFileSync(path.join(srcRoot, "features", "tasks", "TasksScreen.tsx"), "utf8");
  const appScreen = fs.readFileSync(path.join(srcRoot, "lib", "app-screen.ts"), "utf8");
  assert.match(app, /RunnersScreen/);
  assert.match(app, /TasksScreen/);
  assert.doesNotMatch(app, /OpsScreen/);
  assert.match(runners, /DeskDirectoryScreen/);
  assert.doesNotMatch(runners, /sideRail|RuntimeRail/);
  assert.match(tasks, /DeskDirectoryScreen/);
  assert.doesNotMatch(appScreen, /desk-path|migrateDeskAppUrl/);
});

test("runner stop endpoint", async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/runners/UNKNOWN99/stop`, { method: "POST" });
  assert.equal(res.status, 404);
  server.close();
});

test("health endpoint", async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/health`);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.code, "P0001");
  server.close();
});
