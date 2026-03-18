# ~Raheem
# AppEngine: Monitors active applications and window titles,
# detects policy violations based on config, logs events to MongoDB,
# and sends alerts for blocked apps. Windows/Linux compatible.
# Note: Requires win10toast for alerts and pywin32/psutil on Windows.


import threading
import time
import logging
import datetime
import webbrowser
import urllib.parse
from DBWriter.DBWriter import DBWriter
from Alerter.alerter import Alerter
import platform
import subprocess

PLATFORM = platform.system()

try:
    import psutil
except ImportError:
    psutil = None

# Windows-specific for getting active window
if PLATFORM == "Windows":
    try:
        import win32gui
        import win32process
    except ImportError:
        win32gui = win32process = None


class AppEngine:
    def __init__(self, action_config, session_id=None, poll_interval=2, config_name=""):
        self.session_id = session_id
        self.action_config = action_config
        self.poll_interval = poll_interval
        self.config_name = config_name
        self.strict = action_config.get("enforcement_level", "lenient") == "strict"

        # Banned/allowed apps from config (nested structure)
        apps_policy = action_config.get("apps", {})
        self.banned_apps = apps_policy.get("deny", [])
        self.allowed_apps = apps_policy.get("allow", [])

        # Runtime state
        self.is_running = False
        self.db_writer = DBWriter()
        self.alerter = Alerter()
        self.service_name = "app_events"
        self.detection_thread = None

        # Track current foreground app for transition detection
        self.current_app = None
        self.current_window_title = None
        self.current_app_ts_open = None
        self.current_app_policy = None

        # Logging
        logging.basicConfig(level=logging.DEBUG)
        self.logger = logging.getLogger(__name__)
        print(f"[AppEngine] Strict mode: {self.strict} (enforcement_level={action_config.get('enforcement_level', 'lenient')})", flush=True)

    def start_detection(self):
        """Start the app monitoring process in a separate thread"""
        if self.is_running:
            self.logger.warning("App monitoring is already running")
            return False
        try:
            self.is_running = True
            self.detection_thread = threading.Thread(target=self._detection_loop, daemon=True)
            self.detection_thread.start()
            self.logger.info("App monitoring started")
            return True
        except Exception as e:
            self.logger.error(f"Error starting app detection: {e}")
            self.is_running = False
            return False

    def stop_detection(self):
        """Stop the app monitoring process"""
        if not self.is_running:
            self.logger.warning("App monitoring is not running")
            return False
        try:
            self.is_running = False
            # Flush the currently tracked app before joining
            self._flush_current_app()
            if self.detection_thread:
                self.detection_thread.join()
            self.logger.info("App monitoring stopped")
            return True
        except Exception as e:
            self.logger.error(f"Error stopping app detection: {e}")
            return False

    def _get_active_window_info(self):
        """Get active window title and process - works on Windows, macOS, Linux"""
        try:
            if PLATFORM == "Windows":
                return self._get_active_window_windows()
            elif PLATFORM == "Darwin":
                return self._get_active_window_macos()
            else:
                return self._get_active_window_linux()
        except Exception as e:
            self.logger.warning(f"Error getting window info: {e}")
            return None, None

    def _get_active_window_windows(self):
        """Get the title and process name of the currently active window (Windows only)"""
        try:
            hwnd = win32gui.GetForegroundWindow()
            window_title = win32gui.GetWindowText(hwnd)

            # Get the process name
            _, pid = win32process.GetWindowThreadProcessId(hwnd)
            process = psutil.Process(pid)
            process_name = process.name()
            return window_title, process_name
        except Exception as e:
            self.logger.error(f"Error getting active window info: {e}")
            return None, None

    def _get_active_window_linux(self):
        """Linux implementation using xdotool"""
        try:
            window_id = subprocess.check_output(["xdotool", "getactivewindow"]).decode().strip()
            window_title = subprocess.check_output(["xdotool", "getwindowname", window_id]).decode().strip()
            pid = subprocess.check_output(["xdotool", "getwindowpid", window_id]).decode().strip()
            process_name = subprocess.check_output(["ps", "-p", pid, "-o", "comm="]).decode().strip()
            return window_title, process_name
        except Exception as e:
            self.logger.error(f"Error getting active window info on Linux: {e}")
            return None, None

    def _get_active_window_macos(self):
        """macOS implementation using AppleScript via osascript"""
        try:
            app_name = subprocess.check_output([
                'osascript', '-e',
                'tell application "System Events" to get name of first process whose frontmost is true'
            ], stderr=subprocess.DEVNULL).decode().strip()
            window_title = subprocess.check_output([
                'osascript', '-e',
                'tell application "System Events" to get title of front window of (first process whose frontmost is true)'
            ], stderr=subprocess.DEVNULL).decode().strip()
            return window_title, app_name
        except Exception as e:
            self.logger.error(f"Error getting active window info on macOS: {e}")
            return None, None

    def _normalize_app_name(self, name):
        """Strip common suffixes (.exe, .app) for flexible matching."""
        n = name.lower().strip()
        for suffix in (".exe", ".app"):
            if n.endswith(suffix):
                n = n[:-len(suffix)]
        return n

    def _determine_policy(self, process_name):
        """Determine policy for a given process name.
        Matches flexibly: 'discord' matches 'Discord.exe' and vice versa.
        Returns dict matching expected schema: { allowed: bool, rule: str }
        """
        pname = self._normalize_app_name(process_name)
        for banned in self.banned_apps:
            if self._normalize_app_name(banned) == pname:
                return {"allowed": False, "rule": "app_deny"}
        for allowed in self.allowed_apps:
            if self._normalize_app_name(allowed) == pname:
                return {"allowed": True, "rule": "app_allow"}
        # App not in either list — allowed by default
        return {"allowed": True, "rule": "app_unlisted"}

    def _kill_app(self, process_name):
        """Kill all running processes matching the blocked app name."""
        if not psutil:
            print("[AppEngine] psutil not available — cannot kill processes", flush=True)
            return
        target = self._normalize_app_name(process_name)
        print(f"[AppEngine] Attempting to kill: {target}", flush=True)
        killed = 0
        for proc in psutil.process_iter(['name']):
            try:
                if self._normalize_app_name(proc.info['name']) == target:
                    proc.kill()
                    killed += 1
            except psutil.AccessDenied:
                print(f"[AppEngine] Access denied killing {proc.info['name']}", flush=True)
            except psutil.NoSuchProcess:
                pass
        print(f"[AppEngine] Killed {killed} process(es) matching '{target}'", flush=True)

    def _block_app(self, process_name):
        """Kill the app and open the blocked page in the browser."""
        print(f"[AppEngine] Blocking app: {process_name}", flush=True)
        self._kill_app(process_name)
        params = urllib.parse.urlencode({"app": process_name, "config": self.config_name})
        webbrowser.open(f"http://localhost:12039/blocked?{params}")

    def _flush_current_app(self):
        """Write the currently tracked app to MongoDB and reset state."""
        if self.current_app is None:
            return

        ts_close = datetime.datetime.utcnow()
        is_violation = not self.current_app_policy.get("allowed", True)

        self.db_writer.write_entry(
            collection=self.service_name,
            data={
                "session_id": str(self.session_id),
                "ts_open": self.current_app_ts_open,
                "ts_close": ts_close,
                "app_name": self.current_app,
                "window_title": self.current_window_title,
                "policy": self.current_app_policy,
                "action_taken": ("blocked" if self.strict else "notified") if is_violation else "ignored",
                "notification": {
                    "sent": is_violation,
                    "ts": ts_close if is_violation else None
                },
                "schema_version": 1
            }
        )

        # Reset tracking state
        self.current_app = None
        self.current_window_title = None
        self.current_app_ts_open = None
        self.current_app_policy = None

    def _detection_loop(self):
        """Main detection loop - runs in separate thread"""
        while self.is_running:
            window_title, process_name = self._get_active_window_info()

            if process_name:
                # Check if the foreground app has changed
                if self._normalize_app_name(process_name) != (self.current_app or "").lower():
                    # App transition: flush the old app, start tracking the new one
                    self._flush_current_app()

                    policy = self._determine_policy(process_name)
                    self.current_app = self._normalize_app_name(process_name)
                    self.current_window_title = window_title
                    self.current_app_ts_open = datetime.datetime.utcnow()
                    self.current_app_policy = policy

                    self.logger.debug(
                        f"App transition: {process_name} "
                        f"(allowed={policy['allowed']}, rule={policy['rule']})"
                    )

                    if not policy["allowed"]:
                        self.logger.warning(
                            f"App violation detected: {process_name} "
                            f"in window '{window_title}'"
                        )
                        self.alerter.alert("Blocked App Detected", f"{process_name} is not allowed")
                        if self.strict:
                            self._block_app(process_name)
                else:
                    # Same app still in foreground — update window title in case it changed
                    self.current_window_title = window_title

            time.sleep(self.poll_interval)
