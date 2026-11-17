/**
 * P0001 Desk Console — Local App Versions, Installer Vault, Update Guard, SxS Builds & VSIX SSOT Adapter.
 * Bridges the shared monorepo installer/version inspector in `Tool/P0010-IDE-Console` into P0001 Desk Console.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DEV_ROOT } from "./windows.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveMonorepoRoot() {
  const candidates = [
    DEV_ROOT,
    path.resolve(__dirname, "../../.."),
    "E:\\Dev",
  ].filter(Boolean);
  for (const root of candidates) {
    const p = path.join(root, "Tool", "P0010-IDE-Console", "scripts", "lib", "ide-installation-inspector.mjs");
    if (fs.existsSync(p)) return root;
  }
  return DEV_ROOT || path.resolve(__dirname, "../../..");
}

const MONOREPO_ROOT = resolveMonorepoRoot();

function getInspectorPath() {
  return path.join(
    MONOREPO_ROOT,
    "Tool",
    "P0010-IDE-Console",
    "scripts",
    "lib",
    "ide-installation-inspector.mjs",
  );
}

let cachedMod = null;

async function loadInspectorModule() {
  if (cachedMod) return cachedMod;
  const inspectorPath = getInspectorPath();
  if (!fs.existsSync(inspectorPath)) {
    return null;
  }
  cachedMod = await import(pathToFileURL(inspectorPath).href);
  return cachedMod;
}

function resolveProductStatus(item) {
  if (!item?.installed) return "Down";
  if (item?.pendingUpdatePresent) return "Pending";
  return "Up";
}

function resolveSxsStatus(inst) {
  if (!inst?.exePath) return "Down";
  return inst?.isRunning ? "Up" : "Disabled";
}

export async function getManagedAppsSnapshot({ includeReleases = false, forceReleases = false } = {}) {
  const mod = await loadInspectorModule();
  if (!mod) {
    return {
      ok: false,
      available: false,
      error: "Requires Developer Workspace (E:\\Dev) to inspect local IDE versions.",
      rows: [],
      releases: [],
      snapshot: null,
    };
  }

  const snapshot = mod.inspectLocalIdeInstallations({ monorepoRoot: MONOREPO_ROOT });
  const checkedAt = snapshot.checkedAt || new Date().toISOString();
  const vsixExtensions = snapshot.vsixVault?.extensions || [];
  const agDesk = snapshot.antigravityDesktop || {};
  const agIde = snapshot.antigravityIde || {};
  const cursorInst = snapshot.cursor || {};
  const claudeInst = snapshot.claudeCode || {};

  let releases = [];
  if (includeReleases && typeof mod.listRemoteAntigravityReleases === "function") {
    const feed = await mod.listRemoteAntigravityReleases(Boolean(forceReleases)).catch(() => null);
    if (feed?.ok && Array.isArray(feed.releases)) {
      releases = feed.releases;
    }
  }

  const rows = [
    {
      id: "app:antigravity",
      name: `Antigravity Desktop${agDesk.version ? ` v${agDesk.version}` : ""}`,
      product: "antigravity",
      kind: "primary",
      version: agDesk.version || null,
      previousUsedVersion: agDesk.previousUsedVersion || null,
      installed: Boolean(agDesk.installed),
      status: resolveProductStatus(agDesk),
      updatePinned: Boolean(agDesk.updatePinned),
      extensionsPinned: Boolean(agIde.extensionsPinned),
      aclLocked: Boolean(agDesk.pendingAclLocked),
      pendingUpdatePresent: Boolean(agDesk.pendingUpdatePresent),
      pendingFileName: agDesk.pendingFileName || null,
      exePath: agDesk.exePath || null,
      installerItems: agDesk.installerItems || [],
      stateSnapshots: agDesk.stateSnapshots || [],
      vsixExtensions: vsixExtensions.filter((x) => x.scope === "shared" || x.scope === "antigravity"),
      detail: [
        agDesk.version ? `v${agDesk.version}` : "Not installed",
        agIde.version ? `IDE v${agIde.version}` : "",
        agDesk.updatePinned ? (agDesk.pendingAclLocked ? "Pinned + ACL" : "Updates Pinned") : "Updates Unpinned",
      ]
        .filter(Boolean)
        .join(" · "),
      log: agDesk.pendingUpdatePresent
        ? `Pending updater staged: ${agDesk.pendingFileName || "installer"}`
        : `${(agDesk.installerItems || []).length} archived installer(s) · ${(agDesk.stateSnapshots || []).length} state snapshot(s)`,
      updated: checkedAt,
    },
    ...(agDesk.sxsInstances || []).map((inst) => ({
      id: `sxs:${inst.version}`,
      name: `Antigravity SxS v${inst.version}`,
      product: "antigravity",
      kind: "sxs",
      version: inst.version,
      installed: Boolean(inst.exePath),
      isRunning: Boolean(inst.isRunning),
      runningPids: inst.runningPids || [],
      status: resolveSxsStatus(inst),
      updatePinned: true,
      aclLocked: false,
      pendingUpdatePresent: false,
      exePath: inst.exePath || null,
      visualTheme: inst.visualTheme || "SxS",
      boundEmail: inst.boundEmail || null,
      boundTier: inst.boundTier || null,
      desktopShortcutExists: Boolean(inst.desktopShortcutExists),
      startMenuShortcutExists: Boolean(inst.startMenuShortcutExists),
      isolatedHomeDir: inst.isolatedHomeDir || null,
      sxsInstance: inst,
      detail: [
        `v${inst.version}`,
        inst.visualTheme || "SxS",
        inst.boundEmail ? `Bound: ${inst.boundEmail}` : "Unbound",
      ].join(" · "),
      log: inst.isRunning
        ? `Running (PID ${(inst.runningPids || []).join(", ") || "live"}) · ${inst.desktopShortcutExists ? ".lnk ready" : "No .lnk"}`
        : `Stopped · ${inst.desktopShortcutExists ? "Desktop + Start Menu .lnk ready" : "No .lnk shortcut"}`,
      updated: inst.boundAt || checkedAt,
    })),
    {
      id: "app:cursor",
      name: `Cursor Desktop${cursorInst.version ? ` v${cursorInst.version}` : ""}`,
      product: "cursor",
      kind: "primary",
      version: cursorInst.version || null,
      commit: cursorInst.commit || null,
      installed: Boolean(cursorInst.installed),
      status: resolveProductStatus(cursorInst),
      updatePinned: Boolean(cursorInst.updatePinned),
      extensionsPinned: Boolean(cursorInst.extensionsPinned),
      aclLocked: false,
      pendingUpdatePresent: Boolean(cursorInst.pendingUpdatePresent),
      pendingFileName: cursorInst.pendingFileName || null,
      exePath: null,
      installerItems: cursorInst.installerItems || [],
      stateSnapshots: cursorInst.stateSnapshots || [],
      vsixExtensions: vsixExtensions.filter((x) => x.scope === "shared" || x.scope === "cursor"),
      detail: [
        cursorInst.version ? `v${cursorInst.version}` : "Not installed",
        `update.mode=${cursorInst.updateMode || "default"}`,
        cursorInst.extensionsPinned ? "Ext Auto-Update OFF" : "Ext Auto-Update ON",
      ].join(" · "),
      log: `${(cursorInst.installerItems || []).length} archived installer(s) · ${(cursorInst.stateSnapshots || []).length} state snapshot(s)`,
      updated: checkedAt,
    },
    {
      id: "app:claude-code",
      name: `Claude Code CLI${claudeInst.version ? ` v${claudeInst.version}` : ""}`,
      product: "claudeCode",
      kind: "cli",
      version: claudeInst.version || null,
      installed: Boolean(claudeInst.installed),
      status: claudeInst.installed ? "Up" : "Down",
      updatePinned: false,
      aclLocked: false,
      pendingUpdatePresent: false,
      exePath: null,
      installerItems: [],
      stateSnapshots: [],
      vsixExtensions: [],
      detail: claudeInst.installed ? `CLI v${claudeInst.version || "installed"}` : "CLI not detected",
      log: claudeInst.installed ? "NPM/Global CLI active" : "Run npm install -g @anthropic-ai/claude-code",
      updated: checkedAt,
    },
  ];

  return {
    ok: true,
    available: true,
    checkedAt,
    rows,
    releases,
    snapshot,
  };
}

export async function runManagedAppAction(action, payload = {}) {
  const mod = await loadInspectorModule();
  if (!mod) {
    return {
      ok: false,
      error: "Requires Developer Workspace (E:\\Dev) to manage IDE installations.",
    };
  }

  const handlers = {
    "pin-updates": async () =>
      mod.pinLocalIdeUpdates({
        pin: payload.pin !== false,
        purgePending: payload.purgePending !== false,
        lockCursor: payload.lockCursor !== false,
        hardLockAcl: typeof payload.hardLockAcl === "boolean" ? payload.hardLockAcl : null,
      }),
    "launch-installer": async () =>
      mod.launchArchivedIdeInstaller({
        monorepoRoot: MONOREPO_ROOT,
        product: payload.product === "cursor" ? "cursor" : "antigravity",
        version: payload.version,
        dryRun: Boolean(payload.dryRun),
      }),
    "fetch-release": async () =>
      mod.fetchAntigravityReleaseToVault({
        monorepoRoot: MONOREPO_ROOT,
        version: payload.version,
        force: Boolean(payload.force),
      }),
    "launch-sxs": async () =>
      mod.launchSideBySideAntigravity({
        monorepoRoot: MONOREPO_ROOT,
        version: payload.version,
        relaunch: Boolean(payload.relaunch),
      }),
    "create-shortcut": async () =>
      mod.ensureSideBySideShortcuts({
        monorepoRoot: MONOREPO_ROOT,
        version: payload.version,
      }),
    snapshot: async () =>
      mod.snapshotIdeUserState({
        monorepoRoot: MONOREPO_ROOT,
        product: payload.product === "cursor" ? "cursor" : "antigravity",
        reason: payload.reason || "manual",
      }),
    restore: async () =>
      mod.restoreIdeUserState({
        monorepoRoot: MONOREPO_ROOT,
        product: payload.product === "cursor" ? "cursor" : "antigravity",
        snapshotId: payload.snapshotId,
      }),
    "vsix-sync": async () =>
      mod.syncLocalVsixVault({
        monorepoRoot: MONOREPO_ROOT,
        force: Boolean(payload.force),
      }),
    "vsix-install": async () =>
      mod.installArchivedVsix({
        monorepoRoot: MONOREPO_ROOT,
        product: payload.product === "cursor" ? "cursor" : "antigravity",
        fileNameOrId: payload.fileNameOrId,
      }),
  };

  const fn = handlers[String(action || "").trim()];
  if (!fn) {
    return { ok: false, error: `Unknown app management action: ${action}` };
  }

  const result = await fn();
  const refreshed = await getManagedAppsSnapshot({ includeReleases: action === "fetch-release" });
  return {
    ...result,
    ok: result?.ok !== false,
    appsState: refreshed,
  };
}
