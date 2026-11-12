# Bundled rclone (Windows amd64)

`rclone.exe` is produced at pack time by `scripts/ensure-rclone-bundle.mjs`
(WinGet copy or GitHub release download). The binary is gitignored.

Packaged Folder Sync sets `RCLONE_PATH` to `resources/rclone/rclone.exe` so
any Windows machine can sync without a system rclone install.
