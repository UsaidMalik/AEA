#!/usr/bin/env bash
# AEA — Ubuntu first-time setup script
# Run once after cloning: bash scripts/setup-ubuntu.sh
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== AEA Ubuntu Setup ==="

# ── 1. .env file ──────────────────────────────────────────────────────────────
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "[.env] Created from .env.example"
    echo ""
    echo "  *** ACTION REQUIRED ***"
    echo "  Open .env and replace 'your_groq_api_key_here' with your real key."
    echo "  Get a free key at: https://console.groq.com"
    echo ""
else
    echo "[.env] Already exists — skipping"
fi

# ── 2. MongoDB 8.0 ────────────────────────────────────────────────────────────
MONGOD_VERSION=$(mongod --version 2>/dev/null | grep -oP 'v\K[0-9]+' | head -1 || echo "0")

if [ "$MONGOD_VERSION" -ge 8 ]; then
    echo "[MongoDB] Already v8+ ($(mongod --version 2>/dev/null | head -1)) — skipping"
else
    echo "[MongoDB] Installing v8.0 (current: v${MONGOD_VERSION})..."

    # Remove old version if present
    sudo apt remove -y mongodb-org* 2>/dev/null || true
    sudo rm -f /etc/apt/sources.list.d/mongodb-org-*.list

    # Add MongoDB 8.0 repo
    curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | \
        sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor

    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] \
https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/8.0 multiverse" | \
        sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list > /dev/null

    sudo apt update -q
    sudo apt install -y mongodb-org

    echo "[MongoDB] Installed: $(mongod --version | head -1)"
fi

# ── 3. xdotool (needed for Linux app/website monitoring) ─────────────────────
if ! command -v xdotool &>/dev/null; then
    echo "[xdotool] Installing..."
    sudo apt install -y xdotool
else
    echo "[xdotool] Already installed — skipping"
fi

# ── 4. Node.js dependencies ───────────────────────────────────────────────────
echo "[npm] Installing all dependencies..."
make install

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "  1. Edit .env and add your GROQ_API_KEY (if not done yet)"
echo "  2. Run:  make electron"
