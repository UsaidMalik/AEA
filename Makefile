# AEA Platform - Makefile
# Prerequisites: MongoDB running on :27017, Ollama running on :11434

# ── Install ──────────────────────────────────────────
install: install-api install-dashboard install-engine

install-api:
	cd api-server && npm install

install-dashboard:
	cd dahsboard && npm install

install-engine:
	cd processing-engine && py -m pip install -r requirements.txt

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

# ── Build ────────────────────────────────────────────
build:
	cd dahsboard && npm run build

lint:
	cd dahsboard && npm run lint

# ── Clean ────────────────────────────────────────────
clean:
	rm -rf dahsboard/node_modules api-server/node_modules dahsboard/dist
