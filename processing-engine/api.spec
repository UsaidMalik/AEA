# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec for the AEA processing engine.
# Run from the processing-engine/ directory:
#   pyinstaller api.spec
#
# Output: dist/api (Linux/macOS) or dist/api.exe (Windows)

import sys
import os

block_cipher = None

a = Analysis(
    ['api.py'],
    pathex=['.'],
    binaries=[],
    datas=[
        # Include any data files the engine needs at runtime
        ('aea_logo.ico', '.'),
    ],
    hiddenimports=[
        # Flask and its internals
        'flask',
        'flask_cors',
        'werkzeug',
        'werkzeug.serving',
        'werkzeug.routing',
        # MongoDB
        'pymongo',
        'bson',
        'bson.json_util',
        # DeepFace / TensorFlow
        'deepface',
        'tensorflow',
        'keras',
        'cv2',
        'PIL',
        'PIL.Image',
        'mtcnn',
        'retina_face',
        # Plyer notifications
        'plyer',
        'plyer.platforms',
        'plyer.platforms.win.notification',
        'plyer.platforms.macosx.notification',
        'plyer.platforms.linux.notification',
        # psutil for process info
        'psutil',
        # Environment
        'dotenv',
        'python_dotenv',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='api',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,       # keep True so Flask logs are visible
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
