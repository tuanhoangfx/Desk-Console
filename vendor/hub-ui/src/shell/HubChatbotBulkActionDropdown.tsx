import { Bot } from "lucide-react";
import type { ReactNode } from "react";
import {
  HUB_BULK_ACTION_BTN_CLASS,
  HubBulkActionCountBadge,
} from "./HubBulkActionButton";
import { HubSingleFilterDropdown, type FilterOption } from "./FilterBar";

export const HUB_CHATBOT_BULK_OFF_VALUE = "__hub_chatbot_off__";

export type HubChatbotBulkPersonalityOption = {
  id: string;
  label: string;
  dotColor: string;
};

export type HubChatbotBulkSelection = {
  allOff: boolean;
  personalityId: string | null;
};

export type HubChatbotBulkActionDropdownProps = {
  hasSelection: boolean;
  selectedCount: number;
  loading?: boolean;
  selection: HubChatbotBulkSelection;
  personalities: HubChatbotBulkPersonalityOption[];
  noun?: string;
  offDotColor: string;
  onSetChatbotOff: () => void;
  onSetChatbotOn: (personalityId: string) => void;
  /** Test / embedded — default portal like FilterBar. */
  usePortal?: boolean;
  /** @deprecated Color dots come from FilterBar option `color` (Hub SSOT). */
  renderOffDot?: ReactNode;
  /** @deprecated Color dots come from FilterBar option `color` (Hub SSOT). */
  renderPersonalityDot?: (personality: HubChatbotBulkPersonalityOption) => ReactNode;
};

/** Bulk chatbot picker — same FilterBar panel as every Hub dropdown (search + pin). */
export function HubChatbotBulkActionDropdown({
  hasSelection,
  selectedCount,
  loading = false,
  selection,
  personalities,
  noun = "row(s)",
  offDotColor,
  onSetChatbotOff,
  onSetChatbotOn,
  usePortal = true,
}: HubChatbotBulkActionDropdownProps) {
  const options: FilterOption[] = [
    { value: HUB_CHATBOT_BULK_OFF_VALUE, label: "Off", color: offDotColor },
    ...personalities.map((p) => ({ value: p.id, label: p.label, color: p.dotColor })),
  ];
  const value =
    selection.allOff || !selection.personalityId
      ? HUB_CHATBOT_BULK_OFF_VALUE
      : selection.personalityId;

  return (
    <HubSingleFilterDropdown
      filterKey="hub-chatbot-bulk"
      label="Chatbot"
      options={options}
      value={value}
      onChange={(next) => {
        if (next === HUB_CHATBOT_BULK_OFF_VALUE || !next) onSetChatbotOff();
        else onSetChatbotOn(next);
      }}
      disabled={!hasSelection || loading}
      allowClear={false}
      usePortal={usePortal}
      triggerFormat="value"
      triggerHideChevron
      ariaLabel="Chatbot"
      triggerClassName={`${HUB_BULK_ACTION_BTN_CLASS} border border-indigo-400/35 bg-indigo-500/15 text-indigo-100 hover:bg-indigo-500/25`}
      triggerContent={
        <>
          <Bot size={14} aria-hidden />
          Chatbot
          {hasSelection && selectedCount > 0 ? (
            <HubBulkActionCountBadge count={selectedCount} tone="indigo" />
          ) : null}
        </>
      }
    />
  );
}
