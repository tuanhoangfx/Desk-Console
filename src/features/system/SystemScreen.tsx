import { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import {
  HubListChromeHeader,
  HubTocSectionHighlightProvider,
  HubTocSectionNav,
  HubToolDetailSection,
  type HubTocNavItem,
} from "@tool-workspace/hub-ui";
import { TabHeaderActions } from "../../components/TabHeaderActions";
import { deskApi } from "../../lib/api";
import { deskVersionMetaItems } from "../../lib/app-release";

const DESK_SYSTEM_SCROLL = "#desk-system-toc-scroll";

const DESK_SYSTEM_TOC: readonly HubTocNavItem[] = [
  { id: "desk-hotkeys", label: "Hotkeys", emoji: "⌨️" },
  { id: "desk-host", label: "Host", emoji: "🖥️" },
  { id: "desk-data", label: "Data", emoji: "💾" },
];

const DESK_SYSTEM_SECTION_IDS = DESK_SYSTEM_TOC.map((item) => item.id);

/** P0004 OverviewTocNav golden — document-toc System tab. */
export function OverviewTocNav() {
  return (
    <aside className="overview-toc overview-toc-nav relative z-10 w-[var(--overview-toc-w,11rem)] shrink-0">
      <HubTocSectionNav items={DESK_SYSTEM_TOC} scrollRootSelector={DESK_SYSTEM_SCROLL} />
    </aside>
  );
}

export function SystemScreen() {
  const [hotkeyHint, setHotkeyHint] = useState("Set the paste-picker shortcut in Settings → Desk.");
  const [labels, setLabels] = useState({ picker: "Ctrl+Alt+V", capture: "Ctrl+Alt+S" });

  useEffect(() => {
    void deskApi
      .hotkeys()
      .then((data) => {
        setLabels(data.labels);
        setHotkeyHint(
          `History (Ctrl+C) and Samples. ${data.labels.picker} opens the paste picker. ${data.labels.capture} captures the screen.`,
        );
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <HubListChromeHeader
        ariaLabel="System"
        titleIcon={Settings2}
        titleIconClass="text-cyan-300"
        title="System"
        metaItems={deskVersionMetaItems()}
        versionReleaseNotesCode="P0001"
        actions={<TabHeaderActions />}
      />
      <HubTocSectionHighlightProvider
        sectionIds={DESK_SYSTEM_SECTION_IDS}
        scrollRootSelector={DESK_SYSTEM_SCROLL}
      >
        <div className="flex min-h-0 flex-1">
          <OverviewTocNav />
          <div
            id="desk-system-toc-scroll"
            className="hub-split-scroll min-h-0 flex-1 overflow-auto px-4 py-3"
          >
            <HubToolDetailSection id="desk-hotkeys" title="⌨️ Hotkeys">
              <p className="text-sm text-[var(--muted)]">{hotkeyHint}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Paste picker {labels.picker}. Capture {labels.capture}. Change shortcuts in Settings →
                Desk. Do not use Win+V.
              </p>
            </HubToolDetailSection>
            <HubToolDetailSection id="desk-host" title="🖥️ Host">
              <p className="text-sm text-[var(--muted)]">
                Keep Desk Console (tray) running for the Windows hotkey. Host :6010 watches the
                clipboard on 127.0.0.1 only.
              </p>
            </HubToolDetailSection>
            <HubToolDetailSection id="desk-data" title="💾 Data">
              <p className="text-sm text-[var(--muted)]">
                History and Samples live under %APPDATA%\desk-console (clips.json, samples.json,
                hotkeys.json).
              </p>
            </HubToolDetailSection>
          </div>
        </div>
      </HubTocSectionHighlightProvider>
    </div>
  );
}
