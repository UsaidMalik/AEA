import pytest
from DBWriter.DBWriter import DBWriter
from unittest.mock import patch, MagicMock



@patch("DBWriter.DBWriter.MongoClient")
@patch("DBWriter.DBWriter.load_dotenv")

def test_db_writer_write_entry(mock_load_dotenv, mock_mongo_client):
    # Mock the MongoDB client and database
    mock_db = MagicMock()
    mock_mongo_client.return_value = mock_db
    mock_db.__getitem__ = MagicMock(return_value=mock_db)

    #Create an instance of DBWriter
    writer = DBWriter()

    mock_collection = MagicMock()
    mock_collection.insert_one.return_value.inserted_id = "mock_id"
    mock_db.__getitem__.return_value = mock_collection


    # test data
    data = {
        "session_id": "test_session"
    }
    result = writer.write_entry(collection="test_collection", data=data)

    #Assert that the correct collection was accessed and data was inserted
    assert "ts" in data 
    mock_collection.insert_one.assert_called_once_with(data)
    assert result == "mock_id"



@patch("DBWriter.DBWriter.MongoClient")
@patch("DBWriter.DBWriter.load_dotenv")
def test_db_write_entry_preserve_existing_ts(mock_load_dotenv, mock_mongo_client):
    # Mock the MongoDB client and database
    mock_db = MagicMock()
    mock_mongo_client.return_value = mock_db
    mock_db.__getitem__ = MagicMock(return_value=mock_db)

    #Create an instance of DBWriter
    writer = DBWriter()

    mock_collection = MagicMock()
    mock_collection.insert_one.return_value.inserted_id = "mock_id"
    mock_db.__getitem__.return_value = mock_collection

    # test data with existing ts field
    data = {
        "session_id": "test_session",
        "ts": "2024-01-01T00:00:00Z"
    }
    result = writer.write_entry(collection="test_collection", data=data)

    #Assert that the correct collection was accessed and data was inserted
    assert "ts" in data 
    assert data["ts"] == "2024-01-01T00:00:00Z"
    mock_collection.insert_one.assert_called_once_with(data)
    assert result == "mock_id"