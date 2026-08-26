export function formatHotkeyLabel(acc: string) {
  return String(acc || "")
    .replace(/CommandOrControl/gi, "Ctrl")
    .replace(/Command/gi, "Ctrl")
    .replace(/Control/gi, "Ctrl")
    .replace(/Super/gi, "Win")
    .replace(/Meta/gi, "Win");
}

export function acceleratorFromKeyboardEvent(event: KeyboardEvent): string | null {
  const key = keyFromEvent(event);
  if (!key) return null;
  const mods: string[] = [];
  if (event.ctrlKey) mods.push("CommandOrControl");
  if (event.altKey) mods.push("Alt");
  if (event.shiftKey) mods.push("Shift");
  if (event.metaKey) mods.push("Super");
  return [...mods, key].join("+");
}

function keyFromEvent(event: KeyboardEvent): string | null {
  const { code, key } = event;
  if (["Control", "Alt", "Shift", "Meta", "OS"].includes(key)) return null;
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(key)) return key;
  if (code.startsWith("Key") && code.length === 4) return code.slice(3);
  if (code.startsWith("Digit") && code.length === 6) return code.slice(5);
  const named: Record<string, string> = {
    Space: "Space",
    Escape: "Esc",
    Tab: "Tab",
    Backspace: "Backspace",
    Delete: "Delete",
    Insert: "Insert",
    Enter: "Return",
    ArrowUp: "Up",
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
    Home: "Home",
    End: "End",
    PageUp: "PageUp",
    PageDown: "PageDown",
  };
  return named[code] || named[key] || (key.length === 1 ? key.toUpperCase() : null);
}
