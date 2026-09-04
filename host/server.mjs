#!/usr/bin/env node
/**
 * Desk Console host — 127.0.0.1 only. Golden: P0003 local API (not Stealth routes).
 *
 *   node host/server.mjs
 *   DESK_API_PORT=6010 DESK_CONSOLE_DATA=%TEMP%\desk-console-test node host/server.mjs
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startClipboardWatch } from "./clip-watch.mjs";
import {
  addClip,
  addSample,
  ensureSampleSeed,
  findClip,
  listClipRows,
  listClips,
  patchClip,
  promoteClipToSample,
  removeClip,
  restoreClip,
  softDeleteClip,
  dataRoot,
} from "./store.mjs";
import { hotkeysPayload, resetHotkeys, writeHotkeys } from "./hotkeys.mjs";
import { listRunners, startRunner, stopRunner } from "./runners.mjs";
import { listOpsRows, parseOpsRef } from "./ops.mjs";
import { appendOpsHistory, readOpsHistory } from "./ops-history.mjs";
import { logLinesToConsoleEntries, normalizeOpsConsoleTailLine, tailOpsTerminal } from "./ops-log-paths.mjs";
import { appendTerminalLine, appendTaskSchtasksOutput, opsConsoleCmd, opsConsoleMeta, opsConsoleOk, pollTaskTerminalFeedback } from "./ops-terminal.mjs";
import {
  DEV_ROOT,
  cursorCountAsync,
  listDevTasks,
  pasteToForegroundHwndAsync,
  primeClipboardIgnore,
  readClipboardTextAsync,
  runTask,
  setTaskEnabled,
  startDetached,
  writeClipboardTextAsync,
} from "./windows.mjs";

let armedHwnd = "";

const PORT = Number(process.env.DESK_API_PORT || 6010);
const HOST = "127.0.0.1";

function json(res, status, body) {
  const raw = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(raw);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

async function handle(req, res) {
  const url = new URL(req.url || "/", `http://${HOST}`);
  const method = req.method || "GET";
  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if (method === "GET" && url.pathname === "/api/health") {
    let cursorRunning = false;
    try {
      const { createRequire } = await import("node:module");
      const require = createRequire(import.meta.url);
      const { isCursorProcessRunning } = require(path.join(DEV_ROOT, "Tool", "scripts", "lib", "win-shell-env.cjs"));
      cursorRunning = isCursorProcessRunning();
    } catch {
      cursorRunning = (await cursorCountAsync()) > 0;
    }
    json(res, 200, {
      ok: true,
      code: "P0001",
      name: "Desk Console",
      port: PORT,
      dataRoot: dataRoot(),
      syncPlane: "local",
      cursorRunning,
    });
    return;
  }

  if (method === "GET" && url.pathname === "/api/meta") {
    json(res, 200, {
      ok: true,
      code: "P0001",
      port: PORT,
      dataRoot: dataRoot(),
      syncPlane: "local",
      accountLabel: "Local",
      stores: ["clips.json", "samples.json", "hotkeys.json"],
    });
    return;
  }

  if (method === "GET" && url.pathname === "/api/hotkeys") {
    json(res, 200, hotkeysPayload());
    return;
  }
  if (method === "PUT" && url.pathname === "/api/hotkeys") {
    try {
      json(res, 200, hotkeysPayload(writeHotkeys(await readBody(req))));
    } catch (err) {
      json(res, 400, { ok: false, error: String(err?.message || err) });
    }
    return;
  }
  if (method === "POST" && url.pathname === "/api/hotkeys/reset") {
    json(res, 200, hotkeysPayload(resetHotkeys()));
    return;
  }

  if (method === "GET" && url.pathname === "/api/clips") {
    const kind = url.searchParams.get("kind");
    const lifecycle = url.searchParams.get("lifecycle") === "trash" ? "trash" : "live";
    const rows = listClipRows({ lifecycle });
    json(res, 200, {
      ok: true,
      rows: kind === "history" || kind === "sample" ? rows.filter((row) => row.kind === kind) : rows,
    });
    return;
  }
  if (method === "POST" && url.pathname === "/api/clips") {
    const body = await readBody(req);
    const text = String(body.text || "").trim() || (await readClipboardTextAsync());
    if (!text) {
      json(res, 400, { ok: false, error: "empty clip" });
      return;
    }
    const row = addClip({ text, source: body.source || (body.text ? "manual" : "clipboard") });
    json(res, row ? 200 : 400, { ok: Boolean(row), row });
    return;
  }
  if (method === "POST" && url.pathname === "/api/samples") {
    const body = await readBody(req);
    const text = String(body.text || "").trim();
    if (!text) {
      json(res, 400, { ok: false, error: "empty sample" });
      return;
    }
    json(res, 200, { ok: true, row: addSample({ name: body.name, text }) });
    return;
  }
  if (method === "POST" && url.pathname === "/api/clips/clipboard/prime") {
    const body = await readBody(req).catch(() => ({}));
    primeClipboardIgnore(body?.text);
    json(res, 200, { ok: true });
    return;
  }
  if (method === "POST" && url.pathname === "/api/clips/picker/arm") {
    const body = await readBody(req).catch(() => ({}));
    const hwnd = String(body?.hwnd || "").trim();
    if (hwnd && hwnd !== "0") armedHwnd = hwnd;
    json(res, 200, { ok: true, hwnd: armedHwnd });
    return;
  }
  const clipMatch = url.pathname.match(/^\/api\/clips\/([^/]+)(?:\/(pin|copy|paste|sample|restore|forever))?$/);
  if (clipMatch) {
    const id = decodeURIComponent(clipMatch[1]);
    const action = clipMatch[2];
    if (method === "DELETE" && !action) {
      const row = findClip(id);
      if (!row) {
        json(res, 404, { ok: false });
        return;
      }
      if (row.deletedAt) {
        json(res, removeClip(id) ? 200 : 404, { ok: true });
        return;
      }
      const trashed = softDeleteClip(id);
      json(res, trashed ? 200 : 404, { ok: Boolean(trashed), row: trashed });
      return;
    }
    if (method === "POST" && action === "restore") {
      const row = restoreClip(id);
      json(res, row ? 200 : 404, { ok: Boolean(row), row });
      return;
    }
    if (method === "DELETE" && action === "forever") {
      json(res, removeClip(id) ? 200 : 404, { ok: true });
      return;
    }
    if (method === "POST" && action === "pin") {
      const body = await readBody(req);
      const row = patchClip(id, { pinned: body.pinned !== false });
      json(res, row ? 200 : 404, { ok: Boolean(row), row });
      return;
    }
    if (method === "POST" && action === "sample") {
      const row = promoteClipToSample(id);
      json(res, row ? 200 : 404, { ok: Boolean(row), row });
      return;
    }
    if (method === "POST" && (action === "copy" || action === "paste")) {
      const row = findClip(id) || listClips().find((r) => r.id === id);
      if (!row) {
        json(res, 404, { ok: false });
        return;
      }
      await writeClipboardTextAsync(row.text);
      let pasted = false;
      let error = "";
      if (action === "paste") {
        if (!armedHwnd) {
          error = "No target window — focus the field first, then open the paste picker.";
        } else {
          pasted = await pasteToForegroundHwndAsync(armedHwnd);
          if (!pasted) error = "Could not paste to previous window";
        }
      }
      json(res, 200, { ok: true, pasted, error: error || undefined });
      return;
    }
  }

  if (method === "GET" && url.pathname === "/api/ops") {
    json(res, 200, { ok: true, rows: await listOpsRows() });
    return;
  }
  if (method === "GET" && url.pathname === "/api/ops/history") {
    const limit = Math.min(80, Math.max(1, Number(url.searchParams.get("limit") || 40)));
    const target = url.searchParams.get("target") || "";
    let entries = readOpsHistory(limit);
    if (target) {
      const { kind, targetId } = parseOpsRef(target);
      entries = entries.filter((e) => e.kind === kind && e.targetId === targetId);
    }
    json(res, 200, { ok: true, entries });
    return;
  }
  if (method === "GET" && url.pathname === "/api/ops/logs") {
    const target = url.searchParams.get("target") || "";
    const kind = url.searchParams.get("kind") || parseOpsRef(target).kind;
    const targetId = url.searchParams.get("targetId") || parseOpsRef(target).targetId;
    const lines = Math.min(400, Math.max(20, Number(url.searchParams.get("lines") || 200)));
    const tail = tailOpsTerminal(targetId, kind, lines);
    json(res, 200, {
      ok: true,
      path: tail.path,
      exists: tail.exists,
      sources: tail.sources,
      lines: tail.lines,
      entries: logLinesToConsoleEntries(tail.lines, kind === "runner" ? "runner" : "task"),
    });
    return;
  }
  if (method === "GET" && url.pathname === "/api/ops/terminal/stream") {
    const target = url.searchParams.get("target") || "";
    const kind = url.searchParams.get("kind") || parseOpsRef(target).kind;
    const targetId = url.searchParams.get("targetId") || parseOpsRef(target).targetId;
    let byteOffset = 0;
    const boot = tailOpsTerminal(targetId, kind, 400);
    byteOffset = boot.lines.join("\n").length;
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    res.write(": connected\n\n");
    const pump = () => {
      try {
        const tail = tailOpsTerminal(targetId, kind, 400);
        const text = tail.lines.join("\n");
        if (text.length > byteOffset) {
          const chunk = text.slice(byteOffset);
          byteOffset = text.length;
          const lines = chunk
            .split(/\r?\n/)
            .filter((line) => line.length > 0)
            .map(normalizeOpsConsoleTailLine);
          if (lines.length) res.write(`data: ${JSON.stringify({ lines })}\n\n`);
        }
      } catch {
        /* ignore pump errors */
      }
    };
    pump();
    const timer = setInterval(pump, 1000);
    req.on("close", () => clearInterval(timer));
    return;
  }

  if (method === "GET" && url.pathname === "/api/runners") {
    json(res, 200, { ok: true, rows: await listRunners() });
    return;
  }
  const runMatch = url.pathname.match(/^\/api\/runners\/([^/]+)\/(start|restart|recover|stop)$/);
  if (method === "POST" && runMatch) {
    const code = decodeURIComponent(runMatch[1]);
    const mode = runMatch[2];
    if (mode === "stop") {
      const result = await stopRunner(code);
      appendTerminalLine(code, "runner", result.ok ? opsConsoleOk(`stop ${code} ${result.state}`) : opsConsoleCmd(`stop ${code} ${result.error}`));
      appendOpsHistory({
        kind: "runner",
        targetId: code,
        action: "stop",
        ok: result.ok,
        message: result.ok ? `Runner ${code} ${result.state}` : String(result.error),
      });
      json(res, result.ok ? 200 : 404, { ok: result.ok, code, mode, ...result });
      return;
    }
    const pid = startRunner(code, mode);
    appendTerminalLine(code, "runner", opsConsoleOk(`${mode} ${code} pid=${pid ?? "?"}`));
    appendOpsHistory({
      kind: "runner",
      targetId: code,
      action: mode,
      ok: true,
      message: `Runner ${code} ${mode}`,
      pid,
    });
    json(res, 200, { ok: true, pid, code, mode });
    return;
  }

  if (method === "GET" && url.pathname === "/api/tasks") {
    json(res, 200, { ok: true, rows: await listDevTasks() });
    return;
  }
  const taskMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)\/(run|enable|disable)$/);
  if (method === "POST" && taskMatch) {
    const name = decodeURIComponent(taskMatch[1]);
    const action = taskMatch[2];
    try {
      if (action === "run") {
        appendTerminalLine(name, "task", opsConsoleCmd(`schtasks /Run /TN "${name}"`));
        pollTaskTerminalFeedback(name);
        const body = await runTask(name);
        appendTaskSchtasksOutput(name, body.stdout, body.stderr);
        appendOpsHistory({ kind: "task", targetId: name, action: "run", ok: true, message: `Task ${name} started` });
        json(res, 200, body);
      } else {
        const body = await setTaskEnabled(name, action === "enable");
        appendOpsHistory({
          kind: "task",
          targetId: name,
          action,
          ok: true,
          message: `Task ${name} ${action}d`,
        });
        json(res, 200, body);
      }
    } catch (err) {
      appendOpsHistory({
        kind: "task",
        targetId: name,
        action,
        ok: false,
        message: String(err?.message || err),
      });
      json(res, 500, { ok: false, error: String(err?.message || err) });
    }
    return;
  }

  if (method === "POST" && url.pathname === "/api/cursor/gc") {
    const body = await readBody(req).catch(() => ({}));
    const running = (await cursorCountAsync()) > 0;
    if (running && !body.close) {
      json(res, 409, {
        ok: false,
        error: "Cursor is running — File → Exit, or POST { close: true }",
        cursorRunning: true,
      });
      return;
    }
    const script = body.close
      ? path.join(DEV_ROOT, "Tool", "scripts", "cursor-storage-purge-runner.mjs")
      : path.join(DEV_ROOT, ".cursor", "hooks", "purge-cursor-chats.py");
    if (body.close) {
      const pid = startDetached([script]);
      json(res, 200, { ok: true, detached: true, pid });
      return;
    }
    const { spawnSync } = await import("node:child_process");
    const r = spawnSync("python", [script, "--days", "2", "--apply", "--no-backup"], {
      cwd: DEV_ROOT,
      encoding: "utf8",
      windowsHide: true,
      timeout: 600_000,
    });
    json(res, r.status === 0 ? 200 : 500, {
      ok: r.status === 0,
      stdoutTail: String(r.stdout || "").split(/\r?\n/).slice(-16),
      stderrTail: String(r.stderr || "").split(/\r?\n/).slice(-8),
    });
    return;
  }

  json(res, 404, { ok: false, error: "not found" });
}

export function createServer() {
  return http.createServer((req, res) => {
    handle(req, res).catch((err) => {
      json(res, 500, { ok: false, error: String(err?.message || err) });
    });
  });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  ensureSampleSeed();
  const server = createServer();
  server.listen(PORT, HOST, () => {
    console.log(`[desk-host] http://${HOST}:${PORT}`);
    startClipboardWatch();
  });
}
