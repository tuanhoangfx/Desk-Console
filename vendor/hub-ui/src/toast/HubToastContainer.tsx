import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, X } from "lucide-react";
import { HubToastProvider, useHubToastRequired, type HubToast, type HubToastType } from "./HubToastContext";
import { resolveHubToastPortalTarget } from "./resolve-hub-toast-portal";
import "../styles/hub-toast.css";

const iconToneClass: Record<HubToastType, string> = {
  success: "hub-toast-item__icon--success",
  error: "hub-toast-item__icon--error",
  warn: "hub-toast-item__icon--warn",
  info: "hub-toast-item__icon--info",
};

function ToastIcon({ toast }: { toast: HubToast }) {
  const tone = iconToneClass[toast.type];
  if (toast.icon === "copy") {
    return <Copy size={14} className={`mt-0.5 shrink-0 ${tone}`} aria-hidden />;
  }
  if (toast.icon === "check") {
    return <Check size={14} className={`mt-0.5 shrink-0 ${tone}`} aria-hidden />;
  }
  return null;
}

function ToastItem({ toast }: { toast: HubToast }) {
  const { dismissToast } = useHubToastRequired();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => dismissToast(toast.id), toast.durationMs);
    return () => window.clearTimeout(t);
  }, [toast.id, toast.durationMs, dismissToast]);

  return (
    <div
      role="status"
      style={{
        transform: visible ? "translateY(0)" : "translateY(8px)",
        opacity: visible ? 1 : 0,
      }}
      className={`hub-toast-item hub-toast-item--${toast.type}`}
    >
      <ToastIcon toast={toast} />
      <div className="min-w-0 flex-1">
        <p className="hub-toast-item__title">{toast.message}</p>
        {toast.preview ? (
          <p className="hub-toast-item__preview" title={toast.preview}>
            {toast.preview}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
        aria-label="Dismiss"
        onClick={() => dismissToast(toast.id)}
      >
        <X size={14} />
      </button>
    </div>
  );
}

function HubToastViewport() {
  const { toasts } = useHubToastRequired();

  if (!toasts.length) return null;

  return (
    <div className="hub-toast-viewport" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

/**
 * Fixed toast stack — portals into the active tool-detail modal backdrop when open
 * (same layer as the dialog; not dimmed by backdrop-filter). Otherwise `document.body`.
 */
export function HubToastContainer() {
  const { toasts } = useHubToastRequired();
  if (!toasts.length) return null;
  if (typeof document === "undefined") return <HubToastViewport />;
  const target = resolveHubToastPortalTarget();
  return createPortal(<HubToastViewport />, target, `hub-toast-${target === document.body ? "body" : "modal"}`);
}

/** Provider + container — mount once at app root (P0020 `HubToastShell` SSOT). */
export function HubToastShell({ children }: { children: ReactNode }) {
  return (
    <HubToastProvider>
      {children}
      <HubToastContainer />
    </HubToastProvider>
  );
}
