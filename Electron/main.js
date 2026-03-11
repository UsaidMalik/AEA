const {app, BrowserWindow} = require('electron')
const {spawn} = require('child_process')
const path = require('path')
const http = require('http')
const fs = require('fs')

const ROOT = path.join(__dirname, '..')
const children = []

// Load a .env file into process.env (minimal parser, no dotenv dependency).
// Existing env vars are never overridden — OS/shell values always win.
function loadEnvFile(envPath) {
    if (!fs.existsSync(envPath)) return
    fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(line => {
        const m = line.match(/^([^#\s=][^=]*)=(.*)$/)
        if (m && !(m[1].trim() in process.env))
            process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '')
    })
}

// Load env vars for the current run mode.
// In packaged mode (Windows installer or Linux AppImage), load default.env directly
// from the read-only resources bundle — we can't write to the AppImage squashfs mount.
// In dev mode, load (or create) ROOT/.env as before.
function ensureEnvFile() {
    const isPackaged = app.isPackaged || !!process.env.APPIMAGE
    if (isPackaged) {
        // Load bundled defaults directly — AppImage mount is read-only, can't write .env there
        loadEnvFile(path.join(process.resourcesPath, 'default.env'))
    } else {
        const envPath = path.join(ROOT, '.env')
        if (!fs.existsSync(envPath)) {
            const source = path.join(ROOT, '.env.example')
            if (fs.existsSync(source)) fs.copyFileSync(source, envPath)
        }
        loadEnvFile(envPath)
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
        windowsHide: true,
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
    // Detect packaged mode reliably: app.isPackaged can be false in AppImage builds
    const resPath = process.resourcesPath
    const isProduction = app.isPackaged || !!process.env.APPIMAGE
    const dbPath = path.join(app.getPath('userData'), 'db')

    if (isProduction) {
        fs.mkdirSync(dbPath, {recursive: true})

        // 1. MongoDB — bundled binary, extension differs by platform
        const mongodExt = process.platform === 'win32' ? '.exe' : ''
        const mongodBin = path.join(resPath, 'mongod', `mongod${mongodExt}`)
        spawnService(mongodBin, ['--dbpath', dbPath, '--port', '27017'])

        // 2. Node.js API server — reuse Electron's own Node via ELECTRON_RUN_AS_NODE
        // Read bundled env vars explicitly so they're always available regardless of
        // process.env propagation edge cases in AppImage
        const bundledEnv = {}
        const defEnvPath = path.join(resPath, 'default.env')
        if (fs.existsSync(defEnvPath)) {
            fs.readFileSync(defEnvPath, 'utf8').split(/\r?\n/).forEach(line => {
                const m = line.replace(/^\uFEFF/, '').match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
                if (m) bundledEnv[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '')
            })
        }
        const serverPath = path.join(resPath, 'api-server', 'server.js')
        spawnService(process.execPath, [serverPath], {
            cwd: path.join(resPath, 'api-server'),
            env: {ELECTRON_RUN_AS_NODE: '1', ...bundledEnv}
        })

        // 3. Processing engine — PyInstaller binary (api.exe on Windows, api on Linux)
        const engineExt = process.platform === 'win32' ? '.exe' : ''
        const engineBin = path.join(resPath, 'engine', `api${engineExt}`)
        spawnService(engineBin, [], {cwd: path.join(resPath, 'engine')})

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
