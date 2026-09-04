# P0001 Desk Console

Standalone Windows host for workspace ops. **Not** Stealth (P0003) and **not** GPM (`S001`).

| Surface | Port |
|---------|------|
| Hub-UI (Vite) | `http://127.0.0.1:5180` |
| Host API | `http://127.0.0.1:6010` |

## V1

- **Clips** — save clipboard / paste inbox (replaces relying on Win+V alone)
- **Runners** — Start / Restart / Recover via `ensure-dev-product`
- **Tasks** — `Dev-*` scheduled tasks + Cursor GC
- Hotkeys: paste picker (default `Ctrl+Shift+Q`, no Alt / no Ctrl+Shift+V)

## Commands

```powershell
pnpm --dir Tool/P0001-Desk-Console test
node Tool/P0001-Desk-Console/host/server.mjs
node Tool/scripts/ensure-dev-product.cjs P0001
```

Desktop pipeline: P0003 (Electron + NSIS). Do not invent a third pack path.
