#!/usr/bin/env bash
# AEA — Full production build
# Run from repo root: bash scripts/build.sh
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

OS="$(uname -s)"
ARCH="$(uname -m)"
MONGOD_VERSION="8.0.5"

echo "=== AEA Production Build === ($OS / $ARCH)"

# ── 1. Auto-download mongod binary ───────────────────────────────────────────
download_mongod() {
    local dest="$1" url="$2"
    [ -f "$dest" ] && echo "[mongod] Already present — skipping" && return
    echo "[mongod] Downloading $url ..."
    mkdir -p "$(dirname "$dest")"
    local tmp; tmp=$(mktemp -d)
    curl -L --progress-bar "$url" -o "$tmp/archive"
    if [[ "$url" == *.zip ]]; then
        unzip -q "$tmp/archive" -d "$tmp/out"
    else
        mkdir -p "$tmp/out"
        tar -xzf "$tmp/archive" -C "$tmp/out" --strip-components=2
    fi
    local bin; bin=$(find "$tmp/out" -name "mongod" -not -name "*.exe" | head -1)
    [ -z "$bin" ] && bin=$(find "$tmp/out" -name "mongod.exe" | head -1)
    cp "$bin" "$dest" && chmod +x "$dest"
    rm -rf "$tmp"
    echo "[mongod] Saved to $dest"
}

if [[ "$OS" == "Linux" ]]; then
    DISTRO=$(lsb_release -rs 2>/dev/null | cut -d. -f1 || echo "22")
    [[ "$DISTRO" -ge 24 ]] && DNAME="ubuntu2404" || DNAME="ubuntu2204"
    download_mongod \
        "$ROOT/Electron/resources/mongod/linux/mongod" \
        "https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-${DNAME}-${MONGOD_VERSION}.tgz"
elif [[ "$OS" == "Darwin" ]]; then
    [[ "$ARCH" == "arm64" ]] && MARCH="arm64" || MARCH="x86_64"
    download_mongod \
        "$ROOT/Electron/resources/mongod/mac/mongod" \
        "https://fastdl.mongodb.org/osx/mongodb-macos-${MARCH}-${MONGOD_VERSION}.tgz"
else
    # Git Bash on Windows
    download_mongod \
        "$ROOT/Electron/resources/mongod/win/mongod.exe" \
        "https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-${MONGOD_VERSION}.zip"
fi

# ── 2. Build React dashboard ──────────────────────────────────────────────────
echo ""
echo "[1/3] Building React dashboard..."
cd "$ROOT/dahsboard" && npm run build
echo "      → dahsboard/dist/ ✓"

# ── 3. Build Python engine (PyInstaller) ──────────────────────────────────────
echo ""
echo "[2/3] Building Python engine with PyInstaller..."
cd "$ROOT/processing-engine"
# Use 'py' on Windows Git Bash, 'python3' on Linux/macOS
PY=$(command -v py 2>/dev/null || command -v python3 || echo python)
$PY -m pip install pyinstaller -q
$PY -m PyInstaller api.spec --noconfirm
echo "      → processing-engine/dist/api ✓"

# ── 4. Package with electron-builder ─────────────────────────────────────────
echo ""
echo "[3/3] Packaging Electron app..."
cd "$ROOT/Electron"
npm install

# On Windows (Git Bash): pre-extract winCodeSign without -snl so symlinks become
# plain files, bypassing the "Cannot create symbolic link" privilege error.
if [[ "$OS" != "Linux" && "$OS" != "Darwin" ]]; then
    WCS_VER="winCodeSign-2.6.0"
    WCS_CACHE_UNIX="$(cygpath "$LOCALAPPDATA")/electron-builder/Cache/winCodeSign/$WCS_VER"
    if [ ! -f "$WCS_CACHE_UNIX/rcedit-x64.exe" ]; then
        echo "[winCodeSign] Pre-caching to bypass symlink restriction..."
        WCS_TMP=$(mktemp -d)
        curl -sL "https://github.com/electron-userland/electron-builder-binaries/releases/download/$WCS_VER/$WCS_VER.7z" -o "$WCS_TMP/wcs.7z"
        WCS_CACHE_WIN="$(cygpath -w "$WCS_CACHE_UNIX")"
        # Exclude darwin/ subtree so 7za never tries to create macOS symlinks
        "$ROOT/Electron/node_modules/7zip-bin/win/x64/7za.exe" x "$(cygpath -w "$WCS_TMP/wcs.7z")" "-o$WCS_CACHE_WIN" -bd -y "-xr!darwin"
        rm -rf "$WCS_TMP"
        [ -f "$WCS_CACHE_UNIX/rcedit-x64.exe" ] || { echo "[winCodeSign] ERROR: rcedit-x64.exe missing after extraction"; exit 1; }
        echo "[winCodeSign] OK"
    fi
fi

npm run dist

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo "=== Build complete ==="
if [[ "$OS" == "Linux" ]]; then
    echo "Output: $(ls "$ROOT/Electron/dist/"*.AppImage 2>/dev/null | head -1)"
elif [[ "$OS" == "Darwin" ]]; then
    echo "Output: $(ls "$ROOT/Electron/dist/"*.dmg 2>/dev/null | head -1)"
else
    echo "Output: Electron/dist/"
fi
