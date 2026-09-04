import { hubUserZoomBootScript } from "../hub-user-zoom";

/** Blocking `<head>` script — apply stored hub zoom before React hydrates (Next.js SSR). */
export function HubUserZoomBoot() {
  return <script dangerouslySetInnerHTML={{ __html: hubUserZoomBootScript() }} />;
}
