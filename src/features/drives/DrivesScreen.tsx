// no-read-only-table: Drives directory uses HubDirectoryTableShell with interactive OAuth and detail modals.
import { useEffect, useMemo, useState } from "react";
import { Globe, KeyRound, Zap } from "lucide-react";
import {
  DIRECTORY_SEARCH_CLIENT_FILTER_OPTS,
  HubDirectoryCatalogBulkBar,
  HubSplitDirectoryFilterBar,
  HubSplitDirectoryPane,
  HubSplitWorkspaceScreen,
  KpiStrip,
  activeHubDirectoryKpiKey,
  buildHubDirectoryStandardKpis,
  buildSearchHaystackIndex,
  hubDirectoryListResetKey,
  hubDirectoryPeriodRows,
  matchesHubDirectoryDateFilters,
  selectHubDirectoryKpiFilter,
  useDirectorySearchQuery,
  useHubDirectorySelection,
  useHubTablePageSize,
  useWorkspacePeriod,
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
import { applyDrivesDirectoryFilterHints } from "../../lib/folder-sync-directory-column-hints";
import { remoteNameFromSpec } from "../../lib/remote-name";
import { navScreenChrome } from "../../lib/nav-structure";
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
import { JobsMainAndRail } from "../jobs/JobsMainAndRail";
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

const DRIVES_FILTERS = [STATUS_FILTER, JOBS_FILTER];

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

/** Drive accounts that finished Google OAuth. Jobs pick from this list. */
export function DrivesScreen() {
  const { accounts, error, reload } = useDriveAccounts();
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const [jobsReady, setJobsReady] = useState(false);
  const search = useDirectorySearchQuery(DIRECTORY_SEARCH_CLIENT_FILTER_OPTS);
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [viewMode, setViewMode] = useState<HubViewMode>("table");
  const [lifecycle, setLifecycle] = useState<HubDirectoryLifecycleMode>("live");
  const period = useWorkspacePeriod("drives");
  const drivesChrome = navScreenChrome("drives");
  const [signInName, setSignInName] = useState<string | null>(null);
  const [detailName, setDetailName] = useState<string | null>(null);
  const [detailJobId, setDetailJobId] = useState("");
  const [focusedJobId, setFocusedJobId] = useState("");
  const [createJobRemoteName, setCreateJobRemoteName] = useState<string | null>(null);
  const [jobBusyId, setJobBusyId] = useState<string | null>(null);
  const pageSize = useHubTablePageSize();
  const centerStats = useHostHeaderStats();

  useEffect(() => {
    let cancelled = false;
    const unsub = subscribeSyncEvents((nextJobs) => {
      if (cancelled) return;
      setJobs(nextJobs || []);
      setJobsReady(true);
    });
    const pullJobs = () => {
      void fetchJobs()
        .then((data) => {
          if (cancelled) return;
          setJobs(data.jobs || []);
          setJobsReady(true);
        })
        .catch(() => {
          if (!cancelled) {
            setJobs([]);
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

  const selection = useHubDirectorySelection(filtered, (row) => row.name);
  const selectedAccounts = filtered.filter((account) => selection.selectedIds.has(account.name));
  const soleAccount = selectedAccounts.length === 1 ? selectedAccounts[0] : null;
  const detailAccount = withCounts.find((account) => account.name === detailName) || null;
  const detailJob = jobs.find((job) => job.id === detailJobId) || null;
  const liveJobs = useMemo(() => jobs.filter((job) => !job.deletedAt), [jobs]);
  const focusedJob = useMemo(
    () => liveJobs.find((j) => j.id === focusedJobId) || liveJobs[0] || null,
    [focusedJobId, liveJobs],
  );
  const consoleLines = useMemo(() => {
    const head = error ? [`API error: ${error}`] : [];
    if (!focusedJob?.lastResult) return head;
    return [
      ...head,
      `# ${focusedJob.name} · ${focusedJob.lastResult.action || "—"} · ${focusedJob.status}`,
      focusedJob.lastResult.backupDir ? `backup: ${focusedJob.lastResult.backupDir}` : "",
      focusedJob.lastResult.conflictDir ? `conflicts: ${focusedJob.lastResult.conflictDir}` : "",
      focusedJob.lastResult.trashPolicy ? `trash: ${focusedJob.lastResult.trashPolicy}` : "",
      "--- stdout ---",
      focusedJob.lastResult.stdout || "(empty)",
      "--- stderr ---",
      focusedJob.lastResult.stderr || "(empty)",
    ].filter(Boolean);
  }, [error, focusedJob]);

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
      /* the Jobs screen console records the host error on the next visit */
    } finally {
      setJobBusyId(null);
    }
  }

  const signedCount = inPeriod.filter((account) => account.authorized).length;
  const withJobsCount = inPeriod.filter((account) => (account.jobCount || 0) > 0).length;
  const listResetKey = hubDirectoryListResetKey(`${search.query}|${period.range}|${viewMode}|${lifecycle}`, filterValues);
  const domainKpis: KpiTileData[] = [
    { prefKey: "signed", label: "Signed in", value: signedCount, emojiGlyph: "✅", tone: "emerald" },
    { prefKey: "pending", label: "Sign in", value: Math.max(0, inPeriod.length - signedCount), emojiGlyph: "🔑", tone: "amber" },
    { prefKey: "with_jobs", label: "With jobs", value: jobsReady ? withJobsCount : "—", emojiGlyph: "📁", tone: "sky" },
    { prefKey: "no_jobs", label: "No jobs", value: jobsReady ? Math.max(0, inPeriod.length - withJobsCount) : "—", emojiGlyph: "📭", tone: "violet" },
  ];
  const kpiItems = buildHubDirectoryStandardKpis({
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

  return (
    <>
      <DriveDetailModal
        account={detailAccount}
        jobs={detailAccount ? jobsByRemote[detailAccount.name] || [] : []}
        onClose={() => setDetailName(null)}
        onSaved={() => void reload()}
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
      <div className="hub-split-workspace anim-fade flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <HubSplitWorkspaceScreen
          bodyClassName="folder-sync-workspace-body flex min-h-0 flex-1 overflow-hidden"
          sectionRuleLabel="Drives"
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
        >
          <JobsMainAndRail
            jobs={liveJobs}
            focusedId={focusedJob?.id || ""}
            consoleLines={consoleLines}
            onSelect={setFocusedJobId}
            jobsPane={
              <HubSplitDirectoryPane
                scroll={false}
                className="hub-directory-frame hub-directory-frame--panel-fill folder-sync-directory-body stealth-profile-directory-frame"
                partialPagePad="invisible"
                filterBar={
                  <HubSplitDirectoryFilterBar
                    shortcutScope="drives"
                    placeholder="Search Drive accounts…"
                    filters={DRIVES_FILTERS}
                    query={search.queryInput}
                    onQueryChange={search.setQueryInput}
                    queryPending={search.queryPending}
                    values={filterValues}
                    onValuesChange={setFilterValues}
                    directoryViewMode={viewMode}
                    toolbar={
                      <FolderSyncDirectoryToolbar
                        screen="drives"
                        viewMode={viewMode}
                        onViewModeChange={setViewMode}
                        lifecycleMode={lifecycle}
                        onLifecycleModeChange={setLifecycle}
                        shown={filtered.length}
                        total={lifecycle === "trash" ? withCounts.filter((account) => account.deletedAt).length : inPeriod.length}
                        countLabel="accounts"
                      />
                    }
                    filterSelectionToolbar={{
                      selectedCount: selection.selectedIds.size,
                      visibleCount: filtered.length,
                      noun: "accounts",
                    }}
                    row2Actions={
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
                        onBulkDetail={() => {
                          const first = selectedAccounts[0];
                          if (first) setDetailName(first.name);
                        }}
                        noneTitle="Select one Drive account"
                        singleTitle="Open Drive Detail Modal"
                        bulkTitle="Open the first selected Drive account in Detail Modal"
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
                        moreActions={[
                          {
                            key: "signin",
                            label: soleAccount?.authorized ? "Sign in again" : "Sign in",
                            icon: KeyRound as never,
                            tone: "indigo",
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
                                  icon: Zap as never,
                                  tone: "emerald" as const,
                                  title: "Use Global System Bandwidth Limit for all selected Drives",
                                  onClick: () => void runBulkDriveNetwork({ bwlimit: "" }),
                                },
                                {
                                  key: "bulk-bwlimit-5m",
                                  label: "Bandwidth: 5M",
                                  icon: Zap as never,
                                  tone: "sky" as const,
                                  title: "Cap bandwidth at 5 MiB/s for all selected Drives",
                                  onClick: () => void runBulkDriveNetwork({ bwlimit: "5M" }),
                                },
                                {
                                  key: "bulk-bwlimit-10m",
                                  label: "Bandwidth: 10M",
                                  icon: Zap as never,
                                  tone: "sky" as const,
                                  title: "Cap bandwidth at 10 MiB/s for all selected Drives",
                                  onClick: () => void runBulkDriveNetwork({ bwlimit: "10M" }),
                                },
                                {
                                  key: "bulk-bwlimit-20m",
                                  label: "Bandwidth: 20M",
                                  icon: Zap as never,
                                  tone: "sky" as const,
                                  title: "Cap bandwidth at 20 MiB/s for all selected Drives",
                                  onClick: () => void runBulkDriveNetwork({ bwlimit: "20M" }),
                                },
                                {
                                  key: "bulk-proxy-inherit",
                                  label: "Proxy: System Default",
                                  icon: Globe as never,
                                  tone: "emerald" as const,
                                  title: "Reset Proxy to System Default for all selected Drives",
                                  onClick: () => void runBulkDriveNetwork({ proxyUrl: "" }),
                                },
                              ]
                            : []),
                        ]}
                      />
                    }
                  />
                }
                kpiBand={<KpiStrip items={kpiItems} />}
              >
                {viewMode === "card" ? (
                  <DrivesDirectoryCards
                    items={filtered}
                    selectedIds={selection.selectedIds}
                    onToggleSelect={selection.toggleSelect}
                    onOpen={(account) => setDetailName(account.name)}
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
                    onRowClick={(account) => {
                      const firstJob = jobsByRemote[account.name]?.[0];
                      if (firstJob) setFocusedJobId(firstJob.id);
                      setDetailName(account.name);
                    }}
                    onOpenJob={(id) => {
                      setFocusedJobId(id);
                      setDetailJobId(id);
                    }}
                    pageSize={pageSize}
                    resetKey={listResetKey}
                    emptyMessage={error || "No Drive accounts — click New to sign in with Google."}
                  />
                )}
              </HubSplitDirectoryPane>
            }
          />
        </HubSplitWorkspaceScreen>
      </div>
    </>
  );
}
