// no-read-only-table: Drives directory uses HubDirectoryTableShell with interactive OAuth and detail modals.
import { useEffect, useMemo, useState } from "react";
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
import { useHostHeaderStats } from "../../hooks/useHostHeaderStats";
import { useDeskTabActive } from "../../lib/desk-active-screen";
import { SCREEN_DISPLAY_PREFS } from "../../lib/display-prefs-registry";
import { applyDrivesDirectoryFilterHints } from "../../lib/folder-sync-directory-column-hints";
import { remoteNameFromSpec } from "../../lib/remote-name";
import { navScreenChrome } from "../../lib/nav-structure";
import { readCachedP0001Jobs, reconcileP0001JobsDelta } from "../../lib/p0001-desk-mirror-store";
import {
  createJob,
  deleteDriveAccount,
  fetchJobs,
  restoreDriveAccount,
  startJob,
  stopJob,
  subscribeSyncEvents,
  trashDriveAccount,
  updateDriveAccountNetwork,
  updateJob,
  type DriveAccount,
  type SyncJob,
} from "../../lib/sync-api";
import { JobDetailModal } from "../jobs/JobDetailModal";
import { JobsCreateModal } from "../jobs/JobsCreateModal";
import { buildDrivesChartData } from "../jobs/folder-sync-charts";
import { DriveDetailModal } from "./DriveDetailModal";
import { DriveSignInModal } from "./DriveSignInModal";
import { DrivesDirectoryCards } from "./DrivesDirectoryCards";
import { DrivesDirectoryTable } from "./DrivesDirectoryTable";
import { useDriveAccounts } from "./use-drive-accounts";

const STATUS_FILTER: FilterDef = applyDrivesDirectoryFilterHints([
  {
    key: "status",
    label: "Status",
    options: [
      {
        value: "signed",
        label: "Signed in",
        tip: "Google token is stored.",
        glyph: <span className="hub-users-status-dot hub-users-status-dot--online" aria-hidden />,
      },
      {
        value: "pending",
        label: "Sign in",
        tip: "Consent is still required.",
        glyph: <span className="hub-users-status-dot hub-users-status-dot--idle" aria-hidden />,
      },
    ],
  },
])[0]!;

const JOBS_FILTER: FilterDef = {
  key: "jobs",
  label: "Jobs",
  triggerEmoji: "📁",
  suppressDefaultTriggerIcon: true,
  options: [
    { value: "with", label: "With jobs", emoji: "📁", tip: "At least one job uses this Drive." },
    { value: "none", label: "No jobs", emoji: "📭", tip: "No job uses this Drive yet." },
  ],
};

const DRIVE_KPI_FILTERS: Record<string, FilterValues> = {
  signed: { status: ["signed"] },
  pending: { status: ["pending"] },
  with_jobs: { jobs: ["with"] },
  no_jobs: { jobs: ["none"] },
};

const BASE_DRIVES_FILTERS = [STATUS_FILTER, JOBS_FILTER];

function nextDriveName(accounts: DriveAccount[]) {
  const used = new Set(accounts.map((account) => account.name));
  if (!used.has("gdrive")) return "gdrive";
  for (let i = 2; i < 40; i += 1) {
    const name = `gdrive${i}`;
    if (!used.has(name)) return name;
  }
  return "gdrive";
}

function nextDriveCodeLabel(accounts: DriveAccount[], remoteName: string | null) {
  if (remoteName && remoteName !== "__new__") {
    const found = accounts.find((a) => a.name === remoteName);
    if (found?.code) return found.code;
  }
  let max = 0;
  for (const acc of accounts) {
    const m = /^GG(\d+)$/i.exec(String(acc.code || "").trim());
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `GG${String(max + 1).padStart(4, "0")}`;
}

function matchesJobs(jobCount: number, selected: string[]) {
  if (!selected.length) return true;
  const hasJobs = jobCount > 0;
  return selected.some((value) => (value === "with" ? hasJobs : value === "none" ? !hasJobs : false));
}

function driveDateRow(account: DriveAccount) {
  return {
    createdAt: account.createdAt || undefined,
    updatedAt: account.contentUpdatedAt || undefined,
  };
}

/** Drive accounts that finished Google OAuth — Layout 1 Directory SSOT (P0020 Services parity). */
export function DrivesScreen() {
  const tabActive = useDeskTabActive("drives");
  const { accounts, error, reload } = useDriveAccounts();
  const [jobs, setJobs] = useState<SyncJob[]>(() => readCachedP0001Jobs());
  const [jobsReady, setJobsReady] = useState(() => readCachedP0001Jobs().length > 0);
  const search = useDirectorySearchQuery(DIRECTORY_SEARCH_CLIENT_FILTER_OPTS);
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [viewMode, setViewMode] = useState<HubViewMode>("table");
  const [lifecycle, setLifecycle] = useState<HubDirectoryLifecycleMode>("live");
  const period = useWorkspacePeriod("drives", "all");
  const drivesChrome = navScreenChrome("drives");
  const [signInName, setSignInName] = useState<string | null>(null);
  const [detailName, setDetailName] = useState<string | null>(null);
  const [bulkDetailOpen, setBulkDetailOpen] = useState(false);
  const [detailJobId, setDetailJobId] = useState("");
  const [createJobRemoteName, setCreateJobRemoteName] = useState<string | null>(null);
  const [jobBusyId, setJobBusyId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState(readHubListPrefsCore);
  const pageSize = useHubTablePageSize();
  const centerStats = useHostHeaderStats();
  const display = SCREEN_DISPLAY_PREFS.drives;
  const defaultKpiKeys = useMemo(() => new Set(display?.defaultKpiKeys ?? []), [display]);
  const defaultChartKeys = useMemo(() => new Set(display?.defaultChartKeys ?? []), [display]);
  const defaultFilterKeys = useMemo(() => new Set(display?.defaultFilterKeys ?? ["status", "jobs"]), [display]);

  useEffect(() => subscribeHubListPrefs(() => setPrefs(readHubListPrefsCore())), []);

  useEffect(() => {
    let cancelled = false;
    const unsub = subscribeSyncEvents((nextJobs) => {
      if (cancelled) return;
      setJobs((prev) => reconcileP0001JobsDelta(prev, nextJobs || []).rows);
      setJobsReady(true);
    });
    const pullJobs = () => {
      void fetchJobs()
        .then((data) => {
          if (cancelled) return;
          setJobs((prev) => reconcileP0001JobsDelta(prev, data.jobs || []).rows);
          setJobsReady(true);
        })
        .catch(() => {
          if (!cancelled) {
            setJobs((prev) => (prev.length ? prev : []));
            setJobsReady(true);
          }
        });
    };
    pullJobs();
    const onVisible = () => {
      if (document.visibilityState === "visible") pullJobs();
    };
    document.addEventListener("visibilitychange", onVisible);
    const onOpenEntity = (e: Event) => {
      const remoteName = String((e as CustomEvent<{ remoteName?: string }>).detail?.remoteName || "").trim();
      if (!remoteName) return;
      setDetailName(remoteName);
    };
    window.addEventListener("desk:open-entity", onOpenEntity);
    return () => {
      cancelled = true;
      unsub();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("desk:open-entity", onOpenEntity);
    };
  }, [accounts.length]);

  const jobsByRemote = useMemo(() => {
    const map: Record<string, SyncJob[]> = {};
    for (const job of jobs) {
      if (job.deletedAt) continue;
      const name = remoteNameFromSpec(job.remote, "");
      if (!name) continue;
      (map[name] ||= []).push(job);
    }
    return map;
  }, [jobs]);

  const withCounts = useMemo(
    () => accounts.map((account) => ({ ...account, jobCount: jobsByRemote[account.name]?.length || 0 })),
    [accounts, jobsByRemote],
  );

  const inPeriod = useMemo(() => {
    const pool =
      lifecycle === "trash"
        ? withCounts.filter((account) => account.deletedAt)
        : withCounts.filter((account) => !account.deletedAt);
    return hubDirectoryPeriodRows(pool, period);
  }, [withCounts, lifecycle, period]);

  const haystackIndex = useMemo(
    () =>
      buildSearchHaystackIndex(
        inPeriod,
        (account) => account.name,
        (account) => `${account.code || ""} ${account.name} ${account.email || ""} ${account.displayName || ""}`,
      ),
    [inPeriod],
  );

  const filtered = useMemo(() => {
    const q = search.query.trim().toLowerCase();
    const statuses = filterValues.status || [];
    const jobFilter = filterValues.jobs || [];
    return inPeriod.filter((account) => {
      const signed = account.authorized ? "signed" : "pending";
      if (statuses.length && !statuses.includes(signed)) return false;
      if (!matchesJobs(account.jobCount || 0, jobFilter)) return false;
      if (!matchesHubDirectoryDateFilters(driveDateRow(account), filterValues)) return false;
      if (!q) return true;
      return (haystackIndex.get(account.name) || "").includes(q);
    });
  }, [inPeriod, search.query, filterValues, haystackIndex]);

  const drivesFilters = useMemo(() => {
    const visible = BASE_DRIVES_FILTERS.filter((f) => isHubPrefVisible(prefs.hubFilters, defaultFilterKeys, f.key));
    return withPinnedFilterDefs(BASE_DRIVES_FILTERS, visible, filterValues, ["status", "jobs"]);
  }, [defaultFilterKeys, filterValues, prefs.hubFilters]);

  const selection = useHubDirectorySelection(filtered, (row) => row.name);
  const selectedAccounts = filtered.filter((account) => selection.selectedIds.has(account.name));
  const soleAccount = selectedAccounts.length === 1 ? selectedAccounts[0] : null;
  const detailAccount = withCounts.find((account) => account.name === detailName) || null;
  const detailJob = jobs.find((job) => job.id === detailJobId) || null;

  async function runBulkDriveNetwork(patch: { proxyUrl?: string; bwlimit?: string }) {
    if (!selectedAccounts.length) return;
    for (const acc of selectedAccounts) {
      // eslint-disable-next-line no-await-in-loop
      await updateDriveAccountNetwork(acc.name, patch);
    }
    await reload();
  }

  async function runJob(id: string, action: "start" | "pause" | "stop") {
    setJobBusyId(id);
    try {
      const job = jobs.find((row) => row.id === id);
      if (action === "pause") await updateJob(id, { status: "paused" });
      else if (action === "start" && job && (job.status === "paused" || job.status === "stopped")) {
        await updateJob(id, { status: "idle" });
      } else if (action === "start") await startJob(id);
      else await stopJob(id);
      const data = await fetchJobs();
      setJobs(data.jobs || []);
    } catch {
      /* JobDetailModal console records host result */
    } finally {
      setJobBusyId(null);
    }
  }

  const listResetKey = hubDirectoryListResetKey(`${search.query}|${period.range}|${viewMode}|${lifecycle}`, filterValues);

  const kpiItems = useMemo(() => {
    if (!tabActive) return [];
    const signedCount = inPeriod.filter((account) => account.authorized).length;
    const withJobsCount = inPeriod.filter((account) => (account.jobCount || 0) > 0).length;
    const domainKpis: KpiTileData[] = [
      { prefKey: "signed", label: "Signed in", value: signedCount, emojiGlyph: "✅", tone: "emerald" },
      { prefKey: "pending", label: "Sign in", value: Math.max(0, inPeriod.length - signedCount), emojiGlyph: "🔑", tone: "amber" },
      { prefKey: "with_jobs", label: "With jobs", value: jobsReady ? withJobsCount : "—", emojiGlyph: "📁", tone: "sky" },
      { prefKey: "no_jobs", label: "No jobs", value: jobsReady ? Math.max(0, inPeriod.length - withJobsCount) : "—", emojiGlyph: "📭", tone: "violet" },
    ];
    const all = buildHubDirectoryStandardKpis({
      entityLabel: "Drive",
      entityEmoji: "☁️",
      entityPrefKey: "drive",
      rows: inPeriod.map(driveDateRow),
      domain: domainKpis,
      activeKey: activeHubDirectoryKpiKey("drive", filterValues, DRIVE_KPI_FILTERS),
      onSelect: (prefKey) => {
        setFilterValues((current) => selectHubDirectoryKpiFilter(prefKey, "drive", current, DRIVE_KPI_FILTERS));
      },
    });
    return all.filter((tile) => isHubPrefVisible(prefs.kpi, defaultKpiKeys, tile.prefKey || ""));
  }, [tabActive, inPeriod, jobsReady, filterValues, prefs.kpi, defaultKpiKeys]);

  const visCharts = useMemo(() => prefs.charts ?? defaultChartKeys, [defaultChartKeys, prefs.charts]);
  const chartData = useMemo(
    () => (tabActive ? buildDrivesChartData(filtered, inPeriod) : {}),
    [tabActive, filtered, inPeriod],
  );
  const chartsNode = useMemo(() => {
    const defs = display?.charts ?? [];
    if (!tabActive || defs.length === 0) return undefined;
    return directoryChartBandNode({ visCharts, defs, data: chartData });
  }, [chartData, display?.charts, tabActive, visCharts]);

  const moreActions = [
    {
      key: "signin",
      label: soleAccount?.authorized ? "Sign in again" : "Sign in",
      emoji: "🔑",
      tone: "indigo" as const,
      disabled: !soleAccount,
      title: soleAccount ? "Create a Google sign-in link to copy" : "Select one Drive account",
      onClick: () => {
        if (soleAccount) setSignInName(soleAccount.name);
      },
    },
    ...(selectedAccounts.length > 0 && lifecycle === "live"
      ? [
          {
            key: "bulk-bwlimit-inherit",
            label: "Bandwidth: Inherit",
            emoji: "⚡",
            tone: "emerald" as const,
            title: "Use Global System Bandwidth Limit for all selected Drives",
            onClick: () => void runBulkDriveNetwork({ bwlimit: "" }),
          },
          {
            key: "bulk-proxy-inherit",
            label: "Proxy: System Default",
            emoji: "🌐",
            tone: "sky" as const,
            title: "Reset Proxy to System Default for all selected Drives",
            onClick: () => void runBulkDriveNetwork({ proxyUrl: "" }),
          },
        ]
      : []),
  ];

  const totalCount =
    lifecycle === "trash" ? withCounts.filter((account) => account.deletedAt).length : inPeriod.length;

  return (
    <>
      <DriveDetailModal
        account={detailAccount}
        jobs={detailAccount ? jobsByRemote[detailAccount.name] || [] : []}
        onClose={() => setDetailName(null)}
        onSaved={() => void reload()}
        onSignIn={
          detailAccount
            ? () => {
                const targetName = detailAccount.name;
                setDetailName(null);
                setSignInName(targetName);
              }
            : undefined
        }
        onOpenJob={(id) => setDetailJobId(id)}
        onCreateJob={
          detailAccount ? () => setCreateJobRemoteName(detailAccount.name) : undefined
        }
        onStart={(id) => void runJob(id, "start")}
        onPause={(id) => void runJob(id, "pause")}
        onStop={(id) => void runJob(id, "stop")}
        busyId={jobBusyId}
      />
      <JobsCreateModal
        open={createJobRemoteName != null}
        initialRemoteName={createJobRemoteName || undefined}
        onClose={() => setCreateJobRemoteName(null)}
        onCreate={async (draft) => {
          const { job } = await createJob(draft);
          setJobs((prev) => [job, ...prev.filter((j) => j.id !== job.id)]);
        }}
      />
      <JobDetailModal
        job={detailJob}
        onClose={() => setDetailJobId("")}
        onSaved={(saved) => setJobs((prev) => prev.map((job) => (job.id === saved.id ? saved : job)))}
      />
      <DriveSignInModal
        open={signInName != null}
        remoteName={signInName && signInName !== "__new__" ? signInName : ""}
        suggestedName={nextDriveName(withCounts)}
        suggestedCode={nextDriveCodeLabel(withCounts, signInName)}
        onClose={() => setSignInName(null)}
        onSignedIn={() => void reload()}
      />

      <HubDirectoryScreen
        header={
          <FolderSyncTabHeader
            screen="drives"
            ariaLabel="Drives"
            title="Drives"
            titleIcon={drivesChrome.icon}
            titleIconClass={drivesChrome.iconClass}
            centerStats={centerStats}
            actions={<FolderSyncTabHeaderActions />}
          />
        }
        kpis={kpiItems.length > 0 ? kpiItems : undefined}
        charts={chartsNode}
        sectionRuleLabel="Drives"
        filters={drivesFilters}
        query={search.queryInput}
        onQueryChange={search.setQueryInput}
        queryPending={search.queryPending}
        filterValues={filterValues}
        onFilterValuesChange={setFilterValues}
        filterPlaceholder="Search Drive accounts…"
        filterShortcutScope="drives"
        filterSelectionToolbar={{
          selectedCount: selection.selectedIds.size,
          visibleCount: filtered.length,
          noun: "accounts",
        }}
        directoryViewMode={viewMode}
        filterToolbar={
          <FolderSyncDirectoryToolbar
            screen="drives"
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            lifecycleMode={lifecycle}
            onLifecycleModeChange={setLifecycle}
            shown={filtered.length}
            total={totalCount}
            countLabel="accounts"
          />
        }
        filterRowActions={
          <HubDirectoryCatalogBulkBar
            noun="accounts"
            visibleCount={filtered.length}
            selectedCount={selection.selectedIds.size}
            allVisibleSelected={selection.allVisibleSelected}
            onToggleSelectAll={selection.toggleSelectAll}
            lifecycleMode={lifecycle}
            onNew={() => setSignInName("__new__")}
            newTitle="Sign in a Google Drive"
            onDetail={() => {
              if (soleAccount) setDetailName(soleAccount.name);
            }}
            onBulkDetail={() => setBulkDetailOpen(true)}
            noneTitle="Select one Drive account for Detail, or multiple for Bulk Detail"
            singleTitle="Open Drive Detail Modal"
            bulkTitle="Open Bulk Detail & batch operations"
            onRestore={() => {
              void (async () => {
                for (const account of selectedAccounts) await restoreDriveAccount(account.name);
                await reload();
              })();
            }}
            onDelete={() => {
              if (lifecycle === "trash") {
                void (async () => {
                  for (const account of selectedAccounts) await deleteDriveAccount(account.name);
                  await reload();
                })();
              } else {
                void (async () => {
                  for (const account of selectedAccounts) await trashDriveAccount(account.name);
                  await reload();
                })();
              }
            }}
            deleteTitle={
              lifecycle === "trash"
                ? "Remove the rclone remote. Live jobs that still use it stay blocked."
                : "Move selected Drive accounts to Trash. The Google remote stays until Delete forever."
            }
            moreActions={moreActions}
          />
        }
      >
        {viewMode === "card" ? (
          <DrivesDirectoryCards
            items={filtered}
            selectedIds={selection.selectedIds}
            onToggleSelect={selection.toggleSelect}
            onOpen={(account) => setDetailName(account.name)}
            pageSize={pageSize}
            resetKey={listResetKey}
            emptyMessage={error || "No Drive accounts — click New to sign in with Google."}
          />
        ) : (
          <DrivesDirectoryTable
            items={filtered}
            jobsByRemote={jobsByRemote}
            selectedIds={selection.selectedIds}
            onToggleSelect={selection.toggleSelect}
            onToggleSelectAll={selection.toggleSelectAll}
            allVisibleSelected={selection.allVisibleSelected}
            onRowClick={(account) => setDetailName(account.name)}
            onOpenJob={(id) => setDetailJobId(id)}
            pageSize={pageSize}
            resetKey={listResetKey}
            emptyMessage={error || "No Drive accounts — click New to sign in with Google."}
          />
        )}
      </HubDirectoryScreen>

      <HubDirectoryBulkDetailModal
        open={bulkDetailOpen && selectedAccounts.length >= 2}
        onClose={() => setBulkDetailOpen(false)}
        entitySingular="account"
        entityPlural="accounts"
        headerIcon={drivesChrome.icon}
        panelTitle="Batch Drive Operations"
        panelTitleEmoji="☁️"
        selectedItems={selectedAccounts.map((acc) => ({
          id: acc.name,
          label: acc.code ? `${acc.code} · ${acc.displayName || acc.email || acc.name}` : acc.displayName || acc.name,
          sublabel: `${acc.email || acc.name} · ${acc.jobCount} jobs`,
          badge: acc.authorized ? "Signed in" : "Sign in",
          onOpenSingle: () => {
            setBulkDetailOpen(false);
            setDetailName(acc.name);
          },
        }))}
        sections={[
          {
            id: "batch-ops",
            label: "Batch Operations",
            emoji: "⚡",
            description: `Execute batch actions across ${selectedAccounts.length} selected Drive accounts.`,
            actions: moreActions.map((act) => ({
              key: act.key,
              label: act.label,
              title: act.title || act.label,
              tone:
                act.tone === "emerald"
                  ? ("emerald" as const)
                  : act.tone === "sky"
                    ? ("sky" as const)
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
