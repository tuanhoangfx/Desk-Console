export type AppScreen = "clips" | "captures" | "runners" | "tasks" | "system";

export function readAppScreen(): AppScreen {
  const value = new URL(window.location.href).searchParams.get("screen");
  if (value === "captures" || value === "runners" || value === "tasks" || value === "system") return value;
  return "clips";
}

export function writeAppScreen(screen: AppScreen) {
  const url = new URL(window.location.href);
  url.searchParams.set("screen", screen);
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
}
