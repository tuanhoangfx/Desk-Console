const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { pasteToForegroundHwnd, restoreForegroundHwnd, sendCtrlKey, INPUT_SIZE } = require("./win-paste.cjs");

const VK_A = 0x41;
const VK_C = 0x43;

function ps(command) {
  return spawnSync("powershell", ["-NoProfile", "-Command", command], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 20000,
  });
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function setClipboard(text) {
  const r = ps(`Set-Clipboard -Value ${JSON.stringify(text)}`);
  if (r.status !== 0) throw new Error(String(r.stderr || "Set-Clipboard failed"));
}

function getClipboard() {
  return String(ps("Get-Clipboard | Out-String").stdout || "").replace(/\s+$/g, "");
}

function waitNotepadHwnd(needle, ms) {
  const start = Date.now();
  const escaped = String(needle).replace(/'/g, "''");
  while (Date.now() - start < ms) {
    const r = ps(
      `@(Get-Process | Where-Object { $_.MainWindowTitle -and $_.MainWindowTitle -like '*${escaped}*' } | Select-Object -First 1 -ExpandProperty MainWindowHandle) -join ''`,
    );
    const n = String(r.stdout || "").trim();
    if (n && n !== "0") return n;
    sleep(250);
  }
  return "";
}

test("Windows x64 INPUT union is 40 bytes", () => {
  assert.equal(INPUT_SIZE, 40);
});

test("pasteToForegroundHwnd inserts clipboard at Notepad caret", { timeout: 25000 }, () => {
  if (process.platform !== "win32") return;
  const stamp = `desk-paste-${Date.now()}`;
  const tmp = path.join(os.tmpdir(), `${stamp}.txt`);
  fs.writeFileSync(tmp, "", "utf8");
  const token = `DESKCARET ${stamp}`;
  let hwnd = "";
  try {
    const started = ps(`Start-Process -FilePath notepad.exe -ArgumentList ${JSON.stringify(tmp)}`);
    if (started.status !== 0) throw new Error(String(started.stderr || "Start-Process notepad failed"));
    hwnd = waitNotepadHwnd(stamp, 12000);
    assert.ok(hwnd, "Notepad window handle");
    restoreForegroundHwnd(hwnd);
    sleep(200);
    setClipboard(token);
    const pasted = pasteToForegroundHwnd(hwnd);
    assert.equal(pasted, true);
    sleep(200);
    setClipboard("NOT-THE-PASTE-TOKEN");
    restoreForegroundHwnd(hwnd);
    sleep(80);
    sendCtrlKey(VK_A);
    sleep(40);
    sendCtrlKey(VK_C);
    sleep(80);
    const got = getClipboard()
      .replace(/\r\n/g, "\n")
      .replace(/^\uFEFF/, "")
      .trim();
    assert.equal(got, token);
  } finally {
    ps(
      `Get-Process | Where-Object { $_.MainWindowTitle -and $_.MainWindowTitle -like '*${stamp}*' } | Stop-Process -Force -ErrorAction SilentlyContinue`,
    );
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
});
