import React, { useEffect, useState } from 'react';
import './App.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import Dashboard from './dashboard';
import UserProfile from './profile';
import Signup from './signup';
import AdminPanel from './admin';
import Forbidden from './forbidden';
import NotFound from './NotFound';
import { UserProvider, useUser } from './UserContext';

// Coming Soon Popup
const ComingSoonPopup = ({ onClose }) => (
  <>
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.6)',
      zIndex: 9998,
    }} />
    <div style={{
      position: 'fixed',
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 9999,
      background: 'linear-gradient(135deg, #15156b 0%, #1a237e 60%, #1565c0 100%)',
      borderRadius: '20px',
      padding: '40px 36px',
      textAlign: 'center',
      minWidth: '280px',
      maxWidth: '90vw',
      boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      border: '1px solid rgba(255,255,255,0.12)',
      animation: 'popupIn 0.4s cubic-bezier(.22,1,.36,1)',
    }}>
      <style>{`@keyframes popupIn { from { opacity:0; transform:translate(-50%,-50%) scale(0.85); } to { opacity:1; transform:translate(-50%,-50%) scale(1); } }`}</style>
      <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🚀</div>
      <h2 style={{ color: '#38bdf8', fontWeight: 800, fontSize: '1.4rem', marginBottom: '10px' }}>Coming Soon!</h2>
      <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '24px' }}>
        The PhishXray Community is under construction.<br />Stay tuned for something awesome!
      </p>
      <button onClick={onClose} style={{
        background: 'linear-gradient(90deg, #38bdf8, #15156b)',
        color: '#fff', border: 'none', borderRadius: '10px',
        padding: '11px 28px', fontWeight: 700, fontSize: '0.95rem',
        cursor: 'pointer',
      }}>Got it!</button>
    </div>
  </>
);

const AppContent = () => {
  const [navOpen, setNavOpen] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const navigate = useNavigate();
  const { user } = useUser();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const avatarSrc = !user
    ? "/images/defaultprofile.jpg"
    : user.gender === "Female"
    ? "/images/girlprofile.jpg"
    : "/images/manprofile.jpg";

  useEffect(() => {
    AOS.init({ duration: 1000, once: true });
  }, []);

  return (
    <>
      {showPopup && <ComingSoonPopup onClose={() => setShowPopup(false)} />}

      <Routes>
        <Route
          path="/"
          element={
            <>
              <nav className="navbar">
                <div className="logo" onClick={scrollToTop} style={{ cursor: 'pointer' }}>PhishXray</div>
                <div className={`nav-container${navOpen ? ' open' : ''}`}>
                  <ul className={`nav-links${navOpen ? ' open' : ''}`}>
                    <li><Link to="/dashboard" onClick={() => setNavOpen(false)}>Scan</Link></li>
                    <li onClick={() => { setNavOpen(false); setShowPopup(true); }} style={{ cursor: 'pointer' }}>Community</li>
                  </ul>
                  <div className="profile-icon cursor-pointer" title="Profile">
                    <Link to="/profile">
                      <img src={avatarSrc} alt="Profile Icon"
                        style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                    </Link>
                  </div>
                  <div
                    className={`hamburger${navOpen ? ' open' : ''}`}
                    onClick={() => setNavOpen(!navOpen)}
                    aria-label="Toggle navigation"
                  >
                    <span /><span /><span />
                  </div>
                </div>
              </nav>

              {/* Hero Section */}
              <section className="hero">
                <div className="hero-content">
                  <img src="/images/phishxraylogo.png" alt="PhishXray Logo" className="hero-logo" data-aos="fade-right" />
                  <div className="hero-text" data-aos="fade-left">
                    <h1>PhishXray – Your First Line of Defense Against Phishing!</h1>
                    <p>🔍 Check any email, link, or website for potential phishing threats.</p>
                    <p>Instant alerts when a scam is detected! Stay vigilant & browse safely.</p>
                    <button
                      className="hero-button"
                      type="button"
                      onClick={() => navigate('/signup')}
                    >
                      Get Started
                    </button>
                  </div>
                </div>
              </section>

              {/* Features */}
              <section className="features">
                <h2>PhishXray Features</h2>
                <div className="cards-container">
                  {[
                    { icon: 'fa-envelope', title: 'Email Scan', text: 'Upload .eml or .msg files to detect phishing attempts hidden in email headers, links, and attachments.', color: '#3b82f6' },
                    { icon: 'fa-link', title: 'Link Scan', text: 'Instantly check any suspicious URL against real-time threat databases and behavioral patterns.', color: '#8b5cf6' },
                    { icon: 'fa-globe', title: 'Website Scan', text: 'Deep analysis — SSL certificate, domain age, WHOIS, and risk scoring for any website.', color: '#06b6d4' },
                    { icon: 'fa-comment-dots', title: 'Message Scan', text: 'Detect scam SMS and messages using behavioral AI — urgency, impersonation, reward bait and more.', color: '#10b981' },
                  ].map((feature, idx) => (
                    <div className="feature-card" data-aos={idx % 2 === 0 ? 'fade-up' : 'fade-up'} data-aos-delay={idx * 100} key={feature.title}>
                      <div className="feature-icon" style={{ background: `${feature.color}18`, color: feature.color }}>
                        <i className={`fas ${feature.icon}`}></i>
                      </div>
                      <div className="feature-title">{feature.title}</div>
                      <p className="feature-text">{feature.text}</p>
                      <div className="feature-bar" style={{ background: feature.color }} />
                    </div>
                  ))}
                </div>
              </section>

              {/* Statistics */}
              <section className="statistics" data-aos="fade-up">
                <h1 className="section-title">📊 Real-Time Threat Reports</h1>
                <p className="section-subtitle">Live insights to monitor, track, and act on phishing threats around the globe.</p>
                <div className="chart">
                  <img src='./images/phishing_report.png' alt="Phishing Report" />
                </div>
              </section>

              {/* CTA */}
              <section className="cta" data-aos="fade-up">
                <div className="cta-content">
                  <div className="cta-text">
                    <h1>Join the PhishXray Community</h1>
                    <p>Stay one step ahead of phishing attacks by joining a growing community of cybersecurity-aware users.</p>
                    <p>Whether you're a beginner or a pro, PhishXray empowers you to stay protected and protect others.</p>
                    <h2>Why Join PhishXray?</h2>
                    <ul className="cta-features">
                      <li>✅ <strong>Early Alerts</strong> – Be the first to know about new phishing threats.</li>
                      <li>🛡️ <strong>Community Support</strong> – Share experiences, get advice & tips from cybersecurity enthusiasts.</li>
                      <li>📊 <strong>Report & Analyze</strong> – Contribute by reporting suspicious emails, links, or websites.</li>
                      <li>🚀 <strong>Access Exclusive Features</strong> – Unlock tools, tutorials & in-depth phishing analysis.</li>
                      <li>💬 <strong>Direct Interaction</strong> – Talk with experts, participate in discussions, and grow with the community.</li>
                    </ul>
                    <button
                      className="cta-button"
                      type="button"
                      onClick={() => setShowPopup(true)}
                    >
                      Join Community
                    </button>
                  </div>
                  <div className="cta-image">
                    <img src="./images/women.png" alt="PhishXray Community" />
                  </div>
                </div>
              </section>

              {/* Contact */}
              <section className="contact">
                <h2>Contact Us</h2>
                <form onSubmit={e => { e.preventDefault(); setShowPopup(true); }}>
                  <input type="text" placeholder="Full Name" required />
                  <input type="email" placeholder="Email" required />
                  <input type="tel" placeholder="Contact Number" required />
                  <textarea placeholder="Your Message" required></textarea>
                  <button type="submit">Submit</button>
                </form>
                <br />
                <h3>Join Our Community</h3>
                <div className="social-icons">
                  <a href="https://facebook.com" target="_blank" rel="noreferrer"><i className="fab fa-facebook-f"></i></a>
                  <a href="https://instagram.com" target="_blank" rel="noreferrer"><i className="fab fa-instagram"></i></a>
                  <a href="https://discord.com" target="_blank" rel="noreferrer"><i className="fab fa-discord"></i></a>
                  <a href="https://twitter.com" target="_blank" rel="noreferrer"><i className="fab fa-twitter"></i></a>
                  <a href="https://youtube.com" target="_blank" rel="noreferrer"><i className="fab fa-youtube"></i></a>
                </div>
              </section>

              {/* Footer */}
              <footer>
                <p>© 2025 PhishXray. All Rights Reserved.</p>
                <div className="footer-links">
                  <span onClick={() => setShowPopup(true)} style={{ cursor: 'pointer', color: 'lightblue', margin: '0 10px' }}>Privacy Policy</span>
                  <span onClick={() => setShowPopup(true)} style={{ cursor: 'pointer', color: 'lightblue', margin: '0 10px' }}>Terms of Service</span>
                </div>
              </footer>
            </>
          }
        />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/forbidden" element={<Forbidden />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

export default function App() {
  return (
    <UserProvider>
      <Router>
        <AppContent />
      </Router>
    </UserProvider>
  );
}