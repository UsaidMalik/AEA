# AEA - Full production build (Windows)
# Run from repo root: powershell -ExecutionPolicy Bypass -File scripts\build.ps1

$ErrorActionPreference = "Stop"
$ROOT = Split-Path $PSScriptRoot -Parent
Set-Location $ROOT

$MONGOD_VERSION = "8.0.5"
$MONGOD_DEST = "$ROOT\Electron\resources\mongod\win\mongod.exe"
$MONGOD_URL = "https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-$MONGOD_VERSION.zip"

Write-Host "=== AEA Production Build (Windows) ===" -ForegroundColor Cyan

# 1. Download mongod if missing
Write-Host ""
Write-Host "[mongod] Checking binary..."
if (Test-Path $MONGOD_DEST) {
    Write-Host "[mongod] Already present - skipping"
}
if (-Not (Test-Path $MONGOD_DEST)) {
    Write-Host "[mongod] Downloading..."
    New-Item -ItemType Directory -Force -Path (Split-Path $MONGOD_DEST) | Out-Null
    $tmp = Join-Path $env:TEMP "aea-mongod-$(Get-Random)"
    New-Item -ItemType Directory -Force -Path $tmp | Out-Null
    Invoke-WebRequest -Uri $MONGOD_URL -OutFile "$tmp\mongod.zip" -UseBasicParsing
    Expand-Archive -Path "$tmp\mongod.zip" -DestinationPath "$tmp\out" -Force
    $bin = Get-ChildItem -Recurse -Filter "mongod.exe" "$tmp\out" | Select-Object -First 1
    Copy-Item $bin.FullName $MONGOD_DEST
    Remove-Item $tmp -Recurse -Force
    Write-Host "[mongod] Saved to $MONGOD_DEST" -ForegroundColor Green
}

# 2. Build React dashboard
Write-Host ""
Write-Host "[1/3] Building React dashboard..."
Set-Location "$ROOT\dahsboard"
npm run build
Write-Host "      -> dahsboard/dist/ OK" -ForegroundColor Green

# 3. Build Python engine
Write-Host ""
Write-Host "[2/3] Building Python engine with PyInstaller..."
Set-Location "$ROOT\processing-engine"
py -m pip install pyinstaller -q
py -m PyInstaller api.spec --noconfirm
Write-Host "      -> processing-engine/dist/api.exe OK" -ForegroundColor Green

# 4. Package with electron-builder
Write-Host ""
Write-Host "[3/3] Packaging Electron app..."
Set-Location "$ROOT\Electron"
npm install

# Pre-extract winCodeSign cache to bypass symlink privilege errors on Windows.
# electron-builder uses 7za with -snl (create symlinks) which fails without Developer Mode.
# We extract it ourselves WITHOUT -snl so symlinks become plain files.
$wcsVer = "winCodeSign-2.6.0"
$wcsCache = "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign\$wcsVer"
if (-Not (Test-Path "$wcsCache\rcedit-x64.exe")) {
    Write-Host "[winCodeSign] Pre-caching to bypass symlink restriction..."
    $wcsUrl = "https://github.com/electron-userland/electron-builder-binaries/releases/download/$wcsVer/$wcsVer.7z"
    $wcsTmp = Join-Path $env:TEMP "aea-wcs-$(Get-Random)"
    New-Item -ItemType Directory -Force -Path $wcsTmp | Out-Null
    Invoke-WebRequest -Uri $wcsUrl -OutFile "$wcsTmp\wcs.7z" -UseBasicParsing
    $sevenZip = "$ROOT\Electron\node_modules\7zip-bin\win\x64\7za.exe"
    # Exclude darwin/ subtree so 7za never tries to create macOS symlinks
    & $sevenZip x "$wcsTmp\wcs.7z" "-o$wcsCache" -bd -y "-xr!darwin" | Out-Null
    Remove-Item $wcsTmp -Recurse -Force
    if (-Not (Test-Path "$wcsCache\rcedit-x64.exe")) { throw "[winCodeSign] rcedit-x64.exe missing after extraction" }
    Write-Host "[winCodeSign] OK" -ForegroundColor Green
}

npm run dist

# Done
Write-Host ""
Write-Host "=== Build complete ===" -ForegroundColor Cyan
$installer = Get-ChildItem "$ROOT\Electron\dist\*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($installer) {
    Write-Host "Output: $($installer.FullName)"
}
