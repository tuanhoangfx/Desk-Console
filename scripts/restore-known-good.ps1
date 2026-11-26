param(
  [switch]$Install,
  [switch]$Verify,
  [switch]$GitCheckout,
  [switch]$LaunchOnly
)

$ErrorActionPreference = "Stop"
$sharedRestore = Resolve-Path (Join-Path $PSScriptRoot "..\..\scripts\lib\restore-desktop-known-good.ps1")
& $sharedRestore -Code "P0001" @PSBoundParameters
exit $LASTEXITCODE
