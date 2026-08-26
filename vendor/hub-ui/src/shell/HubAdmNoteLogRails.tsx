import type { ReactNode } from "react";
import { HubChangeLogList, type HubChangeLogListProps } from "../content/HubChangeLogList";
import type { HubEntityLogEntry, HubEntityLogFieldMeta } from "../lib/hub-entity-log";
import { HUB_ADM_ACTIVITY_LOG_EMPTY_MESSAGE } from "./hubAccountDetailModal";
import { HubAdmNoteRail } from "./HubAdmNoteRail";
import { HubToolDetailRail } from "./HubToolDetailSplitLayout";

export type HubAdmNoteLogRailNoteProps =
  | { mode: "readonly"; note: string; emptyMessage?: string }
  | {
      mode: "editor";
      value: string;
      onChange: (value: string) => void;
      placeholder?: string;
      saving?: boolean;
      name?: string;
    };

export type HubAdmNoteLogRailsProps = {
  noteRail: HubAdmNoteLogRailNoteProps;
  logEntries: HubEntityLogEntry[];
  logId: string;
  logFieldMeta?: (field: string) => HubEntityLogFieldMeta;
  logHydrating?: boolean;
  logEmptyMessage?: string;
  logParseMessage?: HubChangeLogListProps["parseMessage"];
  noteEmptyMessage?: string;
  noteTitle?: ReactNode;
  logTitle?: ReactNode;
  noteClassName?: string;
  logClassName?: string;
  /** Slot between Note and Log (e.g. CRM save error). */
  noteBeforeLog?: ReactNode;
  showLog?: boolean;
  children?: ReactNode;
};

/**
 * Canonical Layout-3 right rail composition: editable/readonly Note followed by entity Log.
 * Product code owns persistence and field labels; Hub UI owns structure, empty/loading copy, and chrome.
 */
export function HubAdmNoteLogRails({
  noteRail,
  logEntries,
  logId,
  logFieldMeta,
  logHydrating = false,
  logEmptyMessage = HUB_ADM_ACTIVITY_LOG_EMPTY_MESSAGE,
  logParseMessage,
  noteEmptyMessage = "No note.",
  noteTitle = "Note",
  logTitle = "Log",
  noteClassName,
  logClassName,
  noteBeforeLog,
  showLog = true,
  children,
}: HubAdmNoteLogRailsProps) {
  const fieldMeta =
    logFieldMeta ??
    ((field: string) => ({
      label: field.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
    }));

  const noteRailNode =
    noteRail.mode === "editor" ? (
      <HubAdmNoteRail
        mode="editor"
        title={noteTitle}
        titleEmoji="📝"
        className={noteClassName}
        ariaLabel={typeof noteTitle === "string" ? noteTitle : "Note"}
        value={noteRail.value}
        onChange={noteRail.onChange}
        name={noteRail.name}
        placeholder={noteRail.placeholder}
        controlClassName="field auth-gate-field hub-adm-note-textarea"
      />
    ) : (
      <HubAdmNoteRail
        mode="readonly"
        title={noteTitle}
        titleEmoji="📝"
        className={noteClassName}
        ariaLabel={typeof noteTitle === "string" ? noteTitle : "Note"}
        note={(noteRail.note ?? "").trim()}
        emptyMessage={noteRail.emptyMessage ?? noteEmptyMessage}
      />
    );

  return (
    <>
      {noteRailNode}
      {noteBeforeLog}
      {showLog ? (
        <HubToolDetailRail
          id={logId}
          title={logTitle}
          titleEmoji="📋"
          className={["hub-adm-rail--log", logClassName].filter(Boolean).join(" ")}
          ariaLabel={typeof logTitle === "string" ? logTitle : "Log"}
        >
          <HubChangeLogList
            entries={logEntries}
            fieldMeta={fieldMeta}
            parseMessage={logParseMessage}
            emptyLabel={logHydrating ? "Loading activity log…" : logEmptyMessage}
          />
        </HubToolDetailRail>
      ) : null}
      {children}
    </>
  );
}
