import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  HubListChromeHeader,
  type TabHeaderStatItem,
} from "@tool-workspace/hub-ui";
import { deskVersionMetaItems } from "../lib/app-release";
import { DESK_SCREEN_TITLE_EMOJI } from "../features/desk/desk-directory-stickers";
import { useDeskDesktopUpdate } from "../hooks/useDeskDesktopUpdate";
import type { AppScreen } from "../lib/app-screen";

type Props = {
  ariaLabel: string;
  title: string;
  titleIcon: LucideIcon;
  titleIconClass?: string;
  screen?: AppScreen;
  centerStats?: TabHeaderStatItem[];
  actions?: ReactNode;
};

/** Tab header — P0001 golden: version meta left, stats center, ops right. */
export function FolderSyncTabHeader({
  ariaLabel,
  title,
  titleIcon,
  titleIconClass = "text-indigo-300",
  screen,
  centerStats = [],
  actions,
}: Props) {
  const emoji = screen ? DESK_SCREEN_TITLE_EMOJI[screen] : undefined;
  const desktopUpdate = useDeskDesktopUpdate();
  return (
    <HubListChromeHeader
      ariaLabel={ariaLabel}
      titleIcon={titleIcon}
      titleIconClass={titleIconClass}
      titleEmojiGlyph={emoji}
      title={title}
      metaItems={deskVersionMetaItems()}
      versionReleaseNotesCode="P0001"
      versionReleaseNotesDesktopUpdate={desktopUpdate}
      centerStats={centerStats}
      actions={actions}
      embedded={false}
    />
  );
}
