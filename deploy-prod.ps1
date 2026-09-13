# Deploy jamesnetworks-net to PRODUCTION. Requires explicit confirmation.
# Usage: .\deploy-prod.ps1

$ErrorActionPreference = "Stop"
$env:CLOUDFLARE_ACCOUNT_ID = "180f457e46d097180035f855959ee95a"

Write-Host ""
Write-Host "  *** PRODUCTION DEPLOY: jamesnetworks-net ***" -ForegroundColor Red
Write-Host "  Live: https://www.jamesnetworks.net  (journal)" -ForegroundColor Red
Write-Host "        https://www.henrycountyconsulting.com  (consulting)" -ForegroundColor Red
Write-Host ""
$ok = Read-Host "Type PROD to deploy to production (anything else aborts)"
if ($ok -ne "PROD") {
  Write-Host "Aborted. Use .\deploy-demo.ps1 for the demo environment." -ForegroundColor Yellow
  exit 1
}

Set-Location $PSScriptRoot
node journal/build.mjs
if ($LASTEXITCODE -ne 0) { throw "journal build failed" }
wrangler pages deploy . --project-name=jamesnetworks-net --branch=main --commit-dirty=true
Write-Host ">>> Production deploy complete." -ForegroundColor Green
