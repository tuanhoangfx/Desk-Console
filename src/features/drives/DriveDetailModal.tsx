import { useEffect, useMemo, useRef, useState } from "react";
import { File, Folder, HardDrive, Layers, Plus, Save, Trash2, Zap } from "lucide-react";
import {
  HUB_ACCOUNT_DETAIL_ACCOUNT_EMOJI,
  HUB_ACCOUNT_DETAIL_JOB_EMOJI,
  HubAccountDetailAdmScaffold,
  HubAccountDetailHeaderSearch,
  HubAccountDetailSearchProvider,
  HubActivityTimestampLabel,
  HubAdmClickEditField,
  HubAdmClickFilterField,
  HubAdmNoteLogRails,
  HubAdmReadonlyField,
  HubAdmRecordMetaRow,
  HubBulkActionButton,
  HubConfirmDialog,
  HubDetailFieldRow,
  HubDetailFieldsGroup,
  HubDirectoryCopyText,
  HubModalDirectoryFilterBar,
  HubModalDirectorySection,
  HubResultCount,
  HubTocSectionNav,
  HubToolDetailModal,
  HubToolDetailModalAccountFooter,
  HubToolDetailRail,
  HubToolDetailSection,
  HubToolDetailSections,
  HubUsersStatusLabel,
  KpiStrip,
  type FilterDef,
  type FilterValues,
  type KpiTileData,
  HUB_ACCOUNT_DETAIL_MAIN_SCROLL_ROOT,
  HUB_TOOL_DETAIL_SECTIONS_CLASS,
  hubAccountDetailShellClass,
} from "@tool-workspace/hub-ui";
import {
  applyJobsDirectoryFilterHints,
  DIRECTORY_GMAIL_EMOJI,
  DIRECTORY_STATUS_EMOJI,
  folderOutlineFormatFilter,
  folderOutlineKindFilter,
  JOBS_STATUS_HINT_LINES,
} from "../../lib/folder-sync-directory-column-hints";
import { formatDriveBytes, formatDriveUsage } from "../../lib/drive-storage";
import { JOB_MODE_OPTIONS, jobStatusView } from "../../lib/job-mode";
import { DRIVE_BWLIMIT_OPTIONS } from "../../lib/network-options";
import { navScreenChrome } from "../../lib/nav-structure";
import { collectOutlineFormats, matchesOutlineRow } from "../../lib/outline-open-memory.mjs";
import { remotePathFromSpec } from "../../lib/remote-name";
import { jobMatchesStatusFilter, jobStatusCounts } from "../jobs/jobs-kpi-filter";
import { JobsDirectoryTable } from "../jobs/JobsDirectoryTable";
import { DRIVE_JOB_COLUMN_KEYS } from "../../lib/jobs-directory-meta";
import { DetailLogScopeTitle, logActor, useDetailLogScope } from "../log/DetailLogScope";
import type { BrowseRow, DriveAccount, NetworkProbeResult, SyncJob } from "../../lib/sync-api";
import {
  createDriveFolder,
  emptyDriveTrash,
  fetchDriveTree,
  probeNetworkConnection,
  updateDriveAccountNetwork,
} from "../../lib/sync-api";
import { SyncFolderTree } from "../tree/SyncFolderTree";
import { SyncTreeSection } from "../tree/SyncTreeSection";

const ACCOUNT_SECTION = "p0009-drive-account";
const FILES_SECTION = "p0009-drive-files";
const JOBS_SECTION = "p0009-drive-jobs";

const DRIVE_JOB_MODE_FILTER: FilterDef = {
  key: "mode",
  label: "Mode",
  options: JOB_MODE_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
    emoji: option.emoji,
    tip: option.detail,
  })),
};

const DRIVE_JOB_STATUS_FILTER: FilterDef = {
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

const DRIVE_JOBS_FILTERS = applyJobsDirectoryFilterHints([
  DRIVE_JOB_MODE_FILTER,
  DRIVE_JOB_STATUS_FILTER,
]);

const LOG_LABEL: Record<string, string> = {
  file: "File",
  code: "ID",
  name: "ID",
  status: "Status",
  email: "Gmail",
  proxyUrl: "Proxy",
  bwlimit: "Bandwidth",
  note: "Note",
  trash: "Trash",
};

function driveFileKpis(
  account: DriveAccount,
  formatCount: number,
  filterValues: FilterValues,
  setFilterValues: (next: FilterValues) => void,
): KpiTileData[] {
  const inventory = account.inventory;
  const activeKinds = filterValues.kind ?? [];
  const activeFormats = filterValues.format ?? [];
  const toggleKind = (targetKind: "folder" | "file") => {
    const isSingle = activeKinds.length === 1 && activeKinds[0] === targetKind;
    const next = { ...filterValues };
    if (isSingle) delete next.kind;
    else next.kind = [targetKind];
    setFilterValues(next);
  };
  return [
    {
      prefKey: "folders",
      label: "Folders",
      value: inventory?.folderCount ?? 0,
      icon: Folder,
      emojiGlyph: "📁",
      tone: "amber",
      active: activeKinds.length === 1 && activeKinds[0] === "folder",
      onClick: () => toggleKind("folder"),
    },
    {
      prefKey: "files",
      label: "Files",
      value: inventory?.fileCount ?? 0,
      icon: File,
      emojiGlyph: "📄",
      tone: "sky",
      active: activeKinds.length === 1 && activeKinds[0] === "file",
      onClick: () => toggleKind("file"),
    },
    {
      prefKey: "listed",
      label: "Listed",
      value: formatDriveBytes(inventory?.listedBytes),
      icon: HardDrive,
      emojiGlyph: "💾",
      tone: "emerald",
    },
    {
      prefKey: "formats",
      label: "Formats",
      value: formatCount || (inventory?.formats?.length ?? 0),
      icon: Layers,
      emojiGlyph: "🧩",
      tone: "indigo",
      active: activeFormats.length > 0,
      onClick:
        activeFormats.length > 0
          ? () => {
              const next = { ...filterValues };
              delete next.format;
              setFilterValues(next);
            }
          : undefined,
    },
  ];
}

type Props = {
  account: DriveAccount | null;
  jobs: SyncJob[];
  onClose: () => void;
  onSaved?: () => void;
  onOpenJob: (jobId: string) => void;
  onCreateJob?: () => void;
  onStart?: (id: string) => void;
  onPause?: (id: string) => void;
  onStop?: (id: string) => void;
  busyId?: string | null;
};

/** Drive account detail — Layout 3 (TOC · ADM · log rail). Actions stay on the searchbar. */
export function DriveDetailModal({
  account,
  jobs,
  onClose,
  onSaved,
  onOpenJob,
  onCreateJob,
  onStart,
  onPause,
  onStop,
  busyId = null,
}: Props) {
  const [fileQuery, setFileQuery] = useState("");
  const [fileFilterValues, setFileFilterValues] = useState<FilterValues>({});
  const [jobQuery, setJobQuery] = useState("");
  const [jobFilterValues, setJobFilterValues] = useState<FilterValues>({});
  const [treeCache, setTreeCache] = useState<Record<string, BrowseRow[]>>({});
  const [proxyDraft, setProxyDraft] = useState("");
  const [bwlimitDraft, setBwlimitDraft] = useState("");
  const [note, setNote] = useState("");
  const [notedName, setNotedName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [probing, setProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<NetworkProbeResult | null>(null);
  const [emptyingTrash, setEmptyingTrash] = useState(false);
  const [confirmEmptyTrashOpen, setConfirmEmptyTrashOpen] = useState(false);
  const [trashMsg, setTrashMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;
  const drivesChrome = navScreenChrome("drives");

  const accountName = account?.name ?? null;
  if (accountName !== notedName) {
    setNotedName(accountName);
    setNote(account?.note || "");
  }

  useEffect(() => {
    setProxyDraft(account?.proxyUrl || "");
    setBwlimitDraft(account?.bwlimit || "");
    setProbeResult(null);
    setTrashMsg(null);
    setJobQuery("");
    setJobFilterValues({});
  }, [account?.name, account?.proxyUrl, account?.bwlimit]);

  useEffect(() => {
    if (!accountName || String(account?.note || "") === note) return;
    const nextNote = note;
    const timer = window.setTimeout(() => {
      void updateDriveAccountNetwork(accountName, { note: nextNote }).then(() => onSavedRef.current?.());
    }, 450);
    return () => window.clearTimeout(timer);
  }, [account?.note, accountName, note]);

  const networkDirty = Boolean(
    account &&
      (proxyDraft.trim() !== String(account.proxyUrl || "").trim() ||
        bwlimitDraft.trim() !== String(account.bwlimit || "").trim()),
  );
  const formats = useMemo(
    () => collectOutlineFormats(treeCache, account?.inventory?.formats),
    [treeCache, account?.inventory?.formats],
  );
  const fileFilters = useMemo(
    () => [folderOutlineKindFilter(), ...(formats.length ? [folderOutlineFormatFilter(formats)] : [])],
    [formats],
  );
  const fileKpis = useMemo(
    () => (account ? driveFileKpis(account, formats.length, fileFilterValues, setFileFilterValues) : []),
    [account, formats.length, fileFilterValues],
  );
  const fileFilterKey = `${fileQuery}|${(fileFilterValues.kind ?? []).join(",")}|${(fileFilterValues.format ?? []).join(",")}`;

  const driveJobStatusCounts = useMemo(
    () => jobStatusCounts(jobs.map((j) => ({ ...j, busy: busyId === j.id }))),
    [jobs, busyId],
  );
  const activeJobStatuses = jobFilterValues.status ?? [];
  const toggleJobStatusKpi = (statusLabel: string) => {
    const isSingle = activeJobStatuses.length === 1 && activeJobStatuses[0] === statusLabel;
    const next = { ...jobFilterValues };
    if (isSingle) delete next.status;
    else next.status = [statusLabel];
    setJobFilterValues(next);
  };
  const jobKpis = useMemo<KpiTileData[]>(
    () => [
      {
        prefKey: "synced",
        label: "Synced",
        value: driveJobStatusCounts.Synced ?? 0,
        emojiGlyph: "✅",
        tone: "emerald",
        active: activeJobStatuses.length === 1 && activeJobStatuses[0] === "Synced",
        onClick: () => toggleJobStatusKpi("Synced"),
      },
      {
        prefKey: "syncing",
        label: "Syncing",
        value: driveJobStatusCounts.Syncing ?? 0,
        emojiGlyph: "▶️",
        tone: "sky",
        active: activeJobStatuses.length === 1 && activeJobStatuses[0] === "Syncing",
        onClick: () => toggleJobStatusKpi("Syncing"),
      },
      {
        prefKey: "failed",
        label: "Failed",
        value: driveJobStatusCounts.Failed ?? 0,
        emojiGlyph: "⚠️",
        tone: "rose",
        active: activeJobStatuses.length === 1 && activeJobStatuses[0] === "Failed",
        onClick: () => toggleJobStatusKpi("Failed"),
      },
      {
        prefKey: "stopped",
        label: "Stopped",
        value: driveJobStatusCounts.Stopped ?? 0,
        emojiGlyph: "⏹️",
        tone: "violet",
        active: activeJobStatuses.length === 1 && activeJobStatuses[0] === "Stopped",
        onClick: () => toggleJobStatusKpi("Stopped"),
      },
    ],
    [driveJobStatusCounts, activeJobStatuses, jobFilterValues],
  );

  const filteredJobs = useMemo(() => {
    const q = jobQuery.trim().toLowerCase();
    const modes = jobFilterValues.mode ?? [];
    const statuses = jobFilterValues.status ?? [];
    return jobs.filter((j) => {
      if (modes.length && !modes.includes(j.mode)) return false;
      if (!jobMatchesStatusFilter({ ...j, busy: busyId === j.id }, statuses)) return false;
      if (!q) return true;
      const hay = `${j.code || ""} ${j.name} ${j.localPath} ${remotePathFromSpec(j.remote)} ${jobStatusView({ ...j, busy: busyId === j.id }).label}`.toLowerCase();
      return hay.includes(q);
    });
  }, [jobs, jobQuery, jobFilterValues, busyId]);
  const storage = account?.storage;
  const free =
    storage?.limitBytes != null && storage.usedBytes != null
      ? Math.max(0, storage.limitBytes - storage.usedBytes)
      : null;

  const logSource = useMemo(() => {
    const rows = account?.fileLog?.length ? account.fileLog : account?.activityLog || [];
    return rows.map((entry) => ({
      at: entry.at,
      message: entry.message,
      changes: entry.changes,
      actor: entry.actor?.label ? logActor(entry.actor.source, entry.actor.label) : undefined,
    }));
  }, [account]);
  const logScope = useDetailLogScope(logSource);

  return (
    <HubAccountDetailSearchProvider>
    <HubToolDetailModal
      open={Boolean(account)}
      onClose={onClose}
      title={
        account
          ? `${account.code || account.name} · ${account.displayName || account.email || account.name}`
          : "Drive"
      }
      headerIcon={drivesChrome.icon}
      headerIconClassName={drivesChrome.iconClass}
      headerCenter={<HubAccountDetailHeaderSearch />}
      ariaLabel="Drive account detail"
      size="detail"
      shellClassName={hubAccountDetailShellClass()}
      scrollRootSelector={HUB_ACCOUNT_DETAIL_MAIN_SCROLL_ROOT}
      sectionIds={[ACCOUNT_SECTION, JOBS_SECTION, FILES_SECTION]}
      toc={
        <HubToolDetailRail title="Navigate" titleEmoji="🧭" className="twofa-adm-rail--toc" scroll={false} ariaLabel="Sections">
          <HubTocSectionNav
            items={[
              { id: ACCOUNT_SECTION, label: "Account", emoji: HUB_ACCOUNT_DETAIL_ACCOUNT_EMOJI },
              { id: JOBS_SECTION, label: "Jobs", emoji: HUB_ACCOUNT_DETAIL_JOB_EMOJI },
              { id: FILES_SECTION, label: "Files", emoji: "📄" },
            ]}
            scrollRootSelector={HUB_ACCOUNT_DETAIL_MAIN_SCROLL_ROOT}
            admNav
          />
        </HubToolDetailRail>
      }
      footer={
        <HubToolDetailModalAccountFooter
          onClose={onClose}
          onSave={() => {
            if (!account || !networkDirty) return;
            void (async () => {
              setSaving(true);
              try {
                await updateDriveAccountNetwork(account.name, {
                  proxyUrl: proxyDraft,
                  bwlimit: bwlimitDraft,
                });
                onSaved?.();
              } finally {
                setSaving(false);
              }
            })();
          }}
          saveIcon={Save}
          saveDisabled={!account || saving || !networkDirty}
          busy={saving}
        />
      }
    >
      {account ? (
        <HubAccountDetailAdmScaffold
          panelId="p0009-drive-detail-panel"
          panelTitle="Drive"
          panelTitleEmoji="☁️"
          rail={
            <HubAdmNoteLogRails
              noteRail={{
                mode: "editor",
                value: note,
                onChange: setNote,
                placeholder: "Note for this Drive",
              }}
              logEntries={logScope.shown}
              logId={account.code || account.name}
              logTitle={<DetailLogScopeTitle scope={logScope.scope} onChange={logScope.setScope} />}
              logFieldMeta={(field) => ({ label: LOG_LABEL[field] || field })}
              logEmptyMessage={logScope.scope === "work" ? "No work file changes." : "No changes yet."}
            />
          }
          main={
            <>
              <HubAdmRecordMetaRow
                vaultId={account.code || account.name}
                created={<HubActivityTimestampLabel at={account.createdAt} variant="detail" />}
                updated={<HubActivityTimestampLabel at={account.contentUpdatedAt || account.updatedAt} variant="detail" />}
              />
              <HubToolDetailSections className={HUB_TOOL_DETAIL_SECTIONS_CLASS}>
                <HubToolDetailSection id={ACCOUNT_SECTION} title="Account" emoji={HUB_ACCOUNT_DETAIL_ACCOUNT_EMOJI}>
                  <HubDetailFieldsGroup>
                    <HubDetailFieldRow slots={3}>
                      <HubAdmReadonlyField header={{ label: "Status", headerEmoji: DIRECTORY_STATUS_EMOJI }} valueLayout="inline">
                        <HubUsersStatusLabel
                          label={account.authorized ? "Signed in" : "Sign in"}
                          tone={account.authorized ? "online" : "idle"}
                          capitalize={false}
                          variant="detail"
                          popoverTitle="Drive status"
                          title={
                            account.authorized
                              ? `Google Drive OAuth active${account.email ? ` (${account.email})` : ""}`
                              : "OAuth pending — click Sign in to finish Google OAuth."
                          }
                        />
                      </HubAdmReadonlyField>
                      <HubAdmReadonlyField header={{ label: "Account", headerEmoji: "👤" }} valueLayout="inline">
                        <span className="truncate text-white/90">{account.displayName || "—"}</span>
                      </HubAdmReadonlyField>
                      <HubAdmReadonlyField header={{ label: "Gmail", headerEmoji: DIRECTORY_GMAIL_EMOJI }} valueLayout="inline">
                        {account.email ? (
                          <HubDirectoryCopyText value={account.email} copyToastLabel="Gmail copied" />
                        ) : (
                          <span className="text-white/55">—</span>
                        )}
                      </HubAdmReadonlyField>
                    </HubDetailFieldRow>
                    <HubDetailFieldRow slots={3}>
                      <HubAdmReadonlyField header={{ label: "Storage", headerEmoji: "💾" }} valueLayout="inline">
                        <span className="truncate text-white/90">{formatDriveUsage(storage) || "—"}</span>
                      </HubAdmReadonlyField>
                      <HubAdmReadonlyField header={{ label: "In Drive / Trash", headerEmoji: "🗑️" }} valueLayout="inline">
                        <div className="flex w-full items-center justify-between gap-2 min-w-0">
                          <span className="truncate text-white/85">
                            {`${formatDriveBytes(storage?.driveBytes)} · Trash ${formatDriveBytes(storage?.trashBytes)}`}
                          </span>
                          {(storage?.trashBytes ?? 0) > 0 || emptyingTrash ? (
                            <button
                              type="button"
                              className="hub-adm-detail-field-copy inline-flex h-6 shrink-0 items-center gap-1 rounded border border-rose-400/35 bg-rose-500/15 px-1.5 text-xs text-rose-200 hover:bg-rose-500/25 disabled:opacity-40"
                              title="Permanently empty Google Drive Trash (rclone cleanup) to free up Drive storage quota"
                              disabled={emptyingTrash}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setConfirmEmptyTrashOpen(true);
                              }}
                            >
                              <Trash2 size={11} aria-hidden />
                              <span>{emptyingTrash ? "Emptying…" : "Empty Trash"}</span>
                            </button>
                          ) : null}
                        </div>
                      </HubAdmReadonlyField>
                      <HubAdmReadonlyField header={{ label: "Free Space", headerEmoji: "✨" }} valueLayout="inline">
                        <span className="truncate text-white/90">
                          {storage?.limitBytes == null ? "Unlimited" : formatDriveBytes(free)}
                        </span>
                      </HubAdmReadonlyField>
                    </HubDetailFieldRow>
                    <HubDetailFieldRow slots={2}>
                      <HubAdmClickFilterField
                        header={{ label: "Bandwidth Limit", headerEmoji: "⚡" }}
                        fieldLabel="Bandwidth Limit"
                        filterKey={`p0009-drive-bwlimit-${account.name}`}
                        options={DRIVE_BWLIMIT_OPTIONS}
                        value={bwlimitDraft || "INHERIT"}
                        allowClear={false}
                        onChange={(v) => setBwlimitDraft(v === "INHERIT" ? "" : v)}
                      />
                      <HubAdmClickEditField
                        header={{ label: "Proxy (HTTP / SOCKS5)", headerEmoji: "🌐" }}
                        fieldLabel="Proxy"
                        value={proxyDraft}
                        placeholder="System default (or http://host:port · socks5://host:port)"
                        onChange={(v) => {
                          setProxyDraft(v);
                          setProbeResult(null);
                        }}
                        trailingAction={
                          <button
                            type="button"
                            className="hub-adm-detail-field-copy folder-sync-path-btn inline-flex h-6 w-6 shrink-0 items-center justify-center rounded disabled:opacity-40"
                            title="Test latency to Google Drive API using this Drive's proxy (or System default)"
                            aria-label="Test latency to Google Drive API using this Drive's proxy (or System default)"
                            disabled={probing}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              void (async () => {
                                setProbing(true);
                                try {
                                  const res = await probeNetworkConnection(proxyDraft);
                                  setProbeResult(res);
                                } finally {
                                  setProbing(false);
                                }
                              })();
                            }}
                          >
                            <Zap size={12} aria-hidden />
                          </button>
                        }
                      />
                    </HubDetailFieldRow>
                  </HubDetailFieldsGroup>
                  {probeResult ? (
                    <p
                      className={`mt-2 font-mono text-xs ${
                        probeResult.ok ? "text-emerald-300" : "text-rose-300"
                      }`}
                    >
                      {probeResult.ok ? "✓ " : "✗ "}
                      {probeResult.message}
                    </p>
                  ) : null}
                  {trashMsg ? (
                    <p
                      className={`mt-2 font-mono text-xs ${
                        trashMsg.ok ? "text-emerald-300" : "text-rose-300"
                      }`}
                    >
                      {trashMsg.ok ? "✓ " : "✗ "}
                      {trashMsg.text}
                    </p>
                  ) : null}
                </HubToolDetailSection>
                <HubToolDetailSection id={JOBS_SECTION} title="Jobs" emoji={HUB_ACCOUNT_DETAIL_JOB_EMOJI}>
                  <div className="fs-drive-jobs">
                    <HubModalDirectorySection
                      filterBar={
                        <>
                          <HubModalDirectoryFilterBar
                            shortcutScope={`p0009-drive-jobs-${account.name}`}
                            placeholder="Search jobs…"
                            filters={DRIVE_JOBS_FILTERS}
                            query={jobQuery}
                            onQueryChange={setJobQuery}
                            values={jobFilterValues}
                            onValuesChange={setJobFilterValues}
                            row2Actions={
                              onCreateJob && account.authorized ? (
                                <HubBulkActionButton
                                  icon={<Plus size={14} aria-hidden />}
                                  label="New Job"
                                  title={`Create a new sync job using ${account.code || account.name}`}
                                  tone="emerald"
                                  onClick={onCreateJob}
                                />
                              ) : undefined
                            }
                            toolbar={
                              <HubResultCount
                                icon={Folder}
                                shown={filteredJobs.length}
                                total={jobs.length}
                                label="jobs"
                              />
                            }
                          />
                          <KpiStrip items={jobKpis} />
                        </>
                      }
                      table={
                        <JobsDirectoryTable
                          items={filteredJobs}
                          embedded
                          visibleKeys={DRIVE_JOB_COLUMN_KEYS}
                          onRowClick={(row) => onOpenJob(row.id)}
                          onStart={onStart}
                          onPause={onPause}
                          onStop={onStop}
                          busyId={busyId}
                          emptyMessage={
                            jobs.length > 0 && filteredJobs.length === 0
                              ? "No jobs match search or filters."
                              : "No jobs use this Drive."
                          }
                          resetKey={`${account.name}:${jobQuery}:${(jobFilterValues.mode ?? []).join(",")}:${(jobFilterValues.status ?? []).join(",")}`}
                        />
                      }
                    />
                  </div>
                </HubToolDetailSection>
                <HubToolDetailSection id={FILES_SECTION} title="Files" emoji="📄">
                  <div className="folder-sync-browse">
                    <SyncTreeSection
                      kpis={fileKpis}
                      shortcutScope={`p0009-drive-files-${account.name}`}
                      placeholder="Search files…"
                      filters={fileFilters}
                      query={fileQuery}
                      onQueryChange={setFileQuery}
                      values={fileFilterValues}
                      onValuesChange={setFileFilterValues}
                      shown={account.inventory?.fileCount ?? 0}
                      total={account.inventory?.fileCount ?? 0}
                      countLabel="files"
                      countIcon={File}
                      tree={
                        <SyncFolderTree
                          mode="drive"
                          resetKey={account.name}
                          remoteSpec={`${account.name}:`}
                          filterKey={fileFilterKey}
                          className="h-full"
                          onCacheChange={setTreeCache}
                          match={(row) =>
                            matchesOutlineRow(row, {
                              query: fileQuery,
                              kinds: fileFilterValues.kind,
                              formats: fileFilterValues.format,
                            })
                          }
                          onCreateFolder={async (parentPath, folderName) => {
                            const res = await createDriveFolder(account.name, parentPath, folderName);
                            if (!res.ok) throw new Error(res.error || "Could not create Google Drive folder.");
                            return res.path;
                          }}
                          load={async (dirPath) => {
                            const data = await fetchDriveTree(account.name, dirPath);
                            if (!data.ok) throw new Error(data.error || "Could not list this folder.");
                            return data.entries || [];
                          }}
                        />
                      }
                    />
                  </div>
                </HubToolDetailSection>
              </HubToolDetailSections>
            </>
          }
        />
      ) : null}
    </HubToolDetailModal>
    {account ? (
      <HubConfirmDialog
        open={confirmEmptyTrashOpen}
        stacked
        tone="danger"
        title="Empty Google Drive Trash"
        message={`Empty Google Drive Trash (${formatDriveBytes(storage?.trashBytes)}) on ${account.code || account.name}? Files in Google Drive Trash will be permanently deleted to free up quota.`}
        confirmLabel="Empty Trash"
        busy={emptyingTrash}
        busyLabel="Emptying…"
        onClose={() => {
          if (!emptyingTrash) setConfirmEmptyTrashOpen(false);
        }}
        onConfirm={() => {
          const trashLabel = formatDriveBytes(storage?.trashBytes);
          void (async () => {
            setEmptyingTrash(true);
            setTrashMsg(null);
            try {
              const res = await emptyDriveTrash(account.name);
              if (res.ok) {
                setTrashMsg({ ok: true, text: `Emptied Google Drive Trash (${trashLabel} freed).` });
                onSavedRef.current?.();
                setConfirmEmptyTrashOpen(false);
              } else {
                setTrashMsg({ ok: false, text: res.error || "Could not empty Google Drive Trash." });
                setConfirmEmptyTrashOpen(false);
              }
            } catch (err) {
              setTrashMsg({
                ok: false,
                text: err instanceof Error ? err.message : String(err),
              });
              setConfirmEmptyTrashOpen(false);
            } finally {
              setEmptyingTrash(false);
            }
          })();
        }}
      />
    ) : null}
    </HubAccountDetailSearchProvider>
  );
}
