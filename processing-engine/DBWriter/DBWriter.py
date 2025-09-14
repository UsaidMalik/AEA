import os
import datetime
from pymongo import MongoClient


class DBWriter:
    def __init__(self):
        # Pull env vars
        db_uri = os.getenv("DATABASE_URI", "mongodb")
        db_port = int(os.getenv("DATABASE_PORT", 27017))
        db_name = os.getenv("DATABASE_NAME", "aea_local")

        # Create MongoDB client
        self.client = MongoClient(host=db_uri, port=db_port)

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
