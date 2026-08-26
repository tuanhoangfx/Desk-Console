param(
  [string]$Version = "",
  [ValidateSet("", "patch", "minor", "major")]
  [string]$Bump = "",
  [switch]$Publish,
  [switch]$Fast,
  [switch]$Dir
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot
$wall = [System.Diagnostics.Stopwatch]::StartNew()

if ($Bump) {
  node ../../../Tool/scripts/bump-product-patch.mjs --code P0001 2>$null
}

# P0003 Fast contract: no third pipeline. Local Windows test = -Dir (unpacked).
# ship-product -Fast -Publish stays NSIS (signExecutable=false only).
$pkgArgs = @()
if ($Dir -or ($Fast -and -not $Publish)) { $pkgArgs += "--dir" }
if ($Fast) { $pkgArgs += "--fast" }
if ($Publish) { $pkgArgs += "--publish"; $pkgArgs += "always" }
else { $pkgArgs += "--publish"; $pkgArgs += "never" }

Write-Host "[P0001] desktop package $($pkgArgs -join ' ')"
node (Join-Path $PSScriptRoot "run-electron-package.mjs") @pkgArgs
if ($LASTEXITCODE -ne 0) { throw "electron-builder failed" }

$wall.Stop()
$sec = [math]::Round($wall.Elapsed.TotalSeconds, 1)
$budget = if ($Dir -or ($Fast -and -not $Publish)) { 120 } else { 180 }
$mark = if ($sec -le $budget) { "BUDGET OK" } else { "BUDGET MISS" }
Write-Host "[P0001] pack ${sec}s / ${budget}s $mark"
