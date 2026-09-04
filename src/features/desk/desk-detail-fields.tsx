import type { ReactNode } from "react";
import { HubAdmReadonlyField } from "@tool-workspace/hub-ui";

export const DESK_DETAIL_CONTROL_CLASS =
  "hub-adm-inline-field hub-adm-inline-field--multiline hub-adm-inline-field--multiline-1";

export function DeskDetailReadonlyField({
  label,
  value,
  headerEmoji,
  children,
}: {
  label: string;
  value?: string;
  headerEmoji?: string;
  children?: ReactNode;
}) {
  return (
    <HubAdmReadonlyField
      header={{ label, headerEmoji }}
      valueLayout="inline"
      className={DESK_DETAIL_CONTROL_CLASS}
    >
      {children ?? <span className="hub-directory-body-value">{value?.trim() || "—"}</span>}
    </HubAdmReadonlyField>
  );
}
