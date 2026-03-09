# Bundled MongoDB Binaries

Place the platform-specific `mongod` binary in the correct subfolder before running `make dist`.

## Directory structure

```
resources/mongod/
  win/mongod.exe      ← Windows binary
  mac/mongod          ← macOS binary  (chmod +x after download)
  linux/mongod        ← Linux binary  (chmod +x after download)
```

## Download instructions

Go to https://www.mongodb.com/try/download/community and select:
- Version: 7.x (current stable)
- Platform: matching your build target
- Package: ZIP (Windows) or TGZ (macOS/Linux)

Extract the archive and copy only the `mongod` binary (inside the `bin/` folder).

### Windows
```
Electron/resources/mongod/win/mongod.exe
```

### macOS
```
Electron/resources/mongod/mac/mongod
chmod +x Electron/resources/mongod/mac/mongod
```

### Linux
```
Electron/resources/mongod/linux/mongod
chmod +x Electron/resources/mongod/linux/mongod
```

## Notes
- You only need the binary for the platform you're building on (electron-builder picks
  the right subfolder per the `win`/`mac`/`linux` extraResources config in package.json).
- The binary is ~60-80 MB. It is gitignored — each developer downloads it once.
- In dev mode (`make electron`) mongod is NOT bundled — the system `mongod` is used instead.
