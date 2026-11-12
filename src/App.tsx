import { memo, startTransition, useEffect, useLayoutEffect, useState, type ReactElement } from "react";
import {
  HubAppLogProvider,
  HubToastShell,
  HubToolLoadingProvider,
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
import { CronScreen } from "./features/cron/CronScreen";
import { DashboardScreen } from "./features/dashboard/DashboardScreen";
import { DrivesScreen } from "./features/drives/DrivesScreen";
import { JobsScreen } from "./features/jobs/JobsScreen";
import { FolderSyncGuidedTourModal, shouldAutoShowGuidedTour } from "./features/onboarding/FolderSyncGuidedTourModal";
import { RunnersScreen } from "./features/runners/RunnersScreen";
import { bootAppScreen, readAppScreen, writeAppScreen, type AppScreen } from "./lib/app-screen";
import { deskApi } from "./lib/api";
import { setDeskActiveScreen } from "./lib/desk-active-screen";
import { fetchJobs, fetchRemotes } from "./lib/sync-api";

const SCREENS: AppScreen[] = ["dashboard", "clips", "jobs", "drives", "runners", "cron"];

function isPastePicker() {
  return new URLSearchParams(window.location.search).get("picker") === "1";
}

/**
 * Stable keep-alive body — props are only `id`, so parent tab switches do not reconcile
 * inactive directory trees (was ~1s hitch from re-rendering ~700-node Clips on every leave).
 */
const DeskScreenSlot = memo(function DeskScreenSlot({ id }: { id: AppScreen }) {
  if (id === "dashboard") return <DashboardScreen />;
  if (id === "jobs") return <JobsScreen />;
  if (id === "drives") return <DrivesScreen />;
  if (id === "runners") return <RunnersScreen />;
  if (id === "cron") return <CronScreen />;
  return <ClipsScreen />;
});

/** Stable element refs — must be AFTER DeskScreenSlot (const TDZ). App re-renders must not invalidate memo children. */
const SCREEN_SLOTS: Record<AppScreen, ReactElement> = {
  dashboard: <DeskScreenSlot id="dashboard" />,
  clips: <DeskScreenSlot id="clips" />,
  jobs: <DeskScreenSlot id="jobs" />,
  drives: <DeskScreenSlot id="drives" />,
  runners: <DeskScreenSlot id="runners" />,
  cron: <DeskScreenSlot id="cron" />,
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
  const [guidedTourOpen, setGuidedTourOpen] = useState(false);
  const [runnersLocked, setRunnersLocked] = useState(false);

  useEffect(() => {
    void deskApi
      .meta()
      .then((meta) => {
        const locked = meta.hasDevWorkspace === false;
        setRunnersLocked(locked);
        if (locked) {
          setScreen((prev) => (prev === "runners" ? "clips" : prev));
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const onPop = () => {
      const next = readAppScreen();
      setDeskActiveScreen(next);
      setScreen(next);
    };
    const onOpenTour = () => setGuidedTourOpen(true);
    const onDeskNavigate = (e: Event) => {
      const targetScreen = (e as CustomEvent<{ screen?: AppScreen }>).detail?.screen;
      if (targetScreen && SCREENS.includes(targetScreen)) {
        setDeskActiveScreen(targetScreen);
        startTransition(() => setScreen(targetScreen));
      }
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("p0009:open-guided-tour", onOpenTour);
    window.addEventListener("desk:navigate", onDeskNavigate);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("p0009:open-guided-tour", onOpenTour);
      window.removeEventListener("desk:navigate", onDeskNavigate);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const syncFolder = params.get("syncFolder");
    const openJob = params.get("openJob");
    const openDrive = params.get("openDrive");
    if (syncFolder) {
      setDeskActiveScreen("jobs");
      setScreen("jobs");
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent("desk:sync-folder", { detail: { localPath: syncFolder } }));
      }, 120);
      return;
    }
    if (openJob) {
      setDeskActiveScreen("jobs");
      setScreen("jobs");
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent("desk:open-entity", { detail: { screen: "jobs", jobId: openJob } }));
      }, 120);
      return;
    }
    if (openDrive) {
      setDeskActiveScreen("drives");
      setScreen("drives");
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent("desk:open-entity", { detail: { screen: "drives", remoteName: openDrive } }));
      }, 120);
      return;
    }
    if (params.get("tour") === "1") {
      setGuidedTourOpen(true);
      return;
    }
    void Promise.all([fetchRemotes(), fetchJobs()])
      .then(([r, j]) => {
        if (shouldAutoShowGuidedTour(r.remotes?.length ?? 0, j.jobs?.length ?? 0)) {
          setGuidedTourOpen(true);
        }
      })
      .catch(() => undefined);
  }, []);

  const visited = useHubVisitedTabsLru(screen, {
    maxMounted: 5,
    pinned: ["dashboard", "clips", "jobs", "drives", "runners", "cron"],
  });

  useLayoutEffect(() => {
    setDeskActiveScreen(screen);
    writeAppScreen(screen);
  }, [screen]);

  const onNavigate = (next: AppScreen) => {
    if (next === "runners" && runnersLocked) return;
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
      <HubToolLoadingProvider
        toolCode="P0001"
        toolName="Desk Console"
        iconSrc="/icons/tools/P0001.svg"
      >
        <HubToastShell>
          <div className="hub-app theme-hub flex h-full min-h-0">
            <DeskSidebar screen={screen} onNavigate={onNavigate} runnersLocked={runnersLocked} />
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
              <FolderSyncGuidedTourModal
                open={guidedTourOpen}
                onClose={() => setGuidedTourOpen(false)}
                onSelectScreen={onNavigate}
              />
            </main>
          </div>
        </HubToastShell>
      </HubToolLoadingProvider>
    </HubAppLogProvider>
  );
}
