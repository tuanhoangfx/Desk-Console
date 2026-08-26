import { createContext, useContext, useMemo, type ReactNode } from "react";
import { hubToolLoadingAriaLabel, resolveHubToolIconSrc } from "./resolve-hub-tool-icon";

export type HubToolLoadingValue = {
  toolCode: string;
  toolName: string;
  iconSrc: string;
  ariaLabel: string;
};

const HubToolLoadingContext = createContext<HubToolLoadingValue | null>(null);

export type HubToolLoadingProviderProps = {
  toolCode: string;
  toolName: string;
  /** Defaults to `/icons/tools/{toolCode}.svg` */
  iconSrc?: string;
  children: ReactNode;
};

/** Mount once at app root — all Hub loaders use the tool catalog icon (not per-menu Lucide). */
export function HubToolLoadingProvider({
  toolCode,
  toolName,
  iconSrc,
  children,
}: HubToolLoadingProviderProps) {
  const value = useMemo<HubToolLoadingValue>(
    () => ({
      toolCode,
      toolName,
      iconSrc: iconSrc ?? resolveHubToolIconSrc(toolCode),
      ariaLabel: hubToolLoadingAriaLabel(toolName),
    }),
    [iconSrc, toolCode, toolName],
  );
  return <HubToolLoadingContext.Provider value={value}>{children}</HubToolLoadingContext.Provider>;
}

export function useHubToolLoading(): HubToolLoadingValue {
  const ctx = useContext(HubToolLoadingContext);
  if (!ctx) {
    throw new Error("useHubToolLoading requires HubToolLoadingProvider at app root");
  }
  return ctx;
}

export function useHubToolLoadingOptional(): HubToolLoadingValue | null {
  return useContext(HubToolLoadingContext);
}
