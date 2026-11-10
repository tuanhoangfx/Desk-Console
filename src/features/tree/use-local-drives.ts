import { useEffect, useMemo, useState } from "react";
import { fetchLocalDrives, type LocalDriveInfo } from "../../lib/sync-api";
import type { FolderRootOption } from "./FolderPickDropdown";

const FALLBACK_DRIVE_ROOT_OPTIONS: FolderRootOption[] = [
  { value: "C:\\", label: "C:\\", emoji: "💿" },
  { value: "D:\\", label: "D:\\", emoji: "💿" },
  { value: "E:\\", label: "E:\\", emoji: "💿" },
];

let cachedDrives: LocalDriveInfo[] | null = null;

export function useLocalDriveRootOptions(enabled = true): FolderRootOption[] {
  const [drives, setDrives] = useState<LocalDriveInfo[] | null>(cachedDrives);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    void fetchLocalDrives()
      .then((res) => {
        if (!alive || !Array.isArray(res?.drives) || res.drives.length === 0) return;
        cachedDrives = res.drives;
        setDrives(res.drives);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [enabled]);

  return useMemo(() => {
    if (!drives || drives.length === 0) return FALLBACK_DRIVE_ROOT_OPTIONS;
    return drives.map((d) => ({
      value: d.root,
      label: d.label || d.root,
      emoji: "💿",
    }));
  }, [drives]);
}
