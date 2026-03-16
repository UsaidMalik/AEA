import pytest
from Alerter.alerter import Alerter
from unittest.mock import patch


@patch("Alerter.alerter._platform.system", return_value="Darwin")
@patch("Alerter.alerter.subprocess.run")
def test_alert_macos_path(mock_run, mock_platform):
    alerter = Alerter()
    alerter.alert("Hello", "Message")

    mock_platform.assert_called()
    mock_run.assert_called_once()
    call_args = mock_run.call_args[0][0]
    assert call_args[0] == "osascript"
    assert "Hello" in call_args[-1]
    assert "Message" in call_args[-1]


@patch("Alerter.alerter._platform.system", return_value="Windows")
@patch("Alerter.alerter.notification")
def test_alert_non_macos_path(mock_notification, mock_platform):
    alerter = Alerter()
    alerter.alert("alive", "im alive bigly i promise")

    mock_platform.assert_called()
    mock_notification.notify.assert_called_once()
    call_kwargs = mock_notification.notify.call_args.kwargs
    assert call_kwargs["title"] == "alive"
    assert call_kwargs["message"] == "im alive bigly i promise"
    assert call_kwargs["timeout"] == 10


@patch("Alerter.alerter._platform.system", return_value="Windows")
@patch("Alerter.alerter.notification")
def test_alert_no_message_defaults_to_empty_string(mock_notification, mock_platform):
    alerter = Alerter()
    alerter.alert("Header Only")

    call_kwargs = mock_notification.notify.call_args.kwargs
    assert call_kwargs["message"] == ""


@patch("Alerter.alerter.notification")
def test_alert_logo_path_is_correct(mock_notification):
    alerter = Alerter()
    assert alerter.logo_path.endswith("aea_logo.ico")
