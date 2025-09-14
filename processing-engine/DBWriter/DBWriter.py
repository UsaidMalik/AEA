import os
import datetime
from pymongo import MongoClient
from dotenv import load_dotenv

class DBWriter:
    def __init__(self):
        # Pull env vars
        load_dotenv()  # Load environment variables from .env file
        db_uri = os.getenv("DATABASE_URI", "mongodb")
        db_name = os.getenv("DATABASE_NAME", "aea_local")

        # Create MongoDB client
        print(db_uri, db_name)
        self.client = MongoClient(host=db_uri)

        # You can choose a default database name here
        self.db = self.client[db_name]

    def write_entry(self, collection, data):
        """
        Writes a document to the specified collection.
        :param collection: str - name of the MongoDB collection
        :param data: dict - the document to insert
        """
        # Optionally add a timestamp if not present
        if "ts" not in data:
            data["ts"] = datetime.datetime.utcnow()

        result = self.db[collection].insert_one(data)
        return result.inserted_id
