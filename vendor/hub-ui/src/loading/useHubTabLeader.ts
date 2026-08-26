import { useEffect, useRef, useState } from "react";

/**
 * Exactly one tab per origin does the shared background work.
 *
 * Same-origin tabs share one renderer process and one memory ceiling, and every tab used to
 * open its own realtime socket and run its own drift/poll sync. With six Data Box tabs that is
 * six subscriptions and six sync loops competing inside one process, all doing identical work
 * whose result is broadcast between them anyway.
 *
 * `navigator.locks` gives leadership for free: the lock is held for the lifetime of the tab and
 * the browser hands it to another waiter the moment that tab closes or crashes — no heartbeat,
 * no stale-leader timeout to get wrong.
 *
 * Scope this to BACKGROUND work only. A user action (save, delete, manual refresh) must still
 * run in whichever tab the user is in; making those wait on leadership would make the tab the
 * user is looking at the one that cannot act.
 *
 * Where Web Locks is unavailable, every tab reports leader — the old behaviour, which is
 * correct, just not economical.
 */
export function useHubTabLeader(lockName: string): boolean {
  const [isLeader, setIsLeader] = useState(false);
  const releaseRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.locks?.request) {
      setIsLeader(true);
      return;
    }
    let active = true;
    // Held until this tab goes away: resolving the promise is what releases the lock.
    void navigator.locks
      .request(lockName, () => {
        if (!active) return Promise.resolve();
        setIsLeader(true);
        return new Promise<void>((resolve) => {
          releaseRef.current = resolve;
        });
      })
      .catch(() => {
        // A rejected lock request must not leave the app with no one doing the work.
        if (active) setIsLeader(true);
      });

    return () => {
      active = false;
      setIsLeader(false);
      releaseRef.current?.();
      releaseRef.current = null;
    };
  }, [lockName]);

  return isLeader;
}
