; Shared Hub Desktop NSIS upgrade guard (synced via sync-electron-shared-libs.cjs -> build/nsis-uninstaller-unlock.nsh).
; Fixes "Extract: error writing to file Uninstall <ProductName>.exe" on Windows 10/11 upgrades when:
;   1. %TEMP%\...\old-uninstaller.exe is blocked/scanned by Defender/SmartScreen and NSIS falls back to
;      running "$INSTDIR\Uninstall <ProductName>.exe _?=$INSTDIR" in-place; or
;   2. Defender/ASR, Explorer icon handler, or NTFS DELETE_PENDING still maps "$INSTDIR\Uninstall <ProductName>.exe"
;      at the exact moment `File "/oname=${UNINSTALL_FILENAME}"` runs (which has zero built-in retries in NSIS).

!macro hubPrepareUpgradeInit
  ClearErrors
  SetFileAttributes "$INSTDIR\${UNINSTALL_FILENAME}.stale" NORMAL
  Delete "$INSTDIR\${UNINSTALL_FILENAME}.stale"
  SetFileAttributes "$INSTDIR\${UNINSTALL_FILENAME}.stale2" NORMAL
  Delete "$INSTDIR\${UNINSTALL_FILENAME}.stale2"
  SetFileAttributes "$INSTDIR\uninstallerIcon.ico" NORMAL
  ClearErrors
!macroend

!macro hubUnlockUninstallerBeforeWrite
  Push $0
  Push $1
  ClearErrors

  ; Reap any previous stale renamed uninstaller binaries if no longer mapped
  SetFileAttributes "$INSTDIR\${UNINSTALL_FILENAME}.stale" NORMAL
  Delete "$INSTDIR\${UNINSTALL_FILENAME}.stale"
  SetFileAttributes "$INSTDIR\${UNINSTALL_FILENAME}.stale2" NORMAL
  Delete "$INSTDIR\${UNINSTALL_FILENAME}.stale2"

  ${If} ${FileExists} "$INSTDIR\uninstallerIcon.ico"
    SetFileAttributes "$INSTDIR\uninstallerIcon.ico" NORMAL
  ${EndIf}

  ${If} ${FileExists} "$INSTDIR\${UNINSTALL_FILENAME}"
    SetFileAttributes "$INSTDIR\${UNINSTALL_FILENAME}" NORMAL
    ClearErrors
    Delete "$INSTDIR\${UNINSTALL_FILENAME}"

    ${If} ${FileExists} "$INSTDIR\${UNINSTALL_FILENAME}"
      nsExec::Exec `"$SYSDIR\taskkill.exe" /F /IM "${UNINSTALL_FILENAME}" /T`
      Pop $0
      nsExec::Exec `"$SYSDIR\taskkill.exe" /F /IM "old-uninstaller.exe" /T`
      Pop $0
      nsExec::Exec `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -WindowStyle Hidden -Command "Get-Process -ErrorAction SilentlyContinue | Where-Object { $$_.Path -and ($$_.Path -ieq '$INSTDIR\${UNINSTALL_FILENAME}') } | Stop-Process -Force -ErrorAction SilentlyContinue"`
      Pop $0

      StrCpy $1 0
      ${DoWhile} $1 < 5
        IntOp $1 $1 + 1
        Sleep 300
        SetFileAttributes "$INSTDIR\${UNINSTALL_FILENAME}" NORMAL
        ClearErrors
        Delete "$INSTDIR\${UNINSTALL_FILENAME}"
        ${IfNot} ${FileExists} "$INSTDIR\${UNINSTALL_FILENAME}"
          ${ExitDo}
        ${EndIf}
      ${Loop}
    ${EndIf}

    ; Same-volume NTFS Rename succeeds even while image sections or AV/Explorer handles remain open,
    ; freeing "$INSTDIR\${UNINSTALL_FILENAME}" so NSIS `File` creates a fresh inode without collision.
    ${If} ${FileExists} "$INSTDIR\${UNINSTALL_FILENAME}"
      ClearErrors
      Rename "$INSTDIR\${UNINSTALL_FILENAME}" "$INSTDIR\${UNINSTALL_FILENAME}.stale"
      ${If} ${FileExists} "$INSTDIR\${UNINSTALL_FILENAME}"
        ClearErrors
        Rename "$INSTDIR\${UNINSTALL_FILENAME}" "$INSTDIR\${UNINSTALL_FILENAME}.stale2"
      ${EndIf}
      Delete /REBOOTOK "$INSTDIR\${UNINSTALL_FILENAME}.stale"
      Delete /REBOOTOK "$INSTDIR\${UNINSTALL_FILENAME}.stale2"
    ${EndIf}
  ${EndIf}

  ClearErrors
  SetOutPath "$INSTDIR"
  Pop $1
  Pop $0
!macroend

!ifndef BUILD_UNINSTALLER
  !macro customFiles_x64
    !insertmacro hubUnlockUninstallerBeforeWrite
  !macroend

  !macro customFiles_arm64
    !insertmacro hubUnlockUninstallerBeforeWrite
  !macroend

  !macro customFiles_ia32
    !insertmacro hubUnlockUninstallerBeforeWrite
  !macroend
!endif
