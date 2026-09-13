<#
Simple script to install deps and start the dev server (nodemon).
Usage: .\scripts\start-dev.ps1
#>

Write-Host "[info] Installing dependencies..."
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "[error] npm install failed" -ForegroundColor Red; exit $LASTEXITCODE }

Write-Host "[info] Starting dev server (npm run dev)..." -ForegroundColor Cyan
npm run dev
