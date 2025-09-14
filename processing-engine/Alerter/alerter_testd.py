# testd since this shouldnt be tested with unit tests
from .alerter import Alerter

def test():
    alerter = Alerter()
    alerter.alert("alive", "im alive bigly i promise")
    print("Testing alert with URL...")
    alerter.alert("Click me!", "This notification should open a URL when clicked.")
    pass

test()