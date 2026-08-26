import { LayoutGrid, Table2 } from "lucide-react";
import { compactIconSize } from "../ui-scale";

export type HubViewMode = "table" | "card";

export function ViewToggle({ value, onChange }: { value: HubViewMode; onChange: (v: HubViewMode) => void }) {
  return (
    <div className="hub-view-toggle inline-flex h-[var(--hub-control-h)] items-center rounded-lg border border-white/10 bg-[var(--panel)] p-0.5">
      <Btn
        active={value === "table"}
        onClick={() => onChange("table")}
        icon={<Table2 size={compactIconSize(14)} />}
        label="Table"
        title="Table view — one row per account"
      />
      <Btn
        active={value === "card"}
        onClick={() => onChange("card")}
        icon={<LayoutGrid size={compactIconSize(14)} />}
        label="Cards"
        title="Card view — larger tiles for scanning accounts"
      />
    </div>
  );
}

function Btn({
  active,
  onClick,
  icon,
  label,
  title,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`flex h-full items-center gap-1.5 rounded-md px-2.5 text-xs transition-colors ${
        active ? "bg-indigo-500/20 text-indigo-200" : "text-[var(--muted)] hover:text-[var(--text)]"
      }`}
    >
      {icon}
      <span className="hub-view-toggle__label">{label}</span>
    </button>
  );
}
