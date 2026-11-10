/// <reference types="vite/client" />

declare module "*.json" {
  const value: { version: string; name?: string };
  export default value;
}

interface Window {
  deskConsole?: {
    apiOrigin?: string;
    isDev?: boolean;
    appVersion?: string;
    closePicker?: () => void;
    rebindHotkeys?: () => Promise<{ ok?: boolean; picker?: string; boundPicker?: string }>;
    pickerSnapshot?: () => { rows?: import("./lib/api").ClipRow[]; labels?: { picker?: string } } | null;
    onPickerData?: (
      cb: (data: { rows?: import("./lib/api").ClipRow[]; labels?: { picker?: string } } | null | undefined) => void,
    ) => () => void;
    pasteClip?: (
      id: string,
      text: string,
      imageDataUrl?: string,
    ) => Promise<{ ok?: boolean; pasted?: boolean; error?: string }>;
    copyClip?: (
      id: string,
      text: string,
      imageDataUrl?: string,
    ) => Promise<{ ok?: boolean; copied?: boolean; error?: string }>;
    pinClip?: (
      id: string,
      pinned: boolean,
    ) => Promise<{ ok?: boolean; row?: import("./lib/api").ClipRow; error?: string }>;
    loginItem?: (enabled?: boolean) => Promise<{ ok?: boolean; openAtLogin?: boolean; applied?: boolean; packaged?: boolean }>;
  };
}
