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
  addCapture,
  addClip,
  addSample,
  capturesDir,
  ensureSampleSeed,
  findClip,
  listCaptures,
  listClipRows,
  listClips,
  patchCapture,
  patchClip,
  promoteClipToSample,
  removeCapture,
  removeClip,
} from "./store.mjs";
import { hotkeysPayload, resetHotkeys, writeHotkeys } from "./hotkeys.mjs";
import { listRunners, startRunner } from "./runners.mjs";
import {
  DEV_ROOT,
  captureScreenPng,
  cropPng,
  cursorCountAsync,
  listDevTasks,
  pasteToForegroundHwndAsync,
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
    json(res, 200, {
      ok: true,
      code: "P0001",
      name: "Desk Console",
      port: PORT,
      cursorRunning: false,
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
    const rows = listClipRows();
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
  if (method === "POST" && url.pathname === "/api/clips/picker/arm") {
    const body = await readBody(req).catch(() => ({}));
    const hwnd = String(body?.hwnd || "").trim();
    if (hwnd && hwnd !== "0") armedHwnd = hwnd;
    json(res, 200, { ok: true, hwnd: armedHwnd });
    return;
  }
  const clipMatch = url.pathname.match(/^\/api\/clips\/([^/]+)(?:\/(pin|copy|paste|sample))?$/);
  if (clipMatch) {
    const id = decodeURIComponent(clipMatch[1]);
    const action = clipMatch[2];
    if (method === "DELETE" && !action) {
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
      if (action === "paste" && armedHwnd) {
        pasted = await pasteToForegroundHwndAsync(armedHwnd);
      }
      json(res, 200, { ok: true, pasted });
      return;
    }
  }

  if (method === "GET" && url.pathname === "/api/captures") {
    json(res, 200, { ok: true, rows: listCaptures() });
    return;
  }
  if (method === "POST" && url.pathname === "/api/captures") {
    const body = await readBody(req);
    const mode = body.mode === "window" ? "window" : body.mode === "region" ? "region" : "screen";
    const fileName = `${Date.now()}-${mode}.png`;
    const dest = path.join(capturesDir(), fileName);
    captureScreenPng(dest);
    const st = fs.statSync(dest);
    json(res, 200, { ok: true, row: addCapture({ mode, fileName, bytes: st.size }) });
    return;
  }
  const capFile = url.pathname.match(/^\/api\/captures\/([^/]+)\/file$/);
  if (method === "GET" && capFile) {
    const id = decodeURIComponent(capFile[1]);
    const row = listCaptures().find((r) => r.id === id);
    if (!row) {
      json(res, 404, { ok: false });
      return;
    }
    const file = path.join(capturesDir(), row.fileName);
    if (!fs.existsSync(file)) {
      json(res, 404, { ok: false, error: "file missing" });
      return;
    }
    res.writeHead(200, { "Content-Type": "image/png", "Access-Control-Allow-Origin": "*" });
    fs.createReadStream(file).pipe(res);
    return;
  }
  const capCrop = url.pathname.match(/^\/api\/captures\/([^/]+)\/crop$/);
  if (method === "POST" && capCrop) {
    const id = decodeURIComponent(capCrop[1]);
    const row = listCaptures().find((r) => r.id === id);
    if (!row) {
      json(res, 404, { ok: false, error: "not found" });
      return;
    }
    const body = await readBody(req);
    const src = path.join(capturesDir(), row.fileName);
    const fileName = `${Date.now()}-region.png`;
    const dest = path.join(capturesDir(), fileName);
    cropPng(src, dest, body);
    const st = fs.statSync(dest);
    try {
      fs.unlinkSync(src);
    } catch {
      /* keep dest */
    }
    const next = patchCapture(id, { mode: "region", fileName, bytes: st.size });
    json(res, 200, { ok: true, row: next });
    return;
  }
  const capDel = url.pathname.match(/^\/api\/captures\/([^/]+)$/);
  if (method === "DELETE" && capDel) {
    json(res, removeCapture(decodeURIComponent(capDel[1])) ? 200 : 404, { ok: true });
    return;
  }

  if (method === "GET" && url.pathname === "/api/runners") {
    json(res, 200, { ok: true, rows: await listRunners() });
    return;
  }
  const runMatch = url.pathname.match(/^\/api\/runners\/([^/]+)\/(start|restart|recover)$/);
  if (method === "POST" && runMatch) {
    const code = decodeURIComponent(runMatch[1]);
    const mode = runMatch[2];
    const pid = startRunner(code, mode);
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
    if (action === "run") json(res, 200, await runTask(name));
    else json(res, 200, await setTaskEnabled(name, action === "enable"));
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
