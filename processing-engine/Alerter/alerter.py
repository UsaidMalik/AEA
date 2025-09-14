# alerts the user to their misbehaving >:) (it was their fault they set it themselves)
from win11toast import toast

# should alert with windows libraries so that it looks cool
class Alerter():
    def __init__(self):
        pass

    def alert(self, header, message=None):
        toast(header, message)