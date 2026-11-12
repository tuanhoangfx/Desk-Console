import type { HubDesktopUpdateBridge } from "@tool-workspace/hub-ui";
import type { ClipRow } from "./lib/api";

export type DeskConsoleDesktopBridge = HubDesktopUpdateBridge & {
  apiOrigin?: string;
  isDev?: boolean;
  appVersion?: string;
  openPicker?: () => Promise<unknown>;
  closePicker?: () => void;
  rebindHotkeys?: () => Promise<{ ok?: boolean; picker?: string; boundPicker?: string }>;
  pickerSnapshot?: () => { rows?: ClipRow[]; labels?: { picker?: string } } | null;
  onPickerData?: (
    cb: (data: { rows?: ClipRow[]; labels?: { picker?: string } } | null | undefined) => void,
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
  ) => Promise<{ ok?: boolean; row?: ClipRow; error?: string }>;
  loginItem?: (
    enabled?: boolean,
  ) => Promise<{ ok?: boolean; openAtLogin?: boolean; packaged?: boolean; applied?: boolean }>;
};

export type FolderSyncDesktopBridge = {
  browseFolder?: (
    initialPath?: string,
  ) => Promise<{ ok?: boolean; cancelled?: boolean; path?: string; error?: string }>;
  openLocal?: (target: string) => Promise<{ ok?: boolean; error?: string }>;
  openExternal?: (url: string) => Promise<{ ok?: boolean; error?: string }>;
};

declare global {
  interface Window {
    deskConsole?: DeskConsoleDesktopBridge;
    folderSyncDesktop?: FolderSyncDesktopBridge;
  }
}
