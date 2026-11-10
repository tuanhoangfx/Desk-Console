const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const REG_KEYS = [
  {
    root: "HKCU\\Software\\Classes\\Directory\\shell\\DeskConsoleSync",
    label: "Sync with Desk Console",
    argTemplate: "--sync-folder=%1",
  },
  {
    root: "HKCU\\Software\\Classes\\Directory\\Background\\shell\\DeskConsoleSync",
    label: "Sync with Desk Console",
    argTemplate: "--sync-folder=%V",
  },
  {
    root: "HKCU\\Software\\Classes\\*\\shell\\DeskConsoleClip",
    label: "Copy to Desk Console Clips",
    argTemplate: "--clip-file=%1",
  },
];

function cleanPathArg(raw) {
  const s = String(raw || "")
    .trim()
    .replace(/^["']+|["']+$/g, "");
  return s;
}

/**
 * Parse CLI arguments for Windows Explorer context-menu actions:
 * - `--sync-folder=<path>` or `--sync-folder <path>`
 * - `--clip-file=<path>` or `--clip-file <path>`
 */
function parseDeskCliActions(argv = []) {
  let syncFolder = "";
  let clipFile = "";
  const list = Array.isArray(argv) ? argv : [];
  for (let i = 0; i < list.length; i += 1) {
    const token = String(list[i] || "");
    if (token.startsWith("--sync-folder=")) {
      syncFolder = cleanPathArg(token.slice("--sync-folder=".length));
    } else if (token === "--sync-folder" && i + 1 < list.length) {
      syncFolder = cleanPathArg(list[i + 1]);
      i += 1;
    } else if (token.startsWith("--clip-file=")) {
      clipFile = cleanPathArg(token.slice("--clip-file=".length));
    } else if (token === "--clip-file" && i + 1 < list.length) {
      clipFile = cleanPathArg(list[i + 1]);
      i += 1;
    }
  }
  return { syncFolder, clipFile };
}

function regAddValue(key, valueName, data) {
  const args = ["add", key];
  if (valueName) {
    args.push("/v", valueName);
  } else {
    args.push("/ve");
  }
  args.push("/t", "REG_SZ", "/d", data, "/f");
  return spawnSync("reg", args, { windowsHide: true, stdio: "ignore" });
}

/**
 * Register per-user Windows Explorer right-click context menu entries under HKCU\Software\Classes.
 * Does not require Administrator / UAC elevation.
 */
function registerExplorerContextMenu(opts = {}) {
  if (process.platform !== "win32") return { ok: false, reason: "non-win32" };
  const execPath = String(opts.execPath || process.execPath || "").trim();
  if (!execPath) return { ok: false, reason: "missing-execPath" };
  const iconPath = String(opts.iconPath || execPath).trim();
  try {
    for (const item of REG_KEYS) {
      regAddValue(item.root, "", item.label);
      regAddValue(item.root, "Icon", `"${iconPath}",0`);
      const cmd = `"${execPath}" "${item.argTemplate}"`;
      regAddValue(`${item.root}\\command`, "", cmd);
    }
    return { ok: true, registered: REG_KEYS.length };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

function unregisterExplorerContextMenu() {
  if (process.platform !== "win32") return { ok: false, reason: "non-win32" };
  for (const item of REG_KEYS) {
    spawnSync("reg", ["delete", item.root, "/f"], { windowsHide: true, stdio: "ignore" });
  }
  return { ok: true };
}

const IMAGE_MIME_BY_EXT = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
};

/**
 * Build a clip payload from a local file selected via "Copy to Desk Console Clips".
 */
function buildClipPayloadFromFile(filePath, nativeImage) {
  const target = cleanPathArg(filePath);
  if (!target || !fs.existsSync(target)) {
    return null;
  }
  const stat = fs.statSync(target);
  const baseName = path.basename(target);
  if (stat.isDirectory()) {
    return {
      name: baseName || target,
      text: target,
      contentType: "text",
      source: "explorer",
    };
  }
  const ext = path.extname(target).toLowerCase();
  const mime = IMAGE_MIME_BY_EXT[ext];
  if (mime && stat.size <= 12 * 1024 * 1024) {
    const buf = fs.readFileSync(target);
    let width = 0;
    let height = 0;
    if (nativeImage && typeof nativeImage.createFromPath === "function") {
      try {
        const img = nativeImage.createFromPath(target);
        if (!img.isEmpty()) {
          const sz = img.getSize();
          width = sz.width || 0;
          height = sz.height || 0;
        }
      } catch {
        /* ignore */
      }
    }
    const imageDataUrl = `data:${mime};base64,${buf.toString("base64")}`;
    return {
      name: baseName,
      text: width && height ? `[Image ${baseName} ${width}×${height}]` : `[Image ${baseName}]`,
      contentType: "image",
      imageDataUrl,
      ...(width ? { imageWidth: width } : {}),
      ...(height ? { imageHeight: height } : {}),
      source: "explorer",
    };
  }
  if (stat.size <= 512 * 1024) {
    const buf = fs.readFileSync(target);
    const hasNullByte = buf.includes(0);
    if (!hasNullByte) {
      const text = buf.toString("utf8").replace(/\r\n/g, "\n").trimEnd();
      if (text) {
        return {
          name: baseName,
          text,
          contentType: "text",
          source: "explorer",
        };
      }
    }
  }
  return {
    name: baseName || target,
    text: target,
    contentType: "text",
    source: "explorer",
  };
}

module.exports = {
  REG_KEYS,
  parseDeskCliActions,
  registerExplorerContextMenu,
  unregisterExplorerContextMenu,
  buildClipPayloadFromFile,
};
