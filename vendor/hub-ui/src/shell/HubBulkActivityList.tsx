import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { HubActivityTimestampLabel } from "../content/HubActivityTimestampLabel";
import {
  HUB_FLASH_BORDER_ROW_CLASS,
  HUB_FLASH_BORDER_SURFACE_CLASS,
  useHubFlashBorder,
} from "../lib/useHubFlashBorder";
import { HUB_ADM_LOG_MUTED_CLASS } from "./hubAccountDetailModal";

/** Default page size for bulk Activity operation cards. */
export const HUB_BULK_ACTIVITY_PAGE_SIZE = 20;

export type HubBulkActivityAccountBase = {
  accountId: string;
  accountLabel: string;
};

export type HubBulkActivityGroup<TAccount extends HubBulkActivityAccountBase = HubBulkActivityAccountBase> = {
  operationId: string;
  at: string;
  summary: string;
  accounts: TAccount[];
};

export type HubBulkActivityListProps<TAccount extends HubBulkActivityAccountBase> = {
  groups: HubBulkActivityGroup<TAccount>[];
  totalOperationCount?: number;
  pageSize?: number;
  highlightOperationId?: string | null;
  emptyMessage?: string;
  loadMoreLabel?: (remaining: number) => string;
  renderOperationTime?: (at: string) => ReactNode;
  renderAccountBody: (account: TAccount) => ReactNode;
  onHighlightConsumed?: () => void;
  onScrollToActivity?: () => void;
  className?: string;
};

function defaultLoadMoreLabel(remaining: number): string {
  const batch = Math.min(remaining, HUB_BULK_ACTIVITY_PAGE_SIZE);
  return `Show ${batch} earlier ${remaining === 1 ? "operation" : "operations"}`;
}

function defaultOperationTime(at: string): ReactNode {
  return (
    <time dateTime={at}>
      <HubActivityTimestampLabel at={at} />
    </time>
  );
}

/** Generic bulk Activity rail — grouped operations, lazy load, optional highlight scroll. */
export function HubBulkActivityList<TAccount extends HubBulkActivityAccountBase>({
  groups,
  totalOperationCount,
  pageSize = HUB_BULK_ACTIVITY_PAGE_SIZE,
  highlightOperationId = null,
  emptyMessage = "No bulk activity recorded yet.",
  loadMoreLabel = defaultLoadMoreLabel,
  renderOperationTime = defaultOperationTime,
  renderAccountBody,
  onHighlightConsumed,
  onScrollToActivity,
  className = "",
}: HubBulkActivityListProps<TAccount>) {
  const total = totalOperationCount ?? groups.length;
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const { flashIds, flash } = useHubFlashBorder();
  const highlightRef = useRef<HTMLDetailsElement | null>(null);
  const consumedHighlightRef = useRef<string | null>(null);

  const visibleGroups = useMemo(() => groups.slice(0, visibleCount), [groups, visibleCount]);
  const remaining = Math.max(0, total - visibleGroups.length);

  useEffect(() => {
    setVisibleCount(pageSize);
    setOpenIds(new Set(groups[0]?.operationId ? [groups[0].operationId] : []));
  }, [groups, pageSize]);

  useEffect(() => {
    if (!highlightOperationId) return;
    const index = groups.findIndex((group) => group.operationId === highlightOperationId);
    if (index >= 0 && index >= visibleCount) {
      setVisibleCount(Math.ceil((index + 1) / pageSize) * pageSize);
    }
  }, [groups, highlightOperationId, pageSize, visibleCount]);

  useEffect(() => {
    if (!highlightOperationId) return;
    if (!groups.some((group) => group.operationId === highlightOperationId)) return;
    if (consumedHighlightRef.current === highlightOperationId) return;
    consumedHighlightRef.current = highlightOperationId;
    flash(highlightOperationId);
    setOpenIds((prev) => new Set([...prev, highlightOperationId]));
    onScrollToActivity?.();
    const frame = window.requestAnimationFrame(() => {
      highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      onHighlightConsumed?.();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [flash, groups, highlightOperationId, onHighlightConsumed, onScrollToActivity]);

  const toggleOpen = useCallback((operationId: string, open: boolean) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (open) next.add(operationId);
      else next.delete(operationId);
      return next;
    });
  }, []);

  if (!groups.length) {
    return <p className={HUB_ADM_LOG_MUTED_CLASS}>{emptyMessage}</p>;
  }

  return (
    <div className={`hub-bulk-activity-list${className ? ` ${className}` : ""}`}>
      {visibleGroups.map((group, index) => {
        const highlighted = highlightOperationId === group.operationId;
        const flashing = flashIds.has(group.operationId);
        const open = openIds.has(group.operationId) || (index === 0 && openIds.size === 0);
        return (
          <details
            key={group.operationId}
            ref={highlighted ? highlightRef : undefined}
            className={`hub-bulk-activity-op ${HUB_FLASH_BORDER_SURFACE_CLASS}${flashing ? ` ${HUB_FLASH_BORDER_ROW_CLASS}` : ""}`}
            open={open}
            onToggle={(event) => toggleOpen(group.operationId, event.currentTarget.open)}
          >
            <summary className="hub-bulk-activity-op__summary">
              <span className="hub-bulk-activity-op__time">{renderOperationTime(group.at)}</span>
              <span className="hub-bulk-activity-op__title">{group.summary}</span>
            </summary>
            <div className="hub-bulk-activity-op__body">
              {group.accounts.map((account) => (
                <section key={account.accountId} className="hub-bulk-activity-account" aria-label={account.accountLabel}>
                  <h4 className="hub-bulk-activity-account__label">{account.accountLabel}</h4>
                  <div className="hub-bulk-activity-account__body">{renderAccountBody(account)}</div>
                </section>
              ))}
            </div>
          </details>
        );
      })}
      {remaining > 0 ? (
        <button
          type="button"
          className="hub-bulk-activity-list__load-more"
          onClick={() => setVisibleCount((count) => count + pageSize)}
        >
          {loadMoreLabel(remaining)}
        </button>
      ) : null}
    </div>
  );
}
