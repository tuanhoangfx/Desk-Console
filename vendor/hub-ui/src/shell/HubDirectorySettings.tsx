import { HubDisplayPrefs } from "../display-prefs/HubDisplayPrefs";
import type { HubDisplayPrefsProps } from "../display-prefs/types";

export type HubDirectorySettingsProps = Omit<
  HubDisplayPrefsProps,
  "scope" | "showRange" | "showLimit" | "title"
>;

/**
 * Golden directory Settings trigger (header trailing or footer `sidebarRow`).
 * Products supply their own display data; the shared contract is tab-scoped
 * `Settings` without range/limit controls.
 */
export function HubDirectorySettings(props: HubDirectorySettingsProps) {
  return (
    <HubDisplayPrefs
      {...props}
      title="Settings"
      scope="tab"
      showRange={false}
      showLimit={false}
    />
  );
}
