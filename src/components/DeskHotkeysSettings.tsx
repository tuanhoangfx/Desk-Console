import { useEffect, useState } from "react";
import { deskApi, type DeskHotkeys } from "../lib/api";
import { acceleratorFromKeyboardEvent, formatHotkeyLabel } from "../lib/hotkeys";

type Role = "picker" | "capture";

const ROLES: { role: Role; label: string; hint: string }[] = [
  { role: "picker", label: "Paste picker", hint: "Opens the History + Samples modal" },
  { role: "capture", label: "Screen capture", hint: "Saves a screenshot into Captures" },
];

export function DeskHotkeysSettings() {
  const [hotkeys, setHotkeys] = useState<DeskHotkeys | null>(null);
  const [listening, setListening] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [openAtLogin, setOpenAtLogin] = useState<boolean | null>(null);
  const canLoginItem = Boolean(window.deskConsole?.loginItem);

  const load = () =>
    deskApi
      .hotkeys()
      .then((data) => {
        setHotkeys(data);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));

  useEffect(() => {
    void load();
    if (!window.deskConsole?.loginItem) return;
    void window.deskConsole.loginItem().then((data) => {
      if (typeof data.openAtLogin === "boolean") setOpenAtLogin(data.openAtLogin);
    });
  }, []);

  useEffect(() => {
    if (!listening) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setListening(null);
        return;
      }
      event.preventDefault();
      const acc = acceleratorFromKeyboardEvent(event);
      if (!acc) return;
      setListening(null);
      void deskApi
        .saveHotkeys({ [listening]: acc })
        .then(async (data) => {
          setHotkeys(data);
          setError(null);
          setNote(`Saved ${formatHotkeyLabel(acc)}`);
          await window.deskConsole?.rebindHotkeys?.();
        })
        .catch((err) => setError(err instanceof Error ? err.message : String(err)));
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [listening]);

  const reset = () => {
    void deskApi
      .resetHotkeys()
      .then(async (data) => {
        setHotkeys(data);
        setError(null);
        setNote("Restored default shortcuts");
        await window.deskConsole?.rebindHotkeys?.();
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  };

  return (
    <div className="space-y-3 text-xs leading-relaxed text-[var(--muted)]">
      <p>Click Record, then press the shortcut. Applies immediately while Desk Console is in the tray. Win+V stays with Windows.</p>
      {ROLES.map((item) => (
        <div key={item.role} className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-[var(--text)]">{item.label}</p>
            <p>{item.hint}</p>
          </div>
          <code className="shrink-0 rounded bg-white/5 px-2 py-1 text-[11px] text-[var(--text)]">
            {listening === item.role ? "Press keys…" : hotkeys?.labels[item.role] || "—"}
          </code>
          <button
            type="button"
            className="hub-btn shrink-0"
            onClick={() => {
              setNote(null);
              setListening(item.role);
            }}
          >
            Record
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <button type="button" className="hub-btn" onClick={reset}>
          Reset defaults
        </button>
        {note ? <span className="text-emerald-300">{note}</span> : null}
      </div>
      {canLoginItem ? (
        <label className="flex items-start gap-2 pt-1 text-[var(--text)]">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={openAtLogin !== false}
            onChange={(event) => {
              const next = event.target.checked;
              setOpenAtLogin(next);
              void window.deskConsole?.loginItem?.(next).then((data) => {
                setNote(data.applied === false ? "Saved — applies in the packaged app" : next ? "Starts in tray at login" : "Removed from Windows startup");
              });
            }}
          />
          <span>
            <span className="font-medium">Start with Windows</span>
            <span className="mt-0.5 block text-[var(--muted)]">
              Tray only after login. Paste shortcut stays hot. Open the window from the tray.
            </span>
          </span>
        </label>
      ) : null}
      {error ? <p className="text-rose-300">{error}</p> : null}
    </div>
  );
}
