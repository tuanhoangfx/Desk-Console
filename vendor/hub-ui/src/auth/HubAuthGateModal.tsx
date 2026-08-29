import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { LogIn, UserPlus, UserRound } from "lucide-react";
import { HubModalCloseButton } from "../shell/HubModalCloseButton";
import { HUB_NO_SPELLCHECK_PROPS } from "../lib/no-spellcheck";
import { compactIconSize } from "../ui-scale";
import { formatHubAuthToolInfo, type HubAuthToolInfo } from "./hub-auth-tool-info";
import { normalizeHubAuthError, type NormalizeHubAuthErrorOptions } from "./normalize-hub-auth-error";
import { HubAuthSysProgress } from "./HubAuthSysProgress";
import {
  isHubTechnicalAuthEmail,
  looksLikeEmail,
  prefetchHubResolveLogin,
  sanitizeHubLoginInput,
  warmHubAuthConnections,
} from "@tool-workspace/hub-identity";

type AuthMode = "signin" | "signup" | "anonymous";

export type HubAuthGateModalProps = {
  open: boolean;
  onClose: () => void;
  onAuthed?: () => void;
  onAnonymous?: () => void;
  /** When false, × / backdrop / Escape do not dismiss (P0004 hub gate). */
  dismissible?: boolean;
  title: string;
  toolInfo?: HubAuthToolInfo;
  /** @deprecated Use toolInfo */
  subtitle?: string;
  headerLeading?: ReactNode;
  showFieldHints?: boolean;
  submitPlacement?: "form" | "footer";
  errorOptions?: NormalizeHubAuthErrorOptions;
  anonymousHint?: string;
  /** Block submit while dev auto-login / boot auth is in flight (P0020). */
  submitDisabled?: boolean;
  onSubmit: (
    login: string,
    password: string,
    mode: Exclude<AuthMode, "anonymous">,
    extras?: { contactEmail?: string },
  ) => Promise<void | { error?: string }>;
  onForgotPassword?: (login: string) => Promise<string | void>;
};

export function HubAuthGateModal({
  open,
  onClose,
  onAuthed,
  onAnonymous,
  dismissible = true,
  title,
  toolInfo,
  subtitle,
  headerLeading,
  onSubmit,
  onForgotPassword,
  errorOptions,
  anonymousHint = "Browse with limited features. Cloud sync and vault require sign-in.",
  submitDisabled = false,
}: HubAuthGateModalProps) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [mode, setMode] = useState<AuthMode>("signin");
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    warmHubAuthConnections();
  }, [open]);

  useEffect(() => {
    if (!open || mode === "anonymous") return;
    const value = login.trim();
    if (value.length < 3) return;
    const timer = window.setTimeout(() => {
      void prefetchHubResolveLogin(value);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [open, mode, login]);

  useEffect(() => {
    if (!open || !dismissible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismissible, onClose]);

  const toolLine = toolInfo ? formatHubAuthToolInfo(toolInfo) : subtitle?.trim() || "";
  const SubmitIcon = mode === "signin" ? LogIn : UserPlus;
  const showAnonymous = Boolean(onAnonymous);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (mode === "anonymous") return;
    if (submitDisabled) return;
    setBusy(true);
    setBusyLabel("Checking account…");
    setMessage("");
    const checkingTimer = window.setTimeout(() => {
      setBusyLabel("Verifying password with Hub…");
    }, 350);
    const workspaceTimer = window.setTimeout(() => {
      setBusyLabel("Connecting workspace data…");
    }, 800);
    try {
      const contact = sanitizeHubLoginInput(contactEmail).toLowerCase();
      if (mode === "signup" && !looksLikeEmail(login) && !contact) {
        setMessage("Enter a contact email for recovery.");
        return;
      }
      if (mode === "signup" && contact && (isHubTechnicalAuthEmail(contact) || !looksLikeEmail(contact))) {
        setMessage("Use a real contact email — @infix1.io.vn is retired.");
        return;
      }
      const result = await onSubmit(login, password, mode, contact ? { contactEmail: contact } : undefined);
      const intent = mode === "signup" ? "signup" : "signin";
      if (result && "error" in result && result.error) {
        setMessage(normalizeHubAuthError(result.error, { ...errorOptions, intent }));
        return;
      }
      onAuthed?.();
    } catch (err) {
      const intent = mode === "signup" ? "signup" : "signin";
      setMessage(normalizeHubAuthError(err, { ...errorOptions, intent }));
    } finally {
      window.clearTimeout(checkingTimer);
      window.clearTimeout(workspaceTimer);
      setBusy(false);
      setBusyLabel("");
    }
  };

  const onForgot = async () => {
    if (!onForgotPassword) return;
    setBusy(true);
    setMessage("");
    try {
      const msg = await onForgotPassword(login);
      setBusy(false);
      if (msg) setMessage(msg);
    } catch (err) {
      setBusy(false);
      setMessage(err instanceof Error ? err.message : "Enter your linked email first.");
    }
  };

  if (!open) return null;

  const handleBackdrop = () => {
    if (dismissible) onClose();
  };

  return createPortal(
    <div
      className="auth-gate-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-gate-title"
    >
      <div className="auth-gate-backdrop" aria-hidden="true" onClick={handleBackdrop} />
      <div className="auth-gate-panel auth-gate-panel--modal hub-modal-frame">
        {dismissible ? (
          <HubModalCloseButton onClose={onClose} aria-label="Close sign in" />
        ) : null}
        {headerLeading ? <div className="auth-gate-brand">{headerLeading}</div> : null}
        <h2 id="auth-gate-title" className="auth-gate-title">
          {title}
        </h2>
        {toolLine ? <p className="auth-gate-tool-info">{toolLine}</p> : null}
        <div
          className={`auth-gate-tabs${showAnonymous ? " auth-gate-tabs--triple" : ""}`}
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signin"}
            className={`auth-gate-tab${mode === "signin" ? " auth-gate-tab--active" : ""}`}
            onClick={() => {
              setMode("signin");
              setMessage("");
            }}
          >
            <LogIn size={compactIconSize(14)} className="auth-gate-tab__icon" aria-hidden />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            className={`auth-gate-tab${mode === "signup" ? " auth-gate-tab--active" : ""}`}
            onClick={() => {
              setMode("signup");
              setMessage("");
            }}
          >
            <UserPlus size={compactIconSize(14)} className="auth-gate-tab__icon" aria-hidden />
            <span>Sign Up</span>
          </button>
          {showAnonymous ? (
            <button
              type="button"
              role="tab"
              aria-selected={mode === "anonymous"}
              className={`auth-gate-tab auth-gate-tab--anonymous${mode === "anonymous" ? " auth-gate-tab--active" : ""}`}
              onClick={() => {
                setMode("anonymous");
                setMessage("");
              }}
            >
              <UserRound size={compactIconSize(14)} className="auth-gate-tab__icon" aria-hidden />
              <span>Anonymous</span>
            </button>
          ) : null}
        </div>
        {mode === "anonymous" ? (
          <div className="auth-gate-anonymous">
            <p className="auth-gate-anonymous__hint">{anonymousHint}</p>
            <button
              type="button"
              className="auth-gate-submit auth-gate-submit--anonymous"
              disabled={busy}
              onClick={() => onAnonymous?.()}
            >
              <UserRound size={compactIconSize(16)} aria-hidden />
              <span>Continue as Anonymous</span>
            </button>
          </div>
        ) : (
          <form className="auth-gate-form" onSubmit={(e) => void submit(e)}>
            <input
              className="field auth-gate-field w-full"
              type="text"
              name="login"
              placeholder="Username, email, or phone"
              autoComplete="username"
              {...HUB_NO_SPELLCHECK_PROPS}
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              disabled={busy || submitDisabled}
              required
            />
            {mode === "signup" && !looksLikeEmail(login) ? (
              <input
                className="field auth-gate-field w-full"
                type="email"
                name="contact"
                placeholder="Contact email"
                autoComplete="email"
                {...HUB_NO_SPELLCHECK_PROPS}
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                disabled={busy || submitDisabled}
                required
              />
            ) : null}
            <div className="auth-gate-password-wrap">
              <input
                className="field auth-gate-field w-full"
                type="password"
                name="password"
                placeholder="Password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                {...HUB_NO_SPELLCHECK_PROPS}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy || submitDisabled}
                required
              />
              {mode === "signin" && onForgotPassword ? (
                <button
                  type="button"
                  className="auth-gate-forgot"
                  disabled={busy}
                  onClick={() => void onForgot()}
                >
                  Forgot Password?
                </button>
              ) : null}
            </div>
            {message ? <p className="auth-gate-message">{message}</p> : null}
            {busyLabel ? <HubAuthSysProgress label={busyLabel} /> : null}
            <button type="submit" className="auth-gate-submit" disabled={busy || submitDisabled}>
              <SubmitIcon size={compactIconSize(16)} aria-hidden />
              <span>{mode === "signin" ? "Sign In" : "Sign Up"}</span>
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
