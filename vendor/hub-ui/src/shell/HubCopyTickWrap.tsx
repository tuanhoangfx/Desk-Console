import type { ReactNode } from "react";
import { Check } from "lucide-react";
import "./hub-copy-tick-wrap.css";

export type HubCopyTickWrapProps = {
  copied: boolean;
  children: ReactNode;
  className?: string;
  tickClassName?: string;
};

/** Fixed slot for copy-success tick — pill/chip size stays stable (Todo, 2FA, Notes). */
export function HubCopyTickWrap({
  copied,
  children,
  className = "",
  tickClassName = "",
}: HubCopyTickWrapProps) {
  return (
    <span className={`hub-copy-tick-wrap ${className}`.trim()}>
      {children}
      <span className="hub-copy-tick-wrap__slot" aria-hidden>
        {copied ? (
          <Check size={10} className={`hub-copy-tick-wrap__tick ${tickClassName}`.trim()} />
        ) : null}
      </span>
    </span>
  );
}
