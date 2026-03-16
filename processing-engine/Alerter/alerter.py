# alerts the user to their misbehaving >:) (it was their fault they set it themselves)
import os
from plyer import notification
import platform as _platform
import subprocess

class Alerter:
    def __init__(self):
        self.logo_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'aea_logo.ico')

    def alert(self, header, message=None):
        try:
            if _platform.system() == 'Darwin':
                msg = (message or "").replace('"', '\\"')
                hdr = header.replace('"', '\\"')
                subprocess.run(
                    ['osascript', '-e',
                    f'display notification "{msg}" with title "{hdr}"'],
                    check=False
                ) 
            else:  
                notification.notify(
                    title=header,
                    message=message or "",
                    app_icon=self.logo_path if os.path.exists(self.logo_path) else None,
                    timeout=10,
                )
        except Exception:
            pass  # Notifications are non-critical
