import { useEffect, useMemo, useRef, useState } from "react";
import { FolderOpen, Zap } from "lucide-react";
import { navScreenChrome } from "../../lib/nav-structure";
import {
  HUB_ACCOUNT_DETAIL_JOB_EMOJI,
  HUB_DEBOUNCE_EMOJI,
  HUB_DEBOUNCE_LABEL,
  HubAdmClickEditField,
  HubAdmClickFilterField,
  HubDetailFieldRow,
  HubDetailFieldsGroup,
  HubTocSectionNav,
  HubToolDetailModal,
  HubToolDetailModalAccountFooter,
  HubToolDetailRail,
  HubToolDetailSection,
  hubAccountDetailShellClass,
} from "@tool-workspace/hub-ui";
import {
  ancestorPaths,
  joinLocalRoot,
  localPickRoot,
  readLastUsedLocalRoot,
  writeLastUsedLocalRoot,
} from "../../lib/folder-pick.mjs";
import {
  DEFAULT_JOB_EXCLUDES,
  describeEffectiveJobProxy,
  JOB_MAX_FILE_SIZE_OPTIONS,
  JOB_MODE_EMOJI,
  JOB_MODE_OPTIONS,
  JOB_SETTLE_OPTIONS,
  jobSettleSec,
} from "../../lib/job-mode";
import { openJobPath } from "../../lib/open-job-path";
import {
  formatDriveAccountOptionLabel,
  formatDriveAccountOptionTip,
  formatDrivePath,
  joinRemoteSpec,
  readLastUsedDriveRemote,
  remoteNameFromSpec,
  remotePathFromSpec,
  writeLastUsedDriveRemote,
} from "../../lib/remote-name";
import {
  createDriveFolder,
  createLocalFolder,
  fetchDriveTree,
  fetchLocalTree,
  fetchNetworkSettings,
  probeNetworkConnection,
  type NetworkProbeResult,
  type SyncJob,
} from "../../lib/sync-api";
import { DriveAccountNotice } from "../drives/DriveAccountFields";
import { signedInDrives, useDriveAccounts } from "../drives/use-drive-accounts";
import { FolderDropdownField, FolderPickDropdown } from "../tree/FolderPickDropdown";
import { useLocalDriveRootOptions } from "../tree/use-local-drives";
import { buildJobProxyModeOptions, ExcludeDropdownField, resolveJobProxyMode } from "./JobsSettingRail";

type Draft = {
  name: string;
  localPath: string;
  remote: string;
  mode: SyncJob["mode"];
  settleSec?: number;
  proxyUrl?: string;
  maxFileSize?: string;
  exclude?: string;
};

const DEFAULT_DRAFT: Draft = {
  name: "Documents ↔ Drive",
  localPath: "",
  remote: "",
  mode: "bisync",
  settleSec: 20,
  proxyUrl: "",
  maxFileSize: "",
  exclude: DEFAULT_JOB_EXCLUDES,
};

const MODE_OPTIONS = JOB_MODE_OPTIONS;

const JOB_SECTION = "p0009-new-job";

type Props = {
  open: boolean;
  initialRemoteName?: string;
  initialLocalPath?: string;
  onClose: () => void;
  onCreate: (draft: Draft) => Promise<void>;
};

function folderBaseName(localPath: string): string {
  const clean = String(localPath || "")
    .trim()
    .replace(/[\\/]+$/, "");
  if (!clean) return "";
  const parts = clean.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] || clean;
}

/** New job — Layout 3. Drive must already be signed in on the Drives screen. */
export function JobsCreateModal({ open, initialRemoteName, initialLocalPath, onClose, onCreate }: Props) {
  const { accounts, loading } = useDriveAccounts();
  const jobChrome = navScreenChrome("jobs");
  const JobIcon = jobChrome.icon;
  const [draft, setDraft] = useState<Draft>(DEFAULT_DRAFT);
  const [globalProxyUrl, setGlobalProxyUrl] = useState("");
  const [customProxyOpen, setCustomProxyOpen] = useState(false);
  const [probingProxy, setProbingProxy] = useState(false);
  const [proxyProbeResult, setProxyProbeResult] = useState<NetworkProbeResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<"local" | "drive" | null>(null);
  const localFieldRef = useRef<HTMLDivElement>(null);
  const driveFieldRef = useRef<HTMLDivElement>(null);
  const localDriveRootOptions = useLocalDriveRootOptions(open);

  const readyDrives = useMemo(() => signedInDrives(accounts), [accounts]);
  const defaultRemoteName = useMemo(
    () => readLastUsedDriveRemote(readyDrives.map((d) => d.name)),
    [readyDrives],
  );
  const defaultLocalRoot = useMemo(
    () => readLastUsedLocalRoot(localDriveRootOptions.map((o) => o.value)),
    [localDriveRootOptions],
  );
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
    if (!open) {
      setPicker(null);
      setProxyProbeResult(null);
      return;
    }
    void fetchNetworkSettings()
      .then((res) => setGlobalProxyUrl(res.settings?.proxyUrl || ""))
      .catch(() => undefined);
    setDraft((prev) => {
      let next = prev;
      if (initialLocalPath && initialLocalPath.trim()) {
        const cleanLocal = initialLocalPath.trim();
        const base = folderBaseName(cleanLocal);
        next = {
          ...next,
          localPath: cleanLocal,
          name: base ? `${base} ↔ Drive` : next.name,
        };
      }
      if (initialRemoteName) {
        return { ...next, remote: `${initialRemoteName}:${folderBaseName(next.localPath)}` };
      }
      if (next.remote || !readyDrives.length) return next;
      const base = folderBaseName(next.localPath);
      return { ...next, remote: `${defaultRemoteName}:${base}` };
    });
  }, [open, initialRemoteName, initialLocalPath, readyDrives, defaultRemoteName]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (draft.remote) writeLastUsedDriveRemote(draft.remote);
      if (draft.localPath) writeLastUsedLocalRoot(draft.localPath);
      await onCreate(draft);
      setDraft(DEFAULT_DRAFT);
      setCustomProxyOpen(false);
      setProxyProbeResult(null);
      setPicker(null);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const proxyMode: "inherit" | "direct" | "custom" = customProxyOpen
    ? "custom"
    : resolveJobProxyMode(draft.proxyUrl);

  const currentDriveAccount = useMemo(() => {
    const rName = remoteNameFromSpec(draft.remote, defaultRemoteName);
    return accounts.find((a) => a.name === rName) || null;
  }, [accounts, draft.remote, defaultRemoteName]);

  const effectiveProxyInfo = useMemo(
    () =>
      describeEffectiveJobProxy(
        draft.proxyUrl,
        currentDriveAccount?.proxyUrl,
        globalProxyUrl,
      ),
    [draft.proxyUrl, currentDriveAccount?.proxyUrl, globalProxyUrl],
  );

  const proxyOptions = useMemo(
    () =>
      buildJobProxyModeOptions(
        effectiveProxyInfo.inheritOptionLabel,
        effectiveProxyInfo.inheritOptionDetail,
        effectiveProxyInfo.inheritOptionTip,
      ),
    [
      effectiveProxyInfo.inheritOptionLabel,
      effectiveProxyInfo.inheritOptionDetail,
      effectiveProxyInfo.inheritOptionTip,
    ],
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
    <HubToolDetailModal
      open={open}
      onClose={onClose}
      title="New job"
      headerIcon={JobIcon}
      headerIconClassName={jobChrome.iconClass}
      ariaLabel="New sync job"
      size="detail"
      shellClassName={hubAccountDetailShellClass()}
      busy={busy}
      sectionIds={[JOB_SECTION]}
      toc={
        <HubToolDetailRail title="Navigate" titleEmoji="🧭" className="twofa-adm-rail--toc" scroll={false} ariaLabel="Sections">
          <HubTocSectionNav
            items={[{ id: JOB_SECTION, label: "Job", emoji: HUB_ACCOUNT_DETAIL_JOB_EMOJI }]}
            admNav
          />
        </HubToolDetailRail>
      }
      footer={
        <HubToolDetailModalAccountFooter
          onClose={onClose}
          closeDisabled={busy}
          onSave={() => void submit()}
          saveLabel="Create"
          saveVariant="create"
          saveDisabled={
            busy ||
            loading ||
            !draft.localPath.trim() ||
            !readyDrives.some((account) => account.name === remoteNameFromSpec(draft.remote, ""))
          }
          busy={busy}
        />
      }
    >
      {error ? (
        <div className="hub-directory-body-value mb-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-rose-100">
          {error}
        </div>
      ) : null}
      <HubToolDetailSection id={JOB_SECTION} title="Job" icon={<JobIcon size={14} aria-hidden />}>
        <HubDetailFieldsGroup>
          <div className="hub-adm-form-row hub-adm-form-row--aligned-2">
            <HubAdmClickEditField
              header={{ label: "Name", headerEmoji: "🏷" }}
              fieldLabel="Name"
              value={draft.name}
              onChange={(v) => setDraft((d) => ({ ...d, name: v }))}
            />
            <HubAdmClickFilterField
              header={{ label: "Mode", headerEmoji: JOB_MODE_EMOJI }}
              fieldLabel="Mode"
              filterKey="p0009-new-job-mode"
              options={MODE_OPTIONS}
              value={draft.mode}
              onChange={(v) => setDraft((d) => ({ ...d, mode: v as SyncJob["mode"] }))}
            />
          </div>
          <HubDetailFieldRow slots={3}>
            <HubAdmClickFilterField
              header={{ label: HUB_DEBOUNCE_LABEL, headerEmoji: HUB_DEBOUNCE_EMOJI }}
              fieldLabel={HUB_DEBOUNCE_LABEL}
              filterKey="p0009-new-job-settle"
              options={JOB_SETTLE_OPTIONS}
              value={String(jobSettleSec(draft.settleSec))}
              allowClear={false}
              onChange={(value) => setDraft((d) => ({ ...d, settleSec: jobSettleSec(value) }))}
            />
            <HubAdmClickFilterField
              header={{ label: "Max File Size", headerEmoji: "📏" }}
              fieldLabel="Max File Size"
              filterKey="p0009-new-job-max-size"
              options={JOB_MAX_FILE_SIZE_OPTIONS}
              value={draft.maxFileSize || "UNLIMITED"}
              allowClear={false}
              onChange={(value) => setDraft((d) => ({ ...d, maxFileSize: value === "UNLIMITED" ? "" : value }))}
            />
            <HubAdmClickFilterField
              header={{ label: "Proxy", headerEmoji: "🌐" }}
              fieldLabel="Proxy"
              filterKey="p0009-new-job-proxy-mode"
              options={proxyOptions}
              value={proxyMode}
              allowClear={false}
              showCopyAction={Boolean(effectiveProxyInfo.effectiveProxyUrl)}
              copyValue={effectiveProxyInfo.effectiveProxyUrl}
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
                  setDraft((d) => ({ ...d, proxyUrl: "" }));
                } else if (value === "direct") {
                  setCustomProxyOpen(false);
                  setDraft((d) => ({ ...d, proxyUrl: "direct" }));
                } else {
                  setCustomProxyOpen(true);
                  setDraft((d) => ({ ...d, proxyUrl: d.proxyUrl === "direct" ? "" : d.proxyUrl || "" }));
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
                value={draft.proxyUrl === "direct" ? "" : draft.proxyUrl || ""}
                placeholder="host:port:user:pass or socks5://127.0.0.1:1080"
                onChange={(value) => {
                  setProxyProbeResult(null);
                  setDraft((d) => ({ ...d, proxyUrl: value.trim() }));
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
                      void runProxyTest(draft.proxyUrl === "direct" ? "" : draft.proxyUrl || "");
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
                <button
                  type="button"
                  className="hub-adm-detail-field-copy folder-sync-path-btn inline-flex h-6 w-6 shrink-0 items-center justify-center rounded disabled:opacity-40"
                  title="Open local folder"
                  aria-label="Open local folder"
                  disabled={busy || !draft.localPath.trim()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void openJobPath("local", draft.localPath).catch(() => undefined);
                  }}
                >
                  <FolderOpen size={12} aria-hidden />
                </button>
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
              disabled={busy || readyDrives.length === 0}
              onToggle={() => setPicker((current) => (current === "drive" ? null : "drive"))}
              trailingAction={
                <button
                  type="button"
                  className="hub-adm-detail-field-copy folder-sync-path-btn inline-flex h-6 w-6 shrink-0 items-center justify-center rounded disabled:opacity-40"
                  title="Open in Google Drive"
                  aria-label="Open in Google Drive"
                  disabled={busy || !draft.remote.trim()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void openJobPath("remote", draft.remote).catch(() => undefined);
                  }}
                >
                  <FolderOpen size={12} aria-hidden />
                </button>
              }
            />
          </div>
          <FolderPickDropdown
            open={picker === "local"}
            anchorRef={localFieldRef}
            onClose={() => setPicker(null)}
            resetKey={`new-local:${localPickRoot(draft.localPath).root || defaultLocalRoot}`}
            selectedPath={localPickRoot(draft.localPath).rel}
            seedExpanded={ancestorPaths(localPickRoot(draft.localPath).rel)}
            rootOptions={localDriveRootOptions}
            activeRoot={localPickRoot(draft.localPath).root || defaultLocalRoot}
            onSelectRoot={(nextRoot) => {
              writeLastUsedLocalRoot(nextRoot);
              setDraft((d) => ({ ...d, localPath: nextRoot }));
            }}
            onCreateFolder={async (parentPath, folderName) => {
              const root = localPickRoot(draft.localPath).root || defaultLocalRoot;
              const res = await createLocalFolder(root, parentPath, folderName);
              if (!res.ok) throw new Error(res.error || "Could not create local folder.");
              return res.path;
            }}
            load={async (dirPath) => {
              const root = localPickRoot(draft.localPath).root || defaultLocalRoot;
              const data = await fetchLocalTree(root, dirPath);
              if (!data.ok) throw new Error(data.error || "Could not list this folder.");
              return data.entries || [];
            }}
            onSelectFolder={(dirPath) => {
              const root = localPickRoot(draft.localPath).root || defaultLocalRoot;
              writeLastUsedLocalRoot(root);
              setDraft((d) => ({ ...d, localPath: joinLocalRoot(root, dirPath) }));
            }}
          />
          <FolderPickDropdown
            open={picker === "drive"}
            anchorRef={driveFieldRef}
            onClose={() => setPicker(null)}
            resetKey={`new-drive:${remoteNameFromSpec(draft.remote, defaultRemoteName)}`}
            selectedPath={remotePathFromSpec(draft.remote)}
            seedExpanded={ancestorPaths(remotePathFromSpec(draft.remote))}
            rootOptions={driveRootOptions}
            activeRoot={remoteNameFromSpec(draft.remote, defaultRemoteName)}
            onSelectRoot={(nextRemoteName) => {
              writeLastUsedDriveRemote(nextRemoteName);
              setDraft((d) => ({
                ...d,
                remote: joinRemoteSpec(nextRemoteName, ""),
              }));
            }}
            onCreateFolder={async (parentPath, folderName) => {
              const remoteName = remoteNameFromSpec(draft.remote, defaultRemoteName);
              const res = await createDriveFolder(remoteName, parentPath, folderName);
              if (!res.ok) throw new Error(res.error || "Could not create Google Drive folder.");
              return res.path;
            }}
            load={async (dirPath) => {
              const data = await fetchDriveTree(remoteNameFromSpec(draft.remote, defaultRemoteName), dirPath);
              if (!data.ok) throw new Error(data.error || "Could not list this folder.");
              return data.entries || [];
            }}
            onSelectFolder={(dirPath) =>
              setDraft((d) => ({
                ...d,
                remote: joinRemoteSpec(remoteNameFromSpec(d.remote, defaultRemoteName), dirPath),
              }))
            }
          />
          <DriveAccountNotice remote={draft.remote} accounts={accounts} loading={loading} />
          <div className="hub-adm-form-row hub-adm-form-row--aligned hub-adm-form-row--detail-line">
            <ExcludeDropdownField
              value={draft.exclude ?? DEFAULT_JOB_EXCLUDES}
              disabled={busy}
              onChange={(nextExclude) => setDraft((d) => ({ ...d, exclude: nextExclude }))}
            />
          </div>
        </HubDetailFieldsGroup>
      </HubToolDetailSection>
    </HubToolDetailModal>
  );
}
