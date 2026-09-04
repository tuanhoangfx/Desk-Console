import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { HubListChromeHeader, HubSplitWorkspaceScreen, useHubChromePrefs } from "@tool-workspace/hub-ui";
import { deskVersionMetaItems } from "../../lib/app-release";
import { deskTabHeaderChromeProps } from "../../lib/desk-tab-header-chrome";
import { TabHeaderActions } from "../../components/TabHeaderActions";

type Props = {
  ariaLabel: string;
  title: string;
  titleIcon: LucideIcon;
  titleIconClass?: string;
  titleEmojiGlyph?: string;
  sectionRuleLabel?: string;
  bodyClassName?: string;
  headerActions?: ReactNode;
  children: ReactNode;
};

/** P0003 ProfilesHubChrome / P0020 NotesHubChrome parity — split rail tabs (Runners · Tasks). */
export function DeskSplitHubChrome({
  ariaLabel,
  title,
  titleIcon,
  titleIconClass,
  titleEmojiGlyph,
  sectionRuleLabel,
  bodyClassName = "hub-split-workspace__body desk-ops-workspace__body flex min-h-0 flex-1 overflow-hidden",
  headerActions = <TabHeaderActions />,
  children,
}: Props) {
  const chromePrefs = useHubChromePrefs();
  const headerChrome = deskTabHeaderChromeProps(false, chromePrefs);

  return (
    <div className="desk-ops-workspace hub-split-workspace anim-fade flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <HubSplitWorkspaceScreen
        bodyClassName={bodyClassName}
        sectionRuleLabel={sectionRuleLabel}
        header={
          <HubListChromeHeader
            ariaLabel={ariaLabel}
            titleIcon={titleIcon}
            titleIconClass={titleIconClass}
            titleEmojiGlyph={titleEmojiGlyph}
            title={title}
            metaItems={deskVersionMetaItems()}
            versionReleaseNotesCode="P0001"
            actions={headerActions}
            embedded={headerChrome.embedded}
          />
        }
      >
        {children}
      </HubSplitWorkspaceScreen>
    </div>
  );
}
