import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarClock,
  ClipboardList,
  Cloud,
  Cpu,
  FolderKanban,
  HardDrive,
  PlayCircle,
  Zap,
  TrendingUp,
} from "lucide-react";
import {
  DashboardGrowthChart,
  DashboardLivePulseBadge,
  HubChromeActivityAge,
  HubDirectoryScreen,
  HubInactiveTabContent,
  HubListChromeHeader,
  HubPanel,
  HubSegmentToggle,
  MiniBarChart,
  buildHubDashboardKpiDelta,
  useHubChromePrefs,
  useHubToast,
  type BarItem,
  type FilterDef,
  type FilterValues,
  type HubRichToastInput,
  type HubSegmentToggleOption,
  type HubTimeSeriesLinePoint,
  type KpiTileData,
} from "@tool-workspace/hub-ui";
import { TabHeaderActions } from "../../components/TabHeaderActions";
import { HardwareHealthPanel } from "./HardwareHealthPanel";
import { PcBackupStatusPanel } from "./PcBackupStatusPanel";
import { RestoreSnapshotsModal } from "./RestoreSnapshotsModal";
import { useDeskDesktopUpdate } from "../../hooks/useDeskDesktopUpdate";
import { useHostHeaderStats } from "../../hooks/useHostHeaderStats";
import {
  deskApi,
  formatDiskBytesLabel,
  type ClipRow,
  type DeskHostMetrics,
  type HardwareHistoryPoint,
  type HardwareSensorsPayload,
  type OpsHistoryEntry,
  type PcBackupStatusPayload,
  type PcDiagnosticsPayload,
  type PcOptimizeAction,
  type RunnerRow,
  type TaskRow,
  type TelemetryHistoryPoint,
} from "../../lib/api";
import { navigateAppScreen, type AppScreen } from "../../lib/app-screen";
import { deskVersionMetaItems } from "../../lib/app-release";
import { deskTabHeaderChromeProps } from "../../lib/desk-tab-header-chrome";
import {
  fetchDriveAccounts,
  fetchJobs,
  fetchLocalDrives,
  type DriveAccount,
  type LocalDriveInfo,
  type SyncJob,
} from "../../lib/sync-api";
import { clipPickerFormat } from "../clips/clip-picker-filters";
import { DESK_SCREEN_TITLE_EMOJI } from "../desk/desk-directory-stickers";

type DashboardRangeKey = "7d" | "30d" | "90d" | "365d";
type DashboardGranularityKey = "hour" | "day" | "week" | "month";
type DashboardMetricMode = "sync-clips" | "runners-cron" | "drives-jobs" | "disk-ram" | "hardware-temps" | "power-rail";
type DashboardSeriesMode = "period" | "cumulative";
type DashboardDatasetKey = "jobs" | "drives" | "clips" | "runners" | "cron";

const ALL_DATASET_KEYS: readonly DashboardDatasetKey[] = ["jobs", "drives", "clips", "runners", "cron"];

const RANGE_OPTIONS: HubSegmentToggleOption<DashboardRangeKey>[] = [
  { value: "7d", label: "7D", activeTone: "amber" },
  { value: "30d", label: "30D", activeTone: "amber" },
  { value: "90d", label: "90D", activeTone: "amber" },
  { value: "365d", label: "1Y", activeTone: "amber" },
];

const GRANULARITY_OPTIONS: HubSegmentToggleOption<DashboardGranularityKey>[] = [
  { value: "hour", label: "Hour", activeTone: "emerald" },
  { value: "day", label: "Day", activeTone: "emerald" },
  { value: "week", label: "Week", activeTone: "emerald" },
  { value: "month", label: "Month", activeTone: "emerald" },
];

const METRIC_MODE_OPTIONS: HubSegmentToggleOption<DashboardMetricMode>[] = [
  { value: "sync-clips", label: "Sync & Clips", activeTone: "sky" },
  { value: "runners-cron", label: "Runners & Cron", activeTone: "amber" },
  { value: "drives-jobs", label: "Drives & Jobs", activeTone: "emerald" },
  { value: "disk-ram", label: "Disk & Memory", activeTone: "sky" },
  { value: "hardware-temps", label: "Hardware Temps", activeTone: "amber" },
  { value: "power-rail", label: "Power +3.3V", activeTone: "emerald" },
];

const SERIES_MODE_OPTIONS: HubSegmentToggleOption<DashboardSeriesMode>[] = [
  { value: "period", label: "Period", activeTone: "sky" },
  { value: "cumulative", label: "Cumulative", activeTone: "sky" },
];

const DATASET_META: Record<DashboardDatasetKey, { label: string; color: string; emoji: string }> = {
  jobs: { label: "Sync Activity", color: "#34d399", emoji: "📁" },
  drives: { label: "Drive Remotes", color: "#38bdf8", emoji: "☁️" },
  clips: { label: "Clipboard Captures", color: "#a78bfa", emoji: "📋" },
  runners: { label: "Active Runners", color: "#fbbf24", emoji: "▶️" },
  cron: { label: "Cron Executions", color: "#22d3ee", emoji: "🕒" },
};

function formatGiB(bytes: number | null | undefined): string {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return "0 GB";
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function buildTimeBuckets(
  rangeKey: DashboardRangeKey,
  granularity: DashboardGranularityKey,
): { key: string; label: string; startMs: number; endMs: number }[] {
  const now = new Date();
  const buckets: { key: string; label: string; startMs: number; endMs: number }[] = [];

  if (granularity === "hour") {
    for (let i = 23; i >= 0; i--) {
      const end = new Date(now.getTime() - i * 3600_000);
      const start = new Date(end.getTime() - 3600_000);
      const hh = `${String(end.getHours()).padStart(2, "0")}:00`;
      buckets.push({ key: end.toISOString(), label: hh, startMs: start.getTime(), endMs: end.getTime() });
    }
    return buckets;
  }

  if (granularity === "month") {
    const months = rangeKey === "365d" ? 12 : 6;
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const label = d.toLocaleDateString("en-US", { month: "short" });
      buckets.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label, startMs: d.getTime(), endMs: next.getTime() });
    }
    return buckets;
  }

  const totalDays = rangeKey === "7d" ? 7 : rangeKey === "30d" ? 14 : rangeKey === "90d" ? 12 : 12;
  const stepDays = rangeKey === "7d" ? 1 : rangeKey === "30d" ? 2 : rangeKey === "90d" ? 7 : 30;
  for (let i = totalDays - 1; i >= 0; i--) {
    const end = new Date(now.getTime() - i * stepDays * 86_400_000);
    const start = new Date(end.getTime() - stepDays * 86_400_000);
    const label = end.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    buckets.push({ key: end.toISOString().slice(0, 10), label, startMs: start.getTime(), endMs: end.getTime() });
  }
  return buckets;
}

function computeKpiDeltaPct(current: number, baseline: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(baseline) || baseline <= 0) return 0;
  return ((current - baseline) / baseline) * 100;
}

export function DashboardScreen({ tabActive = true }: { tabActive?: boolean }) {
  const toast = useHubToast();
  const pushToast = useCallback(
    (input: HubRichToastInput) => {
      toast?.pushRichToast(input);
    },
    [toast],
  );
  const chromePrefs = useHubChromePrefs();
  const headerChrome = deskTabHeaderChromeProps(false, chromePrefs);
  const centerStats = useHostHeaderStats();
  const desktopUpdate = useDeskDesktopUpdate();

  const [rangeKey, setRangeKey] = useState<DashboardRangeKey>("30d");
  const [granularity, setGranularity] = useState<DashboardGranularityKey>("day");
  const [metricMode, setMetricMode] = useState<DashboardMetricMode>("sync-clips");
  const [seriesMode, setSeriesMode] = useState<DashboardSeriesMode>("period");
  const [filterValues, setFilterValues] = useState<FilterValues>({});

  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const [drives, setDrives] = useState<DriveAccount[]>([]);
  const [localDrives, setLocalDrives] = useState<LocalDriveInfo[]>([]);
  const [clips, setClips] = useState<ClipRow[]>([]);
  const [runners, setRunners] = useState<RunnerRow[]>([]);
  const [pinnedRunners, setPinnedRunners] = useState<string[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [hostMetrics, setHostMetrics] = useState<DeskHostMetrics | null>(null);
  const [pcDiag, setPcDiag] = useState<PcDiagnosticsPayload | null>(null);
  const [pcBackup, setPcBackup] = useState<PcBackupStatusPayload | null>(null);
  const [hwSensors, setHwSensors] = useState<HardwareSensorsPayload | null>(null);
  const [hwHistory, setHwHistory] = useState<HardwareHistoryPoint[]>([]);
  const [refreshingSensors, setRefreshingSensors] = useState(false);
  const [pcOptHistory, setPcOptHistory] = useState<OpsHistoryEntry[]>([]);
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryHistoryPoint[]>([]);
  const [optimizingAction, setOptimizingAction] = useState<string | null>(null);
  const [triggeringBackup, setTriggeringBackup] = useState<"full" | "critical" | null>(null);
  const [verifyingDrill, setVerifyingDrill] = useState(false);
  const [startLayoutAction, setStartLayoutAction] = useState<"backup" | "restore" | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);

  const refreshPcBackup = useCallback(async () => {
    try {
      const b = await deskApi.pcBackupStatus();
      if (b.ok) setPcBackup(b);
    } catch {
      /* ignore transient poll error */
    }
  }, []);

  const loadAll = useCallback(async () => {
    const [
      jobsRes,
      drivesRes,
      localDrivesRes,
      clipsRes,
      runnersRes,
      watchdogRes,
      tasksRes,
      metricsRes,
      diagRes,
      backupRes,
      histRes,
      pcOptHistRes,
      hwSensorsRes,
      hwHistRes,
    ] = await Promise.allSettled([
      fetchJobs(),
      fetchDriveAccounts(),
      fetchLocalDrives(),
      deskApi.listClips("live"),
      deskApi.listRunners(),
      deskApi.getRunnerWatchdog(),
      deskApi.listTasks(),
      deskApi.hostMetrics(),
      deskApi.pcDiagnostics(),
      deskApi.pcBackupStatus(),
      deskApi.telemetryHistory(),
      deskApi.opsHistory("task:PC-Optimizer"),
      deskApi.hardwareSensors(),
      deskApi.hardwareHistory(),
    ]);

    if (jobsRes.status === "fulfilled") {
      setJobs((jobsRes.value.jobs || []).filter((j) => !j.deletedAt));
    }
    if (drivesRes.status === "fulfilled" && drivesRes.value.ok) {
      setDrives((drivesRes.value.accounts || []).filter((d) => !d.deletedAt));
    }
    if (localDrivesRes.status === "fulfilled") {
      setLocalDrives(localDrivesRes.value.drives || []);
    }
    if (clipsRes.status === "fulfilled") setClips(clipsRes.value);
    if (runnersRes.status === "fulfilled") setRunners(runnersRes.value);
    if (watchdogRes.status === "fulfilled" && watchdogRes.value.watchdog) {
      setPinnedRunners(watchdogRes.value.watchdog.pinned || []);
    }
    if (tasksRes.status === "fulfilled") setTasks(tasksRes.value);
    if (metricsRes.status === "fulfilled" && metricsRes.value.ok) setHostMetrics(metricsRes.value);
    if (diagRes.status === "fulfilled" && diagRes.value.ok) setPcDiag(diagRes.value);
    if (backupRes.status === "fulfilled" && backupRes.value.ok) setPcBackup(backupRes.value);
    if (histRes.status === "fulfilled") setTelemetryHistory(histRes.value);
    if (pcOptHistRes.status === "fulfilled") {
      setPcOptHistory(pcOptHistRes.value.entries || []);
    }
    if (hwSensorsRes.status === "fulfilled" && hwSensorsRes.value.ok) {
      setHwSensors(hwSensorsRes.value);
    }
    if (hwHistRes.status === "fulfilled") {
      setHwHistory(hwHistRes.value);
    }
  }, []);

  useEffect(() => {
    if (!tabActive) return;
    void loadAll();
    const timer = window.setInterval(() => void loadAll(), 15_000);
    return () => window.clearInterval(timer);
  }, [loadAll, tabActive]);

  useEffect(() => {
    if (!tabActive || pcBackup?.status !== "running") return;
    const fastTimer = window.setInterval(() => void refreshPcBackup(), 1500);
    return () => window.clearInterval(fastTimer);
  }, [pcBackup?.status, refreshPcBackup, tabActive]);

  const handleRunPcBackup = useCallback(
    async (mode: "full" | "critical") => {
      setTriggeringBackup(mode);
      try {
        const res = await deskApi.runPcBackup(mode);
        if (res.status) setPcBackup(res.status);
        pushToast({
          type: res.ok ? "success" : "error",
          title: mode === "critical" ? "Quick Critical Backup" : "Full Workstation Backup",
          message: res.alreadyRunning
            ? "Backup is already in progress"
            : res.started
              ? "Backup started — live progress updating"
              : res.error || "Failed to start backup",
        });
      } catch (err) {
        pushToast({
          type: "error",
          title: "PC Backup",
          message: err instanceof Error ? err.message : "Failed to trigger backup",
        });
      } finally {
        setTriggeringBackup(null);
      }
    },
    [pushToast],
  );

  const handleRunPcBackupDrill = useCallback(async () => {
    setVerifyingDrill(true);
    try {
      const res = await deskApi.runPcBackupDrill();
      if (res.status) setPcBackup(res.status);
      pushToast({
        type: res.ok ? "success" : "error",
        title: "Cloud & Restore Drill",
        message: res.drill
          ? `${res.drill.drillOk ? "Archive verified" : "Drill alert"} (${res.drill.drillEntries.toLocaleString()} entries · Cloud ${res.drill.cloudArchiveCount} archives)`
          : res.error || "Verification finished",
      });
    } catch (err) {
      pushToast({
        type: "error",
        title: "Cloud & Restore Drill",
        message: err instanceof Error ? err.message : "Verification failed",
      });
    } finally {
      setVerifyingDrill(false);
    }
  }, [pushToast]);

  const handleRefreshHwSensors = useCallback(async () => {
    setRefreshingSensors(true);
    try {
      const [res, hist] = await Promise.allSettled([
        deskApi.hardwareSensors(true),
        deskApi.hardwareHistory(),
      ]);
      if (res.status === "fulfilled" && res.value.ok) setHwSensors(res.value);
      if (hist.status === "fulfilled") setHwHistory(hist.value);
    } catch {
      /* ignore transient sensor poll error */
    } finally {
      setRefreshingSensors(false);
    }
  }, []);

  const handleLaunchHwTool = useCallback(
    async (tool: "lhm" | "occt" | "crystaldiskinfo") => {
      try {
        const res = await deskApi.launchHardwareTool(tool);
        pushToast({
          type: res.ok ? "success" : "error",
          title: `Launch ${tool.toUpperCase()}`,
          message: res.ok ? `Opened ${res.path}` : res.error || "Tool not available",
        });
      } catch (err) {
        pushToast({
          type: "error",
          title: `Launch ${tool.toUpperCase()}`,
          message: err instanceof Error ? err.message : "Failed to launch tool",
        });
      }
    },
    [pushToast],
  );

  const handleRunSystemImage = useCallback(async () => {
    try {
      const res = await deskApi.runHasleoSystemImage();
      pushToast({
        type: res.ok ? "success" : "error",
        title: "Hasleo System Image (C:\\)",
        message: res.ok ? "Triggered C: OS system image task" : res.error || "Hasleo task not ready",
      });
      await refreshPcBackup();
    } catch (err) {
      pushToast({
        type: "error",
        title: "Hasleo System Image",
        message: err instanceof Error ? err.message : "Failed to trigger Hasleo task",
      });
    }
  }, [pushToast, refreshPcBackup]);

  const handleManageStartLayout = useCallback(
    async (action: "backup" | "restore") => {
      setStartLayoutAction(action);
      try {
        const res = await deskApi.manageStartMenuLayout(action);
        pushToast({
          type: res.ok ? "success" : "error",
          title: action === "backup" ? "Backup Start Menu Layout" : "Restore Start Menu Layout",
          message: res.ok
            ? `${action === "backup" ? "Saved" : "Restored"} ${res.tileCount ?? 0} tiles across ${res.groupCount ?? 0} groups (${Math.round((res.bytes ?? 0) / 1024)} KB)`
            : res.error || `Start Menu layout ${action} failed`,
        });
        await refreshPcBackup();
      } catch (err) {
        pushToast({
          type: "error",
          title: action === "backup" ? "Backup Start Menu Layout" : "Restore Start Menu Layout",
          message: err instanceof Error ? err.message : `Failed to ${action} Start Menu layout`,
        });
      } finally {
        setStartLayoutAction(null);
      }
    },
    [pushToast, refreshPcBackup],
  );

  const handleQuickOptimize = useCallback(
    async (action: PcOptimizeAction, label: string) => {
      setOptimizingAction(action);
      try {
        const res = await deskApi.pcOptimize(action);
        const agySweep = res.results?.antigravitySweep;
        const agyRpc = res.results?.antigravityRpcSync;
        const deepMaint = res.results?.deepMaintenance;
        const ramFreedMB = res.results?.ram?.freedRamBytes
          ? Math.round(res.results.ram.freedRamBytes / (1024 * 1024))
          : 0;
        const diskFreedMB =
          formatDiskBytesLabel(agySweep?.reclaimedBytes) ||
          (deepMaint?.lastPassFreedMB && deepMaint.lastPassFreedMB > 0
            ? `${deepMaint.lastPassFreedMB.toFixed(1)} MB`
            : "");
        const agyParts: string[] = [];
        if (agySweep?.removedSessions) agyParts.push(`${agySweep.removedSessions} sessions`);
        if (agySweep?.prunedArtifacts) agyParts.push(`${agySweep.prunedArtifacts} artifacts`);
        if (agyRpc?.syncedDeleted) agyParts.push(`${agyRpc.syncedDeleted} LS ghosts`);
        const deepParts: string[] = [];
        if (diskFreedMB && deepMaint) deepParts.push(`${diskFreedMB} disk freed`);
        if (ramFreedMB > 0) deepParts.push(`${ramFreedMB} MB RAM freed`);
        const freedSummary =
          action === "deep-maintenance" && deepParts.length > 0
            ? deepParts.join(" · ")
            : agyParts.length > 0
              ? `${agyParts.join(", ")} swept${diskFreedMB ? ` (${diskFreedMB} freed)` : ""}`
              : ramFreedMB > 0
                ? `${ramFreedMB} MB RAM freed`
                : action === "sweep-antigravity"
                  ? "Clean (0 stale items)"
                  : res.results?.junk?.pruned
                    ? "Workspace junk pruned"
                    : "completed";
        pushToast({ type: "success", title: label, message: freedSummary });
        await loadAll();
      } catch (err) {
        pushToast({
          type: "error",
          title: label,
          message: err instanceof Error ? err.message : "Optimization failed",
        });
      } finally {
        setOptimizingAction(null);
      }
    },
    [loadAll, pushToast],
  );

  const selectedDatasets = useMemo<ReadonlySet<DashboardDatasetKey>>(() => {
    const raw = filterValues.data;
    if (!raw || raw.length === 0) return new Set(ALL_DATASET_KEYS);
    const valid = ALL_DATASET_KEYS.filter((k) => raw.includes(k));
    return new Set(valid.length > 0 ? valid : ALL_DATASET_KEYS);
  }, [filterValues.data]);

  const filterDefs = useMemo<FilterDef[]>(
    () => [
      {
        key: "data",
        label: "Data",
        triggerEmoji: "📊",
        suppressDefaultTriggerIcon: true,
        options: [
          { value: "jobs", label: "Sync Jobs", emoji: "📁", count: jobs.length },
          { value: "drives", label: "Drives", emoji: "☁️", count: drives.length },
          { value: "clips", label: "Clips", emoji: "📋", count: clips.length },
          { value: "runners", label: "Runners", emoji: "▶️", count: runners.length },
          { value: "cron", label: "Cron & PC", emoji: "🕒", count: tasks.length },
        ],
      },
    ],
    [clips.length, drives.length, jobs.length, runners.length, tasks.length],
  );

  const rangeUpper = rangeKey.toUpperCase();

  // Compute domain metrics
  const syncedJobsCount = useMemo(
    () => jobs.filter((j) => j.status === "idle" && j.lastResult?.ok !== false).length,
    [jobs],
  );
  const runningJobsCount = useMemo(
    () => jobs.filter((j) => j.status === "running" || j.status === "analyzing").length,
    [jobs],
  );
  const errorJobsCount = useMemo(
    () => jobs.filter((j) => j.status === "error" || j.lastResult?.ok === false).length,
    [jobs],
  );

  const signedDrivesCount = useMemo(
    () => drives.filter((d) => d.authorized).length,
    [drives],
  );
  const totalCloudFreeBytes = useMemo(
    () =>
      drives.reduce((acc, d) => {
        const limit = Number(d.storage?.limitBytes) || 0;
        const used = Number(d.storage?.usedBytes) || 0;
        return acc + Math.max(0, limit - used);
      }, 0),
    [drives],
  );

  const pinnedClipsCount = useMemo(() => clips.filter((c) => c.pinned).length, [clips]);
  const imageClipsCount = useMemo(
    () => clips.filter((c) => c.contentType === "image" || c.hasImage).length,
    [clips],
  );

  const upRunnersCount = useMemo(() => runners.filter((r) => r.up).length, [runners]);
  const readyTasksCount = useMemo(
    () => tasks.filter((t) => /active|ready/i.test(t.status)).length,
    [tasks],
  );
  const failedTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          /failed/i.test(t.status) ||
          (t.lastResult &&
            t.lastResult !== "0" &&
            t.lastResult !== "267009" &&
            t.lastResult !== "267011"),
      ),
    [tasks],
  );
  const daemonTasksCount = useMemo(
    () => tasks.filter((t) => t.kind === "daemon" || /^Daemon-/i.test(t.id)).length,
    [tasks],
  );
  const schtaskCount = useMemo(
    () => tasks.filter((t) => t.kind === "schtask" || /^Dev-/i.test(t.id)).length,
    [tasks],
  );

  const driveD = useMemo(
    () =>
      localDrives.find((d) => d.root.toUpperCase().startsWith("D")) ||
      localDrives[0] ||
      null,
    [localDrives],
  );

  const ramTotalBytes =
    pcDiag?.summary?.ramTotalBytes || hostMetrics?.ramTotalBytes || 0;
  const ramUsedBytes =
    pcDiag?.summary?.ramUsedBytes || hostMetrics?.ramUsedBytes || 0;
  const ramFreeBytes =
    pcDiag?.summary?.ramFreeBytes || Math.max(0, ramTotalBytes - ramUsedBytes);
  const ramUsedPct = Math.round(
    pcDiag?.summary?.ramPercent ?? hostMetrics?.ramPercent ?? 0,
  );
  const totalHandles = pcDiag?.summary?.totalHandles ?? 0;
  const logicalCpus =
    pcDiag?.summary?.topology?.logicalCpuCount ??
    hostMetrics?.logicalProcessorCount ??
    72;
  const cpuGroups =
    pcDiag?.summary?.topology?.groupCount ??
    hostMetrics?.processorGroupCount ??
    2;

  // 8-KPI Golden Standard
  const kpis = useMemo<KpiTileData[]>(() => {
    const dFreeGb = driveD?.freeBytes ? driveD.freeBytes / (1024 * 1024 * 1024) : 307.2;
    const dTotalGb = driveD?.totalBytes ? driveD.totalBytes / (1024 * 1024 * 1024) : 385.9;
    const dFreePct = dTotalGb > 0 ? Math.round((dFreeGb / dTotalGb) * 100) : 80;

    return [
      {
        prefKey: "sync-jobs",
        label: `Sync Jobs (${rangeUpper})`,
        value: `${syncedJobsCount}/${jobs.length}`,
        delta: buildHubDashboardKpiDelta(
          computeKpiDeltaPct(syncedJobsCount, Math.max(1, jobs.length - errorJobsCount)),
          false,
          rangeUpper,
        ),
        hint: `${runningJobsCount} active · ${errorJobsCount} errors`,
        emojiGlyph: "📁",
        tone: errorJobsCount > 0 ? "amber" : "emerald",
        onClick: () => navigateAppScreen("jobs"),
      },
      {
        prefKey: "drive-accounts",
        label: `Google Drives (${rangeUpper})`,
        value: `${signedDrivesCount}/${drives.length}`,
        delta: buildHubDashboardKpiDelta(
          computeKpiDeltaPct(signedDrivesCount, Math.max(1, signedDrivesCount)),
          false,
          rangeUpper,
        ),
        hint: `${formatGiB(totalCloudFreeBytes)} cloud free`,
        emojiGlyph: "☁️",
        tone: "sky",
        onClick: () => navigateAppScreen("drives"),
      },
      {
        prefKey: "clips-vault",
        label: `Clipboard Vault (${rangeUpper})`,
        value: clips.length.toLocaleString(),
        delta: buildHubDashboardKpiDelta(
          computeKpiDeltaPct(clips.length, Math.max(1, clips.length - pinnedClipsCount)),
          false,
          rangeUpper,
        ),
        hint: `${pinnedClipsCount} pinned · ${imageClipsCount} images`,
        emojiGlyph: "📋",
        tone: "violet",
        onClick: () => navigateAppScreen("clips"),
      },
      {
        prefKey: "runners-up",
        label: `Runners Fleet (${rangeUpper})`,
        value: `${upRunnersCount}/${runners.length}`,
        delta: buildHubDashboardKpiDelta(
          computeKpiDeltaPct(upRunnersCount, Math.max(1, pinnedRunners.length)),
          false,
          rangeUpper,
        ),
        hint: `${pinnedRunners.length} watchdog pinned`,
        emojiGlyph: "▶️",
        tone: "emerald",
        onClick: () => navigateAppScreen("runners"),
      },
      {
        prefKey: "cron-healthy",
        label: `Active Crons (${rangeUpper})`,
        value: `${readyTasksCount}/${tasks.length}`,
        delta: buildHubDashboardKpiDelta(
          computeKpiDeltaPct(readyTasksCount, Math.max(1, daemonTasksCount)),
          false,
          rangeUpper,
        ),
        hint:
          failedTasks.length > 0
            ? `⚠️ ${failedTasks.length} failed · ${daemonTasksCount} daemons`
            : `${daemonTasksCount} daemons · ${schtaskCount} schtasks`,
        emojiGlyph: "🕒",
        tone: failedTasks.length > 0 ? "rose" : "amber",
        onClick: () => navigateAppScreen("cron"),
      },
      {
        prefKey: "disk-free",
        label: "Disk D: Free Space",
        value: `${dFreeGb.toFixed(1)} GB`,
        delta: { value: `${dFreePct}% free`, direction: dFreePct >= 25 ? "up" : "down" },
        hint: `of ${dTotalGb.toFixed(0)} GB · Daily 04:15 prune`,
        emojiGlyph: "💾",
        tone: "cyan",
        onClick: () => navigateAppScreen("cron"),
      },
      {
        prefKey: "pc-ram",
        label: "RAM Headroom",
        value: ramTotalBytes > 0 ? formatGiB(ramFreeBytes) : "—",
        delta: {
          value: `${100 - ramUsedPct}% free`,
          direction: ramUsedPct < 80 ? "up" : "down",
        },
        hint: ramTotalBytes > 0 ? `${ramUsedPct}% used of ${formatGiB(ramTotalBytes)}` : "Sampling host RAM…",
        emojiGlyph: "🧠",
        tone: ramUsedPct >= 85 ? "rose" : "indigo",
      },
      {
        prefKey: "pc-handles",
        label: "OS Handles & CPU",
        value: totalHandles > 0 ? totalHandles.toLocaleString() : `${logicalCpus} CPUs`,
        delta: {
          value: `${cpuGroups} groups`,
          direction: totalHandles < 120_000 ? "up" : "down",
        },
        hint: `${logicalCpus} threads · ${pcDiag?.summary?.processCount ?? 0} procs`,
        emojiGlyph: "⚙️",
        tone: totalHandles > 150_000 ? "rose" : "emerald",
      },
    ];
  }, [
    clips.length,
    cpuGroups,
    daemonTasksCount,
    driveD,
    drives.length,
    errorJobsCount,
    failedTasks.length,
    imageClipsCount,
    jobs.length,
    logicalCpus,
    pcDiag?.summary?.processCount,
    pinnedClipsCount,
    pinnedRunners.length,
    ramFreeBytes,
    ramTotalBytes,
    ramUsedPct,
    rangeUpper,
    readyTasksCount,
    runners.length,
    runningJobsCount,
    schtaskCount,
    signedDrivesCount,
    syncedJobsCount,
    tasks.length,
    totalCloudFreeBytes,
    totalHandles,
    upRunnersCount,
  ]);

  // Build time-series growth chart points
  const chartSpec = useMemo(() => {
    if (metricMode === "hardware-temps") {
      const hasCpuSamples = hwHistory.some((h) => h.cpuTempC != null) || hwSensors?.cpu.packageTempC != null;
      const leftMeta = { label: "GPU Temp (°C)", color: "#f59e0b", emoji: "🌡️" };
      const rightMeta = hasCpuSamples
        ? { label: "CPU Temp (°C)", color: "#22d3ee", emoji: "❄️" }
        : { label: "SSD Temp (°C)", color: "#22d3ee", emoji: "💾" };

      const liveGpu = Math.round(hwSensors?.gpu?.tempC ?? 0);
      const liveRight = Math.round(
        (hasCpuSamples ? hwSensors?.cpu.packageTempC : hwSensors?.storage?.[0]?.tempC) ?? 0,
      );

      let points: HubTimeSeriesLinePoint[];
      if (granularity === "hour" && hwHistory.length >= 2) {
        points = hwHistory.slice(-60).map((h, idx) => {
          const d = new Date(h.ts);
          const label = Number.isFinite(d.getTime())
            ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
            : `#${idx + 1}`;
          const rightVal = hasCpuSamples
            ? Math.round(h.cpuTempC ?? liveRight)
            : Math.round(h.ssdTempC ?? liveRight);
          return {
            key: `${h.ts}-${idx}`,
            label,
            left: Math.round(h.gpuTempC ?? liveGpu),
            right: rightVal,
          };
        });
      } else {
        const buckets = buildTimeBuckets(rangeKey, granularity);
        let lastGpu = liveGpu;
        let lastRight = liveRight;
        const firstKnownGpu = hwHistory.find((h) => h.gpuTempC != null)?.gpuTempC ?? liveGpu;
        const firstKnownRight =
          hwHistory.find((h) => (hasCpuSamples ? h.cpuTempC : h.ssdTempC) != null)?.[
            hasCpuSamples ? "cpuTempC" : "ssdTempC"
          ] ?? liveRight;
        lastGpu = Math.round(firstKnownGpu);
        lastRight = Math.round(firstKnownRight);

        points = buckets.map((b, idx) => {
          const inBucket = hwHistory.filter((h) => {
            const ms = Date.parse(h.ts);
            return Number.isFinite(ms) && ms >= b.startMs && ms <= b.endMs;
          });
          if (inBucket.length > 0) {
            const gMax = Math.max(...inBucket.map((h) => h.gpuTempC ?? lastGpu));
            const rMax = Math.max(
              ...inBucket.map((h) => (hasCpuSamples ? h.cpuTempC : h.ssdTempC) ?? lastRight),
            );
            lastGpu = Math.round(gMax);
            lastRight = Math.round(rMax);
          } else if (idx === buckets.length - 1) {
            if (liveGpu > 0) lastGpu = liveGpu;
            if (liveRight > 0) lastRight = liveRight;
          }
          return { key: b.key, label: b.label, left: lastGpu, right: lastRight };
        });
      }

      return {
        points,
        leftMeta,
        rightMeta,
        caption: `Hardware Telemetry — ${leftMeta.label} & ${rightMeta.label} (${granularity === "hour" ? "LIVE" : rangeUpper})`,
        captionEmoji: leftMeta.emoji,
        isHardwareTemps: true,
        isPowerRail: false,
      };
    }

    if (metricMode === "power-rail") {
      const leftMeta = { label: "+3.3V Rail (V)", color: "#34d399", emoji: "⚡" };
      const rightMeta = { label: "GPU Power (W)", color: "#f59e0b", emoji: "🔌" };
      const liveV33Mv = Math.round(
        ((hwSensors?.sensorLogger?.v33 ?? hwSensors?.motherboard?.voltage33V ?? 3.3) * 1000),
      );
      const livePwr = Math.round(hwSensors?.gpu?.powerDrawW ?? 0);

      let points: HubTimeSeriesLinePoint[];
      const v33Rows = hwHistory.filter((h) => h.v33 != null && h.v33 > 0);
      if (granularity === "hour" && (v33Rows.length >= 2 || hwHistory.length >= 2)) {
        let lastMv = liveV33Mv;
        let lastPwr = livePwr;
        points = hwHistory.slice(-60).map((h, idx) => {
          const d = new Date(h.ts);
          const label = Number.isFinite(d.getTime())
            ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
            : `#${idx + 1}`;
          if (h.v33 != null && h.v33 > 0) lastMv = Math.round(h.v33 * 1000);
          if (h.gpuPowerW != null) lastPwr = Math.round(h.gpuPowerW);
          return { key: `${h.ts}-${idx}`, label, left: lastMv, right: lastPwr };
        });
      } else {
        const buckets = buildTimeBuckets(rangeKey, granularity);
        const firstKnownV33 = v33Rows[0]?.v33;
        let lastMv = firstKnownV33 != null ? Math.round(firstKnownV33 * 1000) : liveV33Mv;
        let lastPwr = Math.round(hwHistory.find((h) => h.gpuPowerW != null)?.gpuPowerW ?? livePwr);
        points = buckets.map((b, idx) => {
          const inBucket = hwHistory.filter((h) => {
            const ms = Date.parse(h.ts);
            return Number.isFinite(ms) && ms >= b.startMs && ms <= b.endMs;
          });
          if (inBucket.length > 0) {
            const bucketV33 = inBucket.map((h) => h.v33).filter((v): v is number => v != null && v > 0);
            if (bucketV33.length > 0) lastMv = Math.round(Math.min(...bucketV33) * 1000);
            const bucketPwr = inBucket.map((h) => h.gpuPowerW).filter((p): p is number => p != null);
            if (bucketPwr.length > 0) lastPwr = Math.round(Math.max(...bucketPwr));
          } else if (idx === buckets.length - 1) {
            lastMv = liveV33Mv;
            if (livePwr > 0) lastPwr = livePwr;
          }
          return { key: b.key, label: b.label, left: lastMv, right: lastPwr };
        });
      }

      return {
        points,
        leftMeta,
        rightMeta,
        caption: `ATX Power Telemetry — +3.3V Rail & GPU Draw (${granularity === "hour" ? "LIVE" : rangeUpper})`,
        captionEmoji: leftMeta.emoji,
        isHardwareTemps: false,
        isPowerRail: true,
      };
    }

    const buckets = buildTimeBuckets(rangeKey, granularity);
    let leftMeta = DATASET_META.jobs;
    let rightMeta = DATASET_META.clips;

    if (metricMode === "runners-cron") {
      leftMeta = DATASET_META.runners;
      rightMeta = DATASET_META.cron;
    } else if (metricMode === "drives-jobs") {
      leftMeta = DATASET_META.drives;
      rightMeta = DATASET_META.jobs;
    } else if (metricMode === "disk-ram") {
      leftMeta = { label: "Disk D: Free (GB)", color: "#22d3ee", emoji: "💾" };
      rightMeta = { label: "RAM Free (GB)", color: "#818cf8", emoji: "🧠" };
    }

    let accLeft = 0;
    let accRight = 0;
    const dFreeGb = driveD?.freeBytes ? Math.round(driveD.freeBytes / (1024 * 1024 * 1024)) : 311;
    const ramFreeGb = ramFreeBytes > 0 ? Math.round(ramFreeBytes / (1024 * 1024 * 1024)) : 18;

    const points: HubTimeSeriesLinePoint[] = buckets.map((b, idx) => {
      const snapsInBucket = telemetryHistory.filter((s) => {
        const ms = Date.parse(s.ts);
        return Number.isFinite(ms) && ms >= b.startMs && ms <= b.endMs;
      });
      const latestSnap = snapsInBucket[snapsInBucket.length - 1] || null;

      const clipsInBucket = clips.filter((c) => {
        const ms = new Date(c.updatedAt || c.createdAt).getTime();
        return ms >= b.startMs && ms <= b.endMs;
      }).length;
      const jobsInBucket = jobs.filter((j) => {
        const ms = new Date(j.lastRunAt || j.updatedAt || j.createdAt || 0).getTime();
        return ms >= b.startMs && ms <= b.endMs;
      }).length;
      const cronInBucket = tasks.filter((t) => {
        const ms = new Date(t.lastRun || 0).getTime();
        return ms >= b.startMs && ms <= b.endMs;
      }).length;

      let leftVal = 0;
      let rightVal = 0;
      if (metricMode === "sync-clips") {
        leftVal =
          jobsInBucket ||
          latestSnap?.syncedJobs ||
          (idx === buckets.length - 1 ? syncedJobsCount : Math.max(1, Math.round(syncedJobsCount * 0.6)));
        rightVal =
          clipsInBucket ||
          latestSnap?.clipsCount ||
          (idx === buckets.length - 1 ? Math.min(25, clips.length) : Math.max(1, idx % 5));
      } else if (metricMode === "runners-cron") {
        leftVal = latestSnap?.runnersUp ?? upRunnersCount;
        rightVal =
          cronInBucket ||
          latestSnap?.readyCrons ||
          (idx === buckets.length - 1 ? readyTasksCount : daemonTasksCount);
      } else if (metricMode === "drives-jobs") {
        leftVal = latestSnap?.signedDrives ?? signedDrivesCount;
        rightVal = jobsInBucket || latestSnap?.syncedJobs || syncedJobsCount;
      } else {
        leftVal = latestSnap?.diskFreeGb ? Math.round(latestSnap.diskFreeGb) : dFreeGb;
        rightVal = latestSnap?.ramFreeGb ? Math.round(latestSnap.ramFreeGb) : ramFreeGb;
      }

      if (seriesMode === "cumulative" && metricMode !== "disk-ram") {
        accLeft += leftVal;
        accRight += rightVal;
        return { key: b.key, label: b.label, left: accLeft, right: accRight };
      }
      return { key: b.key, label: b.label, left: leftVal, right: rightVal };
    });

    const prefix = seriesMode === "cumulative" ? "Cumulative Activity" : "Live Activity";
    return {
      points,
      leftMeta,
      rightMeta,
      caption: `${prefix} — ${leftMeta.label} & ${rightMeta.label} (${rangeUpper})`,
      captionEmoji: leftMeta.emoji,
      isHardwareTemps: false,
    };
  }, [
    clips,
    daemonTasksCount,
    driveD?.freeBytes,
    granularity,
    hwHistory,
    hwSensors,
    jobs,
    metricMode,
    ramFreeBytes,
    rangeKey,
    rangeUpper,
    readyTasksCount,
    seriesMode,
    signedDrivesCount,
    syncedJobsCount,
    tasks,
    telemetryHistory,
    upRunnersCount,
  ]);

  // 4 MiniBarChart breakdown cards
  const breakdownCharts = useMemo<
    { key: string; title: string; items: BarItem[]; preserveOrder?: boolean }[]
  >(() => {
    const formatCounts: Record<string, number> = {};
    for (const c of clips) {
      const fmt = clipPickerFormat(c);
      formatCounts[fmt] = (formatCounts[fmt] || 0) + 1;
    }

    const pausedJobs = jobs.filter((j) => j.status === "paused" || j.status === "stopped").length;
    const uiRunnersUp = runners.filter((r) => r.kind !== "worker" && r.up).length;
    const workerRunnersUp = runners.filter((r) => r.kind === "worker" && r.up).length;
    const downRunners = runners.filter((r) => !r.up).length;

    return [
      {
        key: "sync-status",
        title: `Sync Jobs Status (${rangeUpper})`,
        preserveOrder: true,
        items: [
          { label: "✅ Synced / Ready", value: syncedJobsCount },
          { label: "▶️ Running", value: runningJobsCount },
          { label: "⏸️ Paused / Stopped", value: pausedJobs },
          { label: "⛔ Failed / Conflict", value: errorJobsCount },
        ],
      },
      {
        key: "clip-formats",
        title: `Clipboard Formats (${rangeUpper})`,
        preserveOrder: true,
        items: [
          { label: "📝 Text", value: formatCounts.Text || 0 },
          { label: "🖼️ Image", value: formatCounts.Image || 0 },
          { label: "🌐 Link", value: formatCounts.Link || 0 },
          { label: "📁 Path / JSON", value: (formatCounts.Path || 0) + (formatCounts.JSON || 0) },
        ],
      },
      {
        key: "runner-fleet",
        title: `Runner Fleet (${rangeUpper})`,
        preserveOrder: true,
        items: [
          { label: "🖥️ UI Apps Up", value: uiRunnersUp },
          { label: "⚙️ Workers Up", value: workerRunnersUp },
          { label: "📌 Watchdog Pinned", value: pinnedRunners.length },
          { label: "⛔ Offline", value: downRunners },
        ],
      },
      {
        key: "cron-telemetry",
        title: `Cron & PC Hygiene (${rangeUpper})`,
        preserveOrder: true,
        items: [
          { label: "⚡ Built-in Daemons", value: daemonTasksCount },
          { label: "📅 Win Scheduled (Dev-*)", value: schtaskCount },
          { label: "✅ Active", value: readyTasksCount },
          { label: "⚙️ CPU Groups", value: cpuGroups },
        ],
      },
    ];
  }, [
    clips,
    cpuGroups,
    daemonTasksCount,
    errorJobsCount,
    jobs,
    pinnedRunners.length,
    rangeUpper,
    readyTasksCount,
    runners,
    runningJobsCount,
    schtaskCount,
    syncedJobsCount,
  ]);

  const recentJobs = useMemo(() => jobs.slice(0, 5), [jobs]);
  const recentClips = useMemo(() => clips.slice(0, 5), [clips]);
  const topRunners = useMemo(
    () =>
      [...runners]
        .sort((a, b) => Number(b.up) - Number(a.up) || a.code.localeCompare(b.code))
        .slice(0, 5),
    [runners],
  );
  const topTasks = useMemo(() => tasks.slice(0, 5), [tasks]);

  const jumpTo = (screen: AppScreen) => {
    navigateAppScreen(screen);
  };

  return (
    <HubInactiveTabContent active={tabActive}>
      <HubDirectoryScreen
        header={
          <HubListChromeHeader
            ariaLabel="Dashboard header"
            titleIcon={TrendingUp}
            titleIconClass="text-amber-300"
            titleEmojiGlyph={DESK_SCREEN_TITLE_EMOJI.dashboard}
            title="Dashboard"
            metaItems={deskVersionMetaItems()}
            centerStats={centerStats}
            versionReleaseNotesCode="P0001"
            versionReleaseNotesDesktopUpdate={desktopUpdate}
            actions={<TabHeaderActions />}
            embedded={headerChrome.embedded}
          />
        }
        hideSearch
        kpis={kpis}
        filters={filterDefs}
        filterValues={filterValues}
        onFilterValuesChange={setFilterValues}
        filterToolbar={
          <div className="flex flex-wrap items-center gap-1.5">
            <HubSegmentToggle value={rangeKey} onChange={setRangeKey} options={RANGE_OPTIONS} />
            <HubSegmentToggle value={granularity} onChange={setGranularity} options={GRANULARITY_OPTIONS} />
            <HubSegmentToggle value={metricMode} onChange={setMetricMode} options={METRIC_MODE_OPTIONS} />
            <HubSegmentToggle value={seriesMode} onChange={setSeriesMode} options={SERIES_MODE_OPTIONS} />
          </div>
        }
      >
        <div className="flex flex-col gap-[var(--hub-kpi-gap)] pb-4">
          <HubPanel className="p-3">
            <DashboardGrowthChart
              compact
              points={chartSpec.points}
              caption={chartSpec.caption}
              captionEmoji={chartSpec.captionEmoji}
              leftName={chartSpec.leftMeta.label}
              rightName={chartSpec.rightMeta.label}
              leftColor={chartSpec.leftMeta.color}
              rightColor={chartSpec.rightMeta.color}
              leftFloor={chartSpec.isHardwareTemps ? 90 : chartSpec.isPowerRail ? 3350 : 4}
              rightFloor={chartSpec.isHardwareTemps ? 90 : chartSpec.isPowerRail ? 150 : 4}
              sharedScale={chartSpec.isHardwareTemps}
              formatLeftTick={
                chartSpec.isHardwareTemps
                  ? (v) => `${Math.round(v)}°`
                  : chartSpec.isPowerRail
                    ? (v) => `${(v / 1000).toFixed(2)}V`
                    : undefined
              }
              formatRightTick={
                chartSpec.isHardwareTemps
                  ? (v) => `${Math.round(v)}°`
                  : chartSpec.isPowerRail
                    ? (v) => `${Math.round(v)}W`
                    : undefined
              }
              formatLeftValue={
                chartSpec.isHardwareTemps
                  ? (v) => `${Math.round(v)} °C`
                  : chartSpec.isPowerRail
                    ? (v) => `${(v / 1000).toFixed(3)} V`
                    : undefined
              }
              formatRightValue={
                chartSpec.isHardwareTemps
                  ? (v) => `${Math.round(v)} °C`
                  : chartSpec.isPowerRail
                    ? (v) => `${Math.round(v)} W`
                    : undefined
              }
            />
          </HubPanel>

          <PcBackupStatusPanel
            status={pcBackup}
            triggeringMode={triggeringBackup}
            verifyingDrill={verifyingDrill}
            startLayoutAction={startLayoutAction}
            onRunBackup={(mode) => void handleRunPcBackup(mode)}
            onRunDrill={() => void handleRunPcBackupDrill()}
            onOpenRestore={() => setRestoreOpen(true)}
            onRunSystemImage={() => void handleRunSystemImage()}
            onManageStartLayout={(action) => void handleManageStartLayout(action)}
            onRefresh={() => void refreshPcBackup()}
            onOpenCron={() => jumpTo("cron")}
          />

          <HardwareHealthPanel
            sensors={hwSensors}
            history={hwHistory}
            cpuPercent={hostMetrics?.cpuReady ? hostMetrics.cpuPercent : null}
            logicalCpus={logicalCpus}
            refreshing={refreshingSensors}
            onRefresh={() => void handleRefreshHwSensors()}
            onLaunchTool={(tool) => void handleLaunchHwTool(tool)}
          />

          <div className="grid grid-cols-1 gap-[var(--hub-kpi-gap)] md:grid-cols-2 xl:grid-cols-4">
            {breakdownCharts.map((chart) => (
              <MiniBarChart
                key={chart.key}
                title={chart.title}
                items={chart.items}
                preserveOrder={chart.preserveOrder}
                formatter={(n) => n.toLocaleString("en-US")}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-[var(--hub-kpi-gap)] md:grid-cols-2 xl:grid-cols-4">
            {selectedDatasets.has("jobs") || selectedDatasets.has("drives") ? (
              <HubPanel className="flex flex-col p-3.5" data-dashboard-recent="jobs">
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FolderKanban className="h-4 w-4 text-emerald-400" aria-hidden />
                    <span className="text-xs font-semibold tracking-tight text-[var(--text)]">
                      Live Sync Jobs
                    </span>
                    <DashboardLivePulseBadge />
                  </div>
                  <button
                    type="button"
                    onClick={() => jumpTo("jobs")}
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-[var(--muted)] transition-colors hover:bg-white/5 hover:text-[var(--text)]"
                  >
                    View all
                    <ArrowUpRight className="h-3 w-3" aria-hidden />
                  </button>
                </div>
                <div className="divide-y divide-white/[0.06]">
                  {recentJobs.length === 0 ? (
                    <p className="py-6 text-center text-xs text-[var(--muted)]">No sync jobs configured</p>
                  ) : (
                    recentJobs.map((job, idx) => (
                      <button
                        key={job.id}
                        type="button"
                        onClick={() => jumpTo("jobs")}
                        className="group flex w-full items-center justify-between gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-white/[0.04]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {idx === 0 ? (
                              <span className="inline-block h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-emerald-400" />
                            ) : null}
                            <span className="truncate text-xs font-medium text-[var(--text)] group-hover:text-emerald-300">
                              {job.name}
                            </span>
                            {job.code ? (
                              <span className="shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted)]">
                                {job.code}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--muted)]">
                            <span className="truncate">{job.remote}</span>
                            <span>·</span>
                            <span className="shrink-0">{job.mode}</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-0.5">
                          <span className="text-xs font-semibold text-emerald-300">
                            {job.status === "idle" ? "Synced" : job.status}
                          </span>
                          {job.lastRunAt || job.updatedAt ? (
                            <HubChromeActivityAge
                              at={job.lastRunAt || job.updatedAt || ""}
                              relativeOnly
                              className="text-[10px]"
                            />
                          ) : null}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </HubPanel>
            ) : null}

            {selectedDatasets.has("clips") ? (
              <HubPanel className="flex flex-col p-3.5" data-dashboard-recent="clips">
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-violet-400" aria-hidden />
                    <span className="text-xs font-semibold tracking-tight text-[var(--text)]">
                      Latest 5 Clips
                    </span>
                    <DashboardLivePulseBadge />
                  </div>
                  <button
                    type="button"
                    onClick={() => jumpTo("clips")}
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-[var(--muted)] transition-colors hover:bg-white/5 hover:text-[var(--text)]"
                  >
                    View all
                    <ArrowUpRight className="h-3 w-3" aria-hidden />
                  </button>
                </div>
                <div className="divide-y divide-white/[0.06]">
                  {recentClips.length === 0 ? (
                    <p className="py-6 text-center text-xs text-[var(--muted)]">No clipboard items yet</p>
                  ) : (
                    recentClips.map((clip, idx) => {
                      const fmt = clipPickerFormat(clip);
                      return (
                        <button
                          key={clip.id}
                          type="button"
                          onClick={() => jumpTo("clips")}
                          className="group flex w-full items-center justify-between gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-white/[0.04]"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              {idx === 0 ? (
                                <span className="inline-block h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-violet-400" />
                              ) : null}
                              <span className="truncate text-xs font-medium text-[var(--text)] group-hover:text-violet-300">
                                {clip.name || clip.text.slice(0, 48) || "Clip item"}
                              </span>
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--muted)]">
                              <span>{fmt}</span>
                              {clip.pinned ? (
                                <>
                                  <span>·</span>
                                  <span className="text-amber-300">📌 Pinned</span>
                                </>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-0.5">
                            <span className="text-xs font-semibold text-violet-300">{clip.source || "clip"}</span>
                            <HubChromeActivityAge
                              at={clip.updatedAt || clip.createdAt}
                              relativeOnly
                              className="text-[10px]"
                            />
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </HubPanel>
            ) : null}

            {selectedDatasets.has("runners") ? (
              <HubPanel className="flex flex-col p-3.5" data-dashboard-recent="runners">
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <PlayCircle className="h-4 w-4 text-amber-400" aria-hidden />
                    <span className="text-xs font-semibold tracking-tight text-[var(--text)]">
                      Active Runners Fleet
                    </span>
                    <DashboardLivePulseBadge />
                  </div>
                  <button
                    type="button"
                    onClick={() => jumpTo("runners")}
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-[var(--muted)] transition-colors hover:bg-white/5 hover:text-[var(--text)]"
                  >
                    View all
                    <ArrowUpRight className="h-3 w-3" aria-hidden />
                  </button>
                </div>
                <div className="divide-y divide-white/[0.06]">
                  {topRunners.map((r, idx) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => jumpTo("runners")}
                      className="group flex w-full items-center justify-between gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-white/[0.04]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {idx === 0 && r.up ? (
                            <span className="inline-block h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-emerald-400" />
                          ) : null}
                          <span className="truncate text-xs font-medium text-[var(--text)] group-hover:text-amber-300">
                            {r.name}
                          </span>
                          <span className="shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted)]">
                            {r.code}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--muted)]">
                          <span>:{r.port}</span>
                          <span>·</span>
                          <span>{r.kind}</span>
                          {pinnedRunners.includes(r.code.toUpperCase()) ? (
                            <>
                              <span>·</span>
                              <span className="text-cyan-300">📌 Auto-heal</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-0.5">
                        <span className={`text-xs font-semibold ${r.up ? "text-emerald-300" : "text-rose-300"}`}>
                          {r.up ? "Up" : "Down"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </HubPanel>
            ) : null}

            {selectedDatasets.has("cron") ? (
              <HubPanel className="flex flex-col p-3.5" data-dashboard-recent="cron">
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-cyan-400" aria-hidden />
                    <span className="text-xs font-semibold tracking-tight text-[var(--text)]">
                      Cron & PC Hygiene
                    </span>
                    <DashboardLivePulseBadge />
                  </div>
                  <button
                    type="button"
                    onClick={() => jumpTo("cron")}
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-[var(--muted)] transition-colors hover:bg-white/5 hover:text-[var(--text)]"
                  >
                    View all
                    <ArrowUpRight className="h-3 w-3" aria-hidden />
                  </button>
                </div>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={optimizingAction !== null}
                    onClick={() => void handleQuickOptimize("deep-maintenance", "Deep Maintenance")}
                    className="inline-flex items-center gap-1 rounded-md border border-emerald-400/25 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                  >
                    <Zap className="h-3 w-3" aria-hidden />
                    Deep Maintenance
                  </button>
                  <button
                    type="button"
                    disabled={optimizingAction !== null}
                    onClick={() => void handleQuickOptimize("trim-ram", "Trim RAM")}
                    className="inline-flex items-center gap-1 rounded-md border border-sky-400/25 bg-sky-500/10 px-2 py-1 text-xs font-medium text-sky-300 hover:bg-sky-500/20 disabled:opacity-50"
                  >
                    <Cpu className="h-3 w-3" aria-hidden />
                    Trim RAM
                  </button>
                  <button
                    type="button"
                    disabled={optimizingAction !== null}
                    onClick={() => void handleQuickOptimize("prune-junk", "Prune Disk Cache")}
                    className="inline-flex items-center gap-1 rounded-md border border-amber-400/25 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
                  >
                    <HardDrive className="h-3 w-3" aria-hidden />
                    Prune Disk
                  </button>
                </div>
                {pcDiag ? (
                  <div
                    className="mb-2 flex flex-col gap-1.5 rounded-md border border-cyan-500/20 bg-cyan-500/[0.06] px-2.5 py-1.5 text-xs text-cyan-200"
                    data-testid="dual-xeon-core-shield-pill"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <span className="font-medium">
                        🛡️ Core Shield: G0({pcDiag.summary.topology.affinityCounts["0"] ?? 0})/G1({pcDiag.summary.topology.affinityCounts["1"] ?? 0}) · Headless {pcDiag.summary.smokePool.leakedHeadlessFarmCount ?? 0}/{pcDiag.summary.adaptiveThrottle?.maxHeadlessConcurrent ?? 8} · Popups Guarded: {pcDiag.summary.suppressedConsolePopups ?? 0}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[var(--muted)]" data-testid="agy-brain-size-badge">
                          AGY DB: {pcDiag.summary.antigravityBrain?.openTabCount ?? 0}/{pcDiag.summary.antigravityBrain?.sessionCount ?? 0} open · {pcDiag.summary.antigravityBrain?.totalMB ?? 0} MB (DB {pcDiag.summary.antigravityBrain?.convMB ?? 0}M · LS {pcDiag.summary.antigravityBrain?.lsRamMB ?? 0}M)
                        </span>
                        <button
                          type="button"
                          disabled={optimizingAction !== null}
                          onClick={() => void handleQuickOptimize("sweep-antigravity", "Purge Antigravity Logs")}
                          data-testid="purge-agy-logs-btn"
                          className="rounded border border-cyan-400/30 bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-50"
                        >
                          Purge AGY
                        </button>
                      </div>
                    </div>
                    {(() => {
                      const latestSweep = pcOptHistory.find(
                        (e) => typeof e.reclaimedBytes === "number" && e.reclaimedBytes > 0,
                      ) || pcOptHistory[0];
                      if (!latestSweep) return null;
                      const totalReclaimed = pcOptHistory.reduce(
                        (acc, e) => acc + (Number(e.reclaimedBytes || 0) > 0 ? Number(e.reclaimedBytes || 0) : 0),
                        0,
                      );
                      const lastLabel = formatDiskBytesLabel(latestSweep.reclaimedBytes) || "0 KB";
                      const totalLabel =
                        pcOptHistory.length > 1 && totalReclaimed > Number(latestSweep.reclaimedBytes || 0)
                          ? ` (∑ ${formatDiskBytesLabel(totalReclaimed)})`
                          : "";
                      return (
                        <div
                          className="flex flex-wrap items-center justify-between gap-1.5 border-t border-cyan-500/15 pt-1 text-[10px] text-emerald-300/90"
                          data-testid="pc-opt-reclaimed-badge"
                          title={latestSweep.message}
                        >
                          <span className="truncate font-medium">
                            Last Sweep ({latestSweep.action}): {lastLabel} freed{totalLabel}
                          </span>
                          <HubChromeActivityAge at={latestSweep.at} className="shrink-0 text-[var(--muted)]" />
                        </div>
                      );
                    })()}
                    {pcDiag.summary.antigravityBrain?.openBloatedTabs &&
                    pcDiag.summary.antigravityBrain.openBloatedTabs.length > 0 ? (
                      <div
                        className="flex flex-wrap items-center gap-1 border-t border-cyan-500/15 pt-1 text-[10px]"
                        data-testid="agy-open-bloated-tabs"
                      >
                        <span className="font-semibold text-amber-300">Heavy Tabs:</span>
                        {pcDiag.summary.antigravityBrain.openBloatedTabs.map((tab) => (
                          <span
                            key={tab.id}
                            title={`${tab.title} (${tab.id}) — ${tab.steps.toLocaleString()} steps · ${tab.dbMB} MB`}
                            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono ${
                              tab.openInIde
                                ? "border border-amber-400/30 bg-amber-500/15 text-amber-200"
                                : "border border-white/10 bg-white/[0.04] text-[var(--muted)]"
                            }`}
                          >
                            <span>{tab.openInIde ? "🟢" : "⚪"}</span>
                            <span className="max-w-[120px] truncate font-sans font-medium">{tab.title}</span>
                            <span>
                              {(tab.steps / 1000).toFixed(1)}k · {tab.dbMB}M
                            </span>
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {failedTasks.length > 0 ? (
                  <div className="mb-2 flex items-center justify-between gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-200">
                    <span className="truncate">
                      ⛔ {failedTasks[0].name} exited with code {failedTasks[0].lastResult}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        void deskApi.runTask(failedTasks[0].id).then(() => {
                          pushToast({
                            type: "success",
                            title: failedTasks[0].name,
                            message: "Triggered recovery run",
                          });
                          return loadAll();
                        });
                      }}
                      className="shrink-0 rounded bg-rose-500/25 px-2 py-0.5 text-xs font-semibold text-rose-100 hover:bg-rose-500/40"
                    >
                      Run Now
                    </button>
                  </div>
                ) : null}
                <div className="divide-y divide-white/[0.06]">
                  {topTasks.map((t, idx) => {
                    const isDaemon = t.kind === "daemon" || /^Daemon-/i.test(t.id);
                    const statusLabel = /^ready$/i.test(t.status || "") ? "Active" : t.status || "Active";
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => jumpTo("cron")}
                        className="group flex w-full items-center justify-between gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-white/[0.04]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {idx === 0 ? (
                              <span className="inline-block h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-cyan-400" />
                            ) : null}
                            <span className="truncate text-xs font-medium text-[var(--text)] group-hover:text-cyan-300">
                              {t.name}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--muted)]">
                            <span>{isDaemon ? "⚡ Daemon" : "📅 Schtask"}</span>
                            <span>·</span>
                            <span className="truncate">{t.schedule || t.nextRun || "Scheduled"}</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-0.5">
                          <span className="text-xs font-semibold text-cyan-300">{statusLabel}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </HubPanel>
            ) : null}
          </div>
        </div>
      </HubDirectoryScreen>
      <RestoreSnapshotsModal open={restoreOpen} onClose={() => setRestoreOpen(false)} />
    </HubInactiveTabContent>
  );
}
