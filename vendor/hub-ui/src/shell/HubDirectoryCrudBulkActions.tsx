import { CopyMinus, Plus } from "lucide-react";
import type { ReactNode } from "react";
import type { HubDirectoryColumnHintContent } from "../table/HubDirectoryColumnHint";
import { HubBulkActionButton, type HubBulkActionTone } from "./HubBulkActionButton";
import { HubDirectoryBulkActionRail } from "./HubDirectoryBulkActionRail";
import { HubDirectoryDeleteBulkAction } from "./HubDirectoryDeleteBulkAction";
import { HubDirectoryEditBulkAction } from "./HubDirectoryEditBulkAction";
import { HubDirectoryNewBulkAction } from "./HubDirectoryNewBulkAction";
import { HUB_DIRECTORY_NEW_ACTION_LABEL, HUB_DIRECTORY_NEW_ACTION_TONE } from "./hub-directory-new-action";

export type HubDirectoryCrudBulkExtraAction = {
  label: string;
  title: string;
  onClick: () => void;
  icon?: ReactNode;
  tone?: HubBulkActionTone;
};

export type HubDirectoryCrudBulkActionsProps = {
  hasSelection: boolean;
  selectedCount: number;
  onPrimary: () => void;
  onEdit: () => void;
  onDelete: () => void;
  primaryLabel?: string;
  primaryTitle?: string;
  primaryDisabled?: boolean;
  editDisabled?: boolean;
  deleteDisabled?: boolean;
  editTitle?: string;
  editTitleWhenMulti?: string;
  editTitleWhenNone?: string;
  deleteTitle?: string;
  deleteTitleWhenNone?: string;
  primaryLabelHint?: HubDirectoryColumnHintContent;
  editLabelHint?: HubDirectoryColumnHintContent;
  deleteLabelHint?: HubDirectoryColumnHintContent;
  /** Override Delete button label (e.g. Material Trash → Delete forever). */
  deleteLabel?: string;
  /** Hide default Edit button (for tools using adaptive Detail CTA). */
  hideEdit?: boolean;
  /** Insert between New/Edit and Delete — e.g. `HubDirectoryAdaptiveEditAction` Detail CTA. */
  beforeDelete?: ReactNode;
  extra?: HubDirectoryCrudBulkExtraAction;
  /** Render buttons only — compose multiple groups in one `HubDirectoryBulkActionRail`. */
  embedded?: boolean;
};

/** Golden New / Detail / Delete bulk rail — Notes folders, 2FA, Cookie access modals. */
export function HubDirectoryCrudBulkActions({
  hasSelection,
  selectedCount,
  onPrimary,
  onEdit,
  onDelete,
  primaryLabel = HUB_DIRECTORY_NEW_ACTION_LABEL,
  primaryTitle,
  primaryDisabled = false,
  editDisabled = false,
  deleteDisabled = false,
  editTitle = "Edit selected",
  editTitleWhenMulti = "Select one item to edit",
  editTitleWhenNone = "Select items to edit",
  deleteTitle = "Delete selected",
  deleteTitleWhenNone = "Select items to delete",
  primaryLabelHint,
  editLabelHint,
  deleteLabelHint,
  deleteLabel,
  hideEdit = false,
  beforeDelete,
  extra,
  embedded = false,
}: HubDirectoryCrudBulkActionsProps) {
  const editEnabled = hasSelection && selectedCount === 1 && !editDisabled;
  const deleteEnabled = hasSelection && !deleteDisabled;

  const resolvedEditTitle = !hasSelection
    ? editTitleWhenNone
    : selectedCount > 1
      ? editTitleWhenMulti
      : editTitle;

  const resolvedDeleteTitle = hasSelection ? deleteTitle : deleteTitleWhenNone;

  const buttons = (
    <>
      {primaryLabel === HUB_DIRECTORY_NEW_ACTION_LABEL ? (
        <HubDirectoryNewBulkAction
          title={primaryTitle ?? primaryLabel}
          disabled={primaryDisabled}
          onClick={onPrimary}
          labelHint={primaryLabelHint}
        />
      ) : (
        <HubBulkActionButton
          icon={<Plus size={14} aria-hidden />}
          label={primaryLabel}
          title={primaryTitle ?? primaryLabel}
          tone={HUB_DIRECTORY_NEW_ACTION_TONE}
          disabled={primaryDisabled}
          onClick={onPrimary}
        />
      )}
      {!hideEdit ? (
        <HubDirectoryEditBulkAction
          title={resolvedEditTitle}
          disabled={!editEnabled}
          selectedCount={hasSelection ? selectedCount : undefined}
          onClick={onEdit}
          labelHint={editLabelHint}
        />
      ) : null}
      {beforeDelete}
      <HubDirectoryDeleteBulkAction
        title={resolvedDeleteTitle}
        disabled={!deleteEnabled}
        onClick={onDelete}
        label={deleteLabel}
        labelHint={deleteLabelHint}
      />
      {extra ? (
        <HubBulkActionButton
          icon={extra.icon ?? <CopyMinus size={14} aria-hidden />}
          label={extra.label}
          title={extra.title}
          tone={extra.tone ?? "amber"}
          onClick={extra.onClick}
        />
      ) : null}
    </>
  );

  if (embedded) return buttons;

  return (
    <HubDirectoryBulkActionRail>
      {buttons}
    </HubDirectoryBulkActionRail>
  );
}
