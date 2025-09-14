# alerts the user to their misbehaving >:) (it was their fault they set it themselves)
from win10toast import ToastNotifier

# should alert with windows libraries so that it looks cool
class Alerter:
    def __init__(self):
        self.toast = ToastNotifier()

    def alert(self, header, message=None):
        # Show toast notification
        self.toast.show_toast(header, message or "", duration=10, threaded=True)