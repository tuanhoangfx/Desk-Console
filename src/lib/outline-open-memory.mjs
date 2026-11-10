const MAX_PATHS = 40;
const OUTLINE_COLLATOR = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/**
 * Natural case-insensitive comparator for folder/file names (reuses a single Intl.Collator).
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function compareOutlineNames(a, b) {
  return OUTLINE_COLLATOR.compare(String(a || ""), String(b || ""));
}

export function outlineOpenKey(mode, resetKey) {
  return `p0009.outline-open:${mode}:${resetKey}`;
}

/** Paths the user had expanded. Drop anything that is not a short folder path. */
export function readOutlineOpen(storage, key) {
  try {
    const raw = JSON.parse(storage.getItem(key) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((item) => typeof item === "string" && item.length > 0 && item.length < 500 && !item.includes("\0"))
      .slice(0, MAX_PATHS);
  } catch {
    return [];
  }
}

export function writeOutlineOpen(storage, key, paths) {
  const next = readOutlineOpen({ getItem: () => JSON.stringify([...paths]) }, key);
  if (!next.length) storage.removeItem(key);
  else storage.setItem(key, JSON.stringify(next));
}

/**
 * Collect folder paths from already-loaded cache levels (up to MAX_PATHS) for 1-click "Expand loaded".
 * @param {Record<string, Array<{ name: string; kind: string }>>} cache
 * @returns {string[]}
 */
export function collectLoadedFolderPaths(cache) {
  if (!cache || typeof cache !== "object") return [];
  const out = [];
  const seen = new Set();
  function walk(parent) {
    const rows = cache[parent];
    if (!Array.isArray(rows)) return;
    for (const row of rows) {
      if (!row || row.kind === "file" || !row.name) continue;
      const path = parent ? `${parent}/${row.name}` : row.name;
      if (seen.has(path)) continue;
      seen.add(path);
      out.push(path);
      if (out.length >= MAX_PATHS) return;
      if (cache[path]) {
        walk(path);
        if (out.length >= MAX_PATHS) return;
      }
    }
  }
  walk("");
  return out;
}

/**
 * Extract lowercase extension without leading dot (e.g. "Sheet Backup.xlsx" -> "xlsx").
 * @param {string} name
 * @returns {string}
 */
export function extractFileExtension(name) {
  const base = String(name || "").trim();
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot === base.length - 1) return "";
  return base.slice(dot + 1).toLowerCase();
}

/**
 * Collect sorted unique file extensions from inventory formats and loaded tree cache.
 * @param {Record<string, Array<{ name: string; kind: string }>>} [cache]
 * @param {readonly (string | { ext?: string })[]} [inventoryFormats]
 * @returns {string[]}
 */
export function collectOutlineFormats(cache = {}, inventoryFormats = []) {
  const set = new Set();
  for (const raw of inventoryFormats || []) {
    const extVal = raw && typeof raw === "object" ? raw.ext : raw;
    const clean = String(extVal || "").trim().replace(/^\.+/, "").toLowerCase();
    if (clean && clean !== "(no ext)" && clean !== "(none)") set.add(clean);
  }
  if (cache && typeof cache === "object") {
    for (const rows of Object.values(cache)) {
      if (!Array.isArray(rows)) continue;
      for (const row of rows) {
        if (!row || row.kind !== "file") continue;
        const ext = extractFileExtension(row.name);
        if (ext) set.add(ext);
      }
    }
  }
  return [...set].sort(compareOutlineNames);
}

/**
 * Match a tree row against search query, compare statuses, item kinds ("folder"|"file"), and file formats.
 * @param {{ name: string; kind: string; status?: string }} row
 * @param {{ query?: string; statuses?: readonly string[]; kinds?: readonly string[]; formats?: readonly string[] }} [criteria]
 * @returns {boolean}
 */
export function matchesOutlineRow(row, criteria = {}) {
  if (!row) return false;
  const { query = "", statuses = [], kinds = [], formats = [] } = criteria;
  if (statuses.length > 0 && (!row.status || !statuses.includes(row.status))) {
    return false;
  }
  const normalizedKind = row.kind === "file" ? "file" : "folder";
  if (kinds.length > 0 && !kinds.includes(normalizedKind)) {
    return false;
  }
  if (formats.length > 0) {
    if (normalizedKind !== "file") return false;
    const ext = extractFileExtension(row.name);
    if (!ext || !formats.includes(ext)) return false;
  }
  const q = String(query || "").trim().toLowerCase();
  if (q && !String(row.name || "").toLowerCase().includes(q)) {
    return false;
  }
  return true;
}

/**
 * Deep tree filter helper: returns true when any loaded descendant under `folderPath` matches `matchFn`.
 * Keeps parent folders visible and open when searching or filtering by format/status/kind.
 * Uses optional `memo` Map so every folder branch is evaluated in O(N) total time across the tree.
 * @param {Record<string, Array<any>>} cache
 * @param {string} folderPath
 * @param {(row: any) => boolean} [matchFn]
 * @param {Map<string, boolean>} [memo]
 * @returns {boolean}
 */
export function branchHasLoadedMatch(cache, folderPath, matchFn, memo) {
  if (!cache || typeof cache !== "object" || typeof matchFn !== "function") return false;
  const memoMap = memo instanceof Map ? memo : new Map();
  const visited = new Set();
  function check(parent) {
    if (memoMap.has(parent)) return Boolean(memoMap.get(parent));
    if (visited.has(parent)) return false;
    visited.add(parent);
    const rows = cache[parent];
    if (!Array.isArray(rows)) {
      memoMap.set(parent, false);
      return false;
    }
    for (const row of rows) {
      if (!row) continue;
      if (matchFn(row)) {
        memoMap.set(parent, true);
        return true;
      }
      if (row.kind !== "file" && row.name) {
        const childPath = parent ? `${parent}/${row.name}` : row.name;
        if (cache[childPath] && check(childPath)) {
          memoMap.set(parent, true);
          return true;
        }
      }
    }
    memoMap.set(parent, false);
    return false;
  }
  return check(folderPath);
}

/**
 * Compute virtual window slice for SyncFolderTree so folders with thousands of files scroll at 60fps.
 * @param {number} totalRows
 * @param {number} scrollTop
 * @param {number} viewportHeight
 * @param {{ rowHeight?: number; overscan?: number; threshold?: number }} [opts]
 */
export function computeOutlineVirtualWindow(totalRows, scrollTop, viewportHeight, opts = {}) {
  const rowHeight = opts.rowHeight ?? 26.4;
  const overscan = opts.overscan ?? 12;
  const threshold = opts.threshold ?? 80;
  const count = Math.max(0, Number(totalRows) || 0);
  if (count <= threshold || !(viewportHeight > 0) || !(rowHeight > 0)) {
    return {
      startIndex: 0,
      endIndex: count,
      topPadPx: 0,
      bottomPadPx: 0,
      windowed: false,
    };
  }
  const safeTop = Math.max(0, Number(scrollTop) || 0);
  const rawStart = Math.floor(safeTop / rowHeight) - overscan;
  const startIndex = Math.max(0, Math.min(count - 1, rawStart));
  const visibleCount = Math.ceil(viewportHeight / rowHeight) + overscan * 2;
  const endIndex = Math.min(count, startIndex + visibleCount);
  const topPadPx = Math.round(startIndex * rowHeight);
  const bottomPadPx = Math.max(0, Math.round((count - endIndex) * rowHeight));
  return {
    startIndex,
    endIndex,
    topPadPx,
    bottomPadPx,
    windowed: true,
  };
}

/**
 * Resolve breadcrumb segments and openable Local / Drive target paths for the currently selected tree item.
 * @param {{ selectedPath?: string; localRootPath?: string; remoteSpec?: string }} opts
 */
export function resolveOutlineSelectedTarget(opts = {}) {
  const selectedPath = String(opts.selectedPath || "").trim().replace(/^\/+|\/+$/g, "");
  const localRoot = String(opts.localRootPath || "").trim().replace(/[\\/]+$/, "");
  const remoteRoot = String(opts.remoteSpec || "").trim().replace(/\/+$/, "");

  const segments = selectedPath
    ? selectedPath.split("/").filter(Boolean).map((name, idx, arr) => ({
        name,
        path: arr.slice(0, idx + 1).join("/"),
      }))
    : [];

  const winRel = selectedPath ? selectedPath.replace(/\//g, "\\") : "";
  const localTarget = localRoot ? (winRel ? `${localRoot}\\${winRel}` : localRoot) : "";

  let remoteTarget = "";
  if (remoteRoot) {
    const hasColon = remoteRoot.includes(":");
    const baseSpec = hasColon ? remoteRoot : `${remoteRoot}:`;
    remoteTarget = selectedPath
      ? baseSpec.endsWith(":")
        ? `${baseSpec}${selectedPath}`
        : `${baseSpec}/${selectedPath}`
      : baseSpec;
  }

  return {
    relativePath: selectedPath,
    segments,
    localTarget,
    remoteTarget,
  };
}
