import { HubDirectoryEmptyCell } from "../lib/directory-empty-label";
import { memo } from "react";
import { HUB_DIRECTORY_TIMESTAMP_CLASS } from "../lib/hub-directory-timestamp";
import { formatHubRelativeTime } from "../lib/format-hub-relative-time";
import { useRelativeNow } from "../lib/use-relative-now";

export type DirectoryRelativeTimeCellProps = {
  ts?: number | null;
  className?: string;
  emptyLabel?: string;
  title?: string;
  format?: (ts: number, now: number) => string;
};

/** Memoized relative time cell — 60s tick re-renders only this node, not the whole table. */
export const DirectoryRelativeTimeCell = memo(function DirectoryRelativeTimeCell({
  ts,
  className,
  emptyLabel,
  title,
  format = formatHubRelativeTime,
}: DirectoryRelativeTimeCellProps) {
  const now = useRelativeNow();
  if (ts == null || !Number.isFinite(ts)) {
    return (
      <span className={className} title={title}>
        {emptyLabel ?? <HubDirectoryEmptyCell />}
      </span>
    );
  }
  const resolvedTitle = title ?? new Date(ts).toLocaleString("en-GB");
  const classNames = [HUB_DIRECTORY_TIMESTAMP_CLASS, className].filter(Boolean).join(" ");
  return (
    <time className={classNames} dateTime={new Date(ts).toISOString()} title={resolvedTitle}>
      {format(ts, now)}
    </time>
  );
});
