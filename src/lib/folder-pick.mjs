/** Drive letter root plus the path under it. Other paths stay the root themselves. */
export function localPickRoot(localPath) {
  const norm = String(localPath || "").trim().replace(/\//g, "\\");
  const match = norm.match(/^([A-Za-z]:\\)(.*)$/);
  if (!match) return { root: norm, rel: "" };
  return { root: match[1], rel: match[2].replace(/\\/g, "/").replace(/^\/+|\/+$/g, "") };
}

/** Every folder from the first segment through `rel`, parent first. */
export function ancestorPaths(rel) {
  const parts = String(rel || "")
    .split("/")
    .filter(Boolean);
  const out = [];
  for (let i = 1; i <= parts.length; i += 1) out.push(parts.slice(0, i).join("/"));
  return out;
}

/** Absolute Windows path for a row under a drive root. */
export function joinLocalRoot(root, rel) {
  const base = String(root || "").replace(/[\\/]+$/, "");
  const tail = String(rel || "")
    .replace(/\//g, "\\")
    .replace(/^\\+/, "");
  if (!tail) return String(root || "");
  return `${base}\\${tail}`;
}

const LAST_LOCAL_ROOT_STORAGE_KEY = "p0009.lastLocalRoot";

export function readLastUsedLocalRoot(availableRoots) {
  let saved = "";
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      saved = String(window.localStorage.getItem(LAST_LOCAL_ROOT_STORAGE_KEY) || "").trim();
    }
  } catch {
    // ignore storage errors
  }
  const list = Array.isArray(availableRoots) ? availableRoots : [];
  if (saved && (list.length === 0 || list.includes(saved))) return saved;
  return list[0] || "C:\\";
}

export function writeLastUsedLocalRoot(rootOrPath) {
  const { root } = localPickRoot(rootOrPath);
  const clean = root || String(rootOrPath || "").trim();
  if (!clean) return;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(LAST_LOCAL_ROOT_STORAGE_KEY, clean);
    }
  } catch {
    // ignore storage errors
  }
}
