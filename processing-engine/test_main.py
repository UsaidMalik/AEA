import pytest
from unittest.mock import patch, MagicMock
import datetime
from main import SessionManager

@patch("main.FacialEngine")
@patch("main.WebsiteEngine")
@patch("main.AppEngine")
@patch("main.DBWriter")
@patch("main.Alerter")
def test_start_session(mock_alerter, mock_db_writer, mock_app_engine, mock_website_engine, mock_facial_engine):
    #Verify if a session already is running should return an error
    session_manager = SessionManager()
    session_manager.running = True
    result = session_manager.start_session("test_config")
    assert "error" in result
    assert result["error"] == "A session is already running."

@patch("main.FacialEngine")
@patch("main.WebsiteEngine")
@patch("main.AppEngine")
@patch("main.DBWriter")
@patch("main.Alerter")
def test_start_session_config_not_found(mock_alerter, mock_db_writer, mock_app_engine, mock_website_engine, mock_facial_engine):
    #Verify if config is not found should return an error
    mock_db_writer_instance = MagicMock()
    mock_db_writer.return_value = mock_db_writer_instance
    mock_db_writer_instance.find_one.return_value = None  # Simulate config not found
    session_manager = SessionManager()
    result = session_manager.start_session("non_existent_config")
    assert "error" in result
    assert result["error"] == "Config 'non_existent_config' not found."




@patch("main.FacialEngine")
@patch("main.WebsiteEngine")
@patch("main.AppEngine")
@patch("main.DBWriter")
@patch("main.Alerter")
def test_start_session_success(mock_alerter, mock_db_writer, mock_app_engine, mock_website_engine, mock_facial_engine):
    mock_db_writer_instance = MagicMock()
    mock_db_writer.return_value = mock_db_writer_instance
    mock_db_writer_instance.find_one.return_value = {
        "name": "test_config",
        "json": {
            "apps": {
                "deny": ["discord"],
                "allow": ["chrome"]
             },
             "websites": {
                "deny": ["facebook.com"],
                "allow": ["wikipedia.org"]
             },
        }
    }  # Simulate config found
    session_manager = SessionManager()
    result = session_manager.start_session("test_config")

    #Should return Session Id and config name
    assert "session_id" in result
    assert result["config_name"] == "test_config"

    # Session doc should be written to DB
    mock_db_writer_instance.write_entry.assert_called_once()

    # All 3 engines should be created and started
    mock_facial_engine.return_value.start_detection.assert_called_once()
    mock_website_engine.return_value.start_detection.assert_called_once()
    mock_app_engine.return_value.start_detection.assert_called_once()


# ---- stop_session tests ----

@patch("main.FacialEngine")
@patch("main.WebsiteEngine")
@patch("main.AppEngine")
@patch("main.DBWriter")
@patch("main.Alerter")
def test_stop_session_not_running(mock_alerter, mock_db_writer, mock_app_engine, mock_website_engine, mock_facial_engine):
    session_manager = SessionManager()
    result = session_manager.stop_session()
    assert "error" in result
    assert result["error"] == "No session is currently running."


@patch("main.FacialEngine")
@patch("main.WebsiteEngine")
@patch("main.AppEngine")
@patch("main.DBWriter")
@patch("main.Alerter")
def test_stop_session_success(mock_alerter, mock_db_writer, mock_app_engine, mock_website_engine, mock_facial_engine):
    mock_db_writer_instance = MagicMock()
    mock_db_writer.return_value = mock_db_writer_instance
    mock_db_writer_instance.find_one.return_value = {
        "name": "test_config",
        "json": {
            "apps": {"deny": ["discord"], "allow": ["chrome"]},
            "web": {"deny": ["facebook.com"], "allow": ["wikipedia.org"]},
        }
    }
    mock_db_writer_instance.count_entries.return_value = 0  # For stats computation
    # First start a session
    session_manager = SessionManager()
    session_manager.start_session("test_config")

    # Now stop it
    result = session_manager.stop_session()

    # Should return stats and ended_at
    assert "stats" in result
    assert "ended_at" in result

    # State should be reset
    assert session_manager.running is False
    assert session_manager.session_id is None
    assert session_manager.config is None

    # All 3 engines should have stop_detection called
    mock_facial_engine.return_value.stop_detection.assert_called_once()
    mock_website_engine.return_value.stop_detection.assert_called_once()
    mock_app_engine.return_value.stop_detection.assert_called_once()

    # finalize_session should have updated the DB
    mock_db_writer_instance.update_entry.assert_called_once()


# ---- status tests ----

@patch("main.FacialEngine")
@patch("main.WebsiteEngine")
@patch("main.AppEngine")
@patch("main.DBWriter")
@patch("main.Alerter")
def test_status_not_running(mock_alerter, mock_db_writer, mock_app_engine, mock_website_engine, mock_facial_engine):
    session_manager = SessionManager()
    result = session_manager.status()

    assert result["running"] is False
    assert result["session_id"] is None
    assert result["config_name"] is None
    assert result["started_at"] is None


@patch("main.FacialEngine")
@patch("main.WebsiteEngine")
@patch("main.AppEngine")
@patch("main.DBWriter")
@patch("main.Alerter")
def test_status_running(mock_alerter, mock_db_writer, mock_app_engine, mock_website_engine, mock_facial_engine):
    mock_db_writer_instance = MagicMock()
    mock_db_writer.return_value = mock_db_writer_instance
    mock_db_writer_instance.find_one.return_value = {
        "name": "study_config",
        "json": {
            "apps": {"deny": [], "allow": []},
            "web": {"deny": [], "allow": []},
        }
    }

    session_manager = SessionManager()
    session_manager.start_session("study_config")
    result = session_manager.status()

    assert result["running"] is True
    assert result["session_id"] is not None
    assert result["config_name"] == "study_config"
    assert result["started_at"] is not None


# ---- compute_session_stats tests ----

@patch("main.FacialEngine")
@patch("main.WebsiteEngine")
@patch("main.AppEngine")
@patch("main.DBWriter")
@patch("main.Alerter")
def test_compute_session_stats(mock_alerter, mock_db_writer, mock_app_engine, mock_website_engine, mock_facial_engine):
    mock_db_writer_instance = MagicMock()
    mock_db_writer.return_value = mock_db_writer_instance

    session_manager = SessionManager()
    session_manager.session_id = "test-session-123"
    session_manager.started_at = datetime.datetime(2024, 1, 1, 12, 0, 0)

    # Simulate: 3 web violations, 2 app violations, 5 camera events, 1 missing
    mock_db_writer_instance.count_entries.side_effect = [3, 2, 5, 1]

    ended_at = datetime.datetime(2024, 1, 1, 13, 0, 0)  # 1 hour = 3600 seconds
    stats = session_manager.compute_session_stats(ended_at)

    # away_secs = 1 missing * 10 = 10
    # focus_pct = 1.0 - (10 / 3600) = 0.997... → rounded to 1.0
    assert stats["away_secs"] == 10
    assert stats["violations"]["web"] == 3
    assert stats["violations"]["app"] == 2
    assert stats["violations"]["affect"] == 5
    assert 0.0 <= stats["focus_pct"] <= 1.0


@patch("main.FacialEngine")
@patch("main.WebsiteEngine")
@patch("main.AppEngine")
@patch("main.DBWriter")
@patch("main.Alerter")
def test_compute_session_stats_zero_duration(mock_alerter, mock_db_writer, mock_app_engine, mock_website_engine, mock_facial_engine):
    mock_db_writer_instance = MagicMock()
    mock_db_writer.return_value = mock_db_writer_instance

    session_manager = SessionManager()
    session_manager.session_id = "test-session-456"

    # started_at == ended_at → 0 seconds, should not crash
    now = datetime.datetime(2024, 1, 1, 12, 0, 0)
    session_manager.started_at = now

    mock_db_writer_instance.count_entries.side_effect = [0, 0, 0, 0]

    stats = session_manager.compute_session_stats(now)

    # Zero duration → focus_pct defaults to 1.0
    assert stats["focus_pct"] == 1.0
    assert stats["away_secs"] == 0