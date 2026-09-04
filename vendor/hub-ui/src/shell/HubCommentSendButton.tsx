import { Loader2, Send } from "lucide-react";

/** Todo task-modal comment send — SSOT gradient chip (P0012 / P0015 Feed·Documents). */
export const HUB_COMMENT_SEND_BUTTON_CLASS =
  "todo-hub-comment-send shrink-0 rounded-full bg-gradient-to-r from-[var(--gradient-from)] to-[var(--gradient-to)] p-1.5 text-white transition-opacity hover:scale-110 disabled:opacity-50 disabled:hover:scale-100";

type Props = {
  disabled?: boolean;
  busy?: boolean;
  onClick: () => void;
  ariaLabel?: string;
};

export function HubCommentSendButton({
  disabled = false,
  busy = false,
  onClick,
  ariaLabel = "Post comment",
}: Props) {
  return (
    <button
      type="button"
      className={HUB_COMMENT_SEND_BUTTON_CLASS}
      disabled={disabled || busy}
      onClick={onClick}
      aria-label={busy ? "Saving…" : ariaLabel}
      aria-busy={busy || undefined}
    >
      {busy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Send size={14} aria-hidden />}
    </button>
  );
}
