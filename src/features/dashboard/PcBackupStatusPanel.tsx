import { useState } from "react";
import {
  ArchiveRestore,
  CheckCircle2,
  Cloud,
  HardDrive,
  Play,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Zap,
} from "lucide-react";
import {
  DashboardLivePulseBadge,
  HubChromeActivityAge,
  HubPanel,
} from "@tool-workspace/hub-ui";
import { formatDiskBytesLabel, type PcBackupStatusPayload } from "../../lib/api";

type Props = {
  status: PcBackupStatusPayload | null;
  triggeringMode: "full" | "critical" | null;
  verifyingDrill?: boolean;
  onRunBackup: (mode: "full" | "critical") => void;
  onRunDrill?: () => void;
  onOpenRestore?: () => void;
  onRunSystemImage?: () => void;
  onRefresh: () => void;
  onOpenCron: () => void;
};

function badgeStyle(health: string) {
  if (health === "running") {
    return {
      cls: "border-cyan-400/35 bg-cyan-500/15 text-cyan-200",
      barCls: "bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400",
      label: "Backing Up",
    };
  }
  if (health === "protected") {
    return {
      cls: "border-emerald-400/35 bg-emerald-500/15 text-emerald-200",
      barCls: "bg-emerald-400",
      label: "Protected",
    };
  }
  if (health === "partial" || health === "overdue") {
    return {
      cls: "border-amber-400/35 bg-amber-500/15 text-amber-200",
      barCls: "bg-amber-400",
      label: health === "overdue" ? "Overdue" : "Partial",
    };
  }
  return {
    cls: "border-rose-400/35 bg-rose-500/15 text-rose-200",
    barCls: "bg-rose-400",
    label: health === "warning" ? "Warning" : "Not Backed Up",
  };
}

function stepDotClass(status: string) {
  if (status === "ok") return "bg-emerald-400";
  if (status === "running") return "animate-pulse bg-cyan-400";
  if (status === "warn") return "bg-amber-400";
  if (status === "error") return "bg-rose-400";
  return "bg-white/25";
}

export function PcBackupStatusPanel({
  status,
  triggeringMode,
  verifyingDrill = false,
  onRunBackup,
  onRunDrill,
  onOpenRestore,
  onRunSystemImage,
  onRefresh,
  onOpenCron,
}: Props) {
  const [showLog, setShowLog] = useState(false);

  const health = status?.health || "unconfigured";
  const isRunning = status?.status === "running";
  const pct = Math.max(0, Math.min(100, Math.round(status?.percent ?? 0)));
  const tone = badgeStyle(health);

  const localSizeLabel =
    status && (status.localBytes > 0 || status.archiveBytes > 0)
      ? formatDiskBytesLabel(status.localBytes || status.archiveBytes) || "0 MB"
      : "—";
  const archiveSizeLabel =
    status && status.archiveBytes > 0 ? formatDiskBytesLabel(status.archiveBytes) || "0 MB" : "—";
  const durationLabel =
    status?.durationMs != null ? `${(status.durationMs / 1000).toFixed(1)}s` : null;

  const transferParts = [
    status?.transferred && status?.total ? `${status.transferred} / ${status.total}` : status?.transferred,
    status?.speed,
    status?.eta ? `ETA ${status.eta}` : null,
    status?.filesDone != null && status?.filesTotal != null
      ? `${status.filesDone}/${status.filesTotal} files`
      : null,
  ].filter(Boolean);

  return (
    <HubPanel className="flex flex-col gap-3 p-3.5" data-testid="pc-backup-status-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {health === "protected" || health === "running" ? (
            <ShieldCheck
              className={`h-4 w-4 ${isRunning ? "text-cyan-400" : "text-emerald-400"}`}
              aria-hidden
            />
          ) : (
            <ShieldAlert className="h-4 w-4 text-amber-400" aria-hidden />
          )}
          <span className="text-xs font-semibold tracking-tight text-[var(--text)]">
            Workstation PC Backup (Home Server Parity)
          </span>
          <DashboardLivePulseBadge />
          <span
            data-testid="pc-backup-health-badge"
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone.cls}`}
          >
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${isRunning ? "animate-ping bg-cyan-300" : tone.barCls}`} />
            {isRunning ? `${tone.label} · ${pct}%` : tone.label}
          </span>
          {status?.schtask ? (
            <button
              type="button"
              onClick={onOpenCron}
              className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-[var(--muted)] hover:border-cyan-400/30 hover:text-cyan-200"
              title="Open scheduled task in Cron"
            >
              📅 {status.schtask.schedule || "Daily 03:30"}
            </button>
          ) : null}
          {status?.vssActive && status.vssDrives && status.vssDrives.length > 0 ? (
            <span
              data-testid="pc-backup-vss-badge"
              className="inline-flex items-center gap-1 rounded border border-cyan-400/30 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-medium text-cyan-200"
              title={`Windows Volume Shadow Copy (Win32_ShadowCopy) crash-consistent snapshot across ${status.vssDrives.join(", ")}`}
            >
              🛡️ VSS {status.vssDrives.join(", ")} Lock-Free
            </span>
          ) : null}
          {status?.healthDrill ? (
            <span
              data-testid="pc-backup-drill-badge"
              className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium ${
                status.healthDrill.drillOk && status.healthDrill.cloudLatestArchivePresent
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                  : "border-amber-400/30 bg-amber-500/10 text-amber-200"
              }`}
              title={`Checked at ${status.healthDrill.checkedAt}${status.healthDrill.cloudMirrorDirs?.length ? ` · Cloud Mirror: ${status.healthDrill.cloudMirrorDirs.join(", ")}` : ""}`}
            >
              {status.healthDrill.drillOk && status.healthDrill.cloudLatestArchivePresent
                ? `🧪 Restore Drill OK (${status.healthDrill.drillEntries.toLocaleString()} entries · Cloud OK${status.healthDrill.stealthDrillOk ? ` · Stealth Drill OK` : ""}${status.healthDrill.pixelTgxDrillOk ? ` · Pixel 6a TGX OK (${status.healthDrill.pixelTgxAccountCount || status.pixelTgxAccountCount || 8} accs)` : ""})`
                : status.healthDrill.alerts?.[0] || "Restore Drill Warning"}
            </span>
          ) : null}
          {status?.systemImage ? (
            <button
              type="button"
              onClick={() => (status.systemImage?.ready ? onRunSystemImage?.() : undefined)}
              data-testid="pc-backup-sysimage-badge"
              className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${
                status.systemImage.ready
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
                  : "border-white/10 bg-white/[0.04] text-[var(--muted)]"
              }`}
              title={status.systemImage.summary}
            >
              💿 {status.systemImage.ready ? "C: Hasleo Ready (Run)" : "C: Image — Attach USB SSD"}
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {onOpenRestore ? (
            <button
              type="button"
              onClick={onOpenRestore}
              data-testid="pc-backup-restore-btn"
              className="inline-flex items-center gap-1 rounded-md border border-violet-400/25 bg-violet-500/10 px-2 py-1 text-xs font-medium text-violet-200 transition-colors hover:bg-violet-500/20"
              title="Browse snapshots and restore data/configs from Local, Google Drive, or Home Server"
            >
              <ArchiveRestore className="h-3 w-3" aria-hidden />
              Restore
            </button>
          ) : null}
          {onRunDrill ? (
            <button
              type="button"
              disabled={verifyingDrill}
              onClick={onRunDrill}
              data-testid="pc-backup-drill-btn"
              className="inline-flex items-center gap-1 rounded-md border border-sky-400/25 bg-sky-500/10 px-2 py-1 text-xs font-medium text-sky-200 transition-colors hover:bg-sky-500/20 disabled:opacity-50"
              title="Verify Google Drive Cloud files & run tar -tzf archive integrity restore drill"
            >
              <CheckCircle2 className="h-3 w-3" aria-hidden />
              {verifyingDrill ? "Verifying…" : "Verify Cloud"}
            </button>
          ) : null}
          <button
            type="button"
            disabled={isRunning || triggeringMode !== null}
            onClick={() => onRunBackup("critical")}
            data-testid="pc-backup-quick-btn"
            className="inline-flex items-center gap-1 rounded-md border border-cyan-400/25 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-200 transition-colors hover:bg-cyan-500/20 disabled:opacity-50"
            title="Fast snapshot of Vault, Configs, Uncommitted Code & System State -> Local + GDrive + Home Server"
          >
            <Zap className="h-3 w-3" aria-hidden />
            {triggeringMode === "critical" ? "Starting…" : "Quick Critical"}
          </button>
          <button
            type="button"
            disabled={isRunning || triggeringMode !== null}
            onClick={() => onRunBackup("full")}
            data-testid="pc-backup-full-btn"
            className="inline-flex items-center gap-1 rounded-md border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/25 disabled:opacity-50"
            title="Full backup: Critical Vault + Local Mirror (D:\Backups-PC) + Google Drive + Home Server"
          >
            <Play className="h-3 w-3" aria-hidden />
            {isRunning ? `Running ${pct}%` : triggeringMode === "full" ? "Starting…" : "Full Backup"}
          </button>
          <button
            type="button"
            onClick={() => setShowLog((v) => !v)}
            className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-[var(--muted)] hover:bg-white/[0.08] hover:text-[var(--text)]"
            title="Toggle backup log tail"
          >
            <Terminal className="h-3 w-3" aria-hidden />
            Logs
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center rounded-md border border-white/10 bg-white/[0.04] p-1 text-[var(--muted)] hover:bg-white/[0.08] hover:text-[var(--text)]"
            title="Refresh backup status"
            aria-label="Refresh backup status"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRunning ? "animate-spin text-cyan-300" : ""}`} aria-hidden />
          </button>
        </div>
      </div>

      {/* Live Progress Bar */}
      <div className="flex flex-col gap-1.5 rounded-lg border border-white/[0.07] bg-black/20 p-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-medium text-[var(--text)]" data-testid="pc-backup-phase-label">
            {status?.phaseLabel || "Checking workstation backup state…"}
          </span>
          <div className="flex items-center gap-2 font-mono text-[11px] text-[var(--muted)]">
            {transferParts.length > 0 ? (
              <span className="text-cyan-300" data-testid="pc-backup-transfer-stats">
                {transferParts.join(" · ")}
              </span>
            ) : null}
            {status?.lastSuccessAt ? (
              <span className="inline-flex items-center gap-1">
                Last OK:
                <HubChromeActivityAge at={status.lastSuccessAt} relativeOnly className="text-[11px]" />
              </span>
            ) : null}
            {durationLabel ? <span>({durationLabel})</span> : null}
            <span className="font-semibold text-[var(--text)]" data-testid="pc-backup-percent">
              {pct}%
            </span>
          </div>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-white/[0.08]"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Workstation backup progress"
        >
          <div
            className={`h-full rounded-full transition-all duration-300 ${tone.barCls}`}
            style={{ width: `${Math.max(isRunning ? 4 : 0, pct)}%` }}
          />
        </div>

        {/* 4 Pipeline Steps */}
        {status?.steps && status.steps.length > 0 ? (
          <div className="mt-1 grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
            {status.steps.map((step) => (
              <div
                key={step.id}
                className="flex items-center justify-between gap-2 rounded border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-[11px]"
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${stepDotClass(step.status)}`} />
                  <span className="truncate font-medium text-[var(--text)]">{step.label}</span>
                </div>
                {step.detail ? (
                  <span className="shrink-0 truncate font-mono text-[10px] text-[var(--muted)]" title={step.detail}>
                    {step.detail}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* 3 Target Health Cards */}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <div className="flex items-center justify-between gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 text-xs">
          <div className="flex min-w-0 items-center gap-2">
            <HardDrive className="h-4 w-4 shrink-0 text-amber-300" aria-hidden />
            <div className="min-w-0">
              <div className="truncate font-medium text-[var(--text)]">Local Mirror (D:\Backups-PC)</div>
              <div className="truncate text-[11px] text-[var(--muted)]">
                {status?.localArchiveCount ?? 0} snapshots · Bundle {archiveSizeLabel}
                {status?.stealthCoreProfileCount
                  ? ` · Stealth ${status.stealthCoreProfileCount} profs`
                  : ""}
                {status?.pixelTgxAccountCount
                  ? ` · Pixel 6a TGX ${status.pixelTgxAccountCount} accs`
                  : ""}
              </div>
            </div>
          </div>
          <span className="shrink-0 font-mono text-xs font-semibold text-emerald-300">{localSizeLabel}</span>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 text-xs">
          <div className="flex min-w-0 items-center gap-2">
            <Cloud className="h-4 w-4 shrink-0 text-sky-400" aria-hidden />
            <div className="min-w-0">
              <div className="truncate font-medium text-[var(--text)]">Google Drive Offsite</div>
              <div className="truncate text-[11px] text-[var(--muted)]">
                {status?.offsiteGdriveTarget || "gdrive:workstation-pc-backups"}
              </div>
            </div>
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1 text-xs font-semibold ${
              status?.offsiteGdriveOk ? "text-emerald-300" : "text-amber-300"
            }`}
          >
            {status?.offsiteGdriveOk ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : null}
            {status?.offsiteGdriveOk ? `${status.offsiteGdriveRetained} kept` : "Pending"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 text-xs">
          <div className="flex min-w-0 items-center gap-2">
            <Server className="h-4 w-4 shrink-0 text-violet-400" aria-hidden />
            <div className="min-w-0">
              <div className="truncate font-medium text-[var(--text)]">Home Server Mirror</div>
              <div className="truncate text-[11px] text-[var(--muted)]">
                {status?.offsiteLenovoTarget || "100.88.80.113"} · {status?.dirtyGitCount ?? 0} dirty repos captured
              </div>
            </div>
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1 text-xs font-semibold ${
              status?.offsiteLenovoOk ? "text-emerald-300" : "text-amber-300"
            }`}
          >
            {status?.offsiteLenovoOk ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : null}
            {status?.offsiteLenovoOk ? `${status.offsiteLenovoRetained} kept` : "Pending"}
          </span>
        </div>
      </div>

      {/* Live Log Tail */}
      {(showLog || isRunning) && status?.logTail && status.logTail.length > 0 ? (
        <div
          data-testid="pc-backup-log-tail"
          className="max-h-36 overflow-y-auto rounded-md border border-white/[0.08] bg-black/45 p-2 font-mono text-[11px] leading-relaxed text-slate-300"
        >
          {status.logTail.slice(-12).map((line, i) => (
            <div key={i} className="truncate">
              {line}
            </div>
          ))}
        </div>
      ) : null}
    </HubPanel>
  );
}
