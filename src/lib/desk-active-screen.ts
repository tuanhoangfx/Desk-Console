import { useSyncExternalStore } from "react";
import type { AppScreen } from "./app-screen";

let activeScreen: AppScreen = "clips";
const listeners = new Set<() => void>();

export function setDeskActiveScreen(screen: AppScreen) {
  if (activeScreen === screen) return;
  activeScreen = screen;
  listeners.forEach((listener) => listener());
}

export function getDeskActiveScreen(): AppScreen {
  return activeScreen;
}

export function subscribeDeskActiveScreen(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

/** True only while this screen is active — snapshots are booleans so inactive screens skip re-render. */
export function useDeskTabActive(screen: AppScreen): boolean {
  return useSyncExternalStore(
    subscribeDeskActiveScreen,
    () => activeScreen === screen,
    () => activeScreen === screen,
  );
}
