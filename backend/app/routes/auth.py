# app/routes/auth.py

from flask import Blueprint, request, jsonify
from ..models import User
from ..utils.decorators import require_auth
import jwt
import datetime
import os
import hashlib
import secrets

auth_blueprint = Blueprint('auth', __name__)

def sign_token(user_id, is_admin=False):
    """Helper function to generate a JWT token."""
    payload = {
        'id': str(user_id), # MongoDB ObjectId ko string me convert karein
        'isAdmin': is_admin,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }
    secret_key = os.getenv('JWT_SECRET', 'dev_secret')
    return jwt.encode(payload, secret_key, algorithm="HS256")

# ---------- SIGNUP ----------
@auth_blueprint.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({"success": False, "msg": "Email & password required"}), 400

    if User.find_by_email(data['email']):
        return jsonify({"success": False, "msg": "Email already in use"}), 409

    try:
        new_user = User.create(
            username=data.get('username', data['email'].split('@')[0]),
            email=data['email'],
            password=data['password'],
            name=data.get('name', ''),
            gender=data.get('gender', 'Male'),
            country=data.get('country', '')
        )
        
        token = sign_token(new_user['id'], new_user['isAdmin'])

        return jsonify({
            "success": True,
            "msg": "Signup successful",
            "token": token,
            "user": new_user
        }), 201

    except Exception as e:
        print(f"Signup error: {e}")
        return jsonify({"success": False, "msg": "Server error"}), 500

# ---------- LOGIN ----------
@auth_blueprint.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({"success": False, "msg": "Email & password required"}), 400
    
    try:
        user_doc = User.find_by_email(data['email'])
        
        if not user_doc or not User.check_password(user_doc, data['password']):
            return jsonify({"success": False, "msg": "Invalid credentials"}), 401

        if user_doc.get("blocked"):
            return jsonify({"success": False, "msg": "Your account is blocked."}), 403
            
        token = sign_token(user_doc['_id'], user_doc.get('isAdmin', False))
        
        return jsonify({
            "success": True,
            "msg": "Login successful",
            "token": token,
            "user": User._normalize(user_doc)
        })

    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({"success": False, "msg": "Server error"}), 500

# ---------- GET CURRENT USER ----------
@auth_blueprint.route('/me', methods=['GET'])
@require_auth
def get_current_user(current_user):
    if not current_user:
        return jsonify({"success": False, "msg": "User not found"}), 404
    
    return jsonify({
        "success": True,
        "user": User._normalize(current_user)
    })

# ---------- UPDATE PROFILE ----------
@auth_blueprint.route('/user/<user_id>', methods=['PUT'])
@require_auth
def update_profile(current_user, user_id):
    if str(current_user['_id']) != user_id:
        return jsonify({"success": False, "msg": "Forbidden"}), 403

    data = request.get_json()
    update_fields = {}
    
    if 'name' in data:
        update_fields['name'] = data['name']
    if 'username' in data:
        update_fields['username'] = data['username']
    if 'gender' in data:
        update_fields['gender'] = data['gender']
    if 'country' in data:
        update_fields['country'] = data['country']

    if not update_fields:
        return jsonify({"success": False, "msg": "No update fields provided"}), 400

    updated_user = User.update_by_id(user_id, update_fields)

    return jsonify({
        "success": True,
        "msg": "Profile updated successfully",
        "user": updated_user
    })

# ---------- DELETE ACCOUNT ----------
@auth_blueprint.route('/user/<user_id>', methods=['DELETE'])
@require_auth
def delete_account(current_user, user_id):
    if str(current_user['_id']) != user_id:
        return jsonify({"success": False, "msg": "Forbidden"}), 403
    
    User.delete_by_id(user_id)
    
    return jsonify({"success": True, "msg": "Account deleted successfully"})

# Baki forgot/reset password ka code same rahega, lekin database calls badal jayenge
# ... (Implement if needed, following the MongoDB pattern)