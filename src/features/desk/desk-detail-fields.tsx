import { isValidElement, type ReactNode } from "react";
import {
  HubAdmReadonlyField,
  HubDirectoryEmptyCell,
  isDirectoryEmptyLabel,
} from "@tool-workspace/hub-ui";

export const DESK_DETAIL_CONTROL_CLASS =
  "hub-adm-inline-field hub-adm-inline-field--multiline hub-adm-inline-field--multiline-1";

function isDeskFieldChildEmpty(children: ReactNode): boolean {
  if (children === null || children === undefined || typeof children === "boolean") return true;
  if (typeof children === "string") return isDirectoryEmptyLabel(children);
  if (isValidElement(children)) {
    if (children.type === HubDirectoryEmptyCell) return true;
    const props = children.props as { value?: unknown };
    if ("value" in props && (typeof props.value === "string" || props.value == null)) {
      return isDirectoryEmptyLabel(props.value as string | null | undefined);
    }
  }
  return false;
}

export function DeskDetailReadonlyField({
  label,
  value,
  headerEmoji,
  empty,
  children,
}: {
  label: string;
  value?: string;
  headerEmoji?: string;
  empty?: boolean;
  children?: ReactNode;
}) {
  const resolvedEmpty =
    empty ?? (children !== undefined ? isDeskFieldChildEmpty(children) : isDirectoryEmptyLabel(value));
  return (
    <HubAdmReadonlyField
      header={{ label, headerEmoji }}
      valueLayout="inline"
      empty={resolvedEmpty}
      className={DESK_DETAIL_CONTROL_CLASS}
    >
      {children ??
        (!isDirectoryEmptyLabel(value) ? (
          <span className="hub-directory-body-value">{value?.trim()}</span>
        ) : null)}
    </HubAdmReadonlyField>
  );
}
