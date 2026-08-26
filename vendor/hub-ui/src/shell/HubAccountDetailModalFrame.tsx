import type { ReactNode } from "react";

export type HubAccountDetailModalFrameProps = {
  main: ReactNode;
  rail?: ReactNode;
  className?: string;
};

/** Golden 3-frame body — main panel column + right rail (P0020 Mail SSOT). */
export function HubAccountDetailModalFrame({ main, rail, className = "" }: HubAccountDetailModalFrameProps) {
  return (
    <div className={`hub-account-detail-modal__body hub-tool-detail-split__body${className ? ` ${className}` : ""}`}>
      <div className="hub-account-detail-modal__split hub-tool-detail-split">
        {main}
        {rail ? <div className="hub-account-detail-modal__rail">{rail}</div> : null}
      </div>
    </div>
  );
}
