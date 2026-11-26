import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  Cpu,
  ExternalLink,
  HardDrive,
  Monitor,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Thermometer,
} from "lucide-react";
import {
  DashboardLivePulseBadge,
  HubChromeActivityAge,
  HubPanel,
} from "@tool-workspace/hub-ui";
import type { HardwareHistoryPoint, HardwareSensorsPayload } from "../../lib/api";

type Props = {
  sensors: HardwareSensorsPayload | null;
  history?: HardwareHistoryPoint[];
  cpuPercent?: number | null;
  logicalCpus?: number;
  refreshing?: boolean;
  onRefresh: () => void;
  onLaunchTool: (tool: "lhm" | "occt" | "crystaldiskinfo") => void;
};

function healthBadgeStyle(health: string) {
  if (health === "healthy") {
    return {
      cls: "border-emerald-400/35 bg-emerald-500/15 text-emerald-200",
      dotCls: "bg-emerald-400",
      label: "Healthy",
    };
  }
  if (health === "warn") {
    return {
      cls: "border-amber-400/35 bg-amber-500/15 text-amber-200",
      dotCls: "bg-amber-400",
      label: "Hardware Warning",
    };
  }
  return {
    cls: "border-rose-400/35 bg-rose-500/15 text-rose-200",
    dotCls: "bg-rose-400",
    label: "Stability Alert",
  };
}

function tempToneClass(tempC: number | null | undefined, warnAt = 75, critAt = 85): string {
  if (tempC == null) return "text-[var(--muted)]";
  if (tempC >= critAt) return "text-rose-300";
  if (tempC >= warnAt) return "text-amber-300";
  return "text-emerald-300";
}

export function HardwareHealthPanel({
  sensors,
  history = [],
  cpuPercent,
  logicalCpus = 72,
  refreshing = false,
  onRefresh,
  onLaunchTool,
}: Props) {
  const [showEvents, setShowEvents] = useState(false);

  const health = sensors?.health || "healthy";
  const tone = healthBadgeStyle(health);
  const gpu = sensors?.gpu || null;
  const tuning = sensors?.tuning || null;
  const primaryDisk = sensors?.storage?.[0] || null;
  const stability = sensors?.stability;
  const alerts = sensors?.alerts || [];

  const totalAlerts7d =
    (stability?.unexpectedShutdowns7d || 0) +
    (stability?.wheaErrors7d || 0) +
    (stability?.displayTdrs7d || 0);

  return (
    <HubPanel className="p-3.5">
      <div className="flex flex-col gap-3" data-testid="hardware-health-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {health === "healthy" ? (
            <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden />
          ) : (
            <ShieldAlert
              className={`h-4 w-4 ${health === "critical" ? "text-rose-400" : "text-amber-400"}`}
              aria-hidden
            />
          )}
          <span className="text-xs font-semibold tracking-tight text-[var(--text)]">
            Hardware Temperatures & PCIe Stability
          </span>
          <DashboardLivePulseBadge />
          <span
            data-testid="hardware-health-badge"
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone.cls}`}
          >
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${tone.dotCls}`} />
            {tone.label}
          </span>
          <span
            className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${
              sensors?.lhmReachable
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                : "border-white/10 bg-white/[0.04] text-[var(--muted)]"
            }`}
            title="Zero-spawn native in-process NVML + WEVTAPI + SMART telemetry (optional LHM :8085 for CPU MSR)"
          >
            {sensors?.lhmReachable ? "LHM Live (:8085)" : "In-Process NVML"}
          </span>
          {tuning?.powerPlanName ? (
            <span
              data-testid="hardware-power-plan-pill"
              className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted)]"
              title="Active Windows Power Plan and Processor State (AC)"
            >
              {tuning.powerPlanName}
              {tuning.cpuMinPct != null ? ` · Min ${tuning.cpuMinPct}%` : ""}
              {tuning.cpuMaxPct != null ? ` · Max ${tuning.cpuMaxPct}%` : ""}
              {tuning.nicEeeEnabled === false ? " · EEE Off" : tuning.nicEeeEnabled === true ? " · EEE On" : ""}
            </span>
          ) : null}
          {sensors?.sensorLogger ? (
            <span
              data-testid="hardware-sensor-logger-pill"
              className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${
                sensors.sensorLogger.running
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                  : "border-amber-400/30 bg-amber-500/10 text-amber-200"
              }`}
              title="2s continuous CSV telemetry logger (Tool/.ship/logs/pc-sensors.csv)"
            >
              {sensors.sensorLogger.running
                ? `2s CSV Live (${sensors.sensorLogger.csvRows})`
                : "2s CSV Stopped"}
              {sensors.sensorLogger.v12 != null ? ` · +12V=${sensors.sensorLogger.v12}V` : ""}
            </span>
          ) : null}
          {(() => {
            const v33Now = sensors?.sensorLogger?.v33 ?? sensors?.motherboard?.voltage33V ?? null;
            const avccNow = sensors?.motherboard?.voltageAvccV ?? null;
            const histV33 = history
              .map((h) => h.v33)
              .filter((v): v is number => v != null && Number.isFinite(v) && v > 0)
              .slice(-40);
            const histMin = histV33.length > 0 ? Math.min(...histV33) : null;
            const histMax = histV33.length > 0 ? Math.max(...histV33) : null;
            const v33Min = sensors?.sensorLogger?.v33MinRecent ?? histMin;
            if (v33Now == null && v33Min == null && avccNow == null) return null;
            const isV33Low = (v33Now != null && v33Now < 3.135) || (v33Min != null && v33Min < 3.135);
            const isAvccLow = avccNow != null && avccNow < 3.135;
            const isLow = isV33Low || isAvccLow;
            let sparkPts = "";
            if (histV33.length >= 2) {
              const lo = Math.min(3.08, ...(histMin != null ? [histMin] : []));
              const hi = Math.max(3.32, ...(histMax != null ? [histMax] : []));
              const span = Math.max(0.05, hi - lo);
              sparkPts = histV33
                .map((v, i) => {
                  const x = Math.round((i / (histV33.length - 1)) * 42);
                  const y = Math.round(12 - ((v - lo) / span) * 10);
                  return `${x},${y}`;
                })
                .join(" ");
            }
            return (
              <span
                data-testid="hardware-v33-pill"
                className={`inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 text-[10px] font-medium ${
                  isLow
                    ? "border-rose-500/40 bg-rose-500/15 text-rose-200"
                    : "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
                }`}
                title={`+3.3V ATX rail (min 3.135V${v33Min != null ? ` · min ${v33Min}V` : ""}${histMax != null ? ` · max ${histMax}V` : ""}${avccNow != null ? ` · AVCC ${avccNow}V` : ""})`}
              >
                {sparkPts ? (
                  <svg width="42" height="14" viewBox="0 0 42 14" className="shrink-0" aria-hidden>
                    <polyline
                      fill="none"
                      stroke={isLow ? "#fda4af" : "#6ee7b7"}
                      strokeWidth="1.25"
                      points={sparkPts}
                    />
                  </svg>
                ) : null}
                <span>
                  {isV33Low
                    ? `+3.3V LOW (${v33Min != null && v33Min < 3.135 ? `min ${v33Min}V` : `${v33Now}V`})`
                    : `+3.3V ${v33Now ?? v33Min}V`}
                  {avccNow != null ? ` · AVCC ${avccNow}V${isAvccLow ? "!" : ""}` : ""}
                </span>
              </span>
            );
          })()}
          {sensors?.sampledAt ? (
            <HubChromeActivityAge at={sensors.sampledAt} relativeOnly className="text-[10px]" />
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {sensors?.tools.lhm ? (
            <button
              type="button"
              onClick={() => onLaunchTool("lhm")}
              data-testid="hardware-launch-lhm-btn"
              className="inline-flex items-center gap-1 rounded-md border border-cyan-400/25 bg-cyan-500/10 px-2 py-1 text-xs font-medium text-cyan-200 transition-colors hover:bg-cyan-500/20"
              title="Launch LibreHardwareMonitor (Run as Admin for live CPU/VRM/NVMe sensors on :8085)"
            >
              <Thermometer className="h-3 w-3" aria-hidden />
              {sensors.lhmReachable ? "LHM Active" : "Open LHM"}
            </button>
          ) : null}
          {sensors?.tools.occt ? (
            <button
              type="button"
              onClick={() => onLaunchTool("occt")}
              data-testid="hardware-launch-occt-btn"
              className="inline-flex items-center gap-1 rounded-md border border-amber-400/25 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-500/20"
              title="Launch OCCT Personal for isolated CPU / GPU / Power stress testing"
            >
              <ExternalLink className="h-3 w-3" aria-hidden />
              Open OCCT
            </button>
          ) : null}
          {totalAlerts7d > 0 ? (
            <button
              type="button"
              onClick={() => setShowEvents((v) => !v)}
              className="inline-flex items-center gap-1 rounded-md border border-rose-400/25 bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-200 hover:bg-rose-500/20"
            >
              <AlertTriangle className="h-3 w-3" aria-hidden />
              Events ({totalAlerts7d})
            </button>
          ) : null}
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center rounded-md border border-white/10 bg-white/[0.04] p-1 text-[var(--muted)] hover:bg-white/[0.08] hover:text-[var(--text)] disabled:opacity-50"
            title="Refresh hardware sensors"
            aria-label="Refresh hardware sensors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-cyan-300" : ""}`} aria-hidden />
          </button>
        </div>
      </div>

      {alerts.length > 0 ? (
        <div className="flex flex-wrap gap-1.5" data-testid="hardware-alerts-strip">
          {alerts.map((a) => (
            <span
              key={a.code}
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium ${
                a.severity === "critical"
                  ? "border-rose-500/35 bg-rose-500/10 text-rose-200"
                  : "border-amber-500/35 bg-amber-500/10 text-amber-200"
              }`}
            >
              <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
              {a.message}
            </span>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
        {/* CPU Card */}
        <div className="flex items-center justify-between gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 text-xs">
          <div className="flex min-w-0 items-center gap-2">
            <Cpu className="h-4 w-4 shrink-0 text-cyan-400" aria-hidden />
            <div className="min-w-0">
              <div className="truncate font-medium text-[var(--text)]">
                CPU ({sensors?.cpu.sockets.length || 2} Sockets · {logicalCpus}T)
              </div>
              <div className="truncate text-[11px] text-[var(--muted)]">
                {sensors?.lhmReachable && sensors.cpu.packageTempC !== null
                  ? `${sensors.cpu.totalPackagePowerW ?? "—"} W · Load ${cpuPercent != null ? `${Math.round(cpuPercent)}%` : "—"}`
                  : `Load ${cpuPercent != null ? `${Math.round(cpuPercent)}%` : "—"}${sensors?.sensorLogger?.topProc ? ` · Top ${sensors.sensorLogger.topProc}` : " · Open LHM for MSR temp"}`}
              </div>
            </div>
          </div>
          <span className={`shrink-0 font-mono text-xs font-semibold ${tempToneClass(sensors?.cpu.packageTempC, 75, 85)}`}>
            {sensors?.cpu.packageTempC != null ? `${Math.round(sensors.cpu.packageTempC)} °C` : "—"}
          </span>
        </div>

        {/* GPU Card */}
        <div className="flex items-center justify-between gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 text-xs">
          <div className="flex min-w-0 items-center gap-2">
            <Monitor className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
            <div className="min-w-0">
              <div className="truncate font-medium text-[var(--text)]">
                {gpu ? gpu.name.replace(/^NVIDIA GeForce\s+/i, "") : "GPU"}
              </div>
              <div className="truncate text-[11px] text-[var(--muted)]">
                {gpu ? (
                  <>
                    {gpu.pstate ? `${gpu.pstate} · ` : ""}
                    {gpu.graphicsClockMHz ? `${gpu.graphicsClockMHz}MHz · ` : ""}
                    {gpu.powerDrawW ?? "—"}W · Fan {gpu.fanPercent ?? "—"}% ·{" "}
                    <span className={gpu.pcieDowngraded ? "font-semibold text-amber-300" : "text-emerald-300"}>
                      G{gpu.pcieGen ?? "?"} x{gpu.pcieLinkWidth ?? "?"}/{gpu.pcieLinkWidthMax ?? "?"}
                    </span>
                    {tuning?.gpuPowerMizerMode ? ` · ${tuning.gpuPowerMizerMode}` : ""}
                  </>
                ) : (
                  "nvidia-smi unavailable"
                )}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end">
            <span className={`font-mono text-xs font-semibold ${tempToneClass(gpu?.tempC, 78, 86)}`}>
              {gpu?.tempC != null ? `${gpu.tempC} °C` : "—"}
            </span>
            {gpu?.hotSpotC != null ? (
              <span className="font-mono text-[10px] text-[var(--muted)]">HS {Math.round(gpu.hotSpotC)}°</span>
            ) : null}
          </div>
        </div>

        {/* Storage Card */}
        <div className="flex items-center justify-between gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 text-xs">
          <div className="flex min-w-0 items-center gap-2">
            <HardDrive className="h-4 w-4 shrink-0 text-amber-300" aria-hidden />
            <div className="min-w-0">
              <div className="truncate font-medium text-[var(--text)]">
                {primaryDisk ? primaryDisk.name : "Primary NVMe SSD"}
              </div>
              <div className="truncate text-[11px] text-[var(--muted)]">
                {primaryDisk
                  ? `Life ${primaryDisk.lifePercent ?? "—"}% · ${primaryDisk.powerOnHours ? `${primaryDisk.powerOnHours}h` : primaryDisk.source}`
                  : "No SMART telemetry"}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end">
            <span className={`font-mono text-xs font-semibold ${tempToneClass(primaryDisk?.tempC, 65, 75)}`}>
              {primaryDisk?.tempC != null ? `${Math.round(primaryDisk.tempC)} °C` : "—"}
            </span>
            {primaryDisk?.tempMaxC != null ? (
              <span className="font-mono text-[10px] text-[var(--muted)]">Max {Math.round(primaryDisk.tempMaxC)}°</span>
            ) : null}
          </div>
        </div>

        {/* Stability Card */}
        <div className="flex items-center justify-between gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 text-xs">
          <div className="flex min-w-0 items-center gap-2">
            <Activity className="h-4 w-4 shrink-0 text-violet-400" aria-hidden />
            <div className="min-w-0">
              <div className="truncate font-medium text-[var(--text)]">System Stability (7d)</div>
              <div className="truncate text-[11px] text-[var(--muted)]">
                KP41: {stability?.unexpectedShutdowns7d ?? 0} · WHEA: {stability?.wheaErrors7d ?? 0} · TDR:{" "}
                {stability?.displayTdrs7d ?? 0}
              </div>
            </div>
          </div>
          <span
            className={`shrink-0 font-mono text-xs font-semibold ${
              totalAlerts7d === 0 ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            {totalAlerts7d === 0 ? "Clean" : `${totalAlerts7d} err`}
          </span>
        </div>
      </div>

      {showEvents && stability?.recentEvents && stability.recentEvents.length > 0 ? (
        <div
          data-testid="hardware-stability-events"
          className="max-h-48 overflow-y-auto rounded-md border border-white/[0.08] bg-black/45 p-2 font-mono text-[11px] leading-relaxed text-slate-300"
        >
          {stability.recentEvents.map((ev, i) => {
            const toneCls =
              ev.id === 41
                ? "text-rose-300"
                : /WHEA/i.test(ev.provider)
                  ? "text-amber-300"
                  : "text-violet-300";
            return (
              <div key={i} className="truncate">
                <span className="text-slate-500">[{ev.at ? new Date(ev.at).toLocaleString() : "?"}]</span>{" "}
                <span className={`font-semibold ${toneCls}`}>{ev.provider} (#{ev.id})</span>: {ev.message}
              </div>
            );
          })}
        </div>
      ) : null}
      </div>
    </HubPanel>
  );
}
