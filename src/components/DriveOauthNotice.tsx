import { Check, Copy, ExternalLink, KeyRound, RefreshCw, ShieldCheck } from "lucide-react";
import {
  HubLoginPipelineMicroSteps,
  HubLoginPipelineViewfinder,
  type HubLoginPipelineMicroStep,
} from "@tool-workspace/hub-ui";
import { DRIVE_OAUTH_UNVERIFIED_HINT } from "../lib/drive-oauth-copy";

export const GOOGLE_OAUTH_MICRO_STEPS: readonly HubLoginPipelineMicroStep[] = [
  { step: "1", title: "Click Advanced", sub: "Bottom-left on warning" },
  { step: "2", title: "Unsafe Link", sub: "Go to Folder Sync" },
  { step: "3", title: "Allow Access", sub: "Saves token 24/7" },
];

export const QUICK_STEALTH_PROFILES = ["0001", "0002", "0003", "0004", "0005"] as const;

export function DriveOauthBrowserStage({
  suggestedCode,
  cleanRemoteKey,
  reclaimedPid,
  copied,
  busy,
  authUrl,
  waitingConsent,
  callbackListening,
  callbackPortBusy,
  hint,
  error,
  onOpenBrowser,
  onCopyUrl,
  onRefreshLink,
}: {
  suggestedCode: string;
  cleanRemoteKey: string;
  reclaimedPid: number | null;
  copied: boolean;
  busy: boolean;
  authUrl: string | null;
  waitingConsent: boolean;
  callbackListening: boolean;
  callbackPortBusy: boolean;
  hint: string | null;
  error: string | null;
  onOpenBrowser: () => void;
  onCopyUrl: () => void;
  onRefreshLink: () => void;
}) {
  return (
    <div key="step-browser" className="tg-login-step flex flex-col items-center">
      <HubLoginPipelineViewfinder
        className="w-full"
        innerClassName="w-full border border-sky-400/25 bg-slate-900/90 p-4 shadow-[0_0_40px_rgba(42,171,238,0.16)]"
        showBeam={Boolean(authUrl && waitingConsent)}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] font-semibold text-white">
            <span>🆔 {suggestedCode}</span>
            <span className="text-slate-500">·</span>
            <span className="text-sky-300">{cleanRemoteKey}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {reclaimedPid ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
                Healed PID {reclaimedPid}
              </span>
            ) : null}
            {copied ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-medium text-emerald-200">
                <Check className="h-3 w-3" />
                Copied to clipboard
              </span>
            ) : null}
          </div>
        </div>

        {busy && !authUrl ? (
          <div className="flex flex-col items-center justify-center gap-2.5 py-7 text-slate-300">
            <RefreshCw className="h-7 w-7 animate-spin text-[#2AABEE]" />
            <span className="text-xs font-medium">
              Generating Google OAuth URL on 127.0.0.1:53682…
            </span>
          </div>
        ) : authUrl ? (
          <div className="space-y-2.5">
            <input
              type="text"
              readOnly
              aria-label="Google OAuth sign-in URL"
              value={authUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full rounded-xl border border-white/[.12] bg-black/45 px-3 py-2 font-mono text-[11px] text-sky-100 outline-none transition focus:border-sky-400/60"
            />

            <button
              type="button"
              disabled={busy}
              onClick={onOpenBrowser}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2AABEE] to-[#229ED9] px-4 text-xs font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:brightness-110 disabled:opacity-50"
            >
              <ExternalLink className="h-4 w-4" />
              Open Google Sign-In in Browser
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={onCopyUrl}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-white/[.12] bg-white/[0.05] px-3 text-xs font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-300" />
                    Copied Link
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-sky-300" />
                    Copy Sign-In Link
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onRefreshLink}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-white/[.12] bg-white/[0.05] px-3 text-xs font-medium text-sky-200 transition hover:bg-white/10 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
                Refresh Link
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-5 text-center">
            <p className="text-xs text-slate-300">
              Click below to generate a fresh Google Drive OAuth link on callback port{" "}
              <span className="font-mono text-sky-300">127.0.0.1:53682</span>.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={onRefreshLink}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2AABEE] to-[#229ED9] px-4 text-xs font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:brightness-110 disabled:opacity-50"
            >
              <KeyRound className="h-4 w-4" />
              Create Sign-In Link
            </button>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between border-t border-white/[0.07] pt-2.5 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${
                callbackListening
                  ? "animate-ping bg-emerald-400"
                  : callbackPortBusy
                    ? "bg-rose-400"
                    : "bg-slate-500"
              }`}
            />
            <span>
              {waitingConsent
                ? "Auto-polling Google consent (1.5s)…"
                : callbackPortBusy
                  ? "Callback port busy"
                  : "Callback listener ready"}
            </span>
          </span>
          <span className="font-mono text-sky-300">127.0.0.1:53682</span>
        </div>
      </HubLoginPipelineViewfinder>

      {hint && !error ? (
        <p className="mt-2 text-center text-[11px] text-sky-200/80" title={DRIVE_OAUTH_UNVERIFIED_HINT}>
          {hint}
        </p>
      ) : null}

      <HubLoginPipelineMicroSteps steps={GOOGLE_OAUTH_MICRO_STEPS} />
    </div>
  );
}

export function DriveOauthStealthStage({
  stealthCode,
  stealthBusy,
  busy,
  stealthMsg,
  onStealthCodeChange,
  onOpenStealth,
}: {
  stealthCode: string;
  stealthBusy: boolean;
  busy: boolean;
  stealthMsg: { ok: boolean; text: string } | null;
  onStealthCodeChange: (next: string) => void;
  onOpenStealth: () => void;
}) {
  const padded = stealthCode.trim().padStart(4, "0");
  return (
    <div key="step-stealth" className="tg-login-step space-y-3.5">
      <div className="rounded-2xl border border-sky-400/25 bg-slate-900/85 p-4">
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-medium text-slate-300">
            P0003 Stealth Browser Profile
          </label>
          <span className="rounded-md bg-sky-500/15 px-2 py-0.5 font-mono text-[11px] text-sky-300">
            Profile #{padded}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-white/[.12] bg-slate-950/90 px-3 text-xs font-semibold text-slate-200">
            <span>🌐</span>
            <span className="font-mono text-sky-300">Stealth #</span>
          </div>
          <input
            type="text"
            value={stealthCode}
            onChange={(e) =>
              onStealthCodeChange(e.target.value.replace(/[^0-9A-Za-z_-]/g, "").slice(0, 8))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" && stealthCode.trim() && !stealthBusy) {
                onOpenStealth();
              }
            }}
            placeholder="0001"
            aria-label="Stealth Profile ID"
            className="h-11 flex-1 rounded-xl border border-white/15 bg-slate-950/90 px-3.5 font-mono text-sm text-white placeholder-slate-500 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/25"
          />
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-400">Quick select:</span>
          {QUICK_STEALTH_PROFILES.map((preset) => {
            const active = padded === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => onStealthCodeChange(preset)}
                className={`rounded-lg border px-2 py-0.5 font-mono text-[11px] transition ${
                  active
                    ? "border-sky-400/50 bg-sky-500/25 font-semibold text-sky-100"
                    : "border-white/10 bg-white/[0.04] text-slate-400 hover:text-white"
                }`}
              >
                #{preset}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={stealthBusy || busy || !stealthCode.trim()}
          onClick={onOpenStealth}
          className="mt-3.5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2AABEE] to-[#229ED9] px-4 text-xs font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:brightness-110 disabled:opacity-50"
        >
          {stealthBusy ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Opening Stealth #{padded}…
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" />
              Launch Google OAuth in Stealth #{padded}
            </>
          )}
        </button>

        {stealthMsg ? (
          <div
            className={`mt-2.5 rounded-xl border px-3 py-2 text-xs ${
              stealthMsg.ok
                ? "border-emerald-400/30 bg-emerald-500/[.12] text-emerald-200"
                : "border-rose-400/30 bg-rose-500/[.12] text-rose-200"
            }`}
          >
            {stealthMsg.text}
          </div>
        ) : null}
      </div>

      <HubLoginPipelineMicroSteps steps={GOOGLE_OAUTH_MICRO_STEPS} />
    </div>
  );
}
