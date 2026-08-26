/** Measured height of `[data-hub-main-chrome]` stack — portaled loader centers below it. */
export const HUB_MAIN_CHROME_TOP_VAR = "--hub-main-chrome-top";

export function syncHubMainChromeInset(main: HTMLElement | null) {
  if (!main) return;
  const chrome = main.querySelector<HTMLElement>("[data-hub-main-chrome]");
  if (!chrome || chrome.offsetHeight === 0) {
    main.style.setProperty(HUB_MAIN_CHROME_TOP_VAR, "0px");
    document.documentElement.style.setProperty(HUB_MAIN_CHROME_TOP_VAR, "0px");
    return;
  }
  const mainTop = main.getBoundingClientRect().top;
  const chromeBottom = chrome.getBoundingClientRect().bottom;
  const inset = Math.max(0, Math.round(chromeBottom - mainTop));
  const value = `${inset}px`;
  main.style.setProperty(HUB_MAIN_CHROME_TOP_VAR, value);
  document.documentElement.style.setProperty(HUB_MAIN_CHROME_TOP_VAR, value);
}
