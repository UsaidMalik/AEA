# testd since this shouldnt be tested with unit tests
from Alerter.alerter import Alerter
from pytest
from unittest.mock import patch, MagicMock


@patch("Alerter.alerter.ToastNotifier")

def test_alert_calls_show_toast(mock_toast_notifier):
    mock_toast = MagicMock()
    mock_toast_notifier.return_value = mock_toast
    alerter = Alerter()
    alerter.alert("alive", "im alive bigly i promise")
    mock_toast.show_toast.assert_called_once_with("alive", "im alive bigly i promise")




test()   