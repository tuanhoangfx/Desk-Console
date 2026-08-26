import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { HubAdmReadonlyField } from "../shell/HubAdmClickEditField";
import { HubDetailFieldRow, HubDetailFieldsGroup } from "../shell/HubDetailFieldsScope";

export type HubUserModalAdmFieldProps = {
  label: string;
  icon: LucideIcon;
  iconClassName?: string;
  children: ReactNode;
  className?: string;
};

/** One full-width ADM field row for account change sub-modals. */
export function HubUserModalAdmField({
  label,
  icon,
  iconClassName,
  children,
  className,
}: HubUserModalAdmFieldProps) {
  return (
    <HubDetailFieldRow slots="full">
      <HubAdmReadonlyField
        header={{ label, icon, iconClassName }}
        valueLayout="inline"
        className={className}
      >
        {children}
      </HubAdmReadonlyField>
    </HubDetailFieldRow>
  );
}

/** Field-scope tokens matching the P0020 Account Detail main form. */
export function HubUserModalAdmFields({ children }: { children: ReactNode }) {
  return <HubDetailFieldsGroup>{children}</HubDetailFieldsGroup>;
}
