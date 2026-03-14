// frontend/src/profile.js - MOBILE RESPONSIVE FIXED
import React, { useState, useEffect } from "react";
import styles from "./profile.module.css";
import { useUser } from "./UserContext";
import { useNavigate } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8080";

export default function UserProfile() {
  const { user, setUser, token, logout } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate("/signup");
    // eslint-disable-next-line
  }, [user]);

  const [profile, setProfile] = useState(
    user || { name: "", username: "", email: "", gender: "Male", country: "" }
  );
  const [editMode, setEditMode] = useState(false);
  const [tempProfile, setTempProfile] = useState(profile);
  const [passwordMsg, setPasswordMsg] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState("profile");

  // --- Scan History State ---
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalScans, setTotalScans] = useState(0);

  const fetchHistory = async (page = 1) => {
    if (!token) return;
    try {
      setHistoryLoading(true); setHistoryError("");
      const res = await fetch(`${API_BASE}/api/scan/history?page=${page}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      if (page === 1) { setHistory(data.scans || []); } else { setHistory(prev => [...prev, ...(data.scans || [])]); }
      setHasMore(data.has_more || false);
      setTotalScans(data.total || 0);
      setHistoryPage(page);
    } catch (e) { setHistoryError(e.message); }
    finally { setHistoryLoading(false); }
  };

  useEffect(() => {
    if (sidebarTab === "history" && history.length === 0) fetchHistory(1);
  }, [sidebarTab]); // eslint-disable-line

  const avatarSrc =
    (editMode ? tempProfile?.gender : profile?.gender) === "Female"
      ? "/images/girlprofile.jpg"
      : "/images/manprofile.jpg";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTempProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = () => { setTempProfile(profile); setEditMode(true); };

  const handleSave = async () => {
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/auth/user/${user._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: tempProfile.name,
          username: tempProfile.username,
          gender: tempProfile.gender,
          country: tempProfile.country,
        }),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error("Server did not return JSON"); }
      if (!res.ok) throw new Error(data.message || data.msg || "Update failed");
      setProfile(data.user);
      setUser(data.user);
      setEditMode(false);
    } catch (e) { setError(e.message || "Server error"); }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete your account permanently?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/auth/user/${user._id}`, {
        method: "DELETE",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error("Server did not return JSON"); }
      if (!res.ok) throw new Error(data.message || data.msg || "Delete failed");
      logout();
      navigate("/signup");
    } catch (e) { setError(e.message || "Delete failed"); }
  };

  const handleNavClick = (tab) => {
    setSidebarTab(tab);
    setSidebarOpen(false); // Close sidebar on mobile after click
  };

  if (!user) return null;

  return (
    <div className={styles.container}>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            display: 'block',
            position: 'fixed',
            top: 0, left: 0,
            width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.5)',
            zIndex: 999,
          }}
        />
      )}

      {/* Mobile Menu Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          display: 'none',
          position: 'fixed',
          top: '14px',
          left: '14px',
          zIndex: 1001,
          background: '#2563eb',
          color: 'white',
          border: 'none',
          padding: '10px 16px',
          borderRadius: '8px',
          fontSize: '15px',
          cursor: 'pointer',
          boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
        }}
        className={styles["mobile-menu-toggle"]}
      >
        ☰ Menu
      </button>

      {/* Sidebar */}
      <aside
        className={styles.profileSidebar}
        style={sidebarOpen ? { left: 0 } : {}}
      >
        <h2 className={styles.logo}>PHISHXRAY</h2>
        <nav className={styles.nav}>
          <a href="/" onClick={(e) => e.preventDefault()}>
            🏠 Home
          </a>
          <a
            href="/dashboard"
            onClick={(e) => e.preventDefault()}
          >
            🔍 Dashboard
          </a>
          <a
            href="#"
            className={`${styles.navLink} ${sidebarTab === "profile" ? styles.active : ""}`}
            onClick={(e) => { e.preventDefault(); handleNavClick("profile"); }}
          >
            👤 Profile
          </a>
          <a
            href="#"
            className={`${styles.navLink} ${sidebarTab === "history" ? styles.active : ""}`}
            onClick={(e) => { e.preventDefault(); handleNavClick("history"); }}
          >
            📋 Scan History
          </a>
          <a
            href="#"
            className={`${styles.navLink} ${sidebarTab === "settings" ? styles.active : ""}`}
            onClick={(e) => { e.preventDefault(); handleNavClick("settings"); }}
          >
            ⚙️ Settings
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.card} style={{ position: "relative" }}>

          {/* Edit / Save button */}
          {sidebarTab === "profile" && !editMode && (
            <button
              onClick={handleEdit}
              style={{
                position: "absolute", top: 18, right: 18,
                background: "#3b82f6", border: "none", color: "#fff",
                fontWeight: "bold", fontSize: "0.9rem", cursor: "pointer",
                padding: "8px 16px", borderRadius: "8px", zIndex: 2,
              }}
            >
              Edit Profile
            </button>
          )}
          {sidebarTab === "profile" && editMode && (
            <button
              onClick={handleSave}
              style={{
                position: "absolute", top: 18, right: 18,
                background: "#16a34a", border: "none", color: "#fff",
                fontWeight: "bold", fontSize: "0.9rem", cursor: "pointer",
                padding: "8px 16px", borderRadius: "8px", zIndex: 2,
              }}
            >
              💾 Save
            </button>
          )}

          {/* Profile Header */}
          <div className={styles.profileHeader}>
            <img src={avatarSrc} alt="Avatar" className={styles.avatar} />
            <div className={styles.profileDetails}>
              <h1 className={styles.profileName}>{profile.name || profile.username}</h1>
              <p className={styles.profileEmail}>{profile.email}</p>
            </div>
          </div>

          {error && (
            <div style={{ color: "#dc2626", background: "#fee2e2", padding: "10px 14px", borderRadius: "8px", marginBottom: "12px", fontSize: "0.9rem" }}>
              {error}
            </div>
          )}

          {/* Tab Header */}
          <div className={styles.tabs}>
            <button className={`${styles.tabButton} ${styles.activeTab}`}>
              {sidebarTab === "profile" ? "Personal Info" : sidebarTab === "history" ? "Scan History" : "Security"}
            </button>
          </div>

          {/* Profile Tab */}
          {sidebarTab === "profile" && (
            <div className={styles.tabContent}>
              {[
                { label: "Full Name", name: "name", type: "text" },
                { label: "Username", name: "username", type: "text" },
                { label: "Country", name: "country", type: "text" },
              ].map(({ label, name, type }) => (
                <div className={styles.formGroup} key={name}>
                  <label>{label}</label>
                  <input
                    type={type}
                    name={name}
                    value={editMode ? tempProfile[name] : profile[name]}
                    onChange={handleChange}
                    readOnly={!editMode}
                  />
                </div>
              ))}
              <div className={styles.formGroup}>
                <label>Gender</label>
                <select
                  name="gender"
                  value={editMode ? tempProfile.gender : profile.gender}
                  onChange={handleChange}
                  disabled={!editMode}
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Email</label>
                <input type="text" value={profile.email} readOnly />
              </div>
            </div>
          )}

          {/* History Tab */}
          {sidebarTab === "history" && (
            <div className={styles.tabContent}>
              <style>{`
                .hist-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; }
                .hist-title { font-size:1rem; font-weight:700; color:#1f2937; }
                .hist-total { font-size:0.82rem; color:#6b7280; background:#f3f4f6; padding:4px 10px; border-radius:20px; }
                .hist-card { background:#f8fafc; border-radius:12px; padding:16px; margin-bottom:12px; border-left:5px solid #ccc; transition:transform 0.15s; }
                .hist-card:hover { transform:translateX(4px); }
                .hist-url { font-size:0.82rem; color:#374151; word-break:break-all; margin-bottom:10px; line-height:1.4; font-weight:600; }
                .hist-row { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:6px; }
                .hist-type { color:#fff; border-radius:20px; padding:3px 10px; font-size:0.72rem; font-weight:700; }
                .hist-time { font-size:0.72rem; color:#9ca3af; }
                .hist-verdict { font-weight:700; font-size:0.88rem; }
                .hist-score { font-size:0.72rem; color:#6b7280; margin-top:2px; }
                .hist-badge { color:#fff; border-radius:20px; padding:3px 10px; font-size:0.72rem; font-weight:700; }
                .hist-flags { margin-top:10px; padding-top:10px; border-top:1px solid #e5e7eb; }
                .hist-flags-title { font-size:0.75rem; font-weight:700; color:#374151; margin-bottom:6px; }
                .hist-flag-item { font-size:0.72rem; color:#6b7280; padding:2px 0; }
                .hist-empty { text-align:center; padding:40px 20px; color:#9ca3af; }
                .hist-load-more { width:100%; padding:10px; background:#f3f4f6; border:none; border-radius:10px; font-weight:600; color:#374151; cursor:pointer; margin-top:8px; font-size:0.88rem; transition:background 0.2s; }
                .hist-load-more:hover { background:#e5e7eb; }
                .hist-refresh { background:none; border:none; color:#3b82f6; font-size:0.82rem; font-weight:600; cursor:pointer; padding:4px 8px; border-radius:6px; }
                .hist-refresh:hover { background:#eff6ff; }
              `}</style>

              <div className="hist-header">
                <span className="hist-title">📋 Scan History</span>
                <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                  {totalScans > 0 && <span className="hist-total">{totalScans} total</span>}
                  <button className="hist-refresh" onClick={() => fetchHistory(1)}>🔄 Refresh</button>
                </div>
              </div>

              {historyLoading && history.length === 0 ? (
                <div className="hist-empty">Loading your scans...</div>
              ) : historyError ? (
                <div className="hist-empty" style={{color:'#ef4444'}}>❌ {historyError}</div>
              ) : history.length === 0 ? (
                <div className="hist-empty">
                  📭 No scans yet!<br />
                  <a href="/dashboard" style={{color:'#3b82f6',marginTop:'10px',display:'inline-block',fontWeight:600}}>Go scan something →</a>
                </div>
              ) : (
                <>
                  {history.map((scan) => {
                    const vColor = scan.verdict?.includes('Dangerous') || scan.verdict?.includes('Phishing') ? '#ef4444'
                      : scan.verdict?.includes('Suspicious') ? '#f97316'
                      : scan.verdict?.includes('Moderate') ? '#f59e0b'
                      : '#22c55e';
                    const typeColor = scan.scan_type === 'website' ? '#3b82f6'
                      : scan.scan_type === 'message' ? '#14b8a6'
                      : '#8b5cf6';
                    return (
                      <div key={scan.id} className="hist-card" style={{borderLeftColor: vColor}}>
                        <div className="hist-url">🔗 {scan.url}</div>
                        <div className="hist-row">
                          <span className="hist-type" style={{background: typeColor}}>{scan.scan_type}</span>
                          <span className="hist-time">🕐 {scan.timestamp}</span>
                        </div>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'6px'}}>
                          <div>
                            <div className="hist-verdict" style={{color: vColor}}>{scan.verdict}</div>
                            <div className="hist-score">Score: {scan.risk_score ?? 0}/100</div>
                          </div>
                          <span className="hist-badge" style={{background: vColor}}>{scan.risk_level}</span>
                        </div>
                        {scan.flags && scan.flags.length > 0 && (
                          <div className="hist-flags">
                            <div className="hist-flags-title">⚠️ Issues ({scan.flags.length})</div>
                            {scan.flags.slice(0,3).map((f,i) => (
                              <div key={i} className="hist-flag-item">• {f}</div>
                            ))}
                            {scan.flags.length > 3 && <div className="hist-flag-item" style={{color:'#3b82f6'}}>+{scan.flags.length-3} more...</div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {hasMore && (
                    <button className="hist-load-more" onClick={() => fetchHistory(historyPage + 1)} disabled={historyLoading}>
                      {historyLoading ? 'Loading...' : 'Load More ↓'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {sidebarTab === "settings" && (
            <div className={styles.tabContent}>
              <button
                className={styles.actionButton}
                onClick={() => { setPasswordMsg(true); setTimeout(() => setPasswordMsg(false), 4000); }}
              >
                🔑 Change Password
              </button>
              {passwordMsg && (
                <div className={styles.successMsg}>
                  Password reset link has been sent to your email.
                </div>
              )}
              <button className={styles.deleteButton} onClick={handleDelete}>
                🗑️ Delete Account Permanently
              </button>
              <button className={styles.logoutButton} onClick={logout}>
                🚪 Logout
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}