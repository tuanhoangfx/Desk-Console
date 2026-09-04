import { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import { DESK_SCREEN_TITLE_EMOJI } from "../desk/desk-directory-stickers";
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
  const headerActions = <TabHeaderActions />;
  const [hotkeyHint, setHotkeyHint] = useState("Set the paste-picker shortcut in Settings → Desk.");
  const [labels, setLabels] = useState({ picker: "Ctrl+Shift+Q" });
  const [dataMeta, setDataMeta] = useState<{
    dataRoot: string;
    port: number;
    syncPlane: string;
    accountLabel: string;
  } | null>(null);

  useEffect(() => {
    void deskApi
      .hotkeys()
      .then((data) => {
        setLabels(data.labels);
        setHotkeyHint(
          `History (Ctrl+C) and Samples. ${data.labels.picker} opens the paste picker.`,
        );
      })
      .catch(() => {});
    void deskApi
      .meta()
      .then((data) => {
        setDataMeta({
          dataRoot: data.dataRoot,
          port: data.port,
          syncPlane: data.syncPlane,
          accountLabel: data.accountLabel,
        });
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <HubListChromeHeader
        ariaLabel="System"
        titleIcon={Settings2}
        titleEmojiGlyph={DESK_SCREEN_TITLE_EMOJI.system}
        titleIconClass="text-cyan-300"
        title="System"
        metaItems={deskVersionMetaItems()}
        versionReleaseNotesCode="P0001"
        actions={headerActions}
      />
      <HubTocSectionHighlightProvider sectionIds={DESK_SYSTEM_SECTION_IDS} scrollRootSelector={DESK_SYSTEM_SCROLL}>
        <div className="flex min-h-0 flex-1">
          <OverviewTocNav />
          <div id="desk-system-toc-scroll" className="hub-split-scroll min-h-0 flex-1 overflow-auto px-4 py-3">
            <HubToolDetailSection id="desk-hotkeys" title="⌨️ Hotkeys">
              <p className="text-sm text-[var(--muted)]">{hotkeyHint}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Paste picker {labels.picker}. Change shortcuts in Settings → Desk. Do not use Win+V or Win+Z (Snap).
              </p>
            </HubToolDetailSection>
            <HubToolDetailSection id="desk-host" title="🖥️ Host">
              <p className="text-sm text-[var(--muted)]">
                Keep Desk Console (tray) running for the Windows hotkey. Host :6010 watches the clipboard on 127.0.0.1
                only.
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Dev (P0003 parity): quit packaged Desk Console, then{" "}
                <code className="rounded bg-white/5 px-1">pnpm dev</code> — Vite :5180 HMR + isolated tray on :6011.
                After <code className="rounded bg-white/5 px-1">electron/</code> edits:{" "}
                <code className="rounded bg-white/5 px-1">pnpm dev:desktop-reload</code>. Dist-watch mode:{" "}
                <code className="rounded bg-white/5 px-1">pnpm dev:desktop-only</code>.
              </p>
            </HubToolDetailSection>
            <HubToolDetailSection id="desk-data" title="💾 Data">
              <p className="text-sm text-[var(--muted)]">
                Account: <strong className="text-hub-text">{dataMeta?.accountLabel ?? "Local"}</strong> — sync plane{" "}
                <strong className="text-hub-text">{dataMeta?.syncPlane ?? "local"}</strong> (this machine only; not Hub
                / P0005 CRM vault). Clips do not follow Login &amp; Sync SSOT until a future cloud plane is wired.
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Active store:{" "}
                <code className="rounded bg-white/5 px-1 break-all">{dataMeta?.dataRoot ?? "%APPDATA%\\desk-console*"}</code>{" "}
                (host :{dataMeta?.port ?? "6010"}). Files: clips.json, samples.json, hotkeys.json.
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Dev isolated: <code className="rounded bg-white/5 px-1">desk-console-dev</code> + API :6011. Packaged /
                prod: <code className="rounded bg-white/5 px-1">desk-console</code> + :6010. Two windows differ when
                they hit different host ports or data folders — not two accounts.
              </p>
            </HubToolDetailSection>
          </div>
        </div>
      </HubTocSectionHighlightProvider>
    </div>
  );
}
