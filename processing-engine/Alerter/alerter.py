# alerts the user to their misbehaving >:) (it was their fault they set it themselves)
from win10toast import ToastNotifier
import os

# should alert with windows libraries so that it looks cool
class Alerter:
    def __init__(self):
        self.toast = ToastNotifier()
        # Create an absolute path for the logo to ensure it's found regardless of the script's execution directory.
        # We use os.path to build a path that is relative to the current script's location (__file__).
        # This assumes the 'aea_logo.png' file is in the parent directory of this script.
        self.logo_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'aea_logo.ico')

    def alert(self, header, message=None):
        # Add the icon_path argument to the show_toast call to display the logo.
        # The win10toast library uses this parameter to display a custom icon.
        # Note: The icon should be a .ico file for best results, as specified by the win10toast documentation.
        self.toast.show_toast(
            header,
            message or "",
            icon_path=self.logo_path,
            duration=10,
            threaded=True
        )