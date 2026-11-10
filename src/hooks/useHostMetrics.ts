import { createSharedHostMetricsHook } from "@tool-workspace/hub-ui";
import { deskApi, type DeskHostMetrics } from "../lib/api";

const deskHostMetrics = createSharedHostMetricsHook<DeskHostMetrics>(() => deskApi.hostMetrics());

/** Live host CPU / RAM — one poll shared across Desk screens (P0003 parity). */
export const { useHostMetrics, readCurrentMetrics, refreshNow } = deskHostMetrics;
