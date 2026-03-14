
import re
import io
import joblib
import os
from .link_analyzer import analyze_link_simple

# --- AI MODEL LOADING ---
# Maan lete hain ki files 'app/models/' ya root folder mein hain
MODEL_PATH = 'phish_model.pkl'
VECTORIZER_PATH = 'vectorizer.pkl'

ai_model = None
vectorizer = None

if os.path.exists(MODEL_PATH) and os.path.exists(VECTORIZER_PATH):
    ai_model = joblib.load(MODEL_PATH)
    vectorizer = joblib.load(VECTORIZER_PATH)
    print("AI Model Loaded Successfully in Analyzer!")

# ============================================================
#  PATTERNS — Behavioral, not just keywords
# ============================================================

# URL extraction
MESSAGE_URL_PATTERN = re.compile(
    r"(?i)\b((?:https?://|www\.)[^\s<>'\"()]+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:/[^\s<>'\"]*)?)"
)

# Phone number pattern (Indian + generic)
PHONE_PATTERN = re.compile(
    r"(?<!\d)(\+?91[\s\-]?)?[6-9]\d{9}(?!\d)"
)

# Urgency — time pressure, threats
URGENCY_PATTERNS = [
    r'\b(immediately|urgent|urgently|expire[sd]?|expiring|last.?chance|act.?now|right.?now)\b',
    r'\b(24.?hour|48.?hour|within.?\d+|deadline|limited.?time)\b',
    r'\b(suspended|blocked|closed|terminated|deactivated|disabled)\b',
    r'\b(legal.?action|police|arrested|penalty|fine|court|sued)\b',
]

# Reward / Bait — too good to be true
REWARD_PATTERNS = [
    r'\b(won|winner|winning|you.?have.?won|selected|chosen|lucky)\b',
    r'\b(congratulations|congrats|prize|reward|gift|bonus|cashback|refund)\b',
    r'\b(free|₹\s*\d+|rs\.?\s*\d+|\d+\s*rupees|\d+\s*lakh|\d+\s*crore)\b',
    r'\b(lottery|jackpot|lucky.?draw|bumper.?prize)\b',
]

# Action demand — asking user to do something
ACTION_PATTERNS = [
    r'\b(click|tap|open|visit|go.?to|follow.?the.?link)\b',
    r'\b(call|contact|whatsapp|message|text)\s+\d',
    r'\b(share|send|provide|enter|submit|fill|upload)\b',
    r'\b(verify|confirm|update|reactivate|activate|validate)\b',
    r'\b(otp|pin|password|cvv|card.?number|account.?number|aadhaar|pan)\b',
]

# Impersonation — claiming to be someone official
IMPERSONATION_PATTERNS = [
    r'\b(sbi|hdfc|icici|axis|kotak|pnb|bank.?of.?india|canara)\b',
    r'\b(amazon|flipkart|myntra|snapdeal|meesho|swiggy|zomato|ola|uber)\b',
    r'\b(jio|airtel|vi|vodafone|bsnl|trai)\b',
    r'\b(income.?tax|gst|uidai|aadhaar|pan|passport|rbi|sebi|irda)\b',
    r'\b(government|govt|ministry|official|authorized|verified)\b',
    r'\b(dear.?customer|dear.?user|dear.?sir|dear.?ma\'?am|valued.?customer)\b',
]


# ============================================================
#  HELPERS
# ============================================================

def _extract_urls(text):
    raw = [m.group(1) for m in MESSAGE_URL_PATTERN.finditer(text or "")]
    cleaned, seen = [], set()
    for url in raw:
        u = url.strip().rstrip(".,;:!?)]}")
        if u and u not in seen:
            cleaned.append(u)
            seen.add(u)
    return cleaned

def _count_pattern_matches(text, patterns):
    count = 0
    matched = []
    text_lower = text.lower()
    for pattern in patterns:
        found = re.findall(pattern, text_lower)
        if found:
            count += len(found)
            matched.extend([f.strip() for f in found if isinstance(f, str) and f.strip()])
    return count, matched

def _has_phone_number(text):
    return bool(PHONE_PATTERN.search(text))

def _calculate_verdict(score):
    if score >= 65: return "Dangerous ❌", "CRITICAL"
    if score >= 40: return "Suspicious ⚠️", "HIGH"
    if score >= 25: return "Moderate Risk 🟡", "MEDIUM"
    return "Looks Safe ✅", "LOW"

def _generate_response(risk_level, behaviors, dangerous_urls, phone_found):
    """Professional English response for both tech and non-tech users."""

    behavior_str = ", ".join(behaviors[:3]) if behaviors else "none"

    if risk_level == "CRITICAL":
        if dangerous_urls:
            return (
                f"This message is highly dangerous. It contains a confirmed malicious link "
                f"and exhibits {len(behaviors)} deceptive behavior(s) including {behavior_str}. "
                f"Do not click any links or share any personal information."
            )
        if phone_found:
            return (
                f"This message is a scam. It uses {behavior_str} tactics to pressure you "
                f"into calling an unknown number. Legitimate organizations never ask you to "
                f"call back via SMS for sensitive matters. Do not call this number."
            )
        return (
            f"This message exhibits multiple high-risk behaviors: {behavior_str}. "
            f"It appears designed to deceive or defraud. Do not respond or take any action."
        )
    elif risk_level == "HIGH":
        return (
            f"This message shows suspicious patterns including {behavior_str}. "
            f"Be very cautious — do not share personal details, click links, or call numbers "
            f"mentioned in this message without verifying through official channels."
        )
    elif risk_level == "MEDIUM":
        return (
            f"This message has some characteristics that warrant caution: {behavior_str}. "
            f"Verify the sender's identity before taking any action or sharing information."
        )
    return (
        "This message appears to be safe. No significant threat indicators were detected. "
        "However, always stay alert — if something feels off, trust your instincts."
    )


# ============================================================
#  MAIN: Analyze Text Message
# ============================================================

def analyze_message_text(message_text):
    if not message_text or not str(message_text).strip():
        return {"success": False, "message": "Message text is required."}

    text = str(message_text).strip()
    
    # --- STEP A: AI PREDICTION ---
    ai_score = 0
    ai_verdict = "Neutral"
    
    if ai_model and vectorizer:
        vectorized_text = vectorizer.transform([text])
        prediction = ai_model.predict(vectorized_text)[0]  # 1 for Spam, 0 for Ham
        # Hum AI ko 40 points dete hain agar wo spam bole
        if prediction == 1:
            ai_score = 45 
            ai_verdict = "Spam Detected by AI"
        else:
            ai_verdict = "Safe by AI"

    flags = []
    passed_checks = []
    behaviors_detected = []
    score_breakdown = {
        "urgency": 0,
        "reward_bait": 0,
        "action_demand": 0,
        "impersonation": 0,
        "phone_risk": 0,
        "url_risk": 0,
    }

    # --- URGENCY CHECK ---
    urgency_count, urgency_matches = _count_pattern_matches(text, URGENCY_PATTERNS)
    if urgency_count > 0:
        pts = min(urgency_count * 15, 35)
        score_breakdown["urgency"] = pts
        behaviors_detected.append("urgency/threat")
        flags.append(f"Urgency or threat language detected — creates artificial pressure to act fast.")
    else:
        passed_checks.append("No urgency or threat language detected.")

    # --- REWARD / BAIT CHECK ---
    reward_count, reward_matches = _count_pattern_matches(text, REWARD_PATTERNS)
    if reward_count > 0:
        pts = min(reward_count * 15, 35)
        score_breakdown["reward_bait"] = pts
        behaviors_detected.append("reward/bait")
        flags.append(f"Reward or bait language detected — classic 'too good to be true' tactic.")
    else:
        passed_checks.append("No reward or bait language detected.")

    # --- ACTION DEMAND CHECK ---
    action_count, action_matches = _count_pattern_matches(text, ACTION_PATTERNS)
    if action_count > 0:
        pts = min(action_count * 15, 30)
        score_breakdown["action_demand"] = pts
        behaviors_detected.append("action demand")
        flags.append(f"Message demands sensitive action — asking to click, call, share, or provide information.")
    else:
        passed_checks.append("No suspicious action demands detected.")

    # --- IMPERSONATION CHECK ---
    imp_count, imp_matches = _count_pattern_matches(text, IMPERSONATION_PATTERNS)
    if imp_count > 0:
        pts = min(imp_count * 10, 20)
        score_breakdown["impersonation"] = pts
        behaviors_detected.append("impersonation")
        flags.append(f"Message appears to impersonate a known brand, bank, or government authority.")
    else:
        passed_checks.append("No impersonation patterns detected.")

    # --- PHONE NUMBER CHECK ---
    phone_found = _has_phone_number(text)
    if phone_found:
        # Phone number alone is not suspicious — but combined with other behaviors it is
        combined_score = score_breakdown["urgency"] + score_breakdown["reward_bait"] + score_breakdown["action_demand"]
        if combined_score >= 20:
            score_breakdown["phone_risk"] = 20
            behaviors_detected.append("suspicious phone number")
            flags.append("An unknown phone number is present alongside suspicious content — possible callback scam.")
        else:
            passed_checks.append("Phone number present but no suspicious context around it.")
    else:
        passed_checks.append("No suspicious phone number pattern detected.")

    # --- URL CHECK ---
    urls = _extract_urls(text)
    dangerous_urls = []
    url_results = []

    if urls:
        passed_checks.append(f"{len(urls)} URL(s) found and analyzed.")
        for url in urls:
            link_result = analyze_link_simple(url)
            link_verdict = (link_result.get("verdict") or "").lower()

            if not link_result.get("success"):
                score_breakdown["url_risk"] += 10
                flags.append(f"URL could not be validated: {url}")
            elif "phishing" in link_verdict or "dangerous" in link_verdict:
                score_breakdown["url_risk"] += 40
                dangerous_urls.append(url)
                behaviors_detected.append("malicious URL")
                flags.append(f"Malicious URL detected: {url}")
            else:
                passed_checks.append(f"URL appears safe: {url}")

            url_results.append({"url": url, "result": link_result})
        score_breakdown["url_risk"] = min(score_breakdown["url_risk"], 60)
    else:
        passed_checks.append("No URLs found in message.")

    # --- FINAL SCORE ---
    # --- STEP C: MERGING (Hybrid Logic) ---
    score_breakdown["ai_analysis"] = ai_score  # AI ka score add karo

    total_score = min(sum(score_breakdown.values()), 100)
    # Verdict logic (Thoda tweak kar sakte ho)
    verdict, risk_level = _calculate_verdict(total_score)

    # AI ki baat bhi flags mein daal do
    if ai_score > 0:
        flags.append(f"AI Model Analysis: This message patterns strongly match known phishing attacks.")

    smart_response = _generate_response(risk_level, behaviors_detected, dangerous_urls, phone_found)

    return {
        "success": True,
        "scan_type": "message",
        "verdict": verdict,
        "risk_score": total_score,
        "risk_level": risk_level,
        "aam_bhasha": smart_response,
        "behaviors_detected": behaviors_detected,
        "flags": flags,
        "passed_checks": passed_checks,
        "score_breakdown": score_breakdown,
        "extracted_urls": urls,
        "url_results": url_results,
    }


# ============================================================
#  MAIN: Analyze Message Screenshot (OCR)
# ============================================================

def analyze_message_image(image_file):
    try:
        try:
            from PIL import Image
            import pytesseract
            pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
        except ImportError:
            return {
                "success": False,
                "message": "Install required: pip install pytesseract pillow"
            }

        image = Image.open(io.BytesIO(image_file.read())).convert('L')
        extracted_text = pytesseract.image_to_string(image, lang='eng')

        if not extracted_text.strip():
            return {
                "success": False,
                "message": "No text could be extracted from the image. Try a clearer screenshot."
            }

        result = analyze_message_text(extracted_text)
        result["extracted_text"] = extracted_text.strip()
        result["scan_type"] = "message_image"
        return result

    except Exception as e:
        return {"success": False, "message": f"Image processing failed: {str(e)}"}
# -- NEW: Email File Analysis (.eml / .msg) -----------------------------------

import email
from email import policy


def _extract_body_from_email_message(msg):
    """Extract readable text from a parsed email.message.EmailMessage."""
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == 'text/plain':
                try:
                    payload = part.get_payload(decode=True)
                    return payload.decode(part.get_content_charset() or 'utf-8', errors='ignore')
                except Exception:
                    continue
        # fall back to first text/html if plain isn't available
        for part in msg.walk():
            if part.get_content_type() == 'text/html':
                try:
                    payload = part.get_payload(decode=True)
                    return payload.decode(part.get_content_charset() or 'utf-8', errors='ignore')
                except Exception:
                    continue
        return ''

    try:
        payload = msg.get_payload(decode=True)
        return payload.decode(msg.get_content_charset() or 'utf-8', errors='ignore')
    except Exception:
        return ''


def analyze_eml(eml_file):
    try:
        raw = eml_file.read()
        if isinstance(raw, str):
            raw = raw.encode('utf-8', errors='ignore')

        msg = email.message_from_bytes(raw, policy=policy.default)
        body = _extract_body_from_email_message(msg)
        if not body or not body.strip():
            return {"success": False, "message": "Could not extract any text from the EML file."}

        result = analyze_message_text(body)
        result["scan_type"] = "email"
        result["email_subject"] = msg.get('subject', '')
        return result
    except Exception as e:
        return {"success": False, "message": f"Failed to parse EML: {str(e)}"}


def analyze_msg(msg_file):
    try:
        try:
            import extract_msg
        except ImportError:
            return {"success": False, "message": "Install required: pip install extract_msg"}

        raw = msg_file.read()
        msg = extract_msg.Message(io.BytesIO(raw))
        body = msg.body or ''
        if not body.strip():
            return {"success": False, "message": "Could not extract any text from the MSG file."}

        result = analyze_message_text(body)
        result["scan_type"] = "email"
        result["email_subject"] = getattr(msg, 'subject', '') or ''
        return result
    except Exception as e:
        return {"success": False, "message": f"Failed to parse MSG: {str(e)}"}
