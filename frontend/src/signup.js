// frontend/src/signup.js
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from './UserContext';
import './Signup.css';

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8080";

export default function Signup() {
  const navigate = useNavigate();
  const { user, setUserAndToken } = useUser();

  const [isLoginMode, setIsLoginMode] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot/reset
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotError, setForgotError] = useState('');

  const url = isLoginMode ? `${API_BASE}/api/auth/login` : `${API_BASE}/api/auth/signup`;

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
    // eslint-disable-next-line
  }, [user]);

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  // Password strength
  const getPasswordStrength = (pwd) => {
    if (!pwd) return null;
    if (pwd.length < 6) return { label: 'Weak', color: '#ef4444', width: '30%' };
    if (pwd.length < 8 || !/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) return { label: 'Medium', color: '#f59e0b', width: '60%' };
    return { label: 'Strong', color: '#22c55e', width: '100%' };
  };
  const strength = !isLoginMode ? getPasswordStrength(form.password) : null;

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(''); setError('');

    // Email lowercase — case insensitive fix
    const emailLower = form.email.trim().toLowerCase();

    const payload = isLoginMode
      ? { email: emailLower, password: form.password }
      : {
          username: form.username.trim() || emailLower.split('@')[0],
          email: emailLower,
          password: form.password
        };

    setLoading(true);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error('Server error. Please try again.'); }

      if (!res.ok) throw new Error(data.message || data.msg || 'Invalid credentials');

      const resolvedUser = data.user || {
        username: payload.username,
        email: payload.email,
        gender: 'Male',
        _id: data._id,
        isAdmin: data.user?.isAdmin || data.isAdmin || false
      };

      setUserAndToken(resolvedUser, data.token);

      if (data.message?.toLowerCase().includes("blocked")) {
        setError(data.message);
        return;
      }

      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotSubmit(e) {
    e.preventDefault();
    setForgotMsg(''); setForgotError('');
    if (!forgotEmail) { setForgotError('Email required'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase() })
      });
      const text = await res.text();
      let data; try { data = JSON.parse(text); } catch { throw new Error('Server error'); }
      if (!res.ok) throw new Error(data.message || 'Request failed');
      if (data.resetToken) {
        setResetToken(data.resetToken);
        setForgotMsg('Reset token generated. Enter new password below.');
      } else {
        setForgotMsg(data.msg || 'If account exists, a reset link was sent.');
      }
    } catch (err) {
      setForgotError(err.message || 'Failed to request reset');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetSubmit(e) {
    e.preventDefault();
    setForgotMsg(''); setForgotError('');
    const tokenToUse = resetToken || new URLSearchParams(window.location.search).get('token') || '';
    if (!tokenToUse) return setForgotError('No reset token provided.');
    if (!newPassword) return setForgotError('New password required.');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password/${tokenToUse}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      });
      const text = await res.text();
      let data; try { data = JSON.parse(text); } catch { throw new Error('Server error'); }
      if (!res.ok) throw new Error(data.message || 'Reset failed');
      setForgotMsg('Password reset successful! You can now login.');
      setForgotMode(false); setResetToken(''); setNewPassword('');
    } catch (err) {
      setForgotError(err.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  }

  const switchMode = () => {
    setIsLoginMode(prev => !prev);
    setMessage(''); setError('');
    setForm({ username: '', email: '', password: '' });
  };

  return (
    <div className="auth-root">
      {/* Background glow effects */}
      <div className="auth-glow auth-glow-1" />
      <div className="auth-glow auth-glow-2" />

      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">🛡️</div>
          <span className="auth-logo-text">PhishXray</span>
        </div>

        {/* Title */}
        <div className="auth-header">
          <h1 className="auth-title">
            {forgotMode ? 'Reset Password' : isLoginMode ? 'Welcome Back!' : 'Get Started Free'}
          </h1>
          <p className="auth-subtitle">
            {forgotMode ? 'Enter your email to reset your password'
              : isLoginMode ? 'Login to your PhishXray account'
              : 'Create your account — it\'s free forever'}
          </p>
        </div>

        {/* Form */}
        <div className="auth-form-wrap">
          {!forgotMode ? (
            <form onSubmit={handleSubmit} className="auth-form">

              {/* Username — only signup */}
              {!isLoginMode && (
                <div className="auth-field">
                  <label className="auth-label">Username</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon">👤</span>
                    <input
                      type="text" name="username"
                      placeholder="@username"
                      value={form.username}
                      onChange={handleChange}
                      className="auth-input"
                      required
                      autoComplete="username"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="auth-field">
                <label className="auth-label">Email Address</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">✉️</span>
                  <input
                    type="email" name="email"
                    placeholder="yourname@gmail.com"
                    value={form.email}
                    onChange={handleChange}
                    className="auth-input"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="auth-field">
                <div className="auth-label-row">
                  <label className="auth-label">Password</label>
                  {isLoginMode && (
                    <span className="auth-forgot-link"
                      onClick={() => { setForgotMode(true); setForgotMsg(''); setForgotError(''); }}>
                      Forgot password?
                    </span>
                  )}
                </div>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">🔑</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={handleChange}
                    className="auth-input"
                    required
                    autoComplete={isLoginMode ? 'current-password' : 'new-password'}
                  />
                  <button type="button" className="auth-eye-btn"
                    onClick={() => setShowPassword(p => !p)}>
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {/* Password strength — only signup */}
                {!isLoginMode && strength && (
                  <div className="auth-strength">
                    <div className="auth-strength-bar">
                      <div className="auth-strength-fill"
                        style={{ width: strength.width, background: strength.color }} />
                    </div>
                    <span style={{ color: strength.color, fontSize: '11px', fontWeight: 600 }}>
                      {strength.label}
                    </span>
                  </div>
                )}
              </div>

              {/* Error/Success */}
              <div className="auth-msg-area">
                {error && <div className="auth-error">⚠️ {error}</div>}
                {message && <div className="auth-success">✅ {message}</div>}
              </div>

              {/* Submit */}
              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? (
                  <span className="auth-spinner" />
                ) : (
                  isLoginMode ? 'Sign In' : 'Create Account'
                )}
              </button>

              {/* Switch mode */}
              <div className="auth-switch">
                {isLoginMode ? "Don't have an account?" : 'Already have an account?'}
                {' '}
                <span onClick={switchMode}>
                  {isLoginMode ? 'Sign Up' : 'Login'}
                </span>
              </div>

              {/* Divider */}
              <div className="auth-divider">
                <span>or continue with</span>
              </div>

              {/* Social */}
              <button type="button" className="auth-google-btn"
                onClick={() => setMessage('Google login coming soon!')}>
                <span>G</span> Google
              </button>

            </form>
          ) : (
            // Forgot Password Form
            <div className="auth-form">
              {!resetToken ? (
                <form onSubmit={handleForgotSubmit}>
                  <div className="auth-field">
                    <label className="auth-label">Your Account Email</label>
                    <div className="auth-input-wrap">
                      <span className="auth-input-icon">✉️</span>
                      <input type="email" placeholder="yourname@gmail.com"
                        value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                        className="auth-input" required />
                    </div>
                  </div>
                  <div className="auth-msg-area">
                    {forgotError && <div className="auth-error">⚠️ {forgotError}</div>}
                    {forgotMsg && <div className="auth-success">✅ {forgotMsg}</div>}
                  </div>
                  <button type="submit" className="auth-submit-btn" disabled={loading}>
                    {loading ? <span className="auth-spinner" /> : 'Send Reset Token'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetSubmit}>
                  <div className="auth-field">
                    <label className="auth-label">New Password</label>
                    <div className="auth-input-wrap">
                      <span className="auth-input-icon">🔑</span>
                      <input type="password" placeholder="Enter new password"
                        value={newPassword} onChange={e => setNewPassword(e.target.value)}
                        className="auth-input" required />
                    </div>
                  </div>
                  <div className="auth-msg-area">
                    {forgotError && <div className="auth-error">⚠️ {forgotError}</div>}
                    {forgotMsg && <div className="auth-success">✅ {forgotMsg}</div>}
                  </div>
                  <button type="submit" className="auth-submit-btn" disabled={loading}>
                    {loading ? <span className="auth-spinner" /> : 'Reset Password'}
                  </button>
                </form>
              )}
              <div className="auth-switch" style={{ marginTop: 16 }}>
                <span onClick={() => { setForgotMode(false); setForgotMsg(''); setForgotError(''); }}>
                  ← Back to Login
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}