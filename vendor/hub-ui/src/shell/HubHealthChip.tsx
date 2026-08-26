export type HubSyncHealth = "synced" | "stale" | "offline";

export type HubHealthChipProps = {
  health: HubSyncHealth;
  /** Short resource name, e.g. Vault, Bridge, Cache */
  name: string;
  title?: string;
  titles?: Partial<Record<HubSyncHealth, string>>;
};

export function HubHealthChip({ health, name, title, titles }: HubHealthChipProps) {
  const tone =
    health === "synced"
      ? { dot: "bg-emerald-400", ring: "border-emerald-400/35 text-emerald-200", label: name }
      : health === "stale"
        ? { dot: "bg-amber-300", ring: "border-amber-400/35 text-amber-100", label: `${name} stale` }
        : { dot: "bg-rose-400", ring: "border-rose-400/35 text-rose-200", label: `${name} offline` };

  const defaultTitle =
    titles?.[health] ??
    (health === "synced"
      ? `${name} synced with cloud`
      : health === "stale"
        ? `Showing last loaded ${name.toLowerCase()} data — refresh will retry`
        : `${name} unreachable — check sign-in and service status`);

  return (
    <span
      className={`inline-flex h-[var(--hub-control-h)] shrink-0 items-center gap-1.5 rounded-lg border bg-[var(--panel-2)] px-2.5 text-xs font-medium ${tone.ring}`}
      title={title ?? defaultTitle}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} aria-hidden />
      {tone.label}
    </span>
  );
}
