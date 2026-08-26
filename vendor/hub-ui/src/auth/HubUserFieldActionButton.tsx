export type HubUserFieldActionButtonProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

/** Inline field action — Change email / Change password beside account rows. */
export function HubUserFieldActionButton({ label, onClick, disabled }: HubUserFieldActionButtonProps) {
  return (
    <button
      type="button"
      className="hub-user-field-action shrink-0 rounded-md border border-white/10 bg-white/[.04] px-2 py-0.5 text-[10px] font-semibold text-indigo-200 transition hover:border-white/20 hover:bg-white/[.06] disabled:cursor-not-allowed disabled:opacity-45"
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}
