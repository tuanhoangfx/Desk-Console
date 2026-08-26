# P0001 Desk Console — agent notes

- Local-only API (`127.0.0.1:6010`). No AuthGate in V1.
- Do not alias this code to `Tool/Storage/S001-*` (GPM, shelved).
- Do not call Stealth `:6003`.
- Cleanup presets must stay on Cursor DB / this app’s `%APPDATA%\desk-console` — never wholesale Windows purge.
- Restart Vite/worker: `POST /api/runners/P00xx/restart` — do not ask the user to ping an IDE agent.
