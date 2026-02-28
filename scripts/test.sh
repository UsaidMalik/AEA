#!/usr/bin/env bash
# Run all AEA tests (JS + Python)
# Works on Linux, macOS, Windows (Git Bash)
# Returns exit code 1 if any suite fails - safe for CI

set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Detect Python binary (python3 on Linux/macOS, python or py on Windows)
if py --version >/dev/null 2>&1; then
    PYTHON="py"
elif python3 --version >/dev/null 2>&1; then
    PYTHON="python3"
elif python --version >/dev/null 2>&1; then
    PYTHON="python"
else
    echo "ERROR: Python not found. Install Python 3."
    exit 1
fi

FAILED=0

echo "=== [1/2] API Server tests (Jest) ==="
cd "$ROOT/api-server"
if npm test; then
    echo "[PASS] API Server tests"
else
    echo "[FAIL] API Server tests"
    FAILED=1
fi

echo ""
echo "=== [2/2] Processing Engine tests (pytest) ==="
cd "$ROOT/processing-engine"
if "$PYTHON" -m pytest -v; then
    echo "[PASS] Processing Engine tests"
else
    echo "[FAIL] Processing Engine tests"
    FAILED=1
fi

echo ""
if [ "$FAILED" -eq 0 ]; then
    echo "All tests passed."
else
    echo "One or more test suites FAILED."
    exit 1
fi

