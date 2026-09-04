import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import {
  HUB_FILTER_DROPDOWN_LIST_CLASS,
  HUB_FILTER_DROPDOWN_PANEL_CLASS,
  HUB_FILTER_DROPDOWN_PANEL_PORTAL_CLASS,
  HUB_FILTER_DROPDOWN_ROW_CLASS,
  HubFilterDropdownCircle,
  HubFilterDropdownPanelSearch,
  HubFilterDropdownTrigger,
  filterDropdownPanelSearchPlaceholder,
} from "./filter-dropdown-primitives";
import { hubPortalPanelPosition } from "./hub-portal-panel-position";
import { pinSelectedFilterOptions } from "./pin-selected-filter-options";
import { workspacePeriodDotColor, workspacePeriodTriggerIconColor } from "../lib/workspace-period-dot-color";
import type { WorkspacePeriodKey } from "../lib/hub-workspace-period";
import { HubFilterDatePicker } from "./HubFilterDatePicker";

export type HubPeriodOption<T extends string = string> = {
  value: T;
  label: string;
  /** Row dot color — defaults from `workspacePeriodDotColor` when value is a workspace period key. */
  dotColor?: string;
};

export type HubPeriodSelectProps<T extends string = string> = {
  value: T;
  onChange: (value: T) => void;
  options: readonly HubPeriodOption<T>[];
  customMonth?: string;
  onCustomMonthChange?: (month: string) => void;
  customStartDate?: string;
  onCustomStartDateChange?: (date: string) => void;
  customEndDate?: string;
  onCustomEndDateChange?: (date: string) => void;
  monthRangeKey?: T;
  dateRangeKey?: T;
  /** Values that render trigger without accent (e.g. default / all). */
  inactiveKeys?: readonly T[];
  language?: string;
  thisMonthLabel?: string;
  backLabel?: string;
  applyLabel?: string;
  startLabel?: string;
  endLabel?: string;
  className?: string;
  /** Directory toolbar row — `text-xs` to match page size / Display (default `text-sm` for FilterBar). */
  triggerTypoClass?: string;
  /** Native tooltip on period trigger. */
  title?: string;
  /** Optional micro meta after label (e.g. Performance “Weekly” when axis buckets by week). */
  triggerMeta?: string;
};

type PanelView = "list" | "month" | "range";

function formatShortDate(dateString: string, language: string) {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-");
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return new Intl.DateTimeFormat(language, {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(date);
}

function HubMonthPickerPanel({
  value,
  onChange,
  onClose,
  language,
  thisMonthLabel,
  embedded = false,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  onClose?: () => void;
  language: string;
  thisMonthLabel: string;
  embedded?: boolean;
  className?: string;
}) {
  const [currentYear, setDisplayYear] = useState(() => new Date(`${value}-01`).getFullYear());
  const selectedMonth = new Date(`${value}-01`).getMonth();

  useEffect(() => {
    setDisplayYear(new Date(`${value}-01`).getFullYear());
  }, [value]);

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        new Date(currentYear, i).toLocaleString(language, { month: "short" }),
      ),
    [currentYear, language],
  );

  const shellClass = embedded
    ? "rounded-xl bg-[var(--panel)]"
    : HUB_FILTER_DROPDOWN_PANEL_CLASS;

  return (
    <div className={`${shellClass} p-3 ${className}`.trim()}>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setDisplayYear((y) => y - 1)}
          className="rounded-full p-1.5 hover:bg-white/5"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="font-semibold text-[var(--text)]">{currentYear}</span>
        <button
          type="button"
          onClick={() => setDisplayYear((y) => y + 1)}
          className="rounded-full p-1.5 hover:bg-white/5"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {months.map((month, index) => {
          const selected =
            currentYear === new Date(`${value}-01`).getFullYear() && selectedMonth === index;
          return (
            <button
              key={month}
              type="button"
              onClick={() => {
                onChange(`${currentYear}-${(index + 1).toString().padStart(2, "0")}`);
                onClose?.();
              }}
              className={`hub-period-month${selected ? " hub-period-month--selected" : ""}`}
            >
              {month}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2">
        <button
          type="button"
          onClick={() => {
            onChange(new Date().toISOString().slice(0, 7));
            onClose?.();
          }}
          className="hub-period-month-footer text-xs font-semibold hover:underline"
        >
          {thisMonthLabel}
        </button>
      </div>
    </div>
  );
}

/** Golden period filter — value-only trigger · portaled list / month / date-range panels. */
export function HubPeriodSelect<T extends string>({
  value,
  onChange,
  options,
  customMonth = new Date().toISOString().slice(0, 7),
  onCustomMonthChange,
  customStartDate = "",
  onCustomStartDateChange,
  customEndDate = "",
  onCustomEndDateChange,
  monthRangeKey,
  dateRangeKey,
  inactiveKeys = [],
  language = "en",
  thisMonthLabel = "This month",
  backLabel = "Back",
  applyLabel = "Apply",
  startLabel = "Start",
  endLabel = "End",
  className = "",
  triggerTypoClass,
  title = "Filter by creation date",
  triggerMeta,
}: HubPeriodSelectProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<PanelView>("list");
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );

  const reposition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const width = view === "month" ? 256 : view === "range" ? 300 : Math.max(rect.width, 288);
    const estimatedHeight = view === "list" ? Math.min(320, 52 + options.length * 36) : 320;
    const { top, left } = hubPortalPanelPosition(rect, { width, estimatedHeight });
    setPanelPos({ top, left, width });
  }, [view, options.length]);

  useLayoutEffect(() => {
    if (!open) {
      setPanelPos(null);
      return;
    }
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
      setView("list");
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (open) return;
    setSearch("");
  }, [open]);

  const listOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matched = q
      ? options.filter(
          (o) =>
            o.value === value ||
            o.label.toLowerCase().includes(q) ||
            o.value.toLowerCase().includes(q),
        )
      : options;
    return pinSelectedFilterOptions(matched, [value]);
  }, [options, search, value]);

  const triggerValueLabel = useMemo(() => {
    if (monthRangeKey && value === monthRangeKey && customMonth) {
      return new Date(`${customMonth}-01`).toLocaleString(language, {
        month: "long",
        year: "numeric",
      });
    }
    if (dateRangeKey && value === dateRangeKey && customStartDate && customEndDate) {
      return `${formatShortDate(customStartDate, language)} – ${formatShortDate(customEndDate, language)}`;
    }
    return options.find((o) => o.value === value)?.label ?? value;
  }, [
    value,
    customMonth,
    customStartDate,
    customEndDate,
    options,
    language,
    monthRangeKey,
    dateRangeKey,
  ]);

  const defaultClearValue = (inactiveKeys[0] ?? options.find((o) => o.value === "all")?.value ?? options[0]?.value) as
    | T
    | undefined;
  const canClearSelection = Boolean(defaultClearValue) && value !== defaultClearValue;
  const isActive = !inactiveKeys.includes(value);

  const triggerIconColor = workspacePeriodTriggerIconColor(value as WorkspacePeriodKey);
  const displayLabel = triggerMeta ? `${triggerValueLabel} · ${triggerMeta}` : triggerValueLabel;

  const handleSelectPeriod = (range: T) => {
    onChange(range);
    if (monthRangeKey && range === monthRangeKey) {
      setView("month");
      return;
    }
    if (dateRangeKey && range === dateRangeKey) {
      setView("range");
      return;
    }
    setOpen(false);
    setView("list");
  };

  const handleMonthChange = (month: string) => {
    onCustomMonthChange?.(month);
    if (monthRangeKey) onChange(monthRangeKey);
    setOpen(false);
    setView("list");
  };

  const handleApplyRange = () => {
    if (dateRangeKey) onChange(dateRangeKey);
    setOpen(false);
    setView("list");
  };

  const panel =
    open && panelPos ? (
      <div
        ref={panelRef}
        className={HUB_FILTER_DROPDOWN_PANEL_PORTAL_CLASS}
        style={{ top: panelPos.top, left: panelPos.left, width: panelPos.width }}
        role="listbox"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {view === "list" ? (
          <>
            <HubFilterDropdownPanelSearch
              value={search}
              onChange={setSearch}
              placeholder={filterDropdownPanelSearchPlaceholder("period")}
              onClearSelection={
                defaultClearValue
                  ? () => {
                      onChange(defaultClearValue);
                      setOpen(false);
                      setView("list");
                    }
                  : undefined
              }
              clearSelectionEnabled={canClearSelection}
            />
            <div className={HUB_FILTER_DROPDOWN_LIST_CLASS}>
            {listOptions.map((o) => {
              const dotColor = o.dotColor ?? workspacePeriodDotColor(o.value as WorkspacePeriodKey);
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSelectPeriod(o.value);
                  }}
                  className={`${HUB_FILTER_DROPDOWN_ROW_CLASS} ${
                    o.value === value ? "bg-indigo-500/10 text-indigo-200" : "text-[var(--text)]"
                  }`}
                >
                  <HubFilterDropdownCircle checked={o.value === value} />
                  <span
                    className="h-2 w-2 shrink-0 rounded-full ring-1 ring-white/10"
                    style={{ background: dotColor }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-left">{o.label}</span>
                </button>
              );
            })}
            {listOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-[var(--muted)]">No matches</div>
            ) : null}
            </div>
          </>
        ) : null}

        {view === "month" && monthRangeKey && onCustomMonthChange ? (
          <div>
            <button
              type="button"
              onClick={() => setView("list")}
              className="w-full border-b border-white/5 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)] hover:text-[var(--text)]"
            >
              ← {backLabel}
            </button>
            <HubMonthPickerPanel
              value={customMonth}
              onChange={handleMonthChange}
              language={language}
              thisMonthLabel={thisMonthLabel}
              embedded
              className="border-0 shadow-none"
            />
          </div>
        ) : null}

        {view === "range" && dateRangeKey && onCustomStartDateChange && onCustomEndDateChange ? (
          <div className="p-3">
            <button
              type="button"
              onClick={() => setView("list")}
              className="mb-3 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)] hover:text-[var(--text)]"
            >
              ← {backLabel}
            </button>
            <div className="space-y-3">
              <label className="block space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {startLabel}
                </span>
                <HubFilterDatePicker
                  value={customStartDate}
                  onChange={onCustomStartDateChange}
                  placeholder={startLabel}
                  compactTrigger
                  locale={language}
                  triggerClassName="w-full justify-between"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {endLabel}
                </span>
                <HubFilterDatePicker
                  value={customEndDate}
                  onChange={onCustomEndDateChange}
                  placeholder={endLabel}
                  compactTrigger
                  locale={language}
                  triggerClassName="w-full justify-between"
                />
              </label>
              <button
                type="button"
                onClick={handleApplyRange}
                className="hub-tool-detail-modal__confirm w-full py-2 text-xs"
              >
                {applyLabel}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    ) : null;

  return (
    <div ref={containerRef} className={`relative shrink-0 ${className}`.trim()}>
      <HubFilterDropdownTrigger
        active={isActive}
        open={open}
        label={displayLabel}
        Icon={Calendar}
        iconColor={triggerIconColor}
        typoClass={triggerTypoClass}
        className="shrink-0"
        title={title}
        onClick={() => {
          setOpen((v) => {
            const next = !v;
            if (next) setView("list");
            return next;
          });
        }}
      />
      {panel ? createPortal(panel, document.body) : null}
    </div>
  );
}

export { HubMonthPickerPanel };
