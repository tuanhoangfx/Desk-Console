import { useMemo } from "react";
import { HubPeriodSelect } from "../shell/HubPeriodSelect";
import { HUB_DIRECTORY_TOOLBAR_TYPO_CLASS } from "../shell/hub-typography";
import { useWorkspacePeriod } from "../hooks/useWorkspacePeriod";
import {
  workspacePeriodOptions,
  type WorkspacePeriodKey,
  type WorkspacePeriodScope,
  WORKSPACE_PERIOD_FILTER_HINT,
} from "../lib/hub-workspace-period";

export type HubWorkspacePeriodSelectProps = {
  scope: WorkspacePeriodScope;
  defaultRange?: WorkspacePeriodKey;
  inactiveKeys?: readonly WorkspacePeriodKey[];
  language?: string;
  labels?: Partial<Record<WorkspacePeriodKey, string>>;
  applyLabel?: string;
  /** Trigger native tooltip — default creation-date SSOT. */
  title?: string;
  /** Optional micro meta after period label (e.g. “Weekly”). */
  triggerMeta?: string;
};

/** Golden Period filter — HubPeriodSelect + per-tab URL prefs. */
export function HubWorkspacePeriodSelect({
  scope,
  defaultRange = "all",
  inactiveKeys = ["all"],
  language = typeof navigator !== "undefined" ? navigator.language : "en",
  labels,
  applyLabel = "Apply",
  title = WORKSPACE_PERIOD_FILTER_HINT,
  triggerMeta,
}: HubWorkspacePeriodSelectProps) {
  const period = useWorkspacePeriod(scope, defaultRange);

  const options = useMemo(() => {
    const base = workspacePeriodOptions();
    if (!labels) return base;
    return base.map((o) => ({ ...o, label: labels[o.value] ?? o.label }));
  }, [labels]);

  return (
    <HubPeriodSelect
      value={period.range}
      onChange={(range) => period.patch({ range: range as WorkspacePeriodKey })}
      options={options}
      customMonth={period.customMonth}
      onCustomMonthChange={(customMonth) => period.patch({ customMonth, range: "customMonth" })}
      customStartDate={period.customStartDate}
      onCustomStartDateChange={(customStartDate) => period.patch({ customStartDate })}
      customEndDate={period.customEndDate}
      onCustomEndDateChange={(customEndDate) => period.patch({ customEndDate })}
      monthRangeKey="customMonth"
      dateRangeKey="customRange"
      inactiveKeys={inactiveKeys}
      language={language}
      thisMonthLabel={labels?.thisMonth ?? "This Month"}
      backLabel="Back"
      applyLabel={applyLabel}
      startLabel="Start"
      endLabel="End"
      triggerTypoClass={HUB_DIRECTORY_TOOLBAR_TYPO_CLASS}
      title={title}
      triggerMeta={triggerMeta}
    />
  );
}
