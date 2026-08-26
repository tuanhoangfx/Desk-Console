import { Plus, type LucideIcon } from "lucide-react";
import {
  HUB_SIDEBAR_NEW_ACTION_ICON_CLASS,
  HUB_SIDEBAR_NEW_ACTION_LABEL,
} from "./hub-sidebar-new-action";
import { HubSidebarFooterButton, type HubSidebarFooterButtonProps } from "./HubSidebarFooterButton";

export type HubSidebarNewFooterButtonProps = Omit<
  HubSidebarFooterButtonProps,
  "icon" | "label" | "iconClass"
> & {
  icon?: LucideIcon;
  iconClass?: string;
  label?: string;
};

/** SSOT sidebar create CTA — emerald icon + `New` label. */
export function HubSidebarNewFooterButton({
  icon: Icon = Plus,
  iconClass = HUB_SIDEBAR_NEW_ACTION_ICON_CLASS,
  label = HUB_SIDEBAR_NEW_ACTION_LABEL,
  ...rest
}: HubSidebarNewFooterButtonProps) {
  return <HubSidebarFooterButton icon={Icon} iconClass={iconClass} label={label} {...rest} />;
}
