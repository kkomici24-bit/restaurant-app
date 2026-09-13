<#
Uninstall the Windows service created by `install-service-windows.ps1`.
Run as Administrator.

Usage:
  .\scripts\uninstall-service-windows.ps1
  .\scripts\uninstall-service-windows.ps1 -ServiceName my-restaurant
#>

param(
    [string]$ServiceName = 'restaurant-app'
)

function Write-Info($m) { Write-Host "[info] $m" -ForegroundColor Cyan }
function Write-Err($m) { Write-Host "[error] $m" -ForegroundColor Red }

if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Err "This script must be run as Administrator."; exit 1
}

Write-Info "Stopping service if running..."
try { Stop-Service -Name $ServiceName -ErrorAction SilentlyContinue -Force } catch {}
Start-Sleep -Seconds 1
Write-Info "Deleting service $ServiceName..."
Start-Process -FilePath sc.exe -ArgumentList @('delete', $ServiceName) -NoNewWindow -Wait
Write-Info "Service $ServiceName removed (if it existed)."
