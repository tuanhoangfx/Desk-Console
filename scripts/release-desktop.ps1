param(
  [string]$Version = "",
  [ValidateSet("", "patch", "minor", "major")]
  [string]$Bump = "",
  [switch]$Publish,
  [switch]$SkipInstall,
  [switch]$SkipWorker,
  [switch]$Fast,
  [switch]$Dir,
  [switch]$Smoke,
  [string]$SmokeScenarios = "desk-core"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot
$wall = [System.Diagnostics.Stopwatch]::StartNew()

if ($Bump) {
  node ../../../Tool/scripts/bump-product-patch.mjs --code P0001 2>$null
}

# P0003 Fast contract: no third pipeline. Local Windows test = -Dir (unpacked).
# User Publish: DESKTOP_RELEASE_SIGN=1 + DESKTOP_RELEASE_FAST=0 → no --fast (Authenticode).
# Agent: DESKTOP_RELEASE_SIGN=0 + -Fast → signExecutable=false only (rcedit kept).
$pkgArgs = @()
$useFast = [bool]$Fast
if ($Publish -and $env:DESKTOP_RELEASE_SIGN -eq "1") {
  $useFast = $false
  Write-Host "[P0001] User signed Publish - Fast off (Authenticode)"
}
if ($Dir -or ($useFast -and -not $Publish)) { $pkgArgs += "--dir" }
if ($useFast) { $pkgArgs += "--fast" }
if ($Publish) { $pkgArgs += "--publish"; $pkgArgs += "always" }
else { $pkgArgs += "--publish"; $pkgArgs += "never" }

Write-Host "[P0001] desktop package $($pkgArgs -join ' ')"
$env:P0001_RELEASE_DESKTOP_PS1 = "1"
node (Join-Path $PSScriptRoot "run-electron-package.mjs") @pkgArgs
if ($LASTEXITCODE -ne 0) { throw "electron-builder failed" }

Write-Host "[P0001] smoke-packaged-shell-icon"
node (Join-Path $PSScriptRoot "smoke-packaged-shell-icon.mjs")
if ($LASTEXITCODE -ne 0) { throw "smoke-packaged-shell-icon failed" }

$ToolScripts = (Resolve-Path (Join-Path $PSScriptRoot "..\..\scripts")).Path
if ($Publish) {
  $pkgVersion = (Get-Content -Raw (Join-Path $RepoRoot "package.json") | ConvertFrom-Json).version
  $tag = "v$pkgVersion"
  Write-Host "[P0001] Sync release metadata (post-gh-release $tag)"
  node (Join-Path $ToolScripts "post-gh-release.mjs") --product-root $RepoRoot --tag $tag
  if ($LASTEXITCODE -ne 0) { throw "post-gh-release failed" }
  Write-Host "[P0001] Verify auto-update feed (latest.yml + installer)"
  node (Join-Path $ToolScripts "verify-desktop-auto-update.mjs") --product-root $RepoRoot --tag $tag --release
  if ($LASTEXITCODE -ne 0) { throw "verify-desktop-auto-update failed" }
  Write-Host "[P0001] Sync P0001-SITE + P0001-INTRO landing (sync.infi28.com)"
  node (Join-Path $ToolScripts "deploy-lenovo-static.mjs") --code P0001-SITE --code P0001-INTRO --force-build
  if ($LASTEXITCODE -ne 0) { throw "deploy-lenovo-static P0001-SITE/P0001-INTRO failed" }
} else {
  node (Join-Path $ToolScripts "prune-dist-desktop.mjs") --product-root $RepoRoot
}

if ($Smoke) {
  $scenarios = if ($SmokeScenarios.Trim()) { $SmokeScenarios.Trim() } else { "shell-walk" }
  Write-Host "[P0001] Desktop UI smoke ($scenarios)"
  $DevRoot = if ($env:DEV_ROOT) { $env:DEV_ROOT } else { (Resolve-Path (Join-Path $RepoRoot "..\..")).Path }
  & node (Join-Path $DevRoot "Tool\scripts\node-run.mjs") `
    (Join-Path $DevRoot "Tool\scripts\smoke-desktop-ui.mjs") `
    --code P0001 --scenario $scenarios --port 9337
  if ($LASTEXITCODE -ne 0) {
    throw "desktop UI smoke failed - see SMOKE FAIL evidence path above (card desktop-ui-smoke)"
  }
}

$wall.Stop()
$sec = [math]::Round($wall.Elapsed.TotalSeconds, 1)
$budget = if ($Dir -or ($useFast -and -not $Publish)) { 120 } else { 300 }
$mark = if ($sec -le $budget) { "BUDGET OK" } else { "BUDGET MISS" }
Write-Host "[P0001] pack ${sec}s / ${budget}s $mark"
