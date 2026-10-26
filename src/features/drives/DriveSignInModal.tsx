import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Cloud, KeyRound, Loader2 } from "lucide-react";
import {
  HubAdmReadonlyField,
  HubBulkActionButton,
  HubDetailFieldRow,
  HubDetailFieldsGroup,
  HubDirectoryCopyText,
  HubTocSectionNav,
  HubToolDetailModal,
  HubToolDetailModalAccountFooter,
  HubToolDetailRail,
  HubToolDetailSection,
  HubUsersStatusLabel,
  hubAccountDetailShellClass,
} from "@tool-workspace/hub-ui";
import { DriveOauthLinkPanel, DriveOauthNotice } from "../../components/DriveOauthNotice";
import { DIRECTORY_STATUS_EMOJI } from "../../lib/folder-sync-directory-column-hints";
import { navScreenChrome } from "../../lib/nav-structure";
import {
  authorizeRemote,
  cancelAuthorizeRemote,
  fetchAuthorizeSession,
  fetchDriveStatus,
} from "../../lib/sync-api";

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
const OAUTH_SECTION = "p0009-drive-oauth";

/** Smart Google OAuth pipeline — auto-generates & copies link on open, zero ghost accounts on cancel. */
export function DriveSignInModal({
  open,
  remoteName,
  suggestedName,
  suggestedCode = "GG0001",
  onClose,
  onSignedIn,
}: Props) {
  const locked = Boolean(remoteName);
  const drivesChrome = navScreenChrome("drives");
  const [name, setName] = useState(remoteName || suggestedName);
  const [busy, setBusy] = useState(false);
  const [waitingConsent, setWaitingConsent] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [autoCopied, setAutoCopied] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollGen = useRef(0);
  const onSignedInRef = useRef(onSignedIn);
  onSignedInRef.current = onSignedIn;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const signIn = useCallback(
    async (targetName?: string) => {
      const clean = (targetName ?? (locked ? remoteName : name)).trim();
      if (!NAME_RE.test(clean)) {
        setError("Use a name like gdrive or gdrive2 (letters, numbers, _ or -).");
        return;
      }
      const gen = ++pollGen.current;
      setBusy(true);
      setWaitingConsent(false);
      setConnectedEmail(null);
      setAutoCopied(false);
      setError(null);
      setHint(null);
      setAuthUrl(null);
      try {
        const auth = await authorizeRemote(clean);
        if (pollGen.current !== gen) return;
        const url = auth.authUrl || null;
        setAuthUrl(url);
        if (url) {
          try {
            await navigator.clipboard.writeText(url);
            setAutoCopied(true);
          } catch {
            setAutoCopied(false);
          }
        }
        setHint(auth.hint || "Sign-in link is ready. Paste it into your browser profile or click Open in Browser.");
        setBusy(false);
        setWaitingConsent(true);

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
                setError("Google sign-in was cancelled or failed. Click New link to try again.");
                return;
              }
            } catch {
              /* session poll is best-effort */
            }
          }
          if ((finished && exitCode === 0) || i % 2 === 1) {
            const status = await fetchDriveStatus(clean);
            if (status.authorized) {
              setWaitingConsent(false);
              setConnectedEmail(status.email || clean);
              setHint(`Connected${status.email ? ` · ${status.email}` : ""}.`);
              onSignedInRef.current();
              onCloseRef.current();
              return;
            }
          }
          if (finished) break;
        }
      } catch (e) {
        if (pollGen.current === gen) {
          setError(e instanceof Error ? e.message : String(e));
        }
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

  const statusTone = connectedEmail ? "online" : error ? "offline" : waitingConsent || busy ? "active" : "idle";
  const statusLabel = connectedEmail
    ? `Connected · ${connectedEmail}`
    : error
      ? "Failed"
      : busy
        ? "Generating link…"
        : waitingConsent
          ? "Waiting for Google…"
          : "Idle";

  return (
    <HubToolDetailModal
      open={open}
      onClose={handleClose}
      title={locked ? `Sign in ${suggestedCode}` : `New Drive · ${suggestedCode}`}
      headerIcon={drivesChrome.icon || Cloud}
      headerIconClassName={drivesChrome.iconClass}
      ariaLabel="Google Drive sign-in"
      size="detail"
      shellClassName={hubAccountDetailShellClass()}
      busy={busy}
      sectionIds={[OAUTH_SECTION]}
      toc={
        <HubToolDetailRail title="Navigate" titleEmoji="🧭" className="twofa-adm-rail--toc" scroll={false} ariaLabel="Sections">
          <HubTocSectionNav
            items={[{ id: OAUTH_SECTION, label: "Google OAuth", emoji: "🔐" }]}
            admNav
          />
        </HubToolDetailRail>
      }
      footer={
        <HubToolDetailModalAccountFooter
          onClose={handleClose}
          closeDisabled={busy}
          onSave={() => void signIn()}
          saveLabel={authUrl ? "New sign-in link" : "Create sign-in link"}
          saveVariant="create"
          saveDisabled={busy || !(locked ? remoteName : name).trim()}
          busy={busy}
        />
      }
    >
      {error ? (
        <div className="hub-directory-body-value mb-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-rose-100">
          {error}
        </div>
      ) : null}
      <HubToolDetailSection id={OAUTH_SECTION} title="Google OAuth" emoji="🔐">
        <HubDetailFieldsGroup>
          <HubDetailFieldRow slots={3}>
            <HubAdmReadonlyField header={{ label: "ID", headerEmoji: "🆔" }} valueLayout="inline">
              <HubDirectoryCopyText value={suggestedCode} copyToastLabel="Drive ID copied" />
            </HubAdmReadonlyField>
            <HubAdmReadonlyField header={{ label: "Status", headerEmoji: DIRECTORY_STATUS_EMOJI }} valueLayout="inline">
              <HubUsersStatusLabel
                label={statusLabel}
                tone={statusTone}
                live={waitingConsent || busy}
              />
            </HubAdmReadonlyField>
            <HubAdmReadonlyField header={{ label: "Callback", headerEmoji: "🔌" }} valueLayout="inline">
              <span className="font-mono text-xs text-white/75">127.0.0.1:53682</span>
            </HubAdmReadonlyField>
          </HubDetailFieldRow>
        </HubDetailFieldsGroup>

        <div className="mt-3 flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs">
              <CheckCircle2
                size={14}
                className={authUrl ? "shrink-0 text-emerald-400" : "shrink-0 text-white/30"}
                aria-hidden
              />
              <div className="min-w-0">
                <div className="font-medium text-white/90">1. Link Ready</div>
                <div className="truncate text-xs text-white/55">
                  {authUrl ? "Auto-copied to clipboard" : "Generating OAuth URL…"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs">
              {waitingConsent ? (
                <Loader2 size={14} className="shrink-0 animate-spin text-sky-400" aria-hidden />
              ) : (
                <KeyRound size={14} className="shrink-0 text-white/40" aria-hidden />
              )}
              <div className="min-w-0">
                <div className="font-medium text-white/90">2. Google Consent</div>
                <div className="truncate text-xs text-white/55">
                  Paste in browser & allow access
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs">
              <CheckCircle2
                size={14}
                className={connectedEmail ? "shrink-0 text-emerald-400" : "shrink-0 text-white/30"}
                aria-hidden
              />
              <div className="min-w-0">
                <div className="font-medium text-white/90">3. Auto-Connect</div>
                <div className="truncate text-xs text-white/55">
                  Saves token & closes window
                </div>
              </div>
            </div>
          </div>

          {authUrl ? (
            <DriveOauthLinkPanel
              url={authUrl}
              autoCopied={autoCopied}
              busy={busy}
              onRegenerate={() => void signIn()}
            />
          ) : !busy ? (
            <div>
              <HubBulkActionButton
                icon={<KeyRound size={14} aria-hidden />}
                label="Create sign-in link"
                title="Create a Google sign-in link to copy"
                tone="indigo"
                onClick={() => void signIn()}
              />
            </div>
          ) : null}

          <DriveOauthNotice />
          {hint ? <p className="hub-directory-body-value text-sky-200/85">{hint}</p> : null}
        </div>
      </HubToolDetailSection>
    </HubToolDetailModal>
  );
}
