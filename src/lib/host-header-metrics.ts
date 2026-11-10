import {
  formatGib,
  formatHostCpuValue,
  formatHostRamPercent,
  formatHostRamValue,
  HOST_HEADER_WIDE_MQ,
  hostLoadTone,
  resolveHostHeaderVisibleKeys,
  type HostHeaderStatKey,
  type TabHeaderStatItem,
} from "@tool-workspace/hub-ui";
import type { DeskHostMetrics } from "./api";

export {
  formatGib,
  formatHostCpuValue,
  formatHostRamPercent,
  formatHostRamValue,
  HOST_HEADER_WIDE_MQ,
  hostLoadTone,
  resolveHostHeaderVisibleKeys,
  type HostHeaderStatKey,
};

export const DESK_HOST_HEADER_STAT_STICKER = {
  cpu: "⚡",
  ram: "💾",
} as const;

/** Hub header — device CPU / RAM (P0003 Profiles centerStats SSOT). */
export function buildHostHeaderStats(
  metrics: DeskHostMetrics | null,
  options: { wide?: boolean } = {},
): TabHeaderStatItem[] {
  const wide = options.wide !== false;
  return [
    {
      key: "cpu",
      emojiGlyph: DESK_HOST_HEADER_STAT_STICKER.cpu,
      label: "CPU",
      value: formatHostCpuValue(metrics),
      toneClass: hostLoadTone(metrics?.cpuReady ? metrics.cpuPercent : null),
    },
    {
      key: "ram",
      emojiGlyph: DESK_HOST_HEADER_STAT_STICKER.ram,
      label: "RAM",
      value: formatHostRamValue(metrics, wide),
      toneClass: hostLoadTone(metrics?.ramPercent),
      className: "desk-host-ram-stat",
    },
  ];
}
