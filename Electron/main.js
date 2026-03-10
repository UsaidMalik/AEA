const {app, BrowserWindow} = require('electron')
const {spawn} = require('child_process')
const path = require('path')
const http = require('http')
const fs = require('fs')

const ROOT = path.join(__dirname, '..')
const children = []

// Auto-create .env from .env.example if missing (first-run setup)
function ensureEnvFile() {
    const envPath = path.join(ROOT, '.env')
    const examplePath = path.join(ROOT, '.env.example')
    if (!fs.existsSync(envPath) && fs.existsSync(examplePath)) {
        fs.copyFileSync(examplePath, envPath)
        console.log('[AEA] Created .env from .env.example — please add your GROQ_API_KEY')
    }
}
ensureEnvFile()

// Spawning a child process, tracking for cleanup
function spawnService(cmd, args, opts = {}) {
    const {env: extraEnv, cwd, ...rest} = opts
    const proc = spawn(cmd, args, {
        cwd: cwd || ROOT,
        env: {...process.env, ...(extraEnv || {})},
        stdio: 'inherit',
        ...rest
    })
    proc.on('error', err => console.error(`[${cmd}] failed:`, err.message))
    children.push(proc)
    return proc
}

// Poll a URL until it responds (max retries x delay ms)
function waitForURL(url, retries = 60, delay = 1000) {
    return new Promise((resolve, reject) => {
        let attempts = 0
        function check() {
            http.get(url, () => { resolve() })
                .on('error', () => {
                    if (++attempts >= retries) return reject(new Error(`Timeout waiting for ${url}`))
                    setTimeout(check, delay)
                })
        }
        check()
    })
}

async function startBackend() {
    if (app.isPackaged) {
        // ── Production: use bundled binaries ──────────────────────────────
        const ext = process.platform === 'win32' ? '.exe' : ''

        // 1. MongoDB — bundled binary, data stored in user data dir for persistence
        const mongodBin = path.join(process.resourcesPath, 'mongod', `mongod${ext}`)
        const dbPath = path.join(app.getPath('userData'), 'db')
        fs.mkdirSync(dbPath, {recursive: true})
        spawnService(mongodBin, ['--dbpath', dbPath, '--port', '27017'])

        // 2. Node.js API server — reuse Electron's own Node via ELECTRON_RUN_AS_NODE
        const serverPath = path.join(process.resourcesPath, 'api-server', 'server.js')
        spawnService(process.execPath, [serverPath], {
            cwd: path.join(process.resourcesPath, 'api-server'),
            env: {ELECTRON_RUN_AS_NODE: '1'}
        })

        // 3. Python processing engine — PyInstaller binary
        const engineBin = path.join(process.resourcesPath, 'engine', `api${ext}`)
        spawnService(engineBin, [], {
            cwd: path.join(process.resourcesPath, 'engine')
        })

        // 4. Ollama (optional fallback LLM — start if installed, silently skip if not)
        spawnService('ollama', ['serve'])

    } else {
        // ── Development: use system commands ──────────────────────────────
        spawnService('mongod', ['--dbpath', path.join(ROOT, 'data/db'), '--port', '27017'])
        spawnService('node', ['api-server/server.js'])
        const py = process.platform === 'win32' ? 'py' : 'python3'
        spawnService(py, ['processing-engine/api.py'])
        spawnService('ollama', ['serve'])
    }

    console.log('Waiting for API server to be ready...')
    await waitForURL('http://localhost:12039/api/session/status')
    console.log('API server ready.')
}


async function createWindow() {
    await startBackend()

    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 960,
        minHeight: 600,
        title: 'AEA',
        webPreferences: {contextIsolation: true}
    })

    // Dev: Vite dev server. Packaged/prod: API server serves the built React app.
    const url = (!app.isPackaged && process.env.NODE_ENV === 'development')
        ? 'http://localhost:5173'
        : 'http://localhost:12039'
    win.loadURL(url)
}

// Kill all child processes on exit
app.on('before-quit', () => {
    children.forEach(c => { try { c.kill() } catch (_) {} })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

app.whenReady().then(createWindow)
