import { Save, X } from "lucide-react";
import { HubBulkActionButton } from "./HubBulkActionButton";
import { HUB_DIRECTORY_TOOLBAR_TYPO_CLASS } from "./hub-typography";

export type HubShareAccess = "private" | "view" | "edit";

export type HubSharePopoverProps = {
  access: HubShareAccess;
  committedAccess: HubShareAccess;
  password: string;
  shareUrl: string;
  dirty: boolean;
  saving?: boolean;
  onAccessChange: (access: HubShareAccess) => void;
  onPasswordChange: (password: string) => void;
  onCopy: () => void;
  onSave: () => void;
  onCancel: () => void;
};

const SHARE_POPOVER_TYPO = HUB_DIRECTORY_TOOLBAR_TYPO_CLASS;

/**
 * Reusable Hub share settings popover — compact toolbar typography + emoji access choices.
 * The host owns storage, clipboard feedback, and the surrounding positioning wrapper.
 */
export function HubSharePopover({
  access,
  committedAccess,
  password,
  shareUrl,
  dirty,
  saving = false,
  onAccessChange,
  onPasswordChange,
  onCopy,
  onSave,
  onCancel,
}: HubSharePopoverProps) {
  const linkActive = access !== "private";
  const linkDisplay = shareUrl || (linkActive && saving ? "…" : linkActive ? "Save to generate link" : "");

  return (
    <div
      className="anim-pop absolute right-0 top-full z-50 mt-1.5 w-[min(19rem,calc(100vw-1.5rem))] rounded-xl border border-white/10 bg-[var(--panel)] p-2.5 shadow-2xl shadow-black/45"
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className={`mb-2 flex items-center gap-1.5 ${SHARE_POPOVER_TYPO} text-[var(--text)]`}>
        <span className="shrink-0 leading-none" aria-hidden>
          🔗
        </span>
        Share note
      </div>

      <div className="mb-2 flex gap-0.5 rounded-md border border-white/10 bg-white/[.03] p-0.5" role="group" aria-label="Share level">
        <HubShareAccessButton
          active={access === "private"}
          tone="private"
          emoji="🔒"
          label="Only me"
          disabled={saving}
          onClick={() => onAccessChange("private")}
        />
        <HubShareAccessButton
          active={access === "view"}
          tone="view"
          emoji="👁️"
          label="View"
          disabled={saving}
          onClick={() => onAccessChange("view")}
        />
        <HubShareAccessButton
          active={access === "edit"}
          tone="edit"
          emoji="✏️"
          label="Edit"
          disabled={saving}
          onClick={() => onAccessChange("edit")}
        />
      </div>

      <div className="min-h-[4.75rem] space-y-2">
        <input
          className={`field h-7 ${SHARE_POPOVER_TYPO} transition-opacity ${linkActive ? "opacity-100" : "pointer-events-none opacity-0"}`}
          type="password"
          name="hub-share-password"
          autoComplete="new-password"
          data-lpignore="true"
          data-1p-ignore
          tabIndex={linkActive ? 0 : -1}
          aria-hidden={!linkActive}
          value={password}
          placeholder="Password (optional)"
          onChange={(event) => onPasswordChange(event.target.value)}
        />
        <div
          className={`flex gap-1.5 transition-opacity ${linkActive ? "opacity-100" : "pointer-events-none opacity-0"}`}
          aria-hidden={!linkActive}
        >
          <input
            className={`field h-7 min-w-0 flex-1 font-mono ${SHARE_POPOVER_TYPO}`}
            readOnly
            tabIndex={-1}
            name="hub-share-url"
            autoComplete="off"
            data-form-type="other"
            value={linkDisplay}
          />
          <button
            type="button"
            className={`btn h-7 shrink-0 px-2 ${SHARE_POPOVER_TYPO}`}
            disabled={!shareUrl || saving}
            onMouseDown={(event) => event.preventDefault()}
            onClick={onCopy}
          >
            Copy
          </button>
        </div>
      </div>

      <div className="mt-2 flex justify-end gap-1.5 border-t border-white/5 pt-2">
        <HubBulkActionButton
          icon={<X size={11} aria-hidden />}
          label="Cancel"
          title="Discard share changes"
          tone="neutral"
          disabled={saving}
          onClick={onCancel}
        />
        <HubBulkActionButton
          icon={<Save size={11} aria-hidden />}
          label="Save"
          title="Save share settings"
          tone="emerald"
          disabled={saving || (!dirty && access === committedAccess)}
          iconPulsing={saving}
          onClick={onSave}
        />
      </div>
    </div>
  );
}

function HubShareAccessButton({
  active,
  tone,
  emoji,
  label,
  disabled,
  onClick,
}: {
  active: boolean;
  tone: HubShareAccess;
  emoji: string;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  const styles = {
    private: {
      active: "border-slate-400/45 bg-slate-500/22 text-slate-100",
      idle: "border-transparent text-slate-400 hover:bg-slate-500/10 hover:text-slate-200",
    },
    view: {
      active: "border-cyan-400/45 bg-cyan-500/20 text-cyan-50",
      idle: "border-transparent text-cyan-400/80 hover:bg-cyan-500/10 hover:text-cyan-100",
    },
    edit: {
      active: "border-violet-400/45 bg-violet-500/20 text-violet-50",
      idle: "border-transparent text-violet-400/80 hover:bg-violet-500/10 hover:text-violet-100",
    },
  }[tone];

  return (
    <button
      type="button"
      disabled={disabled}
      className={`inline-flex h-6 flex-1 items-center justify-center gap-0.5 rounded px-1 ${SHARE_POPOVER_TYPO} transition-colors disabled:opacity-50 ${
        active ? styles.active : styles.idle
      }`}
      aria-pressed={active}
      onMouseDown={(event) => event.preventDefault()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!disabled) onClick();
      }}
    >
      <span aria-hidden>{emoji}</span>
      {label}
    </button>
  );
}
