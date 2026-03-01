# AEA — AI Accountable Executive Assistant

AEA is a PC session monitoring and accountability platform. It tracks your applications, websites, and facial expressions in real time during focus sessions, enforces configurable policies, and gives you AI-powered insights into your productivity habits.

---

## Features

- **Session monitoring** — tracks active app, browser domain, and webcam feed simultaneously
- **Policy enforcement** — configurable allow/deny lists per session type (e.g. "study mode", "work mode")
- **Facial recognition** — detects emotions and presence via webcam using DeepFace
- **Real-time alerts** — Windows toast notifications for policy violations
- **AI query** — ask natural-language questions about your sessions (powered by Ollama + RAG)
- **Dashboard** — visualize session stats, focus score, timelines, and historical data

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│           Dashboard  (React · port 80)           │
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
                                    Ollama
                                 (port 11434)
                            qwen2.5 + nomic-embed-text
```

---

## Quick Start — Docker (Recommended)

> Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/) to be installed and running.

```bash
git clone https://github.com/UsaidMalik/AEA.git
cd AEA
docker compose up --build
```

On first run Docker will:
1. Build all service images
2. Start MongoDB and Ollama
3. Automatically pull `qwen2.5:latest` and `nomic-embed-text` models (~4 GB)

Subsequent runs skip the model download and use cached layers.

| Service | URL |
|---|---|
| Dashboard | http://localhost |
| API Server | http://localhost:12039 |
| MongoDB Admin (mongo-express) | http://localhost:8081 |
| Ollama | http://localhost:11434 |

To stop:
```bash
docker compose down          # stop, keep data volumes
docker compose down -v       # stop and wipe all data
```

> **Note:** The Processing Engine (camera, app monitoring, alerts) is designed for your local machine. It runs inside Docker but facial recognition requires a camera passthrough — see [Camera in Docker](#camera-in-docker).

---

## Local Development Setup

### Prerequisites

| Tool | Version |
|---|---|
| Python | 3.11+ |
| Node.js | 20+ |
| MongoDB | 7+ |
| Ollama | latest |

### 1. Clone the repo

```bash
git clone https://github.com/UsaidMalik/AEA.git
cd AEA
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
DATABASE_URI=mongodb://localhost:27017
DATABASE_NAME=aea_local
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:latest
OLLAMA_EMBED_MODEL=nomic-embed-text
OLLAMA_TIMEOUT_MS=120000
```

### 3. Install dependencies

```bash
make install
```

Or individually:

```bash
make install-api        # Node.js — api-server
make install-dashboard  # Node.js — dashboard
make install-engine     # Python  — processing-engine
```

### 4. Pull Ollama models

```bash
ollama pull qwen2.5:latest
ollama pull nomic-embed-text
```

### 5. Start all services

**Git Bash / Linux / macOS:**
```bash
make dev
```

**PowerShell:**
```bash
make dev-ps
```

This starts MongoDB, the Processing Engine, API Server, and Dashboard concurrently. Logs are written to `logs/`.

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
│   ├── api.py                  # Flask HTTP endpoints
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
│   └── tools/
│       ├── smart-query.js      # LLM orchestrator
│       ├── query-tools.js      # MongoDB aggregations for metrics
│       └── rag.js              # Retrieval-Augmented Generation engine
│
├── dahsboard/                  # React · TypeScript · Vite · port 5173
│   ├── src/
│   │   ├── pages/              # WelcomePage, HomePage, SessionsPage, etc.
│   │   ├── components/         # Charts, tables, session overview
│   │   └── context/            # UserContext for session state
│   └── nginx.conf              # Nginx config for Docker serving
│
├── docker-compose.yml          # Full stack container setup
├── Makefile                    # Developer shortcuts
├── scripts/
│   ├── dev.sh                  # Start all services (Bash)
│   ├── dev.ps1                 # Start all services (PowerShell)
│   ├── test.sh                 # Run all tests (Bash)
│   └── test.ps1                # Run all tests (PowerShell)
└── MODELS.md                   # MongoDB schema reference
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URI` | `mongodb://localhost:27017` | MongoDB connection string |
| `DATABASE_NAME` | `aea_local` | Database name |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama API base URL |
| `OLLAMA_MODEL` | `qwen2.5:latest` | LLM model for queries |
| `OLLAMA_EMBED_MODEL` | `nomic-embed-text` | Embedding model for RAG |
| `OLLAMA_TIMEOUT_MS` | `120000` | Ollama request timeout (ms) |

In Docker these are set automatically via `docker-compose.yml` — no manual configuration needed.

---

## Available Commands

```bash
# Development
make dev              # Start all services (Bash)
make dev-ps           # Start all services (PowerShell)

# Installation
make install          # Install all dependencies
make install-api      # Install api-server dependencies
make install-dashboard# Install dashboard dependencies
make install-engine   # Install processing-engine dependencies

# Testing
make test             # Run all tests (Bash)
make test-ps          # Run all tests (PowerShell)

# Build
make build            # Build dashboard for production
make lint             # Lint dashboard TypeScript

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
| `GET` | `/api/session/status` | Check if session is active |

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

---

## Testing

```bash
# All tests
make test

# API tests only (Jest)
cd api-server && npm test

# Engine tests only (pytest)
cd processing-engine && pytest -v
```

CI runs automatically on push/PR to `main` and `mvp1` via GitHub Actions:
- **API tests** — Jest on Ubuntu
- **Engine tests** — pytest on Windows

---

## Camera in Docker

Facial recognition requires webcam access. On Linux you can pass through a camera device by uncommenting in `docker-compose.yml` under `processing-engine`:

```yaml
devices:
  - /dev/video0:/dev/video0
```

On Windows/macOS, camera passthrough to Docker is not supported. Run the processing engine locally (`make engine`) and the rest of the stack in Docker.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Material-UI, Recharts |
| API | Node.js 20, Express 5 |
| Processing | Python 3.11, Flask, OpenCV, DeepFace |
| Database | MongoDB 7 |
| LLM | Ollama (qwen2.5 + nomic-embed-text) |
| Container | Docker, Docker Compose, Nginx |
| CI | GitHub Actions |
