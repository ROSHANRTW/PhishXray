import re
import ssl
import socket
import requests
import os
import whois
import tldextract
from urllib.parse import urlparse
from datetime import datetime, timezone


# ============================================================
#  CONSTANTS
# ============================================================

SUSPICIOUS_TLDS = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.click',
                   '.loan', '.work', '.party', '.download', '.racing', '.review',
                   '.win', '.bid', '.stream', '.trade', '.webcam', '.accountant']

BRAND_NAMES = ['sbi', 'amazon', 'netflix', 'hdfc', 'icici', 'paypal', 'apple',
               'google', 'microsoft', 'facebook', 'instagram', 'twitter', 'whatsapp',
               'flipkart', 'paytm', 'phonepe', 'yesbank', 'axisbank', 'kotak',
               'ebay', 'walmart', 'dropbox', 'linkedin', 'yahoo', 'outlook']

SUSPICIOUS_KEYWORDS = ['login', 'verify', 'account', 'update', 'secure', 'password',
                       'support', 'confirm', 'banking', 'signin', 'urgent', 'alert',
                       'suspended', 'unusual', 'activity', 'free', 'winner', 'prize',
                       'claim', 'lucky', 'reward', 'offer', 'limited', 'expire']

SHORTENER_DOMAINS = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'buff.ly',
                     'rebrand.ly', 'tiny.cc', 'is.gd', 'cutt.ly', 'shorte.st']

TRUSTED_TLDS = ['.com', '.org', '.net', '.edu', '.gov', '.in', '.co.in']


# ============================================================
#  HELPER: Domain Validation
# ============================================================

def is_valid_domain(domain):
    if not domain or len(domain) > 253:
        return False
    pattern = re.compile(
        r'^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?'
        r'(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$'
    )
    return bool(re.match(pattern, domain))


# ============================================================
#  CHECK 1: URL Structure Analysis
# ============================================================

def analyze_url_structure(url, domain):
    score = 0
    flags = []
    passed = []

    # IP-based URL
    ip_pattern = re.compile(r'(\d{1,3}\.){3}\d{1,3}')
    if ip_pattern.search(domain):
        score += 40
        flags.append("IP address used instead of domain name — high risk!")
    else:
        passed.append("No IP-based URL detected.")

    # URL length
    if len(url) > 75:
        score += 10
        flags.append(f"URL is unusually long ({len(url)} characters).")
    else:
        passed.append(f"URL length is normal ({len(url)} characters).")

    # Excessive subdomains
    subdomain_count = domain.count('.')
    if subdomain_count > 3:
        score += 15
        flags.append(f"Too many subdomains ({subdomain_count}) — suspicious structure.")
    else:
        passed.append(f"Subdomain count is normal ({subdomain_count}).")

    # @ symbol
    if '@' in url:
        score += 30
        flags.append("URL contains '@' symbol — classic phishing trick to hide real destination!")
    else:
        passed.append("No '@' symbol found in URL.")

    # Double slash redirect
    if url.count('//') > 1:
        score += 20
        flags.append("Double slashes found — possible redirect trick.")
    else:
        passed.append("No suspicious redirect pattern found.")

    # Hyphen count
    if domain.count('-') > 2:
        score += 10
        flags.append(f"Domain has {domain.count('-')} hyphens — commonly used in fake domains.")
    else:
        passed.append("Hyphen count in domain is normal.")

    # URL shortener
    shortener_found = False
    for shortener in SHORTENER_DOMAINS:
        if shortener in domain:
            score += 20
            flags.append(f"URL is shortened via '{shortener}' — real destination is hidden.")
            shortener_found = True
            break
    if not shortener_found:
        passed.append("No URL shortener detected.")

    return score, flags, passed


# ============================================================
#  CHECK 2: TLD Analysis
# ============================================================

def analyze_tld(url):
    score = 0
    flags = []
    passed = []

    found_suspicious = False
    for tld in SUSPICIOUS_TLDS:
        if url.lower().endswith(tld) or f"{tld}/" in url.lower() or f"{tld}?" in url.lower():
            score += 25
            flags.append(f"Suspicious TLD '{tld}' detected — heavily used in phishing campaigns.")
            found_suspicious = True
            break

    if not found_suspicious:
        trusted = any(url.lower().split('?')[0].endswith(t) or f"{t}/" in url.lower() for t in TRUSTED_TLDS)
        if trusted:
            passed.append("Domain uses a trusted TLD (.com, .org, .in, etc.).")
        else:
            passed.append("TLD appears normal.")

    return score, flags, passed


# ============================================================
#  CHECK 3: Keyword & Brand Analysis
# ============================================================

def analyze_keywords(url):
    score = 0
    flags = []
    passed = []
    url_lower = url.lower()

    found_brands = [b for b in BRAND_NAMES if b in url_lower]
    found_keywords = [k for k in SUSPICIOUS_KEYWORDS if k in url_lower]

    if found_brands and found_keywords:
        score += 35
        flags.append(
            f"Brand name(s) '{', '.join(found_brands)}' combined with "
            f"suspicious keyword(s) '{', '.join(found_keywords[:3])}' — strong phishing signal!"
        )
    elif found_brands:
        score += 15
        flags.append(f"Brand name(s) found in URL: '{', '.join(found_brands)}' — possible impersonation.")
    elif found_keywords:
        score += 10
        flags.append(f"Suspicious keyword(s) in URL: '{', '.join(found_keywords[:3])}'.")
    else:
        passed.append("No suspicious brand names or keywords found in URL.")

    return score, flags, passed, found_brands, found_keywords


# ============================================================
#  CHECK 4: SSL Certificate Analysis
# ============================================================

def analyze_ssl(domain):
    score = 0
    flags = []
    passed = []
    ssl_info = {}

    try:
        ctx = ssl.create_default_context()
        with ctx.wrap_socket(socket.socket(), server_hostname=domain) as s:
            s.settimeout(5)
            s.connect((domain, 443))
            cert = s.getpeercert()

            # Expiry check
            expire_str = cert.get('notAfter', '')
            if expire_str:
                expire_date = datetime.strptime(expire_str, '%b %d %H:%M:%S %Y %Z').replace(tzinfo=timezone.utc)
                days_left = (expire_date - datetime.now(timezone.utc)).days
                ssl_info['expires_in_days'] = days_left
                ssl_info['expiry_date'] = str(expire_date.date())

                if days_left < 0:
                    score += 40
                    flags.append(f"SSL certificate EXPIRED {abs(days_left)} days ago!")
                elif days_left < 15:
                    score += 20
                    flags.append(f"SSL certificate expires in only {days_left} days — very soon!")
                else:
                    passed.append(f"SSL certificate valid — expires in {days_left} days ({expire_date.date()}).")

            # Issuer
            issuer = dict(x[0] for x in cert.get('issuer', []))
            org = issuer.get('organizationName', 'Unknown')
            ssl_info['issuer'] = org
            ssl_info['status'] = 'Valid'

            # Subject
            subject = dict(x[0] for x in cert.get('subject', []))
            ssl_info['issued_to'] = subject.get('commonName', domain)

            passed.append(f"SSL certificate issued by: {org}.")

    except ssl.SSLError:
        score += 35
        flags.append("SSL certificate is INVALID or self-signed — site cannot be trusted!")
        ssl_info['status'] = 'Invalid'
        ssl_info['error'] = 'Invalid or self-signed certificate'
    except (socket.timeout, ConnectionRefusedError, OSError):
        score += 20
        flags.append("Could not verify SSL — site may not support HTTPS.")
        ssl_info['status'] = 'Unreachable'
        ssl_info['error'] = 'Connection failed'
    except Exception as e:
        ssl_info['status'] = 'Unknown'
        ssl_info['error'] = str(e)

    return score, flags, passed, ssl_info


# ============================================================
#  CHECK 5: Domain Age via python-whois
# ============================================================

def analyze_domain_age(domain):
    score = 0
    flags = []
    passed = []
    whois_info = {}

    try:
        w = whois.whois(domain)
        creation_date = w.creation_date
        expiry_date = w.expiration_date
        updated_date = w.updated_date

        if isinstance(creation_date, list):
            creation_date = creation_date[0]
        if isinstance(expiry_date, list):
            expiry_date = expiry_date[0]
        if isinstance(updated_date, list):
            updated_date = updated_date[0]

        if creation_date:
            if creation_date.tzinfo is None:
                creation_date = creation_date.replace(tzinfo=timezone.utc)
            age_days = (datetime.now(timezone.utc) - creation_date).days

            whois_info['age_days'] = age_days
            whois_info['created'] = str(creation_date.date())
            whois_info['registrar'] = w.registrar or 'Unknown'
            whois_info['expiry'] = str(expiry_date.date()) if expiry_date else 'Unknown'
            whois_info['last_updated'] = str(updated_date.date()) if updated_date else 'Unknown'
            whois_info['name_servers'] = list(w.name_servers) if w.name_servers else []
            whois_info['country'] = w.country or 'Unknown'

            if age_days <= 30:
                score += 40
                flags.append(f"Domain is only {age_days} days old — very new, extremely suspicious!")
            elif age_days <= 180:
                score += 20
                flags.append(f"Domain is {age_days} days old — relatively new, proceed with caution.")
            else:
                passed.append(f"Domain is {age_days} days old (Created: {creation_date.date()}) — established domain.")
        else:
            score += 10
            flags.append("Domain creation date could not be determined.")
            whois_info['error'] = 'Creation date unavailable'

    except Exception as e:
        score += 10
        flags.append("WHOIS lookup failed — domain registration info unavailable.")
        whois_info['error'] = f'WHOIS lookup failed: {str(e)}'

    return score, flags, passed, whois_info


# ============================================================
#  CHECK 6: Google Safe Browsing
# ============================================================

def check_google_safebrowsing(url):
    API_KEY = os.getenv('GOOGLE_API_KEY')
    if not API_KEY:
        return None, "Google Safe Browsing API key not configured."

    API_URL = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={API_KEY}"
    payload = {
        "client": {"clientId": "PhishXrayApp", "clientVersion": "3.0"},
        "threatInfo": {
            "threatTypes": ["SOCIAL_ENGINEERING", "MALWARE", "UNWANTED_SOFTWARE"],
            "platformTypes": ["ANY_PLATFORM"],
            "threatEntryTypes": ["URL"],
            "threatEntries": [{"url": url}]
        }
    }
    try:
        response = requests.post(API_URL, json=payload, timeout=10)
        data = response.json()
        if 'matches' in data:
            threat_type = data['matches'][0]['threatType']
            return False, threat_type
        return True, None
    except Exception as e:
        return None, str(e)


# ============================================================
#  RISK SCORER
# ============================================================

def calculate_verdict(total_score):
    if total_score >= 80:
        return "Dangerous ❌", "CRITICAL"
    elif total_score >= 50:
        return "Suspicious ⚠️", "HIGH"
    elif total_score >= 25:
        return "Moderate Risk 🟡", "MEDIUM"
    else:
        return "Looks Safe ✅", "LOW"


# ============================================================
#  SMART RESPONSE GENERATOR v3.0
# ============================================================

def generate_smart_reply(verdict_label, risk_level, all_flags, domain, found_brands=None, whois_info=None, ssl_info=None):
    """
    Returns dict with:
    - aam_bhasha: Natural Hindi response for general users
    - technical_summary: Detailed English technical response
    """

    # --- AAM BHASHA ---
    if risk_level == "CRITICAL":
        if found_brands:
            aam = (
                f"Ye website bahut suspicious hai. Iska naam dekh ke lagta hai "
                f"ye '{', '.join(found_brands)}' jaisi badi company ki copy hai. "
                f"Apni koi bhi personal ya banking jankari yahan bilkul mat dena."
            )
        else:
            aam = (
                f"Ye website bahut khatarnak lag rahi hai. Hamare analysis mein "
                f"{len([f for f in all_flags if 'passed' not in f.lower() and '✔' not in f])} serious problems mili hain. "
                f"Is website par apni koi bhi jankari bilkul mat dena."
            )
    elif risk_level == "HIGH":
        aam = (
            f"Is website ke baare mein kuch cheezein theek nahi lagti. "
            f"Agar aap isse nahi jaante, toh abhi kuch bhi share mat karna "
            f"aur pehle kisi bharosemand source se confirm kar lo."
        )
    elif risk_level == "MEDIUM":
        aam = (
            f"Is website mein kuch choti dikkatein hain. Savdhani se use karein "
            f"aur koi bhi personal information share karne se pehle ek baar "
            f"soch lena."
        )
    else:
        aam = (
            f"Is website mein koi badi dikkat nahi mili. Aap safely use kar sakte hain, "
            f"lekin online hamesha thodi savdhani rakhein."
        )

    # --- TECHNICAL SUMMARY ---
    tech_lines = [f"Risk Level: {risk_level}\n"]

    if whois_info and 'error' not in whois_info:
        tech_lines.append("[ WHOIS / Domain Info ]")
        tech_lines.append(f"  Domain Age    : {whois_info.get('age_days', 'N/A')} days")
        tech_lines.append(f"  Created       : {whois_info.get('created', 'N/A')}")
        tech_lines.append(f"  Expiry        : {whois_info.get('expiry', 'Unknown')}")
        tech_lines.append(f"  Last Updated  : {whois_info.get('last_updated', 'Unknown')}")
        tech_lines.append(f"  Registrar     : {whois_info.get('registrar', 'Unknown')}")
        tech_lines.append(f"  Country       : {whois_info.get('country', 'Unknown')}")
        ns = whois_info.get('name_servers', [])
        if ns:
            tech_lines.append(f"  Name Servers  : {', '.join(list(ns)[:2])}")
    elif whois_info:
        tech_lines.append(f"[ WHOIS ] {whois_info.get('error', 'Unavailable')}")

    if ssl_info:
        tech_lines.append("\n[ SSL Certificate ]")
        tech_lines.append(f"  Status        : {ssl_info.get('status', 'Unknown')}")
        if ssl_info.get('issuer'):
            tech_lines.append(f"  Issuer        : {ssl_info.get('issuer')}")
        if ssl_info.get('issued_to'):
            tech_lines.append(f"  Issued To     : {ssl_info.get('issued_to')}")
        if ssl_info.get('expiry_date'):
            tech_lines.append(f"  Expiry        : {ssl_info.get('expiry_date')} ({ssl_info.get('expires_in_days', '?')} days left)")
        if ssl_info.get('error'):
            tech_lines.append(f"  Error         : {ssl_info.get('error')}")

    # Issues detected
    issues = [f for f in all_flags if not any(x in f.lower() for x in ['passed', 'valid', 'normal', 'no ', 'trusted', 'established'])]
    clear = [f for f in all_flags if any(x in f.lower() for x in ['passed', 'valid', 'normal', 'no ', 'trusted', 'established'])]

    if issues:
        tech_lines.append(f"\n[ Issues Detected ({len(issues)}) ]")
        for f in issues:
            tech_lines.append(f"  ⚠ {f}")

    if clear:
        tech_lines.append(f"\n[ Checks Passed ({len(clear)}) ]")
        for f in clear:
            tech_lines.append(f"  ✔ {f}")

    return {
        "aam_bhasha": aam,
        "technical_summary": "\n".join(tech_lines)
    }


# ============================================================
#  MAIN FUNCTIONS
# ============================================================

def analyze_link_simple(url_to_check):
    """
    FAST LINK SCAN: Simple Safe / Phishing verdict only.
    No details — bas Safe ya Phishing batao.
    """

    # Step 1: Empty check
    if not url_to_check or not url_to_check.strip():
        return {
            "success": False,
            "message": "Koi link enter nahi kiya. Please ek valid link daalo."
        }

    url_to_check = url_to_check.strip()

    # Step 2: Normalize URL
    if not url_to_check.startswith(('http://', 'https://')):
        url_with_protocol = 'https://' + url_to_check
    else:
        url_with_protocol = url_to_check

    parsed = urlparse(url_with_protocol)
    domain = parsed.netloc or parsed.path
    if ":" in domain:
        domain = domain.split(":", 1)[0]

    # Step 3: Domain validation — text/random string check
    if not is_valid_domain(domain):
        return {
            "success": False,
            "message": f"'{url_to_check}' ek valid link nahi hai. Please sahi URL daalo jaise: https://example.com"
        }

    # Step 4: Google Safe Browsing
    is_safe, threat_info = check_google_safebrowsing(url_with_protocol)
    if is_safe is False:
        return {
            "success": True,
            "verdict": "Phishing ❌",
            "aam_bhasha": "Ye link phishing hai! Google ne isse officially khatarnak mark kiya hai. Is link pe bilkul mat jao.",
            "scan_type": "quick"
        }

    # Step 5: Score based checks
    score = 0

    # URL structure
    s, f, p = analyze_url_structure(url_with_protocol, domain)
    score += s

    # TLD check
    tld_score, tld_flags, _ = analyze_tld(url_with_protocol)
    score += tld_score

    # Keyword + brand check
    kw_score, _, _, _, _ = analyze_keywords(url_with_protocol)
    score += kw_score

    # Step 6: Simple verdict
    if score >= 25:
        return {
            "success": True,
            "verdict": "Phishing ❌",
            "aam_bhasha": "Ye link phishing lag rahi hai! Is link pe apni koi bhi jankari mat dena — ye fake ho sakti hai.",
            "scan_type": "quick"
        }
    else:
        return {
            "success": True,
            "verdict": "Safe ✅",
            "aam_bhasha": "Ye link safe lagti hai. Koi bada khatara nahi mila. Phir bhi online savdhaan rahein!",
            "scan_type": "quick"
        }


def analyze_website_detailed(url_to_check):
    """DEEP SCAN: Full multi-layered analysis."""

    if not url_to_check.startswith(('http://', 'https://')):
        url_with_protocol = 'https://' + url_to_check
    else:
        url_with_protocol = url_to_check

    parsed = urlparse(url_with_protocol)
    domain = parsed.netloc or parsed.path
    if ":" in domain:
        domain = domain.split(":", 1)[0]

    if not is_valid_domain(domain):
        return {"success": False, "message": f"'{url_to_check}' is not a valid domain."}

    total_score = 0
    all_flags = []
    all_passed = []
    score_breakdown = {}
    found_brands = []

    # --- Google Safe Browsing ---
    is_safe, threat_info = check_google_safebrowsing(url_with_protocol)
    if is_safe is False:
        reply = generate_smart_reply("Dangerous ❌", "CRITICAL", [], domain)
        return {
            "success": True,
            "verdict": "Dangerous ❌",
            "risk_level": "CRITICAL",
            "risk_score": 100,
            "aam_bhasha": reply["aam_bhasha"],
            "technical_summary": f"[ Google Safe Browsing ]\n  ⚠ Officially blacklisted as: {threat_info}",
            "flags": [f"Google Safe Browsing: {threat_info}"],
            "passed_checks": [],
            "score_breakdown": {},
            "whois_data": {},
            "ssl_data": {},
            "scan_type": "deep"
        }
    elif is_safe:
        all_passed.append("Passed Google Safe Browsing check.")
    else:
        all_flags.append(f"Google Safe Browsing skipped: {threat_info}")

    # --- URL Structure ---
    s, f, p = analyze_url_structure(url_with_protocol, domain)
    total_score += s; all_flags += f; all_passed += p
    score_breakdown['url_structure'] = s

    # --- TLD ---
    s, f, p = analyze_tld(url_with_protocol)
    total_score += s; all_flags += f; all_passed += p
    score_breakdown['tld'] = s

    # --- Keywords ---
    s, f, p, found_brands, _ = analyze_keywords(url_with_protocol)
    total_score += s; all_flags += f; all_passed += p
    score_breakdown['keywords'] = s

    # --- SSL ---
    s, f, p, ssl_info = analyze_ssl(domain)
    total_score += s; all_flags += f; all_passed += p
    score_breakdown['ssl'] = s

    # --- Domain Age ---
    s, f, p, whois_info = analyze_domain_age(domain)
    total_score += s; all_flags += f; all_passed += p
    score_breakdown['domain_age'] = s

    # --- Final Verdict ---
    verdict_label, risk_level = calculate_verdict(total_score)
    reply = generate_smart_reply(
        verdict_label, risk_level,
        all_flags + all_passed,
        domain,
        found_brands=found_brands,
        whois_info=whois_info,
        ssl_info=ssl_info
    )

    return {
        "success": True,
        "verdict": verdict_label,
        "risk_level": risk_level,
        "risk_score": min(total_score, 100),

        # 2 responses
        "aam_bhasha": reply["aam_bhasha"],
        "technical_summary": reply["technical_summary"],

        # Raw flags
        "flags": all_flags,
        "passed_checks": all_passed,

        # Score per check
        "score_breakdown": {
            "url_structure": score_breakdown.get('url_structure', 0),
            "tld_check": score_breakdown.get('tld', 0),
            "keyword_check": score_breakdown.get('keywords', 0),
            "ssl_check": score_breakdown.get('ssl', 0),
            "domain_age": score_breakdown.get('domain_age', 0),
        },

        # Raw data
        "whois_data": whois_info,
        "ssl_data": ssl_info,

        "scan_type": "deep"
    }