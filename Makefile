# AEA Platform - Makefile
# Prerequisites: MongoDB running on :27017, Ollama running on :11434

.PHONY: install install-api install-dashboard install-engine install-electron \
        mongo ollama api dashboard engine electron build lint clean test test-ps dev dev-ps \
        build-engine pack dist

# Detect Python binary (Windows: py, Linux/macOS: python3 or python)
PYTHON ?= $(shell py --version > /dev/null 2>&1 && echo py || (python3 --version > /dev/null 2>&1 && echo python3 || echo python))

# ── Install ──────────────────────────────────────────
install: install-api install-dashboard install-engine install-electron

install-api:
	cd api-server && npm install

install-dashboard:
	cd dahsboard && npm install

install-engine:
	cd processing-engine && $(PYTHON) -m pip install -r requirements.txt

install-electron:
	cd Electron && npm install

# ── Prerequisites ────────────────────────────────────
mongo:
	mongod

ollama:
	ollama serve

# ── Run individual services ──────────────────────────
api:
	cd api-server && node server.js

dashboard:
	cd dahsboard && npm run dev

engine:
	cd processing-engine && py api.py

electron:
	cd Electron && npm run dev

# ── Build ────────────────────────────────────────────
build:
	cd dahsboard && npm run build

lint:
	cd dahsboard && npm run lint

# Build PyInstaller binary for the processing engine
# Output: processing-engine/dist/api[.exe]
build-engine:
	cd processing-engine && $(PYTHON) -m pip install pyinstaller && pyinstaller api.spec

# Package Electron app (directory, no installer) — for quick testing
pack: build build-engine
	cd Electron && npm run pack

# Build distributable installer (.exe / .dmg / .AppImage)
dist: build build-engine
	cd Electron && npm run dist

# ── Clean ────────────────────────────────────────────
clean:
	rm -rf dahsboard/node_modules api-server/node_modules dahsboard/dist

# ── Tests ─────────────────────────────────────────────
test:
	bash scripts/test.sh

test-ps:
	powershell -ExecutionPolicy Bypass -File scripts\test.ps1

# ── Dev (start all 3 services together) ───────────────
dev:
	bash scripts/dev.sh

dev-ps:
	powershell -ExecutionPolicy Bypass -File scripts\dev.ps1