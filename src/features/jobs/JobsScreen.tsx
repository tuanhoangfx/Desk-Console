// no-read-only-table: Jobs directory uses HubDirectoryTableShell with interactive run actions and detail modals.
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DIRECTORY_SEARCH_CLIENT_FILTER_OPTS,
  HubDirectoryBulkDetailModal,
  HubDirectoryCatalogBulkBar,
  HubDirectoryScreen,
  activeHubDirectoryKpiKey,
  buildHubDirectoryStandardKpis,
  buildSearchHaystackIndex,
  directoryChartBandNode,
  hubDirectoryListResetKey,
  hubDirectoryPeriodRows,
  isHubPrefVisible,
  matchesHubDirectoryDateFilters,
  readHubListPrefsCore,
  selectHubDirectoryKpiFilter,
  subscribeHubListPrefs,
  useDirectorySearchQuery,
  useHubDirectorySelection,
  useHubTablePageSize,
  useWorkspacePeriod,
  withPinnedFilterDefs,
  type FilterDef,
  type FilterValues,
  type HubDirectoryLifecycleMode,
  type HubViewMode,
  type KpiTileData,
} from "@tool-workspace/hub-ui";
import { FolderSyncDirectoryToolbar } from "../../components/FolderSyncDirectoryToolbar";
import { FolderSyncTabHeader } from "../../components/FolderSyncTabHeader";
import { FolderSyncTabHeaderActions } from "../../components/FolderSyncTabHeaderActions";
import { useDeskTabActive } from "../../lib/desk-active-screen";
import { SCREEN_DISPLAY_PREFS } from "../../lib/display-prefs-registry";
import {
  hydrateP0001JobsMirror,
  readCachedP0001Jobs,
  reconcileP0001JobsDelta,
} from "../../lib/p0001-desk-mirror-store";
import {
  cleanJobExcludedOnDrive,
  createJob,
  deleteJob,
  deleteJobForever,
  fetchJobs,
  restoreJob,
  startJob,
  stopJob,
  subscribeSyncEvents,
  updateJob,
  type SyncJob,
} from "../../lib/sync-api";
import { applyJobsDirectoryFilterHints, JOBS_STATUS_HINT_LINES } from "../../lib/folder-sync-directory-column-hints";
import { JOB_MODE_OPTIONS, jobRunAction, jobStatusView } from "../../lib/job-mode";
import { formatDrivePath, remoteNameFromSpec } from "../../lib/remote-name";
import { useDriveAccounts } from "../drives/use-drive-accounts";
import { buildJobsChartData } from "./folder-sync-charts";
import { JOB_STATUS_KPI_FILTERS, jobMatchesStatusFilter, jobStatusCounts } from "./jobs-kpi-filter";
import { JobDetailModal } from "./JobDetailModal";
import { JobsCreateModal } from "./JobsCreateModal";
import { JobsDirectoryCards } from "./JobsDirectoryCards";
import { JobsDirectoryTable } from "./JobsDirectoryTable";
import { useHostHeaderStats } from "../../hooks/useHostHeaderStats";
import { navScreenChrome } from "../../lib/nav-structure";

const MODE_FILTER: FilterDef = {
  key: "mode",
  label: "Mode",
  options: JOB_MODE_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
    emoji: option.emoji,
    tip: option.detail,
  })),
};

const STATUS_FILTER: FilterDef = {
  key: "status",
  label: "Status",
  options: JOBS_STATUS_HINT_LINES.map((line) => ({
    value: line.label,
    label: line.label,
    tip: line.detail,
    glyph: line.statusDot ? (
      <span className={`hub-users-status-dot hub-users-status-dot--${line.statusDot}`} aria-hidden />
    ) : undefined,
  })),
};

const BASE_JOBS_FILTERS = applyJobsDirectoryFilterHints([
  MODE_FILTER,
  STATUS_FILTER,
]);

/** Jobs — Layout 1 Directory SSOT (P0020 Services parity: Header · Filters · 8 KPIs · 4 Charts · Table). */
export function JobsScreen() {
  const tabActive = useDeskTabActive("jobs");
  const { accounts: driveAccounts } = useDriveAccounts();
  const [jobs, setJobs] = useState<SyncJob[]>(() => readCachedP0001Jobs());
  const search = useDirectorySearchQuery(DIRECTORY_SEARCH_CLIENT_FILTER_OPTS);
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [viewMode, setViewMode] = useState<HubViewMode>("table");
  const [lifecycle, setLifecycle] = useState<HubDirectoryLifecycleMode>("live");
  const period = useWorkspacePeriod("jobs", "all");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sseConnected, setSseConnected] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkDetailOpen, setBulkDetailOpen] = useState(false);
  const [initialSyncFolder, setInitialSyncFolder] = useState<string>("");
  const [detailId, setDetailId] = useState<string>("");
  const [prefs, setPrefs] = useState(readHubListPrefsCore);
  const pageSize = useHubTablePageSize();
  const centerStats = useHostHeaderStats();
  const jobsChrome = navScreenChrome("jobs");
  const display = SCREEN_DISPLAY_PREFS.jobs;
  const defaultKpiKeys = useMemo(() => new Set(display?.defaultKpiKeys ?? []), [display]);
  const defaultChartKeys = useMemo(() => new Set(display?.defaultChartKeys ?? []), [display]);
  const defaultFilterKeys = useMemo(() => new Set(display?.defaultFilterKeys ?? ["drive", "mode", "status"]), [display]);

  useEffect(() => subscribeHubListPrefs(() => setPrefs(readHubListPrefsCore())), []);

  useEffect(() => {
    const onSyncFolder = (e: Event) => {
      const localPath = String((e as CustomEvent<{ localPath?: string }>).detail?.localPath || "").trim();
      if (!localPath) return;
      setInitialSyncFolder(localPath);
      setCreateOpen(true);
    };
    const onOpenEntity = (e: Event) => {
      const jobId = String((e as CustomEvent<{ jobId?: string }>).detail?.jobId || "").trim();
      if (!jobId) return;
      setDetailId(jobId);
    };
    window.addEventListener("desk:sync-folder", onSyncFolder);
    window.addEventListener("desk:open-entity", onOpenEntity);
    return () => {
      window.removeEventListener("desk:sync-folder", onSyncFolder);
      window.removeEventListener("desk:open-entity", onOpenEntity);
    };
  }, []);

  const reload = useCallback(async () => {
    try {
      const data = await fetchJobs();
      setJobs((prev) => reconcileP0001JobsDelta(prev, data.jobs).rows);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const anyActiveJob = useMemo(
    () => busyId != null || jobs.some((j) => j.status === "running" || j.status === "analyzing"),
    [busyId, jobs],
  );

  useEffect(() => {
    let cancelled = false;
    void hydrateP0001JobsMirror().then((hydrated) => {
      if (cancelled || !hydrated.length) return;
      setJobs((prev) => reconcileP0001JobsDelta(prev, hydrated, { mode: "delta", persist: false }).rows);
    });
    const unsub = subscribeSyncEvents(
      (nextJobs) => {
        setJobs((prev) => reconcileP0001JobsDelta(prev, nextJobs).rows);
        setError(null);
      },
      setSseConnected,
    );
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  useEffect(() => {
    if (!tabActive) return;
    void reload();
    const onVisible = () => {
      if (document.visibilityState === "visible" && !sseConnected) void reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    if (sseConnected) {
      return () => {
        document.removeEventListener("visibilitychange", onVisible);
      };
    }
    const intervalMs = anyActiveJob ? 1500 : 5000;
    const t = window.setInterval(() => {
      if (document.visibilityState === "visible") void reload();
    }, intervalMs);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [anyActiveJob, reload, sseConnected, tabActive]);

  const liveJobs = useMemo(() => jobs.filter((job) => !job.deletedAt), [jobs]);
  const inPeriod = useMemo(() => {
    const pool = lifecycle === "trash" ? jobs.filter((job) => job.deletedAt) : liveJobs;
    return hubDirectoryPeriodRows(pool, period);
  }, [jobs, liveJobs, lifecycle, period]);

  const countedFilters = useMemo<FilterDef[]>(() => {
    const driveOptions = driveAccounts
      .filter((acc) => !acc.deletedAt)
      .map((acc) => {
        const code = (acc.code || "").trim();
        const who = (acc.displayName || acc.email || acc.name).trim();
        const label = code && who && code !== who ? `${code} · ${who}` : code || who;
        return {
          value: acc.name,
          label,
          emoji: "☁️",
          tip: acc.email ? `${label} (${acc.email})` : label,
        };
      });
    const driveFilter: FilterDef[] = driveOptions.length
      ? applyJobsDirectoryFilterHints([
          {
            key: "drive",
            label: "Drive",
            options: driveOptions,
          },
        ])
      : [];
    return [...driveFilter, ...BASE_JOBS_FILTERS];
  }, [driveAccounts]);

  const jobsFilters = useMemo(() => {
    const visible = countedFilters.filter((f) => isHubPrefVisible(prefs.hubFilters, defaultFilterKeys, f.key));
    return withPinnedFilterDefs(countedFilters, visible, filterValues, ["drive", "mode", "status"]);
  }, [countedFilters, defaultFilterKeys, filterValues, prefs.hubFilters]);

  const haystackIndex = useMemo(
    () =>
      buildSearchHaystackIndex(
        inPeriod,
        (j) => j.id,
        (j) =>
          `${j.code || ""} ${j.name} ${j.localPath} ${j.remote} ${formatDrivePath(j.remote, driveAccounts)} ${j.status} ${jobStatusView({ ...j, busy: busyId === j.id }).label}`,
      ),
    [inPeriod, busyId, driveAccounts],
  );
  const filtered = useMemo(() => {
    const q = search.query.trim().toLowerCase();
    const drives = filterValues.drive || [];
    const modes = filterValues.mode || [];
    const statuses = filterValues.status || [];
    const debounces = filterValues.debounce || [];
    const proxies = filterValues.proxy || [];
    return inPeriod.filter((j) => {
      if (drives.length && !drives.includes(remoteNameFromSpec(j.remote, ""))) return false;
      if (modes.length && !modes.includes(j.mode)) return false;
      if (debounces.length) {
        const sec = j.settleSec ?? 20;
        const matchesDebounce =
          debounces.includes(String(sec)) || (debounces.includes("auto") && sec > 0);
        if (!matchesDebounce) return false;
      }
      if (proxies.length) {
        const rawProxy = (j.proxyUrl || "").trim().toLowerCase();
        const proxyKind = !rawProxy ? "inherit" : rawProxy === "direct" ? "direct" : "custom";
        if (!proxies.includes(proxyKind)) return false;
      }
      if (!matchesHubDirectoryDateFilters(j, filterValues)) return false;
      if (!jobMatchesStatusFilter({ ...j, busy: busyId === j.id }, statuses)) return false;
      if (!q) return true;
      return (haystackIndex.get(j.id) || "").includes(q);
    });
  }, [inPeriod, search.query, filterValues, busyId, haystackIndex]);

  const selection = useHubDirectorySelection(filtered, (row) => row.id);
  const listResetKey = hubDirectoryListResetKey(
    `${search.query}|${lifecycle}|${period.range}|${viewMode}`,
    filterValues,
  );
  const selectedRows = useMemo(
    () => filtered.filter((j) => selection.selectedIds.has(j.id)),
    [filtered, selection.selectedIds],
  );
  const detailJob = useMemo(
    () => jobs.find((j) => j.id === detailId) || null,
    [jobs, detailId],
  );

  async function runOne(id: string, action: "start" | "pause" | "stop" | "delete", opts?: { skipReload?: boolean }) {
    setBusyId(id);
    try {
      const job = jobs.find((row) => row.id === id);
      if (action === "pause") await updateJob(id, { status: "paused" });
      else if (action === "start" && job && (job.status === "paused" || job.status === "stopped")) {
        await updateJob(id, { status: "idle" });
      } else if (action === "start") await startJob(id);
      else if (action === "stop") await stopJob(id);
      else await deleteJob(id);
      if (!opts?.skipReload) await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  async function runBulk(action: "start" | "pause" | "stop" | "delete") {
    const ids = selectedRows.map((j) => j.id);
    if (!ids.length) return;
    for (const id of ids) {
      // eslint-disable-next-line no-await-in-loop
      await runOne(id, action, { skipReload: true });
    }
    await reload();
  }

  async function runBulkPatch(patch: Partial<SyncJob>) {
    if (!selectedRows.length) return;
    setBusyId(selectedRows[0]!.id);
    try {
      for (const job of selectedRows) {
        // eslint-disable-next-line no-await-in-loop
        await updateJob(job.id, patch, { remote: job.remote });
      }
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  async function runBulkCleanExcluded() {
    if (!selectedRows.length) return;
    setBusyId(selectedRows[0]!.id);
    try {
      for (const job of selectedRows) {
        // eslint-disable-next-line no-await-in-loop
        await cleanJobExcludedOnDrive(job.id);
      }
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  const hasSelection = selectedRows.length > 0;
  const anySelectedRunning = selectedRows.some((job) => jobRunAction(job, false).kind === "stop");
  const anySelectedArmed = selectedRows.some((job) => jobRunAction(job, false).kind === "pause");
  const anySelectedIdle = selectedRows.some((job) => {
    const kind = jobRunAction(job, false).kind;
    return kind === "start" || kind === "retry";
  });

  const kpiItems = useMemo(() => {
    if (!tabActive) return [];
    const statusCounts = jobStatusCounts(inPeriod.map((job) => ({ ...job, busy: busyId === job.id })));
    const domainKpis: KpiTileData[] = [
      { prefKey: "synced", label: "Synced", value: statusCounts.Synced ?? 0, emojiGlyph: "✅", tone: "emerald" },
      { prefKey: "syncing", label: "Syncing", value: statusCounts.Syncing ?? 0, emojiGlyph: "▶️", tone: "sky" },
      { prefKey: "failed", label: "Failed", value: statusCounts.Failed ?? 0, emojiGlyph: "⚠️", tone: "rose" },
      { prefKey: "stopped", label: "Stopped", value: statusCounts.Stopped ?? 0, emojiGlyph: "⏹️", tone: "violet" },
    ];
    const all = buildHubDirectoryStandardKpis({
      entityLabel: "Job",
      entityEmoji: "📁",
      entityPrefKey: "job",
      rows: inPeriod,
      domain: domainKpis,
      activeKey: activeHubDirectoryKpiKey("job", filterValues, JOB_STATUS_KPI_FILTERS),
      onSelect: (prefKey) => {
        setFilterValues((current) => selectHubDirectoryKpiFilter(prefKey, "job", current, JOB_STATUS_KPI_FILTERS));
      },
    });
    return all.filter((tile) => isHubPrefVisible(prefs.kpi, defaultKpiKeys, tile.prefKey || ""));
  }, [tabActive, inPeriod, busyId, filterValues, prefs.kpi, defaultKpiKeys]);

  const visCharts = useMemo(() => prefs.charts ?? defaultChartKeys, [defaultChartKeys, prefs.charts]);
  const chartData = useMemo(
    () => (tabActive ? buildJobsChartData(filtered, inPeriod, driveAccounts, busyId) : {}),
    [tabActive, filtered, inPeriod, driveAccounts, busyId],
  );
  const chartsNode = useMemo(() => {
    const defs = display?.charts ?? [];
    if (!tabActive || defs.length === 0) return undefined;
    return directoryChartBandNode({ visCharts, defs, data: chartData });
  }, [chartData, display?.charts, tabActive, visCharts]);

  const soleSelectedJob = selectedRows.length === 1 ? selectedRows[0]! : null;
  const startableCount = selectedRows.filter((job) => {
    const kind = jobRunAction(job, false).kind;
    return kind === "start" || kind === "retry";
  }).length;
  const stoppableCount = selectedRows.filter((job) => {
    const kind = jobRunAction(job, false).kind;
    return kind === "pause" || kind === "stop";
  }).length;

  const moreActions = [
    {
      key: "start",
      label: `Start ${startableCount || ""}`.trim(),
      emoji: "▶️",
      tone: "emerald" as const,
      disabled: !hasSelection || !anySelectedIdle || !!busyId,
      title: "Start Stopped or Manual jobs, and retry Failed jobs",
      onClick: () => void runBulk("start"),
    },
    {
      key: "stop",
      label: `Stop ${stoppableCount || ""}`.trim(),
      emoji: "⏹️",
      tone: "rose" as const,
      disabled: !hasSelection || (!anySelectedRunning && !anySelectedArmed) || !!busyId,
      title: "Stop 24/7 sync, or stop a pass that is running",
      onClick: () => {
        void (async () => {
          for (const job of selectedRows) {
            const kind = jobRunAction(job, false).kind;
            if (kind === "stop") await runOne(job.id, "stop", { skipReload: true });
            else if (kind === "pause") await runOne(job.id, "pause", { skipReload: true });
          }
          await reload();
        })();
      },
    },
    ...(hasSelection && lifecycle === "live"
      ? [
          {
            key: "bulk-reset-defaults",
            label: "Reset Defaults (1m · Inherit)",
            emoji: "🔄",
            tone: "sky" as const,
            disabled: !!busyId,
            title: "Reset Debounce (1m), Proxy (Inherit), and Max Size (Unlimited) for selected jobs",
            onClick: () => void runBulkPatch({ settleSec: 60, proxyUrl: "", maxFileSize: "" }),
          },
          {
            key: "bulk-clean-excluded",
            label: "Clean Excluded on Drive",
            emoji: "🗑️",
            tone: "amber" as const,
            disabled: !!busyId,
            title: "Move excluded files (node_modules, .git, dist, etc.) on Google Drive into Google Drive Trash for all selected jobs",
            onClick: () => void runBulkCleanExcluded(),
          },
        ]
      : []),
  ];

  return (
    <>
      <JobDetailModal
        job={detailJob}
        onClose={() => setDetailId("")}
        onSaved={(job) => setJobs((prev) => prev.map((row) => (row.id === job.id ? job : row)))}
      />

      <JobsCreateModal
        open={createOpen}
        initialLocalPath={initialSyncFolder}
        onClose={() => {
          setCreateOpen(false);
          setInitialSyncFolder("");
        }}
        onCreate={async (draft) => {
          const { job } = await createJob(draft);
          setInitialSyncFolder("");
          await reload();
        }}
      />

      <HubDirectoryScreen
        header={
          <FolderSyncTabHeader
            screen="jobs"
            ariaLabel="Jobs"
            title="Jobs"
            titleIcon={jobsChrome.icon}
            titleIconClass={jobsChrome.iconClass}
            centerStats={centerStats}
            actions={<FolderSyncTabHeaderActions />}
          />
        }
        kpis={kpiItems.length > 0 ? kpiItems : undefined}
        charts={chartsNode}
        sectionRuleLabel="Jobs"
        filters={jobsFilters}
        query={search.queryInput}
        onQueryChange={search.setQueryInput}
        queryPending={search.queryPending}
        filterValues={filterValues}
        onFilterValuesChange={setFilterValues}
        filterPlaceholder="Search jobs…"
        filterShortcutScope="jobs"
        filterSelectionToolbar={{
          visibleCount: filtered.length,
          selectedCount: selection.selectedIds.size,
          noun: "jobs",
        }}
        directoryViewMode={viewMode}
        filterToolbar={
          <FolderSyncDirectoryToolbar
            screen="jobs"
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            lifecycleMode={lifecycle}
            onLifecycleModeChange={setLifecycle}
            shown={filtered.length}
            total={inPeriod.length}
            countLabel="jobs"
          />
        }
        filterRowActions={
          <HubDirectoryCatalogBulkBar
            noun="jobs"
            visibleCount={filtered.length}
            selectedCount={selection.selectedIds.size}
            allVisibleSelected={selection.allVisibleSelected}
            onToggleSelectAll={selection.toggleSelectAll}
            lifecycleMode={lifecycle}
            onNew={() => setCreateOpen(true)}
            newTitle="Create sync job"
            onDetail={() => {
              if (soleSelectedJob) setDetailId(soleSelectedJob.id);
            }}
            onBulkDetail={() => setBulkDetailOpen(true)}
            noneTitle="Select one job for Detail, or multiple for Bulk Detail"
            singleTitle="Open Job Detail Modal"
            bulkTitle="Open Bulk Detail & batch operations"
            onRestore={() => {
              void (async () => {
                for (const job of selectedRows) {
                  await restoreJob(job.id);
                }
                await reload();
              })();
            }}
            onDelete={() => {
              if (lifecycle === "trash") {
                void (async () => {
                  for (const job of selectedRows) {
                    await deleteJobForever(job.id);
                  }
                  await reload();
                })();
              } else {
                void runBulk("delete");
              }
            }}
            deleteDisabled={!!busyId}
            deleteTitle={lifecycle === "trash" ? "Remove selected jobs permanently" : "Move selected jobs to Trash"}
            moreActions={moreActions}
          />
        }
      >
        {viewMode === "card" ? (
          <JobsDirectoryCards
            items={filtered}
            selectedIds={selection.selectedIds}
            onToggleSelect={selection.toggleSelect}
            onOpen={(row) => setDetailId(row.id)}
            busyId={busyId}
            pageSize={pageSize}
            resetKey={listResetKey}
          />
        ) : (
          <JobsDirectoryTable
            items={filtered}
            selectedIds={selection.selectedIds}
            onToggleSelect={selection.toggleSelect}
            onToggleSelectAll={selection.toggleSelectAll}
            allVisibleSelected={selection.allVisibleSelected}
            onRowClick={(row) => setDetailId(row.id)}
            pageSize={pageSize}
            resetKey={listResetKey}
            onStart={(id) => void runOne(id, "start")}
            onPause={(id) => void runOne(id, "pause")}
            onStop={(id) => void runOne(id, "stop")}
            busyId={busyId}
            emptyMessage={error || "No jobs — click New to create a sync job."}
          />
        )}
      </HubDirectoryScreen>

      <HubDirectoryBulkDetailModal
        open={bulkDetailOpen && selectedRows.length >= 2}
        onClose={() => setBulkDetailOpen(false)}
        entitySingular="job"
        entityPlural="jobs"
        headerIcon={jobsChrome.icon}
        panelTitle="Batch Jobs Operations"
        panelTitleEmoji="📁"
        selectedItems={selectedRows.map((row) => ({
          id: row.id,
          label: row.name,
          sublabel: `${row.code ? `${row.code} · ` : ""}${jobStatusView({ ...row, busy: busyId === row.id }).label}`,
          badge: jobStatusView({ ...row, busy: busyId === row.id }).label,
          onOpenSingle: () => {
            setBulkDetailOpen(false);
            setDetailId(row.id);
          },
        }))}
        sections={[
          {
            id: "batch-ops",
            label: "Batch Operations",
            emoji: "⚡",
            description: `Execute batch actions across ${selectedRows.length} selected jobs.`,
            actions: moreActions.map((act) => ({
              key: act.key,
              label: act.label,
              title: act.title || act.label,
              tone:
                act.tone === "rose"
                  ? ("rose" as const)
                  : act.tone === "amber"
                    ? ("amber" as const)
                    : act.tone === "emerald"
                      ? ("emerald" as const)
                      : ("indigo" as const),
              disabled: act.disabled,
              onClick: act.onClick,
            })),
          },
        ]}
      />
    </>
  );
}
