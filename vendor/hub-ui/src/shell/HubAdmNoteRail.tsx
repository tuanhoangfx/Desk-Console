import type { ReactNode } from "react";
import { HubAdmNoteEditorField } from "./HubAdmNoteEditorField";
import { HubAdmNoteReadonlyBody } from "./HubAdmNoteReadonlyBody";
import { HubToolDetailRail } from "./HubToolDetailSplitLayout";

type HubAdmNoteRailBaseProps = {
  title?: ReactNode;
  /** Sheet sticker — replaces Lucide note icon when set (📜 Order Details parity). */
  titleEmoji?: string;
  className?: string;
  id?: string;
  ariaLabel?: string;
  searchLabel?: string;
  /** When false (default), search lives in modal header — note rail is plain. */
  searchInRail?: boolean;
};

export type HubAdmNoteRailReadonlyProps = HubAdmNoteRailBaseProps & {
  mode?: "readonly";
  note: string;
  emptyMessage?: string;
  placeholder?: string;
  scroll?: boolean;
};

export type HubAdmNoteRailEditorProps = HubAdmNoteRailBaseProps & {
  mode: "editor";
  value: string;
  onChange: (value: string) => void;
  name?: string;
  placeholder?: string;
  controlClassName?: string;
  rows?: number;
  searchPlaceholder?: string;
  scroll?: boolean;
  searchInRail?: boolean;
};

export type HubAdmNoteRailProps = HubAdmNoteRailReadonlyProps | HubAdmNoteRailEditorProps;

/** Golden note rail — HubToolDetailRail + Search note SSOT (P0020 Mail). */
export function HubAdmNoteRail(props: HubAdmNoteRailProps) {
  const title = props.title ?? "Note";
  /** Default sheet sticker — Lucide note icon is reserved for non-ADM surfaces. */
  const titleEmoji = props.titleEmoji ?? "📝";
  const isEditor = props.mode === "editor";
  const scroll = props.scroll ?? false;

  return (
    <HubToolDetailRail
      id={props.id}
      title={title}
      titleEmoji={titleEmoji}
      className={["hub-adm-rail--note", props.className].filter(Boolean).join(" ")}
      scroll={scroll}
      bodyClassName="hub-adm-note-rail__body"
      ariaLabel={props.ariaLabel ?? (typeof title === "string" ? title : "Note")}
    >
      {isEditor ? (
        <HubAdmNoteEditorField
          value={props.value}
          onChange={props.onChange}
          name={props.name}
          placeholder={props.placeholder}
          controlClassName={props.controlClassName}
          searchLabel={props.searchLabel}
          searchPlaceholder={props.searchPlaceholder}
          searchInRail={props.searchInRail}
          fillHeight
        />
      ) : (
        <HubAdmNoteReadonlyBody
          note={props.note}
          emptyMessage={props.emptyMessage}
          searchLabel={props.searchLabel}
          placeholder={props.placeholder}
          searchInRail={props.searchInRail}
        />
      )}
    </HubToolDetailRail>
  );
}
