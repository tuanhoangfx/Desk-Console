#!/usr/bin/env node
/**
 * Fast local Windows test pack — copy UI/host into an already-extracted Electron
 * runtime. Avoids electron-builder's win-unpacked.tmp rename (EPERM / Defender).
 * Ship / NSIS stays `release-desktop.ps1` (P0003 Fast).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.resolve(root, process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : "dist-desk-win/win-unpacked");

const electronExe = path.join(out, "electron.exe");
const productExe = path.join(out, "Desk Console.exe");
if (!fs.existsSync(electronExe) && !fs.existsSync(productExe)) {
  console.error(`[assemble] missing Electron runtime in ${out}`);
  process.exit(1);
}

/** Release file locks before rm/cp (running Desk Console + Defender → EPERM / missing ico). */
function killPackLocks() {
  if (process.platform !== "win32") return;
  const needle = path.normalize(out).toLowerCase().replace(/'/g, "''");
  const ps = [
    `$needle = '${needle}'`,
    "Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -and $_.ExecutablePath.ToLower().StartsWith($needle) } | ForEach-Object {",
    "  try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop; Write-Output ('killed ' + $_.ProcessId) } catch {}",
    "}",
  ].join("; ");
  const r = spawnSync("powershell.exe", ["-NoProfile", "-Command", ps], {
    windowsHide: true,
    encoding: "utf8",
  });
  const outText = `${r.stdout || ""}${r.stderr || ""}`.trim();
  if (outText) console.log(`[assemble] ${outText.split(/\r?\n/).filter(Boolean).join("; ")}`);
}

killPackLocks();

const appDir = path.join(out, "resources", "app");
fs.rmSync(appDir, { recursive: true, force: true });
fs.mkdirSync(appDir, { recursive: true });

for (const rel of ["electron", "host", "dist", "package.json"]) {
  const src = path.join(root, rel);
  if (!fs.existsSync(src)) {
    console.error(`[assemble] missing ${rel}`);
    process.exit(1);
  }
  fs.cpSync(src, path.join(appDir, rel === "package.json" ? "package.json" : rel), { recursive: true });
}

/**
 * Main-process native deps — electron-builder packs these into asar; assemble must copy them
 * or hwnd-once/win-paste crash with "Cannot find module 'koffi'".
 */
const MAIN_NODE_MODULES = ["koffi", path.join("@koromix", "koffi-win32-x64")];
const nmDest = path.join(appDir, "node_modules");
fs.mkdirSync(nmDest, { recursive: true });

function findKoffiNode(dir) {
  if (!fs.existsSync(dir)) return null;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let ents = [];
    try {
      ents = fs.readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of ents) {
      const p = path.join(cur, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === "node_modules" || ent.name === ".git") continue;
        stack.push(p);
      } else if (ent.name.endsWith(".node")) {
        return p;
      }
    }
  }
  return null;
}

/** Prefer shipping @koromix/koffi-win32-x64 (N-API .node) over cnoke/rebuild. */
function ensureKoffiPrebuild(koffiRoot) {
  if (findKoffiNode(koffiRoot)) {
    console.log("[assemble] koffi .node already present under koffi/");
    return true;
  }
  const platformPkg = path.join(root, "node_modules", "@koromix", "koffi-win32-x64");
  if (findKoffiNode(platformPkg)) {
    console.log("[assemble] koffi .node via @koromix/koffi-win32-x64 (copy step below)");
    return true;
  }
  const cnoke = path.join(koffiRoot, "cnoke.cjs");
  if (!fs.existsSync(cnoke)) {
    console.warn("[assemble] koffi cnoke.cjs missing — soft-fail path");
    return false;
  }
  console.log("[assemble] koffi cnoke --prebuild (download native binary for Node ABI)");
  const r = spawnSync(process.execPath, [cnoke, "-P", ".", "-D", "src/koffi", "--prebuild", "--release"], {
    cwd: koffiRoot,
    stdio: "inherit",
    windowsHide: true,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "" },
  });
  if (r.status !== 0) {
    console.warn("[assemble] koffi cnoke prebuild failed — Desk boots; hwnd/paste soft-disabled");
    return false;
  }
  const hit = findKoffiNode(koffiRoot);
  if (hit) {
    console.log(`[assemble] koffi prebuild ok → ${hit}`);
    return true;
  }
  console.warn("[assemble] koffi cnoke finished but no .node found — soft-fail path");
  return false;
}

for (const name of MAIN_NODE_MODULES) {
  const linkOrDir = path.join(root, "node_modules", name);
  if (!fs.existsSync(linkOrDir)) {
    if (String(name).includes("@koromix")) {
      console.warn(`[assemble] missing node_modules/${name} — pnpm add @koromix/koffi-win32-x64`);
      continue;
    }
    console.error(`[assemble] missing node_modules/${name} — pnpm install in product root`);
    process.exit(1);
  }
  const real = fs.realpathSync(linkOrDir);
  if (name === "koffi") ensureKoffiPrebuild(real);
  const dest = path.join(nmDest, name);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(real, dest, { recursive: true });
  console.log(`[assemble] node_modules/${name} ← ${real}`);
}

// Optional Electron ABI rebuild — warn only (cnoke targets Node; Electron may still soft-fail).
{
  const electronPkg = path.join(root, "node_modules", "electron", "package.json");
  let electronVersion = "";
  try {
    electronVersion = JSON.parse(fs.readFileSync(electronPkg, "utf8")).version || "";
  } catch {
    /* ignore */
  }
  const req = createRequire(path.join(root, "package.json"));
  let rebuildBin = "";
  for (const candidate of [
    () => req.resolve("@electron/rebuild/lib/cli.js"),
    () => {
      const store = path.resolve(root, "..", "..", "node_modules", ".pnpm");
      if (!fs.existsSync(store)) return "";
      for (const ent of fs.readdirSync(store)) {
        if (!ent.startsWith("@electron+rebuild@")) continue;
        const cli = path.join(store, ent, "node_modules", "@electron", "rebuild", "lib", "cli.js");
        if (fs.existsSync(cli)) return cli;
      }
      return "";
    },
  ]) {
    try {
      const hit = candidate();
      if (hit && fs.existsSync(hit)) {
        rebuildBin = hit;
        break;
      }
    } catch {
      /* next */
    }
  }
  if (rebuildBin && electronVersion && !findKoffiNode(path.join(nmDest, "koffi"))) {
    console.log(`[assemble] electron-rebuild koffi for electron@${electronVersion}`);
    const electronPrebuilt = path.dirname(fs.realpathSync(path.join(root, "node_modules", "electron", "package.json")));
    const r = spawnSync(
      process.execPath,
      [
        rebuildBin,
        "--force",
        "--only",
        "koffi",
        "--module-dir",
        appDir,
        "--version",
        electronVersion,
        "--electron-prebuilt-dir",
        electronPrebuilt,
      ],
      { cwd: root, stdio: "inherit", windowsHide: true },
    );
    if (r.status !== 0) {
      console.warn("[assemble] electron-rebuild koffi failed — soft-fail via load-koffi.cjs");
    }
  }
}

// Prefer unpacked app/ over a stale asar left by a failed electron-builder rename.
const staleAsar = path.join(out, "resources", "app.asar");
if (fs.existsSync(staleAsar)) {
  fs.rmSync(staleAsar, { force: true });
  console.log("[assemble] removed stale resources/app.asar (app/ is SSOT for this path)");
}

// Native window + taskbar icon — must live unpacked (BrowserWindow cannot load .ico from asar).
const appIco = path.join(root, "build", "icons", "app.ico");
if (fs.existsSync(appIco)) {
  const buildIconsDest = path.join(appDir, "build", "icons");
  fs.mkdirSync(buildIconsDest, { recursive: true });
  fs.copyFileSync(appIco, path.join(buildIconsDest, "app.ico"));
  fs.copyFileSync(appIco, path.join(out, "resources", "app.ico"));
  console.log("[assemble] resources/app.ico + app/build/icons/app.ico");

  const rcedit = path.join(root, ".runtime", "rcedit-x64.exe");
  const stampExe = fs.existsSync(productExe) ? productExe : electronExe;
  if (fs.existsSync(rcedit) && fs.existsSync(stampExe)) {
    const stamp = spawnSync(rcedit, [stampExe, "--set-icon", appIco], {
      windowsHide: true,
      encoding: "utf8",
    });
    if (stamp.status === 0) {
      console.log(`[assemble] rcedit --set-icon → ${path.basename(stampExe)}`);
    } else {
      console.warn(`[assemble] rcedit failed: ${(stamp.stderr || stamp.stdout || "").trim() || stamp.status}`);
    }
  } else {
    console.warn("[assemble] rcedit-x64.exe missing — exe PE icon may stay Electron atom / blank");
  }
} else {
  console.warn("[assemble] missing build/icons/app.ico — window/taskbar may show Electron atom");
}

if (fs.existsSync(electronExe) && !fs.existsSync(productExe)) {
  fs.copyFileSync(electronExe, productExe);
}

const smoke = path.resolve(root, "..", "scripts", "smoke-packaged-shell-icon.mjs");
if (fs.existsSync(smoke)) {
  const s = spawnSync(
    process.execPath,
    [smoke, "--product-root", root, "--exe", productExe, "--resources", path.join(out, "resources")],
    { cwd: root, stdio: "inherit", windowsHide: true },
  );
  if (s.status !== 0) process.exit(s.status ?? 1);
}

console.log(`[assemble] ${productExe}`);
