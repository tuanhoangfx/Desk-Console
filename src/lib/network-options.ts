import type { FilterOption } from "@tool-workspace/hub-ui";

export const BWLIMIT_OPTIONS: FilterOption[] = [
  { value: "UNLIMITED", label: "Unlimited", emoji: "🚀", detail: "Use full available network bandwidth." },
  { value: "2M", label: "2 MiB/s", emoji: "🐢", detail: "Light background sync (saves bandwidth for meetings/browsing)." },
  { value: "5M", label: "5 MiB/s", emoji: "⚡", detail: "Steady background cap (recommended for shared home/office Wi-Fi)." },
  { value: "10M", label: "10 MiB/s", emoji: "⚡", detail: "Balanced cap (~80 Mbps) for fast sync without saturating LAN." },
  { value: "25M", label: "25 MiB/s", emoji: "🔥", detail: "High-speed cap (~200 Mbps) for fiber connections." },
  { value: "50M", label: "50 MiB/s", emoji: "🔥", detail: "Gigabit cap (~400 Mbps)." },
];

export const DRIVE_BWLIMIT_OPTIONS: FilterOption[] = [
  { value: "INHERIT", label: "System Default", emoji: "⚙️", detail: "Use the global Bandwidth Limit configured on the System screen." },
  { value: "2M", label: "2 MiB/s", emoji: "🐢", detail: "Cap this Drive account at 2 MiB/s." },
  { value: "5M", label: "5 MiB/s", emoji: "⚡", detail: "Cap this Drive account at 5 MiB/s." },
  { value: "10M", label: "10 MiB/s", emoji: "⚡", detail: "Cap this Drive account at 10 MiB/s." },
  { value: "25M", label: "25 MiB/s", emoji: "🔥", detail: "Cap this Drive account at 25 MiB/s." },
  { value: "50M", label: "50 MiB/s", emoji: "🔥", detail: "Cap this Drive account at 50 MiB/s." },
];

export const TPSLIMIT_OPTIONS: FilterOption[] = [
  { value: "4", label: "4 req/s (Safe)", emoji: "🛡️", detail: "Prevents Google Drive 403/429 rate-limits when running many accounts." },
  { value: "8", label: "8 req/s (Balanced)", emoji: "⚖️", detail: "Recommended default for smooth Google Drive API throughput." },
  { value: "12", label: "12 req/s (Fast)", emoji: "⚡", detail: "Faster folder listing & checks for single-account setups." },
  { value: "0", label: "Unlimited", emoji: "🚀", detail: "No rclone API transaction rate cap." },
];

export const TRANSFERS_OPTIONS: FilterOption[] = [
  { value: "2", label: "2 files", emoji: "📄", detail: "Low concurrency — keeps latency low on slower connections." },
  { value: "4", label: "4 files (Default)", emoji: "📚", detail: "Standard rclone parallel file transfers." },
  { value: "8", label: "8 files", emoji: "🚀", detail: "High concurrency for folders with many small files." },
];

export const PROXY_FAILOVER_OPTIONS: FilterOption[] = [
  {
    value: "true",
    label: "Auto-fallback to Direct (Recommended)",
    emoji: "🛡️",
    detail: "If a proxy times out or drops during 24/7 sync, automatically retry over Direct connection.",
  },
  {
    value: "false",
    label: "Strict Proxy Only",
    emoji: "🔒",
    detail: "Never bypass proxy — fail the sync pass if the configured proxy is unreachable.",
  },
];
