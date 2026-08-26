let resolveHideWhenSinglePage: (() => boolean) | null = null;
let pagerChangeEvent: string | null = null;

/** Host app registers directory pager visibility (e.g. P0016 Settings toggle). */
export function configureDirectoryPager(opts: {
  hideWhenSinglePage: () => boolean;
  changeEvent?: string;
}) {
  resolveHideWhenSinglePage = opts.hideWhenSinglePage;
  pagerChangeEvent = opts.changeEvent ?? null;
}

export function directoryPagerChangeEvent(): string | null {
  return pagerChangeEvent;
}

/** When true, pager is hidden on single-page tables. Default false — pager always visible (golden L2). */
export function directoryPagerHideWhenSinglePage(): boolean {
  return resolveHideWhenSinglePage?.() ?? false;
}
