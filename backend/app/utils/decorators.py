# app/utils/decorators.py

from functools import wraps
from flask import request, jsonify
import jwt
import os
from ..models import User

def _get_user_from_token():
    """Internal helper to get user from token, returns (user, error_response)."""
    token = None
    if 'Authorization' in request.headers:
        try:
            token = request.headers['Authorization'].split(" ")[1]
        except IndexError:
            return None, (jsonify({"success": False, "msg": "Malformed Authorization header"}), 401)

    if not token:
        return None, (jsonify({"success": False, "msg": "Authentication token is missing"}), 401)

    try:
        secret_key = os.getenv('JWT_SECRET', 'dev_secret')
        data = jwt.decode(token, secret_key, algorithms=["HS256"])
        
        # --- YAHAN BADLAV KIYA GAYA HAI ---
        user_doc = User.find_by_id(data['id'])
        if not user_doc:
            return None, (jsonify({"success": False, "msg": "User not found"}), 401)
        
        if user_doc.get("blocked"):
            return None, (jsonify({"success": False, "msg": "Your account is blocked."}), 403)
            
        # Pass the user document to the decorated function
        return user_doc, None

    except jwt.ExpiredSignatureError:
        return None, (jsonify({"success": False, "msg": "Token has expired"}), 401)
    except jwt.InvalidTokenError:
        return None, (jsonify({"success": False, "msg": "Invalid token"}), 401)
    except Exception as e:
        return None, (jsonify({"success": False, "msg": "An error occurred", "error": str(e)}), 500)

def require_auth(f):
    """Decorator to protect routes that require a valid JWT token."""
    @wraps(f)
    def decorated(*args, **kwargs):
        current_user_doc, error = _get_user_from_token()
        if error:
            return error
        # Pass the user document as 'current_user'
        return f(current_user_doc, *args, **kwargs)
    return decorated

def require_admin(f):
    """Decorator to ensure user is an admin."""
    @wraps(f)
    def decorated(*args, **kwargs):
        current_user_doc, error = _get_user_from_token()
        if error:
            return error
        
        # Check if the user has admin privileges
        if not current_user_doc.get("isAdmin"):
            return jsonify({"success": False, "msg": "Admin access required"}), 403
            
        return f(current_user_doc, *args, **kwargs)
    return decorated