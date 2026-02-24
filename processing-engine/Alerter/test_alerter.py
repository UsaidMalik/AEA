import pytest
from Alerter.alerter import Alerter
from unittest.mock import patch, MagicMock


@patch("Alerter.alerter.ToastNotifier")
def test_alert_calls_show_toast(mock_toast_class):
    mock_toast = MagicMock()
    mock_toast_class.return_value = mock_toast

    alerter = Alerter()
    alerter.alert("alive", "im alive bigly i promise")

    mock_toast.show_toast.assert_called_once_with(
        "alive",
        "im alive bigly i promise",
        icon_path=alerter.logo_path,
        duration=10,
        threaded=True
    )


@patch("Alerter.alerter.ToastNotifier")
def test_alert_no_message_defaults_to_empty_string(mock_toast_class):
    mock_toast = MagicMock()
    mock_toast_class.return_value = mock_toast

    alerter = Alerter()
    alerter.alert("Header Only")

    # message=None should become "" via `message or ""`
    mock_toast.show_toast.assert_called_once_with(
        "Header Only",
        "",
        icon_path=alerter.logo_path,
        duration=10,
        threaded=True
    )


@patch("Alerter.alerter.ToastNotifier")
def test_alert_logo_path_is_correct(mock_toast_class):
    alerter = Alerter()
    assert alerter.logo_path.endswith("aea_logo.ico")
