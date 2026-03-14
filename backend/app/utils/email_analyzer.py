# -*- coding: utf-8 -*-
# ============================================================
#   PhishXray — Email Analyzer v1.0
#   Supports: .eml and .msg files
#   Checks: Headers, Links, Attachments, Behavioral Patterns
# ============================================================

import re
import email
import io
from email import policy
from email.parser import BytesParser
from .link_analyzer import analyze_link_simple
from .message_analyzer import (
    _count_pattern_matches,
    URGENCY_PATTERNS,
    REWARD_PATTERNS,
    ACTION_PATTERNS,
    IMPERSONATION_PATTERNS,
)

# ============================================================
#  CONSTANTS
# ============================================================

DANGEROUS_EXTENSIONS = [
    '.exe', '.bat', '.cmd', '.js', '.vbs', '.ps1', '.jar',
    '.scr', '.pif', '.com', '.msi', '.dll', '.hta', '.wsf',
    '.zip', '.rar', '.7z',  # archives can hide malware
]

SUSPICIOUS_EXTENSIONS = [
    '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',  # macro-enabled risk
    '.pdf',  # can contain embedded links/js
    '.html', '.htm',  # phishing pages disguised as attachments
]

URL_PATTERN = re.compile(
    r"(?i)\b((?:https?://|www\.)[^\s<>'\"()]+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:/[^\s<>'\"]*)?)"
)

# ============================================================
#  HELPERS
# ============================================================

def _extract_urls_from_text(text):
    raw = [m.group(1) for m in URL_PATTERN.finditer(text or "")]
    cleaned, seen = [], set()
    for url in raw:
        u = url.strip().rstrip(".,;:!?)]}>\"'")
        if u and u not in seen:
            cleaned.append(u)
            seen.add(u)
    return cleaned

def _analyze_sender(from_header, reply_to_header):
    """Sender aur Reply-To mismatch check karo."""
    flags = []
    passed = []
    score = 0

    if not from_header:
        flags.append("Sender (From) address is missing — highly suspicious.")
        score += 30
        return score, flags, passed

    # Email extract karo display name se
    from_email_match = re.search(r'<([^>]+)>', from_header)
    from_email = from_email_match.group(1).lower() if from_email_match else from_header.lower().strip()

    # Free email providers impersonating brands
    free_providers = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'ymail.com']
    brand_names = ['amazon', 'paypal', 'sbi', 'hdfc', 'icici', 'google', 'microsoft',
                   'apple', 'netflix', 'flipkart', 'paytm', 'income', 'government']

    from_domain = from_email.split('@')[-1] if '@' in from_email else ''
    display_name = from_header.lower()

    brand_in_name = any(b in display_name for b in brand_names)
    using_free_provider = any(p in from_domain for p in free_providers)

    if brand_in_name and using_free_provider:
        score += 40
        flags.append(
            f"Sender claims to be a known brand but uses a free email provider ({from_domain}). "
            f"Legitimate companies use official domains."
        )
    elif brand_in_name and from_domain and not any(b in from_domain for b in brand_names):
        score += 30
        flags.append(
            f"Sender display name suggests a trusted brand, but the actual email domain "
            f"({from_domain}) does not match. This is a common spoofing technique."
        )
    else:
        passed.append(f"Sender address appears consistent: {from_email}")

    # Reply-To mismatch
    if reply_to_header and reply_to_header.strip():
        reply_match = re.search(r'<([^>]+)>', reply_to_header)
        reply_email = reply_match.group(1).lower() if reply_match else reply_to_header.lower().strip()
        reply_domain = reply_email.split('@')[-1] if '@' in reply_email else ''

        if from_domain and reply_domain and from_domain != reply_domain:
            score += 25
            flags.append(
                f"Reply-To address ({reply_email}) differs from sender domain ({from_domain}). "
                f"Replies will go to a different, possibly malicious address."
            )
        else:
            passed.append("Reply-To address matches sender domain.")
    else:
        passed.append("No Reply-To mismatch detected.")

    return score, flags, passed

def _analyze_subject(subject):
    """Subject line mein urgency/bait check karo."""
    score = 0
    flags = []
    passed = []

    if not subject:
        passed.append("Subject line is present.")
        return score, flags, passed

    urgency_count, _ = _count_pattern_matches(subject, URGENCY_PATTERNS)
    reward_count, _ = _count_pattern_matches(subject, REWARD_PATTERNS)

    if urgency_count > 0:
        score += 15
        flags.append(f"Subject line uses urgency tactics: '{subject}'")
    if reward_count > 0:
        score += 15
        flags.append(f"Subject line uses reward/bait language: '{subject}'")
    if urgency_count == 0 and reward_count == 0:
        passed.append(f"Subject line appears normal: '{subject}'")

    return score, flags, passed

def _analyze_body(body_text):
    """Email body mein behavioral patterns check karo."""
    score = 0
    flags = []
    passed = []
    behaviors = []

    if not body_text or not body_text.strip():
        flags.append("Email body is empty — suspicious.")
        return score + 10, flags, passed, behaviors, []

    # Behavioral patterns
    urgency_count, _ = _count_pattern_matches(body_text, URGENCY_PATTERNS)
    reward_count, _ = _count_pattern_matches(body_text, REWARD_PATTERNS)
    action_count, _ = _count_pattern_matches(body_text, ACTION_PATTERNS)
    imp_count, _ = _count_pattern_matches(body_text, IMPERSONATION_PATTERNS)

    if urgency_count > 0:
        pts = min(urgency_count * 10, 25)
        score += pts
        behaviors.append("urgency/threat")
        flags.append("Email body contains urgency or threat language to pressure the recipient.")

    if reward_count > 0:
        pts = min(reward_count * 10, 20)
        score += pts
        behaviors.append("reward/bait")
        flags.append("Email body uses reward or bait tactics — 'too good to be true' offer.")

    if action_count > 0:
        pts = min(action_count * 8, 20)
        score += pts
        behaviors.append("action demand")
        flags.append("Email demands sensitive action — clicking links, sharing credentials, or providing personal info.")

    if imp_count > 0:
        pts = min(imp_count * 8, 15)
        score += pts
        behaviors.append("impersonation")
        flags.append("Email appears to impersonate a known brand, bank, or government authority.")

    if not behaviors:
        passed.append("No suspicious behavioral patterns detected in email body.")

    # URL extraction and analysis
    urls = _extract_urls_from_text(body_text)
    url_results = []
    dangerous_urls = []
    url_score = 0

    if urls:
        passed.append(f"{len(urls)} URL(s) found and analyzed in email body.")
        for url in urls:
            link_result = analyze_link_simple(url)
            link_verdict = (link_result.get("verdict") or "").lower()

            if not link_result.get("success"):
                url_score += 10
                flags.append(f"URL could not be validated: {url}")
            elif "phishing" in link_verdict or "dangerous" in link_verdict:
                url_score += 35
                dangerous_urls.append(url)
                flags.append(f"Malicious URL detected in email body: {url}")
            else:
                passed.append(f"URL appears safe: {url}")

            url_results.append({"url": url, "result": link_result})
    else:
        passed.append("No URLs found in email body.")

    score += min(url_score, 60)

    return score, flags, passed, behaviors, url_results

def _analyze_attachments(msg):
    """Attachments check karo — dangerous file types."""
    score = 0
    flags = []
    passed = []
    attachments = []

    for part in msg.walk():
        content_disposition = str(part.get('Content-Disposition', ''))
        if 'attachment' in content_disposition:
            filename = part.get_filename()
            if filename:
                filename_lower = filename.lower()
                attachments.append(filename)

                if any(filename_lower.endswith(ext) for ext in DANGEROUS_EXTENSIONS):
                    score += 40
                    flags.append(
                        f"Dangerous attachment detected: '{filename}' — "
                        f"this file type is commonly used to deliver malware."
                    )
                elif any(filename_lower.endswith(ext) for ext in SUSPICIOUS_EXTENSIONS):
                    score += 15
                    flags.append(
                        f"Potentially risky attachment: '{filename}' — "
                        f"Office files and PDFs can contain malicious macros or embedded links."
                    )
                else:
                    passed.append(f"Attachment appears safe: '{filename}'")

    if not attachments:
        passed.append("No attachments found in this email.")

    return score, flags, passed, attachments

def _calculate_verdict(score):
    if score >= 75: return "Dangerous ❌", "CRITICAL"
    if score >= 50: return "Suspicious ⚠️", "HIGH"
    if score >= 25: return "Moderate Risk 🟡", "MEDIUM"
    return "Looks Safe ✅", "LOW"

def _generate_response(risk_level, behaviors, dangerous_urls, sender_flags, attachment_flags):
    """Professional English response."""
    if risk_level == "CRITICAL":
        if dangerous_urls:
            return (
                f"This email is highly dangerous. It contains confirmed malicious link(s) "
                f"and exhibits deceptive behavior including {', '.join(behaviors[:3]) if behaviors else 'multiple threats'}. "
                f"Do not click any links, download attachments, or reply to this email."
            )
        if attachment_flags:
            return (
                "This email contains a dangerous attachment that may deliver malware to your device. "
                "Do not open or download any files from this email. Delete it immediately."
            )
        if sender_flags:
            return (
                "This email appears to impersonate a trusted organization. "
                "The sender's address is deceptive and does not originate from the claimed source. "
                "Do not take any action requested in this email."
            )
        return (
            f"This email exhibits multiple high-risk behaviors: {', '.join(behaviors[:3]) if behaviors else 'suspicious patterns'}. "
            f"It is likely a phishing attempt. Do not respond or take any action."
        )
    elif risk_level == "HIGH":
        return (
            f"This email shows suspicious characteristics including {', '.join(behaviors[:2]) if behaviors else 'suspicious patterns'}. "
            f"Exercise extreme caution. Verify the sender's identity through official channels "
            f"before clicking any links or providing any information."
        )
    elif risk_level == "MEDIUM":
        return (
            "This email has some characteristics that warrant caution. "
            "Verify the sender before taking any action, and avoid clicking unknown links."
        )
    return (
        "This email appears to be safe. No significant threat indicators were detected. "
        "However, always stay vigilant — when in doubt, verify with the sender directly."
    )

# ============================================================
#  MAIN: Analyze .eml File
# ============================================================

def analyze_eml(file):
    """Parse aur analyze karo .eml email file."""
    try:
        raw_bytes = file.read()
        msg = BytesParser(policy=policy.default).parsebytes(raw_bytes)

        # Headers
        from_header = msg.get('From', '')
        reply_to = msg.get('Reply-To', '')
        subject = msg.get('Subject', '')
        date = msg.get('Date', '')
        to_header = msg.get('To', '')

        # Body extract karo
        body_text = ""
        if msg.is_multipart():
            for part in msg.walk():
                ctype = part.get_content_type()
                if ctype == 'text/plain':
                    try:
                        body_text += part.get_content() or ""
                    except Exception:
                        pass
                elif ctype == 'text/html' and not body_text:
                    try:
                        html = part.get_content() or ""
                        # HTML tags remove karo
                        body_text += re.sub(r'<[^>]+>', ' ', html)
                    except Exception:
                        pass
        else:
            try:
                body_text = msg.get_content() or ""
            except Exception:
                body_text = ""

        return _build_result(msg, from_header, reply_to, subject, date, to_header, body_text)

    except Exception as e:
        return {"success": False, "message": f"Failed to parse .eml file: {str(e)}"}

# ============================================================
#  MAIN: Analyze .msg File
# ============================================================

def analyze_msg(file):
    """Parse aur analyze karo .msg (Outlook) email file."""
    try:
        import extract_msg
    except ImportError:
        return {
            "success": False,
            "message": "Install required: pip install extract-msg"
        }

    try:
        raw_bytes = file.read()
        msg_obj = extract_msg.Message(io.BytesIO(raw_bytes))

        from_header = msg_obj.sender or ''
        reply_to = msg_obj.reply_to or ''
        subject = msg_obj.subject or ''
        date = str(msg_obj.date) if msg_obj.date else ''
        to_header = msg_obj.to or ''
        body_text = msg_obj.body or ''

        # .msg ke liye fake email.message object banao attachments ke liye
        # Directly msg_obj.attachments use karenge
        class FakeMsg:
            def __init__(self, msg_obj):
                self._msg = msg_obj
            def walk(self):
                return []
            def get(self, key, default=''):
                return default

        fake_msg = FakeMsg(msg_obj)

        # Attachments manually check karo
        attach_score = 0
        attach_flags = []
        attach_passed = []
        attachments = []

        for att in (msg_obj.attachments or []):
            fname = getattr(att, 'longFilename', '') or getattr(att, 'shortFilename', '') or ''
            if fname:
                fname_lower = fname.lower()
                attachments.append(fname)
                if any(fname_lower.endswith(ext) for ext in DANGEROUS_EXTENSIONS):
                    attach_score += 40
                    attach_flags.append(f"Dangerous attachment: '{fname}' — commonly used to deliver malware.")
                elif any(fname_lower.endswith(ext) for ext in SUSPICIOUS_EXTENSIONS):
                    attach_score += 15
                    attach_flags.append(f"Risky attachment: '{fname}' — may contain malicious macros.")
                else:
                    attach_passed.append(f"Attachment appears safe: '{fname}'")

        if not attachments:
            attach_passed.append("No attachments found in this email.")

        return _build_result_raw(
            from_header, reply_to, subject, date, to_header, body_text,
            attach_score, attach_flags, attach_passed, attachments
        )

    except Exception as e:
        return {"success": False, "message": f"Failed to parse .msg file: {str(e)}"}

# ============================================================
#  RESULT BUILDER
# ============================================================

def _build_result(msg, from_header, reply_to, subject, date, to_header, body_text):
    """Common result builder for .eml files."""
    all_flags = []
    all_passed = []
    score_breakdown = {}
    behaviors = []

    # Sender analysis
    s, f, p = _analyze_sender(from_header, reply_to)
    score_breakdown['sender'] = s
    all_flags += f
    all_passed += p

    # Subject analysis
    s, f, p = _analyze_subject(subject)
    score_breakdown['subject'] = s
    all_flags += f
    all_passed += p

    # Body analysis
    s, f, p, b, url_results = _analyze_body(body_text)
    score_breakdown['body'] = s
    all_flags += f
    all_passed += p
    behaviors += b

    # Attachment analysis
    s, f, p, attachments = _analyze_attachments(msg)
    score_breakdown['attachments'] = s
    all_flags += f
    all_passed += p

    total_score = min(sum(score_breakdown.values()), 100)
    verdict, risk_level = _calculate_verdict(total_score)

    sender_flags = [f for f in all_flags if 'sender' in f.lower() or 'domain' in f.lower()]
    attach_flags = [f for f in all_flags if 'attachment' in f.lower()]
    dangerous_urls = [r['url'] for r in url_results if 'dangerous' in (r['result'].get('verdict') or '').lower()]

    smart_response = _generate_response(risk_level, behaviors, dangerous_urls, sender_flags, attach_flags)

    return {
        "success": True,
        "scan_type": "email",
        "verdict": verdict,
        "risk_score": total_score,
        "risk_level": risk_level,
        "aam_bhasha": smart_response,
        "email_metadata": {
            "from": from_header,
            "to": to_header,
            "subject": subject,
            "date": date,
            "attachments": attachments if 'attachments' in dir() else [],
        },
        "behaviors_detected": behaviors,
        "flags": all_flags,
        "passed_checks": all_passed,
        "score_breakdown": score_breakdown,
        "url_results": url_results,
    }

def _build_result_raw(from_header, reply_to, subject, date, to_header, body_text,
                       attach_score, attach_flags, attach_passed, attachments):
    """Common result builder for .msg files."""
    all_flags = []
    all_passed = []
    score_breakdown = {}
    behaviors = []

    s, f, p = _analyze_sender(from_header, reply_to)
    score_breakdown['sender'] = s
    all_flags += f; all_passed += p

    s, f, p = _analyze_subject(subject)
    score_breakdown['subject'] = s
    all_flags += f; all_passed += p

    s, f, p, b, url_results = _analyze_body(body_text)
    score_breakdown['body'] = s
    all_flags += f; all_passed += p
    behaviors += b

    score_breakdown['attachments'] = attach_score
    all_flags += attach_flags
    all_passed += attach_passed

    total_score = min(sum(score_breakdown.values()), 100)
    verdict, risk_level = _calculate_verdict(total_score)

    sender_flags = [f for f in all_flags if 'sender' in f.lower() or 'domain' in f.lower()]
    attach_flags_final = [f for f in all_flags if 'attachment' in f.lower()]
    dangerous_urls = [r['url'] for r in url_results if 'dangerous' in (r['result'].get('verdict') or '').lower()]

    smart_response = _generate_response(risk_level, behaviors, dangerous_urls, sender_flags, attach_flags_final)

    return {
        "success": True,
        "scan_type": "email",
        "verdict": verdict,
        "risk_score": total_score,
        "risk_level": risk_level,
        "aam_bhasha": smart_response,
        "email_metadata": {
            "from": from_header,
            "to": to_header,
            "subject": subject,
            "date": date,
            "attachments": attachments,
        },
        "behaviors_detected": behaviors,
        "flags": all_flags,
        "passed_checks": all_passed,
        "score_breakdown": score_breakdown,
        "url_results": url_results,
    }
