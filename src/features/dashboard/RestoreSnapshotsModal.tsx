import { useEffect, useMemo, useState } from "react";
import { ArchiveRestore, Cloud, HardDrive, Server } from "lucide-react";
import {
  HubAdmClickEditField,
  HubAdmClickFilterField,
  HubDetailFieldsGroup,
  HubTocSectionNav,
  HubToolDetailModal,
  HubToolDetailModalAccountFooter,
  HubToolDetailRail,
  HubToolDetailSection,
  hubAccountDetailShellClass,
  useHubToast,
} from "@tool-workspace/hub-ui";
import {
  deskApi,
  formatDiskBytesLabel,
  type PcBackupSnapshotEntry,
  type PcBackupSnapshotsResponse,
} from "../../lib/api";

const SNAPSHOT_SECTION = "pc-backup-restore-section";

type RestoreSourceKey = "gdrive" | "local" | "lenovo";
type RestoreModeKey = "staging" | "live";

type Props = {
  open: boolean;
  onClose: () => void;
};

function SourceBadgeIcon({ source }: { source: string }) {
  if (source === "gdrive") return <Cloud className="h-3.5 w-3.5 text-sky-400" aria-hidden />;
  if (source === "lenovo") return <Server className="h-3.5 w-3.5 text-violet-400" aria-hidden />;
  return <HardDrive className="h-3.5 w-3.5 text-amber-300" aria-hidden />;
}

export function RestoreSnapshotsModal({ open, onClose }: Props) {
  const toast = useHubToast();
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [snapshots, setSnapshots] = useState<PcBackupSnapshotsResponse | null>(null);
  const [source, setSource] = useState<RestoreSourceKey>("gdrive");
  const [selectedName, setSelectedName] = useState("");
  const [restoreMode, setRestoreMode] = useState<RestoreModeKey>("staging");
  const [includeStealth, setIncludeStealth] = useState<"yes" | "no">("yes");
  const [targetDir, setTargetDir] = useState("D:\\Restore-Staging\\latest");
  const [lastResult, setLastResult] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setLastResult("");
    void deskApi
      .pcBackupSnapshots("all")
      .then((res) => {
        setSnapshots(res);
        const firstGdrive = res.critical?.gdrive?.[0]?.name || res.critical?.local?.[0]?.name || "";
        if (!selectedName && firstGdrive) setSelectedName(firstGdrive);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [open, selectedName]);

  const activeCriticalList = useMemo<PcBackupSnapshotEntry[]>(() => {
    return snapshots?.critical?.[source] || [];
  }, [snapshots, source]);

  const activeStealthList = useMemo<PcBackupSnapshotEntry[]>(() => {
    return snapshots?.stealthCore?.[source] || [];
  }, [snapshots, source]);

  useEffect(() => {
    if (activeCriticalList.length > 0 && !activeCriticalList.some((x) => x.name === selectedName)) {
      setSelectedName(activeCriticalList[0]!.name);
    }
  }, [activeCriticalList, selectedName]);

  const cliCommand = useMemo(() => {
    const parts = [
      "node Tool/scripts/restore-workstation-pc.mjs --apply",
      `--source ${source}`,
      selectedName ? `--snapshot ${selectedName}` : "",
      targetDir ? `--target "${targetDir}"` : "",
      includeStealth === "yes" ? "--stealth-core" : "",
      restoreMode === "live" ? "--restore-live" : "",
    ].filter(Boolean);
    return parts.join(" ");
  }, [includeStealth, restoreMode, selectedName, source, targetDir]);

  const handleRestore = async () => {
    setRestoring(true);
    setLastResult("");
    try {
      const res = await deskApi.runPcBackupRestore({
        source,
        snapshot: selectedName || undefined,
        target: targetDir.trim() || undefined,
        stealthCore: includeStealth === "yes",
        restoreLive: restoreMode === "live",
      });
      if (!res.ok) {
        throw new Error(res.error || "Restore failed");
      }
      const summary = `Restored ${res.criticalSnapshot} -> ${res.extractedCriticalDir}${
        res.restoredLive?.length ? ` (${res.restoredLive.length} live targets)` : ""
      }`;
      setLastResult(summary);
      toast?.pushRichToast({
        type: "success",
        title: "Restore Completed",
        message: summary,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Restore failed";
      setLastResult(`Error: ${msg}`);
      toast?.pushRichToast({
        type: "error",
        title: "Restore Failed",
        message: msg,
      });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <HubToolDetailModal
      open={open}
      onClose={onClose}
      title="Restore Workstation Snapshots"
      headerIcon={ArchiveRestore}
      headerIconClassName="text-violet-300"
      ariaLabel="Restore Workstation Snapshots"
      size="detail"
      shellClassName={hubAccountDetailShellClass()}
      busy={restoring}
      sectionIds={[SNAPSHOT_SECTION]}
      toc={
        <HubToolDetailRail
          title="Navigate"
          titleEmoji="🧭"
          className="twofa-adm-rail--toc"
          scroll={false}
          ariaLabel="Sections"
        >
          <HubTocSectionNav
            items={[{ id: SNAPSHOT_SECTION, label: "Snapshot Recovery", emoji: "🛟" }]}
            admNav
          />
        </HubToolDetailRail>
      }
      footer={
        <HubToolDetailModalAccountFooter
          onClose={onClose}
          closeDisabled={restoring}
          onSave={() => void handleRestore()}
          saveLabel={restoring ? "Restoring…" : "Restore Snapshot"}
          saveVariant="default"
          saveDisabled={restoring || loading || activeCriticalList.length === 0}
          busy={restoring}
        />
      }
    >
      <HubToolDetailSection
        id={SNAPSHOT_SECTION}
        title="Snapshot Source & Recovery Target"
        icon={<ArchiveRestore size={14} aria-hidden />}
      >
        <HubDetailFieldsGroup>
          <div className="hub-adm-form-row hub-adm-form-row--aligned-2">
            <HubAdmClickFilterField
              header={{ label: "Snapshot Source", headerEmoji: "☁️" }}
              fieldLabel="Snapshot Source"
              filterKey="p0001-restore-source"
              options={[
                { value: "gdrive", label: "Google Drive Offsite", emoji: "☁️" },
                { value: "local", label: "Local Vault (D:\\Backups-PC)", emoji: "💾" },
                { value: "lenovo", label: "Home Server (100.88.80.113)", emoji: "🖥️" },
              ]}
              value={source}
              onChange={(v) => setSource(v as RestoreSourceKey)}
            />
            <HubAdmClickFilterField
              header={{ label: "Recovery Mode", headerEmoji: "🛡️" }}
              fieldLabel="Recovery Mode"
              filterKey="p0001-restore-mode"
              options={[
                { value: "staging", label: "Safe Staging Extract Only", emoji: "📁" },
                { value: "live", label: "Restore Live Configs + .env + Vault", emoji: "⚡" },
              ]}
              value={restoreMode}
              onChange={(v) => setRestoreMode(v as RestoreModeKey)}
            />
          </div>

          <div className="hub-adm-form-row hub-adm-form-row--aligned-2">
            <HubAdmClickFilterField
              header={{ label: "Include All Stealth Profiles", headerEmoji: "🕵️" }}
              fieldLabel="Include Stealth Profiles"
              filterKey="p0001-restore-stealth"
              options={[
                { value: "yes", label: "Yes — Restore Latest P0003 Profiles Bundle", emoji: "✅" },
                { value: "no", label: "No — Critical Configs & Repo Diffs Only", emoji: "➖" },
              ]}
              value={includeStealth}
              onChange={(v) => setIncludeStealth(v as "yes" | "no")}
            />
            <HubAdmClickEditField
              header={{ label: "Staging Extract Folder", headerEmoji: "📂" }}
              fieldLabel="Staging Folder"
              value={targetDir}
              onChange={setTargetDir}
            />
          </div>
        </HubDetailFieldsGroup>

        <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text)]">
            <span>Critical Bundles ({activeCriticalList.length})</span>
            {activeStealthList[0] ? (
              <span className="text-[11px] font-normal text-cyan-300">
                Stealth Bundle: {activeStealthList[0].name} (
                {formatDiskBytesLabel(activeStealthList[0].bytes) || "0 MB"})
              </span>
            ) : null}
          </div>

          {loading ? (
            <p className="rounded border border-white/10 bg-black/25 p-3 text-xs text-[var(--muted)]">
              Loading snapshots from Local, Google Drive & Home Server…
            </p>
          ) : activeCriticalList.length === 0 ? (
            <p className="rounded border border-white/10 bg-black/25 p-3 text-xs text-[var(--muted)]">
              No critical snapshots found on {source}.
            </p>
          ) : (
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-white/10 bg-black/25 p-1.5">
              {activeCriticalList.map((row) => {
                const active = selectedName === row.name;
                return (
                  <button
                    key={`${row.source}:${row.name}`}
                    type="button"
                    onClick={() => setSelectedName(row.name)}
                    className={`flex w-full items-center justify-between gap-2 rounded px-2.5 py-1.5 text-left text-xs transition-colors ${
                      active
                        ? "border border-cyan-400/40 bg-cyan-500/15 text-cyan-100"
                        : "border border-transparent hover:bg-white/[0.05] text-[var(--text)]"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <SourceBadgeIcon source={row.source} />
                      <span className="truncate font-mono font-medium">{row.name}</span>
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-[var(--muted)]">
                      {formatDiskBytesLabel(row.bytes) || "0 MB"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="rounded border border-white/10 bg-black/40 p-2 font-mono text-[11px] text-slate-300">
            <div className="mb-1 text-[10px] uppercase tracking-wider text-[var(--muted)]">
              1-Command CLI Recovery Equivalent
            </div>
            <div className="select-all break-all text-cyan-200">{cliCommand}</div>
          </div>

          {lastResult ? (
            <div className="rounded border border-emerald-400/30 bg-emerald-500/10 p-2 text-xs text-emerald-200">
              {lastResult}
            </div>
          ) : null}
        </div>
      </HubToolDetailSection>
    </HubToolDetailModal>
  );
}
