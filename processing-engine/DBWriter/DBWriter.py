import os
import datetime
from pymongo import MongoClient
from dotenv import load_dotenv

class DBWriter:
    def __init__(self):
        # Pull env vars
        load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '.env'))
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

    def find_one(self, collection, query):
        """
        Find a single document matching the query.
        :param collection: str - name of the MongoDB collection
        :param query: dict - MongoDB query filter
        :return: dict or None
        """
        return self.db[collection].find_one(query)

    def find_entries(self, collection, query):
        """
        Find all documents matching the query.
        :param collection: str - name of the MongoDB collection
        :param query: dict - MongoDB query filter
        :return: list of matching documents
        """
        return list(self.db[collection].find(query))

    def update_entry(self, collection, query, update):
        """
        Update a single document in the specified collection.
        :param collection: str - name of the MongoDB collection
        :param query: dict - MongoDB query filter
        :param update: dict - MongoDB update operations (e.g., {"$set": {...}})
        :return: UpdateResult
        """
        return self.db[collection].update_one(query, update)

    def count_entries(self, collection, query):
        """
        Count documents matching the query.
        :param collection: str - name of the MongoDB collection
        :param query: dict - MongoDB query filter
        :return: int
        """
        return self.db[collection].count_documents(query)
