import type { ReactNode } from "react";
import { hubRuntimeConsoleLineClass, formatHubRuntimeLogTime } from "../lib/hub-runtime-format";

export function HubRuntimeConsoleTerm({
  legend,
  children,
  className = "",
}: {
  legend?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`hub-runtime-term ${className}`.trim()}>
      {legend ? <div className="hub-runtime-term__legend">{legend}</div> : null}
      <div className="hub-runtime-term__body">{children}</div>
    </div>
  );
}

export function HubRuntimeConsoleLine({
  level,
  time,
  channelBadge,
  source,
  message,
  trailing,
}: {
  level: string;
  time: string;
  channelBadge: ReactNode;
  source: string;
  message: string;
  trailing?: ReactNode;
}) {
  return (
    <div className={`hub-runtime-term__line ${hubRuntimeConsoleLineClass(level)}`.trim()}>
      <span className="hub-runtime-term__time">[{formatHubRuntimeLogTime(time)}]</span>
      {channelBadge}
      <span className="hub-runtime-term__src">{source}</span>
      <span className="hub-runtime-term__msg">{message}</span>
      {trailing}
    </div>
  );
}

export function HubRuntimeConsoleDuration({ children }: { children: ReactNode }) {
  return <span className="hub-runtime-term__dur">{children}</span>;
}
