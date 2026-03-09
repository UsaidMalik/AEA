import pytest
from Alerter.alerter import Alerter
from unittest.mock import patch


@patch("Alerter.alerter.notification")
def test_alert_calls_notify(mock_notification):
    alerter = Alerter()
    alerter.alert("alive", "im alive bigly i promise")

    mock_notification.notify.assert_called_once()
    call_kwargs = mock_notification.notify.call_args.kwargs
    assert call_kwargs["title"] == "alive"
    assert call_kwargs["message"] == "im alive bigly i promise"
    assert call_kwargs["timeout"] == 10


@patch("Alerter.alerter.notification")
def test_alert_no_message_defaults_to_empty_string(mock_notification):
    alerter = Alerter()
    alerter.alert("Header Only")

    call_kwargs = mock_notification.notify.call_args.kwargs
    assert call_kwargs["message"] == ""


@patch("Alerter.alerter.notification")
def test_alert_logo_path_is_correct(mock_notification):
    alerter = Alerter()
    assert alerter.logo_path.endswith("aea_logo.ico")
