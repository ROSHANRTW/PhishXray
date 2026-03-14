# app/mongo_client.py

from flask_pymongo import PyMongo

mongo = PyMongo()

def get_db():
    """Returns the PyMongo database instance."""
    return mongo.db