# ~Raheem
# WebsiteEngine: Monitors active window titles for website keywords,
# detects policy violations based on config, logs events to MongoDB,
# and sends alerts for blocked websites. Windows/Linux compatible.
# Note: Requires win10toast for alerts and pywin32/psutil on Windows.

import threading
import time
import logging
import datetime
from DBWriter.DBWriter import DBWriter
from Alerter.alerter import Alerter
import platform
import subprocess

#Windows-specific for getting active window/url
PLATFORM = platform.system()
if PLATFORM == "Windows":
    import win32gui #pip install pywin32
    import win32process
    import psutil  #pip install psutil

class WebsiteEngine:
    def __init__(self, action_config, session_id=None, poll_interval=2):
        self.session_id = session_id
        self.action_config = action_config
        self.poll_interval = poll_interval

        # Web policy from config (nested structure)
        web_policy = action_config.get("web", {})
        self.banned_websites = web_policy.get("deny", [])
        self.allowed_websites = web_policy.get("allow", [])

        #Runtime state
        self.is_running = False
        self.db_writer = DBWriter()
        self.alerter = Alerter()
        self.service_name = "website_events"
        self.detection_thread = None

        # Track current site for transition detection (like app_engine)
        self.current_domain = None
        self.current_window_title = None
        self.current_site_ts_open = None
        self.current_site_policy = None

        #Logging
        logging.basicConfig(level=logging.DEBUG)
        self.logger = logging.getLogger(__name__)


    def start_detection(self):
        """Start the website monitoring process in a separate thread"""
        if self.is_running:
            self.logger.warning("Website monitoring is already running")
            return False
        try:
            self.is_running = True
            self.detection_thread = threading.Thread(target = self._detection_loop, daemon=True)
            self.detection_thread.start()
            self.logger.info("Website monitoring started")
            return True
        except Exception as e:
            self.logger.error(f"Error starting website detection: {e}")
            self.is_running = False
            return False

    def stop_detection(self):
        """Stop the website monitoring process"""
        if not self.is_running:
            self.logger.warning("Website monitoring is not running")
            return False
        try:
            self.is_running = False
            # Flush the currently tracked site before joining
            self._flush_current_site()
            if self.detection_thread:
                self.detection_thread.join()
            self.logger.info("Website monitoring stopped")
            return True
        except Exception as e:
            self.logger.error(f"Error stopping website detection: {e}")
            return False


    def _get_active_window_info(self):
        """Get active window title and process - works on both platforms"""
        try:
            if PLATFORM == "Windows":
                return self._get_active_window_windows()
            else:
                return self._get_active_window_linux()
        except Exception as e:
            self.logger.warning(f"Error getting window info: {e}")
            return None, None

    def _get_active_window_windows(self):
        """Get the title and URL of the currently active window (Windows only)"""
        try:
            hwnd = win32gui.GetForegroundWindow()
            window_title = win32gui.GetWindowText(hwnd)

            #Get the process name
            _, pid = win32process.GetWindowThreadProcessId(hwnd)
            process = psutil.Process(pid)
            process_name = process.name().lower()
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
            process_name = subprocess.check_output(["ps", "-p", pid, "-o", "comm="]).decode().strip().lower()
            return window_title, process_name
        except Exception as e:
            self.logger.error(f"Error getting active window info on Linux: {e}")
            return None, None

    def _extract_site_keyword(self, site):
        """Extract the keyword from a site entry for matching.
        'youtube.com' → 'youtube', 'youtube' → 'youtube', 'reddit.com' → 'reddit'
        """
        s = site.lower().strip()
        # Strip common TLDs if present
        for tld in (".com", ".org", ".net", ".io", ".co", ".edu", ".gov"):
            if s.endswith(tld):
                s = s[:-len(tld)]
                break
        return s

    def _detect_domain(self, window_title):
        """Try to detect a known domain from the window title.
        Handles both 'youtube.com' and bare 'youtube' in config.
        Returns the matched domain string or None.
        """
        title_lower = window_title.lower()
        # Check banned sites first
        for site in self.banned_websites:
            site_name = self._extract_site_keyword(site)
            if site_name in title_lower:
                return site
        # Check allowed sites
        for site in self.allowed_websites:
            site_name = self._extract_site_keyword(site)
            if site_name in title_lower:
                return site
        return None

    def _determine_policy(self, domain):
        """Determine policy for a given domain.
        Returns dict matching expected schema: { allowed: bool, rule: str }
        """
        dname = domain.lower()
        for banned in self.banned_websites:
            if banned.lower() == dname:
                return {"allowed": False, "rule": "web_deny"}
        for allowed in self.allowed_websites:
            if allowed.lower() == dname:
                return {"allowed": True, "rule": "web_allow"}
        # Site not in either list — allowed by default
        return {"allowed": True, "rule": "web_unlisted"}

    def _flush_current_site(self):
        """Write the currently tracked site to MongoDB and reset state."""
        if self.current_domain is None:
            return

        ts_close = datetime.datetime.utcnow()
        is_violation = not self.current_site_policy.get("allowed", True)

        self.db_writer.write_entry(
            collection=self.service_name,
            data={
                "session_id": str(self.session_id),
                "ts_open": self.current_site_ts_open,
                "ts_close": ts_close,
                "domain": self.current_domain,
                "window_title": self.current_window_title,
                "policy": self.current_site_policy,
                "action_taken": "notified" if is_violation else "ignored",
                "notification": {
                    "sent": is_violation,
                    "ts": ts_close if is_violation else None
                },
                "schema_version": 2
            }
        )

        # Reset tracking state
        self.current_domain = None
        self.current_window_title = None
        self.current_site_ts_open = None
        self.current_site_policy = None

    def _detection_loop(self):
        """Main detection loop - runs in separate thread """
        while self.is_running:
            window_title, process_name = self._get_active_window_info()
            self.logger.debug(f"Active window: '{window_title}' (Process: {process_name})")

            if window_title and process_name:
                detected_domain = self._detect_domain(window_title)

                if detected_domain != self.current_domain:
                    # Site transition: flush the old site, start tracking the new one
                    self._flush_current_site()

                    if detected_domain:
                        policy = self._determine_policy(detected_domain)
                        self.current_domain = detected_domain
                        self.current_window_title = window_title
                        self.current_site_ts_open = datetime.datetime.utcnow()
                        self.current_site_policy = policy

                        self.logger.debug(
                            f"Site transition: {detected_domain} "
                            f"(allowed={policy['allowed']}, rule={policy['rule']})"
                        )

                        if not policy["allowed"]:
                            self.logger.warning(
                                f"Website violation detected: {detected_domain} "
                                f"in window '{window_title}'"
                            )
                            self.alerter.alert("Blocked Website Detected", f"{detected_domain} is not allowed")
                else:
                    # Same site still in foreground — update window title in case it changed
                    if self.current_domain:
                        self.current_window_title = window_title

            time.sleep(self.poll_interval)
