export {};

declare global {
  interface Window {
    deskConsole?: {
      apiOrigin?: string;
      closePicker?: () => void;
      rebindHotkeys?: () => Promise<{ ok?: boolean; picker?: string; capture?: string }>;
      pickerSnapshot?: () => { rows?: import("./lib/api").ClipRow[]; labels?: { picker?: string; capture?: string } };
      onPickerData?: (
        cb: (data: { rows?: import("./lib/api").ClipRow[]; labels?: { picker?: string; capture?: string } }) => void,
      ) => () => void;
      pasteClip?: (id: string) => Promise<{ ok?: boolean; pasted?: boolean }>;
      loginItem?: (
        enabled?: boolean,
      ) => Promise<{ ok?: boolean; openAtLogin?: boolean; packaged?: boolean; applied?: boolean }>;
    };
  }
}
