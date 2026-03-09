#!/usr/bin/env bash
# Start all AEA services for local development
# Works on Linux, macOS, Windows (Git Bash)
# Run "make install" first if this is a fresh clone
# CTRL+C shuts down all processes cleanly

set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOGS="$ROOT/logs"

# ── Prereq checks ────────────────────────────────────
MISSING=0
if ! command -v node >/dev/null 2>&1; then
    echo "ERROR: node not found. Install Node.js: https://nodejs.org"
    MISSING=1
fi
if py --version >/dev/null 2>&1; then
    PYTHON="py"
elif python3 --version >/dev/null 2>&1; then
    PYTHON="python3"
elif python --version >/dev/null 2>&1; then
    PYTHON="python"
else
    echo "ERROR: Python not found. Install Python 3: https://www.python.org/downloads"
    MISSING=1
fi
if [ ! -d "$ROOT/api-server/node_modules" ] || [ ! -d "$ROOT/dahsboard/node_modules" ]; then
    echo "ERROR: node_modules missing. Run: make install"
    MISSING=1
fi
if ! "$PYTHON" -c "import flask" >/dev/null 2>&1; then
    echo "ERROR: Python dependencies missing. Run: make install"
    MISSING=1
fi
[ "$MISSING" -eq 1 ] && exit 1

mkdir -p "$LOGS"

echo "[AEA] Starting services..."

# ── MongoDB (Docker → mongod → Windows service → error) ──
MONGO_PID=""
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    echo "[AEA] MongoDB             (Docker)  →  localhost:27017"
    docker compose -f "$ROOT/docker-compose.yml" up -d mongo > "$LOGS/mongo.log" 2>&1
    echo "MongoDB started via Docker Compose." >> "$LOGS/mongo.log"
elif command -v mongod >/dev/null 2>&1; then
    mkdir -p "$ROOT/data/db"
    mongod --dbpath "$ROOT/data/db" > "$LOGS/mongo.log" 2>&1 &
    MONGO_PID=$!
    echo "[AEA] MongoDB             PID=$MONGO_PID  →  localhost:27017"
else
    net_out=$(net start MongoDB 2>&1 || true)
    echo "$net_out" > "$LOGS/mongo.log"
    if echo "$net_out" | grep -qi "started successfully\|already been started"; then
        echo "[AEA] MongoDB             (Windows service)  →  localhost:27017"
    else
        echo ""
        echo "ERROR: MongoDB not found. Install one of:"
        echo "  Docker Desktop : https://www.docker.com/products/docker-desktop"
        echo "  MongoDB        : https://www.mongodb.com/try/download/community"
        exit 1
    fi
fi

# ── Processing Engine ─────────────────────────────────
cd "$ROOT/processing-engine"
"$PYTHON" api.py > "$LOGS/engine.log" 2>&1 &
ENGINE_PID=$!
echo "[AEA] Processing Engine   PID=$ENGINE_PID  →  http://localhost:12040"

# ── API Server ────────────────────────────────────────
cd "$ROOT/api-server"
node server.js > "$LOGS/api.log" 2>&1 &
API_PID=$!
echo "[AEA] API Server          PID=$API_PID   →  http://localhost:12039"

# ── Dashboard ─────────────────────────────────────────
cd "$ROOT/dahsboard"
echo "Dashboard starting..." > "$LOGS/dashboard.log"
npm.cmd run dev >> "$LOGS/dashboard.log" 2>&1 &
DASH_PID=$!
echo "[AEA] Dashboard           PID=$DASH_PID  →  http://localhost:5173"

echo ""
echo "Logs: $LOGS/  (mongo.log  engine.log  api.log  dashboard.log)"
echo "Press Ctrl+C to stop all services."

cleanup() {
    echo ""
    echo "[AEA] Stopping services..."
    [ -n "$MONGO_PID" ] && kill "$MONGO_PID" 2>/dev/null || true
    kill "$ENGINE_PID" "$API_PID" "$DASH_PID" 2>/dev/null || true
    if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
        docker compose -f "$ROOT/docker-compose.yml" stop mongo >/dev/null 2>&1 || true
    fi
    exit 0
}
trap cleanup INT TERM

wait
