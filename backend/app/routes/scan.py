# -*- coding: utf-8 -*-
from flask import Blueprint, request, jsonify
from ..utils.decorators import require_auth
from ..utils.link_analyzer import analyze_link_simple, analyze_website_detailed
from ..utils.message_analyzer import analyze_message_text, analyze_message_image
from ..mongo_client import get_db
from datetime import datetime, timezone
from bson import ObjectId

scan_blueprint = Blueprint('scan', __name__)

def save_scan(user_id, scan_type, url, result):
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


@scan_blueprint.route('/message', methods=['POST'])
@require_auth
def scan_message(current_user):
    """Text message scan."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "message": "Request body required."}), 400
        message_text = data.get('message', '').strip()
        if not message_text:
            return jsonify({"success": False, "message": "Message text is required."}), 400
        result = analyze_message_text(message_text)
        if result.get("success"):
            save_scan(current_user["_id"], "message", message_text[:100], result)
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@scan_blueprint.route('/message/image', methods=['POST'])
@require_auth
def scan_message_image(current_user):
    """Message screenshot scan (OCR)."""
    try:
        if 'image' not in request.files:
            return jsonify({"success": False, "message": "Image file required."}), 400
        image_file = request.files['image']
        result = analyze_message_image(image_file)
        if result.get("success"):
            save_scan(current_user["_id"], "message_image", "screenshot_scan", result)
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@scan_blueprint.route('/email', methods=['POST'])
@require_auth
def scan_email(current_user):
    """Email file (.eml/.msg) scan."""
    try:
        if 'file' not in request.files:
            return jsonify({"success": False, "message": "Email file required."}), 400
        email_file = request.files['file']
        filename = email_file.filename or ''
        if not (filename.endswith('.eml') or filename.endswith('.msg')):
            return jsonify({"success": False, "message": "Only .eml or .msg files allowed."}), 400

        try:
            from ..utils.email_analyzer import analyze_email_file
            result = analyze_email_file(email_file)
        except ImportError:
            result = _basic_email_scan(email_file, filename)

        if result.get("success"):
            save_scan(current_user["_id"], "email", filename, result)
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


def _basic_email_scan(email_file, filename):
    try:
        import email as email_lib
        raw = email_file.read().decode('utf-8', errors='ignore')
        msg = email_lib.message_from_string(raw)

        subject = msg.get('Subject', 'Unknown')
        sender = msg.get('From', 'Unknown')
        reply_to = msg.get('Reply-To', '')

        flags = []
        score = 0

        if reply_to and reply_to != sender:
            flags.append(f"Reply-To mismatch: sender is {sender} but reply goes to {reply_to}")
            score += 30

        body = ''
        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == 'text/plain':
                    payload = part.get_payload(decode=True)
                    if payload:
                        body += payload.decode('utf-8', errors='ignore')
        else:
            payload = msg.get_payload(decode=True)
            body = payload.decode('utf-8', errors='ignore') if payload else ''

        if body.strip():
            msg_result = analyze_message_text(body)
            score += msg_result.get("risk_score", 0) // 2
            flags.extend(msg_result.get("flags", []))

        score = min(score, 100)

        if score >= 75:
            verdict, risk_level = "Dangerous ❌", "CRITICAL"
        elif score >= 50:
            verdict, risk_level = "Suspicious ⚠️", "HIGH"
        elif score >= 25:
            verdict, risk_level = "Moderate Risk 🟡", "MEDIUM"
        else:
            verdict, risk_level = "Looks Safe ✅", "LOW"

        return {
            "success": True,
            "scan_type": "email",
            "verdict": verdict,
            "risk_score": score,
            "risk_level": risk_level,
            "aam_bhasha": f"Email analyzed from {sender}.",
            "flags": flags,
            "passed_checks": [],
            "score_breakdown": {"email_analysis": score},
            "email_meta": {
                "subject": subject,
                "sender": sender,
                "reply_to": reply_to,
            }
        }
    except Exception as e:
        return {"success": False, "message": f"Email parsing failed: {str(e)}"}


@scan_blueprint.route('/history', methods=['GET'])
@require_auth
def scan_history(current_user):
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