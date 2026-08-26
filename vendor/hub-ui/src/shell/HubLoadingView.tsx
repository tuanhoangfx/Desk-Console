import { createPortal } from "react-dom";
import { Gauge, type LucideIcon } from "lucide-react";
import { useHubToolLoadingOptional } from "../loading/HubToolLoadingContext";
import { compactIconSize } from "../ui-scale";
import { ensureHubTabLoaderRoot, HUB_TAB_LOADER_ROOT_ID } from "../loading/hub-loader-dom";

export type HubLoadingViewProps = {
  /** @deprecated Prefer HubToolLoadingProvider + iconSrc (tool catalog mark). */
  icon?: LucideIcon;
  /** Tool catalog SVG — golden when set or provided by HubToolLoadingProvider. */
  iconSrc?: string;
  /** Defaults to provider ariaLabel (`Loading {toolName}`). */
  ariaLabel?: string;
  variant?: "full" | "overlay" | "skeleton";
  /** When false, skip portal overlay (hidden/inactive tabs must not block the active screen). */
  enabled?: boolean;
  /** When false, render inline in the parent (modals / nested panels). Default: portaled main-pane center. */
  portaled?: boolean;
  /**
   * Inline overlay only — capture pointer events (Save/busy on detail modal).
   * Default inline loaders stay `pointer-events: none`.
   */
  blocking?: boolean;
};

export function HubLoaderOrb({
  Icon,
  iconSrc,
}: {
  Icon?: LucideIcon;
  iconSrc?: string;
}) {
  const iconSize = compactIconSize(20);
  const gaugeSize = compactIconSize(14);
  return (
    <div className="hub-loader-orb" aria-hidden>
      <span className="hub-loader-orb__ring" />
      <span className="hub-loader-orb__ring hub-loader-orb__ring--dash" />
      <span className="hub-loader-orb__ring hub-loader-orb__ring--inner" />
      <span className="hub-loader-orb__glow" />
      <span className="hub-loader-orb__icon-box">
        {iconSrc ? (
          <img
            src={iconSrc}
            alt=""
            width={iconSize}
            height={iconSize}
            className="hub-loader-orb__tool-icon"
            draggable={false}
            decoding="async"
          />
        ) : Icon ? (
          <Icon size={iconSize} className="text-indigo-300" strokeWidth={1.75} />
        ) : null}
      </span>
      <Gauge size={gaugeSize} className="hub-loader-orb__gauge" strokeWidth={2} aria-hidden />
    </div>
  );
}

export function HubLoadingView({
  icon: Icon,
  iconSrc,
  ariaLabel,
  variant = "full",
  enabled = true,
  portaled = true,
  blocking = false,
}: HubLoadingViewProps) {
  const toolLoading = useHubToolLoadingOptional();
  const resolvedIconSrc = iconSrc ?? toolLoading?.iconSrc;
  const resolvedIcon = resolvedIconSrc ? undefined : (Icon ?? Gauge);
  const resolvedAria = ariaLabel ?? toolLoading?.ariaLabel ?? "Loading";

  if (!enabled) return null;
  const dim = variant === "overlay" || variant === "skeleton";
  const inlineClass = [
    "hub-tab-loader-inline",
    dim ? "hub-tab-loader-inline--dim" : "",
    blocking ? "hub-tab-loader-inline--blocking" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const node = (
    <div
      className={
        portaled
          ? `hub-tab-loader-fill${dim ? " hub-tab-loader-fill--dim" : ""}`
          : inlineClass
      }
      role="status"
      aria-label={resolvedAria}
      aria-live="polite"
      aria-busy={blocking || undefined}
    >
      <HubLoaderOrb Icon={resolvedIcon} iconSrc={resolvedIconSrc} />
    </div>
  );
  if (!portaled) return node;
  const root =
    typeof document !== "undefined"
      ? (document.getElementById(HUB_TAB_LOADER_ROOT_ID) ?? ensureHubTabLoaderRoot())
      : null;
  if (root) return createPortal(node, root);
  return node;
}

/** Golden Suspense / pane loader — tool icon from HubToolLoadingProvider (P0020 Mail parity). */
export function HubToolLoadingView(props: Omit<HubLoadingViewProps, "icon" | "iconSrc">) {
  return <HubLoadingView {...props} />;
}
