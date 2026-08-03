# Deploy jamesnetworks-net to PRODUCTION. Requires explicit confirmation.
# Usage: .\deploy-prod.ps1

$ErrorActionPreference = "Stop"
$env:CLOUDFLARE_ACCOUNT_ID = "180f457e46d097180035f855959ee95a"

Write-Host ""
Write-Host "  *** PRODUCTION DEPLOY: jamesnetworks-net ***" -ForegroundColor Red
Write-Host "  Live: https://www.jamesnetworks.net" -ForegroundColor Red
Write-Host ""
$ok = Read-Host "Type PROD to deploy to production (anything else aborts)"
if ($ok -ne "PROD") {
  Write-Host "Aborted. Use .\deploy-demo.ps1 for the demo environment." -ForegroundColor Yellow
  exit 1
}

if (-not $env:CLOUDFLARE_API_TOKEN) {
  $toml = Get-Content "$env:APPDATA\xdg.config\.wrangler\config\default.toml" -Raw -ErrorAction SilentlyContinue
  if ($toml -match 'oauth_token = "([^"]+)"') { $env:CLOUDFLARE_API_TOKEN = $matches[1] }
}

Set-Location $PSScriptRoot
wrangler pages deploy . --project-name=jamesnetworks-net --branch=main --commit-dirty=true
Write-Host ">>> Production deploy complete." -ForegroundColor Green
