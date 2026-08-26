import type { ReactNode } from "react";
import { HubDirectoryScreen, type HubDirectoryScreenProps } from "./HubDirectoryScreen";

export type HubSplitWorkspaceScreenProps = Omit<HubDirectoryScreenProps, "bodyFlex"> & {
  /** Wrapper around split panes (threads rail + panel, notes list + editor, …). */
  bodyClassName?: string;
};

const DEFAULT_BODY_CLASS = "flex min-h-0 flex-1 overflow-hidden";

/**
 * Golden **inbox-split** / **workspace-composer** template shell.
 * Hub chrome + FilterBar + optional KPI/charts + flex body for master-detail split.
 * Golden: P0020 NotesHubChrome · P0016 InboxHubChrome.
 */
export function HubSplitWorkspaceScreen({
  bodyClassName = DEFAULT_BODY_CLASS,
  children,
  ...rest
}: HubSplitWorkspaceScreenProps) {
  return (
    <HubDirectoryScreen bodyFlex {...rest}>
      <div className={bodyClassName}>{children}</div>
    </HubDirectoryScreen>
  );
}
