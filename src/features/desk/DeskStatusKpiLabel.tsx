import { HubUsersStatusLabel } from "@tool-workspace/hub-ui";
import { deskStatusDotTone, deskStatusKpiDetail, deskStatusLive } from "./desk-directory-stickers";

type Props = {
  status: string;
  className?: string;
};

/** Status cell/card/detail — Campaign P0002 / Jobs P0001 SSOT glowing statusDot + HubUsersStatusLabel popover. */
export function DeskStatusKpiLabel({ status, className = "" }: Props) {
  const label = status.trim() || "—";
  if (label === "—") {
    return <span className={`hub-users-cell-muted${className ? ` ${className}` : ""}`}>—</span>;
  }
  return (
    <span className={className || undefined}>
      <HubUsersStatusLabel
        label={label}
        tone={deskStatusDotTone(label)}
        live={deskStatusLive(label)}
        capitalize={false}
        title={deskStatusKpiDetail(label)}
        popoverTitle={`🚦 Status · ${label}`}
      />
    </span>
  );
}
