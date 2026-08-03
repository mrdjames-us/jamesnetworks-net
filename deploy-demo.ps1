# Deploy jamesnetworks-net to DEMO only (never production www).
# Usage: .\deploy-demo.ps1

$ErrorActionPreference = "Stop"
$env:CLOUDFLARE_ACCOUNT_ID = "180f457e46d097180035f855959ee95a"

if (-not $env:CLOUDFLARE_API_TOKEN) {
  $toml = Get-Content "$env:APPDATA\xdg.config\.wrangler\config\default.toml" -Raw -ErrorAction SilentlyContinue
  if ($toml -match 'oauth_token = "([^"]+)"') { $env:CLOUDFLARE_API_TOKEN = $matches[1] }
}

Set-Location $PSScriptRoot
Write-Host ">>> Deploying jamesnetworks-net → DEMO" -ForegroundColor Yellow
wrangler pages deploy . --project-name=jamesnetworks-net-demo --branch=demo --commit-dirty=true --config wrangler.demo.toml
Write-Host ">>> Demo live: https://jamesnetworks-net-demo.pages.dev" -ForegroundColor Green
