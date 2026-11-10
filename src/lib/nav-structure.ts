import type { LucideIcon } from "lucide-react";
import { flatMapNavScreenItems, type NavStructureEntry } from "@tool-workspace/hub-ui";
import { CalendarClock, ClipboardList, Cloud, FolderKanban, PlayCircle, TrendingUp } from "lucide-react";
import type { AppScreen } from "./app-screen";

/** Sidebar nav SSOT — Dashboard · Drive Sync (Jobs · Drives) · Clips · Runners · Cron. */
export const NAV_SUBNAV_PREFIX = "p0001";

export const NAV_GROUP_IDS = ["drive-sync"] as const;

export const NAV_STRUCTURE: NavStructureEntry<AppScreen, (typeof NAV_GROUP_IDS)[number]>[] = [
  { kind: "screen", screen: "dashboard", label: "Dashboard", icon: TrendingUp, iconTone: "amber" },
  {
    kind: "group",
    navMode: "screen",
    id: "drive-sync",
    label: "Drive Sync",
    icon: Cloud,
    iconTone: "sky",
    brandIcon: "google-drive",
    defaultScreen: "jobs",
    children: [
      { screen: "jobs", label: "Jobs", icon: FolderKanban, iconTone: "indigo" },
      { screen: "drives", label: "Drives", icon: Cloud, iconTone: "sky" },
    ],
  },
  { kind: "screen", screen: "clips", label: "Clips", icon: ClipboardList, iconTone: "emerald" },
  { kind: "screen", screen: "runners", label: "Runners", icon: PlayCircle, iconTone: "amber" },
  { kind: "screen", screen: "cron", label: "Cron", icon: CalendarClock, iconTone: "cyan" },
];

const NAV_TONE_CLASS: Record<string, string> = {
  emerald: "text-emerald-300",
  indigo: "text-indigo-300",
  sky: "text-sky-300",
  amber: "text-amber-300",
  cyan: "text-cyan-300",
};

/** One icon for the sidebar row and the tab header. */
export function navScreenChrome(screen: AppScreen): { icon: LucideIcon; iconClass: string } {
  const entry = flatMapNavScreenItems(NAV_STRUCTURE).find((row) => row.screen === screen);
  const icon = entry?.icon || FolderKanban;
  const tone = entry?.iconTone || "indigo";
  return { icon, iconClass: NAV_TONE_CLASS[tone || ""] || "text-indigo-300" };
}
