export const HUB_MODAL_SEARCH_ATTR = "data-hub-modal-search";
export const HUB_MODAL_SEARCH_SELECTOR = `input[${HUB_MODAL_SEARCH_ATTR}]`;

function isVisibleSearchInput(input: HTMLInputElement | null | undefined): input is HTMLInputElement {
  return Boolean(input && input.getClientRects().length > 0 && !input.disabled);
}

/** Focus the nearest visible modal search input — prefers `data-hub-modal-search`. */
export function focusHubModalSearch(preferred?: HTMLInputElement | null): boolean {
  if (typeof document === "undefined") return false;
  if (preferred && !preferred.disabled) {
    preferred.focus();
    preferred.select?.();
    return true;
  }
  const modalRoots = Array.from(
    document.querySelectorAll<HTMLElement>(".modal-backdrop [role='dialog'][aria-modal='true']"),
  );
  for (const root of modalRoots) {
    const marked = Array.from(root.querySelectorAll<HTMLInputElement>(HUB_MODAL_SEARCH_SELECTOR)).find(
      isVisibleSearchInput,
    );
    if (marked) {
      marked.focus();
      marked.select?.();
      return true;
    }
    const fallback = Array.from(
      root.querySelectorAll<HTMLInputElement>('input[role="searchbox"], input[type="search"], input[name="hub-directory-search"]'),
    ).find(isVisibleSearchInput);
    if (!fallback) continue;
    fallback.focus();
    fallback.select?.();
    return true;
  }
  return false;
}
