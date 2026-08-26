import { useCallback, useMemo } from "react";
import { HubChangeLogList } from "../content/HubChangeLogList";
import type { HubEntityLogEntry, HubEntityLogFieldMeta } from "../lib/hub-entity-log";
import type { HubAppLogFieldLabels } from "../lib/hub-session-log-emit";

export type HubSessionLogAuditBodyProps = {
  audit: HubEntityLogEntry;
  fieldLabels?: HubAppLogFieldLabels;
};

/** Compact structured delta rail for one Header Log session entry — persist `changes[]` order. */
export function HubSessionLogAuditBody({ audit, fieldLabels }: HubSessionLogAuditBodyProps) {
  const fieldMeta = useCallback(
    (field: string): HubEntityLogFieldMeta => ({
      label: fieldLabels?.[field]?.label ?? field,
      emoji: fieldLabels?.[field]?.emoji,
    }),
    [fieldLabels],
  );

  const entries = useMemo(() => [audit], [audit]);

  return (
    <div className="hub-session-log-audit mt-1">
      <HubChangeLogList
        entries={entries}
        fieldMeta={fieldMeta}
        emptyLabel=""
        newestFirst={false}
        preserveFieldOrder
      />
    </div>
  );
}
