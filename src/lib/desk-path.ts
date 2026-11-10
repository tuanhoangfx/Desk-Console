/**
 * Dual URL contract (SSOT · template `Tool/templates/desktop-desk-path.ts`):
 * - Vite / HTTP → `/dashboard`, `/clips`, `/jobs`, `/drives`, `/runners`, `/cron`
 * - Electron `file://` + `base: './'` → `index.html?screen=dashboard`
 */

export type AppScreen = "dashboard" | "clips" | "jobs" | "drives" | "runners" | "cron";

export const DESK_SCREEN_PATH: Record<AppScreen, string> = {
  dashboard: "/dashboard",
  clips: "/clips",
  jobs: "/jobs",
  drives: "/drives",
  runners: "/runners",
  cron: "/cron",
};

const LEGACY_SCREEN_MAP: Record<string, AppScreen> = {
  dashboard: "dashboard",
  clips: "clips",
  captures: "clips",
  jobs: "jobs",
  drives: "drives",
  runners: "runners",
  cron: "cron",
  tasks: "cron",
  ops: "runners",
  system: "dashboard",
};

const APP_SCREENS = Object.keys(DESK_SCREEN_PATH) as AppScreen[];

export function isDeskFileProtocol(): boolean {
  return typeof window !== "undefined" && window.location.protocol === "file:";
}

export function pathnameToAppScreen(pathname: string): AppScreen | null {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (normalized === "/") return null;
  if (normalized === "/dashboard" || normalized.startsWith("/dashboard/")) return "dashboard";
  if (normalized === "/clips" || normalized.startsWith("/clips/")) return "clips";
  if (normalized === "/captures" || normalized.startsWith("/captures/")) return "clips";
  if (normalized === "/jobs" || normalized.startsWith("/jobs/")) return "jobs";
  if (normalized === "/drives" || normalized.startsWith("/drives/")) return "drives";
  if (normalized === "/runners" || normalized.startsWith("/runners/")) return "runners";
  if (normalized === "/cron" || normalized.startsWith("/cron/")) return "cron";
  if (normalized === "/tasks" || normalized.startsWith("/tasks/")) return "cron";
  if (normalized === "/ops" || normalized.startsWith("/ops/")) return "runners";
  if (normalized === "/system" || normalized.startsWith("/system/")) return "dashboard";
  return null;
}

/** Legacy bare flags: `/?clips` · `/?runners` (empty value). */
function bareQueryScreen(sp: URLSearchParams): AppScreen | null {
  for (const id of APP_SCREENS) {
    if (sp.has(id) && (sp.get(id) === "" || sp.get(id) === "1" || sp.get(id) === "true")) return id;
  }
  if (sp.has("tasks") && (sp.get("tasks") === "" || sp.get("tasks") === "1" || sp.get("tasks") === "true")) return "cron";
  if (sp.has("system") && (sp.get("system") === "" || sp.get("system") === "1" || sp.get("system") === "true")) return "dashboard";
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
  sp.delete("tasks");
  sp.delete("system");
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
  sp.delete("tasks");
  sp.delete("system");
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
  if (!screen) screen = bareQueryScreen(sp) ?? "dashboard";

  const clean = buildDeskUrl(screen, isDeskFileProtocol() ? window.location.search : searchWithoutScreenNoise());
  const current = `${window.location.pathname}${window.location.search}`;
  if (current !== clean) {
    window.history.replaceState(null, "", clean);
  }
  return screen;
}

export function setDeskAppScreen(screen: AppScreen, opts?: { replace?: boolean }): void {
  const next = buildDeskUrl(screen, window.location.search);
  const current = `${window.location.pathname}${window.location.search}`;
  if (current === next) return;
  if (opts?.replace) window.history.replaceState(null, "", next);
  else window.history.pushState(null, "", next);
}
