import type { ReactNode } from "react";
import {
  HubHeaderOpsPanels,
  type HubHeaderOpsPanelsProps,
} from "./HubHeaderOpsPanels";

export type HubUserDirectoryHeaderActionsProps = Pick<
  HubHeaderOpsPanelsProps,
  "log" | "notify"
> & {
  /** A tab-scoped HubDisplayPrefs trigger, provided by the product's user directory adapter. */
  settings: ReactNode;
};

/**
 * Golden User-directory header rail — Notify · Log · Settings.
 * P0004 establishes the pattern; products provide only their display-prefs adapter.
 */
export function HubUserDirectoryHeaderActions({
  log = { variant: "tab" },
  notify,
  settings,
}: HubUserDirectoryHeaderActionsProps) {
  return <HubHeaderOpsPanels log={log} notify={notify} trailing={settings} />;
}
