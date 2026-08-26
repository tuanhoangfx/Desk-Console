import type { LucideIcon } from "lucide-react";
import { HubLoadingView } from "./HubLoadingView";

export type HubScreenChunkFallbackProps = {
  /** @deprecated Prefer HubToolLoadingProvider — tool catalog icon is the SSOT. */
  icon?: LucideIcon;
  ariaLabel?: string;
  variant?: "full" | "overlay" | "skeleton";
  /** When false, skip portal overlay (hidden/inactive tabs must not block the active screen). */
  enabled?: boolean;
  /** Portaled main-pane center (P0004 default). Use portaled={false} only inside modals/panels. */
  portaled?: boolean;
};

/** Suspense fallback for lazy route chunks — orb loader instead of plain text. */
export function HubScreenChunkFallback({
  icon,
  ariaLabel,
  variant = "overlay",
  enabled = true,
  portaled = true,
}: HubScreenChunkFallbackProps) {
  return (
    <HubLoadingView
      icon={icon}
      ariaLabel={ariaLabel}
      variant={variant}
      enabled={enabled}
      portaled={portaled}
    />
  );
}

/** Golden chunk fallback — tool icon from HubToolLoadingProvider. */
export function HubToolScreenChunkFallback(props: Omit<HubScreenChunkFallbackProps, "icon" | "ariaLabel"> & {
  ariaLabel?: string;
}) {
  return <HubScreenChunkFallback {...props} />;
}
