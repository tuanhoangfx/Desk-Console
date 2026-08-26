import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { HubFormFieldLabel } from "./HubFormFieldLabel";

export type HubOpsFormFieldProps = {
  label: string;
  icon?: LucideIcon;
  hint?: string;
  children: ReactNode;
  className?: string;
};

/** Labeled ops form control — HubFormFieldLabel + optional hint + control stack. */
export function HubOpsFormField({ label, icon, hint, children, className = "" }: HubOpsFormFieldProps) {
  return (
    <label className={`hub-ops-form-field block min-w-0 space-y-1.5${className ? ` ${className}` : ""}`}>
      <HubFormFieldLabel icon={icon}>{label}</HubFormFieldLabel>
      {hint ? <p className="text-[10px] text-[var(--muted)]">{hint}</p> : null}
      {children}
    </label>
  );
}
