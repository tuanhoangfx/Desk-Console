import { UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { compactIconSize } from "../ui-scale";
import { SettingsSubsection, ToggleRow } from "./primitives";

export type HubSettingsExtrasProps = {
  /** Tool-specific subsections (List sort, Local health poll, …). */
  children?: ReactNode;
  /** Anonymous session toggle — omit both to hide App mode block. */
  offline?: boolean;
  onOfflineToggle?: () => void;
  /** Extra toggles under App mode (2FA mask password, …). */
  appModeExtras?: ReactNode;
};

/** Golden Settings Display extras — tool slots + optional App mode block. */
export function HubSettingsExtras({
  children,
  offline,
  onOfflineToggle,
  appModeExtras,
}: HubSettingsExtrasProps) {
  const showAppMode = offline !== undefined && onOfflineToggle !== undefined;

  return (
    <>
      {children}
      {showAppMode ? (
        <SettingsSubsection
          label="App mode"
          icon={<UserRound size={compactIconSize(11)} className="text-violet-300" />}
        >
          <ToggleRow label="Anonymous mode (limited features)" on={offline} onChange={onOfflineToggle} />
          {appModeExtras}
        </SettingsSubsection>
      ) : null}
    </>
  );
}
