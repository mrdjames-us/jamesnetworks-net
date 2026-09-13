# Deploy jamesnetworks-net to DEMO only (never production www).
# Usage: .\deploy-demo.ps1

$ErrorActionPreference = "Stop"
$env:CLOUDFLARE_ACCOUNT_ID = "180f457e46d097180035f855959ee95a"
Set-Location $PSScriptRoot
node journal/build.mjs
if ($LASTEXITCODE -ne 0) { throw "journal build failed" }

# Prefer demo name if present
if (Test-Path wrangler.demo.toml) {
  Copy-Item wrangler.toml wrangler.toml.prod-bak -Force -ErrorAction SilentlyContinue
  Copy-Item wrangler.demo.toml wrangler.toml -Force
}
try {
  Write-Host ">>> Deploying jamesnetworks-net → DEMO" -ForegroundColor Yellow
  wrangler pages deploy . --project-name=jamesnetworks-net-demo --branch=demo --commit-dirty=true
  Write-Host ">>> Demo live: https://jamesnetworks-net-demo.pages.dev" -ForegroundColor Green
} finally {
  if (Test-Path wrangler.toml.prod-bak) {
    Copy-Item wrangler.toml.prod-bak wrangler.toml -Force
    Remove-Item wrangler.toml.prod-bak -Force -ErrorAction SilentlyContinue
  }
}
