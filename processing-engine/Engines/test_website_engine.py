import pytest
from unittest.mock import patch, MagicMock
from Engines.website_engine import WebsiteEngine
import datetime


@patch("Engines.website_engine.DBWriter")
@patch("Engines.website_engine.Alerter")
def test_extract_site_keyword(mock_alerter, mock_db_writer):
    config = {"web": {"deny": [], "allow": []}}
    engine = WebsiteEngine(action_config=config)
    test_cases = [
        ("youtube.com", "youtube"),
        ("reddit.org", "reddit"),
        ("google", "google"),
        (" Twitter.com ", "twitter"),
        ("github.io", "github"),
        ("Harvard.edu", "harvard"),
        ("Example.net", "example"),
    ]
    for input_site, expected in test_cases:
        assert engine._extract_site_keyword(input_site) == expected


@patch("Engines.website_engine.DBWriter")
@patch("Engines.website_engine.Alerter")
def test_determine_policy(mock_alerter, mock_db_writer):
    config = {"web": {"deny": ["youtube.com"], "allow": ["google.com"]}}
    engine = WebsiteEngine(action_config=config)

    test_cases = [
        ("youtube.com", {"allowed": False, "rule": "web_deny"}),
        ("google.com", {"allowed": True, "rule": "web_allow"}),
        ("unknown.com", {"allowed": True, "rule": "web_unlisted"}),
    ]
    for domain, expected in test_cases:
        result = engine._determine_policy(domain)
        assert result == expected


@patch("Engines.website_engine.DBWriter")
@patch("Engines.website_engine.Alerter")
def test_detect_domain(mock_alerter, mock_db_writer):
    config = {"web": {"deny": ["youtube.com"], "allow": ["google.com"]}}
    engine = WebsiteEngine(action_config=config)

    test_cases = [
        ("YouTube - Watch Videos", "youtube.com"),
        ("Google Search - Chrome", "google.com"),
        ("Notepad", None),
    ]
    for title, expected in test_cases:
        result = engine._detect_domain(title)
        assert result == expected


@patch("Engines.website_engine.DBWriter")
@patch("Engines.website_engine.Alerter")
def test_flush_current_site(mock_alerter, mock_db_writer):
    mock_db_writer_instance = MagicMock()
    mock_db_writer.return_value = mock_db_writer_instance
    config = {"web": {"deny": ["youtube.com"], "allow": ["google.com"]}}

    engine = WebsiteEngine(action_config=config)
    test_cases = [
        {
            "current_domain": "youtube.com",
            "current_window_title": "YouTube - Funny Videos",
            "current_site_ts_open": datetime.datetime(2024, 1, 1, 12, 0, 0),
            "current_site_policy": {"allowed": False, "rule": "web_deny"},
            "expected_action_taken": "notified",
            "expected_notification_sent": True,
        },
        {
            "current_domain": "google.com",
            "current_window_title": "Google Search - Chrome",
            "current_site_ts_open": datetime.datetime(2024, 1, 1, 13, 0, 0),
            "current_site_policy": {"allowed": True, "rule": "web_allow"},
            "expected_action_taken": "ignored",
            "expected_notification_sent": False,
        },
    ]

    for case in test_cases:
        engine.current_domain = case["current_domain"]
        engine.current_window_title = case["current_window_title"]
        engine.current_site_ts_open = case["current_site_ts_open"]
        engine.current_site_policy = case["current_site_policy"]

        engine._flush_current_site()

        mock_db_writer_instance.write_entry.assert_called_once()
        args, kwargs = mock_db_writer_instance.write_entry.call_args
        assert kwargs["collection"] == engine.service_name
        data = kwargs["data"]
        assert data["session_id"] == str(engine.session_id)
        assert data["ts_open"] == case["current_site_ts_open"]
        assert data["ts_close"] > case["current_site_ts_open"]
        assert data["domain"] == case["current_domain"]
        assert data["window_title"] == case["current_window_title"]
        assert data["policy"] == case["current_site_policy"]
        assert data["action_taken"] == case["expected_action_taken"]
        if case["expected_notification_sent"]:
            assert data["notification"]["sent"] is True
            assert data["notification"]["ts"] is not None
        else:
            assert data["notification"]["sent"] is False
            assert data["notification"]["ts"] is None

        mock_db_writer_instance.write_entry.reset_mock()


@patch("Engines.website_engine.DBWriter")
@patch("Engines.website_engine.Alerter")
def test_flush_no_current_site(mock_alerter, mock_db_writer):
    mock_db_writer_instance = MagicMock()
    mock_db_writer.return_value = mock_db_writer_instance
    config = {"web": {"deny": [], "allow": []}}

    engine = WebsiteEngine(action_config=config)
    engine._flush_current_site()

    mock_db_writer_instance.write_entry.assert_not_called()


@patch("Engines.website_engine.DBWriter")
@patch("Engines.website_engine.Alerter")
def test_flush_resets_state(mock_alerter, mock_db_writer):
    config = {"web": {"deny": [], "allow": []}}
    engine = WebsiteEngine(action_config=config)

    engine.current_domain = "youtube.com"
    engine.current_window_title = "YouTube"
    engine.current_site_ts_open = datetime.datetime(2024, 1, 1, 12, 0, 0)
    engine.current_site_policy = {"allowed": False, "rule": "web_deny"}

    engine._flush_current_site()

    assert engine.current_domain is None
    assert engine.current_window_title is None
    assert engine.current_site_ts_open is None
    assert engine.current_site_policy is None


@patch("Engines.website_engine.DBWriter")
@patch("Engines.website_engine.Alerter")
def test_start_detection_already_running(mock_alerter, mock_db_writer):
    config = {"web": {"deny": [], "allow": []}}
    engine = WebsiteEngine(action_config=config)
    engine.is_running = True

    result = engine.start_detection()
    assert result is False


@patch("Engines.website_engine.DBWriter")
@patch("Engines.website_engine.Alerter")
def test_stop_detection_not_running(mock_alerter, mock_db_writer):
    config = {"web": {"deny": [], "allow": []}}
    engine = WebsiteEngine(action_config=config)

    result = engine.stop_detection()
    assert result is False
