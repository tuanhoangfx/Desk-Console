import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode, type Ref } from "react";
import { FolderOpen, Trash2, Zap } from "lucide-react";
import { openJobPath } from "../../lib/open-job-path";
import {
  HubAdmClickEditField,
  HubAdmClickFilterField,
  HubAdmInlineFieldLabel,
  HubAdmReadonlyField,
  HubDetailFieldRow,
  HubDetailFieldsGroup,
  HubMultiFilterDropdown,
  HubUsersStatusLabel,
  buildHubAdmDetailCopyTrailingAction,
  mergeHubAdmTrailingActions,
  type FilterDef,
  type FilterOption,
  HUB_DEBOUNCE_EMOJI,
  HUB_DEBOUNCE_LABEL,
} from "@tool-workspace/hub-ui";
import { ancestorPaths, joinLocalRoot, localPickRoot, writeLastUsedLocalRoot } from "../../lib/folder-pick.mjs";
import { DIRECTORY_STATUS_EMOJI } from "../../lib/folder-sync-directory-column-hints";
import { jobSettingsDraftDirty } from "../../lib/job-detail-dirty.mjs";
import {
  cleanJobExcludedOnDrive,
  createDriveFolder,
  createLocalFolder,
  fetchDriveTree,
  fetchLocalTree,
  fetchNetworkSettings,
  probeNetworkConnection,
  updateJob,
  type NetworkProbeResult,
  type SyncJob,
} from "../../lib/sync-api";
import {
  addCustomExcludeToken,
  customExcludeTokens,
  describeEffectiveJobProxy,
  excludeTextFromSelectedOptionIds,
  formatExcludeDropdownSummary,
  formatJobLiveProgressTooltip,
  JOB_EXCLUDE_PRESETS,
  JOB_MAX_FILE_SIZE_OPTIONS,
  JOB_MODE_EMOJI,
  JOB_MODE_OPTIONS,
  JOB_SETTLE_OPTIONS,
  jobExcludeText,
  jobSettleSec,
  jobStatusLive,
  jobStatusView,
  selectedExcludeOptionIds,
} from "../../lib/job-mode";
import {
  formatDriveAccountOptionLabel,
  formatDriveAccountOptionTip,
  formatDrivePath,
  joinRemoteSpec,
  remoteNameFromSpec,
  remotePathFromSpec,
  writeLastUsedDriveRemote,
} from "../../lib/remote-name";
import { DriveAccountNotice } from "../drives/DriveAccountFields";
import { FolderDropdownField, FolderPickDropdown } from "../tree/FolderPickDropdown";
import { useLocalDriveRootOptions } from "../tree/use-local-drives";
import { signedInDrives, useDriveAccounts } from "../drives/use-drive-accounts";

const MODE_OPTIONS: FilterOption[] = JOB_MODE_OPTIONS;

export function buildJobProxyModeOptions(inheritOptionLabel = "Inherit Drive / Global"): FilterOption[] {
  return [
    { value: "inherit", label: inheritOptionLabel },
    { value: "direct", label: "Direct (bypass proxy)" },
    { value: "custom", label: "Custom proxy…" },
  ];
}

export const JOB_PROXY_MODE_OPTIONS: FilterOption[] = buildJobProxyModeOptions();

export function resolveJobProxyMode(proxyUrl: string | undefined): "inherit" | "direct" | "custom" {
  const clean = String(proxyUrl || "").trim();
  if (!clean) return "inherit";
  if (clean.toLowerCase() === "direct") return "direct";
  return "custom";
}

export function ExcludeDropdownField({
  value,
  disabled = false,
  onChange,
  jobId,
}: {
  value: string;
  disabled?: boolean;
  onChange: (next: string) => void;
  jobId?: string | null;
}) {
  const [scanBusy, setScanBusy] = useState(false);
  const [cleanBusy, setCleanBusy] = useState(false);
  const [scanResult, setScanResult] = useState<{ count: number; files: string[]; cleaned?: boolean } | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    setScanResult(null);
    setScanError(null);
  }, [jobId, value]);

  const normalizedValue = useMemo(() => jobExcludeText(value), [value]);
  const selectedIds = useMemo(() => selectedExcludeOptionIds(normalizedValue), [normalizedValue]);
  const summaryLabel = useMemo(() => formatExcludeDropdownSummary(normalizedValue), [normalizedValue]);

  const filterDef = useMemo<FilterDef>(() => {
    const customs = customExcludeTokens(normalizedValue);
    return {
      key: "exclude",
      label: "Exclude",
      triggerEmoji: "🚫",
      suppressDefaultTriggerIcon: true,
      allowCustom: true,
      customOptionLabel: (query) => `Add custom rule “${query}”`,
      onCustomCreate: (query) => {
        onChange(addCustomExcludeToken(normalizedValue, query));
      },
      options: [
        ...JOB_EXCLUDE_PRESETS.map((preset) => ({
          value: preset.id,
          label: preset.label,
          emoji: preset.emoji,
          detail: `${preset.tokens.length} rules`,
          tip: preset.tokens.join(", "),
        })),
        ...customs.map((token) => ({
          value: `custom:${token}`,
          label: token,
          emoji: "🚫",
          detail: "Custom rule",
          tip: token,
        })),
      ],
    };
  }, [normalizedValue, onChange]);

  async function handleScanDrive() {
    if (!jobId || scanBusy || cleanBusy) return;
    setScanBusy(true);
    setScanError(null);
    try {
      const res = await cleanJobExcludedOnDrive(jobId, true);
      setScanResult({ count: res.count, files: res.files || [], cleaned: false });
    } catch (err) {
      setScanError(err instanceof Error ? err.message : String(err));
    } finally {
      setScanBusy(false);
    }
  }

  async function handleCleanDrive() {
    if (!jobId || scanBusy || cleanBusy) return;
    setCleanBusy(true);
    setScanError(null);
    try {
      await cleanJobExcludedOnDrive(jobId, false);
      setScanResult({ count: 0, files: [], cleaned: true });
    } catch (err) {
      setScanError(err instanceof Error ? err.message : String(err));
    } finally {
      setCleanBusy(false);
    }
  }

  const copyAction =
    normalizedValue && !disabled
      ? buildHubAdmDetailCopyTrailingAction({
          copyText: normalizedValue,
          title: "Copy Exclude rules",
          copyToastLabel: "Exclude rules copied",
        })
      : null;

  const cleanButton = jobId ? (
    <button
      type="button"
      disabled={disabled || scanBusy || cleanBusy}
      title="Scan Google Drive for excluded junk files (node_modules, cache, temp) and move to Drive Trash"
      aria-label="Clean excluded junk files on Google Drive"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void handleScanDrive();
      }}
      className="hub-adm-detail-field-copy folder-sync-path-btn inline-flex h-6 w-6 shrink-0 items-center justify-center rounded disabled:opacity-40"
    >
      <Trash2 size={12} aria-hidden />
    </button>
  ) : null;

  const mergedTrailing = mergeHubAdmTrailingActions(copyAction, cleanButton);

  return (
    <>
      <div
        className={`hub-adm-inline-field min-w-0 hub-adm-inline-field--readonly hub-adm-inline-field--click-filter hub-adm-inline-field--multiline hub-adm-inline-field--multiline-1${
          disabled ? " hub-adm-inline-field--disabled" : ""
        }`}
      >
        <HubAdmInlineFieldLabel header={{ label: "Exclude", headerEmoji: "🚫" }} />
        <div
          className={`hub-adm-inline-field__value${
            mergedTrailing ? " hub-adm-inline-field__value--has-trailing" : ""
          }`}
        >
          <HubMultiFilterDropdown
            filter={filterDef}
            selected={selectedIds}
            onChange={(nextIds) => onChange(excludeTextFromSelectedOptionIds(nextIds))}
            triggerLabel={summaryLabel}
            triggerTitle={normalizedValue || "None"}
            panelScope="twofa"
            className="hub-adm-click-filter w-full min-w-0"
            triggerClassName="hub-adm-click-filter__trigger"
          />
          {mergedTrailing ? (
            <span className="hub-adm-click-filter__trailing inline-flex shrink-0 items-center">
              {mergedTrailing}
            </span>
          ) : null}
        </div>
      </div>
      {scanError ? <span className="col-span-full text-xs text-rose-300">{scanError}</span> : null}
      {scanResult ? (
        <div className="col-span-full flex flex-wrap items-center justify-between gap-2 rounded border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs">
          {scanResult.cleaned ? (
            <span className="text-emerald-300">
              ✓ Excluded junk files on Google Drive moved to Drive Trash.
            </span>
          ) : scanResult.count === 0 ? (
            <span className="text-emerald-300">
              ✓ Google Drive folder is clean — 0 excluded junk files found on Drive.
            </span>
          ) : (
            <>
              <span className="text-amber-200" title={scanResult.files.slice(0, 15).join("\n")}>
                Found <strong>{scanResult.count}</strong> excluded junk {scanResult.count === 1 ? "file" : "files"} on Drive
                {scanResult.files[0] ? ` (e.g. ${scanResult.files[0]})` : ""}
              </span>
              <button
                type="button"
                disabled={cleanBusy}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void handleCleanDrive();
                }}
                className="inline-flex items-center gap-1 rounded border border-rose-400/40 bg-rose-500/20 px-2 py-0.5 text-xs text-rose-200 hover:bg-rose-500/30 disabled:opacity-40"
              >
                <Trash2 size={11} aria-hidden />
                <span>{cleanBusy ? "Moving to Drive Trash…" : `Trash ${scanResult.count} on Drive`}</span>
              </button>
            </>
          )}
        </div>
      ) : null}
    </>
  );
}

type Draft = {
  name: string;
  localPath: string;
  remote: string;
  mode: SyncJob["mode"];
  settleSec: number;
  proxyUrl: string;
  maxFileSize: string;
  exclude: string;
};

function draftFromJob(job: SyncJob): Draft {
  return {
    name: job.name,
    localPath: job.localPath,
    remote: job.remote,
    mode: job.mode,
    settleSec: jobSettleSec(job.settleSec),
    proxyUrl: String(job.proxyUrl || ""),
    maxFileSize: String(job.maxFileSize || ""),
    exclude: jobExcludeText(job.exclude),
  };
}

function TrailingIconButton({
  title,
  onClick,
  disabled,
  className = "",
  buttonRef,
  expanded,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  buttonRef?: Ref<HTMLButtonElement>;
  expanded?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className={`hub-adm-detail-field-copy inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-40${className ? ` ${className}` : ""}`}
      title={title}
      aria-label={title}
      aria-expanded={expanded}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
    >
      {children}
    </button>
  );
}

type Props = {
  job: SyncJob | null;
  busy: boolean;
  onSaved: (job: SyncJob) => void;
  /** Layout 3 footer Save flushes the draft. Fields do not write themselves. */
  saveRef?: MutableRefObject<(() => Promise<void>) | null>;
  /** Footer Save stays idle until this draft differs from the saved job. */
  onDirtyChange?: (dirty: boolean) => void;
};

/** Job fields inside the Layout 3 detail modal. */
export function JobSettingsForm({ job, busy, onSaved, saveRef, onDirtyChange }: Props) {
  const { accounts, loading: drivesLoading } = useDriveAccounts();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [globalProxyUrl, setGlobalProxyUrl] = useState("");
  const [customProxyOpen, setCustomProxyOpen] = useState(false);
  const [probingProxy, setProbingProxy] = useState(false);
  const [proxyProbeResult, setProxyProbeResult] = useState<NetworkProbeResult | null>(null);
  const [browseMsg, setBrowseMsg] = useState<string | null>(null);
  const [picker, setPicker] = useState<"local" | "drive" | null>(null);
  const localFieldRef = useRef<HTMLDivElement>(null);
  const driveFieldRef = useRef<HTMLDivElement>(null);
  const localDriveRootOptions = useLocalDriveRootOptions(Boolean(job));
  const readyDrives = useMemo(() => signedInDrives(accounts), [accounts]);
  const driveRootOptions = useMemo(
    () =>
      readyDrives.map((acc) => ({
        value: acc.name,
        label: formatDriveAccountOptionLabel(acc),
        detail: acc.email || acc.name,
        tip: formatDriveAccountOptionTip(acc),
        emoji: "☁️",
      })),
    [readyDrives],
  );

  useEffect(() => {
    if (!job) return;
    let alive = true;
    void fetchNetworkSettings()
      .then((res) => {
        if (alive) setGlobalProxyUrl(res.settings?.proxyUrl || "");
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [job?.id]);

  useEffect(() => {
    if (!job) {
      setDraft(null);
      setCustomProxyOpen(false);
      setProxyProbeResult(null);
      return;
    }
    const next = draftFromJob(job);
    setDraft(next);
    setCustomProxyOpen(resolveJobProxyMode(next.proxyUrl) === "custom");
    setProxyProbeResult(null);
  }, [job?.id, job?.name, job?.localPath, job?.remote, job?.mode, job?.settleSec, job?.proxyUrl, job?.maxFileSize, job?.exclude]);

  useEffect(() => {
    setPicker(null);
  }, [job?.id]);

  const persist = useCallback(
    async (next: Draft) => {
      if (!job) return;
      const { job: saved } = await updateJob(job.id, next);
      onSaved(saved);
    },
    [job, onSaved],
  );

  const editDraft = useCallback((next: Draft) => {
    setDraft(next);
  }, []);

  const settingsDirty = Boolean(job && draft && jobSettingsDraftDirty(draftFromJob(job), draft));

  useEffect(() => {
    onDirtyChange?.(settingsDirty);
  }, [onDirtyChange, settingsDirty]);

  useEffect(() => {
    if (!saveRef) return;
    saveRef.current = async () => {
      if (!draft || !job || !jobSettingsDraftDirty(draftFromJob(job), draft)) return;
      await persist(draft);
    };
    return () => {
      saveRef.current = null;
    };
  }, [draft, job, persist, saveRef]);

  const openPath = useCallback((kind: "local" | "remote", target: string) => {
    setBrowseMsg(null);
    void openJobPath(kind, target).catch((error) => {
      setBrowseMsg(error instanceof Error ? error.message : String(error));
    });
  }, []);

  const proxyMode: "inherit" | "direct" | "custom" = customProxyOpen
    ? "custom"
    : resolveJobProxyMode(draft?.proxyUrl);

  const currentDriveAccount = useMemo(() => {
    const rName = remoteNameFromSpec(draft?.remote || "");
    return accounts.find((a) => a.name === rName) || null;
  }, [accounts, draft?.remote]);

  const effectiveProxyInfo = useMemo(
    () =>
      describeEffectiveJobProxy(
        draft?.proxyUrl,
        currentDriveAccount?.proxyUrl,
        globalProxyUrl,
      ),
    [draft?.proxyUrl, currentDriveAccount?.proxyUrl, globalProxyUrl],
  );

  const proxyOptions = useMemo(
    () => buildJobProxyModeOptions(effectiveProxyInfo.inheritOptionLabel),
    [effectiveProxyInfo.inheritOptionLabel],
  );

  async function runProxyTest(targetProxyUrl: string) {
    setProbingProxy(true);
    try {
      const res = await probeNetworkConnection(targetProxyUrl);
      setProxyProbeResult(res);
    } finally {
      setProbingProxy(false);
    }
  }

  return (
    <>
      {!job || !draft ? (
        <p className="hub-directory-body-value text-white/55">Select a job. Its settings edit here. Folders open from the job row.</p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
          <HubDetailFieldsGroup>
              <HubDetailFieldRow slots={3}>
                <HubAdmReadonlyField header={{ label: "Status", headerEmoji: DIRECTORY_STATUS_EMOJI }} valueLayout="inline">
                  <HubUsersStatusLabel
                    label={
                      (jobStatusView(job).label === "Syncing" || jobStatusView(job).label === "Analyzing") &&
                      job.liveProgress?.percent != null
                        ? `${jobStatusView(job).label} ${job.liveProgress.percent}%`
                        : jobStatusView(job).label
                    }
                    tone={jobStatusView(job).tone}
                    capitalize={false}
                    variant="detail"
                    live={jobStatusLive(job)}
                    popoverTitle="Sync status"
                    title={
                      formatJobLiveProgressTooltip(job.liveProgress) ||
                      (jobStatusView(job).label === "Failed"
                        ? job.lastResult?.stderr || "Last sync pass failed — click Retry to run again."
                        : jobStatusView(job).label === "Syncing" || jobStatusView(job).label === "Analyzing"
                          ? "Rclone pass is actively transferring/checking files."
                          : jobStatusView(job).label === "Waiting"
                            ? "Debounce armed — sync starts automatically when countdown settles."
                            : jobStatusView(job).label === "Stopped"
                              ? "24/7 watch is paused — click Start to resume."
                              : jobStatusLive(job)
                                ? "24/7 watcher armed — waiting for local or Drive changes."
                                : "Manual mode — click Start to run a sync pass.")
                    }
                  />
                </HubAdmReadonlyField>
                <HubAdmClickEditField
                  header={{ label: "Name", headerEmoji: "🏷" }}
                  fieldLabel="Name"
                  value={draft.name}
                  onChange={(v) => editDraft({ ...draft, name: v })}
                />
                <HubAdmClickFilterField
                  header={{ label: "Mode", headerEmoji: JOB_MODE_EMOJI }}
                  fieldLabel="Mode"
                  filterKey="p0009-job-mode"
                  options={MODE_OPTIONS}
                  value={draft.mode}
                  onChange={(v) => editDraft({ ...draft, mode: v as SyncJob["mode"] })}
                />
              </HubDetailFieldRow>
              <HubDetailFieldRow slots={3}>
                <HubAdmClickFilterField
                  header={{ label: HUB_DEBOUNCE_LABEL, headerEmoji: HUB_DEBOUNCE_EMOJI }}
                  fieldLabel={HUB_DEBOUNCE_LABEL}
                  filterKey="p0009-job-settle"
                  options={JOB_SETTLE_OPTIONS}
                  value={String(draft.settleSec)}
                  allowClear={false}
                  onChange={(value) => editDraft({ ...draft, settleSec: jobSettleSec(value) })}
                />
                <HubAdmClickFilterField
                  header={{ label: "Max File Size", headerEmoji: "📏" }}
                  fieldLabel="Max File Size"
                  filterKey="p0009-job-max-size"
                  options={JOB_MAX_FILE_SIZE_OPTIONS}
                  value={draft.maxFileSize || "UNLIMITED"}
                  allowClear={false}
                  onChange={(value) => editDraft({ ...draft, maxFileSize: value === "UNLIMITED" ? "" : value })}
                />
                <HubAdmClickFilterField
                  header={{ label: "Proxy", headerEmoji: "🌐" }}
                  fieldLabel="Proxy"
                  filterKey="p0009-job-proxy-mode"
                  options={proxyOptions}
                  value={proxyMode}
                  allowClear={false}
                  trailingAction={
                    proxyMode !== "custom" ? (
                      <button
                        type="button"
                        className="hub-adm-detail-field-copy folder-sync-path-btn inline-flex h-6 w-6 shrink-0 items-center justify-center rounded disabled:opacity-40"
                        title={`Test effective connection (${effectiveProxyInfo.sourceLabel})`}
                        aria-label={`Test effective connection (${effectiveProxyInfo.sourceLabel})`}
                        disabled={probingProxy}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void runProxyTest(effectiveProxyInfo.effectiveProxyUrl);
                        }}
                      >
                        <Zap size={12} aria-hidden />
                      </button>
                    ) : undefined
                  }
                  onChange={(value) => {
                    setProxyProbeResult(null);
                    if (value === "inherit") {
                      setCustomProxyOpen(false);
                      editDraft({ ...draft, proxyUrl: "" });
                    } else if (value === "direct") {
                      setCustomProxyOpen(false);
                      editDraft({ ...draft, proxyUrl: "direct" });
                    } else {
                      setCustomProxyOpen(true);
                      if (!draft.proxyUrl || draft.proxyUrl === "direct") {
                        editDraft({ ...draft, proxyUrl: "" });
                      }
                    }
                  }}
                />
              </HubDetailFieldRow>
              {proxyMode !== "custom" && proxyProbeResult ? (
                <div
                  className={`font-mono text-xs ${
                    proxyProbeResult.ok ? "text-emerald-300" : "text-rose-300"
                  }`}
                >
                  {proxyProbeResult.ok ? "✓ " : "✗ "}
                  {proxyProbeResult.message}
                </div>
              ) : null}
              {proxyMode === "custom" ? (
                <div className="hub-adm-form-row hub-adm-form-row--aligned hub-adm-form-row--detail-line">
                  <HubAdmClickEditField
                    className="hub-adm-inline-field--multiline hub-adm-inline-field--multiline-1"
                    header={{ label: "Proxy URL", headerEmoji: "🔌" }}
                    fieldLabel="Proxy URL"
                    value={draft.proxyUrl === "direct" ? "" : draft.proxyUrl}
                    placeholder="host:port:user:pass or socks5://127.0.0.1:1080"
                    onChange={(value) => {
                      setProxyProbeResult(null);
                      editDraft({ ...draft, proxyUrl: value.trim() });
                    }}
                    trailingAction={
                      <button
                        type="button"
                        className="hub-adm-detail-field-copy folder-sync-path-btn inline-flex h-6 w-6 shrink-0 items-center justify-center rounded disabled:opacity-40"
                        title="Test latency to Google Drive API through this Proxy URL"
                        aria-label="Test latency to Google Drive API through this Proxy URL"
                        disabled={probingProxy}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void runProxyTest(draft.proxyUrl === "direct" ? "" : draft.proxyUrl);
                        }}
                      >
                        <Zap size={12} aria-hidden />
                      </button>
                    }
                  />
                  {proxyProbeResult ? (
                    <div
                      className={`mt-1 font-mono text-xs ${
                        proxyProbeResult.ok ? "text-emerald-300" : "text-rose-300"
                      }`}
                    >
                      {proxyProbeResult.ok ? "✓ " : "✗ "}
                      {proxyProbeResult.message}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div ref={localFieldRef} className="hub-adm-form-row hub-adm-form-row--aligned hub-adm-form-row--detail-line">
                <FolderDropdownField
                  header={{ label: "Local", headerEmoji: "💻" }}
                  fieldLabel="Local"
                  value={draft.localPath}
                  placeholder="Select local folder…"
                  expanded={picker === "local"}
                  disabled={busy}
                  onToggle={() => setPicker((current) => (current === "local" ? null : "local"))}
                  trailingAction={
                    <TrailingIconButton
                      title="Open local folder"
                      className="folder-sync-path-btn"
                      disabled={busy || !draft.localPath.trim()}
                      onClick={() => openPath("local", draft.localPath)}
                    >
                      <FolderOpen size={12} aria-hidden />
                    </TrailingIconButton>
                  }
                />
              </div>
              <div ref={driveFieldRef} className="hub-adm-form-row hub-adm-form-row--aligned hub-adm-form-row--detail-line">
                <FolderDropdownField
                  header={{ label: "Drive", headerEmoji: "☁️" }}
                  fieldLabel="Drive"
                  value={formatDrivePath(draft.remote, accounts)}
                  placeholder="Select Google Drive folder…"
                  expanded={picker === "drive"}
                  disabled={busy}
                  onToggle={() => setPicker((current) => (current === "drive" ? null : "drive"))}
                  trailingAction={
                    <TrailingIconButton
                      title="Open in Google Drive"
                      className="folder-sync-path-btn"
                      disabled={busy || !draft.remote.trim()}
                      onClick={() => openPath("remote", draft.remote)}
                    >
                      <FolderOpen size={12} aria-hidden />
                    </TrailingIconButton>
                  }
                />
              </div>
              <FolderPickDropdown
                open={picker === "local"}
                anchorRef={localFieldRef}
                onClose={() => setPicker(null)}
                resetKey={`local:${localPickRoot(draft.localPath).root || "C:\\"}`}
                selectedPath={localPickRoot(draft.localPath).rel}
                seedExpanded={ancestorPaths(localPickRoot(draft.localPath).rel)}
                rootOptions={localDriveRootOptions}
                activeRoot={localPickRoot(draft.localPath).root || "C:\\"}
                onSelectRoot={(nextRoot) => {
                  writeLastUsedLocalRoot(nextRoot);
                  editDraft({ ...draft, localPath: nextRoot });
                }}
                onCreateFolder={async (parentPath, folderName) => {
                  const root = localPickRoot(draft.localPath).root || "C:\\";
                  const res = await createLocalFolder(root, parentPath, folderName);
                  if (!res.ok) throw new Error(res.error || "Could not create local folder.");
                  return res.path;
                }}
                load={async (dirPath) => {
                  const root = localPickRoot(draft.localPath).root || "C:\\";
                  const data = await fetchLocalTree(root, dirPath);
                  if (!data.ok) throw new Error(data.error || "Could not list this folder.");
                  return data.entries || [];
                }}
                onSelectFolder={(dirPath) => {
                  const root = localPickRoot(draft.localPath).root || "C:\\";
                  writeLastUsedLocalRoot(root);
                  editDraft({ ...draft, localPath: joinLocalRoot(root, dirPath) });
                }}
              />
              <FolderPickDropdown
                open={picker === "drive"}
                anchorRef={driveFieldRef}
                onClose={() => setPicker(null)}
                resetKey={`drive:${remoteNameFromSpec(draft.remote)}`}
                selectedPath={remotePathFromSpec(draft.remote)}
                seedExpanded={ancestorPaths(remotePathFromSpec(draft.remote))}
                rootOptions={driveRootOptions}
                activeRoot={remoteNameFromSpec(draft.remote)}
                onSelectRoot={(nextRemoteName) => {
                  writeLastUsedDriveRemote(nextRemoteName);
                  editDraft({
                    ...draft,
                    remote: joinRemoteSpec(nextRemoteName, ""),
                  });
                }}
                onCreateFolder={async (parentPath, folderName) => {
                  const remoteName = remoteNameFromSpec(draft.remote);
                  const res = await createDriveFolder(remoteName, parentPath, folderName);
                  if (!res.ok) throw new Error(res.error || "Could not create Google Drive folder.");
                  return res.path;
                }}
                load={async (dirPath) => {
                  const data = await fetchDriveTree(remoteNameFromSpec(draft.remote), dirPath);
                  if (!data.ok) throw new Error(data.error || "Could not list this folder.");
                  return data.entries || [];
                }}
                onSelectFolder={(dirPath) =>
                  editDraft({
                    ...draft,
                    remote: joinRemoteSpec(remoteNameFromSpec(draft.remote), dirPath),
                  })
                }
              />
              <DriveAccountNotice remote={draft.remote} accounts={accounts} loading={drivesLoading} />
              <div className="hub-adm-form-row hub-adm-form-row--aligned hub-adm-form-row--detail-line">
                <ExcludeDropdownField
                  value={draft.exclude}
                  disabled={busy}
                  jobId={job.id}
                  onChange={(nextExclude) => editDraft({ ...draft, exclude: nextExclude })}
                />
              </div>
          </HubDetailFieldsGroup>

          {browseMsg ? <p className="hub-directory-body-value text-rose-200/90">{browseMsg}</p> : null}
        </div>
      )}
    </>
  );
}
