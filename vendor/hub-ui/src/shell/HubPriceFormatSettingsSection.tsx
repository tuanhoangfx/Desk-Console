import { SettingsAdmSection } from "../display-prefs/SettingsAdmSection";
import { HubPriceFormatField, type HubPriceFormatFieldProps } from "./HubPriceFormatField";

/**
 * Settings → Display Format frame — Mail Modal section pill (💰 Format) + Layout 3
 * one-slot HubAdm field (does not span the full row).
 */
export function HubPriceFormatSettingsSection(props: HubPriceFormatFieldProps) {
  return (
    <SettingsAdmSection label="Format" emoji="💰">
      <HubPriceFormatField {...props} standalone={props.standalone ?? true} />
    </SettingsAdmSection>
  );
}
