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
      pasteClip?: (id: string, text: string, imageDataUrl?: string) => Promise<{ ok?: boolean; pasted?: boolean; error?: string }>;
      copyClip?: (id: string, text: string, imageDataUrl?: string) => Promise<{ ok?: boolean; copied?: boolean; error?: string }>;
      pinClip?: (id: string, pinned: boolean) => Promise<{ ok?: boolean; row?: import("./lib/api").ClipRow; error?: string }>;
      loginItem?: (
        enabled?: boolean,
      ) => Promise<{ ok?: boolean; openAtLogin?: boolean; packaged?: boolean; applied?: boolean }>;
      getUpdateStatus?: () => Promise<import("@tool-workspace/hub-ui").HubDesktopUpdateBridgeStatus>;
      checkForUpdates?: () => Promise<import("@tool-workspace/hub-ui").HubDesktopUpdateBridgeStatus | void>;
      downloadUpdate?: () => Promise<import("@tool-workspace/hub-ui").HubDesktopUpdateBridgeStatus | void>;
      installUpdate?: () => Promise<import("@tool-workspace/hub-ui").HubDesktopUpdateBridgeStatus | void>;
      onUpdateStatus?: (
        callback: (status: import("@tool-workspace/hub-ui").HubDesktopUpdateBridgeStatus) => void,
      ) => () => void;
    };
  }
}
