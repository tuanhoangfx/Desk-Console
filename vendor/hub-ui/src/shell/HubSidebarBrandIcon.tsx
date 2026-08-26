import { HubAuthBrandIcon } from "../auth/HubAuthBrandIcon";

/** Sidebar brand mark — P0020 golden: 36px (h-9), no auth-gate cyan glow. */
export const HUB_SIDEBAR_BRAND_ICON_CLASS = "!h-9 !w-9 ![filter:none]";

export type HubSidebarBrandIconProps = {
  src: string;
  alt: string;
};

export function HubSidebarBrandIcon({ src, alt }: HubSidebarBrandIconProps) {
  return <HubAuthBrandIcon src={src} alt={alt} className={HUB_SIDEBAR_BRAND_ICON_CLASS} />;
}
