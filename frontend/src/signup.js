// frontend/src/signup.js
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import lottie from 'lottie-web';
import { useUser } from './UserContext';
import './Signup.css';

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8080";

export default function Signup() {
  const navigate = useNavigate();
  const animContainer = useRef(null);
  const { user, setUserAndToken } = useUser();

  const [isLoginMode, setIsLoginMode] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotError, setForgotError] = useState('');

  const url = isLoginMode ? `${API_BASE}/api/auth/login` : `${API_BASE}/api/auth/signup`;

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
    const anim = lottie.loadAnimation({
      container: animContainer.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: process.env.PUBLIC_URL + '/images/anime_signup.json',
    });
    return () => anim.destroy();
    // eslint-disable-next-line
  }, [user]);

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(''); setError('');

    const payload = isLoginMode
      ? { email: form.email, password: form.password }
      : {
          username: form.username || (form.email ? form.email.split('@')[0] : ''),
          email: form.email,
          password: form.password
        };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error('Server did not return JSON'); }
      if (!res.ok) throw new Error(data.message || data.msg || 'Request failed');

      const resolvedUser = data.user || {
        username: payload.username,
        email: payload.email,
        gender: data.gender || 'Male',
        _id: data._id || undefined,
        isAdmin: data.user?.isAdmin || data.isAdmin || false
      };

      setUserAndToken(resolvedUser, data.token);

      if (data.message && data.message.toLowerCase().includes("blocked")) {
        setError(data.message);
        return;
      }

      setMessage(data.message || data.msg || (isLoginMode ? 'Login successful' : 'Signup successful'));
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Something went wrong');
    }
  }

  async function handleForgotSubmit(e) {
    e.preventDefault();
    setForgotMsg(''); setForgotError('');
    if (!forgotEmail) { setForgotError('Email required'); return; }
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const text = await res.text();
      let data; try { data = JSON.parse(text); } catch { throw new Error('Server did not return JSON'); }
      if (!res.ok) throw new Error(data.message || data.msg || 'Request failed');
      if (data.resetToken) {
        setResetToken(data.resetToken);
        setForgotMsg('Reset token generated (dev). Token shown below & printed on server.');
      } else {
        setForgotMsg(data.msg || 'If account exists, a reset link was sent.');
      }
    } catch (err) {
      setForgotError(err.message || 'Failed to request reset');
    }
  }

  async function handleResetSubmit(e) {
    e.preventDefault();
    setForgotMsg(''); setForgotError('');
    const tokenToUse = resetToken || (new URLSearchParams(window.location.search).get('token')) || '';
    if (!tokenToUse) return setForgotError('No reset token provided.');
    if (!newPassword) return setForgotError('New password required.');
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password/${tokenToUse}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      });
      const text = await res.text();
      let data; try { data = JSON.parse(text); } catch { throw new Error('Server did not return JSON'); }
      if (!res.ok) throw new Error(data.message || data.msg || 'Request failed');
      setForgotMsg(data.msg || 'Password reset successful. You may now login.');
      setForgotMode(false); setResetToken(''); setNewPassword('');
    } catch (err) {
      setForgotError(err.message || 'Reset failed');
    }
  }

  return (
    <div className="signup-wrapper">
      <div className="container">
        <div className="left">
          <h2>Join PhishXray</h2>
          <p>Secure your digital presence & join our trusted community.</p>
          <div id="authBox">
            {!forgotMode ? (
              <form onSubmit={handleSubmit}>
                {!isLoginMode && (
                  <div className="input-group">
                    <input type="text" name="username" placeholder="Full Name"
                      value={form.username} onChange={handleChange} required />
                  </div>
                )}
                <div className="input-group">
                  <input type="email" name="email" placeholder="Email"
                    value={form.email} onChange={handleChange} required />
                </div>
                <div className="input-group">
                  <input type="password" name="password" placeholder="Password"
                    value={form.password} onChange={handleChange} required />
                </div>
                {isLoginMode && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                    <span style={{ color: '#00c6ff', cursor: 'pointer', fontSize: '0.95rem' }}
                      onClick={() => { setForgotMode(true); setForgotMsg(''); setForgotError(''); }}>
                      Forgot password?
                    </span>
                  </div>
                )}
                <button className="btn" type="submit">{isLoginMode ? 'Login' : 'Sign Up'}</button>
              </form>
            ) : (
              <>
                <form onSubmit={handleForgotSubmit}>
                  <div className="input-group">
                    <input type="email" placeholder="Your account email"
                      value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required />
                  </div>
                  <button className="btn" type="submit">Send reset token (dev)</button>
                </form>
                {resetToken && (
                  <div style={{ marginTop: 12 }}>
                    <div>Dev reset token:</div>
                    <code style={{ wordBreak: 'break-all' }}>{resetToken}</code>
                    <form onSubmit={handleResetSubmit} style={{ marginTop: 12 }}>
                      <div className="input-group">
                        <input type="password" placeholder="New password"
                          value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                      </div>
                      <button className="btn" type="submit">Reset password</button>
                    </form>
                  </div>
                )}
              </>
            )}
            <div className="switch" style={{ marginTop: 14 }}>
              {!forgotMode ? (
                <>
                  {isLoginMode ? "Don't have an account?" : 'Already have an account?'}{' '}
                  <span onClick={() => { setIsLoginMode(prev => !prev); setMessage(''); setError(''); }}>
                    {isLoginMode ? 'Sign Up' : 'Login'}
                  </span>
                </>
              ) : (
                <span style={{ color: '#00c6ff', cursor: 'pointer' }}
                  onClick={() => { setForgotMode(false); setForgotMsg(''); setForgotError(''); }}>
                  Back to login
                </span>
              )}
            </div>
            <div className="social-login" style={{ marginTop: 18 }}>
              <button onClick={(e) => { e.preventDefault(); setMessage('Google login not implemented'); }}>
                Google
              </button>
            </div>
            {message && <p className="success" style={{ color: '#dff6ff', marginTop: 12 }}>{message}</p>}
            {error && <p className="error" style={{ color: '#ffd6d6', marginTop: 12 }}>{error}</p>}
            {forgotMsg && <p className="success" style={{ color: '#dff6ff', marginTop: 12 }}>{forgotMsg}</p>}
            {forgotError && <p className="error" style={{ color: '#ffd6d6', marginTop: 12 }}>{forgotError}</p>}
          </div>
        </div>
        <div className="right">
          <h2>Welcome</h2>
          <p>Login to explore phishing detection tools.</p>
          <div ref={animContainer} style={{ width: 260, marginTop: 24 }} />
        </div>
      </div>
    </div>
  );
}