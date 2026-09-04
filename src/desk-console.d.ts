export {};

declare global {
  interface Window {
    deskConsole?: {
      apiOrigin?: string;
      isDev?: boolean;
      appVersion?: string;
      closePicker?: () => void;
      rebindHotkeys?: () => Promise<{ ok?: boolean; picker?: string; boundPicker?: string }>;
      pickerSnapshot?: () => { rows?: import("./lib/api").ClipRow[]; labels?: { picker?: string } };
      onPickerData?: (
        cb: (data: { rows?: import("./lib/api").ClipRow[]; labels?: { picker?: string } }) => void,
      ) => () => void;
      pasteClip?: (id: string, text: string) => Promise<{ ok?: boolean; pasted?: boolean; error?: string }>;
      copyClip?: (id: string, text: string) => Promise<{ ok?: boolean; copied?: boolean; error?: string }>;
      loginItem?: (
        enabled?: boolean,
      ) => Promise<{ ok?: boolean; openAtLogin?: boolean; packaged?: boolean; applied?: boolean }>;
    };
  }
}
