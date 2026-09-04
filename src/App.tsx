import { memo, startTransition, useEffect, useLayoutEffect, useState, type ReactElement } from "react";
import {
  HubAppLogProvider,
  hubMainShellClassFromManifest,
  useHubActiveScreenSync,
  useHubVisitedTabsLru,
  type ToolManifestUiShell,
} from "@tool-workspace/hub-ui";
import toolManifest from "../tool.manifest.json";
import { DeskSidebar } from "./components/DeskSidebar";
import { DeskVisitedTabPanel } from "./components/DeskVisitedTabPanel";
import { ClipPickerPage } from "./features/clips/ClipPickerPage";
import { ClipsScreen } from "./features/clips/ClipsScreen";
import { RunnersScreen } from "./features/runners/RunnersScreen";
import { TasksScreen } from "./features/tasks/TasksScreen";
import { SystemScreen } from "./features/system/SystemScreen";
import { bootAppScreen, readAppScreen, writeAppScreen, type AppScreen } from "./lib/app-screen";
import { setDeskActiveScreen } from "./lib/desk-active-screen";

const SCREENS: AppScreen[] = ["clips", "runners", "tasks", "system"];

function isPastePicker() {
  return new URLSearchParams(window.location.search).get("picker") === "1";
}

/**
 * Stable keep-alive body — props are only `id`, so parent tab switches do not reconcile
 * inactive directory trees (was ~1s hitch from re-rendering ~700-node Clips on every leave).
 */
const DeskScreenSlot = memo(function DeskScreenSlot({ id }: { id: AppScreen }) {
  if (id === "runners") return <RunnersScreen />;
  if (id === "tasks") return <TasksScreen />;
  if (id === "system") return <SystemScreen />;
  return <ClipsScreen />;
});

/** Stable element refs — must be AFTER DeskScreenSlot (const TDZ). App re-renders must not invalidate memo children. */
const SCREEN_SLOTS: Record<AppScreen, ReactElement> = {
  clips: <DeskScreenSlot id="clips" />,
  runners: <DeskScreenSlot id="runners" />,
  tasks: <DeskScreenSlot id="tasks" />,
  system: <DeskScreenSlot id="system" />,
};

export default function App() {
  if (isPastePicker()) return <ClipPickerPage />;
  return <DeskApp />;
}

function DeskApp() {
  const [screen, setScreen] = useState<AppScreen>(() => {
    const boot = bootAppScreen();
    setDeskActiveScreen(boot);
    return boot;
  });

  useEffect(() => {
    const onPop = () => {
      const next = readAppScreen();
      setDeskActiveScreen(next);
      setScreen(next);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const visited = useHubVisitedTabsLru(screen, { maxMounted: 4, pinned: ["runners", "clips"] });

  useLayoutEffect(() => {
    setDeskActiveScreen(screen);
    writeAppScreen(screen);
  }, [screen]);

  const onNavigate = (next: AppScreen) => {
    setDeskActiveScreen(next);
    startTransition(() => setScreen(next));
  };

  useHubActiveScreenSync(screen);

  return (
    <HubAppLogProvider
      persistKey="P0001:anon"
      activeScreen={screen}
      bootLog={{ scope: "P0001", message: "Desk Console started", screen }}
    >
      <div className="hub-app theme-hub flex h-full min-h-0">
        <DeskSidebar screen={screen} onNavigate={onNavigate} />
        <main
          className={hubMainShellClassFromManifest(
            screen,
            toolManifest.uiShell as ToolManifestUiShell,
            "flex flex-col",
          )}
        >
          {SCREENS.map((id) => (
            <DeskVisitedTabPanel key={id} tabId={id} active={screen === id} visited={visited}>
              {SCREEN_SLOTS[id]}
            </DeskVisitedTabPanel>
          ))}
        </main>
      </div>
    </HubAppLogProvider>
  );
}
