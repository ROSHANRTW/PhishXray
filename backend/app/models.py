# app/models.py

from flask_bcrypt import Bcrypt
from bson.objectid import ObjectId
from datetime import datetime
from .mongo_client import get_db

bcrypt = Bcrypt()

def _users_collection():
    """Returns the users collection from the database."""
    return get_db().users

class User:
    @staticmethod
    def _normalize(doc):
        """Converts MongoDB doc to a JSON-friendly dictionary."""
        if not doc:
            return None
        return {
            "id": str(doc.get("_id")), # 'id' field frontend ke liye
            "_id": str(doc.get("_id")),
            "username": doc.get("username"),
            "name": doc.get("name", ""),
            "email": doc.get("email"),
            "isAdmin": bool(doc.get("isAdmin", False)),
            "role": doc.get("role", "user"),
            "blocked": bool(doc.get("blocked", False)),
            "gender": doc.get("gender", "Male"),
            "country": doc.get("country", ""),
            "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
            "updated_at": doc.get("updated_at").isoformat() if doc.get("updated_at") else None
        }

    @staticmethod
    def create(username, email, password, **kwargs):
        """Creates and inserts a new user."""
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        now = datetime.utcnow()
        user_doc = {
            "username": username,
            "email": email,
            "password": hashed_password,
            "name": kwargs.get('name', ''),
            "gender": kwargs.get('gender', 'Male'),
            "country": kwargs.get('country', ''),
            "isAdmin": bool(kwargs.get('isAdmin', False)),
            "role": kwargs.get('role', 'user'),
            "blocked": False,
            "resetPasswordToken": None,
            "resetPasswordExpires": None,
            "created_at": now,
            "updated_at": now
        }
        result = _users_collection().insert_one(user_doc)
        user_doc["_id"] = result.inserted_id
        return User._normalize(user_doc)

    @staticmethod
    def find_by_email(email):
        """Finds a user by their email."""
        doc = _users_collection().find_one({"email": email})
        return doc # Return raw doc for password check

    @staticmethod
    def find_by_id(user_id):
        """Finds a user by their _id."""
        try:
            oid = ObjectId(user_id)
            doc = _users_collection().find_one({"_id": oid})
            return doc # Return raw doc
        except Exception:
            return None

    @staticmethod
    def list_paginated(page=1, per_page=50):
        """Lists users with pagination."""
        skip = (page - 1) * per_page
        cursor = _users_collection().find().skip(skip).limit(per_page)
        items = [User._normalize(d) for d in cursor]
        total = _users_collection().count_documents({})
        return {"page": page, "per_page": per_page, "total": total, "items": items}

    @staticmethod
    def update_by_id(user_id, update_fields: dict):
        """Updates a user's document."""
        try:
            oid = ObjectId(user_id)
        except Exception:
            return None
        
        # Password hash nahi karna agar plain text me aa raha hai
        if 'password' in update_fields and not update_fields['password'].startswith('$2b$'):
            update_fields['password'] = bcrypt.generate_password_hash(update_fields['password']).decode('utf-8')

        update_fields["updated_at"] = datetime.utcnow()
        _users_collection().update_one({"_id": oid}, {"$set": update_fields})
        updated_doc = User.find_by_id(user_id)
        return User._normalize(updated_doc)

    @staticmethod
    def delete_by_id(user_id):
        """Deletes a user by their _id."""
        try:
            oid = ObjectId(user_id)
            doc = _users_collection().find_one_and_delete({"_id": oid})
            return User._normalize(doc)
        except Exception:
            return None
    
    @staticmethod
    def check_password(user_doc, password):
        """Checks if the provided password matches the hashed password."""
        if not user_doc or 'password' not in user_doc:
            return False
        return bcrypt.check_password_hash(user_doc['password'], password)