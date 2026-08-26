import { useLayoutEffect, useMemo, useRef, type ReactNode, type Ref } from "react";
import { HubDirectoryLogLabel } from "./HubDirectoryLogLabel";
import { HubAdmSearchHighlightText } from "../shell/HubAdmSearchHighlightText";
import { HubTwofaCopyControl } from "../shell/HubTwofaCopyControl";
import { HUB_ADM_LOG_MUTED_CLASS } from "../shell/hubAccountDetailModal";
import { formatHubRelativeTime } from "../lib/format-hub-relative-time";
import { formatHubTimestampCompact } from "../lib/format-hub-timestamp-compact";
import { DirectoryEmptyDash, isDirectoryEmptyLabel } from "../lib/directory-empty-label";
import type { HubEntityLogChange, HubEntityLogEntry, HubEntityLogFieldMeta } from "../lib/hub-entity-log";
import {
  flattenHubEntityLog,
  formatHubEntityLogActionLabel,
  type FlattenHubEntityLogOptions,
  type HubEntityLogRow,
} from "../lib/hub-entity-log-rows";

/**
 * Hub entity change-log rail — P0020 Mail Modal Detail golden (entity-agnostic).
 * Timeline · relative time · field glyph + action label · old → new delta with
 * click-to-copy on each side + row tooltip (`time · Label: before → after`).
 * Shared `twofa-adm-log-*` classes keep the visual identical across every tool.
 * Flatten is newest-first (Status/Own above secrets in the same stamp). After Save
 * the rail scrolls to top so the new rows are visible without a manual pull.
 *
 * Tool-local concerns (masking, Lucide glyphs, bulk flash) plug in via optional
 * render/resolve hooks — keep `TwofaChangeLogList` as a thin wrapper.
 */
type FieldMetaResolver = (field: string) => HubEntityLogFieldMeta;

export function formatHubChangeLogRowTooltip(
  row: HubEntityLogRow,
  fieldMeta: FieldMetaResolver,
): string {
  const time = formatHubTimestampCompact(row.at) || row.at;
  if (row.change) {
    const label = row.fieldLabel ?? fieldMeta(row.change.field).label ?? row.change.field;
    const before = row.change.before ?? "";
    const after = row.change.after ?? "";
    return `${time} · ${label}: ${before} → ${after}`;
  }
  return `${time} · ${row.message ?? ""}`;
}

function isEmptyValue(value: string | undefined): boolean {
  const trimmed = value?.trim();
  return !trimmed || isDirectoryEmptyLabel(trimmed);
}

function LogFieldIcon({ field, fieldMeta }: { field?: string; fieldMeta: FieldMetaResolver }) {
  if (!field) return null;
  const emoji = fieldMeta(field).emoji;
  if (!emoji) return null;
  return (
    <span className="hub-users-th-emoji twofa-adm-log-row__icon" aria-hidden>
      {emoji}
    </span>
  );
}

function LogInlineValue({
  value,
  copyValue,
  variant,
  copyToastLabel,
  renderDisplay,
}: {
  value: string | undefined;
  copyValue?: string;
  variant: "old" | "new" | "single";
  copyToastLabel: string;
  renderDisplay?: (raw: string) => ReactNode;
}) {
  if (isEmptyValue(value)) {
    return (
      <DirectoryEmptyDash className="twofa-adm-log-inline-val twofa-adm-log-inline-val--empty hub-users-cell-muted" />
    );
  }
  const raw = value!.trim();
  const toCopy = (copyValue ?? raw).trim() || raw;
  const display = renderDisplay ? renderDisplay(raw) : <HubAdmSearchHighlightText text={raw} />;
  return (
    <span className="twofa-adm-log-inline-val" onClick={(e) => e.stopPropagation()}>
      <HubTwofaCopyControl
        value={toCopy}
        display={display}
        className={`twofa-adm-log-inline-val__btn twofa-adm-log-inline-val__btn--${variant} hub-adm-detail-value-text hub-adm-detail-value-text--wrap min-w-0${
          variant === "old" ? " hub-adm-detail-value-text--muted" : ""
        }`}
        wrapClassName="twofa-adm-log-inline-val__wrap"
        copyToastLabel={copyToastLabel}
      />
    </span>
  );
}

function LogChangeDelta({
  change,
  changeAt,
  fieldMeta,
  copyToastLabelFor,
  renderValue,
  resolveCopyValue,
}: {
  change: HubEntityLogChange;
  changeAt?: string;
  fieldMeta: FieldMetaResolver;
  copyToastLabelFor?: (field: string) => string;
  renderValue?: (
    field: string,
    raw: string,
    variant: "old" | "new" | "single",
    meta?: { at?: string },
  ) => ReactNode;
  resolveCopyValue?: (
    field: string,
    raw: string,
    variant: "old" | "new" | "single",
    meta?: { at?: string },
  ) => string;
}) {
  const label = fieldMeta(change.field).label || change.field;
  const toast =
    copyToastLabelFor?.(change.field) ??
    (change.field === "password" || /pass/i.test(label) ? "Password copied" : `${label} copied`);
  const meta = { at: changeAt };
  const renderDisplay = renderValue
    ? (raw: string, variant: "old" | "new" | "single") => renderValue(change.field, raw, variant, meta)
    : undefined;
  const copyOf = (raw: string, variant: "old" | "new" | "single") =>
    resolveCopyValue?.(change.field, raw, variant, meta) ?? raw;

  const hasDelta = change.before !== undefined && change.after !== undefined;
  if (!hasDelta) {
    const variant = "single" as const;
    const raw = change.after ?? change.before;
    return (
      <LogInlineValue
        value={raw}
        copyValue={raw != null ? copyOf(raw, variant) : undefined}
        variant={variant}
        copyToastLabel={toast}
        renderDisplay={renderDisplay ? (v) => renderDisplay(v, variant) : undefined}
      />
    );
  }
  return (
    <>
      <LogInlineValue
        value={change.before}
        copyValue={change.before != null ? copyOf(change.before, "old") : undefined}
        variant="old"
        copyToastLabel={toast}
        renderDisplay={renderDisplay ? (v) => renderDisplay(v, "old") : undefined}
      />
      <span className="twofa-adm-log-row__arrow" aria-hidden>
        →
      </span>
      <LogInlineValue
        value={change.after}
        copyValue={change.after != null ? copyOf(change.after, "new") : undefined}
        variant="new"
        copyToastLabel={toast}
        renderDisplay={renderDisplay ? (v) => renderDisplay(v, "new") : undefined}
      />
    </>
  );
}

export type HubChangeLogRowDecoration = {
  className?: string;
  title?: string;
  /** Extra `data-*` attributes (e.g. bulk operation id). */
  dataAttrs?: Record<string, string | undefined>;
  ref?: Ref<HTMLLIElement>;
};

export type HubChangeLogListProps = {
  entries: HubEntityLogEntry[];
  fieldMeta: FieldMetaResolver;
  parseMessage?: FlattenHubEntityLogOptions["parseMessage"];
  isNoOpChange?: FlattenHubEntityLogOptions["isNoOpChange"];
  emptyLabel?: string;
  copyToastLabelFor?: (field: string) => string;
  /** Display override (masking, badges) — copy still uses resolveCopyValue/raw. */
  renderValue?: (
    field: string,
    raw: string,
    variant: "old" | "new" | "single",
    meta?: { at?: string },
  ) => ReactNode;
  /** Override clipboard payload (credential reconstruction). */
  resolveCopyValue?: (
    field: string,
    raw: string,
    variant: "old" | "new" | "single",
    meta?: { at?: string },
  ) => string;
  /** Leading glyph (emoji / Lucide) — defaults to fieldMeta.emoji. */
  renderLeading?: (row: HubEntityLogRow) => ReactNode;
  /** Action / message note — defaults to formatHubEntityLogActionLabel. */
  renderNote?: (row: HubEntityLogRow) => ReactNode;
  /** Per-row className / title / data-attrs / ref (bulk flash highlight). */
  decorateRow?: (row: HubEntityLogRow) => HubChangeLogRowDecoration | undefined;
  /**
   * Override the `<time>` hover tooltip (default = compact absolute timestamp).
   * Use for audit stamps (e.g. “Notified by …”) without adding a visible label.
   */
  resolveTimeTitle?: (row: HubEntityLogRow) => string | undefined;
  newestFirst?: FlattenHubEntityLogOptions["newestFirst"];
  fieldRank?: FlattenHubEntityLogOptions["fieldRank"];
  preserveFieldOrder?: FlattenHubEntityLogOptions["preserveFieldOrder"];
};

export function HubChangeLogList({
  entries,
  fieldMeta,
  parseMessage,
  isNoOpChange,
  emptyLabel = "No changes recorded yet.",
  copyToastLabelFor,
  renderValue,
  resolveCopyValue,
  renderLeading,
  renderNote,
  decorateRow,
  resolveTimeTitle,
  newestFirst,
  fieldRank,
  preserveFieldOrder,
}: HubChangeLogListProps) {
  const listRef = useRef<HTMLOListElement>(null);
  const rows = useMemo(
    () =>
      flattenHubEntityLog(entries, {
        parseMessage,
        isNoOpChange,
        labelFor: (c) => fieldMeta(c.field).label,
        newestFirst,
        fieldRank,
        preserveFieldOrder,
      }),
    [entries, fieldMeta, fieldRank, isNoOpChange, newestFirst, parseMessage, preserveFieldOrder],
  );
  const newestKey = rows[0]?.key ?? "";

  useLayoutEffect(() => {
    if (!newestKey) return;
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = 0;
    const railBody = list
      .closest(".hub-adm-rail--log")
      ?.querySelector<HTMLElement>(".hub-tool-detail-rail__body--scroll");
    if (railBody) railBody.scrollTop = 0;
  }, [newestKey]);

  if (!rows.length) {
    return <p className={HUB_ADM_LOG_MUTED_CLASS}>{emptyLabel}</p>;
  }

  return (
    <ol ref={listRef} className="twofa-adm-log-list">
      {rows.map((row) => {
        const deco = decorateRow?.(row);
        const title = deco?.title ?? formatHubChangeLogRowTooltip(row, fieldMeta);
        const className = ["twofa-adm-log-row", "twofa-adm-log-row--detail", deco?.className]
          .filter(Boolean)
          .join(" ");
        const dataAttrs = deco?.dataAttrs
          ? Object.fromEntries(
              Object.entries(deco.dataAttrs).filter(([, v]) => v != null && v !== ""),
            )
          : undefined;
        return (
          <li key={row.key} ref={deco?.ref} className={className} title={title} {...dataAttrs}>
            <div className="twofa-adm-log-row__head">
              <span className="twofa-adm-log-row__meta">
                <span className={`twofa-adm-log-dot twofa-adm-log-dot--${row.dotIndex}`} aria-hidden />
                <time
                  className="twofa-adm-log-row__time"
                  dateTime={row.at}
                  title={
                    resolveTimeTitle?.(row)?.trim() ||
                    formatHubTimestampCompact(row.at) ||
                    row.at
                  }
                >
                  {formatHubRelativeTime(Date.parse(row.at))}
                </time>
              </span>
              <HubDirectoryLogLabel
                className="twofa-adm-log-row__action"
                leading={
                  renderLeading ? (
                    renderLeading(row)
                  ) : (
                    <LogFieldIcon field={row.change?.field} fieldMeta={fieldMeta} />
                  )
                }
                note={
                  renderNote ? (
                    renderNote(row)
                  ) : (
                    <HubAdmSearchHighlightText text={formatHubEntityLogActionLabel(row)} />
                  )
                }
              />
            </div>
            {row.change ? (
              <div className="twofa-adm-log-row__values">
                <LogChangeDelta
                  change={row.change}
                  changeAt={row.at}
                  fieldMeta={fieldMeta}
                  copyToastLabelFor={copyToastLabelFor}
                  renderValue={renderValue}
                  resolveCopyValue={resolveCopyValue}
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
