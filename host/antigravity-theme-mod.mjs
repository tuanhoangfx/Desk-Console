/**
 * P0001 Desk Console — Antigravity Custom Theme Mod & Sidebar Quota host adapter.
 * Centralizes SxS ASAR patching, restore, preset catalog, and `custom-theme-settings.json` management.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { DEV_ROOT } from "./windows.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const reqCjs = createRequire(import.meta.url);
const rawFs = (() => {
  if (!process.versions?.electron) return fs;
  try {
    return reqCjs("original-fs");
  } catch {
    return fs;
  }
})();
const asarInspectCache = new Map();
let quotaCache = { ts: 0, ideConsoleDir: "", byEmail: new Map(), currentEmail: "" };

export const DEFAULT_THEME_MOD_CONFIG = Object.freeze({
  enabled: true,
  preset: "cyber-horizon",
  customWallpaperDataUrl: "",
  wallpaperBlurPx: 0,
  backdropDim: 0.24,
  sidebarOpacity: 0.42,
  panelOpacity: 0.72,
  codeOpacity: 0.74,
  quotaOpacity: 0.56,
  quotaAccent: "cyan",
  showSidebarQuota: true,
  opaqueNativeDialogs: true,
  composerGradient: "cyan-indigo",
  composerOpacity: 0.8,
  accentColor: "#818cf8",
  overrides: {},
});

export const BUILTIN_THEME_MOD_PRESETS = Object.freeze([
  { id: "cyber-horizon", label: "Cyber Horizon", kind: "procedural", accentColor: "#818cf8" },
  { id: "twilight-tide", label: "Twilight Tide", kind: "image", accentColor: "#38bdf8" },
  { id: "midnight-aurora", label: "Midnight Aurora", kind: "procedural", accentColor: "#2dd4bf" },
  { id: "obsidian-ember", label: "Obsidian Ember", kind: "procedural", accentColor: "#f59e0b" },
]);

function resolveMonorepoRoot() {
  const candidates = [DEV_ROOT, path.resolve(__dirname, "../../.."), "E:\\Dev"].filter(Boolean);
  for (const root of candidates) {
    if (fs.existsSync(path.join(root, "Tool", "scripts", "antigravity-theme-mod", "asar-patcher.cjs"))) {
      return root;
    }
  }
  return DEV_ROOT || path.resolve(__dirname, "../../..");
}

function resolvePaths(opts = {}) {
  const mono = resolveMonorepoRoot();
  const sxsRoot = opts.sxsRoot || path.join(mono, ".tools", "antigravity-sxs");
  const configPath = opts.configPath || path.join(sxsRoot, "custom-theme-settings.json");
  const patcherPath = path.join(mono, "Tool", "scripts", "antigravity-theme-mod", "asar-patcher.cjs");
  return { mono, sxsRoot, configPath, patcherPath };
}

let cachedPatcherMtimeMs = 0;

function loadPatcher(opts = {}) {
  if (opts.patcher) return opts.patcher;
  const { patcherPath } = resolvePaths(opts);
  if (!fs.existsSync(patcherPath)) return null;
  try {
    const mtimeMs = fs.statSync(patcherPath).mtimeMs;
    const resolved = reqCjs.resolve(patcherPath);
    if (mtimeMs !== cachedPatcherMtimeMs && reqCjs.cache?.[resolved]) {
      delete reqCjs.cache[resolved];
    }
    cachedPatcherMtimeMs = mtimeMs;
  } catch {
    /* ignore cache stat failure */
  }
  return reqCjs(patcherPath);
}

function normalizeConfig(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const clamp = (val, min, max, fallback) => {
    const n = Number(val);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  };
  return {
    enabled: typeof src.enabled === "boolean" ? src.enabled : DEFAULT_THEME_MOD_CONFIG.enabled,
    preset: typeof src.preset === "string" && src.preset.trim() ? src.preset.trim() : DEFAULT_THEME_MOD_CONFIG.preset,
    customWallpaperDataUrl: typeof src.customWallpaperDataUrl === "string" ? src.customWallpaperDataUrl : "",
    wallpaperBlurPx: clamp(src.wallpaperBlurPx, 0, 24, DEFAULT_THEME_MOD_CONFIG.wallpaperBlurPx),
    backdropDim: clamp(src.backdropDim, 0, 0.9, DEFAULT_THEME_MOD_CONFIG.backdropDim),
    sidebarOpacity: clamp(src.sidebarOpacity, 0.1, 1, DEFAULT_THEME_MOD_CONFIG.sidebarOpacity),
    panelOpacity: clamp(src.panelOpacity, 0.1, 1, DEFAULT_THEME_MOD_CONFIG.panelOpacity),
    codeOpacity: clamp(src.codeOpacity, 0.1, 1, DEFAULT_THEME_MOD_CONFIG.codeOpacity),
    quotaOpacity: clamp(src.quotaOpacity, 0.1, 1, DEFAULT_THEME_MOD_CONFIG.quotaOpacity),
    quotaAccent: ["cyan", "emerald", "sky", "amber", "violet"].includes(String(src.quotaAccent))
      ? String(src.quotaAccent)
      : DEFAULT_THEME_MOD_CONFIG.quotaAccent,
    showSidebarQuota:
      typeof src.showSidebarQuota === "boolean" ? src.showSidebarQuota : DEFAULT_THEME_MOD_CONFIG.showSidebarQuota,
    opaqueNativeDialogs:
      typeof src.opaqueNativeDialogs === "boolean"
        ? src.opaqueNativeDialogs
        : DEFAULT_THEME_MOD_CONFIG.opaqueNativeDialogs,
    composerGradient:
      typeof src.composerGradient === "string" && src.composerGradient.trim()
        ? src.composerGradient.trim()
        : DEFAULT_THEME_MOD_CONFIG.composerGradient,
    composerOpacity: clamp(src.composerOpacity, 0.1, 1, DEFAULT_THEME_MOD_CONFIG.composerOpacity),
    accentColor:
      typeof src.accentColor === "string" && /^#[0-9a-fA-F]{3,8}$/.test(src.accentColor.trim())
        ? src.accentColor.trim()
        : DEFAULT_THEME_MOD_CONFIG.accentColor,
    overrides: src.overrides && typeof src.overrides === "object" && !Array.isArray(src.overrides) ? src.overrides : {},
  };
}

export function readAntigravityThemeModConfig(opts = {}) {
  const { configPath } = resolvePaths(opts);
  const exists = fs.existsSync(configPath);
  if (!exists) {
    return { exists: false, configPath, config: normalizeConfig({}) };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(configPath, "utf8"));
    return { exists: true, configPath, config: normalizeConfig(parsed) };
  } catch {
    return { exists: true, configPath, config: normalizeConfig({}) };
  }
}

export function saveAntigravityThemeModConfig(patch = {}, opts = {}) {
  const { configPath } = resolvePaths(opts);
  const current = readAntigravityThemeModConfig(opts).config;
  let nextOverrides =
    patch?.overrides && typeof patch.overrides === "object" && !Array.isArray(patch.overrides)
      ? { ...patch.overrides }
      : { ...(current.overrides || {}) };
  if (patch?.scopeKey && typeof patch.scopeKey === "string" && patch.scopeKey !== "global") {
    const scopeKey = patch.scopeKey.trim();
    if (patch.clearScopeOverride) {
      delete nextOverrides[scopeKey];
    } else if (patch.scopePatch && typeof patch.scopePatch === "object") {
      nextOverrides[scopeKey] = {
        ...(nextOverrides[scopeKey] || {}),
        ...patch.scopePatch,
      };
    }
  }
  const merged = normalizeConfig({
    ...current,
    ...(patch && typeof patch === "object" ? patch : {}),
    overrides: nextOverrides,
  });
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  const tmpPath = `${configPath}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  fs.renameSync(tmpPath, configPath);
  return { ok: true, configPath, config: merged };
}

export function getAntigravityThemeModStatus(opts = {}) {
  const patcher = loadPatcher(opts);
  if (!patcher) {
    return { ok: false, statusCode: 404, error: "Antigravity theme mod patcher not found" };
  }
  const { sxsRoot } = resolvePaths(opts);
  const runningSet = patcher.getRunningAntigravityVersions();
  const versions = patcher
    .listVersions(sxsRoot)
    .reverse()
    .map((v) => patcher.inspectVersion(v, runningSet, sxsRoot));
  const { exists, configPath, config } = readAntigravityThemeModConfig(opts);
  return {
    ok: true,
    sxsRoot,
    configPath,
    settingsExists: exists,
    config,
    presets: BUILTIN_THEME_MOD_PRESETS,
    versions,
  };
}

export function getAntigravityThemeModQuickSnapshot({ runningVersions = [], forceRefresh = false } = {}, opts = {}) {
  const patcher = loadPatcher(opts);
  const { config } = readAntigravityThemeModConfig(opts);
  const { sxsRoot } = resolvePaths(opts);
  if (!patcher) {
    return {
      ok: false,
      config,
      presets: BUILTIN_THEME_MOD_PRESETS,
      byVersion: {},
      patchedCount: 0,
      totalCount: 0,
    };
  }
  const runningSet = new Set(
    (runningVersions || []).map((v) => {
      const s = String(v || "").trim();
      return s.startsWith("v") ? s : `v${s}`;
    }),
  );
  const byVersion = {};
  let patchedCount = 0;
  const allVers = patcher.listVersions(sxsRoot);
  for (const ver of allVers) {
    const asarPath = path.join(sxsRoot, ver, "resources", "app.asar");
    let sig = "";
    try {
      const st = rawFs.statSync(asarPath);
      sig = `${st.size}:${Math.trunc(st.mtimeMs)}`;
    } catch {
      sig = "missing";
    }
    const cached = !forceRefresh ? asarInspectCache.get(asarPath) : null;
    const inspected =
      cached && cached.sig === sig
        ? { ...cached.info, running: runningSet.has(ver) }
        : (() => {
            const info = patcher.inspectVersion(ver, runningSet, sxsRoot);
            asarInspectCache.set(asarPath, { sig, info });
            return info;
          })();
    if (inspected.patched) patchedCount += 1;
    const verNoPrefix = ver.replace(/^v/i, "");
    const overrideEntry = config.overrides?.[`version:${ver}`] || config.overrides?.[`version:v${verNoPrefix}`] || null;
    const effectivePreset = (overrideEntry && typeof overrideEntry.preset === "string" && overrideEntry.preset) || config.preset;
    const presetMeta = BUILTIN_THEME_MOD_PRESETS.find((p) => p.id === effectivePreset);
    byVersion[ver] = {
      patched: Boolean(inspected.patched),
      hasBackup: Boolean(inspected.hasBackup),
      running: Boolean(inspected.running),
      presetId: effectivePreset,
      presetLabel: presetMeta?.label || effectivePreset,
      isOverride: Boolean(overrideEntry && overrideEntry.preset),
    };
    byVersion[verNoPrefix] = byVersion[ver];
  }
  return {
    ok: true,
    config,
    presets: BUILTIN_THEME_MOD_PRESETS,
    byVersion,
    patchedCount,
    totalCount: allVers.length,
  };
}

export function runAntigravityThemeModAction(action, payload = {}, opts = {}) {
  asarInspectCache.clear();
  const isRestore = action === "restore";
  const patcher = loadPatcher(opts);
  if (!patcher) {
    return { ok: false, statusCode: 404, error: "Antigravity theme mod patcher not found" };
  }
  const { sxsRoot } = resolvePaths(opts);
  const runningSet = patcher.getRunningAntigravityVersions();
  const allVers = patcher.listVersions(sxsRoot);
  const rawVer = String(payload?.version || "").trim();
  const targets = rawVer
    ? [rawVer.startsWith("v") ? rawVer : `v${rawVer}`].filter((v) => allVers.includes(v))
    : allVers;
  const results = [];
  for (const v of targets) {
    const info = patcher.inspectVersion(v, runningSet, sxsRoot);
    if (info.running) {
      results.push({ version: v, status: "skipped-running" });
      continue;
    }
    try {
      results.push(isRestore ? patcher.uninstallVersion(info) : patcher.installVersion(info));
    } catch (err) {
      results.push({ version: v, status: "error", error: err?.message || String(err) });
    }
  }
  const updatedVersions = patcher
    .listVersions(sxsRoot)
    .reverse()
    .map((v) => patcher.inspectVersion(v, runningSet, sxsRoot));
  return {
    ok: true,
    action: isRestore ? "restore" : "apply",
    results,
    versions: updatedVersions,
  };
}

function formatTierLabel(rawTier) {
  const s = String(rawTier || "").trim();
  if (!s) return "";
  if (/ultimate|ultra|g1-ultra/i.test(s)) return "Google AI Ultra";
  if (/pro|g1-pro/i.test(s)) return "Google AI Pro";
  if (/free/i.test(s)) return "Free";
  return s;
}

export function resolveHighestTierLabel(...rawValues) {
  const labels = rawValues.map(formatTierLabel).filter(Boolean);
  const ultra = labels.find((l) => /ultra/i.test(l));
  if (ultra) return ultra;
  const pro = labels.find((l) => /pro/i.test(l));
  if (pro) return pro;
  const free = labels.find((l) => /^free$/i.test(l));
  if (free) return free;
  return labels[0] || "";
}

function summarizeAccountQuotaRecord(detail) {
  const q = detail?.quota;
  const models = Array.isArray(q?.models) ? q.models : [];
  if (models.length === 0) return null;

  const geminiModels = models.filter((m) => /gemini-4|gemini-3/i.test(String(m?.name || m?.display_name || "")));
  const claudeModels = models.filter((m) => /claude|gpt-oss/i.test(String(m?.name || m?.display_name || "")));

  const pickMinPct = (list) => {
    const vals = list.map((m) => Number(m?.percentage)).filter((n) => Number.isFinite(n));
    return vals.length > 0 ? Math.max(0, Math.min(100, Math.round(Math.min(...vals)))) : null;
  };
  const pickEarliestReset = (list) => {
    const times = list
      .map((m) => String(m?.reset_time || "").trim())
      .filter((t) => Number.isFinite(Date.parse(t)))
      .sort((a, b) => Date.parse(a) - Date.parse(b));
    return times[0] || "";
  };

  const geminiPct = pickMinPct(geminiModels);
  const claudePct = pickMinPct(claudeModels);
  const allPcts = [geminiPct, claudePct].filter((n) => typeof n === "number");
  const lowestPct = allPcts.length > 0 ? Math.min(...allPcts) : pickMinPct(models);
  const geminiReset = pickEarliestReset(geminiModels.length > 0 ? geminiModels : models);
  const claudeReset = pickEarliestReset(claudeModels.length > 0 ? claudeModels : models);
  const updatedSec = Number(detail?.usage_updated_at || q?.last_updated || 0);
  const updatedAt = Number.isFinite(updatedSec) && updatedSec > 0 ? new Date(updatedSec * 1000).toISOString() : "";

  const groups = [];
  if (geminiPct !== null) {
    groups.push({
      displayName: "Gemini Models",
      buckets: [{ window: "5h", remainingFraction: geminiPct / 100, resetTime: geminiReset }],
    });
  }
  if (claudePct !== null) {
    groups.push({
      displayName: "Claude and GPT models",
      buckets: [{ window: "5h", remainingFraction: claudePct / 100, resetTime: claudeReset }],
    });
  }

  const labelParts = [];
  if (geminiPct !== null) labelParts.push(`G ${geminiPct}%`);
  if (claudePct !== null) labelParts.push(`C ${claudePct}%`);

  const rawCredits = Array.isArray(q?.credits) ? q.credits : [];
  const parsedCredits = rawCredits
    .map((c) => {
      const amt = Number(c?.credit_amount ?? c?.creditAmount);
      const type = String(c?.credit_type ?? c?.creditType ?? "").trim();
      return Number.isFinite(amt) ? { type: type || "CREDITS", amount: amt } : null;
    })
    .filter(Boolean);
  const preferredCredit =
    parsedCredits.find((c) => /GOOGLE_ONE|AI|PROMPT/i.test(c.type) && c.amount >= 0) ||
    parsedCredits.find((c) => c.amount > 0) ||
    parsedCredits[0] ||
    null;
  const aiCredits = preferredCredit ? preferredCredit.amount : null;
  const rawLimit = Number(q?.ai_credits_limit ?? q?.credits_limit);
  const aiCreditsLimit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : null;
  const creditsLabel =
    aiCredits != null
      ? aiCreditsLimit != null
        ? `${aiCredits.toLocaleString("en-US")} / ${aiCreditsLimit.toLocaleString("en-US")}`
        : `${aiCredits.toLocaleString("en-US")} credits`
      : "";

  return {
    email: String(detail?.email || "").trim().toLowerCase(),
    tierLabel: resolveHighestTierLabel(q?.subscription_tier, q?.paid_tier, q?.user_tier, q?.tier_id, q?.plan_name),
    aiCredits,
    aiCreditsLimit,
    creditsLabel,
    credits: parsedCredits,
    geminiPct,
    claudePct,
    lowestPct,
    resetTime: geminiReset || claudeReset || "",
    updatedAt,
    modelsCount: models.length,
    quotaLabel: labelParts.join(" · "),
    groups,
  };
}

function resolveRealHomeDir() {
  const hd = String(os.homedir() || "").trim();
  if (hd && !hd.toLowerCase().includes("antigravity-sxs")) return hd;
  if (process.env.HOMEDRIVE && process.env.HOMEPATH) {
    const candidate = path.resolve(process.env.HOMEDRIVE + process.env.HOMEPATH);
    if (fs.existsSync(candidate)) return candidate;
  }
  if (process.env.APPDATA) {
    const candidate = path.resolve(process.env.APPDATA, "../..");
    if (fs.existsSync(candidate)) return candidate;
  }
  return hd;
}

function readIdeConsoleStorageKey(ideConsoleDir) {
  const candidates = [
    path.join(ideConsoleDir, "secure-account-storage.key"),
    path.join(path.dirname(ideConsoleDir), ".antigravity_cockpit", "secure-account-storage.key"),
  ];
  for (const keyFile of candidates) {
    try {
      if (!fs.existsSync(keyFile)) continue;
      const buf = Buffer.from(fs.readFileSync(keyFile, "utf8").trim(), "base64");
      if (buf.length === 32) return buf;
    } catch {
      /* try next */
    }
  }
  return null;
}

function isEncryptedEnvelope(parsed) {
  return Boolean(
    parsed &&
      typeof parsed === "object" &&
      typeof parsed.nonce === "string" &&
      typeof parsed.ciphertext === "string",
  );
}

function readIdeConsoleAccountJson(detPath, keyBuf) {
  const raw = JSON.parse(fs.readFileSync(detPath, "utf8"));
  if (!isEncryptedEnvelope(raw)) {
    return { data: raw, encrypted: false };
  }
  if (!keyBuf) return null;
  const nonce = Buffer.from(raw.nonce, "base64");
  const ctWithTag = Buffer.from(raw.ciphertext, "base64");
  if (ctWithTag.length < 16) return null;
  const authTag = ctWithTag.subarray(ctWithTag.length - 16);
  const ct = ctWithTag.subarray(0, ctWithTag.length - 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", keyBuf, nonce);
  decipher.setAuthTag(authTag);
  const decStr = Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
  return { data: JSON.parse(decStr), encrypted: true };
}

function encodeIdeConsoleAccountJson(payload, keyBuf, shouldEncrypt) {
  if (!shouldEncrypt || !keyBuf) {
    return `${JSON.stringify(payload, null, 2)}\n`;
  }
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyBuf, nonce);
  const plainBuf = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(plainBuf), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return JSON.stringify({
    version: 1,
    nonce: nonce.toString("base64"),
    ciphertext: Buffer.concat([encrypted, authTag]).toString("base64"),
  });
}

export function readIdeConsoleQuotaByEmailMap(opts = {}) {
  const ideConsoleDir = opts.ideConsoleDir || path.join(resolveRealHomeDir(), ".ide_console");
  const now = Date.now();
  if (
    !opts.forceRefresh &&
    quotaCache.ideConsoleDir === ideConsoleDir &&
    now - quotaCache.ts < 15_000 &&
    quotaCache.byEmail.size > 0
  ) {
    return {
      byEmail: quotaCache.byEmail,
      currentEmail: quotaCache.currentEmail,
    };
  }

  const byEmail = new Map();
  let currentEmail = "";
  try {
    const curPath = path.join(ideConsoleDir, "current_account.json");
    if (fs.existsSync(curPath)) {
      const curRaw = JSON.parse(fs.readFileSync(curPath, "utf8"));
      currentEmail = String(curRaw?.email || "").trim().toLowerCase();
    }
  } catch {
    /* ignore */
  }

  try {
    const keyBuf = readIdeConsoleStorageKey(ideConsoleDir);
    const indexPath = path.join(ideConsoleDir, "accounts.json");
    const accDir = path.join(ideConsoleDir, "accounts");
    if (fs.existsSync(indexPath) && fs.existsSync(accDir)) {
      const idxRaw = JSON.parse(fs.readFileSync(indexPath, "utf8"));
      const accounts = Array.isArray(idxRaw?.accounts) ? idxRaw.accounts : [];
      const candidates = new Map();
      for (const item of accounts) {
        const em = String(item?.email || "").trim().toLowerCase();
        const id = String(item?.id || "").trim();
        if (!em || !id) continue;
        if (Array.isArray(opts.emails) && opts.emails.length > 0 && !opts.emails.includes(em)) continue;
        candidates.set(em, id);
      }
      for (const [em, id] of candidates) {
        const detPath = path.join(accDir, `${id}.json`);
        if (!fs.existsSync(detPath)) continue;
        try {
          const parsed = readIdeConsoleAccountJson(detPath, keyBuf);
          if (!parsed?.data) continue;
          const summary = summarizeAccountQuotaRecord(parsed.data);
          if (summary) byEmail.set(em, summary);
        } catch {
          /* skip malformed or undecryptable detail */
        }
      }
    }
  } catch {
    /* ignore */
  }

  if (!opts.emails) {
    quotaCache = { ts: now, ideConsoleDir, byEmail, currentEmail };
  }
  return { byEmail, currentEmail };
}

export function getAntigravityQuotaForTarget({ version = "", email = "", sxsRoot = null, ideConsoleDir = null } = {}) {
  const { sxsRoot: defaultSxsRoot } = resolvePaths({ ...(sxsRoot ? { sxsRoot } : {}) });
  let resolvedEmail = String(email || "").trim().toLowerCase();
  let boundTier = "";
  const verClean = String(version || "").trim().replace(/^v/i, "");
  if (!resolvedEmail && verClean) {
    try {
      const metaPath = path.join(defaultSxsRoot, `home-${verClean}`, ".gemini", "sxs-bound-account.json");
      if (fs.existsSync(metaPath)) {
        const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
        resolvedEmail = String(meta?.email || "").trim().toLowerCase();
        boundTier = formatTierLabel(meta?.tier || "");
      }
    } catch {
      /* ignore */
    }
  }
  const { byEmail, currentEmail } = readIdeConsoleQuotaByEmailMap({
    ...(ideConsoleDir ? { ideConsoleDir } : {}),
  });
  const targetEmail = resolvedEmail || currentEmail;
  const hit = targetEmail ? byEmail.get(targetEmail) || null : null;
  if (!hit) {
    return {
      ok: false,
      email: targetEmail || "",
      tierLabel: boundTier || "",
      groups: [],
      error: "quota_not_cached",
    };
  }
  return {
    ok: true,
    source: "ide_console_cache",
    email: hit.email,
    tierLabel: resolveHighestTierLabel(hit.tierLabel, boundTier),
    aiCredits: hit.aiCredits ?? null,
    aiCreditsLimit: hit.aiCreditsLimit ?? null,
    creditsLabel: hit.creditsLabel || "",
    credits: hit.credits || [],
    geminiPct: hit.geminiPct,
    claudePct: hit.claudePct,
    resetTime: hit.resetTime,
    updatedAt: hit.updatedAt,
    quotaLabel: hit.quotaLabel,
    groups: hit.groups,
  };
}

function tierRank(label) {
  if (/ultra/i.test(String(label || ""))) return 3;
  if (/pro/i.test(String(label || ""))) return 2;
  if (/free/i.test(String(label || ""))) return 1;
  return 0;
}

export function syncIdeConsoleAccountCredits({
  email = "",
  aiCredits = null,
  aiCreditsLimit = null,
  credits = [],
  tierLabel = "",
  ideConsoleDir = null,
} = {}) {
  const target = String(email || "").trim().toLowerCase();
  if (!target) return { ok: false, error: "missing_email" };
  const dir = ideConsoleDir || path.join(resolveRealHomeDir(), ".ide_console");
  const idxPath = path.join(dir, "accounts.json");
  if (!fs.existsSync(idxPath)) return { ok: false, error: "accounts_index_missing" };
  try {
    const keyBuf = readIdeConsoleStorageKey(dir);
    const idx = JSON.parse(fs.readFileSync(idxPath, "utf8"));
    const accounts = Array.isArray(idx?.accounts) ? idx.accounts : [];
    const hit = accounts.find((a) => String(a?.email || "").trim().toLowerCase() === target);
    if (!hit?.id) return { ok: false, error: "account_not_found" };
    const detPath = path.join(dir, "accounts", `${hit.id}.json`);
    if (!fs.existsSync(detPath)) return { ok: false, error: "account_detail_missing" };
    const parsed = readIdeConsoleAccountJson(detPath, keyBuf);
    if (!parsed?.data) return { ok: false, error: "account_decrypt_failed" };
    const det = parsed.data;
    const prevQuota = det.quota && typeof det.quota === "object" ? { ...det.quota } : {};
    const incomingList = (Array.isArray(credits) ? credits : [])
      .map((c) => {
        const amt = Number(c?.amount ?? c?.credit_amount ?? c?.creditAmount);
        const type = String(c?.type ?? c?.credit_type ?? c?.creditType ?? "GOOGLE_ONE_AI").trim() || "GOOGLE_ONE_AI";
        return Number.isFinite(amt) ? { credit_type: type, credit_amount: String(amt) } : null;
      })
      .filter(Boolean);
    const numCredits = aiCredits != null && Number.isFinite(Number(aiCredits)) ? Number(aiCredits) : null;
    if (incomingList.length === 0 && numCredits != null) {
      incomingList.push({ credit_type: "GOOGLE_ONE_AI", credit_amount: String(numCredits) });
    }
    const prevCreditsJson = JSON.stringify(prevQuota.credits || []);
    const nextCreditsJson = JSON.stringify(incomingList);
    const numLimit =
      aiCreditsLimit != null && Number.isFinite(Number(aiCreditsLimit)) && Number(aiCreditsLimit) > 0
        ? Number(aiCreditsLimit)
        : null;
    const prevLimit = Number(prevQuota.ai_credits_limit || 0) || null;
    let nextSubTier = prevQuota.subscription_tier || "";
    const normalizedIncomingTier = /ultra/i.test(tierLabel) ? "g1-ultra-tier" : /pro/i.test(tierLabel) ? "g1-pro-tier" : "";
    if (normalizedIncomingTier && tierRank(tierLabel) > tierRank(resolveHighestTierLabel(prevQuota.subscription_tier, prevQuota.paid_tier, prevQuota.tier_id))) {
      nextSubTier = normalizedIncomingTier;
    }
    const changed =
      (incomingList.length > 0 && prevCreditsJson !== nextCreditsJson) ||
      (numLimit != null && prevLimit !== numLimit) ||
      (nextSubTier && nextSubTier !== prevQuota.subscription_tier);
    if (!changed) {
      return { ok: true, updated: false, email: target };
    }
    if (incomingList.length > 0) prevQuota.credits = incomingList;
    if (numLimit != null) prevQuota.ai_credits_limit = numLimit;
    if (nextSubTier) prevQuota.subscription_tier = nextSubTier;
    prevQuota.credits_synced_at = Math.floor(Date.now() / 1000);
    det.quota = prevQuota;
    const tmpPath = `${detPath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpPath, encodeIdeConsoleAccountJson(det, keyBuf, parsed.encrypted), "utf8");
    fs.renameSync(tmpPath, detPath);
    quotaCache = { ts: 0, ideConsoleDir: "", byEmail: new Map(), currentEmail: "" };
    return { ok: true, updated: true, email: target, aiCredits: numCredits, aiCreditsLimit: numLimit };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

export function ensureClosedSxsPatchedIfEnabled(opts = {}) {
  const { config } = readAntigravityThemeModConfig(opts);
  if (!config.enabled) {
    return { ok: true, skipped: true, reason: "theme_mod_disabled" };
  }
  return runAntigravityThemeModAction("apply", {}, opts);
}
