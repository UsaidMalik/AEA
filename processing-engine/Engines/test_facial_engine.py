import pytest
from unittest.mock import patch, MagicMock


@patch("Engines.facial_engine.cv2")
@patch("Engines.facial_engine.DBWriter")
@patch("Engines.facial_engine.Alerter")
def test_on_violation_writes_to_db(mock_alerter, mock_db_writer, mock_cv2):
    mock_db_writer_instance = MagicMock()
    mock_db_writer.return_value = mock_db_writer_instance

    from Engines.facial_engine import FacialEngine
    config = {"emotion": {"deny": ["angry"]}, "vision": {}}
    engine = FacialEngine(action_config=config)

    engine.last_greatest_emotion = "angry"
    engine.onViolation()

    mock_db_writer_instance.write_entry.assert_called_once()
    args, kwargs = mock_db_writer_instance.write_entry.call_args
    assert kwargs["collection"] == engine.service_name
    data = kwargs["data"]
    assert data["session_id"] == str(engine.session_id)
    assert data["affect"]["label"] == "angry"
    assert data["affect"]["confidence"] == engine.minimum_emotion_percentage
    assert data["schema_version"] == 1


@patch("Engines.facial_engine.cv2")
@patch("Engines.facial_engine.DBWriter")
@patch("Engines.facial_engine.Alerter")
def test_on_violation_sends_alert(mock_alerter, mock_db_writer, mock_cv2):
    mock_alerter_instance = MagicMock()
    mock_alerter.return_value = mock_alerter_instance

    from Engines.facial_engine import FacialEngine
    config = {"emotion": {"deny": ["sad"]}, "vision": {}}
    engine = FacialEngine(action_config=config)

    engine.last_greatest_emotion = "sad"
    engine.onViolation()

    mock_alerter_instance.alert.assert_called_once_with(
        "Emotion Violation", "Detected: sad"
    )


@patch("Engines.facial_engine.cv2")
@patch("Engines.facial_engine.DBWriter")
@patch("Engines.facial_engine.Alerter")
def test_start_detection_already_running(mock_alerter, mock_db_writer, mock_cv2):
    from Engines.facial_engine import FacialEngine
    config = {"emotion": {"deny": []}, "vision": {}}
    engine = FacialEngine(action_config=config)
    engine.is_running = True

    result = engine.start_detection()
    assert result is False


@patch("Engines.facial_engine.cv2")
@patch("Engines.facial_engine.DBWriter")
@patch("Engines.facial_engine.Alerter")
def test_stop_detection_not_running(mock_alerter, mock_db_writer, mock_cv2):
    from Engines.facial_engine import FacialEngine
    config = {"emotion": {"deny": []}, "vision": {}}
    engine = FacialEngine(action_config=config)

    # Not running by default, should just warn and return
    engine.stop_detection()
    assert engine.is_running is False


@patch("Engines.facial_engine.cv2")
@patch("Engines.facial_engine.DBWriter")
@patch("Engines.facial_engine.Alerter")
def test_is_detection_running(mock_alerter, mock_db_writer, mock_cv2):
    from Engines.facial_engine import FacialEngine
    config = {"emotion": {"deny": []}, "vision": {}}
    engine = FacialEngine(action_config=config)

    assert engine.is_detection_running() is False
    engine.is_running = True
    assert engine.is_detection_running() is True
