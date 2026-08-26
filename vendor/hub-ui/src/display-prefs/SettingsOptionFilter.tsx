import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { HubSingleFilterDropdown, type FilterOption } from "../shell/FilterBar";
import { SettingsSubsection } from "./primitives";
import { compactIconSize } from "../ui-scale";

export type SettingsOptionFilterProps<T extends string | number> = {
  title: string;
  icon: LucideIcon;
  iconClassName?: string;
  hint?: ReactNode;
  filterKey: string;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  formatLabel: (value: T) => string;
  className?: string;
};

/** Settings — section title + HubSingleFilterDropdown value trigger on one row (golden Filter). */
export function SettingsOptionFilter<T extends string | number>({
  title,
  icon: Icon,
  iconClassName = "text-indigo-300",
  hint,
  filterKey,
  options,
  value,
  onChange,
  formatLabel,
  className = "",
}: SettingsOptionFilterProps<T>) {
  const filterOptions: FilterOption[] = options.map((id) => ({
    value: String(id),
    label: formatLabel(id),
  }));

  const filter = (
    <HubSingleFilterDropdown
      filterKey={filterKey}
      label={title}
      options={filterOptions}
      value={String(value)}
      onChange={(next) => {
        const hit = options.find((id) => String(id) === next);
        if (hit !== undefined) onChange(hit);
      }}
      triggerFormat="value"
      className="shrink-0"
      usePortal
    />
  );

  return (
    <SettingsSubsection
      label={title}
      icon={<Icon size={compactIconSize(11)} className={iconClassName} aria-hidden />}
      headerActions={filter}
      className={`hub-settings-option-section${hint ? "" : " hub-settings-option-section--compact"}${className ? ` ${className}` : ""}`}
    >
      {hint ? <p className="text-[10px] leading-snug text-[var(--muted)]">{hint}</p> : null}
    </SettingsSubsection>
  );
}
