import http from "node:http";

export const DEV_UI_ORIGIN = "http://127.0.0.1:3009";

export function devUiRedirectEnabled(env = process.env) {
  return String(env.FOLDER_SYNC_DEV_UI || "") === "1";
}

/**
 * Packaged Folder Sync.exe loads the host, which serves the last vite build.
 * While this flag is on and Vite answers, send the document to Vite so the
 * open exe follows source. API and hashed files stay on the host.
 */
export function devUiRedirectTarget(method, pathname, viteUp, origin = DEV_UI_ORIGIN) {
  if (String(method || "").toUpperCase() !== "GET" || !viteUp) return null;
  const pathOnly = String(pathname || "/").split("?")[0] || "/";
  if (pathOnly === "/api" || pathOnly.startsWith("/api/")) return null;
  const leaf = pathOnly.split("/").pop() || "";
  if (leaf.includes(".")) return null;
  return origin + (pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`);
}

export function refreshDevUi(origin = DEV_UI_ORIGIN) {
  return new Promise((resolve) => {
    const req = http.get(origin, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
    req.on("error", () => resolve(false));
  });
}
