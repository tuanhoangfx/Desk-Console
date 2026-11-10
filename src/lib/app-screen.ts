import {
  buildDeskUrl,
  isDeskFileProtocol,
  migrateDeskAppUrl,
  pathnameToAppScreen,
  setDeskAppScreen,
  type AppScreen,
} from "./desk-path";

export type { AppScreen };

export const SCREEN_LABELS: Record<AppScreen, string> = {
  dashboard: "Dashboard",
  clips: "Clips",
  jobs: "Jobs",
  drives: "Drives",
  runners: "Runners",
  cron: "Cron",
};

export function readAppScreen(): AppScreen {
  if (typeof window === "undefined") return "dashboard";
  const fromPath = pathnameToAppScreen(window.location.pathname);
  if (fromPath) return fromPath;
  const legacy = new URLSearchParams(window.location.search).get("screen");
  if (legacy === "captures") return "clips";
  if (legacy === "dashboard" || legacy === "jobs" || legacy === "drives" || legacy === "runners" || legacy === "cron") return legacy;
  if (legacy === "system") return "dashboard";
  if (legacy === "tasks") return "cron";
  if (legacy === "ops") return "runners";
  if (legacy === "clips") return "clips";
  return "dashboard";
}

/** Boot: normalize `?screen=` / `/?clips` → `/clips` on HTTP; keep `?screen=` on file://. */
export function bootAppScreen(): AppScreen {
  return migrateDeskAppUrl();
}

export function writeAppScreen(screen: AppScreen) {
  setDeskAppScreen(screen, { replace: true });
}

export function navigateAppScreen(screen: AppScreen) {
  setDeskAppScreen(screen, { replace: false });
}

export { buildDeskUrl, isDeskFileProtocol };
