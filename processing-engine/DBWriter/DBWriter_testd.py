from .DBWriter import DBWriter
def test():
    # testing if instantiation works and writes to mongodb
    db_writer = DBWriter()
    print("DBWriter instantiated successfully.")
    db_writer.write_entry("test_collection", {"test_key": "test_value"})


test()