// frontend/src/admin.js - MOBILE RESPONSIVE FIXED
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from './UserContext';

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8080";

const adminStyles = `
  *, *::before, *::after { box-sizing: border-box; }
  .admin-wrap { min-height: 100vh; background: #f0f2f8; padding: 24px 16px; }
  .admin-header { text-align: center; margin-bottom: 28px; }
  .admin-header h2 { font-size: 1.8rem; font-weight: 800; color: #1a237e; margin: 0; }
  .admin-msg-bar { text-align: center; padding: 10px 16px; border-radius: 8px; margin-bottom: 16px; font-weight: 600; font-size: 0.95rem; }
  .stats-grid { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; margin-bottom: 28px; }
  .stat-card { background: #fff; border-radius: 12px; padding: 14px 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); min-width: 100px; text-align: center; flex: 1 1 90px; max-width: 150px; }
  .stat-value { font-size: 1.8rem; font-weight: 800; line-height: 1; }
  .stat-label { font-size: 0.75rem; color: #666; margin-top: 5px; }
  .admin-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
  .admin-card { background: #fff; border-radius: 14px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.07); }
  .admin-card h3 { font-size: 1.05rem; font-weight: 700; color: #1a237e; margin: 0 0 16px 0; }
  .admin-table-wrap { overflow-x: auto; }
  .admin-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  .admin-table th { background: #f5f7fa; color: #333; padding: 10px 8px; text-align: left; font-weight: 700; white-space: nowrap; }
  .admin-table td { padding: 9px 8px; border-bottom: 1px solid #f0f0f0; color: #333; word-break: break-word; max-width: 130px; }
  .status-active { color: #27ae60; font-weight: 700; }
  .status-blocked { color: #e53935; font-weight: 700; }
  .action-btn { padding: 5px 11px; border: none; border-radius: 6px; font-size: 0.8rem; font-weight: 700; cursor: pointer; }
  .btn-block { background: #e53935; color: #fff; }
  .btn-unblock { background: #27ae60; color: #fff; }
  .filters-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
  .filters-row select { flex: 1 1 110px; padding: 8px 10px; border-radius: 8px; border: 1px solid #ddd; font-size: 0.88rem; background: #fff; }
  .refresh-btn { padding: 8px 16px; border-radius: 8px; border: none; background: #1a237e; color: #fff; font-weight: 700; font-size: 0.88rem; cursor: pointer; white-space: nowrap; }
  .scans-list { display: flex; flex-direction: column; gap: 10px; max-height: 520px; overflow-y: auto; padding-right: 2px; }
  .scan-card { background: #f8f9fc; border-radius: 10px; padding: 12px; border-left: 5px solid #ccc; transition: transform 0.15s; }
  .scan-card:hover { transform: translateX(3px); }
  .scan-url { font-size: 0.78rem; color: #444; word-break: break-all; margin-bottom: 8px; line-height: 1.4; }
  .scan-meta { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 4px; margin-bottom: 6px; }
  .scan-type-badge { color: #fff; border-radius: 20px; padding: 2px 9px; font-size: 0.72rem; font-weight: 700; }
  .scan-time { font-size: 0.72rem; color: #888; }
  .scan-verdict-row { display: flex; justify-content: space-between; align-items: center; gap: 6px; }
  .scan-verdict-text { font-weight: 700; font-size: 0.85rem; }
  .scan-score { font-size: 0.72rem; color: #666; }
  .risk-badge { color: #fff; border-radius: 20px; padding: 2px 9px; font-size: 0.72rem; font-weight: 700; }
  .empty-state { text-align: center; padding: 32px; color: #999; font-size: 0.9rem; }
  .admin-loading { text-align: center; padding: 60px 20px; font-size: 1.1rem; color: #1a237e; font-weight: 600; }

  @media (max-width: 768px) {
    .admin-wrap { padding: 14px 10px; }
    .admin-header h2 { font-size: 1.3rem; }
    .admin-grid { grid-template-columns: 1fr; }
    .stat-card { max-width: none; flex: 1 1 80px; }
    .filters-row { flex-direction: column; }
    .filters-row select { width: 100%; }
    .refresh-btn { width: 100%; text-align: center; }
    .admin-table th, .admin-table td { padding: 7px 5px; font-size: 0.78rem; }
    .scans-list { max-height: 400px; }
  }

  @media (max-width: 480px) {
    .stat-value { font-size: 1.4rem; }
    .admin-card { padding: 12px; }
    .admin-card h3 { font-size: 0.95rem; }
  }
`;

export default function AdminPanel() {
  const { user, token } = useUser();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [scans, setScans] = useState([]);
  const [scansLoading, setScansLoading] = useState(false);
  const [scansError, setScansError] = useState('');
  const [stats, setStats] = useState(null);
  const [verdictFilter, setVerdictFilter] = useState('');
  const [scanTypeFilter, setScanTypeFilter] = useState('');

  const fetchUsers = useCallback(async () => {
    if (!token) { setLoading(false); setError("Not logged in."); return; }
    try {
      setLoading(true); setError('');
      const res = await fetch(`${API_BASE}/api/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) { const d = await res.json(); throw new Error(d.msg || d.message || 'Failed'); }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [token]);

  const fetchScans = useCallback(async () => {
    if (!token) return;
    try {
      setScansLoading(true); setScansError('');
      let url = `${API_BASE}/api/admin/scans?limit=100`;
      if (verdictFilter) url += `&verdict=${verdictFilter}`;
      if (scanTypeFilter) url += `&scan_type=${scanTypeFilter}`;
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch scans');
      const data = await res.json();
      setScans(data.scans || []);
    } catch (err) { setScansError(err.message); }
    finally { setScansLoading(false); }
  }, [token, verdictFilter, scanTypeFilter]);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/scans/stats`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      setStats(data.stats);
    } catch (err) { console.error(err); }
  }, [token]);

  useEffect(() => {
    if (!user && !token) { navigate('/signup'); return; }
    if (user && !user.isAdmin) { navigate('/forbidden'); return; }
    if (user && token) { fetchUsers(); fetchStats(); fetchScans(); }
    else { setLoading(false); }
  }, [user, token, navigate, fetchUsers, fetchStats, fetchScans]);

  const handleToggleBlock = async (userId, isBlocked) => {
    setMessage(''); setError('');
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ blocked: !isBlocked })
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Failed'); }
      setUsers(users.map(u => u._id === userId ? { ...u, blocked: !isBlocked } : u));
      setMessage(`User ${isBlocked ? 'unblocked' : 'blocked'} successfully.`);
    } catch (err) { setError(err.message); }
  };

  const verdictColor = (v = '') => {
    if (v.includes('Dangerous') || v.includes('Phishing')) return '#e74c3c';
    if (v.includes('Suspicious')) return '#e67e22';
    if (v.includes('Moderate')) return '#f39c12';
    if (v.includes('Safe')) return '#27ae60';
    return '#888';
  };

  const userStats = users.length > 0 ? {
    total: users.length,
    active: users.filter(u => !u.blocked).length,
    blocked: users.filter(u => u.blocked).length,
  } : null;

  if (loading) return <><style>{adminStyles}</style><div className="admin-loading">Loading Dashboard...</div></>;

  return (
    <>
      <style>{adminStyles}</style>
      <div className="admin-wrap">
        <div className="admin-header"><h2>🛡️ Admin Dashboard</h2></div>

        {message && <div className="admin-msg-bar" style={{ background: '#e8f5e9', color: '#1b5e20' }}>✅ {message}</div>}
        {error && <div className="admin-msg-bar" style={{ background: '#ffebee', color: '#b71c1c' }}>❌ {error}</div>}

        {/* Stats */}
        <div className="stats-grid">
          {userStats && [
            { label: 'Total Users', value: userStats.total, color: '#1a237e' },
            { label: 'Active', value: userStats.active, color: '#27ae60' },
            { label: 'Blocked', value: userStats.blocked, color: '#e53935' },
          ].map(({ label, value, color }) => (
            <div className="stat-card" key={label} style={{ borderTop: `4px solid ${color}` }}>
              <div className="stat-value" style={{ color }}>{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
          {stats && [
            { label: 'Total Scans', value: stats.total_scans, color: '#1a237e' },
            { label: 'Dangerous', value: stats.dangerous, color: '#e74c3c' },
            { label: 'Suspicious', value: stats.suspicious, color: '#e67e22' },
            { label: 'Safe', value: stats.safe, color: '#27ae60' },
            { label: 'Website', value: stats.website_scans, color: '#3498db' },
            { label: 'Links', value: stats.link_scans, color: '#9b59b6' },
          ].map(({ label, value, color }) => (
            <div className="stat-card" key={label} style={{ borderTop: `4px solid ${color}` }}>
              <div className="stat-value" style={{ color }}>{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="admin-grid">
          {/* Users */}
          <div className="admin-card">
            <h3>👥 User Management</h3>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {users.length > 0 ? users.map(u => (
                    <tr key={u._id}>
                      <td>{u.name || u.username}</td>
                      <td style={{ fontSize: '0.75rem' }}>{u.email}</td>
                      <td>{u.role}</td>
                      <td><span className={u.blocked ? 'status-blocked' : 'status-active'}>{u.blocked ? 'Blocked' : 'Active'}</span></td>
                      <td>
                        <button className={`action-btn ${u.blocked ? 'btn-unblock' : 'btn-block'}`} onClick={() => handleToggleBlock(u._id, u.blocked)}>
                          {u.blocked ? 'Unblock' : 'Block'}
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No users found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Scans */}
          <div className="admin-card">
            <h3>🔍 Scan Logs</h3>
            <div className="filters-row">
              <select value={verdictFilter} onChange={e => setVerdictFilter(e.target.value)}>
                <option value="">All Verdicts</option>
                <option value="Dangerous">Dangerous</option>
                <option value="Suspicious">Suspicious</option>
                <option value="Moderate">Moderate</option>
                <option value="Safe">Safe</option>
              </select>
              <select value={scanTypeFilter} onChange={e => setScanTypeFilter(e.target.value)}>
                <option value="">All Types</option>
                <option value="website">Website</option>
                <option value="link">Link</option>
                <option value="message">Message</option>
              </select>
              <button className="refresh-btn" onClick={fetchScans}>🔄 Refresh</button>
            </div>

            {scansLoading ? (
              <div className="empty-state">Loading...</div>
            ) : scansError ? (
              <div className="empty-state" style={{ color: '#e53935' }}>Error: {scansError}</div>
            ) : (
              <div className="scans-list">
                {scans.length > 0 ? scans.map((scan, i) => (
                  <div key={i} className="scan-card" style={{ borderLeftColor: verdictColor(scan.verdict) }}>
                    <div className="scan-url"><strong>URL:</strong> {scan.url}</div>
                    <div className="scan-meta">
                      <span className="scan-type-badge" style={{ background: scan.scan_type === 'website' ? '#3498db' : scan.scan_type === 'message' ? '#16a085' : '#9b59b6' }}>
                        {scan.scan_type}
                      </span>
                      <span className="scan-time">{scan.timestamp}</span>
                    </div>
                    <div className="scan-verdict-row">
                      <div>
                        <div className="scan-verdict-text" style={{ color: verdictColor(scan.verdict) }}>{scan.verdict}</div>
                        <div className="scan-score">Score: {scan.risk_score ?? 0}/100</div>
                      </div>
                      <span className="risk-badge" style={{ background: verdictColor(scan.verdict) }}>{scan.risk_level || 'N/A'}</span>
                    </div>
                  </div>
                )) : <div className="empty-state">Koi scan nahi mila!</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}