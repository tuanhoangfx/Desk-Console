import { useEffect, useState } from "react";
import { ArrowRight, Check, Copy, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import { HubBulkActionButton } from "@tool-workspace/hub-ui";
import { DRIVE_OAUTH_UNVERIFIED_HINT } from "../lib/drive-oauth-copy";

/** Shared Google sign-in note + visual 3-step unverified-screen guide — Drives screen only. */
export function DriveOauthNotice() {
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-amber-400/20 bg-amber-500/[0.05] p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-200">
          <ShieldCheck size={14} className="shrink-0 text-amber-300" aria-hidden />
          <span>One-time Google Sign-In Guide (Never asked again during sync)</span>
        </span>
        <span className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-xs text-white/60">
          3 clicks in browser
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="flex flex-col gap-1 rounded-md border border-white/10 bg-black/30 p-2 text-xs">
          <span className="text-xs font-medium text-white/55">Step A · Warning page</span>
          <div className="flex items-center gap-1.5 font-medium text-white/90">
            <span>Click</span>
            <span className="rounded border border-sky-400/35 bg-sky-500/15 px-1.5 py-0.5 font-mono text-xs text-sky-200 underline">
              Advanced
            </span>
          </div>
          <span className="text-xs text-white/50">Bottom-left link on Google page</span>
        </div>
        <div className="flex flex-col gap-1 rounded-md border border-white/10 bg-black/30 p-2 text-xs">
          <span className="text-xs font-medium text-white/55">Step B · Expand link</span>
          <div className="flex items-center gap-1 font-medium text-white/90">
            <ArrowRight size={12} className="shrink-0 text-amber-300" aria-hidden />
            <span className="truncate rounded border border-amber-400/35 bg-amber-500/15 px-1.5 py-0.5 font-mono text-xs text-amber-200 underline">
              Go to Folder Sync (unsafe)
            </span>
          </div>
          <span className="text-xs text-white/50">Appears right below Advanced</span>
        </div>
        <div className="flex flex-col gap-1 rounded-md border border-white/10 bg-black/30 p-2 text-xs">
          <span className="text-xs font-medium text-white/55">Step C · Grant Drive access</span>
          <div className="flex items-center gap-1.5 font-medium text-white/90">
            <span>Click</span>
            <span className="rounded border border-emerald-400/35 bg-emerald-500/15 px-1.5 py-0.5 font-mono text-xs text-emerald-200">
              Continue / Allow
            </span>
          </div>
          <span className="text-xs text-white/50">Token saves &amp; sync runs silently 24/7</span>
        </div>
      </div>
      <p className="hub-directory-body-value text-white/65">{DRIVE_OAUTH_UNVERIFIED_HINT}</p>
    </div>
  );
}

/** Smart OAuth sign-in link panel with auto-copy feedback, 1-click Copy, Open in Browser, Open in Stealth Profile, and Regenerate. */
export function DriveOauthLinkPanel({
  url,
  autoCopied = false,
  busy = false,
  onRegenerate,
  onOpenStealth,
}: {
  url: string;
  autoCopied?: boolean;
  busy?: boolean;
  onRegenerate?: () => void;
  onOpenStealth?: (profileCode: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [copied, setCopied] = useState(autoCopied);
  const [stealthCode, setStealthCode] = useState("0001");
  const [stealthBusy, setStealthBusy] = useState(false);
  const [stealthMsg, setStealthMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setCopied(autoCopied);
    setStealthMsg(null);
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

  async function handleOpenStealth() {
    if (!onOpenStealth) return;
    const code = stealthCode.trim();
    if (!code) return;
    setStealthBusy(true);
    setStealthMsg(null);
    try {
      const res = await onOpenStealth(code);
      if (res.ok) {
        setStealthMsg({ ok: true, text: `Opened in Stealth #${code.padStart(4, "0")}` });
      } else {
        setStealthMsg({ ok: false, text: res.error || "Could not open Stealth profile" });
      }
    } catch (err) {
      setStealthMsg({ ok: false, text: err instanceof Error ? err.message : String(err) });
    } finally {
      setStealthBusy(false);
    }
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
        {onOpenStealth ? (
          <div className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-black/30 px-2 py-0.5">
            <span className="text-xs text-white/60">Stealth #</span>
            <input
              type="text"
              value={stealthCode}
              onChange={(e) => setStealthCode(e.target.value.replace(/[^0-9A-Za-z_-]/g, "").slice(0, 8))}
              placeholder="0001"
              aria-label="Stealth Profile ID"
              className="w-14 rounded border border-white/10 bg-black/50 px-1.5 py-0.5 font-mono text-xs text-white/90 focus:border-sky-400/50 focus:outline-none"
            />
            <HubBulkActionButton
              icon={<ExternalLink size={14} aria-hidden />}
              label={stealthBusy ? "Opening…" : "Open in Stealth"}
              title="Open this Google OAuth link directly inside the selected P0003 Stealth Browser profile"
              disabled={stealthBusy || !stealthCode.trim()}
              onClick={() => void handleOpenStealth()}
            />
          </div>
        ) : null}
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
      {stealthMsg ? (
        <span className={stealthMsg.ok ? "text-xs text-emerald-300" : "text-xs text-rose-300"}>
          {stealthMsg.text}
        </span>
      ) : null}
    </div>
  );
}
