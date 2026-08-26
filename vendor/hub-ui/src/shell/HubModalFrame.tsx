import type { ReactNode } from "react";
import { HubModalCloseButton } from "./HubModalCloseButton";

export type HubModalFrameProps = {
  children: ReactNode;
  onClose: () => void;
  className?: string;
  /** Stop click propagation (default true — use inside modal backdrop). */
  stopPropagation?: boolean;
};

/** Wraps modal shell content; positions shared edge close button outside the panel border. */
export function HubModalFrame({
  children,
  onClose,
  className = "",
  stopPropagation = true,
}: HubModalFrameProps) {
  return (
    <div
      className={`hub-modal-frame${className ? ` ${className}` : ""}`}
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
    >
      <HubModalCloseButton onClose={onClose} />
      {children}
    </div>
  );
}
