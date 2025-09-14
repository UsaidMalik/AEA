# testd since this shouldnt be tested with unit tests
from .alerter import Alerter

def test():
    alerter = Alerter()
    alerter.alert("alive", "im alive bigly i promise")
    pass

test()    