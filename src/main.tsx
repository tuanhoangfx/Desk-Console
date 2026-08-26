import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initHubUserZoom, mountHubApp } from "@tool-workspace/hub-ui";
import App from "./App";
import { setupHubUi } from "./lib/hub-ui-setup";
import "./theme/hub-tailwind.css";
import "./styles.css";

setupHubUi();
initHubUserZoom();

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root not found");

mountHubApp(rootEl, () => {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
