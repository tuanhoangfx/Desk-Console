import { HubContactOpenAction } from "./HubContactOpenAction";

export type HubPhoneCallActionProps = {
  phone: string;
  variant?: "directory" | "adm";
  className?: string;
  title?: string;
};

/** @deprecated Prefer `HubContactOpenAction` with `channel="phone"`. */
export function HubPhoneCallAction({ phone, variant = "directory", className = "", title = "Call" }: HubPhoneCallActionProps) {
  return (
    <HubContactOpenAction channel="phone" value={phone} variant={variant} className={className} title={title} />
  );
}
