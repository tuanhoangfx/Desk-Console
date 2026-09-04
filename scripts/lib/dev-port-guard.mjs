/** Probe Vite / host ports — avoid duplicate spawns while dev stack is up. */
import net from "node:net";

export const DESK_VITE_PORT = 5180;
export const DESK_HOST_PORT_PROD = 6010;
export const DESK_HOST_PORT_DEV = 6011;

export function isPortListening(port, timeoutMs = 800) {
  return new Promise((resolve) => {
    const socket = net.connect(port, "127.0.0.1");
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(value);
    };
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.setTimeout(timeoutMs, () => finish(false));
  });
}

export function waitForPort(port, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = () => {
      void isPortListening(port, 500).then((up) => {
        if (up) resolve();
        else if (Date.now() > deadline) reject(new Error(`port :${port} did not open in time`));
        else setTimeout(tick, 300);
      });
    };
    tick();
  });
}
