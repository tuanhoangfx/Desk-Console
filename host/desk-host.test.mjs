import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ingestClipboardText, resetClipboardWatchForTests } from "./clip-watch.mjs";
import { addClip, addSample, listClips, listHistory, promoteClipToSample, removeClip, restoreClip, softDeleteClip, dataRoot } from "./store.mjs";
import { readHotkeys, resetHotkeys, validateAccelerator, writeHotkeys } from "./hotkeys.mjs";
import { parseSchtasksListVerbose, readTaskNames, writeTaskNames } from "./windows.mjs";
import { runnerTargets } from "./runners.mjs";
import { createServer } from "./server.mjs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { resolveDeskDataRoot } = require("./lib/data-root.cjs");
const { DEV_DIR, PROD_DIR, DEFAULT_DEV_API_PORT, roamingAppData } = require("../electron/lib/user-data-root.cjs");

test("resolveDeskDataRoot maps dev port to desk-console-dev", () => {
  const prevData = process.env.DESK_CONSOLE_DATA;
  const prevPort = process.env.DESK_API_PORT;
  const prevIso = process.env.DESK_DEV_ISOLATED;
  delete process.env.DESK_CONSOLE_DATA;
  process.env.DESK_API_PORT = String(DEFAULT_DEV_API_PORT);
  assert.match(resolveDeskDataRoot(), new RegExp(`${DEV_DIR.replace("-", "\\-")}$`));
  process.env.DESK_API_PORT = "6010";
  delete process.env.DESK_DEV_ISOLATED;
  assert.match(resolveDeskDataRoot(), new RegExp(`${PROD_DIR}$`));
  if (prevData) process.env.DESK_CONSOLE_DATA = prevData;
  else delete process.env.DESK_CONSOLE_DATA;
  if (prevPort) process.env.DESK_API_PORT = prevPort;
  else delete process.env.DESK_API_PORT;
  if (prevIso) process.env.DESK_DEV_ISOLATED = prevIso;
  else delete process.env.DESK_DEV_ISOLATED;
  void roamingAppData;
});

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

test("clip soft delete moves row to trash lifecycle", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "desk-console-"));
  process.env.DESK_CONSOLE_DATA = dir;
  const row = addClip({ text: "trash me", source: "test" });
  const trashed = softDeleteClip(row.id);
  assert.ok(trashed?.deletedAt);
  assert.equal(listClips({ lifecycle: "live" }).length, 0);
  assert.equal(listClips({ lifecycle: "trash" }).length, 1);
  const restored = restoreClip(row.id);
  assert.equal(restored?.deletedAt, null);
  assert.equal(listClips({ lifecycle: "live" }).length, 1);
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

test("hotkeys reject Win+V / Win+Z / Alt and persist picker", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "desk-console-"));
  process.env.DESK_CONSOLE_DATA = dir;
  assert.equal(validateAccelerator("Super+V").ok, false);
  assert.equal(validateAccelerator("Super+Z").ok, false);
  assert.equal(validateAccelerator("CommandOrControl+Alt+V").ok, false);
  assert.equal(validateAccelerator("Alt+Shift+V").ok, false);
  assert.equal(validateAccelerator("CommandOrControl+Tab").ok, false);
  assert.equal(validateAccelerator("Control+V").ok, false);
  assert.equal(validateAccelerator("CommandOrControl+Shift+V").ok, false);
  assert.equal(validateAccelerator("CommandOrControl+Shift+Q").ok, true);
  const saved = writeHotkeys({ picker: "CommandOrControl+Shift+Period" });
  assert.equal(saved.picker, "CommandOrControl+Shift+Period");
  const reset = resetHotkeys();
  assert.equal(reset.picker, "CommandOrControl+Shift+Q");
});

test("hotkeys migrate Ctrl+Alt+V and Ctrl+Shift+V off disk", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "desk-console-"));
  process.env.DESK_CONSOLE_DATA = dir;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "hotkeys.json"), JSON.stringify({ picker: "CommandOrControl+Alt+V" }), "utf8");
  const next = readHotkeys();
  assert.equal(next.picker, "CommandOrControl+Shift+Q");
  fs.writeFileSync(path.join(dir, "hotkeys.json"), JSON.stringify({ picker: "CommandOrControl+Shift+V" }), "utf8");
  assert.equal(readHotkeys().picker, "CommandOrControl+Shift+Q");
});

test("hotkeys HTTP get and put", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "desk-console-"));
  process.env.DESK_CONSOLE_DATA = dir;
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const got = await fetch(`http://127.0.0.1:${port}/api/hotkeys`).then((r) => r.json());
  assert.equal(got.picker, "CommandOrControl+Shift+Q");
  const put = await fetch(`http://127.0.0.1:${port}/api/hotkeys`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ picker: "CommandOrControl+Shift+Period" }),
  });
  assert.equal(put.status, 200);
  const blockedShiftV = await fetch(`http://127.0.0.1:${port}/api/hotkeys`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ picker: "CommandOrControl+Shift+V" }),
  });
  assert.equal(blockedShiftV.status, 400);
  const blockedAlt = await fetch(`http://127.0.0.1:${port}/api/hotkeys`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ picker: "CommandOrControl+Alt+V" }),
  });
  assert.equal(blockedAlt.status, 400);
  const blocked = await fetch(`http://127.0.0.1:${port}/api/hotkeys`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ picker: "Super+V" }),
  });
  assert.equal(blocked.status, 400);
  const blockedZ = await fetch(`http://127.0.0.1:${port}/api/hotkeys`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ picker: "Super+Z" }),
  });
  assert.equal(blockedZ.status, 400);
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

test("ops terminal tail is live-only by default", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "desk-console-"));
  process.env.DESK_CONSOLE_DATA = dir;
  const { appendTerminalLine } = await import("./ops-terminal.mjs");
  const { tailOpsTerminal, tailOpsTerminalLive } = await import("./ops-log-paths.mjs");
  appendTerminalLine("P0099", "runner", "live line one");
  const live = tailOpsTerminalLive("P0099", "runner");
  assert.ok(live.lines.some((line) => line.includes("live line one")));
  const tailed = tailOpsTerminal("P0099", "runner");
  assert.deepEqual(tailed.lines, live.lines);
});

test("ops terminal log append", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "desk-console-"));
  process.env.DESK_CONSOLE_DATA = dir;
  const { appendTerminalLine, terminalLogPath } = await import("./ops-terminal.mjs");
  const file = appendTerminalLine("P0004", "runner", "start test");
  assert.equal(file, terminalLogPath("P0004", "runner"));
  assert.match(fs.readFileSync(file, "utf8"), /start test/);
});

test("ops console tail normalizes vite HMR lines", async () => {
  const { normalizeOpsConsoleTailLine } = await import("./ops-log-paths.mjs");
  const raw = "[2026-08-29T17:44:00.777Z] 04:12:18 [vite] [client] page reload src/App.tsx";
  assert.equal(
    normalizeOpsConsoleTailLine(raw),
    "04:12:18 [vite] [client] page reload src/App.tsx",
  );
  assert.match(normalizeOpsConsoleTailLine("ensure-dev P0001"), /^\$ /);
  assert.match(normalizeOpsConsoleTailLine("schtasks /Run /TN Dev-Backup"), /^\$ /);
});

test("runner probe status debounces single flaps", async () => {
  const { stabilizeRunnerProbe } = await import("./runners.mjs");
  assert.equal(stabilizeRunnerProbe("P0004", true), true);
  assert.equal(stabilizeRunnerProbe("P0004", false), true);
  assert.equal(stabilizeRunnerProbe("P0004", false), true);
  assert.equal(stabilizeRunnerProbe("P0004", false), false);
  assert.equal(stabilizeRunnerProbe("P0004", true), true);
  assert.equal(stabilizeRunnerProbe("P0004", false), true);
});

test("ops console CRT tokenizes task kv lines", async () => {
  const modPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "packages", "hub-ui", "src", "runtime", "hub-console-crt.ts");
  const { tokenizeHubConsoleLine } = await import(pathToFileURL(modPath).href);
  const line = "start apply=true session=false reload=false preserved=build/dist/.keep";
  const kinds = tokenizeHubConsoleLine(line).map((s) => s.kind);
  assert.ok(kinds.includes("cmd"), `expected cmd in ${kinds.join(",")}`);
  assert.ok(kinds.includes("key"), `expected key in ${kinds.join(",")}`);
  assert.ok(kinds.includes("ok"), `expected ok in ${kinds.join(",")}`);
  assert.ok(kinds.includes("warn"), `expected warn in ${kinds.join(",")}`);
  assert.ok(kinds.includes("path"), `expected path in ${kinds.join(",")}`);
});

test("ops console CRT tokenizes hyphen flags", async () => {
  const modPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "packages", "hub-ui", "src", "runtime", "hub-console-crt.ts");
  const { tokenizeHubConsoleLine } = await import(pathToFileURL(modPath).href);
  const kinds = tokenizeHubConsoleLine("merge-apply=true no-deploy preserved=build/dist/.keep").map((s) => s.kind);
  assert.ok(kinds.includes("cmd"), `expected hyphen cmd in ${kinds.join(",")}`);
});

test("ops console host prefixes", async () => {
  const { opsConsoleCmd, opsConsoleOk, opsConsoleMeta } = await import("./ops-terminal.mjs");
  assert.equal(opsConsoleCmd("node x"), "$ node x");
  assert.equal(opsConsoleOk("ready"), "→ ready");
  assert.equal(opsConsoleMeta("pid=1"), "[spawn] pid=1");
});

test("runners and tasks screens use DeskDirectoryScreen with ops runtime rail", () => {
  const srcRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
  const app = fs.readFileSync(path.join(srcRoot, "App.tsx"), "utf8");
  const runners = fs.readFileSync(path.join(srcRoot, "features", "runners", "RunnersScreen.tsx"), "utf8");
  const tasks = fs.readFileSync(path.join(srcRoot, "features", "tasks", "TasksScreen.tsx"), "utf8");
  const appScreen = fs.readFileSync(path.join(srcRoot, "lib", "app-screen.ts"), "utf8");
  assert.match(app, /RunnersScreen/);
  assert.match(app, /TasksScreen/);
  assert.doesNotMatch(app, /OpsScreen/);
  assert.match(runners, /DeskDirectoryScreen/);
  assert.match(runners, /DeskOpsRuntimeRail/);
  assert.match(runners, /sideRail/);
  const deskScreen = fs.readFileSync(path.join(srcRoot, "features", "desk", "DeskDirectoryScreen.tsx"), "utf8");
  assert.match(deskScreen, /HubSplitDirectoryPane/);
  assert.match(deskScreen, /desk-ops-three-rail/);
  assert.match(fs.readFileSync(path.join(srcRoot, "features", "desk", "DeskOpsRuntimeRail.tsx"), "utf8"), /HubConsoleCrtLine/);
  const hubStyles = fs.readFileSync(path.join(srcRoot, "styles", "hub-ui-styles.css"), "utf8");
  assert.match(hubStyles, /hub-console-crt\.css/);
  assert.match(hubStyles, /hub-profile-split-layout\.css/);
  assert.match(hubStyles, /hub-directory-frame-table\.css/);
  assert.match(hubStyles, /packages\/hub-ui\/src\/styles\//);
  const columnMeta = fs.readFileSync(path.join(srcRoot, "features", "desk", "desk-column-meta.ts"), "utf8");
  assert.match(columnMeta, /withDirectoryColumnStickers/);
  const sidebar = fs.readFileSync(path.join(srcRoot, "components", "DeskSidebar.tsx"), "utf8");
  assert.doesNotMatch(sidebar, /emojiGlyph/);
  assert.match(deskScreen, /desk-directory-filters/);
  assert.match(deskScreen, /panelFillRows/);
  assert.match(deskScreen, /resolveDirectoryPanelFillRows/);
  const deskTableSrc = fs.readFileSync(path.join(srcRoot, "features", "desk", "DeskDirectoryTable.tsx"), "utf8");
  assert.match(deskTableSrc, /padBodyRowsToPageSize/);
  assert.match(app, /maxMounted:\s*4/);
  assert.match(app, /DeskScreenSlot|memo\(/);
  assert.match(app, /DeskVisitedTabPanel/);
  const frameCss = fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "packages", "hub-ui", "src", "styles", "hub-directory-frame-table.css"),
    "utf8",
  );
  assert.match(frameCss, /hub-directory-frame--panel-fill|overflow-y:\s*hidden/);
  const rail = fs.readFileSync(path.join(srcRoot, "features", "desk", "DeskOpsRuntimeRail.tsx"), "utf8");
  assert.match(rail, /DESK_CONSOLE_PREVIEW_LINES/);
  const crtCss = fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "packages", "hub-ui", "src", "styles", "hub-console-crt.css"),
    "utf8",
  );
  assert.match(crtCss, /--hub-crt-accent/);
  assert.match(crtCss, /--hub-crt-text/);
  assert.doesNotMatch(fs.readFileSync(path.join(srcRoot, "features", "system", "SystemScreen.tsx"), "utf8"), /design-template/);
  const styles = fs.readFileSync(path.join(srcRoot, "styles.css"), "utf8");
  assert.match(styles, /hub-ui-styles\.css/);
  assert.match(hubStyles, /hub-account-detail-modal\.css/);
  assert.match(deskScreen, /DeskSplitHubChrome/);
  assert.match(runners, /RunnerDetailModal/);
  assert.match(runners, /onStop/);
  assert.doesNotMatch(runners, /onRestart/);
  assert.match(runners, /label: "Stop"/);
  assert.match(runners, /label: "Detail"/);
  assert.match(deskScreen, /deskBulkActionIcon/);
  const cells = fs.readFileSync(path.join(srcRoot, "features", "desk", "desk-directory-cells.tsx"), "utf8");
  assert.doesNotMatch(cells, /onRestart/);
  assert.match(cells, /Start \$\{label\}/);
  assert.match(tasks, /TaskDetailModal/);
  assert.match(runners, /detailId/);
  assert.match(tasks, /detailId/);
  assert.match(runners, /appendDeskOpsLog/);
  assert.match(tasks, /DeskDirectoryScreen/);
  assert.match(tasks, /DeskOpsRuntimeRail/);
  assert.match(tasks, /sideRail/);
  assert.match(tasks, /opsHandlers/);
  assert.match(app, /bootAppScreen|migrateDeskAppUrl/);
  assert.match(appScreen, /desk-path|migrateDeskAppUrl/);
  assert.match(fs.readFileSync(path.join(srcRoot, "lib", "desk-path.ts"), "utf8"), /DESK_SCREEN_PATH/);
  assert.match(fs.readFileSync(path.join(srcRoot, "lib", "desk-path.ts"), "utf8"), /\/clips/);
});

test("P0001 ensure-dev resolves win-shell-env from Tool/scripts", () => {
  const script = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "scripts", "ensure-dev.cjs"), "utf8");
  assert.match(script, /require\("\.\.\/\.\.\/scripts\/lib\/win-shell-env\.cjs"\)/);
  assert.doesNotMatch(script, /\.\.\/\.\.\/\.\.\/scripts\/lib\/win-shell-env/);
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
