/** Group consecutive runtime console lines — e.g. repeated API polls (P0003/P0027 SSOT). */

export type HubRuntimeConsoleLogLike = {
  id: string;
  channel: string;
  source: string;
  level: string;
  time: string;
  message: string;
  durationMs?: number;
};

export type HubRuntimeConsoleDisplayRow<T extends HubRuntimeConsoleLogLike> =
  | { kind: "single"; log: T }
  | {
      kind: "group";
      key: string;
      count: number;
      representative: T;
      durationMsAvg?: number;
    };

export function groupHubRuntimeConsoleLogs<T extends HubRuntimeConsoleLogLike>(
  logs: T[],
  opts?: { groupChannels?: string[]; minCount?: number },
): HubRuntimeConsoleDisplayRow<T>[] {
  const channels = new Set(opts?.groupChannels ?? ["api"]);
  const minCount = opts?.minCount ?? 2;
  const out: HubRuntimeConsoleDisplayRow<T>[] = [];
  let i = 0;

  while (i < logs.length) {
    const log = logs[i]!;
    if (!channels.has(log.channel)) {
      out.push({ kind: "single", log });
      i++;
      continue;
    }

    let j = i + 1;
    while (
      j < logs.length &&
      logs[j]!.channel === log.channel &&
      logs[j]!.source === log.source &&
      logs[j]!.level === log.level
    ) {
      j++;
    }

    const slice = logs.slice(i, j);
    if (slice.length >= minCount) {
      const durations = slice
        .map((entry) => entry.durationMs)
        .filter((ms): ms is number => typeof ms === "number" && ms > 0);
      const durationMsAvg =
        durations.length > 0
          ? Math.round(durations.reduce((sum, ms) => sum + ms, 0) / durations.length)
          : undefined;
      out.push({
        kind: "group",
        key: `${log.channel}:${log.source}:${log.level}:${log.id}`,
        count: slice.length,
        representative: log,
        durationMsAvg,
      });
    } else {
      for (const entry of slice) out.push({ kind: "single", log: entry });
    }
    i = j;
  }

  return out;
}

export function formatHubRuntimeConsoleGroupMessage(count: number, durationMsAvg?: number): string {
  const parts = [`×${count} calls`];
  if (durationMsAvg != null) parts.push(`avg ${durationMsAvg}ms`);
  return parts.join(" · ");
}
