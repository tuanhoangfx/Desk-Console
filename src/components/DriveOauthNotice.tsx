import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { HubBulkActionButton } from "@tool-workspace/hub-ui";
import { DRIVE_OAUTH_UNVERIFIED_HINT } from "../lib/drive-oauth-copy";

/** Shared Google sign-in note — Drives screen only. */
export function DriveOauthNotice() {
  return <p className="hub-directory-body-value text-white/70">{DRIVE_OAUTH_UNVERIFIED_HINT}</p>;
}

/** Smart OAuth sign-in link panel with auto-copy feedback, 1-click Copy, Open in Browser, and Regenerate. */
export function DriveOauthLinkPanel({
  url,
  autoCopied = false,
  busy = false,
  onRegenerate,
}: {
  url: string;
  autoCopied?: boolean;
  busy?: boolean;
  onRegenerate?: () => void;
}) {
  const [copied, setCopied] = useState(autoCopied);

  useEffect(() => {
    setCopied(autoCopied);
  }, [url, autoCopied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function openInBrowser() {
    const viaDesktop = await window.folderSyncDesktop?.openExternal?.(url);
    if (viaDesktop?.ok) return;
    window.open(url, "_blank", "noopener");
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-sky-400/25 bg-sky-500/[0.07] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-sky-100">
          🔗 Google OAuth Sign-in Link
        </span>
        {copied ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-200">
            <Check size={11} aria-hidden />
            <span>Copied to clipboard</span>
          </span>
        ) : null}
      </div>
      <input
        type="text"
        readOnly
        className="hub-directory-body-value w-full rounded border border-white/10 bg-black/40 px-2.5 py-1.5 font-mono text-xs text-white/85 focus:border-sky-400/50 focus:outline-none"
        value={url}
        onFocus={(e) => e.currentTarget.select()}
      />
      <div className="flex flex-wrap items-center gap-2">
        <HubBulkActionButton
          icon={copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
          label={copied ? "Copied link" : "Copy sign-in link"}
          title="Copy the Google OAuth sign-in URL to paste into any browser profile"
          tone="indigo"
          onClick={() => void copy()}
        />
        <HubBulkActionButton
          icon={<ExternalLink size={14} aria-hidden />}
          label="Open in Browser"
          title="Open the Google OAuth sign-in URL in your default browser"
          onClick={() => void openInBrowser()}
        />
        {onRegenerate ? (
          <HubBulkActionButton
            icon={<RefreshCw size={14} aria-hidden />}
            label="New link"
            title="Generate a fresh OAuth sign-in link"
            disabled={busy}
            onClick={onRegenerate}
          />
        ) : null}
      </div>
    </div>
  );
}
