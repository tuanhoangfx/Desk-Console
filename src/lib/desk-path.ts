/**
 * Dual URL contract (SSOT · template `Tool/templates/desktop-desk-path.ts`):
 * - Vite / HTTP → `/clips`, `/runners`, …
 * - Electron `file://` + `base: './'` → `index.html?screen=clips`
 */

export type AppScreen = "clips" | "runners" | "tasks" | "system";

export const DESK_SCREEN_PATH: Record<AppScreen, string> = {
  clips: "/clips",
  runners: "/runners",
  tasks: "/tasks",
  system: "/system",
};

const LEGACY_SCREEN_MAP: Record<string, AppScreen> = {
  clips: "clips",
  captures: "clips",
  runners: "runners",
  tasks: "tasks",
  ops: "runners",
  system: "system",
};

const APP_SCREENS = Object.keys(DESK_SCREEN_PATH) as AppScreen[];

export function isDeskFileProtocol(): boolean {
  return typeof window !== "undefined" && window.location.protocol === "file:";
}

export function pathnameToAppScreen(pathname: string): AppScreen | null {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  // `/` is ambiguous — prefer legacy `?screen=` / bare `?clips` before defaulting to clips.
  if (normalized === "/") return null;
  if (normalized === "/clips" || normalized.startsWith("/clips/")) return "clips";
  // Retired Captures screen → Clips (bookmark / old links).
  if (normalized === "/captures" || normalized.startsWith("/captures/")) return "clips";
  if (normalized === "/runners" || normalized.startsWith("/runners/")) return "runners";
  if (normalized === "/tasks" || normalized.startsWith("/tasks/")) return "tasks";
  if (normalized === "/ops" || normalized.startsWith("/ops/")) return "runners";
  if (normalized === "/system" || normalized.startsWith("/system/")) return "system";
  return null;
}

/** Legacy bare flags: `/?clips` · `/?runners` (empty value). */
function bareQueryScreen(sp: URLSearchParams): AppScreen | null {
  for (const id of APP_SCREENS) {
    if (sp.has(id) && (sp.get(id) === "" || sp.get(id) === "1" || sp.get(id) === "true")) return id;
  }
  if (sp.has("ops") && (sp.get("ops") === "" || sp.get("ops") === "1")) return "runners";
  if (sp.has("captures") && (sp.get("captures") === "" || sp.get("captures") === "1" || sp.get("captures") === "true")) {
    return "clips";
  }
  return null;
}

function searchWithoutScreenNoise(): string {
  const sp = new URLSearchParams(window.location.search);
  sp.delete("screen");
  for (const id of APP_SCREENS) sp.delete(id);
  sp.delete("ops");
  sp.delete("captures");
  return sp.toString();
}

export function buildDeskUrl(screen: AppScreen, search = ""): string {
  if (isDeskFileProtocol()) {
    const sp = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    sp.set("screen", screen);
    const q = sp.toString();
    const base = window.location.pathname || "index.html";
    return q ? `${base}?${q}` : `${base}?screen=${screen}`;
  }
  const base = DESK_SCREEN_PATH[screen];
  const sp = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  sp.delete("screen");
  for (const id of APP_SCREENS) sp.delete(id);
  sp.delete("ops");
  sp.delete("captures");
  const q = sp.toString();
  return q ? `${base}?${q}` : base;
}

export function migrateDeskAppUrl(): AppScreen {
  const sp = new URLSearchParams(window.location.search);
  const legacy = sp.get("screen");
  let screen = pathnameToAppScreen(window.location.pathname);
  if (!screen && legacy && LEGACY_SCREEN_MAP[legacy]) {
    screen = LEGACY_SCREEN_MAP[legacy];
  }
  if (!screen) screen = bareQueryScreen(sp) ?? "clips";

  const clean = buildDeskUrl(screen, isDeskFileProtocol() ? window.location.search : searchWithoutScreenNoise());
  const current = `${window.location.pathname}${window.location.search}`;
  if (current !== clean) {
    window.history.replaceState(null, "", clean);
  }
  return screen;
}

export function setDeskAppScreen(screen: AppScreen, opts?: { replace?: boolean }) {
  const url = buildDeskUrl(screen, isDeskFileProtocol() ? window.location.search : searchWithoutScreenNoise());
  if (opts?.replace) window.history.replaceState(null, "", url);
  else window.history.pushState(null, "", url);
}
