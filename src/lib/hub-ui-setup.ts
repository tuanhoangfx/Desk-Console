import { configureHubChromePrefs, configureHubUrlPrefs } from "@tool-workspace/hub-ui";

export function setupHubUi() {
  configureHubUrlPrefs({ usePrefsChangeEvent: true });
  configureHubChromePrefs(() => ({ headerPin: true, searchPin: true }));
}
