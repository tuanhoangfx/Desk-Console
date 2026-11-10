import type { AppScreen } from "../../lib/app-screen";

/**
 * First-run guided setup overlay (in-app UX). The public illustrated guide and video live on
 * the P0008 Landing Platform (`sites/sync`) — keep these five steps in the same order.
 */
export interface OnboardingStep {
  stepNumber: number;
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  bullets: string[];
  targetScreen: AppScreen;
  ctaLabel: string;
}

export const P0009_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    stepNumber: 1,
    id: "connect-drive",
    badge: "Step 01 · Drives",
    title: "Connect Google Drive accounts",
    subtitle:
      "Sign in to one or more Google Drive accounts. The browser consent returns to a local callback (127.0.0.1:53682) and the token is stored in rclone.conf.",
    bullets: [
      "Open Drives in the sidebar, then press + New or Sign in on an account row.",
      "Each signed-in account shows its quota and folder/file counts.",
    ],
    targetScreen: "drives",
    ctaLabel: "Open Drives",
  },
  {
    stepNumber: 2,
    id: "create-job",
    badge: "Step 02 · New job",
    title: "Create a sync job",
    subtitle:
      "On Jobs, press + New. Pick the mode (Two-way, Local → Drive or Drive → Local), the local folder, the Drive folder and the settle time.",
    bullets: [
      "Folders are picked from an inline tree — you can create a new folder in place.",
      "Settle time (20s by default) waits for saves to finish before a sync starts.",
    ],
    targetScreen: "jobs",
    ctaLabel: "Open Jobs",
  },
  {
    stepNumber: 3,
    id: "monitor-split",
    badge: "Step 03 · Monitor",
    title: "Watch jobs, History and Console",
    subtitle:
      "The Jobs table sits beside the History of runs and the live rclone Console. KPI cards filter the table by state.",
    bullets: [
      "Start, stop or retry a job from its row, or many at once from the toolbar.",
      "Console filters: All, SYNC, DIFF, CONF, SYS.",
    ],
    targetScreen: "jobs",
    ctaLabel: "Open Jobs",
  },
  {
    stepNumber: 4,
    id: "inspect-tree",
    badge: "Step 04 · Job detail",
    title: "Compare Local and Drive folders",
    subtitle:
      "Click a job row to open its detail: settings, the merged Local ↔ Drive folder tree with Synced / Local / Drive / Diff badges, notes and log.",
    bullets: [
      "Conflict copies (.conflict-<stamp>) can be resolved with Keep Local or Keep Drive.",
      "The discarded copy goes to the local Folder Sync trash.",
    ],
    targetScreen: "jobs",
    ctaLabel: "Open Jobs",
  },
  {
    stepNumber: 5,
    id: "system-safety",
    badge: "Step 05 · System",
    title: "Network limits, proxy and safety",
    subtitle:
      "System holds the bandwidth / API rate / transfer limits, the global proxy with Direct failover, and the trash, backup and conflict folders.",
    bullets: [
      "Test Connection checks the proxy and the Google Drive API.",
      "Drive deletes go to Google Drive Trash; local deletes go to a timestamped backup folder.",
    ],
    targetScreen: "system",
    ctaLabel: "Open System",
  },
];
