import {
  HubDirectoryEmptyCell,
  HubUsersStatusLabel,
  isDirectoryEmptyLabel,
} from "@tool-workspace/hub-ui";
import { deskStatusDotTone, deskStatusKpiDetail, deskStatusLive } from "./desk-directory-stickers";
import type { HubUsersStatusTone } from "@tool-workspace/hub-ui";

type Props = {
  status: string;
  tone?: HubUsersStatusTone;
  screen?: string;
  className?: string;
};

/** Status cell/card/detail — Campaign P0002 / Jobs P0001 SSOT glowing statusDot + HubUsersStatusLabel popover. */
export function DeskStatusKpiLabel({ status, tone, screen, className = "" }: Props) {
  const label = status.trim();
  if (isDirectoryEmptyLabel(label)) {
    return (
      <HubDirectoryEmptyCell className={`hub-users-cell-muted${className ? ` ${className}` : ""}`} />
    );
  }
  return (
    <span className={className || undefined}>
      <HubUsersStatusLabel
        label={label}
        tone={tone ?? deskStatusDotTone(label, screen)}
        live={deskStatusLive(label)}
        capitalize={false}
        title={deskStatusKpiDetail(label, screen)}
        popoverTitle={`🚦 Status · ${label}`}
      />
    </span>
  );
}
