# Start all AEA services for local development
# Works on Windows PowerShell and PowerShell Core
# CTRL+C shuts down all background jobs cleanly

$Root = Split-Path -Parent $PSScriptRoot
$Logs = "$Root\logs"

New-Item -ItemType Directory -Force -Path $Logs | Out-Null

Write-Host "[AEA] Starting services..." -ForegroundColor Cyan

# MongoDB
if (Get-Command mongod -ErrorAction SilentlyContinue) {
    $mongo = Start-Process mongod -RedirectStandardOutput "$Logs\mongo.log" -RedirectStandardError "$Logs\mongo.log" -PassThru -WindowStyle Hidden
    Write-Host "[AEA] MongoDB             PID=$($mongo.Id)  ->  localhost:27017"
} else {
    Write-Host "[AEA] MongoDB             (mongod not in PATH - assuming service is running on :27017)"
    $mongo = $null
    "MongoDB managed externally (Windows service or manual). Not started by this script." | Out-File "$Logs\mongo.log"
}

# Processing Engine
$engine = Start-Process py -ArgumentList "api.py" -WorkingDirectory "$Root\processing-engine" `
    -RedirectStandardOutput "$Logs\engine.log" -RedirectStandardError "$Logs\engine.log" `
    -PassThru -WindowStyle Hidden
Write-Host "[AEA] Processing Engine   PID=$($engine.Id)  ->  http://localhost:12040"

# API Server
$api = Start-Process node -ArgumentList "server.js" -WorkingDirectory "$Root\api-server" `
    -RedirectStandardOutput "$Logs\api.log" -RedirectStandardError "$Logs\api.log" `
    -PassThru -WindowStyle Hidden
Write-Host "[AEA] API Server          PID=$($api.Id)   ->  http://localhost:12039"

# Dashboard
$dashboard = Start-Process npm -ArgumentList "run", "dev" -WorkingDirectory "$Root\dahsboard" `
    -RedirectStandardOutput "$Logs\dashboard.log" -RedirectStandardError "$Logs\dashboard.log" `
    -PassThru -WindowStyle Hidden
Write-Host "[AEA] Dashboard           PID=$($dashboard.Id)  ->  http://localhost:5173"

Write-Host ""
Write-Host "Logs: $Logs\  (mongo.log  engine.log  api.log  dashboard.log)"
Write-Host "Press CTRL+C to stop all services." -ForegroundColor Yellow

try {
    while ($true) { Start-Sleep -Seconds 1 }
} finally {
    Write-Host ""
    Write-Host "[AEA] Stopping services..." -ForegroundColor Cyan
    if ($mongo) { Stop-Process -Id $mongo.Id -Force -ErrorAction SilentlyContinue }
    Stop-Process -Id $engine.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $api.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $dashboard.Id -Force -ErrorAction SilentlyContinue
}
