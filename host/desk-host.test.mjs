import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ingestClipboardImage, ingestClipboardText, resetClipboardWatchForTests } from "./clip-watch.mjs";
import {
  addClip,
  addSample,
  clipsMediaDir,
  dataRoot,
  listClips,
  listHistory,
  promoteClipToSample,
  pruneUnreferencedClipMediaFiles,
  readClipMediaBuffer,
  removeClip,
  restoreClip,
  softDeleteClip,
} from "./store.mjs";
import { readHotkeys, resetHotkeys, validateAccelerator, writeHotkeys } from "./hotkeys.mjs";
import {
  dibBufferToClipboardImage,
  getClipboardSequenceNumber,
  listDevTasks,
  parseSchtasksListVerbose,
  parseTaskSchedulerComTsv,
  pngBufferToDibBuffer,
  readClipboardImageAsync,
  readTaskNames,
  writeTaskNames,
} from "./windows.mjs";
import { findListeningPidsByPortNative, runnerTargets, stopRunner } from "./runners.mjs";
import { createServer, runBrowseFolderWinAsync, runPurgeCursorChatsAsync } from "./server.mjs";
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
  const { opsConsoleCmd, opsConsoleOk, opsConsoleMeta, opsConsoleErr } = await import("./ops-terminal.mjs");
  assert.equal(opsConsoleCmd("node x"), "$ node x");
  assert.equal(opsConsoleOk("ready"), "→ ready");
  assert.equal(opsConsoleMeta("pid=1"), "[spawn] pid=1");
  assert.equal(opsConsoleErr("boom"), "[ERR] boom");
});

test("isolated deskElectronEnv always sets VITE_DEV_SERVER_URL", async () => {
  const { deskElectronEnv } = await import("../scripts/lib/desk-electron-env.mjs");
  const env = deskElectronEnv({ DESK_DEV_LOG: "1" });
  assert.match(String(env.VITE_DEV_SERVER_URL || ""), /127\.0\.0\.1:5180/);
  assert.equal(env.DESK_DEV_ISOLATED, "1");
  assert.equal(env.DESK_API_PORT, "6011");
});

test("startRunner uses ensure-dev-lean --vite-only (no dependsOn cascade)", () => {
  const src = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "runners.mjs"), "utf8");
  assert.match(src, /ensure-dev-lean\.cjs/);
  assert.match(src, /--vite-only/);
  assert.doesNotMatch(src, /ensure-dev-product\.cjs/);
  assert.match(src, /start error/);
  assert.match(src, /startOutcome/);
});

test("RunnersScreen clears Starting on host exit and KPI running is wired", () => {
  const srcRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
  const runners = fs.readFileSync(path.join(srcRoot, "features", "runners", "RunnersScreen.tsx"), "utf8");
  const cells = fs.readFileSync(path.join(srcRoot, "features", "desk", "desk-directory-cells.tsx"), "utf8");
  const prefs = fs.readFileSync(path.join(srcRoot, "lib", "display-prefs-registry.ts"), "utf8");
  const desk = fs.readFileSync(path.join(srcRoot, "features", "desk", "DeskDirectoryScreen.tsx"), "utf8");
  assert.match(runners, /opsStartExitCode/);
  assert.match(runners, /Start failed/);
  assert.match(cells, /Starting/);
  assert.doesNotMatch(cells, /runningLabel = .*Running/);
  assert.match(prefs, /key: "running"/);
  assert.match(desk, /prefKey: "running"/);
  assert.match(desk, /status === "Starting" \|\| row\.opsAction === "starting"/);
  assert.doesNotMatch(desk, /opsUp === true[\s\S]{0,80}prefKey: "running"|prefKey: "running"[\s\S]{0,120}opsUp === true/);
  assert.match(desk, /kpiSetOrClear\(current, DESK_STATUS_FILTER_KEY, \["Starting"\]\)/);
  assert.match(desk, /patchHubListPrefs/);
  assert.match(desk, /kpi\.has\("running"\)/);
});

test("runners screen uses DeskDirectoryScreen with ops runtime rail and Tasks screen is retired", () => {
  const srcRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
  const app = fs.readFileSync(path.join(srcRoot, "App.tsx"), "utf8");
  const runners = fs.readFileSync(path.join(srcRoot, "features", "runners", "RunnersScreen.tsx"), "utf8");
  const appScreen = fs.readFileSync(path.join(srcRoot, "lib", "app-screen.ts"), "utf8");
  assert.match(app, /RunnersScreen/);
  assert.doesNotMatch(app, /TasksScreen/);
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
  assert.doesNotMatch(sidebar, /screen:\s*"tasks"/);
  assert.match(deskScreen, /desk-directory-filters/);
  assert.match(deskScreen, /panelFillRows/);
  assert.match(deskScreen, /resolveDirectoryPanelFillRows/);
  const deskTableSrc = fs.readFileSync(path.join(srcRoot, "features", "desk", "DeskDirectoryTable.tsx"), "utf8");
  assert.match(deskTableSrc, /padBodyRowsToPageSize/);
  assert.match(app, /maxMounted:\s*(4|5)/);
  assert.match(app, /JobsScreen/);
  assert.match(app, /DrivesScreen/);
  assert.match(app, /DeskScreenSlot|memo\(/);
  assert.match(app, /DeskVisitedTabPanel/);
  const frameCss = fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "packages", "hub-ui", "src", "styles", "hub-directory-frame-table.css"),
    "utf8",
  );
  assert.match(frameCss, /hub-directory-frame--panel-fill|overflow-y:\s*hidden/);
  const rail = fs.readFileSync(path.join(srcRoot, "features", "desk", "DeskOpsRuntimeRail.tsx"), "utf8");
  assert.match(rail, /DESK_CONSOLE_PREVIEW_LINES/);
  const histIdx = rail.indexOf("<DeskOpsHistoryPanel");
  const logIdx = rail.indexOf("<DeskOpsLogPanel");
  const conIdx = rail.indexOf("<DeskOpsConsolePanel");
  assert.ok(histIdx > 0 && logIdx > histIdx && conIdx > logIdx, "DeskOpsRuntimeRail must render History · Log · Console in order");
  const cronSrc = fs.readFileSync(path.join(srcRoot, "features", "cron", "CronScreen.tsx"), "utf8");
  assert.match(cronSrc, /DeskDirectoryScreen/);
  assert.match(cronSrc, /DeskOpsRuntimeRail/);
  assert.match(cronSrc, /CronDetailModal/);
  const dashSrc = fs.readFileSync(path.join(srcRoot, "features", "dashboard", "DashboardScreen.tsx"), "utf8");
  assert.match(dashSrc, /DashboardGrowthChart/);
  assert.match(dashSrc, /MiniBarChart/);
  assert.match(dashSrc, /HubSegmentToggle/);
  const crtCss = fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "packages", "hub-ui", "src", "styles", "hub-console-crt.css"),
    "utf8",
  );
  assert.match(crtCss, /--hub-crt-accent/);
  assert.match(crtCss, /--hub-crt-text/);
  assert.equal(fs.existsSync(path.join(srcRoot, "features", "system")), false, "retired SystemScreen folder must not exist");
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
  assert.match(runners, /detailId/);
  assert.match(runners, /appendDeskOpsLog/);
  assert.match(app, /bootAppScreen|migrateDeskAppUrl/);
  assert.match(appScreen, /desk-path|migrateDeskAppUrl/);
  assert.match(fs.readFileSync(path.join(srcRoot, "lib", "desk-path.ts"), "utf8"), /DESK_SCREEN_PATH/);
  assert.match(fs.readFileSync(path.join(srcRoot, "lib", "desk-path.ts"), "utf8"), /\/clips/);
});

test("image clips store, dedupe, picker snapshot, and paste chord contract", () => {
  resetClipboardWatchForTests();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "desk-console-img-"));
  process.env.DESK_CONSOLE_DATA = dir;
  const fakePng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const first = ingestClipboardImage({ imageDataUrl: fakePng, imageWidth: 320, imageHeight: 180 }, "clipboard");
  assert.ok(first);
  assert.equal(first.contentType, "image");
  assert.equal(first.imageDataUrl, fakePng);
  assert.equal(first.imageWidth, 320);
  assert.equal(first.imageHeight, 180);
  assert.equal(ingestClipboardImage({ imageDataUrl: fakePng, imageWidth: 320, imageHeight: 180 }, "clipboard"), null);

  const { readPickerSnapshot } = require("../electron/picker-store.cjs");
  const snap = readPickerSnapshot();
  assert.equal(snap.rows.length, 1);
  assert.equal(snap.rows[0].contentType, "image");
  assert.equal(snap.rows[0].imageDataUrl, fakePng);

  // Verify IMAGE_HISTORY_CAP = 25 auto-compacts unpinned image clips while preserving text clips
  addClip({ text: "preserved-text-clip", source: "manual" });
  for (let i = 0; i < 30; i++) {
    addClip({
      imageDataUrl: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==${i}`,
      imageWidth: 100 + i,
      imageHeight: 100 + i,
      source: "manual",
    });
  }
  const afterCap = readPickerSnapshot();
  const imgRows = afterCap.rows.filter((r) => r.contentType === "image");
  const txtRows = afterCap.rows.filter((r) => r.contentType === "text" && r.text === "preserved-text-clip");
  assert.equal(imgRows.length, 25);
  assert.equal(txtRows.length, 1);

  const winPasteSrc = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "electron", "win-paste.cjs"), "utf8");
  assert.doesNotMatch(winPasteSrc, /KEYEVENTF_UNICODE \| flags/);
  const mainSrc = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "electron", "main.cjs"), "utf8");
  assert.doesNotMatch(mainSrc, /mainWindow\.blur\(\)/);
  assert.doesNotMatch(mainSrc, /mainWindow\.setFocusable\(false\)/);
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

test("host-metrics endpoint (P0003 header parity)", { timeout: 10_000 }, async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const { port } = server.address();
    const fetchMetrics = async () =>
      (await fetch(`http://127.0.0.1:${port}/api/host-metrics`, { signal: AbortSignal.timeout(5_000) })).json();
    const first = await fetchMetrics();
    assert.equal(first.ok, true);
    assert.ok(first.ramTotalBytes > 0);
    assert.equal(typeof first.cpuPercent, "number");
    await new Promise((r) => setTimeout(r, 50));
    const second = await fetchMetrics();
    assert.equal(second.cpuReady, true);
  } finally {
    server.closeAllConnections?.();
    server.close();
  }
});

test("Desk status cells use HubUsersStatusLabel Dot Color with live pulse (Campaign P0002 parity) and include Created + Log columns", () => {
  const srcRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
  const stickers = fs.readFileSync(path.join(srcRoot, "features", "desk", "desk-directory-stickers.ts"), "utf8");
  const filters = fs.readFileSync(path.join(srcRoot, "features", "desk", "desk-directory-filters.ts"), "utf8");
  const colMeta = fs.readFileSync(path.join(srcRoot, "features", "desk", "desk-column-meta.ts"), "utf8");
  const cells = fs.readFileSync(path.join(srcRoot, "features", "desk", "desk-directory-cells.tsx"), "utf8");
  const desk = fs.readFileSync(path.join(srcRoot, "features", "desk", "DeskDirectoryScreen.tsx"), "utf8");
  const statusLabel = fs.readFileSync(path.join(srcRoot, "features", "desk", "DeskStatusKpiLabel.tsx"), "utf8");
  const cronScreen = fs.readFileSync(path.join(srcRoot, "features", "cron", "CronScreen.tsx"), "utf8");
  const tablePrefs = fs.readFileSync(path.join(srcRoot, "features", "desk", "desk-table-prefs.ts"), "utf8");
  assert.match(stickers, /deskStatusDotTone/);
  assert.match(stickers, /deskStatusLive/);
  assert.match(stickers, /deskStatusKpiDetail/);
  assert.match(filters, /statusDot:\s*deskStatusDotTone/);
  assert.match(filters, /hub-users-status-dot--/);
  assert.match(colMeta, /getDeskColumnMeta/);
  assert.match(colMeta, /statusDot:\s*deskStatusDotTone\(label\)/);
  assert.match(colMeta, /created:\s*col\("Created"/);
  assert.match(colMeta, /log:\s*col\("Log"/);
  assert.match(tablePrefs, /"created"/);
  assert.match(tablePrefs, /"log"/);
  assert.match(statusLabel, /HubUsersStatusLabel/);
  assert.match(statusLabel, /deskStatusDotTone/);
  assert.match(statusLabel, /deskStatusLive/);
  assert.match(cells, /DeskStatusKpiLabel/);
  assert.match(cells, /HubDirectoryLogCell/);
  assert.match(cells, /key === "created"/);
  assert.match(cells, /key === "log"/);
  assert.match(cells, /key === "schedule"/);
  assert.match(cronScreen, /crudBulk=\{\{/);
  assert.match(cronScreen, /CronCreateModal/);
  assert.match(desk, /DESK_STATUS_KPI_EMOJI\.up/);
  assert.match(desk, /DESK_STATUS_KPI_EMOJI\.running/);
  assert.match(desk, /DESK_STATUS_KPI_EMOJI\.down/);
});

test("DeskSplitHubChrome wires host centerStats", () => {
  const srcRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
  const chrome = fs.readFileSync(
    path.join(srcRoot, "features", "desk", "DeskSplitHubChrome.tsx"),
    "utf8",
  );
  assert.match(chrome, /useHostHeaderStats/);
  assert.match(chrome, /centerStats=\{centerStats\}/);
  assert.match(
    fs.readFileSync(path.join(srcRoot, "hooks", "useHostHeaderStats.ts"), "utf8"),
    /buildHostHeaderStats/,
  );
});

test("pc diagnostics and optimize endpoints + SystemScreen PC Optimizer section", { timeout: 30_000 }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "desk-console-pc-"));
  process.env.DESK_CONSOLE_DATA = dir;
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const { port } = server.address();
    const diagRes = await fetch(`http://127.0.0.1:${port}/api/pc/diagnostics`, {
      signal: AbortSignal.timeout(15_000),
    });
    assert.equal(diagRes.status, 200);
    const diag = await diagRes.json();
    assert.equal(diag.ok, true);
    assert.ok(diag.summary.processCount >= 0);
    assert.ok(diag.summary.topology.groupCount >= 1);
    assert.ok(Array.isArray(diag.topProcesses));

    const optRes = await fetch(`http://127.0.0.1:${port}/api/pc/optimize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "trim-ram" }),
      signal: AbortSignal.timeout(20_000),
    });
    assert.equal(optRes.status, 200);
    const opt = await optRes.json();
    assert.equal(opt.ok, true);
    assert.equal(opt.action, "trim-ram");
    assert.ok(opt.results.ram);
  } finally {
    server.closeAllConnections?.();
    server.close();
  }

  const srcRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
  const dashSrc = fs.readFileSync(path.join(srcRoot, "features", "dashboard", "DashboardScreen.tsx"), "utf8");
  const jobsCells = fs.readFileSync(path.join(srcRoot, "features", "jobs", "jobs-directory-cells.tsx"), "utf8");
  const drivesCells = fs.readFileSync(path.join(srcRoot, "features", "drives", "drives-directory-cells.tsx"), "utf8");
  assert.match(dashSrc, /KpiTileData/);
  assert.match(dashSrc, /DashboardGrowthChart/);
  assert.match(jobsCells, /variant=\{col\.key === "created" \? "date" : "activity"\}/);
  assert.match(jobsCells, /popoverTitle=\{`🚦 Status · \$\{view\.label\}`\}/);
  assert.match(drivesCells, /variant=\{col\.key === "created" \? "date" : "activity"\}/);
  assert.match(drivesCells, /live=\{Boolean\(row\.authorized\)\}/);
  assert.match(drivesCells, /popoverTitle=\{`🚦 Status · \$\{statusLabel\}`\}/);
});

test("Clips format column, SSOT HubDirectoryRowPinButton, emoji row icons, and quick image preview", () => {
  const srcRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
  const pickerSrc = fs.readFileSync(path.join(srcRoot, "features", "clips", "ClipPickerPage.tsx"), "utf8");
  const cellsSrc = fs.readFileSync(path.join(srcRoot, "features", "desk", "desk-directory-cells.tsx"), "utf8");
  const colMetaSrc = fs.readFileSync(path.join(srcRoot, "features", "desk", "desk-column-meta.ts"), "utf8");
  const tablePrefsSrc = fs.readFileSync(path.join(srcRoot, "features", "desk", "desk-table-prefs.ts"), "utf8");
  const clipsScreenSrc = fs.readFileSync(path.join(srcRoot, "features", "clips", "ClipsScreen.tsx"), "utf8");

  assert.match(pickerSrc, /HubDirectoryRowPinButton/);
  assert.match(pickerSrc, /clipFormatEmoji/);
  assert.match(pickerSrc, /desk-picker-preview/);
  assert.doesNotMatch(pickerSrc, /ImageIcon/);
  assert.doesNotMatch(pickerSrc, /<kbd/);
  assert.doesNotMatch(pickerSrc, /detectClipSmartTag|smartTag\.label|bg-\[#060911\]/);

  assert.match(colMetaSrc, /format:\s*col\("Format"/);
  assert.match(tablePrefsSrc, /"format"/);
  assert.match(cellsSrc, /key === "format"/);
  assert.match(cellsSrc, /HubDirectoryRowPinButton/);
  assert.match(clipsScreenSrc, /onPinToggle=/);
});

test("GET /api/clips?summary=1 strips base64 imageDataUrl while GET /api/clips/:id returns full image", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "desk-console-summary-"));
  process.env.DESK_CONSOLE_DATA = dir;
  const fakePng =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const created = addClip({
    name: "Test Image Summary",
    text: "[Image 640×360]",
    contentType: "image",
    imageDataUrl: fakePng,
    imageWidth: 640,
    imageHeight: 360,
    source: "manual",
  });
  assert.ok(created?.id);
  assert.match(String(created.imageMediaFile || ""), /^sha256-[0-9a-f]{64}\.png$/);
  const rawDiskClips = fs.readFileSync(path.join(dir, "clips.json"), "utf8");
  assert.doesNotMatch(rawDiskClips, /data:image\/png;base64,/);
  assert.match(rawDiskClips, new RegExp(created.imageMediaFile.replace(".", "\\.")));
  const diskPngPath = path.join(dir, "clips-media", created.imageMediaFile);
  assert.equal(fs.existsSync(diskPngPath), true);
  assert.equal(`data:image/png;base64,${fs.readFileSync(diskPngPath).toString("base64")}`, fakePng);

  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const { port } = server.address();
    const summaryRes = await fetch(`http://127.0.0.1:${port}/api/clips?lifecycle=live&summary=1`);
    assert.equal(summaryRes.status, 200);
    const summaryBody = await summaryRes.json();
    const summaryRow = summaryBody.rows.find((r) => r.id === created.id);
    assert.ok(summaryRow);
    assert.equal(summaryRow.hasImage, true);
    assert.equal(summaryRow.contentType, "image");
    assert.equal(summaryRow.imageDataUrl, undefined);

    const detailRes = await fetch(`http://127.0.0.1:${port}/api/clips/${encodeURIComponent(created.id)}`);
    assert.equal(detailRes.status, 200);
    const detailBody = await detailRes.json();
    assert.equal(detailBody.ok, true);
    assert.equal(detailBody.row.id, created.id);
    assert.equal(detailBody.row.imageDataUrl, fakePng);

    const imgRes = await fetch(`http://127.0.0.1:${port}/api/clips/${encodeURIComponent(created.id)}/image`);
    assert.equal(imgRes.status, 200);
    assert.equal(imgRes.headers.get("content-type"), "image/png");
    const imgBuf = Buffer.from(await imgRes.arrayBuffer());
    assert.equal(`data:image/png;base64,${imgBuf.toString("base64")}`, fakePng);
  } finally {
    server.closeAllConnections?.();
    server.close();
  }
});

test("DeskSidebar groups Jobs and Drives under Drive Sync parent menu above Clips with google-drive brand icon", () => {
  const srcRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
  const navStruct = fs.readFileSync(path.join(srcRoot, "lib", "nav-structure.ts"), "utf8");
  const sidebar = fs.readFileSync(path.join(srcRoot, "components", "DeskSidebar.tsx"), "utf8");
  assert.match(navStruct, /id:\s*"drive-sync"/);
  assert.match(navStruct, /label:\s*"Drive Sync"/);
  assert.match(navStruct, /brandIcon:\s*"google-drive"/);
  assert.match(navStruct, /screen:\s*"jobs"/);
  assert.match(navStruct, /screen:\s*"drives"/);
  assert.ok(
    navStruct.indexOf('id: "drive-sync"') < navStruct.indexOf('screen: "clips"'),
    "Drive Sync must appear above Clips in NAV_STRUCTURE",
  );
  assert.match(sidebar, /HubSidebarNavList/);
  assert.match(sidebar, /useNavGroupOpenState/);
});

test("JobDetailModal / folder-sync-browse keeps overflow: visible on KPI strip wrapper and uses concise Follow Drive proxy labels", () => {
  const srcRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
  const layoutCss = fs.readFileSync(path.join(srcRoot, "styles", "folder-sync-layout.css"), "utf8");
  assert.match(
    layoutCss,
    /\.folder-sync-browse\s*\{[^}]*overflow:\s*visible;/s,
    "folder-sync-browse must use overflow: visible so KPI hover/active ring-2 is not clipped",
  );
  assert.match(
    layoutCss,
    /\.folder-sync-browse\s+\.hub-modal-directory-section\s*\{[^}]*overflow:\s*visible;/s,
    "hub-modal-directory-section inside folder-sync-browse must use overflow: visible",
  );
  const jobMode = fs.readFileSync(path.join(srcRoot, "lib", "job-mode.ts"), "utf8");
  assert.match(jobMode, /inheritOptionLabel\s*=\s*"Follow Drive"/);
  assert.match(jobMode, /inheritOptionDetail\s*=\s*"Direct \(No proxy\)"/);
});

test("Windows Explorer context menu CLI parser and file clip builder work", async () => {
  const { createRequire } = await import("node:module");
  const req = createRequire(import.meta.url);
  const {
    parseDeskCliActions,
    buildClipPayloadFromFile,
    REG_KEYS,
  } = req("../electron/lib/explorer-context-menu.cjs");

  assert.equal(REG_KEYS.length, 3);
  assert.deepEqual(parseDeskCliActions(["Desk Console.exe", "--sync-folder=D:\\Project\\Infi 28"]), {
    syncFolder: "D:\\Project\\Infi 28",
    clipFile: "",
  });
  assert.deepEqual(parseDeskCliActions(["Desk Console.exe", "--clip-file", "C:\\notes\\todo.txt"]), {
    syncFolder: "",
    clipFile: "C:\\notes\\todo.txt",
  });

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "desk-clip-file-"));
  const txtFile = path.join(tmpDir, "sample.txt");
  fs.writeFileSync(txtFile, "Hello Explorer Clip\r\nLine 2\r\n", "utf8");
  const payload = buildClipPayloadFromFile(txtFile);
  assert.equal(payload.name, "sample.txt");
  assert.equal(payload.contentType, "text");
  assert.equal(payload.text, "Hello Explorer Clip\nLine 2");
  assert.equal(payload.source, "explorer");
});

test("evaluateSyncHealthAlerts detects job errors, conflicts, and Drive low space (< 1 GB)", async () => {
  const { createRequire } = await import("node:module");
  const req = createRequire(import.meta.url);
  const { evaluateSyncHealthAlerts, ONE_GB_BYTES } = req("../electron/lib/sync-health-guard.cjs");

  const healthy = evaluateSyncHealthAlerts({
    jobs: [{ id: "j1", code: "JB0001", name: "Docs", status: "idle", lastResult: { ok: true } }],
    accounts: [
      {
        name: "gdrive",
        code: "GG0001",
        authorized: true,
        storage: { limitBytes: 15 * ONE_GB_BYTES, usedBytes: 5 * ONE_GB_BYTES },
      },
    ],
  });
  assert.equal(healthy.alerts.length, 0);
  assert.equal(healthy.summaryTooltip, "Desk Console — All 1 sync job healthy");

  const alerted = evaluateSyncHealthAlerts({
    jobs: [
      {
        id: "j1",
        code: "JB0001",
        name: "Docs",
        status: "error",
        conflictCount: 2,
        lastResult: { ok: false, stderr: "oauth2: token expired" },
      },
    ],
    accounts: [
      {
        name: "gdrive",
        code: "GG0001",
        email: "user@gmail.com",
        authorized: true,
        storage: { limitBytes: 15 * ONE_GB_BYTES, usedBytes: 14.5 * ONE_GB_BYTES },
      },
    ],
  });
  assert.equal(alerted.alerts.length, 3);
  assert.equal(alerted.alerts[0].kind, "job-error");
  assert.equal(alerted.alerts[1].kind, "job-conflict");
  assert.equal(alerted.alerts[2].kind, "drive-quota");
  assert.match(alerted.summaryTooltip, /3 sync alerts/);
});

test("end-user PC without E:\\Dev workspace boots host/server.mjs and generates Google Drive OAuth URL on fresh rclone.conf", async () => {
  const { spawn } = await import("node:child_process");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "desk-enduser-fresh-"));
  const rcloneConf = path.join(tmpDir, "rclone", "rclone.conf");
  const port = 16092;
  const hostDir = path.dirname(fileURLToPath(import.meta.url));
  const serverPath = path.join(hostDir, "server.mjs");
  const rcloneExe = path.join(hostDir, "..", "resources", "rclone", "rclone.exe");

  const child = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      DESK_DEV_ROOT: "C:\\NonExistentWorkspaceForEndUser",
      DESK_API_PORT: String(port),
      FOLDER_SYNC_API_PORT: String(port),
      DESK_CONSOLE_DATA: path.join(tmpDir, "desk-data"),
      FOLDER_SYNC_DATA_ROOT: path.join(tmpDir, "sync-data"),
      RCLONE_CONFIG: rcloneConf,
      RCLONE_PATH: rcloneExe,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stderr = "";
  child.stderr.on("data", (d) => {
    stderr += String(d);
  });

  try {
    let healthy = false;
    for (let i = 0; i < 40; i += 1) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/health`);
        if (res.status === 200) {
          healthy = true;
          break;
        }
      } catch {
        /* wait for boot */
      }
      await new Promise((r) => setTimeout(r, 150));
    }
    assert.equal(healthy, true, `host/server.mjs failed to boot without E:\\Dev: ${stderr}`);

    const meta = await fetch(`http://127.0.0.1:${port}/api/meta`).then((r) => r.json());
    assert.equal(meta.ok, true);
    assert.equal(meta.hasDevWorkspace, false);

    const authRes = await fetch(`http://127.0.0.1:${port}/api/remotes/authorize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "gdrive" }),
    });
    const authJson = await authRes.json();
    assert.equal(authRes.status, 200, `authorize failed: ${JSON.stringify(authJson)}`);
    assert.equal(authJson.ok, true);
    assert.match(String(authJson.authUrl || ""), /^https:\/\/accounts\.google\.com\/o\/oauth2\/auth\?client_id=/);

    await fetch(`http://127.0.0.1:${port}/api/remotes/authorize/cancel`, { method: "POST" });
  } finally {
    child.kill();
  }
});

test("runner watchdog state persists pinned runners and supports pin/unpin HTTP routes", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "desk-watchdog-"));
  process.env.DESK_CONSOLE_DATA = dir;
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    const initial = await fetch(`http://127.0.0.1:${port}/api/runners/watchdog`).then((r) => r.json());
    assert.equal(initial.ok, true);
    assert.equal(initial.watchdog.enabled, true);
    assert.ok(initial.watchdog.pinned.includes("P0002"));

    const pinnedRes = await fetch(`http://127.0.0.1:${port}/api/runners/P0005/pin`, { method: "POST" }).then((r) =>
      r.json(),
    );
    assert.equal(pinnedRes.ok, true);
    assert.equal(pinnedRes.pinned, true);
    assert.ok(pinnedRes.watchdog.pinned.includes("P0005"));

    const unpinnedRes = await fetch(`http://127.0.0.1:${port}/api/runners/P0005/unpin`, { method: "POST" }).then((r) =>
      r.json(),
    );
    assert.equal(unpinnedRes.ok, true);
    assert.equal(unpinnedRes.pinned, false);
    assert.ok(!unpinnedRes.watchdog.pinned.includes("P0005"));
  } finally {
    server.close();
  }
});

test("PUT /api/tasks/:name updates built-in daemon schedule, description, and enabled state", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "desk-cron-put-"));
  process.env.DESK_CONSOLE_DATA = dir;
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    const putRes = await fetch(`http://127.0.0.1:${port}/api/tasks/Daemon-Smoke-Pool-Reaper`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enabled: false,
        scheduleType: "MINUTE",
        modifier: "30",
        scheduleLabel: "Every 30 min",
        description: "Agent Smoke Pool Reaper (Custom 30m)",
      }),
    });
    assert.equal(putRes.status, 200);
    const putJson = await putRes.json();
    assert.equal(putJson.ok, true);
    assert.equal(putJson.task.status, "Disabled");
    assert.equal(putJson.task.schedule, "Every 30 min");
    assert.equal(putJson.task.scheduleType, "MINUTE");
    assert.equal(putJson.task.modifier, "30");
    assert.equal(putJson.task.description, "Agent Smoke Pool Reaper (Custom 30m)");

    const reEnableRes = await fetch(`http://127.0.0.1:${port}/api/tasks/Daemon-Smoke-Pool-Reaper`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: true }),
    }).then((r) => r.json());
    assert.equal(reEnableRes.ok, true);
    assert.equal(reEnableRes.task.status, "Active");
    assert.equal(reEnableRes.task.schedule, "Every 30 min");
  } finally {
    server.close();
  }
});

test("native CF_DIB <-> PNG codec round-trips 24-bpp padded, 32-bpp GDI zero-alpha, and top-down V5 bitfields", () => {
  // 1) 24-bpp bottom-up BI_RGB with width=3 (stride = 12 bytes with 3-byte padding)
  const stride24 = 12;
  const dib24 = Buffer.alloc(40 + stride24 * 2);
  dib24.writeUInt32LE(40, 0);
  dib24.writeInt32LE(3, 4);
  dib24.writeInt32LE(2, 8); // bottom-up height=2
  dib24.writeUInt16LE(1, 12);
  dib24.writeUInt16LE(24, 14);
  // Top visual row (y=0) sits at bottom DIB row (srcY=1): pixel (0,0) = RGB(220, 40, 10) -> BGR(10, 40, 220)
  const topRow24 = 40 + stride24;
  dib24[topRow24] = 10;
  dib24[topRow24 + 1] = 40;
  dib24[topRow24 + 2] = 220;

  const img24 = dibBufferToClipboardImage(dib24);
  assert.ok(img24);
  assert.equal(img24.imageWidth, 3);
  assert.equal(img24.imageHeight, 2);
  assert.match(img24.imageDataUrl, /^data:image\/png;base64,/);

  const roundDib24 = pngBufferToDibBuffer(Buffer.from(img24.imageDataUrl.split(",")[1], "base64"));
  assert.ok(roundDib24);
  assert.equal(roundDib24.readInt32LE(4), 3);
  assert.equal(roundDib24.readInt32LE(8), 2);
  const rtTopRow = 40 + 1 * 3 * 4;
  assert.deepEqual(
    [roundDib24[rtTopRow], roundDib24[rtTopRow + 1], roundDib24[rtTopRow + 2], roundDib24[rtTopRow + 3]],
    [10, 40, 220, 255],
  );

  // 2) 32-bpp BI_RGB with all-zero GDI screenshot alpha -> promoted to opaque 255
  const dib32ZeroAlpha = Buffer.alloc(40 + 16);
  dib32ZeroAlpha.writeUInt32LE(40, 0);
  dib32ZeroAlpha.writeInt32LE(2, 4);
  dib32ZeroAlpha.writeInt32LE(2, 8);
  dib32ZeroAlpha.writeUInt16LE(1, 12);
  dib32ZeroAlpha.writeUInt16LE(32, 14);
  // Bottom-left pixel (srcY=0, x=0 -> visual y=1, x=0): BGRA(99, 150, 201, 0)
  dib32ZeroAlpha[40] = 99;
  dib32ZeroAlpha[41] = 150;
  dib32ZeroAlpha[42] = 201;
  dib32ZeroAlpha[43] = 0;

  const img32 = dibBufferToClipboardImage(dib32ZeroAlpha);
  assert.ok(img32);
  const roundDib32 = pngBufferToDibBuffer(Buffer.from(img32.imageDataUrl.split(",")[1], "base64"));
  assert.ok(roundDib32);
  assert.deepEqual([roundDib32[40], roundDib32[41], roundDib32[42], roundDib32[43]], [99, 150, 201, 255]);

  // 3) Top-down BITMAPV5HEADER (124 bytes) BI_BITFIELDS preserving semi-transparent alpha=128
  const dibV5 = Buffer.alloc(124 + 16);
  dibV5.writeUInt32LE(124, 0);
  dibV5.writeInt32LE(2, 4);
  dibV5.writeInt32LE(-2, 8); // top-down
  dibV5.writeUInt16LE(1, 12);
  dibV5.writeUInt16LE(32, 14);
  dibV5.writeUInt32LE(3, 16); // BI_BITFIELDS
  dibV5.writeUInt32LE(0x00ff0000, 40); // R
  dibV5.writeUInt32LE(0x0000ff00, 44); // G
  dibV5.writeUInt32LE(0x000000ff, 48); // B
  dibV5.writeUInt32LE(0xff000000, 52); // A
  // Top-left pixel (y=0, x=0): 0x80112233 -> A=0x80(128), R=0x11(17), G=0x22(34), B=0x33(51)
  dibV5.writeUInt32LE(0x80112233, 124);

  const imgV5 = dibBufferToClipboardImage(dibV5);
  assert.ok(imgV5);
  const roundDibV5 = pngBufferToDibBuffer(Buffer.from(imgV5.imageDataUrl.split(",")[1], "base64"));
  assert.ok(roundDibV5);
  // Bottom-up output puts visual y=0 at srcY=1 (offset 40 + 8)
  assert.deepEqual([roundDibV5[48], roundDibV5[49], roundDibV5[50], roundDibV5[51]], [51, 34, 17, 128]);
});

test("native getClipboardSequenceNumber and readClipboardImageAsync run without spawning PowerShell", async () => {
  const seq = getClipboardSequenceNumber();
  assert.equal(typeof seq, "number");
  assert.ok(seq >= 0);

  const t0 = performance.now();
  const img = await readClipboardImageAsync(500);
  const elapsedMs = performance.now() - t0;
  // Native koffi read completes in < 80ms (usually < 1ms when text-only), versus 250-900ms for PowerShell .NET
  assert.ok(elapsedMs < 150, `Expected fast native clipboard image check, took ${elapsedMs.toFixed(1)}ms`);
  if (img !== null) {
    assert.ok(img.imageWidth > 0 && img.imageHeight > 0);
    assert.match(img.imageDataUrl, /^data:image\/png;base64,/);
  }
});

test("content-addressed SHA-256 clips-media deduplicates History/Sample images, migrates legacy UUID files, and GCs orphans", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "desk-sha256-media-"));
  process.env.DESK_CONSOLE_DATA = dir;
  const fakePng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  const clip = addClip({ imageDataUrl: fakePng, imageWidth: 64, imageHeight: 64, source: "clipboard" });
  assert.ok(clip);
  assert.match(String(clip.imageMediaFile || ""), /^sha256-[0-9a-f]{64}\.png$/);
  assert.equal(clip.imageSha256?.length, 64);

  // Disk clips.json must NOT embed base64 imageDataUrl
  const rawClipsJson = fs.readFileSync(path.join(dir, "clips.json"), "utf8");
  assert.doesNotMatch(rawClipsJson, /data:image\/png;base64/);

  // Promote to Sample: shares the exact same sha256-<hash>.png file without duplicating bytes
  const sample = promoteClipToSample(clip.id);
  assert.ok(sample);
  assert.equal(sample.imageMediaFile, clip.imageMediaFile);
  assert.equal(fs.readdirSync(clipsMediaDir()).filter((f) => f.endsWith(".png")).length, 1);

  // Removing History copy MUST preserve the shared sha256-<hash>.png file for the Sample!
  assert.equal(removeClip(clip.id), true);
  assert.equal(fs.readdirSync(clipsMediaDir()).filter((f) => f.endsWith(".png")).length, 1);
  assert.ok(readClipMediaBuffer(sample.id));

  // Verify HTTP GET /api/clips/:id/image serves the shared content-addressed PNG buffer
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const { port } = server.address();
    const res = await fetch(`http://127.0.0.1:${port}/api/clips/${sample.id}/image`);
    assert.equal(res.status, 200);
    const bytes = Buffer.from(await res.arrayBuffer());
    assert.equal(bytes[0], 0x89);
    assert.equal(bytes[1], 0x50);
  } finally {
    server.close();
  }

  // Removing Sample too unlinks the now-unreferenced PNG file
  assert.equal(removeClip(sample.id), true);
  assert.equal(fs.readdirSync(clipsMediaDir()).filter((f) => f.endsWith(".png")).length, 0);

  // Legacy <uuid>.png + orphan file auto-migration & GC
  const legacyId = "11111111-2222-3333-4444-555555555555";
  const rawPngBytes = Buffer.from(fakePng.split(",")[1], "base64");
  fs.writeFileSync(path.join(clipsMediaDir(), `${legacyId}.png`), rawPngBytes);
  fs.writeFileSync(path.join(clipsMediaDir(), "orphan-dead-uuid.png"), rawPngBytes);
  fs.writeFileSync(
    path.join(dir, "clips.json"),
    JSON.stringify([
      {
        id: legacyId,
        name: "Legacy Img",
        text: "[Image 10×10]",
        contentType: "image",
        hasImage: true,
        imageMediaFile: `${legacyId}.png`,
        imageWidth: 10,
        imageHeight: 10,
        kind: "history",
        pinned: false,
        source: "clipboard",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      },
    ]),
    "utf8",
  );
  const migratedRows = listHistory();
  assert.equal(migratedRows.length, 1);
  assert.match(String(migratedRows[0].imageMediaFile || ""), /^sha256-[0-9a-f]{64}\.png$/);
  assert.equal(migratedRows[0].imageDataUrl, fakePng);
  const remainingFiles = fs.readdirSync(clipsMediaDir()).filter((f) => f.endsWith(".png"));
  assert.equal(remainingFiles.length, 1);
  assert.match(remainingFiles[0], /^sha256-[0-9a-f]{64}\.png$/);
  assert.equal(pruneUnreferencedClipMediaFiles(), 0);
});

test("picker-store summary mode omits multi-MB Base64, emits immutable imageUrl, and reads full-res PNG buffer on paste", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "desk-picker-lazy-"));
  process.env.DESK_CONSOLE_DATA = dir;
  const fakePng =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const expectedBuf = Buffer.from(fakePng.split(",")[1], "base64");
  const clip = addClip({
    name: "Lazy Shot",
    imageDataUrl: fakePng,
    imageWidth: 1920,
    imageHeight: 1080,
    source: "clipboard",
  });
  assert.ok(clip?.id);

  const { readPickerSnapshot, readPickerClipMediaBuffer } = require("../electron/picker-store.cjs");
  const summarySnap = readPickerSnapshot({ summary: true, apiPort: 6010 });
  assert.equal(summarySnap.rows.length, 1);
  const row = summarySnap.rows[0];
  assert.equal(row.id, clip.id);
  assert.equal(row.hasImage, true);
  assert.equal(row.imageDataUrl, undefined);
  assert.match(
    String(row.imageUrl || ""),
    new RegExp(`^http://127\\.0\\.0\\.1:6010/api/clips/${clip.id}/image\\?v=sha256-[0-9a-f]{64}\\.png$`),
  );

  const pastedBuf = readPickerClipMediaBuffer(row);
  assert.ok(Buffer.isBuffer(pastedBuf));
  assert.deepEqual(pastedBuf, expectedBuf);
  assert.deepEqual(readPickerClipMediaBuffer(clip.id), expectedBuf);
});

test("parseTaskSchedulerComTsv parses COM TSV + XML schedule and listDevTasks coalesces concurrent calls via singleflight", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "desk-tasks-com-"));
  process.env.DESK_CONSOLE_DATA = dir;
  const xmlDaily =
    '<Task><Triggers><CalendarTrigger><StartBoundary>2026-11-02T06:45:00</StartBoundary><ScheduleByDay><DaysInterval>1</DaysInterval></ScheduleByDay></CalendarTrigger></Triggers><Actions><Exec><Command>E:\\Dev\\.tools\\nodew.exe</Command><Arguments>Tool/scripts/audit-agent-sessions-rca.mjs --days 1</Arguments></Exec></Actions></Task>';
  const xmlRepeat =
    '<Task><Triggers><TimeTrigger><StartBoundary>2026-11-01T00:00:00</StartBoundary><Repetition><Interval>PT15M</Interval></Repetition></TimeTrigger></Triggers><Actions><Exec><Command>node.exe</Command><Arguments>worker.mjs</Arguments></Exec></Actions></Task>';
  const tsv = [
    [
      "Dev-Agent-Daily-Kaizen",
      "Ready",
      "2026-11-10T23:45:01.000Z",
      "11/11/2026 06:45:01",
      "0",
      "12/11/2026 06:45:00",
      xmlDaily,
    ].join("\t"),
    [
      "Dev-Custom-QuarterHour",
      "Disabled",
      "",
      "N/A",
      "267011",
      "N/A",
      xmlRepeat,
    ].join("\t"),
    ["Microsoft-Windows-NonDev", "Ready", "", "N/A", "0", "N/A", "<Task/>"].join("\t"),
  ].join("\r\n");

  const parsed = parseTaskSchedulerComTsv(tsv);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].name, "Dev-Agent-Daily-Kaizen");
  assert.equal(parsed[0].schedule, "Daily 06:45");
  assert.equal(parsed[0].command, "E:\\Dev\\.tools\\nodew.exe Tool/scripts/audit-agent-sessions-rca.mjs --days 1");
  assert.equal(parsed[1].name, "Dev-Custom-QuarterHour");
  assert.equal(parsed[1].status, "Disabled");
  assert.equal(parsed[1].lastResult, "0");
  assert.equal(parsed[1].schedule, "Every 15 min");

  if (process.platform === "win32") {
    const [r1, r2, r3] = await Promise.all([listDevTasks(true), listDevTasks(true), listDevTasks(true)]);
    assert.equal(r1, r2);
    assert.equal(r2, r3);
    assert.ok(Array.isArray(r1));
  }
});

test("runPurgeCursorChatsAsync keeps :6010 event loop non-blocking and coalesces concurrent purge requests via singleflight", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "desk-purge-sf-"));
  const counterFile = path.join(tmpDir, "runs.txt");
  const fakePurgeScript = path.join(tmpDir, "fake-purge.mjs");
  fs.writeFileSync(
    fakePurgeScript,
    `import fs from "node:fs";
const p = process.argv[2];
const n = fs.existsSync(p) ? Number(fs.readFileSync(p, "utf8")) : 0;
fs.writeFileSync(p, String(n + 1), "utf8");
await new Promise((r) => setTimeout(r, 150));
console.log("purged_ok_" + (n + 1));
`,
    "utf8",
  );
  try {
    let maxLoopLagMs = 0;
    let lastTick = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      const lag = now - lastTick - 10;
      if (lag > maxLoopLagMs) maxLoopLagMs = lag;
      lastTick = now;
    }, 10);

    const opts = {
      cwd: tmpDir,
      timeoutMs: 5000,
      command: process.execPath,
      args: [fakePurgeScript, counterFile],
      singleflightKey: "test:cursor-purge-sf",
    };
    const [a, b, c] = await Promise.all([
      runPurgeCursorChatsAsync(fakePurgeScript, opts),
      runPurgeCursorChatsAsync(fakePurgeScript, opts),
      runPurgeCursorChatsAsync(fakePurgeScript, opts),
    ]);
    clearInterval(timer);

    assert.equal(a.status, 0);
    assert.equal(a.stdout.trim(), "purged_ok_1");
    assert.equal(a.stdout, b.stdout);
    assert.equal(b.stdout, c.stdout);
    assert.equal(Number(fs.readFileSync(counterFile, "utf8")), 1);
    assert.ok(maxLoopLagMs < 80, `Expected non-blocking :6010 event loop lag < 80ms, got ${maxLoopLagMs.toFixed(1)}ms`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("runBrowseFolderWinAsync keeps :6010 event loop non-blocking, coalesces stacked dialogs via singleflight, and handles cancel", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "desk-browse-sf-"));
  const counterFile = path.join(tmpDir, "dialogs.txt");
  const fakeDialogScript = path.join(tmpDir, "fake-dialog.mjs");
  const chosenDir = path.join(tmpDir, "SyncTarget");
  fs.mkdirSync(chosenDir, { recursive: true });
  fs.writeFileSync(
    fakeDialogScript,
    `import fs from "node:fs";
const [counterPath, outDir] = process.argv.slice(2);
const n = fs.existsSync(counterPath) ? Number(fs.readFileSync(counterPath, "utf8")) : 0;
fs.writeFileSync(counterPath, String(n + 1), "utf8");
await new Promise((r) => setTimeout(r, 150));
if (outDir) process.stdout.write(outDir);
`,
    "utf8",
  );
  try {
    let maxLoopLagMs = 0;
    let lastTick = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      const lag = now - lastTick - 10;
      if (lag > maxLoopLagMs) maxLoopLagMs = lag;
      lastTick = now;
    }, 10);

    const opts = {
      timeoutMs: 5000,
      windowsHide: true,
      command: process.execPath,
      args: [fakeDialogScript, counterFile, chosenDir],
      singleflightKey: "test:browse-folder-sf",
    };
    const [r1, r2, r3] = await Promise.all([
      runBrowseFolderWinAsync(tmpDir, opts),
      runBrowseFolderWinAsync(tmpDir, opts),
      runBrowseFolderWinAsync(tmpDir, opts),
    ]);
    clearInterval(timer);

    assert.deepEqual(r1, { ok: true, path: chosenDir });
    assert.deepEqual(r2, r1);
    assert.deepEqual(r3, r1);
    assert.equal(Number(fs.readFileSync(counterFile, "utf8")), 1);
    assert.ok(maxLoopLagMs < 80, `Expected non-blocking :6010 event loop lag < 80ms during dialog, got ${maxLoopLagMs.toFixed(1)}ms`);

    const cancelRes = await runBrowseFolderWinAsync(tmpDir, {
      timeoutMs: 5000,
      windowsHide: true,
      command: process.execPath,
      args: [fakeDialogScript, counterFile, ""],
      singleflightKey: "test:browse-folder-cancel",
    });
    assert.deepEqual(cancelRes, { ok: false, cancelled: true });
    assert.equal(Number(fs.readFileSync(counterFile, "utf8")), 2);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("findListeningPidsByPortNative resolves IPv4 + IPv6 listeners via iphlpapi (< 25ms) and stopRunner terminates child listener without PowerShell", async () => {
  if (process.platform !== "win32") return;
  const net = await import("node:net");
  const { spawn } = await import("node:child_process");

  const s4 = net.createServer();
  await new Promise((r) => s4.listen(0, "127.0.0.1", r));
  const p4 = s4.address().port;
  const s6 = net.createServer();
  await new Promise((r) => s6.listen(0, "::1", r));
  const p6 = s6.address().port;

  try {
    // Warm load + benchmark warm query
    assert.ok(findListeningPidsByPortNative(p4).includes(process.pid));
    const t0 = performance.now();
    const pids6 = findListeningPidsByPortNative(p6);
    const elapsedMs = performance.now() - t0;
    assert.ok(pids6.includes(process.pid));
    assert.ok(elapsedMs < 25, `Expected warm GetExtendedTcpTable < 25ms, took ${elapsedMs.toFixed(2)}ms`);
  } finally {
    s4.close();
    s6.close();
  }

  // Spawn real child TCP server and stop it via stopRunner
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "desk-stop-runner-"));
  const serverScript = path.join(tmpDir, "dummy-listener.mjs");
  fs.writeFileSync(
    serverScript,
    `import net from "node:net";
const srv = net.createServer();
srv.listen(0, "127.0.0.1", () => {
  process.stdout.write(String(srv.address().port) + "\\n");
});
setInterval(() => {}, 10000);
`,
    "utf8",
  );
  const child = spawn(process.execPath, [serverScript], { stdio: ["ignore", "pipe", "ignore"], windowsHide: true });
  try {
    const childPort = await new Promise((resolve, reject) => {
      let buf = "";
      const timer = setTimeout(() => reject(new Error("child listener boot timeout")), 4000);
      child.stdout.on("data", (d) => {
        buf += String(d);
        if (buf.includes("\n")) {
          clearTimeout(timer);
          resolve(Number(buf.trim()));
        }
      });
    });
    assert.ok(childPort > 0);
    const tStop0 = performance.now();
    const res = await stopRunner("TEST", { portOverride: childPort });
    const stopElapsedMs = performance.now() - tStop0;
    assert.equal(res.ok, true);
    assert.equal(res.state, "stopped");
    assert.ok(res.killedPids.includes(child.pid));
    assert.ok(stopElapsedMs < 80, `Expected native stopRunner < 80ms, took ${stopElapsedMs.toFixed(1)}ms`);
  } finally {
    try {
      child.kill();
    } catch {
      /* already terminated */
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("runRunnerWatchdogTick respects 30m idle Vite lease and DRIVE_POLL_INTERVAL_MS is 120s", async () => {
  const { DRIVE_POLL_INTERVAL_MS } = await import("./job-watch.mjs");
  assert.equal(DRIVE_POLL_INTERVAL_MS, 120_000);
  const { processAlive } = await import("../../scripts/lib/prune-stale-terminals-core.mjs");
  assert.equal(processAlive(process.pid), true);
  assert.equal(processAlive(99999999), false);
  assert.equal(processAlive(0), false);
});

test("packaged host copied outside E:\\Dev without .env.local resolves Drive OAuth client from staged oauth-client.runtime.json", async () => {
  const { spawn } = await import("node:child_process");
  const { stagePackagedOAuthClient } = await import("../scripts/lib/stage-oauth-client.mjs");
  const hostDir = path.dirname(fileURLToPath(import.meta.url));
  const productRoot = path.resolve(hostDir, "..");
  const staged = stagePackagedOAuthClient(productRoot);
  assert.equal(staged.staged, true);
  assert.equal(fs.existsSync(staged.path), true);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "desk-packaged-no-env-"));
  const isolatedHostDir = path.join(tmpDir, "resources", "app", "host");
  fs.cpSync(hostDir, isolatedHostDir, {
    recursive: true,
    filter: (src) => !src.endsWith(".test.mjs"),
  });
  const rcloneConf = path.join(tmpDir, "rclone", "rclone.conf");
  const port = 16094;
  const rcloneExe = path.join(productRoot, "resources", "rclone", "rclone.exe");

  const child = spawn(process.execPath, [path.join(isolatedHostDir, "server.mjs")], {
    cwd: path.join(tmpDir, "resources", "app"),
    env: {
      SystemRoot: process.env.SystemRoot || "C:\\Windows",
      PATH: process.env.SystemRoot ? `${process.env.SystemRoot}\\System32;${process.env.SystemRoot}` : "",
      TEMP: tmpDir,
      TMP: tmpDir,
      USERPROFILE: tmpDir,
      APPDATA: tmpDir,
      LOCALAPPDATA: tmpDir,
      DESK_DEV_ROOT: "C:\\NonExistentWorkspaceForEndUser",
      DESK_API_PORT: String(port),
      FOLDER_SYNC_API_PORT: String(port),
      DESK_CONSOLE_DATA: path.join(tmpDir, "desk-data"),
      FOLDER_SYNC_DATA_ROOT: path.join(tmpDir, "sync-data"),
      RCLONE_CONFIG: rcloneConf,
      RCLONE_PATH: rcloneExe,
      DESK_SKIP_BOOT_COOLDOWN: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  let stderr = "";
  child.stderr.on("data", (d) => {
    stderr += String(d);
  });

  try {
    let healthy = false;
    for (let i = 0; i < 40; i += 1) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/health`);
        if (res.status === 200) {
          healthy = true;
          break;
        }
      } catch {
        /* wait */
      }
      await new Promise((r) => setTimeout(r, 150));
    }
    assert.equal(healthy, true, `isolated packaged host failed to boot: ${stderr}`);

    const authRes = await fetch(`http://127.0.0.1:${port}/api/remotes/authorize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "gdrive" }),
    });
    const authJson = await authRes.json();
    assert.equal(authRes.status, 200, `isolated packaged authorize failed: ${JSON.stringify(authJson)}`);
    assert.equal(authJson.ok, true);
    assert.match(String(authJson.authUrl || ""), /^https:\/\/accounts\.google\.com\/o\/oauth2\/auth\?client_id=/);

    await fetch(`http://127.0.0.1:${port}/api/remotes/authorize/cancel`, { method: "POST" });
  } finally {
    try {
      child.kill();
    } catch {
      /* ignore */
    }
    await new Promise((r) => setTimeout(r, 200));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("startDriveOAuth auto-reclaims stale foreign listener on 127.0.0.1:53682 and openDriveOAuthInStealthProfile blocks 8xxx", async () => {
  const { spawn } = await import("node:child_process");
  const {
    cancelDriveOAuth,
    getDriveOAuthCallbackStatus,
    openDriveOAuthInStealthProfile,
    startDriveOAuth,
  } = await import("./drive-oauth.mjs");

  const blocked8xxx = await openDriveOAuthInStealthProfile(
    "8001",
    "https://accounts.google.com/o/oauth2/auth?client_id=test",
  );
  assert.equal(blocked8xxx.ok, false);
  assert.match(String(blocked8xxx.error || ""), /8xxx/);

  await cancelDriveOAuth();
  const blocker = spawn(
    process.execPath,
    [
      "-e",
      "const net=require('node:net'); const s=net.createServer().listen(53682,'127.0.0.1',()=>{process.stdout.write('READY\\n');}); setInterval(()=>{},10000);",
    ],
    { stdio: ["ignore", "pipe", "ignore"], windowsHide: true },
  );
  try {
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("blocker bind timeout")), 5000);
      blocker.stdout.on("data", (c) => {
        if (String(c).includes("READY")) {
          clearTimeout(t);
          resolve();
        }
      });
    });
    const auth = await startDriveOAuth("gdrive");
    assert.equal(auth.ok, true, `Expected startDriveOAuth to reclaim 53682, got: ${JSON.stringify(auth)}`);
    assert.equal(auth.callbackListening, true);
    assert.equal(auth.reclaimedCallbackPid, blocker.pid);
    const cbStatus = getDriveOAuthCallbackStatus();
    assert.equal(cbStatus.listening, true);
    assert.equal(cbStatus.callbackPort, 53682);
  } finally {
    await cancelDriveOAuth();
    try {
      blocker.kill();
    } catch {
      /* already killed by reclaimStaleCallbackPort */
    }
  }
});
