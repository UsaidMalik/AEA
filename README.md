# AEA — AI Accountable Executive Assistant

AEA is a local PC session monitoring and accountability platform. It tracks your active applications, browser domains, and facial expressions in real time during focus sessions, enforces configurable policies, and gives you AI-powered insights into your productivity habits.

---

## Features

- **Session monitoring** — tracks active app, browser domain, and webcam feed simultaneously
- **Policy enforcement** — configurable allow/deny lists per session type (e.g. "study mode", "work mode")
- **Facial recognition** — detects emotions and presence via webcam using DeepFace
- **Real-time alerts** — Windows toast notifications for policy violations
- **AI query** — ask natural-language questions about your sessions (Groq primary, Ollama fallback)
- **Dashboard** — visualize session stats, focus score, timelines, and historical data
- **Desktop app** — self-contained Electron installer for Windows (.exe), macOS (.dmg), Linux (.AppImage)

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│        Dashboard  (React · port 5173 / 80)       │
└──────────────────────┬───────────────────────────┘
                       │ HTTP /api/*
                       ▼
┌──────────────────────────────────────────────────┐
│          API Server  (Node.js · port 12039)      │
│  sessions / apps / web / camera / AI query       │
└───────────┬──────────────────────────────────────┘
            │                     │ proxy
            ▼                     ▼
       MongoDB                Processing Engine
      (port 27017)            (Python · port 12040)
                              ├─ AppEngine
                              ├─ WebsiteEngine
                              └─ FacialEngine
                                       │
                               Groq API (primary)
                               Ollama (fallback)
                            (port 11434, optional)
```

---

## Installation — Desktop App (Recommended)

The Electron installer bundles everything: MongoDB, the Node API server, and the Python processing engine. No external setup required.

### Windows

1. Download `AEA-Setup-1.0.0.exe` from [Releases](https://github.com/UsaidMalik/AEA/releases)
2. Run the installer
3. Launch **AEA** from the desktop shortcut

> On first launch, the app copies the bundled default configuration to `%APPDATA%\electron\.env` and starts all services automatically.

### macOS

1. Download `AEA-1.0.0.dmg`
2. Open and drag AEA to Applications
3. Launch AEA

### Linux

1. Download `AEA-1.0.0.AppImage`
2. Make it executable and run:

```bash
chmod +x AEA-1.0.0.AppImage
./AEA-1.0.0.AppImage
```

> **Linux note:** The AppImage bundles the Electron shell only. MongoDB, Node.js, and Python must be installed on the host system. App/website monitoring uses `xdotool` (optional — install for active window detection). Facial recognition requires a webcam.

---

## Quick Start — Docker

> Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/) to be installed and running.

```bash
git clone https://github.com/UsaidMalik/AEA.git
cd AEA
docker compose up --build
```

On first run Docker will build all images, start MongoDB and Ollama, and pull `qwen2.5:latest` + `nomic-embed-text` (~4 GB).

| Service | URL |
|---|---|
| Dashboard | http://localhost |
| API Server | http://localhost:12039 |
| MongoDB Admin | http://localhost:8081 |
| Ollama | http://localhost:11434 |

```bash
docker compose down       # stop, keep data volumes
docker compose down -v    # stop and wipe all data
```

> **Camera note:** Facial recognition requires webcam access. On Linux, uncomment the `devices` block under `processing-engine` in `docker-compose.yml`. On Windows/macOS, run the processing engine locally (`make engine`) alongside the Docker stack.

---

## Local Development Setup

### Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20+ | api-server and dashboard |
| Python | 3.11+ | processing-engine; TensorFlow requires 3.11 |
| MongoDB | 7+ | local service or Docker |
| Ollama | latest | optional — used as LLM fallback if Groq is unavailable |
| Groq API key | — | free at [console.groq.com](https://console.groq.com) — primary LLM |

### 1. Clone the repo

```bash
git clone https://github.com/UsaidMalik/AEA.git
cd AEA
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URI=mongodb://localhost:27017
DATABASE_NAME=aea_local

# Primary LLM (free tier — get key at https://console.groq.com)
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant

# Optional offline fallback
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:latest
OLLAMA_EMBED_MODEL=nomic-embed-text
OLLAMA_TIMEOUT_MS=60000
```

> If `GROQ_API_KEY` is set, Groq is used for AI queries. If unset or unavailable, the app falls back to Ollama automatically.

### 3. Install dependencies

```bash
make install
```

Or individually:

```bash
make install-api        # api-server (Node.js)
make install-dashboard  # dashboard (Node.js)
make install-engine     # processing-engine (Python)
make install-electron   # Electron wrapper (Node.js)
```

### 4. Pull Ollama models (optional — only needed if not using Groq)

```bash
ollama pull qwen2.5:latest
ollama pull nomic-embed-text
```

### 5. Start all services

**Git Bash / Linux / macOS:**
```bash
make dev
```

**PowerShell (Windows):**
```bash
make dev-ps
```

Starts MongoDB, Processing Engine, API Server, and Dashboard dev server concurrently. Logs are written to `logs/`.

| Service | URL |
|---|---|
| Dashboard | http://localhost:5173 |
| API Server | http://localhost:12039 |
| Processing Engine | http://localhost:12040 |

---

## Project Structure

```
AEA/
├── processing-engine/          # Python · Flask · port 12040
│   ├── api.py                  # Flask HTTP endpoints (start/stop/status)
│   ├── main.py                 # SessionManager — orchestrates engines
│   ├── Engines/
│   │   ├── app_engine.py       # Monitors active foreground application
│   │   ├── website_engine.py   # Monitors active browser domain
│   │   └── facial_engine.py    # DeepFace emotion + presence detection
│   ├── DBWriter/
│   │   └── DBWriter.py         # MongoDB read/write interface
│   └── Alerter/
│       └── alerter.py          # Windows toast notifications
│
├── api-server/                 # Node.js · Express · port 12039
│   ├── server.js               # All REST endpoints
│   ├── server.test.js          # Jest integration tests
│   └── tools/
│       ├── smart-query.js      # LLM orchestrator (Groq + Ollama + RAG)
│       ├── smart-query.test.js # Jest unit tests
│       ├── query-tools.js      # MongoDB aggregations for metrics
│       └── rag.js              # Retrieval-Augmented Generation engine
│
├── dahsboard/                  # React · TypeScript · Vite · port 5173
│   └── src/
│       ├── pages/              # WelcomePage, ActionPage, SessionsPage, ConfigsPage
│       ├── components/         # Charts, tables, session overview
│       └── context/            # UserContext for session state
│
├── Electron/                   # Desktop app wrapper
│   ├── main.js                 # Electron main process — spawns all services
│   └── package.json            # electron-builder config and scripts
│
├── docker-compose.yml          # Full-stack container setup
├── Makefile                    # Developer shortcuts
├── default.env                 # Bundled env config (gitignored, used by installer)
├── .env.example                # Template for local development
├── scripts/
│   ├── dev.sh / dev.ps1        # Start all services (Bash / PowerShell)
│   ├── test.sh / test.ps1      # Run all tests (Bash / PowerShell)
│   └── build.sh / build.ps1   # Full production build (Bash / PowerShell)
└── MODELS.md                   # MongoDB schema reference
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URI` | `mongodb://localhost:27017` | MongoDB connection string |
| `DATABASE_NAME` | `aea_local` | Database name |
| `GROQ_API_KEY` | — | Groq API key (primary LLM — free at console.groq.com) |
| `GROQ_MODEL` | `llama-3.1-8b-instant` | Groq model ID |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama base URL (fallback LLM) |
| `OLLAMA_MODEL` | `qwen2.5:latest` | Ollama chat model |
| `OLLAMA_EMBED_MODEL` | `nomic-embed-text` | Ollama embedding model (RAG) |
| `OLLAMA_TIMEOUT_MS` | `60000` | Ollama request timeout |

In Docker, these are set via `docker-compose.yml` automatically.

---

## Available Commands

```bash
# Development
make dev              # Start all services (Bash)
make dev-ps           # Start all services (PowerShell)

# Installation
make install          # Install all dependencies
make install-api      # api-server npm install
make install-dashboard# dashboard npm install
make install-engine   # processing-engine pip install
make install-electron # Electron npm install

# Testing
make test             # Run all tests (Bash)
make test-ps          # Run all tests (PowerShell)

# Build
make build            # Build dashboard for production
make build-engine     # Build PyInstaller binary (processing-engine/dist/api.exe)
make lint             # Lint dashboard TypeScript

# Packaging (desktop app)
make pack             # Quick package — directory, no installer
make dist             # Full installer (.exe / .dmg / .AppImage)
make release          # Full production build: download mongod + build + package (Bash)
make release-ps       # Same as release (PowerShell)

# Cleanup
make clean            # Remove node_modules and dist
```

---

## API Reference

### Session Control

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/session/start` | Start a monitoring session |
| `POST` | `/api/session/stop` | Stop the current session |
| `GET` | `/api/session/status` | Check if a session is active |

### Data

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/sessions` | List all sessions with stats |
| `GET` | `/api/apps` | Application events |
| `GET` | `/api/web` | Website visit events |
| `GET` | `/api/camera-events` | Emotion/presence events |
| `GET` | `/api/configs` | Saved session configurations |
| `POST` | `/api/configs` | Create a new configuration |
| `DELETE` | `/api/configs/:id` | Delete a configuration |

### AI

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/query` | Natural language query about your sessions |
| `GET` | `/api/rag/status` | RAG index status |
| `POST` | `/api/rag/reindex` | Rebuild the RAG index |

### System

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/capabilities` | Platform info and feature availability (e.g. xdotool on Linux) |

---

## Testing

```bash
# All tests
make test

# API server tests only (Jest)
cd api-server && npm test

# Processing engine tests only (pytest)
cd processing-engine && pytest -v
```

CI runs automatically on push/PR to `main` and `mvp1` via GitHub Actions:
- **API tests** — Jest on Ubuntu
- **Engine tests** — pytest on Windows

---

## Building the Desktop Installer

### Prerequisites for building

- All dev dependencies installed (`make install`)
- `pyinstaller` (`pip install pyinstaller`)
- MongoDB binary for your platform in `Electron/resources/mongod/<platform>/`
  (see `Electron/resources/mongod/README.md` for download instructions)
- Dashboard built (`make build`)
- Processing engine binary built (`make build-engine`)

### Build

**Windows (PowerShell):**
```powershell
make release-ps
```

**Linux / macOS (Bash):**
```bash
make release
```

Output installer is placed in `Electron/release/`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Material-UI, Recharts |
| API | Node.js 20, Express 5 |
| Processing | Python 3.11, Flask, OpenCV, DeepFace, TensorFlow |
| Database | MongoDB 7 |
| LLM (primary) | Groq API — llama-3.1-8b-instant (free tier) |
| LLM (fallback) | Ollama — qwen2.5 + nomic-embed-text |
| Desktop | Electron, electron-builder |
| Container | Docker, Docker Compose, Nginx |
| CI | GitHub Actions |
