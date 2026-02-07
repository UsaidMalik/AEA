import threading
import time
import logging
import datetime
from DBWriter.DBWriter import DBWriter
import platform
import subprocess

#Windows=specific for getting active window/url
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

        #Banned websites from config
        self.banned_websites = action_config.get("banned_websites", [])
        
        #Runtime state 
        self.is_running = False
        self.db_writer = DBWriter()
        self.service_name = "website_events"
        self.detection_thread = None

        #Track last violation to avoid spam (like FacialEngine)
        self.last_violation_url = None
        
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

    
    def _detection_loop(self):
        """Main detection loop - runs in separate thread """
        while self.is_running:
            window_title, process_name = self._get_active_window_info()
            self.logger.debug(f"Active window: '{window_title}' (Process: {process_name})")
            if window_title and process_name:
                #check if user on a banned website
                for banned_site in self.banned_websites:
                    # strip TLD (.com, .org, etc.) since Chrome doesn't show it in the title
                    site_name = banned_site.lower().rsplit(".", 1)[0]
                    if site_name in window_title.lower():
                        if self.last_violation_url != banned_site:
                            self.on_violation(banned_site, window_title)
                            self.last_violation_url = banned_site
                        break
                else: 
                        self.last_violation_url = None
            time.sleep(self.poll_interval)

    def on_violation(self, banned_site, window_title):
        """Handle a website violation event """
        self.logger.warning (f"Website violation detected: {banned_site} in window '{window_title}'")
        self.db_writer.write_entry(
            collection= self.service_name,
            data={
                "session_id": str(self.session_id),
                "ts": datetime.datetime.utcnow(),
                "source": "website",
                "event_type": "violation",
                "banned_site": banned_site,
                "window_title": window_title,
                "schema_version": 1
            }
        )

            