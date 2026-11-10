import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Play, PowerOff, CheckCircle2 } from "lucide-react";
import {
  HubAccountDetailAdmScaffold,
  HubAccountDetailHeaderSearch,
  HubAccountDetailSearchProvider,
  HubAdmClickEditField,
  HubAdmClickFilterField,
  HubAdmPlainRelativeTime,
  HubAdmRecordMetaRow,
  HubAdmSectionBlock,
  HubBulkActionButton,
  HubCrmDetailVaultIdBadge,
  HubDirectoryReadonlyCopyText,
  HubToolDetailModal,
  HubToolDetailModalAccountFooter,
  HUB_ACCOUNT_DETAIL_MAIN_SCROLL_CLASS,
  HUB_ACCOUNT_DETAIL_MAIN_SCROLL_ROOT,
} from "@tool-workspace/hub-ui";
import type { TaskRow } from "../../lib/api";
import { DeskDetailNoteLogRails } from "../desk/DeskDetailNoteLogRails";
import { DeskDetailReadonlyField } from "../desk/desk-detail-fields";
import { DeskStatusKpiLabel } from "../desk/DeskStatusKpiLabel";
import { DESK_STATUS_KPI_EMOJI } from "../desk/desk-directory-stickers";
import {
  DESK_DETAIL_FORM_ROW_ALIGNED_3,
  DESK_DETAIL_FORM_STACK_CLASS,
  DESK_DETAIL_MODAL_SHELL_CLASS,
  DESK_DETAIL_SCAFFOLD_PROPS,
  DeskDetailTocNav,
  deskDetailSectionProps,
} from "../desk/desk-detail-modal-shell";

const CRON_DETAIL_TOC = [
  { id: "desk-cron-status", label: "Schedule & Status", emoji: "🕒" },
  { id: "desk-cron-identity", label: "Identity & Action", emoji: "⚡" },
] as const;

type SchedulePresetOption = {
  key: string;
  label: string;
  emoji: string;
  scheduleType: string;
  modifier?: string;
  startTime?: string;
};

const DETAIL_SCHEDULE_PRESETS: readonly SchedulePresetOption[] = [
  { key: "keep-current", label: "Keep Current Cycle", emoji: "📌", scheduleType: "" },
  { key: "every-10m", label: "Every 10 min", emoji: "🔄", scheduleType: "MINUTE", modifier: "10" },
  { key: "every-30m", label: "Every 30 min", emoji: "🔄", scheduleType: "MINUTE", modifier: "30" },
  { key: "every-1h", label: "Every 1 hour", emoji: "🔄", scheduleType: "HOURLY", modifier: "1" },
  { key: "every-6h", label: "Every 6 hours", emoji: "🔄", scheduleType: "HOURLY", modifier: "6" },
  { key: "every-12h", label: "Every 12 hours", emoji: "🔄", scheduleType: "HOURLY", modifier: "12" },
  { key: "daily-0415", label: "Daily 04:15", emoji: "📅", scheduleType: "DAILY", startTime: "04:15" },
  { key: "daily-0645", label: "Daily 06:45", emoji: "📅", scheduleType: "DAILY", startTime: "06:45" },
  { key: "weekly-sun", label: "Weekly Sun 04:00", emoji: "📅", scheduleType: "WEEKLY", startTime: "04:00" },
  { key: "custom-minute", label: "Custom Interval (min)", emoji: "⏱️", scheduleType: "MINUTE", modifier: "15" },
  { key: "custom-daily", label: "Custom Daily (HH:MM)", emoji: "🕒", scheduleType: "DAILY", startTime: "05:00" },
] as const;

function detectInitialPreset(row: TaskRow): {
  presetKey: string;
  customMinutes: string;
  customTime: string;
} {
  const sc = String(row.scheduleType || "").toUpperCase();
  const mod = String(row.modifier || "").trim();
  const st = String(row.startTime || "").trim();
  const label = String(row.schedule || "").trim().toLowerCase();

  if (sc === "MINUTE") {
    if (mod === "10") return { presetKey: "every-10m", customMinutes: "10", customTime: "04:15" };
    if (mod === "30") return { presetKey: "every-30m", customMinutes: "30", customTime: "04:15" };
    return { presetKey: "custom-minute", customMinutes: mod || "15", customTime: "04:15" };
  }
  if (sc === "HOURLY") {
    if (mod === "1") return { presetKey: "every-1h", customMinutes: "60", customTime: "04:15" };
    if (mod === "6") return { presetKey: "every-6h", customMinutes: "360", customTime: "04:15" };
    if (mod === "12") return { presetKey: "every-12h", customMinutes: "720", customTime: "04:15" };
  }
  if (sc === "DAILY") {
    if (st === "04:15") return { presetKey: "daily-0415", customMinutes: "30", customTime: "04:15" };
    if (st === "06:45") return { presetKey: "daily-0645", customMinutes: "30", customTime: "06:45" };
    if (/^\d{2}:\d{2}$/.test(st)) return { presetKey: "custom-daily", customMinutes: "30", customTime: st };
  }
  if (sc === "WEEKLY") {
    return { presetKey: "weekly-sun", customMinutes: "30", customTime: st || "04:00" };
  }
  if (label === "every 10 min") return { presetKey: "every-10m", customMinutes: "10", customTime: "04:15" };
  if (label === "every 30 min") return { presetKey: "every-30m", customMinutes: "30", customTime: "04:15" };
  if (label === "every 6 hours") return { presetKey: "every-6h", customMinutes: "360", customTime: "04:15" };
  if (label === "daily 04:15") return { presetKey: "daily-0415", customMinutes: "30", customTime: "04:15" };
  if (label === "daily 06:45") return { presetKey: "daily-0645", customMinutes: "30", customTime: "06:45" };
  return { presetKey: "keep-current", customMinutes: "15", customTime: "04:15" };
}

export type CronUpdatePayload = {
  enabled?: boolean;
  scheduleType?: string;
  modifier?: string;
  startTime?: string;
  scheduleLabel?: string;
  description?: string;
  command?: string;
};

type Props = {
  row: TaskRow;
  busy?: boolean;
  onRun: (id: string) => void;
  onToggleEnable: (id: string, enable: boolean) => void;
  onUpdate: (id: string, payload: CronUpdatePayload) => Promise<void>;
  onClose: () => void;
};

export function CronDetailModal({ row, busy = false, onRun, onToggleEnable, onUpdate, onClose }: Props) {
  const sectionIds = useMemo(() => CRON_DETAIL_TOC.map((item) => item.id), []);
  const isDaemon = row.kind === "daemon" || /^Daemon-/i.test(row.id);
  const isDisabled = /disabled/i.test(row.status);
  const engineLabel = isDaemon ? "Built-in Daemon (Host Timer)" : "Windows Task Scheduler (Dev-*)";
  const lastRunIso = row.lastRun && !Number.isNaN(new Date(row.lastRun).getTime())
    ? new Date(row.lastRun).toISOString()
    : new Date().toISOString();

  const initialPreset = useMemo(() => detectInitialPreset(row), [row]);
  const [baseline, setBaseline] = useState(() => ({
    enabled: !isDisabled,
    presetKey: initialPreset.presetKey,
    customMinutes: initialPreset.customMinutes,
    customTime: initialPreset.customTime,
    description: (row.description || "").trim(),
    command: (row.command || "").trim(),
  }));
  const [enabledDraft, setEnabledDraft] = useState<boolean>(!isDisabled);
  const [presetKey, setPresetKey] = useState<string>(initialPreset.presetKey);
  const [customMinutes, setCustomMinutes] = useState<string>(initialPreset.customMinutes);
  const [customTime, setCustomTime] = useState<string>(initialPreset.customTime);
  const [descriptionDraft, setDescriptionDraft] = useState<string>(row.description || "");
  const [commandDraft, setCommandDraft] = useState<string>(row.command || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const nextEnabled = !/disabled/i.test(row.status);
    const next = detectInitialPreset(row);
    setBaseline({
      enabled: nextEnabled,
      presetKey: next.presetKey,
      customMinutes: next.customMinutes,
      customTime: next.customTime,
      description: (row.description || "").trim(),
      command: (row.command || "").trim(),
    });
    setEnabledDraft(nextEnabled);
    setPresetKey(next.presetKey);
    setCustomMinutes(next.customMinutes);
    setCustomTime(next.customTime);
    setDescriptionDraft(row.description || "");
    setCommandDraft(row.command || "");
  }, [row]);

  const isDirty = useMemo(() => {
    if (enabledDraft !== baseline.enabled) return true;
    if (presetKey !== baseline.presetKey) return true;
    if (presetKey === "custom-minute" && customMinutes.trim() !== baseline.customMinutes) return true;
    if (presetKey === "custom-daily" && customTime.trim() !== baseline.customTime) return true;
    if (descriptionDraft.trim() !== baseline.description) return true;
    if (!isDaemon && commandDraft.trim() !== baseline.command) return true;
    return false;
  }, [
    baseline,
    commandDraft,
    customMinutes,
    customTime,
    descriptionDraft,
    enabledDraft,
    isDaemon,
    presetKey,
  ]);

  const handleSave = async () => {
    const selected = DETAIL_SCHEDULE_PRESETS.find((p) => p.key === presetKey);
    const payload: CronUpdatePayload = {
      enabled: enabledDraft,
      description: descriptionDraft.trim(),
    };
    if (!isDaemon && commandDraft.trim() && commandDraft.trim() !== baseline.command) {
      payload.command = commandDraft.trim();
    }
    if (selected && selected.key !== "keep-current") {
      payload.scheduleType = selected.scheduleType;
      if (selected.key === "custom-minute") {
        const mins = String(Math.max(1, Number(customMinutes) || 15));
        payload.modifier = mins;
        payload.scheduleLabel = `Every ${mins} min`;
      } else if (selected.key === "custom-daily") {
        const hhmm = /^\d{2}:\d{2}$/.test(customTime.trim()) ? customTime.trim() : "05:00";
        payload.startTime = hhmm;
        payload.scheduleLabel = `Daily ${hhmm}`;
      } else {
        payload.modifier = selected.modifier;
        payload.startTime = selected.startTime;
        payload.scheduleLabel = selected.label;
      }
    }
    setSaving(true);
    try {
      await onUpdate(row.id, payload);
      setBaseline({
        enabled: enabledDraft,
        presetKey,
        customMinutes: customMinutes.trim(),
        customTime: customTime.trim(),
        description: descriptionDraft.trim(),
        command: commandDraft.trim(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <HubAccountDetailSearchProvider>
      <HubToolDetailModal
        open
        onClose={onClose}
        title={`${row.name} · ${isDaemon ? "Daemon" : "Scheduled"}`}
        titleId="desk-cron-detail-title"
        headerIcon={CalendarClock}
        headerIconClassName="text-cyan-300"
        headerCenter={<HubAccountDetailHeaderSearch />}
        shellClassName={`${DESK_DETAIL_MODAL_SHELL_CLASS} cron-detail-modal`}
        data-main-scroll={HUB_ACCOUNT_DETAIL_MAIN_SCROLL_CLASS}
        sectionIds={sectionIds}
        scrollRootSelector={HUB_ACCOUNT_DETAIL_MAIN_SCROLL_ROOT}
        busy={saving || busy}
        toc={<DeskDetailTocNav items={[...CRON_DETAIL_TOC]} />}
        footer={
          <HubToolDetailModalAccountFooter
            onClose={onClose}
            closeDisabled={saving}
            onSave={() => void handleSave()}
            saveLabel="Save Changes"
            saveDisabled={saving || busy || !isDirty}
            busy={saving || busy}
          />
        }
        ariaLabelledBy="desk-cron-detail-title"
      >
        <HubAccountDetailAdmScaffold
          panelId="desk-cron-detail"
          panelTitle="Cron"
          panelTitleEmoji="🕒"
          {...DESK_DETAIL_SCAFFOLD_PROPS}
          main={
            <>
              <HubAdmRecordMetaRow
                vaultId={<HubCrmDetailVaultIdBadge id={row.id} title="Copy cron ID" />}
                created={<HubAdmPlainRelativeTime at={lastRunIso} />}
                updated={<HubAdmPlainRelativeTime at={lastRunIso} />}
                createdLabel="Last run"
                updatedLabel="Update"
              />
              <div className={DESK_DETAIL_FORM_STACK_CLASS}>
                <HubAdmSectionBlock
                  {...deskDetailSectionProps({
                    id: "desk-cron-status",
                    label: "Schedule & Status",
                    emoji: !enabledDraft ? "⏸️" : DESK_STATUS_KPI_EMOJI.up,
                    sectionKey: "status",
                  })}
                >
                  <div className={DESK_DETAIL_FORM_ROW_ALIGNED_3}>
                    <DeskDetailReadonlyField label="Runtime Status" headerEmoji={isDisabled ? "⏸️" : DESK_STATUS_KPI_EMOJI.up}>
                      <DeskStatusKpiLabel status={row.status || "Active"} />
                    </DeskDetailReadonlyField>
                    <HubAdmClickFilterField
                      header={{ label: "Enabled State", headerEmoji: enabledDraft ? "🟢" : "⏸️" }}
                      fieldLabel="Enabled State"
                      filterKey={`p0001-cron-enabled-${row.id}`}
                      options={[
                        { value: "enabled", label: "Active (Enabled)", emoji: "🟢" },
                        { value: "disabled", label: "Disabled (Paused)", emoji: "⏸️" },
                      ]}
                      value={enabledDraft ? "enabled" : "disabled"}
                      onChange={(val) => setEnabledDraft(val === "enabled")}
                    />
                    <HubAdmClickFilterField
                      header={{ label: "Schedule Cycle", headerEmoji: "📅" }}
                      fieldLabel="Schedule Cycle"
                      filterKey={`p0001-cron-schedule-${row.id}`}
                      options={DETAIL_SCHEDULE_PRESETS.map((p) => ({
                        value: p.key,
                        label:
                          p.key === "keep-current"
                            ? `Current (${row.schedule || row.nextRun || "Scheduled"})`
                            : p.label,
                        emoji: p.emoji,
                      }))}
                      value={presetKey}
                      onChange={setPresetKey}
                    />
                    {presetKey === "custom-minute" ? (
                      <HubAdmClickEditField
                        header={{ label: "Interval (Minutes)", headerEmoji: "⏱️" }}
                        fieldLabel="Interval Minutes"
                        value={customMinutes}
                        onChange={setCustomMinutes}
                      />
                    ) : null}
                    {presetKey === "custom-daily" ? (
                      <HubAdmClickEditField
                        header={{ label: "Daily Start Time (HH:MM)", headerEmoji: "🕒" }}
                        fieldLabel="Start Time"
                        value={customTime}
                        onChange={setCustomTime}
                      />
                    ) : null}
                    <HubAdmClickEditField
                      header={{ label: "Description", headerEmoji: "📋" }}
                      fieldLabel="Description"
                      value={descriptionDraft}
                      onChange={setDescriptionDraft}
                    />
                    <DeskDetailReadonlyField label="Last Exit Code" value={row.lastResult || "0"} headerEmoji="☑️" />
                    <DeskDetailReadonlyField label="Last Run" value={row.lastRun || "—"} headerEmoji="🕒" />
                    <DeskDetailReadonlyField label="Engine" value={engineLabel} headerEmoji="⚡" />
                    <DeskDetailReadonlyField
                      label="Last Duration"
                      value={row.lastDurationMs != null ? `${row.lastDurationMs} ms` : "—"}
                      headerEmoji="🕒"
                    />
                    <DeskDetailReadonlyField
                      label="Last Freed Space"
                      value={row.lastFreedMb != null && row.lastFreedMb > 0 ? `${row.lastFreedMb} MB` : "0 MB (clean)"}
                      headerEmoji="🧹"
                    />
                    <DeskDetailReadonlyField
                      label="Last Summary"
                      value={row.lastSummary || `exit ${row.lastResult || "0"}`}
                      headerEmoji="📝"
                    />
                  </div>
                </HubAdmSectionBlock>
                <HubAdmSectionBlock
                  {...deskDetailSectionProps({
                    id: "desk-cron-identity",
                    label: "Identity & Controls",
                    emoji: "⚡",
                    sectionKey: "identity",
                  })}
                >
                  <div className={DESK_DETAIL_FORM_ROW_ALIGNED_3}>
                    <DeskDetailReadonlyField label="Task ID" headerEmoji="🏷️">
                      <HubDirectoryReadonlyCopyText value={row.id} />
                    </DeskDetailReadonlyField>
                    <DeskDetailReadonlyField label="Task Name" value={row.name} headerEmoji="👤" />
                    <DeskDetailReadonlyField label="Next Run Detail" value={row.nextRun || "—"} headerEmoji="🎯" />
                  </div>
                  {!isDaemon ? (
                    <div className="mt-3">
                      <HubAdmClickEditField
                        header={{ label: "Command to Run (nodew.exe / script)", headerEmoji: "💻" }}
                        fieldLabel="Command"
                        value={commandDraft}
                        onChange={setCommandDraft}
                      />
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <HubBulkActionButton
                      icon={Play}
                      label="Run Now"
                      tone="emerald"
                      disabled={busy || saving}
                      onClick={() => onRun(row.id)}
                    />
                    <HubBulkActionButton
                      icon={isDisabled ? CheckCircle2 : PowerOff}
                      label={isDisabled ? "Enable Immediately" : "Disable Immediately"}
                      tone={isDisabled ? "emerald" : "rose"}
                      disabled={busy || saving}
                      onClick={() => onToggleEnable(row.id, isDisabled)}
                    />
                  </div>
                </HubAdmSectionBlock>
              </div>
            </>
          }
          rail={<DeskDetailNoteLogRails targetId={row.id} note={`${row.name} (${engineLabel})`} />}
        />
      </HubToolDetailModal>
    </HubAccountDetailSearchProvider>
  );
}
