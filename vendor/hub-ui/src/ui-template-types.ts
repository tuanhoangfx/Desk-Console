/**
 * Hub UI screen templates — pick one per route/screen in tool.manifest.json `uiScreens`.
 * See UI_TEMPLATES.md for golden sources, CSS, and parity checklist.
 */
export const HUB_UI_TEMPLATES = [
  "directory",
  "document-toc",
  "workspace-composer",
  "dashboard",
  "system-panels",
  "inbox-split",
  "auth-gate",
] as const;

export type HubUiTemplate = (typeof HUB_UI_TEMPLATES)[number];

/** Legacy tool.manifest / scripts — maps to canonical template id */
export const HUB_UI_TEMPLATE_ALIASES: Record<string, HubUiTemplate> = {
  analytics: "dashboard",
};

export type UiScreenEntry = {
  /** Screen id (route key): bots, overview, notes, dashboard, … */
  screen: string;
  template: HubUiTemplate;
  /** Golden reference for clone: `P0006/bots`, `P0004/users`, … */
  golden?: string;
  /** Optional notes for agents */
  notes?: string;
};

export const GOLDEN_SOURCES: Record<
  HubUiTemplate,
  { primary: string; css: string[]; packageExports: string[] }
> = {
  directory: {
    primary: "Tool/P0004-Tool-Hub/src/features/hub/HubListPage.tsx",
    css: [
      "hub-shell-layout.css",
      "hub-app-tab-header.css",
      "hub-fields.css",
      "hub-users-table.css",
    ],
    packageExports: [
      "HubDirectoryScreen",
      "HubDataTable",
      "HubDirectoryCard",
      "ViewToggle",
      "FilterBar",
      "HubTabScreenBody",
    ],
  },
  dashboard: {
    primary: "Tool/P0004-Tool-Hub/src/features/dashboard/DashboardListPage.tsx",
    css: [
      "hub-shell-layout.css",
      "hub-app-tab-header.css",
      "hub-fields.css",
      "hub-users-table.css",
    ],
    packageExports: [
      "HubDashboardScreen",
      "HubDirectoryCard",
      "HubPaginatedTableShell",
      "HubTabScreenBody",
      "KpiStrip",
      "MiniBarChart",
      "MiniDonut",
      "ViewToggle",
    ],
  },
  "document-toc": {
    primary: "Tool/P0004-Tool-Hub/src/features/overview/ToolOverviewContent.tsx",
    css: ["overview-toc.css (app copy via sync-hub-theme-from-p0004)"],
    packageExports: [],
  },
  "workspace-composer": {
    primary: "Tool/P0020-Data-Box/src/features/notes/NotesWorkspaceScreen.tsx",
    css: ["hub-fields.css", "hub-shell-layout.css"],
    packageExports: ["HubSplitWorkspaceScreen", "FilterBar", "WorkspaceTabHeader"],
  },
  "system-panels": {
    primary: "Tool/P0004-Tool-Hub/src/features/system-hub/SystemHubScreen.tsx",
    css: ["hub-app-tab-header.css", "hub-fields.css"],
    packageExports: ["HubTabChrome", "HubPanel"],
  },
  "inbox-split": {
    primary: "Tool/P0016-ChatCenter/src/features/inbox/InboxHubChrome.tsx",
    css: [
      "hub-shell-layout.css",
      "hub-app-tab-header.css",
      "hub-fields.css",
      "hub-thread-preview.css",
    ],
    packageExports: [
      "HubSplitWorkspaceScreen",
      "DirectorySearchToolbar",
      "FilterBar",
      "HubThreadPreviewThumb",
      "resolveHubThreadPreview",
      "CacheHitBadge",
    ],
  },
  "auth-gate": {
    primary: "packages/hub-ui/src/auth/HubAuthGate.tsx",
    css: ["hub-auth-gate.css"],
    packageExports: [
      "WorkspaceAuthGate",
      "createWorkspaceAuthGate",
      "createWorkspaceAuthGateConfig",
      "HubAuthGate",
      "HubAuthGateModal",
      "HubSidebarUserFooter",
      "HubWorkspaceUserShell",
      "HubAccessDeniedPanel",
      "HubWorkspaceUserModal",
      "HubAuthLogoutChip",
      "HubAuthSessionBadge",
      "HubAuthGateGoldenPreview",
      "formatHubAuthToolInfo",
      "buildWorkspaceUserProfileRows",
    ],
  },
};

export function isHubUiTemplate(value: string): value is HubUiTemplate {
  return (HUB_UI_TEMPLATES as readonly string[]).includes(value);
}

export function resolveHubUiTemplate(value: string): HubUiTemplate | null {
  const id = HUB_UI_TEMPLATE_ALIASES[value] ?? value;
  return isHubUiTemplate(id) ? id : null;
}
