/**
 * Boot loader safety — runs before main.tsx.
 * - Hides loader when app signals hub-boot-ready
 * - Surfaces module/runtime errors instead of infinite spinner / blank screen
 * - Cold Vite prebundle: probe deps + early server-offline / hung-prebundle hints
 */
(function () {
  var BOOT_ID = "hub-boot-loader";
  // Cold sibling embeds compile a deep P0004 screen graph on first navigation.
  // A short /@vite/client probe races that compilation (and other Dev tabs'
  // HMR queue) and used to paint "nothing is serving" while Vite is LISTEN.
  var SERVER_PROBE_MS = 12000;
  var SERVER_PROBE_TIMEOUT_MS = 12000;
  var SERVER_PROBE_TRIES = 3;
  var SERVER_PROBE_GAP_MS = 1500;
  var PREBUNDLE_HINT_MS = 28000;
  var FINAL_TIMEOUT_MS = 120000;
  var DEP_PROBE_INTERVAL_MS = 15000;
  var DEP_PROBE_TIMEOUT_MS = 10000;
  var DEP_PROBE_FAIL_LIMIT = 2;

  window.__hubBootReady = false;
  var depProbeFails = 0;
  var hungShown = false;

  // Every diagnostic below this line is about a local Vite dev server: it probes
  // /@vite/client and /node_modules/.vite/deps/react.js, and its hints tell you to run
  // pnpm dev:recover or tskill a PID. On a deployed static host none of that exists, so a
  // merely slow boot used to show visitors "Vite is preparing modules after a cold start"
  // plus PowerShell instructions, and then poll a 404 every 15s forever.
  var IS_DEV_HOST = (function () {
    var h = window.location.hostname;
    return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h.endsWith(".localhost");
  })();

  function getLoaderEl() {
    return document.getElementById(BOOT_ID);
  }

  /**
   * The app mounted, whatever the boot-ready signal says. A tool opened in a background tab
   * mounts normally but its rAF-scheduled hideBootLoader() never runs, so every timer below
   * used to keep firing against a working app — ending on a full-screen "did not finish
   * loading" error on top of rendered content. Rendered children are the ground truth.
   */
  function appHasRendered() {
    var root = document.getElementById("root");
    return !!root && root.childElementCount > 0;
  }

  function bootSettled() {
    if (window.__hubBootReady) return true;
    if (!appHasRendered()) return false;
    window.__hubBootReady = true;
    var el = getLoaderEl();
    if (el) el.remove();
    return true;
  }

  function showBootWaiting(message, submessage) {
    var el = getLoaderEl();
    if (!el || window.__hubBootReady) return;
    el.classList.add("hub-boot-loader--pane");
    el.style.pointerEvents = "none";
    el.setAttribute("role", "status");
    el.setAttribute("aria-label", message || "Loading");
    var existing = el.querySelector(".hub-boot-wait-text");
    if (!existing) {
      existing = document.createElement("p");
      existing.className = "hub-boot-wait-text";
      existing.style.cssText =
        "margin:0.75rem 0 0;font-size:0.75rem;line-height:1.5;color:#94a3b8;font-family:Inter,system-ui,sans-serif;text-align:center;max-width:20rem";
      el.appendChild(existing);
    }
    existing.textContent = submessage || message;
  }

  function showBootError(message, detail) {
    var el = getLoaderEl();
    if (!el) return;
    el.classList.remove("hub-boot-loader--pane");
    el.style.pointerEvents = "auto";
    el.setAttribute("role", "alert");
    el.setAttribute("aria-label", "App failed to load");
    el.innerHTML =
      '<div style="max-width:32rem;padding:1.5rem;text-align:center;font-family:Inter,system-ui,sans-serif;color:#e8ecff">' +
      '<p style="margin:0 0 0.5rem;font-size:0.95rem;font-weight:600">App failed to load</p>' +
      '<p style="margin:0 0 0.75rem;font-size:0.75rem;line-height:1.5;color:#94a3b8">' +
      (message || "JavaScript did not start.") +
      "</p>" +
      (detail
        ? '<pre style="margin:0 0 1rem;padding:0.75rem;border-radius:0.5rem;background:rgba(15,23,42,0.85);color:#fca5a5;font:11px/1.45 ui-monospace,Consolas,monospace;text-align:left;white-space:pre-wrap;word-break:break-word;max-height:10rem;overflow:auto">' +
          detail +
          "</pre>"
        : "") +
      '<p style="margin:0 0 1rem;font-size:0.7rem;color:#64748b">Try hard refresh <kbd style="padding:0.1rem 0.35rem;border-radius:0.25rem;background:rgba(99,102,241,0.2);color:#a5b4fc">Ctrl+Shift+R</kbd> or restart dev server.</p>' +
      '<button type="button" onclick="location.reload()" style="cursor:pointer;border:1px solid rgba(129,140,248,0.4);border-radius:0.5rem;background:rgba(99,102,241,0.15);color:#c7d2fe;padding:0.45rem 1rem;font-size:0.75rem">Reload</button>' +
      "</div>";
  }

  function isHardViteOffline(result) {
    var reason = String((result && result.reason) || "");
    if (!reason || reason === "timeout") return false;
    return /failed|refused|network|err_connection/i.test(reason);
  }

  function fetchProbe(url, timeoutMs) {
    return new Promise(function (resolve) {
      var done = false;
      var timer = window.setTimeout(function () {
        if (done) return;
        done = true;
        resolve({ ok: false, reason: "timeout" });
      }, timeoutMs);
      fetch(url, { cache: "no-store" })
        .then(function (r) {
          if (done) return;
          done = true;
          window.clearTimeout(timer);
          resolve({ ok: r.ok, status: r.status });
        })
        .catch(function (e) {
          if (done) return;
          done = true;
          window.clearTimeout(timer);
          resolve({ ok: false, reason: e && e.message ? e.message : "network" });
        });
    });
  }

  function devRecoverHint(fallbackPort) {
    var metaPort = document.querySelector('meta[name="hub-dev-port"]');
    var metaFolder = document.querySelector('meta[name="hub-dev-folder"]');
    var port = (metaPort && metaPort.content) || fallbackPort || "5175";
    var folder = (metaFolder && metaFolder.content) || "the tool folder";
    return (
      "Nothing is serving http://127.0.0.1:" +
      port +
      "\nIn " +
      folder +
      " run:\n  pnpm dev:node\n  or pnpm dev:recover"
    );
  }

  function showHungPrebundleError() {
    if (bootSettled() || hungShown) return;
    hungShown = true;
    var port = window.location.port || "5175";
    showBootError(
      "Vite prebundle is hung or stale.",
      "react.js did not load in time. In the tool folder run:\n" +
        "  pnpm dev:recover\n" +
        "Or keep Vite alive with:\n" +
        "  pnpm dev:node\n" +
        "If recover fails (Access Denied), in PowerShell:\n" +
        "  tskill <PID> /A\n" +
        "  (find PID: netstat -ano | findstr :" +
        port +
        ")",
    );
  }

  function probeViteDeps() {
    if (bootSettled() || hungShown) return;
    fetchProbe("/node_modules/.vite/deps/react.js", DEP_PROBE_TIMEOUT_MS).then(function (r) {
      if (bootSettled() || hungShown) return;
      if (!r.ok) {
        depProbeFails += 1;
        if (depProbeFails >= DEP_PROBE_FAIL_LIMIT) {
          showHungPrebundleError();
          return;
        }
      } else {
        depProbeFails = 0;
      }
      if (!window.__hubBootReady && !hungShown) {
        window.setTimeout(probeViteDeps, DEP_PROBE_INTERVAL_MS);
      }
    });
  }

  window.addEventListener("hub-boot-ready", function () {
    window.__hubBootReady = true;
    var el = getLoaderEl();
    if (el) el.remove();
  });

  /**
   * Post-mount crash watchdog. An uncaught render throw makes React unmount the whole
   * root, and every timer above has already bailed via bootSettled() — the tab is left
   * as a silent black screen. An emptied root after a successful mount is that crash.
   */
  (function watchPostMountCrash() {
    var CRASH_ID = "hub-boot-crash";
    var SETTLE_MS = 750;
    var root = document.getElementById("root");
    if (!root || typeof MutationObserver !== "function") return;
    var mounted = false;
    var timer = null;

    function showCrash() {
      if (document.getElementById(CRASH_ID)) return;
      var el = document.createElement("div");
      el.id = CRASH_ID;
      el.setAttribute("role", "alert");
      el.style.cssText =
        "position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:#0b1220";
      var lastErr = "";
      try {
        lastErr = String(window.__HUB_LAST_RENDER_ERROR || window.__P0021_LAST_ERROR || "").slice(0, 1200);
      } catch (e) {
        lastErr = "";
      }
      el.innerHTML =
        '<div style="max-width:32rem;padding:1.5rem;text-align:center;font-family:Inter,system-ui,sans-serif;color:#e8ecff">' +
        '<p style="margin:0 0 0.5rem;font-size:0.95rem;font-weight:600">This screen stopped rendering</p>' +
        '<p style="margin:0 0 1rem;font-size:0.75rem;line-height:1.5;color:#94a3b8">An unexpected error unmounted the app. Reload to continue.</p>' +
        (lastErr
          ? '<pre style="margin:0 0 1rem;padding:0.75rem;border-radius:0.5rem;background:rgba(15,23,42,0.85);color:#fca5a5;font:11px/1.45 ui-monospace,Consolas,monospace;text-align:left;white-space:pre-wrap;word-break:break-word;max-height:10rem;overflow:auto">' +
            lastErr.replace(/[<>&]/g, function (ch) {
              return ch === "<" ? "&lt;" : ch === ">" ? "&gt;" : "&amp;";
            }) +
            "</pre>"
          : "") +
        '<button type="button" onclick="location.reload()" style="cursor:pointer;border:1px solid rgba(129,140,248,0.4);border-radius:0.5rem;background:rgba(99,102,241,0.15);color:#c7d2fe;padding:0.45rem 1rem;font-size:0.75rem">Reload</button>' +
        "</div>";
      document.body.appendChild(el);
    }

    new MutationObserver(function () {
      if (root.childElementCount > 0) {
        mounted = true;
        if (timer) {
          window.clearTimeout(timer);
          timer = null;
        }
        var existing = document.getElementById(CRASH_ID);
        if (existing) existing.remove();
        return;
      }
      if (!mounted || timer) return;
      timer = window.setTimeout(function () {
        timer = null;
        if (root.childElementCount === 0) showCrash();
      }, SETTLE_MS);
    }).observe(root, { childList: true });
  })();

  window.addEventListener("error", function (event) {
    if (bootSettled()) return;
    var msg = event.message || "Script error";
    var detail = event.filename ? event.filename + ":" + (event.lineno || "?") : "";
    showBootError(msg, detail);
  });

  window.addEventListener("unhandledrejection", function (event) {
    if (bootSettled()) return;
    var reason = event.reason;
    var msg = reason && reason.message ? reason.message : String(reason || "Unhandled promise rejection");
    showBootError(msg);
  });

  function probeDevServer(triesLeft) {
    if (bootSettled() || hungShown || !IS_DEV_HOST) return;
    fetchProbe("/@vite/client", SERVER_PROBE_TIMEOUT_MS).then(function (r) {
      if (bootSettled() || hungShown || r.ok) return;
      if (r.reason === "timeout") {
        showBootWaiting(
          "Vite is compiling…",
          "Dev server is busy (first compile or other tool tabs). Keep this tab open.",
        );
        if (triesLeft > 1) {
          window.setTimeout(function () {
            probeDevServer(triesLeft - 1);
          }, SERVER_PROBE_GAP_MS);
        }
        return;
      }
      if (!isHardViteOffline(r)) return;
      if (triesLeft > 1) {
        showBootWaiting("Reconnecting to Vite…", "The dev server may be restarting after a file change.");
        window.setTimeout(function () {
          probeDevServer(triesLeft - 1);
        }, SERVER_PROBE_GAP_MS);
        return;
      }
      hungShown = true;
      showBootError("Dev server is not responding.", devRecoverHint(window.location.port));
    });
  }

  window.setTimeout(function () {
    probeDevServer(SERVER_PROBE_TRIES);
  }, SERVER_PROBE_MS);

  window.setTimeout(function () {
    if (bootSettled() || hungShown) return;
    if (!IS_DEV_HOST) {
      showBootWaiting("Still loading…", "The app is taking longer than usual to start.");
      return;
    }
    showBootWaiting(
      "Prebundling dependencies…",
      "Vite is preparing modules after a cold start — this may take 1–2 minutes.",
    );
    probeViteDeps();
  }, PREBUNDLE_HINT_MS);

  window.setTimeout(function () {
    if (bootSettled() || hungShown) return;
    if (!IS_DEV_HOST) {
      showBootError(
        "The app did not finish loading.",
        "Reload the page. If it keeps failing, check your connection or try again shortly.",
      );
      return;
    }
    var port = window.location.port || "PORT";
    showBootError(
      "JavaScript did not start in time.",
      "The HTML loaded but the app module did not mount.\n" +
        "Hard refresh Ctrl+Shift+R and keep this tab in the foreground.\n" +
        "If http://127.0.0.1:" +
        port +
        " is actually refused:\n" +
        "  pnpm dev:node\n" +
        "  or pnpm dev:recover",
    );
  }, FINAL_TIMEOUT_MS);
})();
