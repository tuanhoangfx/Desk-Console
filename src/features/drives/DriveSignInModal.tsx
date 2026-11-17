import { useCallback, useEffect, useRef, useState } from "react";
import { Cloud, ExternalLink, ShieldCheck, Zap } from "lucide-react";
import {
  HubLoginPipelineModal,
  HubLoginPipelineSuccessView,
  type HubLoginPipelineModeTab,
  type HubLoginPipelineStep,
} from "@tool-workspace/hub-ui";
import { DriveOauthBrowserStage, DriveOauthStealthStage } from "../../components/DriveOauthNotice";
import {
  authorizeRemote,
  cancelAuthorizeRemote,
  fetchAuthorizeSession,
  fetchDriveOauthCallbackStatus,
  fetchDriveStatus,
  openDriveOauthInStealth,
} from "../../lib/sync-api";

export type DriveLoginMode = "browser" | "stealth";

type Props = {
  open: boolean;
  /** Empty starts a new remote. A name re-signs that remote. */
  remoteName: string;
  suggestedName: string;
  suggestedCode?: string;
  onClose: () => void;
  onSignedIn: () => void;
};

const NAME_RE = /^[A-Za-z][A-Za-z0-9_-]{0,31}$/;

const PIPELINE_STEPS: readonly [
  HubLoginPipelineStep,
  HubLoginPipelineStep,
  HubLoginPipelineStep,
] = [
  { step: 1, label: "1. Link Ready" },
  { step: 2, label: "2. Google Consent" },
  { step: 3, label: "3. Linked" },
];

/**
 * Unified 3-Step Google OAuth Login Pipeline Modal (P0001 Desk Console ↔ P0002 Telegram/Zalo Login SSOT).
 * Auto-generates & copies OAuth URL on open, supports 1-click Browser or P0003 Stealth launch, and polls :53682.
 */
export function DriveSignInModal({
  open,
  remoteName,
  suggestedName,
  suggestedCode = "GG0001",
  onClose,
  onSignedIn,
}: Props) {
  const locked = Boolean(remoteName);
  const [mode, setMode] = useState<DriveLoginMode>("browser");
  const [name, setName] = useState(remoteName || suggestedName);
  const [busy, setBusy] = useState(false);
  const [waitingConsent, setWaitingConsent] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [callbackListening, setCallbackListening] = useState(false);
  const [callbackPortBusy, setCallbackPortBusy] = useState(false);
  const [reclaimedPid, setReclaimedPid] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [stealthCode, setStealthCode] = useState("0001");
  const [stealthBusy, setStealthBusy] = useState(false);
  const [stealthMsg, setStealthMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const pollGen = useRef(0);
  const onSignedInRef = useRef(onSignedIn);
  onSignedInRef.current = onSignedIn;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const signIn = useCallback(
    async (targetName?: string): Promise<string | null> => {
      const clean = (targetName ?? (locked ? remoteName : name)).trim();
      if (!NAME_RE.test(clean)) {
        setError("Use a name like gdrive or gdrive2 (letters, numbers, _ or -).");
        return null;
      }
      const gen = ++pollGen.current;
      setBusy(true);
      setWaitingConsent(false);
      setConnectedEmail(null);
      setCopied(false);
      setCallbackListening(false);
      setCallbackPortBusy(false);
      setReclaimedPid(null);
      setError(null);
      setHint(null);
      setAuthUrl(null);
      setStealthMsg(null);
      try {
        const auth = await authorizeRemote(clean);
        if (pollGen.current !== gen) return null;
        const url = auth.authUrl || null;
        setAuthUrl(url);
        setCallbackListening(Boolean(auth.callbackListening ?? Boolean(url)));
        setReclaimedPid(auth.reclaimedCallbackPid ?? null);
        if (url) {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
          } catch {
            setCopied(false);
          }
        }
        setHint(
          auth.hint ||
            "Sign-in link is ready. Click Open in Browser or paste it into your browser profile.",
        );
        setBusy(false);
        setWaitingConsent(true);

        void (async () => {
          for (let i = 0; i < 240; i += 1) {
            await new Promise((resolve) => window.setTimeout(resolve, 1500));
            if (pollGen.current !== gen) return;
            let finished = false;
            let exitCode: number | null = null;
            if (auth.sessionId) {
              try {
                const session = await fetchAuthorizeSession(auth.sessionId);
                exitCode = session.exitCode;
                finished = exitCode != null;
                if (finished && exitCode !== 0) {
                  setWaitingConsent(false);
                  setCallbackListening(false);
                  setError("Google sign-in was cancelled or failed. Click Refresh Link to try again.");
                  return;
                }
              } catch {
                /* session poll is best-effort */
              }
            }
            if ((finished && exitCode === 0) || i % 2 === 1) {
              try {
                const status = await fetchDriveStatus(clean);
                if (status.authorized) {
                  setWaitingConsent(false);
                  setCallbackListening(false);
                  setConnectedEmail(status.email || clean);
                  setHint(`Connected${status.email ? ` · ${status.email}` : ""}.`);
                  onSignedInRef.current();
                  window.setTimeout(() => {
                    onCloseRef.current();
                  }, 1250);
                  return;
                }
              } catch {
                /* ignore transient poll error */
              }
            }
            if (finished) break;
          }
        })();

        return url;
      } catch (e) {
        if (pollGen.current === gen) {
          const msg = e instanceof Error ? e.message : String(e);
          setError(msg);
          void fetchDriveOauthCallbackStatus()
            .then((cb) => {
              if (pollGen.current === gen) {
                setCallbackListening(Boolean(cb.listening));
                setCallbackPortBusy(Boolean(cb.portBusy));
              }
            })
            .catch(() => undefined);
        }
        return null;
      } finally {
        if (pollGen.current === gen) {
          setBusy(false);
        }
      }
    },
    [locked, name, remoteName],
  );

  useEffect(() => {
    if (!open) {
      pollGen.current += 1;
      setWaitingConsent(false);
      return;
    }
    setMode("browser");
    setStealthMsg(null);
    const target = (remoteName || suggestedName).trim();
    setName(target);
    void signIn(target);
  }, [open, remoteName, suggestedName, signIn]);

  useEffect(() => {
    return () => {
      pollGen.current += 1;
    };
  }, []);

  function handleClose() {
    pollGen.current += 1;
    setWaitingConsent(false);
    void cancelAuthorizeRemote().catch(() => undefined);
    onClose();
  }

  async function handleCopyUrl() {
    if (!authUrl) return;
    try {
      await navigator.clipboard.writeText(authUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function handleOpenBrowser() {
    let targetUrl = authUrl;
    if (!targetUrl) {
      targetUrl = await signIn();
    }
    if (!targetUrl) return;
    const viaDesktop = await window.folderSyncDesktop?.openExternal?.(targetUrl);
    if (viaDesktop?.ok) return;
    window.open(targetUrl, "_blank", "noopener");
  }

  async function handleOpenStealth() {
    const code = stealthCode.trim();
    if (!code) return;
    setStealthBusy(true);
    setStealthMsg(null);
    try {
      let targetUrl = authUrl;
      if (!targetUrl) {
        targetUrl = await signIn();
      }
      if (!targetUrl) {
        setStealthMsg({ ok: false, text: "Could not generate Google OAuth URL." });
        return;
      }
      const res = await openDriveOauthInStealth(code, targetUrl);
      if (res.ok) {
        setStealthMsg({
          ok: true,
          text: `Opened in Stealth #${code.padStart(4, "0")} · Waiting for Google consent on 127.0.0.1:53682…`,
        });
      } else {
        setStealthMsg({
          ok: false,
          text: res.error || "Could not open P0003 Stealth Browser profile.",
        });
      }
    } catch (err) {
      setStealthMsg({
        ok: false,
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setStealthBusy(false);
    }
  }

  const currentStage: 1 | 2 | 3 = connectedEmail ? 3 : authUrl || waitingConsent ? 2 : 1;
  const cleanRemoteKey = (locked ? remoteName : name).trim() || "gdrive";

  const liveBadgeTone =
    connectedEmail || callbackListening
      ? "emerald"
      : busy
        ? "sky"
        : error
          ? "rose"
          : "amber";

  const liveBadgeLabel = connectedEmail
    ? "Connected"
    : callbackListening
      ? "127.0.0.1:53682 Live"
      : busy
        ? "Generating OAuth…"
        : error
          ? "Retry OAuth"
          : "127.0.0.1:53682";

  const modeTabs: readonly [
    HubLoginPipelineModeTab<DriveLoginMode>,
    HubLoginPipelineModeTab<DriveLoginMode>,
  ] = [
    {
      key: "browser",
      label: "Browser OAuth",
      icon: <ExternalLink className="h-3.5 w-3.5 text-sky-300" />,
    },
    {
      key: "stealth",
      label: "Stealth Profile",
      icon: <ShieldCheck className="h-3.5 w-3.5 text-sky-300" />,
    },
  ];

  const guideBanner =
    mode === "browser"
      ? {
          title: "One-Time Google Sign-In Guide",
          subtitle:
            "Open the auto-copied link in any browser → Advanced → Go to Folder Sync (unsafe) → Allow",
          icon: <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-amber-300" />,
          rightBadge: (
            <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
              3 clicks
            </span>
          ),
        }
      : {
          title: "Direct P0003 Stealth Browser OAuth",
          subtitle:
            "Launches Google OAuth directly inside your chosen Stealth Browser profile (#0001–#0020)",
          icon: <Zap className="h-3.5 w-3.5 shrink-0 text-sky-300" />,
          rightBadge: (
            <span className="rounded-md border border-sky-400/30 bg-sky-500/15 px-1.5 py-0.5 font-mono text-[10px] text-sky-200">
              :6003
            </span>
          ),
        };

  return (
    <HubLoginPipelineModal<DriveLoginMode>
      open={open}
      onClose={handleClose}
      busy={busy || stealthBusy}
      titleId="p0001-drive-pipeline-login-title"
      title={locked ? `Link Google Drive · ${suggestedCode}` : `New Google Drive · ${suggestedCode}`}
      subtitle="Direct Google OAuth 2.0 · Auto-syncs to Desk Console & rclone"
      icon={<Cloud className="h-5 w-5 text-white" />}
      liveBadgeLabel={liveBadgeLabel}
      liveBadgeTone={liveBadgeTone}
      liveBadgePulse={Boolean(waitingConsent || busy || callbackListening)}
      steps={PIPELINE_STEPS}
      currentStage={currentStage}
      completed={Boolean(connectedEmail)}
      modeTabs={modeTabs}
      activeMode={mode}
      onModeChange={(nextMode) => {
        setError(null);
        setMode(nextMode);
      }}
      guideBanner={guideBanner}
      error={error}
    >
      {connectedEmail ? (
        <HubLoginPipelineSuccessView
          title="Google Drive Session Connected!"
          subtitle={`${suggestedCode} · ${connectedEmail}`}
          badgeText={`${cleanRemoteKey}: · Synced 24/7`}
        />
      ) : mode === "browser" ? (
        <DriveOauthBrowserStage
          suggestedCode={suggestedCode}
          cleanRemoteKey={cleanRemoteKey}
          reclaimedPid={reclaimedPid}
          copied={copied}
          busy={busy}
          authUrl={authUrl}
          waitingConsent={waitingConsent}
          callbackListening={callbackListening}
          callbackPortBusy={callbackPortBusy}
          hint={hint}
          error={error}
          onOpenBrowser={() => void handleOpenBrowser()}
          onCopyUrl={() => void handleCopyUrl()}
          onRefreshLink={() => void signIn()}
        />
      ) : (
        <DriveOauthStealthStage
          stealthCode={stealthCode}
          stealthBusy={stealthBusy}
          busy={busy}
          stealthMsg={stealthMsg}
          onStealthCodeChange={setStealthCode}
          onOpenStealth={() => void handleOpenStealth()}
        />
      )}
    </HubLoginPipelineModal>
  );
}
