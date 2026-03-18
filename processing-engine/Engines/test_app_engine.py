import pytest
from unittest.mock import patch, MagicMock
from Engines.app_engine import AppEngine
import datetime


@patch("Engines.app_engine.DBWriter")
@patch("Engines.app_engine.Alerter")

def test_normalize_app_name(mock_alerter, mock_db_writer):
    config = { "apps": {"deny": [],"allow": []}}
    engine = AppEngine(action_config=config)
    test_cases = [
        ("Chrome.exe", "chrome"),
        ("notepad++.exe", "notepad++"),
        ("Microsoft Word.exe", "microsoft word"),
        ("Spotify.exe", "spotify"),
        ("Code.exe", "code"),
        ("Slack.exe", "slack"),
        ("Discord.exe", "discord"),
        ("Excel", "excel"),
        (" PowerPoint ", "powerpoint"),
        ("Outlook.exe", "outlook") ]
    for input_name, expected in test_cases:
        assert engine._normalize_app_name(input_name) == expected

@patch("Engines.app_engine.DBWriter")
@patch("Engines.app_engine.Alerter")
def test_determine_policy(mock_alerter, mock_db_writer):
    config = {"apps": {"deny": ["discord"], "allow": ["chrome"]}}
    engine = AppEngine(action_config=config)

    # Test denied app
    test_cases = [
        ("Discord.exe", {"allowed": False, "rule": "app_deny"}),
        ("chrome.exe", {"allowed": True, "rule": "app_allow"}),
        ("unknown.exe", {"allowed": True, "rule": "app_unlisted"})
    ]
    for process_name, expected in test_cases:
        result = engine._determine_policy(process_name)
        assert result == expected


@patch("Engines.app_engine.DBWriter")
@patch("Engines.app_engine.Alerter")
def test_flush_current_app(mock_alerter, mock_db_writer):
    mock_db_writer_instance = MagicMock()
    mock_db_writer.return_value = mock_db_writer_instance
    config = {"apps": {"deny": ["discord"], "allow": ["chrome"]}}

    engine = AppEngine(action_config = config)
    test_cases = [
        {
            "current_app": "discord",
            "current_window_title": "Discord - Chatting with friends",
            "current_app_ts_open": datetime.datetime(2024, 1, 1, 12, 0, 0),
            "current_app_policy": {"allowed": False, "rule": "app_deny"},
            "expected_action_taken": "notified",
            "expected_notification_sent": True
        },
        {
            "current_app": "chrome",
            "current_window_title": "Google Chrome - Browsing the web",
            "current_app_ts_open": datetime.datetime(2024, 1, 1, 13, 0, 0),
            "current_app_policy": {"allowed": True, "rule": "app_allow"},
            "expected_action_taken": "ignored",
            "expected_notification_sent": False
        },
        {
            "current_app": "unknown",
            "current_window_title": "Unknown Application",
            "current_app_ts_open": datetime.datetime(2024, 1, 1, 14, 0, 0),
            "current_app_policy": {"allowed": True, "rule": "app_unlisted"},
            "expected_action_taken": "ignored",
            "expected_notification_sent": False
        }
    ]

    for case in test_cases:
        engine.current_app = case["current_app"]
        engine.current_window_title = case["current_window_title"]
        engine.current_app_ts_open = case["current_app_ts_open"]
        engine.current_app_policy = case["current_app_policy"]

        engine._flush_current_app()

        mock_db_writer_instance.write_entry.assert_called_once()
        args, kwargs = mock_db_writer_instance.write_entry.call_args
        assert kwargs["collection"] == engine.service_name
        data = kwargs["data"]
        assert data["session_id"] == str(engine.session_id)
        assert data["ts_open"] == case["current_app_ts_open"]
        assert data["ts_close"] > case["current_app_ts_open"]
        assert data["app_name"] == engine._normalize_app_name(case["current_app"])
        assert data["window_title"] == case["current_window_title"]
        assert data["policy"] == case["current_app_policy"]
        assert data["action_taken"] == case["expected_action_taken"]
        if case["expected_notification_sent"]:
            assert data["notification"]["sent"] is True
            assert data["notification"]["ts"] is not None
        else:
            assert data["notification"]["sent"] is False
            assert data["notification"]["ts"] is None

        # Reset mock for next iteration
        mock_db_writer_instance.write_entry.reset_mock()


@patch("Engines.app_engine.DBWriter")
@patch("Engines.app_engine.Alerter")
def test_flush_no_current_app(mock_alerter, mock_db_writer):
    mock_db_writer_instance = MagicMock()
    mock_db_writer.return_value = mock_db_writer_instance
    config = {"apps": {"deny": [], "allow": []}}

    engine = AppEngine(action_config=config)
    # current_app is None by default
    engine._flush_current_app()

    # Should NOT write to DB when no app is tracked
    mock_db_writer_instance.write_entry.assert_not_called()


@patch("Engines.app_engine.DBWriter")
@patch("Engines.app_engine.Alerter")
def test_flush_resets_state(mock_alerter, mock_db_writer):
    config = {"apps": {"deny": [], "allow": []}}
    engine = AppEngine(action_config=config)

    # Set some tracking state
    engine.current_app = "discord"
    engine.current_window_title = "Discord - #general"
    engine.current_app_ts_open = datetime.datetime(2024, 1, 1, 12, 0, 0)
    engine.current_app_policy = {"allowed": False, "rule": "app_deny"}

    engine._flush_current_app()

    # All state should be reset to None
    assert engine.current_app is None
    assert engine.current_window_title is None
    assert engine.current_app_ts_open is None
    assert engine.current_app_policy is None


@patch("Engines.app_engine.DBWriter")
@patch("Engines.app_engine.Alerter")
def test_start_detection_already_running(mock_alerter, mock_db_writer):
    config = {"apps": {"deny": [], "allow": []}}
    engine = AppEngine(action_config=config)

    # Simulate already running
    engine.is_running = True

    result = engine.start_detection()
    assert result is False


@patch("Engines.app_engine.DBWriter")
@patch("Engines.app_engine.Alerter")
def test_stop_detection_not_running(mock_alerter, mock_db_writer):
    config = {"apps": {"deny": [], "allow": []}}
    engine = AppEngine(action_config=config)

    # Not running by default
    result = engine.stop_detection()
    assert result is False


@patch("Engines.app_engine.DBWriter")
@patch("Engines.app_engine.Alerter")
def test_flush_current_app_strict_mode(mock_alerter, mock_db_writer):
    """In strict mode, a violation should be recorded as 'blocked', not 'notified'."""
    mock_db_writer_instance = MagicMock()
    mock_db_writer.return_value = mock_db_writer_instance
    config = {"apps": {"deny": ["discord"], "allow": []}, "enforcement_level": "strict"}

    engine = AppEngine(action_config=config)
    engine.current_app = "discord"
    engine.current_window_title = "Discord - #general"
    engine.current_app_ts_open = datetime.datetime(2024, 1, 1, 12, 0, 0)
    engine.current_app_policy = {"allowed": False, "rule": "app_deny"}

    engine._flush_current_app()

    _, kwargs = mock_db_writer_instance.write_entry.call_args
    assert kwargs["data"]["action_taken"] == "blocked"


@patch("Engines.app_engine.psutil")
@patch("Engines.app_engine.DBWriter")
@patch("Engines.app_engine.Alerter")
def test_kill_app(mock_alerter, mock_db_writer, mock_psutil):
    """_kill_app kills matching processes and ignores AccessDenied."""
    config = {"apps": {"deny": ["discord"], "allow": []}}
    engine = AppEngine(action_config=config)

    mock_proc_match = MagicMock()
    mock_proc_match.info = {"name": "Discord.exe"}

    mock_proc_no_match = MagicMock()
    mock_proc_no_match.info = {"name": "chrome.exe"}

    mock_proc_denied = MagicMock()
    mock_proc_denied.info = {"name": "discord.exe"}
    mock_proc_denied.kill.side_effect = mock_psutil.AccessDenied(pid=99)

    mock_psutil.process_iter.return_value = [mock_proc_match, mock_proc_no_match, mock_proc_denied]
    mock_psutil.NoSuchProcess = Exception
    mock_psutil.AccessDenied = Exception

    engine._kill_app("Discord.exe")

    mock_proc_match.kill.assert_called_once()
    mock_proc_no_match.kill.assert_not_called()


@patch("Engines.app_engine.webbrowser")
@patch("Engines.app_engine.DBWriter")
@patch("Engines.app_engine.Alerter")
def test_block_app(mock_alerter, mock_db_writer, mock_webbrowser):
    """_block_app calls _kill_app and opens the blocked page with correct URL."""
    config = {"apps": {"deny": ["discord"], "allow": []}, "enforcement_level": "strict"}
    engine = AppEngine(action_config=config, config_name="Study Mode")
    engine._kill_app = MagicMock()

    engine._block_app("discord")

    engine._kill_app.assert_called_once_with("discord")
    call_url = mock_webbrowser.open.call_args[0][0]
    assert "app=discord" in call_url
    assert "config=Study+Mode" in call_url or "config=Study%20Mode" in call_url
    assert call_url.startswith("http://localhost:12039/blocked")
