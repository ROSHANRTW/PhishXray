# -*- coding: utf-8 -*-
from flask import Blueprint, request, jsonify
from ..utils.decorators import require_auth
from ..utils.link_analyzer import analyze_link_simple, analyze_website_detailed
from ..mongo_client import get_db
from datetime import datetime, timezone
from bson import ObjectId

scan_blueprint = Blueprint('scan', __name__)

def save_scan(user_id, scan_type, url, result):
    """Scan result ko MongoDB mein save karo."""
    try:
        db = get_db()
        scan_data = {
            "user_id": str(user_id),
            "scan_type": scan_type,
            "url": url,
            "verdict": result.get("verdict", "Unknown"),
            "risk_score": result.get("risk_score", 0),
            "risk_level": result.get("risk_level", "UNKNOWN"),
            "flags": result.get("flags", []),
            "score_breakdown": result.get("score_breakdown", {}),
            "timestamp": datetime.now(timezone.utc)
        }
        db.scans.insert_one(scan_data)
    except Exception as e:
        print(f"[PhishXray] Scan save error: {e}")


@scan_blueprint.route('/link', methods=['POST'])
@require_auth
def scan_link(current_user):
    data = request.get_json()
    url_to_scan = data.get('url')
    if not url_to_scan:
        return jsonify({"success": False, "message": "URL is required."}), 400

    result = analyze_link_simple(url_to_scan)

    if result.get("success"):
        save_scan(current_user["_id"], "link", url_to_scan, result)

    return jsonify(result)


@scan_blueprint.route('/website', methods=['POST'])
@require_auth
def scan_website(current_user):
    data = request.get_json()
    url_to_scan = data.get('url')
    if not url_to_scan:
        return jsonify({"success": False, "message": "URL is required."}), 400

    result = analyze_website_detailed(url_to_scan)

    if result.get("success"):
        save_scan(current_user["_id"], "website", url_to_scan, result)

    return jsonify(result)


@scan_blueprint.route('/history', methods=['GET'])
@require_auth
def scan_history(current_user):
    """Current user ki apni scan history fetch karo."""
    try:
        db = get_db()
        user_id = str(current_user["_id"])

        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        skip = (page - 1) * limit

        scans_cursor = db.scans.find(
            {"user_id": user_id}
        ).sort("timestamp", -1).skip(skip).limit(limit)

        scans = []
        for scan in scans_cursor:
            scans.append({
                "id": str(scan["_id"]),
                "scan_type": scan.get("scan_type", "unknown"),
                "url": scan.get("url", ""),
                "verdict": scan.get("verdict", "Unknown"),
                "risk_score": scan.get("risk_score", 0),
                "risk_level": scan.get("risk_level", "UNKNOWN"),
                "flags": scan.get("flags", []),
                "score_breakdown": scan.get("score_breakdown", {}),
                "timestamp": scan["timestamp"].strftime("%d %b %Y, %I:%M %p")
                    if hasattr(scan.get("timestamp"), "strftime")
                    else str(scan.get("timestamp", "")),
            })

        total = db.scans.count_documents({"user_id": user_id})

        return jsonify({
            "success": True,
            "scans": scans,
            "total": total,
            "page": page,
            "limit": limit,
            "has_more": (skip + limit) < total
        })

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500