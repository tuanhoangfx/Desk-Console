export type HubMainShellMode = "directory" | "split";

export type HubMainShellClassOptions = {
  screen: string;
  /** When omitted, uses `splitScreens` membership. */
  mode?: HubMainShellMode;
  /** Screens that use overflow-hidden split layout (inbox, notes, automation, …). */
  splitScreens?: readonly string[];
  extraClassName?: string;
};

/** Golden hub-main class — directory scroll vs split overflow-hidden (P0016 / P0020). */
export function hubMainShellClassName({
  screen,
  mode,
  splitScreens = [],
  extraClassName = "",
}: HubMainShellClassOptions): string {
  const isSplit = mode === "split" || (mode !== "directory" && splitScreens.includes(screen));
  const screenClass = `hub-main hub-main--${screen}`;
  const extra = extraClassName ? ` ${extraClassName.trim()}` : "";

  if (isSplit) {
    return `${screenClass} flex min-h-0 flex-1 flex-col min-w-0 overflow-hidden${extra}`;
  }

  return `${screenClass} flex-1 min-h-0 min-w-0 hub-scrollbar overflow-y-auto overflow-x-hidden${extra}`;
}

export type ToolManifestUiShell = {
  golden?: string;
  mainMode?: HubMainShellMode;
  splitScreens?: string[];
  userFooter?: "workspace" | "hub-admin";
};

/**
 * Raw `tool.manifest.json` shape. A JSON import widens literals to `string`, so hosts that pass
 * `toolManifest.uiShell` straight through cannot satisfy `ToolManifestUiShell` (P0005, P0015).
 */
export type ToolManifestUiShellInput = {
  golden?: string;
  mainMode?: string;
  splitScreens?: readonly string[];
  userFooter?: string;
};

function asHubMainShellMode(value: string | undefined): HubMainShellMode | undefined {
  return value === "directory" || value === "split" ? value : undefined;
}

/** Build hub-main class from tool.manifest `uiShell` block. */
export function hubMainShellClassFromManifest(
  screen: string,
  uiShell?: ToolManifestUiShell | ToolManifestUiShellInput | null,
  extraClassName?: string,
): string {
  return hubMainShellClassName({
    screen,
    mode: asHubMainShellMode(uiShell?.mainMode),
    splitScreens: uiShell?.splitScreens ?? [],
    extraClassName,
  });
}

/**
 * Golden hub app shell — the flex row that holds the sidebar and `<main>`.
 *
 * `#root` is a flex *column* (styles/base.css), so a host that renders the sidebar and main as
 * direct root children stacks them: the sidebar takes the full viewport height and main lands
 * below the fold. P0012 shipped exactly that. This row wrapper is what keeps them side by side.
 *
 * Shared because P0020 and P0015 each spelled the same class string out by hand.
 */
export function hubAppShellClassName(extraClassName = ""): string {
  return ["hub-app theme-hub flex h-full min-h-0 min-h-dvh w-full overflow-hidden", extraClassName]
    .filter(Boolean)
    .join(" ");
}
