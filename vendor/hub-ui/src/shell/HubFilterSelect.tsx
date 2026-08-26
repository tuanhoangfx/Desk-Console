import type { FilterOption } from "./FilterBar";
import { HubSingleFilterDropdown } from "./FilterBar";

export type HubFilterSelectOption<T extends string = string> = {
  value: T;
  label: string;
  title?: string;
  count?: number;
  iconSrc?: string;
  iconShell?: FilterOption["iconShell"];
};

type HubFilterSelectProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: HubFilterSelectOption<T>[];
  filterKey?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  usePortal?: boolean;
  /** `value` = selected option only (golden directory filters). */
  triggerFormat?: "label-value" | "value";
};

/** @deprecated Prefer `HubSingleFilterDropdown` — same FilterBar chrome. */
export function HubFilterSelect<T extends string>({
  value,
  onChange,
  options,
  filterKey = "",
  label = "Select",
  disabled = false,
  className = "",
  usePortal = true,
  triggerFormat = "value",
}: HubFilterSelectProps<T>) {
  const filterOptions: FilterOption[] = options.map((o) => ({
    value: o.value,
    label: o.label,
    title: o.title,
    count: o.count,
    iconSrc: o.iconSrc,
    iconShell: o.iconShell,
  }));

  return (
    <HubSingleFilterDropdown
      filterKey={filterKey}
      label={label}
      options={filterOptions}
      value={value}
      onChange={(v: string) => onChange(v as T)}
      disabled={disabled}
      className={className}
      usePortal={usePortal}
      triggerFormat={triggerFormat}
    />
  );
}
