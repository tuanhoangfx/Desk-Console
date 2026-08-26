import { Copy, Pencil, SquareStack } from "lucide-react";
import { HubBulkActionButton } from "./HubBulkActionButton";
import { HubDirectoryDeleteBulkAction } from "./HubDirectoryDeleteBulkAction";
import { HubDirectoryNewBulkAction } from "./HubDirectoryNewBulkAction";

/** Golden Dashboard screen catalog — bulk actions that need multi-select. */
export type HubScreensDirectoryBulkActionsProps = {
  hasSelection: boolean;
  selectedCount: number;
  onOpenSelected: () => void;
  onCopyPaths: () => void;
};

/** Dashboard screen catalog bulk — per-card pin only (no bulk pin). */
export function HubScreensDirectoryBulkActions({
  hasSelection,
  selectedCount,
  onOpenSelected,
  onCopyPaths,
}: HubScreensDirectoryBulkActionsProps) {
  return (
    <>
      <HubBulkActionButton
        icon={<SquareStack size={14} aria-hidden />}
        label="Open selected"
        title="Open each selected screen in a new browser tab"
        tone="indigo"
        disabled={!hasSelection}
        selectedCount={hasSelection ? selectedCount : undefined}
        onClick={onOpenSelected}
      />
      <HubBulkActionButton
        icon={<Copy size={14} aria-hidden />}
        label="Copy paths"
        title="Copy selected screen paths to clipboard"
        tone="neutral"
        disabled={!hasSelection}
        onClick={onCopyPaths}
      />
    </>
  );
}

/** Golden Users directory — New / Edit / Delete (SSOT). Clear access → Edit tools; vault export → Settings. */
export type HubUsersDirectoryBulkActionsProps = {
  hasSelection: boolean;
  roleLoading: boolean;
  isAdmin: boolean;
  isManager: boolean;
  onAdd: () => void;
  onEdit: () => void;
  onDeleteUsers: () => void;
};

export function HubUsersDirectoryBulkActions({
  hasSelection,
  roleLoading,
  isAdmin,
  isManager,
  onAdd,
  onEdit,
  onDeleteUsers,
}: HubUsersDirectoryBulkActionsProps) {
  const canEdit = isAdmin || isManager;
  const editEnabled = canEdit && hasSelection && !roleLoading;
  const deleteEnabled = isAdmin && hasSelection && !roleLoading;
  const addEnabled = isAdmin && !roleLoading;

  return (
    <>
      <HubDirectoryNewBulkAction
        title={
          roleLoading
            ? "Loading your role…"
            : isAdmin
              ? "New user (ID or email) or bulk import"
              : "Admin only"
        }
        disabled={!addEnabled}
        onClick={onAdd}
      />
      <HubBulkActionButton
        icon={<Pencil size={14} aria-hidden />}
        label="Edit"
        title={
          roleLoading
            ? "Loading your role…"
            : !canEdit
              ? "Admin or manager only"
              : hasSelection
                ? "Edit name, email, role, tools"
                : "Select one or more users"
        }
        tone="indigo"
        disabled={!editEnabled}
        onClick={onEdit}
      />
      <HubDirectoryDeleteBulkAction
        title={
          roleLoading
            ? "Loading your role…"
            : isAdmin
              ? "Delete selected users (7-day grace, then permanent purge)"
              : "Admin only"
        }
        disabled={!deleteEnabled}
        onClick={onDeleteUsers}
      />
    </>
  );
}
