# Run all AEA tests (JS + Python)
# Works on Windows PowerShell and PowerShell Core
# Returns exit code 1 if any suite fails - safe for CI

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot

$Failed = $false

Write-Host "=== [1/2] API Server tests (Jest) ===" -ForegroundColor Cyan
Push-Location "$Root\api-server"
try {
    npm test
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[PASS] API Server tests" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] API Server tests" -ForegroundColor Red
        $Failed = $true
    }
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "=== [2/2] Processing Engine tests (pytest) ===" -ForegroundColor Cyan
Push-Location "$Root\processing-engine"
try {
    py -m pytest -v
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[PASS] Processing Engine tests" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Processing Engine tests" -ForegroundColor Red
        $Failed = $true
    }
} finally {
    Pop-Location
}

Write-Host ""
if (-not $Failed) {
    Write-Host "All tests passed." -ForegroundColor Green
    exit 0
} else {
    Write-Host "One or more test suites FAILED." -ForegroundColor Red
    exit 1
}
