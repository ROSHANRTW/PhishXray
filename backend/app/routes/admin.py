# app/routes/admin.py

from flask import Blueprint, request, jsonify
from ..models import User
from ..utils.decorators import require_admin
from ..mongo_client import get_db
from datetime import datetime

admin_blueprint = Blueprint('admin', __name__)

@admin_blueprint.route('/', methods=['GET'], strict_slashes=False)
@require_admin
def admin_health_check(current_admin):
    return jsonify({'success': True, 'message': 'Admin endpoint is active'})

@admin_blueprint.route('/users', methods=['GET'])
@require_admin
def get_users(current_admin):
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 50, type=int)
        result = User.list_paginated(page=page, per_page=limit)
        return jsonify({
            'page': result['page'],
            'limit': result['per_page'],
            'total': result['total'],
            'users': result['items']
        })
    except Exception as e:
        return jsonify({'message': 'Failed to fetch users', 'error': str(e)}), 500

@admin_blueprint.route('/users/<user_id>', methods=['GET'])
@require_admin
def get_user(current_admin, user_id):
    try:
        user_doc = User.find_by_id(user_id)
        if not user_doc:
            return jsonify({'message': 'User not found'}), 404
        return jsonify(User._normalize(user_doc))
    except Exception as e:
        return jsonify({'message': 'Failed to fetch user', 'error': str(e)}), 500

@admin_blueprint.route('/users/<user_id>', methods=['PUT'])
@require_admin
def update_user(current_admin, user_id):
    try:
        if not User.find_by_id(user_id):
            return jsonify({'message': 'User not found'}), 404
        data = request.get_json()
        allowed_updates = ['name', 'email', 'blocked', 'role', 'isAdmin', 'username', 'country', 'gender']
        update_fields = {k: v for k, v in data.items() if k in allowed_updates}
        if not update_fields:
            return jsonify({'message': 'No valid fields to update'}), 400
        if 'role' in update_fields:
            update_fields['isAdmin'] = (update_fields['role'] == 'admin')
        elif 'isAdmin' in update_fields:
            update_fields['role'] = 'admin' if update_fields['isAdmin'] else 'user'
        updated_user = User.update_by_id(user_id, update_fields)
        return jsonify({'message': 'User updated', 'user': updated_user})
    except Exception as e:
        return jsonify({'message': 'Failed to update user', 'error': str(e)}), 500

@admin_blueprint.route('/users/<user_id>', methods=['DELETE'])
@require_admin
def delete_user(current_admin, user_id):
    try:
        deleted_user = User.delete_by_id(user_id)
        if not deleted_user:
            return jsonify({'message': 'User not found'}), 404
        return jsonify({'message': 'User deleted', 'user': deleted_user})
    except Exception as e:
        return jsonify({'message': 'Failed to delete user', 'error': str(e)}), 500


# ============================================================
#  SCANS — Admin ke liye scan data
# ============================================================

@admin_blueprint.route('/scans', methods=['GET'])
@require_admin
def get_all_scans(current_admin):
    """Saare users ke scans — Admin ke liye."""
    try:
        db = get_db()
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 50, type=int)
        skip = (page - 1) * limit

        # Filters
        verdict_filter = request.args.get('verdict')  # e.g. "Dangerous"
        scan_type_filter = request.args.get('scan_type')  # e.g. "website"

        query = {}
        if verdict_filter:
            query['verdict'] = {"$regex": verdict_filter, "$options": "i"}
        if scan_type_filter:
            query['scan_type'] = scan_type_filter

        total = db.scans.count_documents(query)
        scans = list(
            db.scans.find(query, {"_id": 0})
            .sort("timestamp", -1)
            .skip(skip)
            .limit(limit)
        )

        # Timestamp format karo
        for scan in scans:
            if isinstance(scan.get('timestamp'), datetime):
                scan['timestamp'] = scan['timestamp'].strftime('%d %b %Y, %I:%M %p')

        return jsonify({
            "success": True,
            "total": total,
            "page": page,
            "limit": limit,
            "scans": scans
        })

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@admin_blueprint.route('/scans/stats', methods=['GET'])
@require_admin
def get_scan_stats(current_admin):
    """Scan statistics — total, dangerous, safe, etc."""
    try:
        db = get_db()
        total = db.scans.count_documents({})
        dangerous = db.scans.count_documents({"risk_level": "CRITICAL"})
        suspicious = db.scans.count_documents({"risk_level": "HIGH"})
        safe = db.scans.count_documents({"risk_level": "LOW"})
        website_scans = db.scans.count_documents({"scan_type": "website"})
        link_scans = db.scans.count_documents({"scan_type": "link"})

        return jsonify({
            "success": True,
            "stats": {
                "total_scans": total,
                "dangerous": dangerous,
                "suspicious": suspicious,
                "safe": safe,
                "website_scans": website_scans,
                "link_scans": link_scans,
            }
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500