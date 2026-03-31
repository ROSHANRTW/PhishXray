// frontend/src/dashboard.js (v3.1 - PhishXray Updated)
import React, { useState, useEffect, useRef } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import { Link } from "react-router-dom";
import styles from "./dashboard.module.css";
import { useUser } from "./UserContext";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8080";

// --- Helper Components ---

const FileUpload = ({ onFileSelect, accept, hint }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const inputRef = useRef(null);
  const handleFile = (file) => { if (file) { setSelectedFile(file); onFileSelect(file); } };
  const handleDrag = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleDragIn = (e) => { handleDrag(e); setIsDragging(true); };
  const handleDragOut = (e) => { handleDrag(e); setIsDragging(false); };
  const handleDrop = (e) => {
    handleDrag(e);
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };
  const handleChange = (e) => { handleFile(e.target.files[0]); };
  return (
    <div className={`${styles['file-upload-area']} ${isDragging ? styles.dragging : ''}`} onDragEnter={handleDragIn} onDragLeave={handleDragOut} onDragOver={handleDragIn} onDrop={handleDrop} onClick={() => inputRef.current.click()}>
      <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }} onChange={handleChange} />
      <img src="/images/upload-icon.png" alt="Upload" className={styles['file-upload-icon']} />
      {selectedFile ? (<div className={styles['file-info']}>Selected: {selectedFile.name}</div>) : (<p className={styles['file-upload-text']}>Drag and Drop file or <span>Browse</span></p>)}
      <p className={styles['file-upload-hint']}>{hint}</p>
    </div>
  );
};

const ScanInput = ({ type, onValueChange, onFileChange }) => {
  switch (type) {
    case "email": return <FileUpload accept=".eml, .msg" hint="Allowed formats: .eml, .msg" onFileSelect={onFileChange} />;
    case "file": return <FileUpload accept=".pdf, .doc, .docx, .js, .html, .htm, .zip" hint="Scan documents, scripts, and archives for threats." onFileSelect={onFileChange} />;
    case "link": return <input type="text" placeholder="https://example.com" className={styles['scan-input']} onChange={(e) => onValueChange(e.target.value)} />;
    case "website": return <input type="text" placeholder="example.com" className={styles['scan-input']} onChange={(e) => onValueChange(e.target.value)} />;
    case "spam": return (
      <div className={styles["spam-scan-container"]}>
        <textarea placeholder="Paste suspicious message text here..." onChange={(e) => onValueChange(e.target.value)} />
        <FileUpload accept="image/*" hint="Upload screenshot of the message (optional)" onFileSelect={onFileChange} />
      </div>
    );
    default: return null;
  }
};

const ScanHint = ({ type }) => {
  const hints = {
    email: "Upload an .eml or .msg file to analyze headers, links, and attachments for phishing threats.",
    file: "Upload a file to scan it for known malware and viruses using our powerful detection engine.",
    link: "Paste any suspicious link to check it against a real-time database of malicious websites.",
    website: "Enter a website domain to perform a deep scan for phishing pages and security risks.",
    spam: "Analyze text messages or screenshots from any platform to detect hidden phishing links and scam patterns.",
  };
  return <p className={styles['scan-hint']}>{hints[type]}</p>;
};

// ============================================================
//  SCAN RESULT COMPONENT (v3.0 - Updated)
// ============================================================

const ScanResult = ({ result }) => {
  const [showTechnical, setShowTechnical] = useState(false);

  if (!result) return null;

  if (result.error) {
    return (
      <div className={`${styles['result-container']} ${styles['verdict-dangerous']}`}>
        <div className={styles['result-grid']}>
          <div>
            <h2 className="verdict-title">Error</h2>
            <p className={styles['smart-reply']}>{result.message}</p>
          </div>
          <div className={styles['score-box']}></div>
        </div>
      </div>
    );
  }

  if (result.verdict === "Invalid Input") {
    return (
      <div className={`${styles['result-container']} ${styles['verdict-invalid']}`}>
        <div className={styles['result-grid']}>
          <div>
            <h2 className="verdict-title">Invalid Input</h2>
            <p className={styles['smart-reply']}>{result.aam_bhasha || result.smart_reply}</p>
          </div>
          <div className={styles['score-box']}></div>
        </div>
      </div>
    );
  }

  const formatDate = (iso) => {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      if (isNaN(d)) return iso;
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { return iso; }
  };

  const verdictRaw = result.verdict || '';
  let verdictClass = styles['verdict-suspicious'];
  if (verdictRaw.includes('Safe')) verdictClass = styles['verdict-safe'];
  else if (verdictRaw.includes('Dangerous')) verdictClass = styles['verdict-dangerous'];
  else if (verdictRaw.includes('Moderate')) verdictClass = styles['verdict-suspicious'];
  else if (verdictRaw.includes('Suspicious')) verdictClass = styles['verdict-suspicious'];

  const riskColors = {
    LOW: '#2ecc71',
    MEDIUM: '#f39c12',
    HIGH: '#e67e22',
    CRITICAL: '#e74c3c',
  };
  const riskColor = riskColors[result.risk_level] || '#f39c12';

  const whois = result.whois_data || result.whois || {};
  const ssl = result.ssl_data || {};
  const scoreBreakdown = result.score_breakdown || {};

  const WhoisDetails = () => {
    if (!whois || whois.not_found || Object.keys(whois).length === 0) return null;
    const rows = [
      ["Registrar", whois.registrar],
      ["Created", formatDate(whois.created || whois.created_date)],
      ["Expiry", formatDate(whois.expiry || whois.expiry_date)],
      ["Last Updated", formatDate(whois.last_updated || whois.updated_date)],
      ["Domain Age", whois.age_days ? `${whois.age_days} days` : null],
      ["Country", whois.country],
      ["Name Servers", Array.isArray(whois.name_servers) ? whois.name_servers.slice(0, 2).join(", ") : whois.name_servers],
      ["Privacy Protection", whois.privacy_protection ? "Yes" : "No"],
    ].filter(([, v]) => v !== null && v !== undefined && v !== "");
    if (rows.length === 0) return null;
    return (
      <div className={styles['whois-card']}>
        <div className={styles['whois-info']}>
          {rows.map(([k, v]) => (
            <div className={styles['whois-row']} key={k}>
              <div className={styles['whois-key']}>{k}</div>
              <div className={styles['whois-value']}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const SSLDetails = () => {
    if (!ssl || Object.keys(ssl).length === 0) return null;
    const rows = [
      ["SSL Status", ssl.status],
      ["Issuer", ssl.issuer],
      ["Issued To", ssl.issued_to],
      ["Expiry Date", ssl.expiry_date],
      ["Days Left", ssl.expires_in_days !== undefined ? `${ssl.expires_in_days} days` : null],
    ].filter(([, v]) => v !== null && v !== undefined && v !== "");
    if (rows.length === 0) return null;
    return (
      <div className={styles['whois-card']} style={{ marginTop: 10 }}>
        <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>🔒 SSL Certificate</div>
        <div className={styles['whois-info']}>
          {rows.map(([k, v]) => (
            <div className={styles['whois-row']} key={k}>
              <div className={styles['whois-key']}>{k}</div>
              <div className={styles['whois-value']}>{String(v)}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const ScoreBreakdown = () => {
    if (!scoreBreakdown || Object.keys(scoreBreakdown).length === 0) return null;
    const labels = {
      url_structure: "URL Structure",
      tld_check: "TLD Check",
      keyword_check: "Keyword & Brand",
      ssl_check: "SSL Certificate",
      domain_age: "Domain Age",
    };
    return (
      <div className={styles['whois-card']} style={{ marginTop: 10 }}>
        <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>📊 Score Breakdown</div>
        <div className={styles['whois-info']}>
          {Object.entries(scoreBreakdown).map(([k, v]) => (
            <div className={styles['whois-row']} key={k}>
              <div className={styles['whois-key']}>{labels[k] || k}</div>
              <div className={styles['whois-value']} style={{ color: v > 0 ? '#e74c3c' : '#2ecc71', fontWeight: 600 }}>
                {v > 0 ? `+${v} pts ⚠` : `0 pts ✔`}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`${styles['result-container']} ${verdictClass}`} data-aos="fade-up" data-aos-once="true">
      <div className={styles['result-grid']}>
        <div>
          <h2 className="verdict-title">{result.verdict}</h2>
          {result.risk_level && (
            <span style={{
              display: 'inline-block', background: riskColor, color: '#fff',
              borderRadius: 20, padding: '3px 14px', fontSize: 12,
              fontWeight: 700, marginBottom: 10, letterSpacing: 1,
            }}>
              {result.risk_level} RISK
            </span>
          )}
          {(result.aam_bhasha || result.smart_reply) && (
            <p className={styles['smart-reply']}>{result.aam_bhasha || result.smart_reply}</p>
          )}
        </div>
        <div className={styles['score-box']}>
          <div className="score">{(result.risk_score ?? 0)} / 100</div>
        </div>
      </div>

      {whois.not_found && (
        <div style={{ padding: '12px 16px', borderRadius: 8, marginBottom: 12, background: '#fff3f3', border: '1px solid #ffb3b3', color: '#2b2b2b' }}>
          <strong>WHOIS Not Available.</strong> Domain info could not be retrieved.
        </div>
      )}

      <WhoisDetails />
      <SSLDetails />
      <ScoreBreakdown />

      {result.flags && result.flags.length > 0 && (
        <div className={styles['details-section']} style={{ marginTop: 14 }}>
          <h4>⚠ Issues Detected ({result.flags.length})</h4>
          <ul className={styles['details-list']}>
            {result.flags.map((flag, i) => (<li key={i}><span>- {flag}</span></li>))}
          </ul>
        </div>
      )}

      {result.passed_checks && result.passed_checks.length > 0 && (
        <div className={styles['details-section']} style={{ marginTop: 10 }}>
          <h4>✔ Checks Passed ({result.passed_checks.length})</h4>
          <ul className={styles['details-list']}>
            {result.passed_checks.map((item, i) => (
              <li key={i} style={{ color: '#2ecc71' }}><span>✔ {item}</span></li>
            ))}
          </ul>
        </div>
      )}

      {result.technical_summary && (
        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => setShowTechnical(!showTechnical)}
            style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.4)',
              color: 'inherit', borderRadius: 8, padding: '7px 18px',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}
          >
            {showTechnical ? '▲ Hide Technical Details' : '▼ Show Technical Details'}
          </button>
          {showTechnical && (
            <div style={{ marginTop: 12, background: 'rgba(0,0,0,0.15)', borderRadius: 10, padding: '14px 18px' }}>
              <h4 style={{ marginBottom: 8, fontSize: 14 }}>🔧 Technical Analysis</h4>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.7, fontFamily: 'monospace', margin: 0 }}>
                {result.technical_summary}
              </pre>
            </div>
          )}
        </div>
      )}

      {result.details && result.details.length > 0 && !result.flags && (
        <div className={styles['details-section']}>
          <h4>Analysis Details</h4>
          <ul className={styles['details-list']}>
            {result.details.map((detail, i) => <li key={i}><span>- {detail}</span></li>)}
          </ul>
        </div>
      )}

      {/* Responsive Styles for ScanResult */}
      <style jsx>{`
        @media (max-width: 768px) {
          .result-container {
            padding: 15px !important;
            margin-top: 20px !important;
          }
          .result-grid {
            flex-direction: column !important;
            text-align: center !important;
            gap: 12px !important;
          }
          .score-box {
            margin-top: 0 !important;
            padding: 10px !important;
          }
          .details-section {
            padding: 12px !important;
            margin-top: 12px !important;
          }
          .details-list {
            padding-left: 0 !important;
          }
          .verdict-title {
            font-size: 1.4rem !important;
          }
        }
        @media (max-width: 480px) {
          .result-container {
            padding: 12px !important;
          }
          .verdict-title {
            font-size: 1.2rem !important;
          }
          .smart-reply {
            font-size: 0.9rem !important;
          }
        }
      `}</style>
    </div>
  );
};

// --- Main Dashboard Component ---
export default function Dashboard() {
  const [selected, setSelected] = useState("website");
  const { user, token } = useUser();
  const [scanValue, setScanValue] = useState('');
  const [scanFile, setScanFile] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Add this for mobile toggle

  useEffect(() => { AOS.init({ duration: 700 }); }, []);

  const handleSelection = (type) => {
    setSelected(type);
    setScanValue('');
    setScanFile(null);
    setScanResult(null);
  };

  const handleScan = async () => {
    const currentToken = token || localStorage.getItem('token');
    if (!currentToken) { alert("Authentication Error: Please log out and log in again."); return; }

    // ── Spam / Message Scan: needs either text OR image ──────────────────────
    if (selected === 'spam') {
      if (!scanValue && !scanFile) {
        alert("Please paste a message or upload a screenshot.");
        return;
      }
      setIsScanning(true);
      try {
        let response, data;

        // If image uploaded → use /scan/message/image
        if (scanFile) {
          const formData = new FormData();
          formData.append('image', scanFile);

          response = await fetch(`${API_BASE}/api/scan/message/image`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` },
            // NOTE: Do NOT set Content-Type manually — browser sets multipart boundary
            body: formData,
          });
        } else {
          // Text only → use /scan/message
          response = await fetch(`${API_BASE}/api/scan/message`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${currentToken}`,
            },
            body: JSON.stringify({ message: scanValue }),
          });
        }

        const text = await response.text();
        try { data = JSON.parse(text); } catch (e) { data = { rawText: text }; }
        console.log('[message scan] status:', response.status, 'data:', data);

        const resultPayload = (data && typeof data === 'object') ? (data.result ?? data) : data;

        // 💥 HANDLE TOKEN EXPIRE
        if (response.status === 401) {
          alert("Session expired. Please login again.");
          localStorage.removeItem("token");
          window.location.href = "/signup";
          return;
        }

        if (!response.ok || (data && data.success === false)) {
          throw new Error((data && data.message) || `Scan failed (status ${response.status})`);
        }

        setScanResult(resultPayload);
      } catch (error) {
        console.error('[message scan] error:', error);
        setScanResult({ error: true, message: error.message || String(error) });
      } finally {
        setIsScanning(false);
      }
      return;
    }

    // ── Other scan types ──────────────────────────────────────────────────────
    if (!scanValue && !scanFile) { alert("Please enter something to scan."); return; }

    setIsScanning(true);

    // Handle email file uploads (multipart/form-data)
    if (selected === 'email') {
      if (!scanFile) {
        alert("Please upload an email file (.eml or .msg) to scan.");
        setIsScanning(false);
        return;
      }

      try {
        const formData = new FormData();
        formData.append('file', scanFile);

        const response = await fetch(`${API_BASE}/api/scan/email`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${currentToken}` },
          body: formData,
        });

        const text = await response.text();
        let data;
        try { data = JSON.parse(text); } catch (e) { data = { rawText: text }; }
        console.log('[email scan] status:', response.status, 'data:', data);

        const resultPayload = (data && typeof data === 'object') ? (data.result ?? data) : data;

        // 💥 HANDLE TOKEN EXPIRE
        if (response.status === 401) {
          alert("Session expired. Please login again.");
          localStorage.removeItem("token");
          window.location.href = "/signup";
          return;
        }

        if (!response.ok || (data && data.success === false)) {
          throw new Error((data && data.message) || `Scan failed (status ${response.status})`);
        }

        setScanResult(resultPayload);
      } catch (error) {
        console.error('[email scan] error:', error);
        setScanResult({ error: true, message: error.message || String(error) });
      } finally {
        setIsScanning(false);
      }

      return;
    }

    let endpoint = '';
    let body = {};

    if (selected === 'website') {
      endpoint = `${API_BASE}/api/scan/website`;
      body = { url: scanValue };
    } else if (selected === 'link') {
      endpoint = `${API_BASE}/api/scan/link`;
      body = { url: scanValue };
    } else {
      alert(`${selected.charAt(0).toUpperCase() + selected.slice(1)} scan is not yet implemented.`);
      setIsScanning(false);
      return;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
        body: JSON.stringify(body),
      });

      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { data = { rawText: text }; }
      console.log('[scan] status:', response.status, 'data:', data);

      const resultPayload = (data && typeof data === 'object') ? (data.result ?? data) : data;

      // 💥 HANDLE TOKEN EXPIRE
      if (response.status === 401) {
        alert("Session expired. Please login again.");
        localStorage.removeItem("token");
        window.location.href = "/signup";
        return;
      }

      if (!response.ok || (data && data.success === false)) {
        throw new Error((data && data.message) || `Scan failed (status ${response.status})`);
      }

      setScanResult(resultPayload);
    } catch (error) {
      console.error('[scan] error:', error);
      setScanResult({ error: true, message: error.message || String(error) });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className={styles["dashboard-root"]}>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className={styles["mobile-overlay"]}
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <aside className={`${styles["profile-sidebar"]} ${sidebarOpen ? styles.open : ''}`} style={{ background: 'linear-gradient(to bottom, #0a0a9e, #161668)', color: 'white' }}>
        <div className={styles["profile-section"]}>
          <Link to="/profile">
            <img
              src={!user ? "/images/defaultprofile.jpg" : user.gender === "Female" ? "/images/girlprofile.jpg" : "/images/manprofile.jpg"}
              alt="Profile"
              className={styles["profile-img"]}
            />
          </Link>
        </div>
        <nav className={styles["sidebar-nav"]}>
          <ul>
            <li><Link to="/" className={styles["home-link"]}>Home</Link></li>
            <li className={selected === "email" ? styles.active : ""} onClick={() => { handleSelection("email"); setSidebarOpen(false); }}>Email Scan</li>
            <li className={selected === "file" ? styles.active : ""} onClick={() => { handleSelection("file"); setSidebarOpen(false); }}>File Scan</li>
            <li className={selected === "link" ? styles.active : ""} onClick={() => { handleSelection("link"); setSidebarOpen(false); }}>Link Scan</li>
            <li className={selected === "website" ? styles.active : ""} onClick={() => { handleSelection("website"); setSidebarOpen(false); }}>Website Scan</li>
            <li className={selected === "spam" ? styles.active : ""} onClick={() => { handleSelection("spam"); setSidebarOpen(false); }}>Message Scan</li>
            {user?.isAdmin && (<li><Link to="/admin" className={styles["admin-link"]}>Admin Panel</Link></li>)}
          </ul>
        </nav>
      </aside>

      <main className={styles["dashboard-main"]}>
        {/* Mobile Menu Toggle */}
        <button 
          className={styles["mobile-menu-toggle"]} 
          onClick={() => setSidebarOpen(!sidebarOpen)}

        >
          ☰ Menu
        </button>
        <h1>Welcome, {user?.name || user?.username || "User"}!</h1>
        <p>Select a scan option to get started</p>
        <div className={styles["scan-container"]} data-aos="zoom-in" data-aos-once="true">
          <ScanInput type={selected} onValueChange={setScanValue} onFileChange={setScanFile} />
          <button className={styles["scan-btn"]} onClick={handleScan} disabled={isScanning}>
            {isScanning ? 'Scanning...' : 'Scan Now'}
          </button>
          <ScanHint type={selected} />
        </div>

        {isScanning
          ? <div className={styles['result-loading']}>Analyzing... Please wait.</div>
          : <ScanResult result={scanResult} />
        }
      </main>
    </div>
  );
}