"use strict";
/**
 * Canonical Electron Dev Identity & Window/Taskbar Badge SSOT
 * Shared across all Desktop Electron products (`P0001`, `P0003`, `P0006`, `P0009`, `P0018`).
 *
 * Unifies:
 * 1. Windows `AppUserModelId`: `<baseAppId>.dev` in Dev vs `<baseAppId>` in Prod.
 * 2. Window Title: `<ProductName> [DEV v<version>]` in Dev vs `<ProductName>` in Prod
 *    (matching P0001 Desk Console's golden pattern).
 * 3. Taskbar Overlay Badge (`win.setOverlayIcon`): crisp 16x16 amber badge on the taskbar
 *    icon when running in Dev mode so Dev and Prod are immediately distinguishable even
 *    when minimized.
 */
const zlib = require("node:zlib");

let _cachedOverlayPngBuffer = null;

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/**
 * Generates a 16x16 RGBA PNG with a dark-bordered amber (#F59E0B) circle + "D" glyph
 * for `win.setOverlayIcon` on Windows taskbar (<1ms, zero external deps).
 */
function createDevTaskbarOverlayPngBuffer() {
  if (_cachedOverlayPngBuffer) return _cachedOverlayPngBuffer;
  const w = 16;
  const h = 16;
  const raw = Buffer.alloc(h * (1 + w * 4), 0);

  // 5x7 bitmap for letter 'D' centered at (6..10, 5..11)
  const glyphD = [
    "11110",
    "10001",
    "10001",
    "10001",
    "10001",
    "10001",
    "11110",
  ];

  const cx = 7.5;
  const cy = 7.5;
  for (let y = 0; y < h; y++) {
    const rowStart = y * (1 + w * 4);
    raw[rowStart] = 0; // filter type 0
    for (let x = 0; x < w; x++) {
      const px = rowStart + 1 + x * 4;
      const dist = Math.hypot(x - cx, y - cy);
      if (dist > 7.4) {
        raw[px] = 0;
        raw[px + 1] = 0;
        raw[px + 2] = 0;
        raw[px + 3] = 0;
        continue;
      }
      const gx = x - 6;
      const gy = y - 5;
      const isGlyph =
        gy >= 0 &&
        gy < glyphD.length &&
        gx >= 0 &&
        gx < glyphD[0].length &&
        glyphD[gy][gx] === "1";

      if (dist > 6.1) {
        // Dark slate border (#0f172a)
        raw[px] = 15;
        raw[px + 1] = 23;
        raw[px + 2] = 42;
        raw[px + 3] = 255;
      } else if (isGlyph) {
        // Dark glyph (#0f172a)
        raw[px] = 15;
        raw[px + 1] = 23;
        raw[px + 2] = 42;
        raw[px + 3] = 255;
      } else {
        // Warm amber fill (#f59e0b)
        raw[px] = 245;
        raw[px + 1] = 158;
        raw[px + 2] = 11;
        raw[px + 3] = 255;
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = zlib.deflateSync(raw);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  _cachedOverlayPngBuffer = Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
  return _cachedOverlayPngBuffer;
}

function applyElectronDevAppId(app, baseAppId, isDev = !app.isPackaged) {
  if (!app || typeof app.setAppUserModelId !== "function" || !baseAppId) return;
  try {
    const clean = String(baseAppId).replace(/\.dev$/i, "");
    app.setAppUserModelId(isDev ? `${clean}.dev` : clean);
  } catch {
    /* ignore */
  }
}

function formatElectronWindowTitle(productName) {
  return String(productName || "Console").trim();
}

function attachElectronDevWindowBadge(win, { productName, version, isDev = false } = {}) {
  if (!win || win.isDestroyed?.() || !isDev) return;
  const cleanTitle = formatElectronWindowTitle(productName);
  const ver = String(version || "").trim();
  try {
    win.setTitle(cleanTitle);
  } catch {
    /* ignore */
  }

  win.on("page-title-updated", (event) => {
    event.preventDefault();
    try {
      if (!win.isDestroyed()) win.setTitle(cleanTitle);
    } catch {
      /* ignore */
    }
  });

  const applyOverlay = () => {
    if (process.platform !== "win32" || win.isDestroyed()) return;
    try {
      const { nativeImage } = require("electron");
      const img = nativeImage.createFromBuffer(createDevTaskbarOverlayPngBuffer());
      if (!img.isEmpty()) {
        win.setOverlayIcon(img, `${cleanTitle} (Dev)`);
      }
    } catch {
      /* ignore */
    }
  };

  win.once("ready-to-show", applyOverlay);
  if (win.webContents) {
    win.webContents.on("did-finish-load", () => {
      applyOverlay();
      try {
        win.webContents
          .executeJavaScript(
            `window.__HUB_ELECTRON_DEV__ = true; window.__HUB_ELECTRON_VERSION__ = ${JSON.stringify(ver)}; document.title = ${JSON.stringify(cleanTitle)}; window.dispatchEvent(new Event("hub:electron-dev-ready"));`,
          )
          .catch(() => {});
      } catch {
        /* ignore */
      }
    });
  }
}

module.exports = {
  createDevTaskbarOverlayPngBuffer,
  applyElectronDevAppId,
  formatElectronWindowTitle,
  attachElectronDevWindowBadge,
};
