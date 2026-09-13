<#
Install the app as a Windows service.
Requires admin rights. Uses `sc.exe` to create a service that runs node with server.js.

Usage (run as Administrator):
  .\scripts\install-service-windows.ps1
  # or to customize:
  .\scripts\install-service-windows.ps1 -ServiceName my-restaurant -NodePath 'C:\Program Files\nodejs\node.exe' -AppPath 'C:\restaurant-app\server.js'
#>

param(
    [string]$ServiceName = 'restaurant-app',
    [string]$NodePath = 'C:\Program Files\nodejs\node.exe',
    [string]$AppPath = 'C:\restaurant-app\server.js'
)

function Write-Info($m) { Write-Host "[info] $m" -ForegroundColor Cyan }
function Write-Err($m) { Write-Host "[error] $m" -ForegroundColor Red }

if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Err "This script must be run as Administrator."; exit 1
}

if (-not (Test-Path $NodePath)) { Write-Err "Node not found at $NodePath"; exit 2 }
if (-not (Test-Path $AppPath)) { Write-Err "App script not found at $AppPath"; exit 3 }

$binArg = "`"$NodePath`" `"$AppPath`""
Write-Info "Creating service '$ServiceName' with binPath: $binArg"

# sc.exe requires a space after the equal sign for some parameters
$args = @('create', $ServiceName, "binPath= $binArg", 'start= auto')
Start-Process -FilePath sc.exe -ArgumentList $args -NoNewWindow -Wait

Start-Sleep -Seconds 1
Write-Info "Setting service description and starting service..."
Start-Process -FilePath sc.exe -ArgumentList @('description', $ServiceName, 'Restaurant Node.js app (Express)') -NoNewWindow -Wait
Start-Service -Name $ServiceName -ErrorAction SilentlyContinue
Write-Info "Service $ServiceName installed and started (if no errors shown)."
