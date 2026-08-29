import { useEffect, useLayoutEffect, useState } from "react";
import {
  HubAppLogProvider,
  HubVisitedTabPanel,
  hubMainShellClassFromManifest,
  useHubActiveScreenSync,
  useHubVisitedTabsLru,
  type ToolManifestUiShell,
} from "@tool-workspace/hub-ui";
import toolManifest from "../tool.manifest.json";
import { DeskSidebar } from "./components/DeskSidebar";
import { CapturesScreen } from "./features/captures/CapturesScreen";
import { ClipPickerPage } from "./features/clips/ClipPickerPage";
import { ClipsScreen } from "./features/clips/ClipsScreen";
import { RunnersScreen } from "./features/runners/RunnersScreen";
import { TasksScreen } from "./features/tasks/TasksScreen";
import { SystemScreen } from "./features/system/SystemScreen";
import { readAppScreen, writeAppScreen, type AppScreen } from "./lib/app-screen";

const SCREENS: AppScreen[] = ["clips", "captures", "runners", "tasks", "system"];

function isPastePicker() {
  return new URLSearchParams(window.location.search).get("picker") === "1";
}

export default function App() {
  if (isPastePicker()) return <ClipPickerPage />;
  return <DeskApp />;
}

function DeskApp() {
  const [screen, setScreen] = useState<AppScreen>(() => readAppScreen());

  useEffect(() => {
    const onPop = () => setScreen(readAppScreen());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const visited = useHubVisitedTabsLru(screen);

  useLayoutEffect(() => {
    writeAppScreen(screen);
  }, [screen]);

  useHubActiveScreenSync(screen);

  return (
    <HubAppLogProvider
      persistKey="P0001:anon"
      activeScreen={screen}
      bootLog={{ scope: "P0001", message: "Desk Console started", screen }}
    >
      <div className="hub-app theme-hub flex h-full min-h-0">
        <DeskSidebar screen={screen} onNavigate={setScreen} />
        <main
          className={hubMainShellClassFromManifest(
            screen,
            {
              golden: (toolManifest.uiShell as ToolManifestUiShell).golden,
              splitScreens: [],
            },
            "flex flex-col",
          )}
        >
          {SCREENS.map((id) => (
            <HubVisitedTabPanel key={id} tabId={id} active={screen === id} visited={visited} mountMode="visited" dataScreen={id}>
              {id === "captures" ? (
                <CapturesScreen tabActive={screen === "captures"} />
              ) : id === "runners" ? (
                <RunnersScreen tabActive={screen === "runners"} />
              ) : id === "tasks" ? (
                <TasksScreen tabActive={screen === "tasks"} />
              ) : id === "system" ? (
                <SystemScreen />
              ) : (
                <ClipsScreen tabActive={screen === "clips"} />
              )}
            </HubVisitedTabPanel>
          ))}
        </main>
      </div>
    </HubAppLogProvider>
  );
}
