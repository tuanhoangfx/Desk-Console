import { useState } from "react";
import { CalendarClock } from "lucide-react";
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
import { deskApi } from "../../lib/api";

type SchedulePresetKey =
  | "every-10m"
  | "every-30m"
  | "every-6h"
  | "daily-0415"
  | "daily-0645"
  | "weekly-sun";

const SCHEDULE_PRESETS: Record<
  SchedulePresetKey,
  { label: string; emoji: string; scheduleType: string; modifier?: string; startTime?: string }
> = {
  "every-10m": { label: "Every 10 min", emoji: "🔄", scheduleType: "MINUTE", modifier: "10" },
  "every-30m": { label: "Every 30 min", emoji: "🔄", scheduleType: "MINUTE", modifier: "30" },
  "every-6h": { label: "Every 6 hours", emoji: "🔄", scheduleType: "HOURLY", modifier: "6" },
  "daily-0415": { label: "Daily 04:15", emoji: "📅", scheduleType: "DAILY", startTime: "04:15" },
  "daily-0645": { label: "Daily 06:45", emoji: "📅", scheduleType: "DAILY", startTime: "06:45" },
  "weekly-sun": { label: "Weekly Sun 04:00", emoji: "📅", scheduleType: "WEEKLY", startTime: "04:00" },
};

const COMMAND_PRESETS = [
  {
    key: "stealth-prune",
    label: "Stealth Profile Cache Prune",
    emoji: "🧹",
    name: "Dev-Stealth-Cache-Sweep",
    command:
      "E:\\Dev\\.tools\\nodew.exe E:\\Dev\\Tool\\P0003-Stealth-Browser-Console\\scripts\\prune-closed-profile-caches.cjs",
    description: "Stealth Closed Profile Cache & Orphan Prune",
  },
  {
    key: "cursor-prune",
    label: "Cursor Chat & Storage Prune",
    emoji: "🗂️",
    name: "Dev-Cursor-Storage-Sweep",
    command: "E:\\Dev\\.tools\\nodew.exe E:\\Dev\\Tool\\scripts\\cursor-chat-auto-prune.mjs --apply --days 2",
    description: "Cursor IDE Chat Transcript Auto-Prune (2d retention)",
  },
  {
    key: "daily-kaizen",
    label: "Agent Session RCA & Kaizen Audit",
    emoji: "⚡",
    name: "Dev-Agent-Kaizen-Check",
    command:
      "E:\\Dev\\.tools\\nodew.exe E:\\Dev\\Tool\\scripts\\audit-agent-sessions-rca.mjs --days 1 --fix --write --telegram",
    description: "Daily Agent Session RCA & Kaizen Audit",
  },
  {
    key: "custom",
    label: "Custom Node / PowerShell Task",
    emoji: "⚙️",
    name: "Dev-Custom-Maintenance",
    command: "E:\\Dev\\.tools\\nodew.exe E:\\Dev\\Tool\\scripts\\prune-workspace-junk.mjs --apply --root-only",
    description: "Custom workspace maintenance task",
  },
] as const;

const CRON_SECTION = "new-cron-section";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (name: string) => void;
};

export function CronCreateModal({ open, onClose, onCreated }: Props) {
  const { pushToast } = useHubToast();
  const [presetKey, setPresetKey] = useState<string>("custom");
  const [name, setName] = useState("Dev-Custom-Maintenance");
  const [schedulePreset, setSchedulePreset] = useState<SchedulePresetKey>("daily-0415");
  const [command, setCommand] = useState<string>(COMMAND_PRESETS[3].command);
  const [description, setDescription] = useState<string>(COMMAND_PRESETS[3].description);
  const [saving, setSaving] = useState(false);

  const handlePresetChange = (key: string) => {
    setPresetKey(key);
    const found = COMMAND_PRESETS.find((p) => p.key === key);
    if (found) {
      setName(found.name);
      setCommand(found.command);
      setDescription(found.description);
    }
  };

  const handleSubmit = async () => {
    const cleanName = name.trim();
    const cleanCmd = command.trim();
    if (!cleanName || !cleanCmd) {
      pushToast({ type: "error", title: "Create Cron Task", message: "Name and Command are required." });
      return;
    }
    const sched = SCHEDULE_PRESETS[schedulePreset] || SCHEDULE_PRESETS["daily-0415"];
    setSaving(true);
    try {
      const res = await deskApi.createTask({
        name: cleanName,
        scheduleType: sched.scheduleType,
        modifier: sched.modifier,
        startTime: sched.startTime,
        command: cleanCmd,
        description: description.trim() || undefined,
        scheduleLabel: sched.label,
      });
      pushToast({
        type: "success",
        title: "Cron Task Created",
        message: `${res.name} scheduled (${sched.label}).`,
      });
      onCreated(res.name);
      onClose();
    } catch (error) {
      pushToast({
        type: "error",
        title: "Create Cron Failed",
        message: error instanceof Error ? error.message : "Could not register scheduled task",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <HubToolDetailModal
      open={open}
      onClose={onClose}
      title="New Cron task"
      headerIcon={CalendarClock}
      headerIconClassName="text-cyan-300"
      ariaLabel="New Cron task"
      size="detail"
      shellClassName={hubAccountDetailShellClass()}
      busy={saving}
      sectionIds={[CRON_SECTION]}
      toc={
        <HubToolDetailRail
          title="Navigate"
          titleEmoji="🧭"
          className="twofa-adm-rail--toc"
          scroll={false}
          ariaLabel="Sections"
        >
          <HubTocSectionNav
            items={[{ id: CRON_SECTION, label: "Cron Task", emoji: "🕒" }]}
            admNav
          />
        </HubToolDetailRail>
      }
      footer={
        <HubToolDetailModalAccountFooter
          onClose={onClose}
          closeDisabled={saving}
          onSave={() => void handleSubmit()}
          saveLabel="Create"
          saveVariant="create"
          saveDisabled={saving || !name.trim() || !command.trim()}
          busy={saving}
        />
      }
    >
      <HubToolDetailSection id={CRON_SECTION} title="Cron Task" icon={<CalendarClock size={14} aria-hidden />}>
        <HubDetailFieldsGroup>
          <div className="hub-adm-form-row hub-adm-form-row--aligned-2">
            <HubAdmClickFilterField
              header={{ label: "Template Preset", headerEmoji: "⚡" }}
              fieldLabel="Template Preset"
              filterKey="p0001-new-cron-preset"
              options={COMMAND_PRESETS.map((p) => ({
                value: p.key,
                label: p.label,
                emoji: p.emoji,
              }))}
              value={presetKey}
              onChange={handlePresetChange}
            />
            <HubAdmClickFilterField
              header={{ label: "Schedule Cycle", headerEmoji: "🕒" }}
              fieldLabel="Schedule Cycle"
              filterKey="p0001-new-cron-schedule"
              options={Object.entries(SCHEDULE_PRESETS).map(([value, meta]) => ({
                value,
                label: meta.label,
                emoji: meta.emoji,
              }))}
              value={schedulePreset}
              onChange={(v) => setSchedulePreset(v as SchedulePresetKey)}
            />
          </div>
          <div className="hub-adm-form-row hub-adm-form-row--aligned-2">
            <HubAdmClickEditField
              header={{ label: "Task Name (Dev-*)", headerEmoji: "🏷️" }}
              fieldLabel="Task Name"
              value={name}
              onChange={setName}
            />
            <HubAdmClickEditField
              header={{ label: "Description", headerEmoji: "📋" }}
              fieldLabel="Description"
              value={description}
              onChange={setDescription}
            />
          </div>
          <div className="hub-adm-form-row">
            <HubAdmClickEditField
              header={{ label: "Command to Run (nodew.exe / script)", headerEmoji: "💻" }}
              fieldLabel="Command"
              value={command}
              onChange={setCommand}
            />
          </div>
        </HubDetailFieldsGroup>
      </HubToolDetailSection>
    </HubToolDetailModal>
  );
}
