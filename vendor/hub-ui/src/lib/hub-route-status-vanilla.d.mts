/** Type declarations for hub-route-status-vanilla.mjs (portable route-status SSOT). */

export type HubRouteStatusDisplay = {
  label: string;
  tone: string;
  icon: string;
  title: string;
};

export function escapeHtml(s: string | number | null | undefined): string;

export function resolveExtensionRouteStatusDisplay(st?: {
  ok?: boolean;
  empty?: boolean;
  error?: string | null;
}): HubRouteStatusDisplay;

export function mapCloudRouteToExtensionStatus(opts: {
  syncStatus?: string | null;
  vaultCookieCount?: number | null;
  noteSyncedAt?: string | null;
}): { ok?: boolean; empty?: boolean; error?: string };

export function resolveCloudRouteHealthDisplay(opts: {
  syncStatus?: string | null;
  vaultCookieCount?: number | null;
  noteSyncedAt?: string | null;
}): HubRouteStatusDisplay;

export function renderRouteStatusLabelHtml(
  display: { label: string; tone?: string; icon: string; title?: string },
  renderIcon: (name: string, className?: string) => string,
): string;

/** @deprecated use renderRouteStatusLabelHtml */
export const renderRouteStatusChipHtml: typeof renderRouteStatusLabelHtml;
