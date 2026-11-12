; Desk Console NSIS hooks — upgrade-safe uninstaller unlock + direct exe launch.

!include "nsis-uninstaller-unlock.nsh"

!macro customInit
  !insertmacro hubPrepareUpgradeInit
  ${If} ${isUpdated}
    nsExec::Exec `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -WindowStyle Hidden -Command "Get-Process -ErrorAction SilentlyContinue | Where-Object { $$_.Path -and $$_.Path.StartsWith('$INSTDIR', [System.StringComparison]::OrdinalIgnoreCase) } | Stop-Process -Force -ErrorAction SilentlyContinue"`
    Pop $0
    Sleep 500
  ${EndIf}
  ClearErrors
  IfFileExists "$INSTDIR\resources\app.asar" 0 +2
    RMDir /r "$INSTDIR\resources\app.asar.unpacked"
!macroend

!macro customInstall
  StrCpy $launchLink "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
!macroend
