import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import { dataRoot } from "./store.mjs";

const require = createRequire(import.meta.url);
const HOST_DIR = path.dirname(fileURLToPath(import.meta.url));
const TOOL_ROOT = path.resolve(HOST_DIR, "..");

let _winNativeBindings = undefined;
function getWinNativeBindings() {
  if (_winNativeBindings !== undefined) return _winNativeBindings;
  if (process.platform !== "win32") {
    _winNativeBindings = null;
    return null;
  }
  try {
    const koffi = require("koffi");
    const kernel32 = koffi.load("kernel32.dll");
    const user32 = koffi.load("user32.dll");
    const PROCESSENTRY32W = koffi.struct("WIN_HOST_PROCESSENTRY32W", {
      dwSize: "uint32_t",
      cntUsage: "uint32_t",
      th32ProcessID: "uint32_t",
      th32DefaultHeapID: "uintptr_t",
      th32ModuleID: "uint32_t",
      cntThreads: "uint32_t",
      th32ParentProcessID: "uint32_t",
      pcPriClassBase: "int32_t",
      dwFlags: "uint32_t",
      szExeFile: koffi.array("uint16_t", 260),
    });
    _winNativeBindings = {
      koffi,
      PROCESSENTRY32W,
      CreateToolhelp32Snapshot: kernel32.func("void* __stdcall CreateToolhelp32Snapshot(uint32_t dwFlags, uint32_t th32ProcessID)"),
      Process32FirstW: kernel32.func("int __stdcall Process32FirstW(void* hSnapshot, _Inout_ WIN_HOST_PROCESSENTRY32W* lppe)"),
      Process32NextW: kernel32.func("int __stdcall Process32NextW(void* hSnapshot, _Inout_ WIN_HOST_PROCESSENTRY32W* lppe)"),
      CloseHandle: kernel32.func("int __stdcall CloseHandle(void* hObject)"),
      OpenClipboard: user32.func("int __stdcall OpenClipboard(void* hWndNewOwner)"),
      CloseClipboard: user32.func("int __stdcall CloseClipboard()"),
      EmptyClipboard: user32.func("int __stdcall EmptyClipboard()"),
      GetClipboardSequenceNumber: user32.func("uint32_t __stdcall GetClipboardSequenceNumber()"),
      RegisterClipboardFormatW: user32.func("uint32_t __stdcall RegisterClipboardFormatW(str16 lpszFormat)"),
      GetForegroundWindow: user32.func("uintptr_t __stdcall GetForegroundWindow()"),
      IsClipboardFormatAvailable: user32.func("int __stdcall IsClipboardFormatAvailable(uint32_t format)"),
      GetClipboardData: user32.func("void* __stdcall GetClipboardData(uint32_t uFormat)"),
      SetClipboardData: user32.func("void* __stdcall SetClipboardData(uint32_t uFormat, void* hMem)"),
      GlobalAlloc: kernel32.func("void* __stdcall GlobalAlloc(uint32_t uFlags, uintptr_t dwBytes)"),
      GlobalLock: kernel32.func("void* __stdcall GlobalLock(void* hMem)"),
      GlobalUnlock: kernel32.func("int __stdcall GlobalUnlock(void* hMem)"),
      GlobalSize: kernel32.func("uintptr_t __stdcall GlobalSize(void* hMem)"),
      GlobalFree: kernel32.func("void* __stdcall GlobalFree(void* hMem)"),
      RtlMoveMemory: kernel32.func("void __stdcall RtlMoveMemory(void* Destination, const void* Source, uintptr_t Length)"),
    };
    _winNativeBindings.pngFormatId = Number(_winNativeBindings.RegisterClipboardFormatW("PNG")) || 0;
  } catch {
    _winNativeBindings = null;
  }
  return _winNativeBindings;
}

function readClipboardTextNative() {
  const b = getWinNativeBindings();
  if (!b) return null;
  if (!b.IsClipboardFormatAvailable(13)) return "";
  let opened = false;
  for (let i = 0; i < 5; i++) {
    if (b.OpenClipboard(null)) {
      opened = true;
      break;
    }
  }
  if (!opened) return null;
  try {
    const hData = b.GetClipboardData(13);
    if (!hData) return "";
    const ptr = b.GlobalLock(hData);
    if (!ptr) return "";
    try {
      const byteSize = Number(b.GlobalSize(hData) || 0);
      if (byteSize <= 0) return "";
      const maxChars = Math.min(Math.floor(byteSize / 2), 8 * 1024 * 1024);
      const u16 = b.koffi.decode(ptr, b.koffi.array("uint16_t", maxChars));
      let len = 0;
      while (len < u16.length && u16[len] !== 0) len++;
      return Buffer.from(u16.slice(0, len).buffer, u16.byteOffset, len * 2).toString("utf16le").replace(/\r\n/g, "\n").trimEnd();
    } finally {
      b.GlobalUnlock(hData);
    }
  } catch {
    return null;
  } finally {
    b.CloseClipboard();
  }
}

function writeClipboardTextNative(text) {
  const b = getWinNativeBindings();
  if (!b) return false;
  const str = String(text ?? "");
  const utf16Buf = Buffer.from(str + "\0", "utf16le");
  let opened = false;
  for (let i = 0; i < 5; i++) {
    if (b.OpenClipboard(null)) {
      opened = true;
      break;
    }
  }
  if (!opened) return false;
  try {
    b.EmptyClipboard();
    const hMem = b.GlobalAlloc(0x0042, utf16Buf.length);
    if (!hMem) return false;
    const ptr = b.GlobalLock(hMem);
    if (!ptr) {
      b.GlobalFree(hMem);
      return false;
    }
    b.RtlMoveMemory(ptr, utf16Buf, utf16Buf.length);
    b.GlobalUnlock(hMem);
    if (!b.SetClipboardData(13, hMem)) {
      b.GlobalFree(hMem);
      return false;
    }
    return true;
  } catch {
    return false;
  } finally {
    b.CloseClipboard();
  }
}

function countProcessImageNative(imageName) {
  const b = getWinNativeBindings();
  if (!b) return null;
  const raw = String(imageName || "").trim().toLowerCase();
  if (!raw) return 0;
  const targetExe = raw.endsWith(".exe") ? raw : `${raw}.exe`;
  const hSnap = b.CreateToolhelp32Snapshot(0x00000002, 0);
  if (!hSnap || hSnap === -1) return null;
  let count = 0;
  try {
    const entry = { dwSize: b.koffi.sizeof(b.PROCESSENTRY32W) };
    if (b.Process32FirstW(hSnap, entry)) {
      do {
        const chars = [];
        for (let i = 0; i < entry.szExeFile.length; i++) {
          if (entry.szExeFile[i] === 0) break;
          chars.push(entry.szExeFile[i]);
        }
        const exeName = String.fromCharCode(...chars).toLowerCase();
        if (exeName === targetExe || exeName === raw) count++;
      } while (b.Process32NextW(hSnap, entry));
    }
    return count;
  } catch {
    return null;
  } finally {
    b.CloseHandle(hSnap);
  }
}

let nativeWinPaste = null;
let nativeHwndOnce = null;
try {
  nativeWinPaste = require(path.join(TOOL_ROOT, "electron", "win-paste.cjs"));
  nativeHwndOnce = require(path.join(TOOL_ROOT, "electron", "hwnd-once.cjs"));
} catch {
  /* fallback to PowerShell if koffi unavailable */
}

function findDevRoot() {
  if (process.env.DESK_DEV_ROOT) return path.resolve(process.env.DESK_DEV_ROOT);
  let dir = HOST_DIR;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, "Tool", "scripts", "lib", "workspace-ports.json"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  if (fs.existsSync("E:\\Dev\\Tool\\scripts\\lib\\workspace-ports.json")) {
    return "E:\\Dev";
  }
  return path.resolve(TOOL_ROOT, "../..");
}

const DEV_ROOT = findDevRoot();

function safeSpawnCwd(preferred) {
  const candidate = preferred || DEV_ROOT;
  try {
    if (candidate && fs.existsSync(candidate)) return candidate;
  } catch {
    /* ignore */
  }
  return os.tmpdir();
}

export function winSpawn(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    encoding: "utf8",
    windowsHide: true,
    timeout: opts.timeout ?? 30_000,
    maxBuffer: 16 * 1024 * 1024,
    cwd: safeSpawnCwd(opts.cwd),
  });
}

export function getClipboardSequenceNumber() {
  const b = getWinNativeBindings();
  if (b && typeof b.GetClipboardSequenceNumber === "function") {
    return Number(b.GetClipboardSequenceNumber()) >>> 0;
  }
  if (nativeHwndOnce && typeof nativeHwndOnce.getClipboardSequenceNumber === "function") {
    return nativeHwndOnce.getClipboardSequenceNumber();
  }
  return 0;
}

export function readClipboardText() {
  const nativeText = readClipboardTextNative();
  if (nativeText !== null) return nativeText;
  const r = winSpawn(
    "powershell",
    [
      "-NoProfile",
      "-NonInteractive",
      "-WindowStyle",
      "Hidden",
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
  const nativeText = readClipboardTextNative();
  if (nativeText !== null) return Promise.resolve(nativeText);
  return new Promise((resolve) => {
    const child = spawn(
      "powershell",
      [
        "-NoProfile",
        "-NonInteractive",
        "-WindowStyle",
        "Hidden",
        "-Command",
        "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Clipboard -Raw",
      ],
      {
        detached: process.platform === "win32",
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      },
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
    const child = spawn("powershell", ["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", ...args], {
      detached: process.platform === "win32",
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
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

function spawnWinAsync(cmd, args, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      detached: process.platform === "win32",
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      cwd: safeSpawnCwd(),
    });
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

export function writeClipboardText(text) {
  const value = String(text ?? "");
  ignoreClipboardText = value;
  if (writeClipboardTextNative(value)) return true;
  const r = spawnSync(
    "powershell",
    ["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", "Set-Clipboard -Value $env:DESK_CLIP"],
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
  if (writeClipboardTextNative(value)) return true;
  const r = await runPsAsync(["Set-Clipboard -Value $env:DESK_CLIP"], {
    timeoutMs: 2000,
    env: { ...process.env, DESK_CLIP: value },
  });
  return r.ok;
}

const PNG_CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function pngCrc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c = PNG_CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makePngChunk(type, data) {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(pngCrc32(body), 0);
  return Buffer.concat([lenBuf, body, crcBuf]);
}

function encodeRgbaScanlinesToPng(rawFilteredScanlines, width, height) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = zlib.deflateSync(rawFilteredScanlines, { level: 5 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    makePngChunk("IHDR", ihdr),
    makePngChunk("IDAT", idat),
    makePngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function maskShiftAndScale(mask) {
  const m = mask >>> 0;
  if (!m) return { shift: 0, max: 0 };
  let shift = 0;
  while (((m >>> shift) & 1) === 0 && shift < 32) shift += 1;
  const max = m >>> shift;
  return { shift, max };
}

function extractChannel(val, info) {
  if (!info.max) return 0;
  const raw = (val >>> info.shift) & info.max;
  return info.max === 255 ? raw : Math.round((raw * 255) / info.max);
}

/**
 * Decode a Win32 CF_DIB (BITMAPINFOHEADER / BITMAPV4HEADER / BITMAPV5HEADER) buffer
 * into `{ imageWidth, imageHeight, imageDataUrl }` in memory (0 child processes).
 */
export function dibBufferToClipboardImage(dibBuf) {
  if (!Buffer.isBuffer(dibBuf) || dibBuf.length < 44) return null;
  const headerSize = dibBuf.readUInt32LE(0);
  if (headerSize < 40 || headerSize > dibBuf.length) return null;
  const width = dibBuf.readInt32LE(4);
  const rawHeight = dibBuf.readInt32LE(8);
  const topDown = rawHeight < 0;
  const height = Math.abs(rawHeight);
  const bpp = dibBuf.readUInt16LE(14);
  const compression = dibBuf.readUInt32LE(16);
  const clrUsed = dibBuf.readUInt32LE(32);

  if (width <= 0 || height <= 0 || width > 16384 || height > 16384) return null;
  // BI_PNG (5) embedded inside BITMAPV4/V5 header
  if (compression === 5) {
    const sub = dibBuf.subarray(headerSize);
    if (sub.length > 24 && sub[0] === 0x89 && sub[1] === 0x50 && sub[2] === 0x4e && sub[3] === 0x47) {
      return {
        imageWidth: width,
        imageHeight: height,
        imageDataUrl: `data:image/png;base64,${sub.toString("base64")}`,
      };
    }
    return null;
  }
  if ((bpp !== 32 && bpp !== 24) || (compression !== 0 && compression !== 3)) {
    return null;
  }

  let rMask = 0x00ff0000;
  let gMask = 0x0000ff00;
  let bMask = 0x000000ff;
  let aMask = bpp === 32 ? 0xff000000 : 0;
  let pixelOffset = headerSize + clrUsed * 4;

  if (compression === 3) {
    // BI_BITFIELDS: masks sit at offset 40 (either right after 40-byte BITMAPINFOHEADER or inside V4/V5 header)
    if (dibBuf.length < 52) return null;
    rMask = dibBuf.readUInt32LE(40);
    gMask = dibBuf.readUInt32LE(44);
    bMask = dibBuf.readUInt32LE(48);
    if (headerSize >= 56 && dibBuf.length >= 56) {
      aMask = dibBuf.readUInt32LE(52);
    } else {
      aMask = 0;
      if (headerSize === 40) pixelOffset = 52 + clrUsed * 4;
    }
  }

  const srcStride = bpp === 32 ? width * 4 : (width * 3 + 3) & ~3;
  if (pixelOffset + srcStride * height > dibBuf.length) return null;

  const dstRowBytes = width * 4 + 1;
  const rawScanlines = Buffer.allocUnsafe(dstRowBytes * height);
  const standardBgra =
    rMask === 0x00ff0000 && gMask === 0x0000ff00 && bMask === 0x000000ff;
  const rInfo = maskShiftAndScale(rMask);
  const gInfo = maskShiftAndScale(gMask);
  const bInfo = maskShiftAndScale(bMask);
  const aInfo = maskShiftAndScale(aMask);

  let anyNonZeroAlpha = false;
  for (let y = 0; y < height; y += 1) {
    const srcY = topDown ? y : height - 1 - y;
    const srcRow = pixelOffset + srcY * srcStride;
    const dstRow = y * dstRowBytes;
    rawScanlines[dstRow] = 0; // Filter: None
    if (bpp === 24) {
      for (let x = 0; x < width; x += 1) {
        const s = srcRow + x * 3;
        const d = dstRow + 1 + x * 4;
        rawScanlines[d] = dibBuf[s + 2];
        rawScanlines[d + 1] = dibBuf[s + 1];
        rawScanlines[d + 2] = dibBuf[s];
        rawScanlines[d + 3] = 255;
      }
      anyNonZeroAlpha = true;
    } else if (standardBgra) {
      for (let x = 0; x < width; x += 1) {
        const s = srcRow + x * 4;
        const d = dstRow + 1 + x * 4;
        const a = aMask ? dibBuf[s + 3] : 255;
        if (a !== 0) anyNonZeroAlpha = true;
        rawScanlines[d] = dibBuf[s + 2];
        rawScanlines[d + 1] = dibBuf[s + 1];
        rawScanlines[d + 2] = dibBuf[s];
        rawScanlines[d + 3] = a;
      }
    } else {
      for (let x = 0; x < width; x += 1) {
        const px = dibBuf.readUInt32LE(srcRow + x * 4);
        const d = dstRow + 1 + x * 4;
        const a = aInfo.max ? extractChannel(px, aInfo) : 255;
        if (a !== 0) anyNonZeroAlpha = true;
        rawScanlines[d] = extractChannel(px, rInfo);
        rawScanlines[d + 1] = extractChannel(px, gInfo);
        rawScanlines[d + 2] = extractChannel(px, bInfo);
        rawScanlines[d + 3] = a;
      }
    }
  }

  // Classic GDI 32-bpp BI_RGB screenshots leave every alpha byte = 0x00; promote to opaque 255.
  if (!anyNonZeroAlpha) {
    for (let y = 0; y < height; y += 1) {
      const dstRow = y * dstRowBytes;
      for (let x = 0; x < width; x += 1) {
        rawScanlines[dstRow + 1 + x * 4 + 3] = 255;
      }
    }
  }

  const pngBuf = encodeRgbaScanlinesToPng(rawScanlines, width, height);
  return {
    imageWidth: width,
    imageHeight: height,
    imageDataUrl: `data:image/png;base64,${pngBuf.toString("base64")}`,
  };
}

const MAX_CLIPBOARD_IMAGE_BYTES = 64 * 1024 * 1024;

function readClipboardImageNative() {
  const b = getWinNativeBindings();
  if (!b) return { supported: false, value: null };
  const hasPng = b.pngFormatId > 0 && Boolean(b.IsClipboardFormatAvailable(b.pngFormatId));
  const hasDib = Boolean(b.IsClipboardFormatAvailable(8)); // CF_DIB = 8
  if (!hasPng && !hasDib) {
    // Fast path (<0.01ms): no image on clipboard — return without even calling OpenClipboard!
    return { supported: true, value: null };
  }

  let opened = false;
  for (let i = 0; i < 5; i += 1) {
    if (b.OpenClipboard(null)) {
      opened = true;
      break;
    }
  }
  if (!opened) return { supported: true, value: null };

  try {
    if (hasPng) {
      const hPng = b.GetClipboardData(b.pngFormatId);
      if (hPng) {
        const ptr = b.GlobalLock(hPng);
        if (ptr) {
          try {
            const byteSize = Number(b.GlobalSize(hPng) || 0);
            if (byteSize > 24 && byteSize <= MAX_CLIPBOARD_IMAGE_BYTES) {
              const rawPng = Buffer.allocUnsafe(byteSize);
              b.RtlMoveMemory(rawPng, ptr, byteSize);
              if (
                rawPng[0] === 0x89 &&
                rawPng[1] === 0x50 &&
                rawPng[2] === 0x4e &&
                rawPng[3] === 0x47
              ) {
                const w = rawPng.readUInt32BE(16);
                const h = rawPng.readUInt32BE(20);
                if (w > 0 && h > 0) {
                  return {
                    supported: true,
                    value: {
                      imageWidth: w,
                      imageHeight: h,
                      imageDataUrl: `data:image/png;base64,${rawPng.toString("base64")}`,
                    },
                  };
                }
              }
            }
          } finally {
            b.GlobalUnlock(hPng);
          }
        }
      }
    }

    if (hasDib) {
      const hDib = b.GetClipboardData(8);
      if (hDib) {
        const ptr = b.GlobalLock(hDib);
        if (ptr) {
          try {
            const byteSize = Number(b.GlobalSize(hDib) || 0);
            if (byteSize >= 44 && byteSize <= MAX_CLIPBOARD_IMAGE_BYTES) {
              const dibBuf = Buffer.allocUnsafe(byteSize);
              b.RtlMoveMemory(dibBuf, ptr, byteSize);
              const decoded = dibBufferToClipboardImage(dibBuf);
              if (decoded) {
                return { supported: true, value: decoded };
              }
            }
          } finally {
            b.GlobalUnlock(hDib);
          }
        }
      }
    }
    return { supported: true, value: null };
  } catch {
    return { supported: true, value: null };
  } finally {
    b.CloseClipboard();
  }
}

const READ_CLIP_IMAGE_PS = `Add-Type -AssemblyName System.Windows.Forms, System.Drawing
$img = [System.Windows.Forms.Clipboard]::GetImage()
if ($null -ne $img) {
  $ms = New-Object System.IO.MemoryStream
  $img.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $b64 = [Convert]::ToBase64String($ms.ToArray())
  Write-Output ("{0}|{1}|data:image/png;base64,{2}" -f $img.Width, $img.Height, $b64)
  $ms.Dispose()
  $img.Dispose()
}`;

let ignoreClipboardImageDataUrl = "";

export async function readClipboardImageAsync(timeoutMs = 2500) {
  const nativeRes = readClipboardImageNative();
  if (nativeRes.supported) {
    return nativeRes.value;
  }
  const r = await runPsAsync([READ_CLIP_IMAGE_PS], { timeoutMs });
  if (!r.ok || !r.stdout) return null;
  const line = String(r.stdout || "").trim();
  const m = line.match(/^(\d+)\|(\d+)\|(data:image\/png;base64,.+)$/);
  if (!m) return null;
  return {
    imageWidth: Number(m[1]) || 0,
    imageHeight: Number(m[2]) || 0,
    imageDataUrl: m[3].trim(),
  };
}

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/**
 * Convert an 8-bit non-interlaced RGB/RGBA PNG buffer into a Win32 CF_DIB (32-bpp BGRA BITMAPINFOHEADER)
 * buffer in memory (0 child processes, 0 temp files).
 */
export function pngBufferToDibBuffer(pngBuf) {
  if (
    !Buffer.isBuffer(pngBuf) ||
    pngBuf.length < 33 ||
    pngBuf[0] !== 0x89 ||
    pngBuf[1] !== 0x50 ||
    pngBuf[2] !== 0x4e ||
    pngBuf[3] !== 0x47
  ) {
    return null;
  }
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = -1;
  let interlace = -1;
  const idatParts = [];
  let pos = 8;
  while (pos + 12 <= pngBuf.length) {
    const len = pngBuf.readUInt32BE(pos);
    const type = pngBuf.toString("ascii", pos + 4, pos + 8);
    const dataStart = pos + 8;
    const dataEnd = dataStart + len;
    if (dataEnd + 4 > pngBuf.length) break;
    if (type === "IHDR" && len >= 13) {
      width = pngBuf.readUInt32BE(dataStart);
      height = pngBuf.readUInt32BE(dataStart + 4);
      bitDepth = pngBuf[dataStart + 8];
      colorType = pngBuf[dataStart + 9];
      interlace = pngBuf[dataStart + 12];
    } else if (type === "IDAT") {
      idatParts.push(pngBuf.subarray(dataStart, dataEnd));
    } else if (type === "IEND") {
      break;
    }
    pos = dataEnd + 4;
  }
  if (
    width <= 0 ||
    height <= 0 ||
    width > 16384 ||
    height > 16384 ||
    bitDepth !== 8 ||
    (colorType !== 6 && colorType !== 2) ||
    interlace !== 0 ||
    idatParts.length === 0
  ) {
    return null;
  }
  let inflated;
  try {
    inflated = zlib.inflateSync(Buffer.concat(idatParts));
  } catch {
    return null;
  }
  const channels = colorType === 6 ? 4 : 3;
  const rowBytes = width * channels;
  if (inflated.length < height * (1 + rowBytes)) return null;

  const pixelBytes = width * height * 4;
  const dib = Buffer.alloc(40 + pixelBytes);
  dib.writeUInt32LE(40, 0); // biSize
  dib.writeInt32LE(width, 4); // biWidth
  dib.writeInt32LE(height, 8); // biHeight (bottom-up)
  dib.writeUInt16LE(1, 12); // biPlanes
  dib.writeUInt16LE(32, 14); // biBitCount
  dib.writeUInt32LE(0, 16); // BI_RGB
  dib.writeUInt32LE(pixelBytes, 20); // biSizeImage

  const prevRow = new Uint8Array(rowBytes);
  const curRow = new Uint8Array(rowBytes);
  for (let y = 0; y < height; y += 1) {
    const srcRowStart = y * (1 + rowBytes);
    const filter = inflated[srcRowStart];
    const srcPixels = srcRowStart + 1;
    for (let i = 0; i < rowBytes; i += 1) {
      const raw = inflated[srcPixels + i];
      const left = i >= channels ? curRow[i - channels] : 0;
      const up = prevRow[i];
      const upLeft = i >= channels ? prevRow[i - channels] : 0;
      let val = raw;
      if (filter === 1) val = (raw + left) & 0xff;
      else if (filter === 2) val = (raw + up) & 0xff;
      else if (filter === 3) val = (raw + ((left + up) >>> 1)) & 0xff;
      else if (filter === 4) val = (raw + paethPredictor(left, up, upLeft)) & 0xff;
      else if (filter !== 0) return null;
      curRow[i] = val;
    }
    const dstRow = 40 + (height - 1 - y) * width * 4;
    if (channels === 4) {
      for (let x = 0; x < width; x += 1) {
        const s = x * 4;
        const d = dstRow + x * 4;
        dib[d] = curRow[s + 2]; // B
        dib[d + 1] = curRow[s + 1]; // G
        dib[d + 2] = curRow[s]; // R
        dib[d + 3] = curRow[s + 3]; // A
      }
    } else {
      for (let x = 0; x < width; x += 1) {
        const s = x * 3;
        const d = dstRow + x * 4;
        dib[d] = curRow[s + 2]; // B
        dib[d + 1] = curRow[s + 1]; // G
        dib[d + 2] = curRow[s]; // R
        dib[d + 3] = 255; // A
      }
    }
    prevRow.set(curRow);
  }
  return dib;
}

function allocAndCopyGlobalMem(b, buf) {
  const hMem = b.GlobalAlloc(0x0042, buf.length); // GHND (GMEM_MOVEABLE | GMEM_ZEROINIT)
  if (!hMem) return null;
  const ptr = b.GlobalLock(hMem);
  if (!ptr) {
    b.GlobalFree(hMem);
    return null;
  }
  b.RtlMoveMemory(ptr, buf, buf.length);
  b.GlobalUnlock(hMem);
  return hMem;
}

function writeClipboardImageNative(pngBuf) {
  const b = getWinNativeBindings();
  if (!b) return false;
  const dibBuf = pngBufferToDibBuffer(pngBuf);
  if (!dibBuf) return false;

  let opened = false;
  for (let i = 0; i < 5; i += 1) {
    if (b.OpenClipboard(null)) {
      opened = true;
      break;
    }
  }
  if (!opened) return false;
  try {
    b.EmptyClipboard();
    let ok = false;
    if (b.pngFormatId > 0) {
      const hPng = allocAndCopyGlobalMem(b, pngBuf);
      if (hPng) {
        if (b.SetClipboardData(b.pngFormatId, hPng)) ok = true;
        else b.GlobalFree(hPng);
      }
    }
    const hDib = allocAndCopyGlobalMem(b, dibBuf);
    if (hDib) {
      if (b.SetClipboardData(8, hDib)) ok = true;
      else b.GlobalFree(hDib);
    }
    return ok;
  } catch {
    return false;
  } finally {
    b.CloseClipboard();
  }
}

export async function writeClipboardImageAsync(imageDataUrl) {
  const raw = String(imageDataUrl || "").trim();
  const m = raw.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!m) return false;
  ignoreClipboardImageDataUrl = raw;
  const imgBuf = Buffer.from(m[2], "base64");
  if (m[1].toLowerCase() === "image/png" && writeClipboardImageNative(imgBuf)) {
    return true;
  }
  const tmpFile = path.join(os.tmpdir(), `desk-clip-img-${Date.now()}.png`);
  try {
    fs.writeFileSync(tmpFile, imgBuf);
    const ps = `Add-Type -AssemblyName System.Windows.Forms, System.Drawing; $img = [System.Drawing.Image]::FromFile($env:DESK_CLIP_IMG); [System.Windows.Forms.Clipboard]::SetImage($img); $img.Dispose()`;
    const r = await runPsAsync([ps], {
      timeoutMs: 2500,
      env: { ...process.env, DESK_CLIP_IMG: tmpFile },
    });
    return r.ok;
  } catch {
    return false;
  } finally {
    try {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    } catch {
      /* ignore */
    }
  }
}

export function shouldIgnoreClipboardImage(imageDataUrl) {
  return Boolean(ignoreClipboardImageDataUrl) && imageDataUrl === ignoreClipboardImageDataUrl;
}

export function shouldIgnoreClipboardText(text) {
  return Boolean(ignoreClipboardText) && text === ignoreClipboardText;
}

export function primeClipboardIgnore(text, imageDataUrl) {
  if (text !== undefined) ignoreClipboardText = String(text ?? "");
  if (imageDataUrl !== undefined) ignoreClipboardImageDataUrl = String(imageDataUrl ?? "");
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
  const b = getWinNativeBindings();
  if (b && typeof b.GetForegroundWindow === "function") {
    try {
      const h = b.GetForegroundWindow();
      if (h) return String(h);
    } catch {
      /* ignore */
    }
  }
  if (nativeHwndOnce && typeof nativeHwndOnce.captureForegroundHwnd === "function") {
    const h = nativeHwndOnce.captureForegroundHwnd();
    if (h) return h;
  }
  const r = winSpawn("powershell", ["-NoProfile", "-Command", HWND_PS], { timeout: 2_000 });
  return String(r.stdout || "").trim();
}

const PASTE_PS = `Add-Type @"
using System;
using System.Runtime.InteropServices;
public class DeskPaste {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
}
"@
$h = [IntPtr][int64]HWND
[DeskPaste]::ShowWindow($h, 9) | Out-Null
[DeskPaste]::SetForegroundWindow($h) | Out-Null
Start-Sleep -Milliseconds 90
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait('^v')`;

const PASTE_PY = path.join(HOST_DIR, "scripts", "paste-foreground.py");

function pasteForegroundPsCommand(handle) {
  return PASTE_PS.replace("HWND", handle);
}

function pasteToForegroundHwndViaPython(handle) {
  if (!fs.existsSync(PASTE_PY)) return false;
  const r = winSpawn("python", [PASTE_PY, handle], { timeout: 1_200 });
  return r.status === 0;
}

async function pasteToForegroundHwndViaPythonAsync(handle) {
  if (!fs.existsSync(PASTE_PY)) return false;
  const r = await spawnWinAsync("python", [PASTE_PY, handle], 1200);
  return r.ok;
}

export function pasteToForegroundHwnd(hwnd) {
  const handle = String(hwnd || "").trim();
  if (!handle || handle === "0") return false;
  if (nativeWinPaste && typeof nativeWinPaste.pasteToForegroundHwnd === "function") {
    if (nativeWinPaste.pasteToForegroundHwnd(handle)) return true;
  }
  if (pasteToForegroundHwndViaPython(handle)) return true;
  const r = winSpawn(
    "powershell",
    ["-NoProfile", "-Command", pasteForegroundPsCommand(handle)],
    { timeout: 2_500 },
  );
  return r.status === 0;
}

export async function pasteToForegroundHwndAsync(hwnd) {
  const handle = String(hwnd || "").trim();
  if (!handle || handle === "0") return false;
  if (nativeWinPaste && typeof nativeWinPaste.pasteToForegroundHwnd === "function") {
    if (nativeWinPaste.pasteToForegroundHwnd(handle)) return true;
  }
  if (await pasteToForegroundHwndViaPythonAsync(handle)) return true;
  const r = await runPsAsync([pasteForegroundPsCommand(handle)], { timeoutMs: 2500 });
  return r.ok;
}

const KNOWN_SCHTASK_DESCRIPTIONS = {
  "Dev-Agent-Daily-Kaizen": "Daily Agent RCA, Dual-Xeon NUMA Balance & NVMe SSD ReTrim (06:45)",
  "Dev-Cursor-Chat-Auto-Prune": "Cursor IDE Chat Transcript Auto-Prune (3d retention)",
  "Dev-Cursor-Storage-Purge-If-Closed": "Cursor IDE Workspace Storage Purge when closed",
  "Dev-Home-Server-External-Probe": "Home Server External Reachability & Alert Probe",
  "Dev-Lenovo-Disk-Health": "Monthly Lenovo Host Disk & SMART Health Audit",
  "Dev-P0020-Recheck-Appealed-AI": "Hourly P0020 Recheck Appealed AI Accounts & Restore Active",
  "Dev-Stealth-Disk-Daily-Prune": "Stealth Browser Closed Profile Cache & Orphan Prune",
  "Dev-Supabase-Lenovo-Restore-Drill": "Weekly Supabase Origin Backup & Restore Drill",
  "Dev-Supabase-PhaseD-Reminder": "Supabase Phase-D Cutover Verification Reminder",
  "Dev-Vite-Memory-Gate-P0016": "P0016 Vite Dev Server Memory Gate Sweep",
  "DevWorkspaceBackup": "Hourly Git Multi-Repo Push & Workspace Backup",
};

export function parseWindowsSchtasksDateToIso(raw) {
  const s = String(raw || "").trim();
  if (!s || /^n\/a$/i.test(s) || /^never$/i.test(s) || /^disabled$/i.test(s)) return "";
  const vnMatch = s.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})(?:\s*(SA|CH|AM|PM))?$/i,
  );
  if (vnMatch) {
    let p1 = Number(vnMatch[1]);
    let p2 = Number(vnMatch[2]);
    const year = Number(vnMatch[3]);
    if (year < 2005) return "";
    let hour = Number(vnMatch[4]);
    const minute = Number(vnMatch[5]);
    const second = Number(vnMatch[6]);
    const meridiem = String(vnMatch[7] || "").toUpperCase();
    const isVnMeridiem = meridiem === "SA" || meridiem === "CH";
    let day = p1;
    let month = p2;
    if (!isVnMeridiem && p1 <= 12 && p2 > 12) {
      month = p1;
      day = p2;
    }
    if ((meridiem === "CH" || meridiem === "PM") && hour < 12) hour += 12;
    if ((meridiem === "SA" || meridiem === "AM") && hour === 12) hour = 0;
    const d = new Date(year, month - 1, day, hour, minute, second);
    if (Number.isFinite(d.getTime()) && d.getFullYear() >= 2005) {
      return d.toISOString();
    }
  }
  const parsed = Date.parse(s);
  if (Number.isFinite(parsed)) {
    const d = new Date(parsed);
    if (d.getFullYear() >= 2005) return d.toISOString();
  }
  return "";
}

function normalizeTime24h(rawTime) {
  const s = String(rawTime || "").trim();
  const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?(?:\s*(SA|CH|AM|PM))?$/i);
  if (!m) return "";
  let hour = Number(m[1]);
  const min = m[2];
  const mer = String(m[3] || "").toUpperCase();
  if ((mer === "CH" || mer === "PM") && hour < 12) hour += 12;
  if ((mer === "SA" || mer === "AM") && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${min}`;
}

export function formatSchtasksCycle(scheduleType, startTime, repeatEvery, nextRun) {
  const rep = String(repeatEvery || "").trim();
  const repMatch = rep.match(/(\d+)\s*Hour\(s\),\s*(\d+)\s*Minute\(s\)/i);
  if (repMatch) {
    const hrs = Number(repMatch[1]) || 0;
    const mins = Number(repMatch[2]) || 0;
    if (hrs > 0 && mins > 0) return `Every ${hrs}h ${mins}m`;
    if (hrs > 0) return hrs === 1 ? "Every 1 hour" : `Every ${hrs} hours`;
    if (mins > 0) return `Every ${mins} min`;
  }
  const st = normalizeTime24h(startTime);
  const stType = String(scheduleType || "").trim();
  if (/daily/i.test(stType)) return st ? `Daily ${st}` : "Daily";
  if (/weekly/i.test(stType)) return st ? `Weekly ${st}` : "Weekly";
  if (/monthly/i.test(stType)) return st ? `Monthly ${st}` : "Monthly";
  if (/on idle/i.test(stType)) return "On Idle";
  if (/at logon/i.test(stType)) return "At Logon";
  if (/at system start/i.test(stType)) return "At Startup";
  if (/one time/i.test(stType)) return st ? `One-time ${st}` : "One-time";
  if (nextRun && !/^n\/a$/i.test(nextRun)) return String(nextRun).trim();
  return "Scheduled";
}

function summarizeTaskToRun(name, taskToRun) {
  if (KNOWN_SCHTASK_DESCRIPTIONS[name]) return KNOWN_SCHTASK_DESCRIPTIONS[name];
  const raw = String(taskToRun || "").trim();
  if (!raw || /^n\/a$/i.test(raw)) return "Windows Scheduled Task (Dev-*)";
  const scriptMatch = raw.match(/([A-Za-z0-9_.-]+\.(?:mjs|cjs|js|ps1|py|cmd|bat))(?:\s+(.*))?$/i);
  if (scriptMatch) {
    const args = String(scriptMatch[2] || "").trim();
    return args ? `${scriptMatch[1]} ${args}` : scriptMatch[1];
  }
  return raw.slice(0, 96);
}

const RETIRED_SCHTASKS = new Set([
  "dev-cursor-storage-purge-if-closed",
  "dev-supabase-phased-reminder",
  "dev-vite-memory-gate-p0016",
  "dev-stealth-disk-daily-prune",
]);

function isActiveDevSchtaskName(name) {
  const s = String(name || "").trim();
  return /^Dev(?:-|WorkspaceBackup$)/i.test(s) && !RETIRED_SCHTASKS.has(s.toLowerCase());
}

export function parseSchtasksListVerbose(text) {
  const blocks = String(text || "").split(/^\s*TaskName:\s+/im).slice(1);
  const seen = new Set();
  const rows = [];
  for (const block of blocks) {
    const name = (block.split(/\r?\n/, 1)[0] || "").replace(/^\\/, "").trim();
    if (!name || !isActiveDevSchtaskName(name) || seen.has(name)) continue;
    seen.add(name);
    const pick = (re) => (block.match(re)?.[1] || "").trim();
    const rawLastRun = pick(/^\s*Last Run Time:\s+(.+)$/im);
    const rawLastResult = pick(/^\s*Last Result:\s+(.+)$/im);
    const rawNextRun = pick(/^\s*Next Run Time:\s+(.+)$/im);
    const scheduleType = pick(/^\s*Schedule Type:\s+(.+)$/im);
    const startTime = pick(/^\s*Start Time:\s+(.+)$/im);
    const repeatEvery = pick(/^\s*Repeat: Every:\s+(.+)$/im);
    const taskToRun = pick(/^\s*Task To Run:\s+(.+)$/im);
    const isoLastRun = parseWindowsSchtasksDateToIso(rawLastRun);
    const normalizedResult =
      rawLastResult === "267011" || rawLastResult === "0x41303" ? "0" : rawLastResult;
    rows.push({
      id: name,
      name,
      status: pick(/^\s*Status:\s+(.+)$/im),
      lastRun: isoLastRun || rawLastRun,
      lastRunIso: isoLastRun,
      lastResult: normalizedResult,
      nextRun: rawNextRun,
      schedule: formatSchtasksCycle(scheduleType, startTime, repeatEvery, rawNextRun),
      description: summarizeTaskToRun(name, taskToRun),
      command: taskToRun,
    });
  }
  return rows;
}

let tasksCache = { at: 0, rows: [] };
let tasksInflight = null;
const TASKS_TTL_MS = 30_000;
const NAMES_TTL_MS = 10 * 60_000;
const QUERY_DEV_TASKS_JS = path.join(path.dirname(fileURLToPath(import.meta.url)), "lib", "query-dev-tasks.js");

function decodeXmlEntities(str) {
  return String(str || "")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function parseIsoDurationRepeat(isoDur) {
  const s = String(isoDur || "").trim().toUpperCase();
  if (!s) return "";
  const hm = s.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (hm) {
    const h = Number(hm[1] || 0);
    const m = Number(hm[2] || 0);
    if (h > 0 && m === 0) return `${h} Hour(s), 0 Minute(s)`;
    if (h > 0 || m > 0) return `${h} Hour(s), ${m} Minute(s)`;
  }
  const dm = s.match(/^P(\d+)D$/);
  if (dm) return `${Number(dm[1]) * 24} Hour(s), 0 Minute(s)`;
  return "";
}

function deriveScheduleFromTaskXml(xml, nextRun) {
  const x = String(xml || "");
  if (!x) return nextRun && nextRun !== "N/A" ? nextRun : "Scheduled";
  const sbMatch = x.match(/<StartBoundary>\s*\d{4}-\d{2}-\d{2}T(\d{2}:\d{2})/i);
  const st = sbMatch ? sbMatch[1] : "";
  const repMatch = x.match(/<Repetition>[\s\S]*?<Interval>\s*([^<\s]+)\s*<\/Interval>/i);
  const repeatEvery = repMatch ? parseIsoDurationRepeat(repMatch[1]) : "";
  let scheduleType = "";
  if (repeatEvery) scheduleType = "One Time Only, Minute";
  else if (/<LogonTrigger\b/i.test(x)) scheduleType = "At Logon";
  else if (/<BootTrigger\b/i.test(x)) scheduleType = "At System Start";
  else if (/<IdleTrigger\b/i.test(x)) scheduleType = "On Idle";
  else if (/<ScheduleByDay\b/i.test(x)) scheduleType = "Daily";
  else if (/<ScheduleByWeek\b/i.test(x)) scheduleType = "Weekly";
  else if (/<ScheduleByMonth\b/i.test(x)) scheduleType = "Monthly";
  else if (/<TimeTrigger\b/i.test(x)) scheduleType = "One Time";
  return formatSchtasksCycle(scheduleType, st, repeatEvery, nextRun);
}

function extractCommandFromTaskXml(xml) {
  const x = String(xml || "");
  const cmd = decodeXmlEntities((x.match(/<Command>\s*([\s\S]*?)\s*<\/Command>/i)?.[1] || "").trim());
  const args = decodeXmlEntities((x.match(/<Arguments>\s*([\s\S]*?)\s*<\/Arguments>/i)?.[1] || "").trim());
  if (!cmd) return "";
  return args ? `${cmd} ${args}` : cmd;
}

export function parseTaskSchedulerComTsv(stdout) {
  const rows = [];
  const seen = new Set();
  for (const rawLine of String(stdout || "").split(/\r?\n/)) {
    if (!rawLine.trim()) continue;
    const parts = rawLine.split("\t");
    if (parts.length < 6) continue;
    const [rawName, status, isoLastRun, localLastRun, rawLastResult, rawNextRun, xml = ""] = parts;
    const name = String(rawName || "").replace(/^\\/, "").trim();
    if (!name || !isActiveDevSchtaskName(name) || seen.has(name)) continue;
    seen.add(name);
    const unsignedRes = Number(rawLastResult);
    const hexResult =
      Number.isFinite(unsignedRes) && unsignedRes < 0
        ? `0x${(unsignedRes >>> 0).toString(16)}`
        : String(rawLastResult || "0").trim();
    const normalizedResult =
      hexResult === "267011" || hexResult === "0x41303" ? "0" : hexResult;
    const taskToRun = extractCommandFromTaskXml(xml);
    const cleanIso = isoLastRun || null;
    rows.push({
      id: name,
      name,
      status: String(status || "Ready").trim(),
      lastRun: cleanIso || localLastRun || "N/A",
      lastRunIso: cleanIso,
      lastResult: normalizedResult,
      nextRun: rawNextRun || "N/A",
      schedule: deriveScheduleFromTaskXml(xml, rawNextRun),
      description: summarizeTaskToRun(name, taskToRun),
      command: taskToRun,
    });
  }
  return rows;
}

async function queryDevTasksViaComBatch() {
  if (process.platform !== "win32" || !fs.existsSync(QUERY_DEV_TASKS_JS)) return null;
  const r = await spawnWinAsync("cscript.exe", ["//NoLogo", "//E:JScript", QUERY_DEV_TASKS_JS], 4500);
  if (!r.ok) return null;
  const rows = parseTaskSchedulerComTsv(r.stdout);
  if (rows.length > 0) {
    writeTaskNames(rows.map((row) => row.name));
  }
  return rows;
}

export function taskNamesPath() {
  return path.join(dataRoot(), "task-names.json");
}

export function readTaskNames() {
  try {
    const raw = JSON.parse(fs.readFileSync(taskNamesPath(), "utf8"));
    const names = (Array.isArray(raw.names) ? raw.names : []).map((n) => String(n || "")).filter(isActiveDevSchtaskName);
    return { names, at: Number(raw.at) || 0 };
  } catch {
    return { names: [], at: 0 };
  }
}

export function writeTaskNames(names) {
  const next = [...new Set((names || []).filter(isActiveDevSchtaskName))];
  fs.mkdirSync(dataRoot(), { recursive: true });
  fs.writeFileSync(taskNamesPath(), JSON.stringify({ at: Date.now(), names: next }, null, 2), "utf8");
  return next;
}

export async function queryNamedTask(name) {
  const r = await spawnWinAsync("schtasks", ["/Query", "/TN", name, "/FO", "LIST", "/V"], 3500);
  return parseSchtasksListVerbose(r.stdout)[0] || null;
}

async function discoverDevTasks() {
  const r = await spawnWinAsync("schtasks", ["/Query", "/FO", "LIST"], 5000);
  const discovered = parseSchtasksListVerbose(r.stdout);
  const names = writeTaskNames(discovered.map((row) => row.name));
  const detailed = (await Promise.all(names.map(queryNamedTask))).filter(Boolean);
  return detailed.length ? detailed : discovered;
}

export async function listDevTasks(force = false) {
  if (!force && Date.now() - tasksCache.at < TASKS_TTL_MS && tasksCache.rows.length) {
    return tasksCache.rows;
  }
  if (tasksInflight) {
    return tasksInflight;
  }
  tasksInflight = (async () => {
    try {
      const comRows = await queryDevTasksViaComBatch();
      if (Array.isArray(comRows)) {
        tasksCache = { at: Date.now(), rows: comRows };
        return comRows;
      }
      const stored = readTaskNames();
      if (stored.names.length) {
        const rows = (await Promise.all(stored.names.map(queryNamedTask))).filter(Boolean);
        if (rows.length) {
          tasksCache = { at: Date.now(), rows };
          if (force || Math.abs(Date.now() - stored.at) > NAMES_TTL_MS) void discoverDevTasks();
          return rows;
        }
      }
      const rows = await discoverDevTasks();
      tasksCache = { at: Date.now(), rows };
      return rows;
    } finally {
      tasksInflight = null;
    }
  })();
  return tasksInflight;
}

export async function runTask(taskName) {
  const name = String(taskName || "").replace(/^\\/, "");
  if (!isActiveDevSchtaskName(name)) throw new Error("only Dev-* tasks");
  const r = await spawnWinAsync("schtasks", ["/Run", "/TN", name], 4000);
  tasksCache.at = 0;
  if (!r.ok) throw new Error((r.stderr || r.stdout || "run failed").trim());
  return { ok: true, name, stdout: String(r.stdout || ""), stderr: String(r.stderr || "") };
}

export async function setTaskEnabled(taskName, enabled) {
  const name = String(taskName || "").replace(/^\\/, "");
  if (!isActiveDevSchtaskName(name)) throw new Error("only Dev-* tasks");
  const r = await spawnWinAsync("schtasks", ["/Change", "/TN", name, enabled ? "/ENABLE" : "/DISABLE"], 4000);
  tasksCache.at = 0;
  if (!r.ok) throw new Error((r.stderr || r.stdout || "change failed").trim());
  return { ok: true, name, enabled };
}

export async function createScheduledTask({
  name,
  scheduleType = "DAILY",
  modifier = "1",
  startTime = "04:15",
  command = "",
}) {
  const rawName = String(name || "")
    .replace(/^\\/, "")
    .trim()
    .replace(/[^A-Za-z0-9_-]/g, "-");
  if (!rawName) throw new Error("Task name is required");
  const safeName = /^Dev-/i.test(rawName) ? rawName : `Dev-${rawName}`;
  const tr = String(command || "").trim();
  if (!tr) throw new Error("Task command is required");
  const sc = String(scheduleType || "DAILY").toUpperCase();
  const args = ["/Create", "/TN", safeName, "/TR", tr, "/SC", sc, "/F"];
  if (sc === "MINUTE" || sc === "HOURLY") {
    const mo = Math.max(1, Number(modifier) || (sc === "MINUTE" ? 15 : 6));
    args.push("/MO", String(mo));
  } else if (sc === "DAILY" || sc === "WEEKLY" || sc === "ONCE") {
    const st = /^\d{2}:\d{2}$/.test(String(startTime || "").trim()) ? String(startTime).trim() : "04:15";
    args.push("/ST", st);
    if (sc === "WEEKLY") {
      args.push("/D", "SUN");
    }
  }
  const r = await spawnWinAsync("schtasks", args, 6000);
  tasksCache.at = 0;
  if (!r.ok) throw new Error((r.stderr || r.stdout || "schtasks create failed").trim());
  const stored = readTaskNames();
  writeTaskNames([...stored.names, safeName]);
  const created = await queryNamedTask(safeName);
  return { ok: true, name: safeName, task: created };
}

export async function updateScheduledTask(
  taskName,
  { scheduleType, modifier, startTime, command, enabled } = {},
) {
  const safeName = String(taskName || "").replace(/^\\/, "").trim();
  if (!/^Dev-/i.test(safeName)) throw new Error("only Dev-* tasks can be updated");
  const existing = await queryNamedTask(safeName);
  if (!existing && !command) throw new Error(`Task not found: ${safeName}`);
  const effectiveCmd = String(command || existing?.command || "").trim();
  if (scheduleType || command) {
    await createScheduledTask({
      name: safeName,
      scheduleType: scheduleType || "DAILY",
      modifier,
      startTime,
      command: effectiveCmd,
    });
  }
  if (typeof enabled === "boolean") {
    await setTaskEnabled(safeName, enabled);
  }
  tasksCache.at = 0;
  const updated = await queryNamedTask(safeName);
  return { ok: true, name: safeName, task: updated };
}

export async function deleteScheduledTask(taskName) {
  const name = String(taskName || "").replace(/^\\/, "").trim();
  if (!/^Dev-/i.test(name)) throw new Error("only Dev-* tasks can be deleted");
  const r = await spawnWinAsync("schtasks", ["/Delete", "/TN", name, "/F"], 5000);
  tasksCache.at = 0;
  if (!r.ok) throw new Error((r.stderr || r.stdout || "schtasks delete failed").trim());
  const stored = readTaskNames();
  writeTaskNames(stored.names.filter((n) => n.toLowerCase() !== name.toLowerCase()));
  return { ok: true, name };
}

export function cursorCount() {
  const nativeCount = countProcessImageNative("Cursor.exe");
  if (nativeCount !== null) return nativeCount;
  const r = winSpawn(
    "powershell",
    [
      "-NoProfile",
      "-NonInteractive",
      "-WindowStyle",
      "Hidden",
      "-Command",
      "(Get-Process -Name Cursor -ErrorAction SilentlyContinue | Measure-Object).Count",
    ],
    { timeout: 2_000 },
  );
  return Number(String(r.stdout || "0").trim()) || 0;
}

export async function cursorCountAsync() {
  const nativeCount = countProcessImageNative("Cursor.exe");
  if (nativeCount !== null) return nativeCount;
  const r = await runPsAsync(
    ["(Get-Process -Name Cursor -ErrorAction SilentlyContinue | Measure-Object).Count"],
    { timeoutMs: 1500 },
  );
  return Number(String(r.stdout || "0").trim()) || 0;
}

export function startDetached(nodeArgs) {
  let bin = process.execPath;
  if (process.platform === "win32") {
    const candidates = [
      path.join(DEV_ROOT, ".tools", "node-v22", "node.exe"),
      "C:\\Program Files\\nodejs\\node.exe",
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        bin = c;
        break;
      }
    }
  }
  const isSelfElectron =
    bin === process.execPath && Boolean(process.versions?.electron || process.env.ELECTRON_RUN_AS_NODE);
  const child = spawn(bin, nodeArgs, {
    cwd: DEV_ROOT,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: isSelfElectron ? "1" : "" },
  });
  child.unref();
  return child.pid;
}

export { DEV_ROOT, TOOL_ROOT };
