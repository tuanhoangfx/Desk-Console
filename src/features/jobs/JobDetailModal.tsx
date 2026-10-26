import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, KeyRound, Save } from "lucide-react";
import {
  HUB_ACCOUNT_DETAIL_JOB_EMOJI,
  HubAccountDetailAdmScaffold,
  HubAccountDetailHeaderSearch,
  HubAccountDetailSearchProvider,
  HubActivityTimestampLabel,
  HubAdmNoteLogRails,
  HubAdmRecordMetaRow,
  HubBulkActionButton,
  HubTocSectionNav,
  HubToolDetailModal,
  HubToolDetailModalAccountFooter,
  HubToolDetailRail,
  HubToolDetailSection,
  HubToolDetailSections,
  HUB_ACCOUNT_DETAIL_MAIN_SCROLL_ROOT,
  HUB_TOOL_DETAIL_SECTIONS_CLASS,
  hubAccountDetailShellClass,
  HUB_DEBOUNCE_LABEL,
} from "@tool-workspace/hub-ui";
import {
  fetchJobConflicts,
  resolveJobConflict,
  updateJob,
  type JobConflictFile,
  type SyncJob,
} from "../../lib/sync-api";
import { remoteNameFromSpec } from "../../lib/remote-name";
import { DriveSignInModal } from "../drives/DriveSignInModal";
import { useDriveAccounts } from "../drives/use-drive-accounts";
import { JobFolderBrowse } from "./JobFolderBrowse";
import { JobSettingsForm } from "./JobsSettingRail";
import { DetailLogScopeTitle, logActor, useDetailLogScope } from "../log/DetailLogScope";
import { jobNoteDirty } from "../../lib/job-detail-dirty.mjs";
import { navScreenChrome } from "../../lib/nav-structure";

const JOB_SECTION = "p0009-job-detail";
const FOLDERS_SECTION = "p0009-job-folders";
const LOG_LABEL: Record<string, string> = {
  name: "Name",
  localPath: "Local",
  remote: "Remote",
  mode: "Mode",
  settleSec: HUB_DEBOUNCE_LABEL,
  proxyUrl: "Proxy",
  maxFileSize: "Max File Size",
  exclude: "Exclude",
  note: "Note",
};

type Props = {
  job: SyncJob | null;
  onClose: () => void;
  onSaved: (job: SyncJob) => void;
};

/** Job detail — Layout 3 (search · TOC · ADM · note/log). */
export function JobDetailModal({ job, onClose, onSaved }: Props) {
  const saveRef = useRef<(() => Promise<void>) | null>(null);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [notedJobId, setNotedJobId] = useState<string | null>(null);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [settingsJobId, setSettingsJobId] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<JobConflictFile[]>([]);
  const [resolvingRel, setResolvingRel] = useState<string | null>(null);
  const [reauthOpen, setReauthOpen] = useState(false);
  const { accounts: driveAccounts, reload: reloadDrives } = useDriveAccounts();
  const jobId = job?.id ?? null;

  const jobRemoteName = useMemo(() => remoteNameFromSpec(job?.remote || "", ""), [job?.remote]);
  const jobDriveAccount = useMemo(
    () => driveAccounts.find((a) => a.name === jobRemoteName) || null,
    [driveAccounts, jobRemoteName],
  );
  const hasOauthError = useMemo(() => {
    const stderr = String(job?.lastResult?.stderr || "");
    if (/(invalid_grant|token expired|failed to refresh token|couldn't fetch token|oauth2:\s*cannot fetch token|401 Unauthorized)/i.test(stderr)) {
      return true;
    }
    return Boolean(jobDriveAccount && !jobDriveAccount.authorized);
  }, [job?.lastResult?.stderr, jobDriveAccount]);

  useEffect(() => {
    if (!jobId) {
      setConflicts([]);
      return;
    }
    let cancelled = false;
    void fetchJobConflicts(jobId)
      .then((res) => {
        if (!cancelled) setConflicts(res.conflicts || []);
      })
      .catch(() => {
        if (!cancelled) setConflicts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [jobId, job?.lastRunAt]);

  const handleResolveConflict = useCallback(
    async (conflictRelPath: string, resolution: "keep-local" | "keep-conflict") => {
      if (!jobId) return;
      setResolvingRel(conflictRelPath);
      try {
        const res = await resolveJobConflict(jobId, conflictRelPath, resolution);
        setConflicts(res.conflicts || []);
      } finally {
        setResolvingRel(null);
      }
    },
    [jobId],
  );
  if (jobId !== notedJobId) {
    setNotedJobId(jobId);
    setNote(job?.note || "");
  }
  if (jobId !== settingsJobId) {
    setSettingsJobId(jobId);
    setSettingsDirty(false);
  }
  const onSettingsDirty = useCallback((dirty: boolean) => {
    setSettingsDirty(dirty);
  }, []);

  useEffect(() => {
    if (!jobId || !jobNoteDirty(job?.note, note)) return;
    const remote = job?.remote;
    const next = note;
    const timer = window.setTimeout(() => {
      void updateJob(jobId, { note: next }, { remote }).then(({ job: saved }) => onSavedRef.current(saved));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [job?.note, job?.remote, jobId, note]);

  const logSource = useMemo(() => {
    return (job?.activityLog || []).map((entry) => ({
      at: entry.at,
      message: entry.message,
      changes: entry.changes,
      actor: entry.actor ? logActor(entry.actor.source, entry.actor.label) : undefined,
    }));
  }, [job]);
  const logScope = useDetailLogScope(logSource);
  const jobChrome = navScreenChrome("jobs");

  return (
    <HubAccountDetailSearchProvider>
    <HubToolDetailModal
      open={Boolean(job)}
      onClose={onClose}
      title={job?.code ? `${job.code} · ${job.name}` : job?.name || "Job"}
      headerIcon={jobChrome.icon}
      headerIconClassName={jobChrome.iconClass}
      headerCenter={<HubAccountDetailHeaderSearch />}
      ariaLabel="Sync job detail"
      size="detail"
      shellClassName={hubAccountDetailShellClass()}
      scrollRootSelector={HUB_ACCOUNT_DETAIL_MAIN_SCROLL_ROOT}
      sectionIds={[JOB_SECTION, FOLDERS_SECTION]}
      busy={saving}
      toc={
        <HubToolDetailRail title="Navigate" titleEmoji="🧭" className="twofa-adm-rail--toc" scroll={false} ariaLabel="Sections">
          <HubTocSectionNav
            items={[
              { id: JOB_SECTION, label: "Job", emoji: HUB_ACCOUNT_DETAIL_JOB_EMOJI },
              { id: FOLDERS_SECTION, label: "Folders", emoji: "💻" },
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
            void (async () => {
              setSaving(true);
              try {
                await saveRef.current?.();
              } finally {
                setSaving(false);
              }
            })();
          }}
          saveIcon={Save}
          saveDisabled={!job || saving || !settingsDirty}
          busy={saving}
        />
      }
    >
      {job ? (
        <HubAccountDetailAdmScaffold
          panelId="p0009-job-detail-panel"
          panelTitle="Job"
          panelTitleEmoji="📁"
          rail={
            <HubAdmNoteLogRails
              noteRail={{
                mode: "editor",
                value: note,
                onChange: setNote,
                placeholder: "Note for this job",
              }}
              logEntries={logScope.shown}
              logId={job.code || job.id}
              logTitle={<DetailLogScopeTitle scope={logScope.scope} onChange={logScope.setScope} />}
              logFieldMeta={(field) => ({ label: LOG_LABEL[field] || field })}
              logEmptyMessage={logScope.scope === "work" ? "No work file changes." : "No changes yet."}
            />
          }
          main={
            <>
              <HubAdmRecordMetaRow
                vaultId={job.code || job.id}
                created={<HubActivityTimestampLabel at={job.createdAt} variant="detail" />}
                updated={<HubActivityTimestampLabel at={job.updatedAt} variant="detail" />}
              />
              <HubToolDetailSections className={HUB_TOOL_DETAIL_SECTIONS_CLASS}>
                <HubToolDetailSection id={JOB_SECTION} title="Job" emoji={HUB_ACCOUNT_DETAIL_JOB_EMOJI}>
                  {hasOauthError && jobRemoteName ? (
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-xs">
                      <div className="flex items-center gap-2 text-amber-100">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" aria-hidden />
                        <span>
                          Google Drive token for <strong>{jobDriveAccount?.code || jobRemoteName}</strong> expired or needs re-authentication.
                        </span>
                      </div>
                      <HubBulkActionButton
                        icon={<KeyRound size={13} aria-hidden />}
                        label={`Sign in ${jobDriveAccount?.code || jobRemoteName}`}
                        title={`Re-authenticate ${jobDriveAccount?.code || jobRemoteName} with Google Drive`}
                        tone="indigo"
                        onClick={() => setReauthOpen(true)}
                      />
                    </div>
                  ) : null}
                  <JobSettingsForm
                    job={job}
                    busy={saving}
                    onSaved={onSaved}
                    saveRef={saveRef}
                    onDirtyChange={onSettingsDirty}
                  />
                </HubToolDetailSection>
                <HubToolDetailSection id={FOLDERS_SECTION} title="Folders" emoji="💻">
                  {conflicts.length > 0 ? (
                    <div className="mb-3 rounded-lg border border-amber-400/30 bg-amber-500/10 p-2.5 text-xs">
                      <div className="mb-1.5 flex items-center gap-1.5 font-semibold text-amber-200">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden />
                        <span>
                          {conflicts.length} Conflict {conflicts.length === 1 ? "file" : "files"} detected
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {conflicts.map((c) => {
                          const isBusy = resolvingRel === c.conflictRelPath;
                          return (
                            <div
                              key={c.conflictRelPath}
                              className="flex flex-wrap items-center justify-between gap-2 rounded border border-white/10 bg-black/25 px-2.5 py-1.5"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="truncate font-mono text-xs text-amber-100" title={c.conflictRelPath}>
                                  {c.conflictRelPath}
                                </div>
                                <div className="truncate font-mono text-[10px] text-[var(--muted)]">
                                  Target: {c.originalRelPath}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <HubBulkActionButton
                                  icon={<Check className="h-3 w-3 shrink-0" aria-hidden />}
                                  label="Keep Local"
                                  title="Keep current local target file and delete the conflict copy"
                                  tone="emerald"
                                  variant="ghost"
                                  disabled={isBusy}
                                  onClick={() => void handleResolveConflict(c.conflictRelPath, "keep-local")}
                                />
                                <HubBulkActionButton
                                  icon={<Check className="h-3 w-3 shrink-0" aria-hidden />}
                                  label="Keep Drive Copy"
                                  title="Overwrite target file with the conflict copy"
                                  tone="sky"
                                  variant="ghost"
                                  disabled={isBusy}
                                  onClick={() => void handleResolveConflict(c.conflictRelPath, "keep-conflict")}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                  <JobFolderBrowse job={job} onSaved={onSaved} />
                </HubToolDetailSection>
              </HubToolDetailSections>
            </>
          }
        />
      ) : null}
      {jobRemoteName ? (
        <DriveSignInModal
          open={reauthOpen}
          remoteName={jobRemoteName}
          suggestedName={jobRemoteName}
          suggestedCode={jobDriveAccount?.code || "GG0001"}
          onClose={() => setReauthOpen(false)}
          onSignedIn={() => void reloadDrives()}
        />
      ) : null}
    </HubToolDetailModal>
    </HubAccountDetailSearchProvider>
  );
}
