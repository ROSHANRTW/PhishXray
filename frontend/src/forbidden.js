import React, { useEffect, useRef } from "react";

export default function Forbidden() {
  const canvasRef = useRef(null);

  // Animated particle background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 55 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.8 + 0.4,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4,
      opacity: Math.random() * 0.5 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56, 189, 248, ${p.opacity})`;
        ctx.fill();
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
      });
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;800&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        .forbidden-root {
          min-height: 100vh;
          width: 100vw;
          background: linear-gradient(135deg, #060620 0%, #0a0a4a 40%, #0d1060 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Space Grotesk', 'Segoe UI', sans-serif;
          position: relative;
          overflow: hidden;
          padding: 20px;
        }

        .forbidden-canvas {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }

        /* Glowing orbs */
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          z-index: 0;
        }
        .orb-1 {
          width: 400px; height: 400px;
          background: rgba(21, 21, 107, 0.6);
          top: -100px; left: -100px;
        }
        .orb-2 {
          width: 300px; height: 300px;
          background: rgba(56, 189, 248, 0.12);
          bottom: -80px; right: -80px;
        }
        .orb-3 {
          width: 200px; height: 200px;
          background: rgba(239, 68, 68, 0.08);
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
        }

        .forbidden-card {
          position: relative;
          z-index: 1;
          text-align: center;
          max-width: 520px;
          width: 100%;
          padding: 52px 44px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 28px;
          backdrop-filter: blur(20px);
          box-shadow:
            0 0 0 1px rgba(56, 189, 248, 0.08),
            0 32px 80px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255,255,255,0.06);
          animation: cardIn 0.7s cubic-bezier(.22,1,.36,1) both;
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(40px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Shield icon */
        .shield-wrap {
          margin: 0 auto 28px;
          width: 90px; height: 90px;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.12);
          border: 2px solid rgba(239, 68, 68, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: pulse 2.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.3); }
          50%       { box-shadow: 0 0 0 14px rgba(239,68,68,0); }
        }

        .shield-icon {
          font-size: 2.6rem;
          animation: shake 4s ease-in-out infinite;
        }

        @keyframes shake {
          0%, 85%, 100% { transform: rotate(0deg); }
          88%  { transform: rotate(-8deg); }
          92%  { transform: rotate(8deg); }
          96%  { transform: rotate(-4deg); }
        }

        /* 403 number */
        .error-code {
          font-size: clamp(4.5rem, 14vw, 7rem);
          font-weight: 800;
          line-height: 1;
          margin-bottom: 6px;
          background: linear-gradient(135deg, #ef4444 0%, #f87171 50%, #fca5a5 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -2px;
          text-shadow: none;
        }

        .error-label {
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 4px;
          color: rgba(239, 68, 68, 0.7);
          text-transform: uppercase;
          margin-bottom: 20px;
        }

        .divider {
          width: 48px;
          height: 2px;
          background: linear-gradient(90deg, transparent, #38bdf8, transparent);
          margin: 0 auto 20px;
          border-radius: 2px;
        }

        .error-title {
          font-size: 1.4rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 12px;
          letter-spacing: -0.3px;
        }

        .error-desc {
          font-size: 0.95rem;
          color: rgba(255, 255, 255, 0.5);
          line-height: 1.6;
          margin-bottom: 36px;
          max-width: 340px;
          margin-left: auto;
          margin-right: auto;
        }

        /* Buttons */
        .btn-group {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .btn-home {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 13px 28px;
          background: linear-gradient(135deg, #15156b, #38bdf8);
          color: #fff;
          text-decoration: none;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.95rem;
          font-family: inherit;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 20px rgba(56, 189, 248, 0.25);
        }
        .btn-home:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(56, 189, 248, 0.4);
        }

        .btn-back {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 13px 28px;
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.75);
          text-decoration: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.95rem;
          font-family: inherit;
          border: 1px solid rgba(255,255,255,0.1);
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .btn-back:hover {
          background: rgba(255,255,255,0.1);
          color: #fff;
          transform: translateY(-2px);
        }

        /* Brand tag */
        .brand-tag {
          margin-top: 32px;
          font-size: 0.78rem;
          color: rgba(255,255,255,0.2);
          letter-spacing: 2px;
          text-transform: uppercase;
          font-weight: 600;
        }
        .brand-tag span { color: #38bdf8; }

        /* Mobile */
        @media (max-width: 480px) {
          .forbidden-card { padding: 36px 24px; border-radius: 20px; }
          .error-title { font-size: 1.2rem; }
          .error-desc { font-size: 0.88rem; }
          .btn-group { flex-direction: column; align-items: center; }
          .btn-home, .btn-back { width: 100%; justify-content: center; }
          .shield-wrap { width: 76px; height: 76px; }
          .shield-icon { font-size: 2.2rem; }
        }
      `}</style>

      <div className="forbidden-root">
        <canvas ref={canvasRef} className="forbidden-canvas" />
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />

        <div className="forbidden-card">
          <div className="shield-wrap">
            <span className="shield-icon">🛡️</span>
          </div>

          <div className="error-code">403</div>
          <div className="error-label">Access Forbidden</div>

          <div className="divider" />

          <h1 className="error-title">You shall not pass!</h1>
          <p className="error-desc">
            You don't have permission to access this page.
            This area is restricted to authorized personnel only.
          </p>

          <div className="btn-group">
            <a href="/" className="btn-home">🏠 Go Home</a>
            <button className="btn-back" onClick={() => window.history.back()}>← Go Back</button>
          </div>

          <div className="brand-tag">Protected by <span>PHISHXRAY</span></div>
        </div>
      </div>
    </>
  );
}