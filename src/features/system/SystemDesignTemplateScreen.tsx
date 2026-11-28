import { Settings2 } from "lucide-react";
import { DESK_SCREEN_TITLE_EMOJI } from "../desk/desk-directory-stickers";
import { DeskSplitHubChrome } from "../desk/DeskSplitHubChrome";
import { DesignTemplatePage } from "./design-template/DesignTemplatePage";

export function SystemDesignTemplateScreen() {
  return (
    <DeskSplitHubChrome
      ariaLabel="System Design Template"
      title="System"
      titleIcon={Settings2}
      titleIconClass="text-cyan-300"
      titleEmojiGlyph={DESK_SCREEN_TITLE_EMOJI.system}
      sectionRuleLabel="Design Template"
      bodyClassName="hub-split-workspace__body flex min-h-0 flex-1 overflow-hidden"
    >
      <DesignTemplatePage />
    </DeskSplitHubChrome>
  );
}
