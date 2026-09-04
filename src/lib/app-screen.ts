import {
  buildDeskUrl,
  isDeskFileProtocol,
  migrateDeskAppUrl,
  pathnameToAppScreen,
  setDeskAppScreen,
  type AppScreen,
} from "./desk-path";

export type { AppScreen };

export function readAppScreen(): AppScreen {
  if (typeof window === "undefined") return "clips";
  const fromPath = pathnameToAppScreen(window.location.pathname);
  if (fromPath) return fromPath;
  const legacy = new URLSearchParams(window.location.search).get("screen");
  if (legacy === "captures") return "clips";
  if (legacy === "runners" || legacy === "tasks" || legacy === "system") return legacy;
  if (legacy === "ops") return "runners";
  if (legacy === "clips") return "clips";
  return "clips";
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
