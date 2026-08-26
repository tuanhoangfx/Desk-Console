/**
 * Embed host main extra classes SSOT.
 *
 * When a tool is embedded as a child (iframe or host-embedded directory/split),
 * the host must provide a flex-column, overflow-hidden, and zero-padding main
 * pane so embedded dashboard/table bodies can size correctly.
 *
 * Reference: P0020 embed mode (`?embed=1`) and P0005 CRM embed mode (`?embed=1`).
 */
export const HUB_EMBED_HOST_MAIN_FLEX_EXTRA = "flex flex-col !p-0 overflow-hidden";

