import { Radio, Trash2 } from "lucide-react";
import { HubSegmentToggle, hubSegmentIconSize } from "./HubSegmentToggle";

export type HubDirectoryLifecycleMode = "live" | "trash";

export type HubDirectoryLifecycleToggleProps = {
  value: HubDirectoryLifecycleMode;
  onChange: (mode: HubDirectoryLifecycleMode) => void;
  className?: string;
};

/**
 * Live / Trash segment — sits **after** Table/Cards on `DirectorySearchToolbar`.
 * Soft-delete directories only (Material/Partner vault, future adopters).
 */
export function HubDirectoryLifecycleToggle({
  value,
  onChange,
  className,
}: HubDirectoryLifecycleToggleProps) {
  const iconPx = hubSegmentIconSize();
  return (
    <HubSegmentToggle
      className={className}
      value={value}
      onChange={onChange}
      options={[
        {
          value: "live",
          label: "Live",
          activeTone: "emerald",
          icon: <Radio size={iconPx} aria-hidden />,
        },
        {
          value: "trash",
          label: "Trash",
          activeTone: "orange",
          icon: <Trash2 size={iconPx} aria-hidden />,
        },
      ]}
    />
  );
}
