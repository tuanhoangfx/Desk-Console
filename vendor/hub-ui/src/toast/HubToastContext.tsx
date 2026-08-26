import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { formatCopyToastPreview } from "./copy-toast";
import { formatHubUnknownMessage } from "./format-hub-unknown-message";

export type HubToastType = "success" | "error" | "info" | "warn";
export type HubToastIcon = "copy" | "check";

export type HubToast = {
  id: number;
  message: string;
  type: HubToastType;
  durationMs: number;
  preview?: string;
  icon?: HubToastIcon;
};

type HubToastContextValue = {
  toasts: HubToast[];
  pushToast: (message: unknown, type?: HubToastType, durationMs?: number) => void;
  pushCopyToast: (copied: string, label?: string, durationMs?: number) => void;
  dismissToast: (id: number) => void;
  /** Clear visible toasts (e.g. before Save so completion toast is the only one). */
  clearToasts: () => void;
};

const HubToastContext = createContext<HubToastContextValue | null>(null);

export function HubToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<HubToast[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const pushToast = useCallback(
    (message: unknown, type: HubToastType = "info", durationMs = 4200) => {
      const text = formatHubUnknownMessage(message);
      if (!text) return;
      const id = Date.now() + Math.random();
      setToasts((prev) => {
        const next = [...prev, { id, message: text, type, durationMs }];
        return next.length > 2 ? next.slice(-2) : next;
      });
    },
    [],
  );

  const pushCopyToast = useCallback(
    (copied: string, label = "Copied", durationMs = 3000) => {
      const preview = formatCopyToastPreview(formatHubUnknownMessage(copied));
      if (!preview) return;
      const id = Date.now() + Math.random();
      setToasts((prev) => {
        const next = [
          ...prev,
          {
            id,
            message: formatHubUnknownMessage(label, "Copied"),
            type: "success" as const,
            durationMs,
            preview,
            icon: "copy" as const,
          },
        ];
        return next.length > 2 ? next.slice(-2) : next;
      });
    },
    [],
  );

  const value = useMemo(
    () => ({ toasts, pushToast, pushCopyToast, dismissToast, clearToasts }),
    [toasts, pushToast, pushCopyToast, dismissToast, clearToasts],
  );

  return <HubToastContext.Provider value={value}>{children}</HubToastContext.Provider>;
}

/** Nullable — copy controls use toast when provider is mounted. */
export function useHubToast(): HubToastContextValue | null {
  return useContext(HubToastContext);
}

export function useHubToastRequired(): HubToastContextValue {
  const ctx = useContext(HubToastContext);
  if (!ctx) {
    throw new Error("useHubToastRequired must be used within HubToastProvider");
  }
  return ctx;
}
