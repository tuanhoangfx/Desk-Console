import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

/** Shallow merge for optimistic display rows (Team/Member/Vault list patch). */
export function mergeHubDetailDisplayRow<T extends object>(prev: T, incoming: T): T {
  return { ...prev, ...incoming };
}

export type UseHubDetailDisplayRowOptions<T> = {
  /** When true, merge incoming prop into display row instead of replacing. */
  isSameRow?: (prev: T, incoming: T) => boolean;
  merge?: (prev: T, incoming: T) => T;
};

/**
 * Optimistic display row SSOT — parent prop may lag after save (`startTransition`).
 * Dirty checks must compare against `displayRow`, not the stale prop alone.
 */
export function useHubDetailDisplayRow<T extends object>(
  propRow: T,
  options: UseHubDetailDisplayRowOptions<T> = {},
): [T, Dispatch<SetStateAction<T>>] {
  const { isSameRow, merge = mergeHubDetailDisplayRow<T> } = options;
  const isSameRowRef = useRef(isSameRow);
  const mergeRef = useRef(merge);
  isSameRowRef.current = isSameRow;
  mergeRef.current = merge;
  const [displayRow, setDisplayRow] = useState(propRow);
  useEffect(() => {
    setDisplayRow((prev) => {
      const sameRow = isSameRowRef.current;
      const mergeRow = mergeRef.current;
      if (sameRow) {
        return sameRow(prev, propRow) ? mergeRow(prev, propRow) : propRow;
      }
      const prevId = (prev as { id?: string }).id;
      const nextId = (propRow as { id?: string }).id;
      if (prevId && nextId && prevId === nextId) return mergeRow(prev, propRow);
      if (prevId !== nextId) return propRow;
      return mergeRow(prev, propRow);
    });
  }, [propRow]);
  return [displayRow, setDisplayRow];
}

/** Dirty vs optimistic display row — never compare draft to stale parent prop only. */
export function useHubDetailDirtyBaseline<TDisplay, TDraft>(
  displayRow: TDisplay,
  draft: TDraft,
  isDirtyFn: (displayRow: TDisplay, draft: TDraft) => boolean,
): boolean {
  return useMemo(() => isDirtyFn(displayRow, draft), [displayRow, draft, isDirtyFn]);
}
