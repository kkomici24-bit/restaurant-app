<#
Auto-setup script for Windows: tries to install Node.js (LTS) via winget or choco,
then runs `npm install`, optionally `npm run seed`, and starts the app or dev server.

Usage (PowerShell, run as Admin if needed):
  .\scripts\setup-windows.ps1 [-Seed] [-Start]

Parameters:
  -Seed  : Run `npm run seed` after installing dependencies.
  -Start : Start the server after setup (`npm start`).
#>

param(
    [switch]$Seed,
    [switch]$Start
)

function Write-Info($m) { Write-Host "[info] $m" -ForegroundColor Cyan }
function Write-Err($m) { Write-Host "[error] $m" -ForegroundColor Red }

Write-Info "Checking for Node.js..."
$node = Get-Command node -ErrorAction SilentlyContinue

if ($node) {
    Write-Info "Node found: $(node -v)"
} else {
    Write-Info "Node not found — attempting to install via winget or choco."
    $installed = $false
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Info "Using winget to install Node.js LTS (requires Windows 10/11 and winget)."
        try {
            winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
            $installed = $true
        } catch {
            Write-Err "winget install failed: $_"
            $installed = $false
        }
    }
    if (-not $installed -and Get-Command choco -ErrorAction SilentlyContinue) {
        Write-Info "Using Chocolatey to install Node.js LTS (requires admin)."
        try {
            choco install nodejs-lts -y
            $installed = $true
        } catch {
            Write-Err "choco install failed: $_"
            $installed = $false
        }
    }
    if (-not $installed) {
        Write-Err "Automatic Node install not available. Please install Node.js LTS from https://nodejs.org/ and re-run this script."
        exit 2
    }
    Write-Info "Reloading environment (best-effort)..."
    $envPath = [System.Environment]::GetEnvironmentVariable('PATH', 'Machine') + ';' + [System.Environment]::GetEnvironmentVariable('PATH', 'User')
    $env:PATH = $envPath
    Start-Sleep -Seconds 2
}

Write-Info "Running npm install..."
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Err "npm not found after install. Please open a new terminal or restart PowerShell and try again."
    exit 3
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $root
npm install
if ($LASTEXITCODE -ne 0) { Write-Err "npm install failed (exit $LASTEXITCODE)"; exit $LASTEXITCODE }

if ($Seed) {
    Write-Info "Running npm run seed..."
    npm run seed
    if ($LASTEXITCODE -ne 0) { Write-Err "npm run seed failed (exit $LASTEXITCODE)"; exit $LASTEXITCODE }
}

if ($Start) {
    Write-Info "Starting the app (npm start)"
    npm start
}

Write-Info "Setup complete."
