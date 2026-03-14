import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 55 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
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
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
      });
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }

        .nf-root {
          min-height: 100vh;
          width: 100vw;
          background: linear-gradient(135deg, #060620 0%, #0a0a4a 40%, #0d1060 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Segoe UI', system-ui, sans-serif;
          position: relative;
          overflow: hidden;
          padding: 20px;
        }

        .nf-canvas {
          position: absolute; inset: 0;
          pointer-events: none; z-index: 0;
        }

        .nf-orb {
          position: absolute; border-radius: 50%;
          filter: blur(80px); pointer-events: none; z-index: 0;
        }
        .nf-orb-1 { width: 400px; height: 400px; background: rgba(21,21,107,0.6); top: -100px; left: -100px; }
        .nf-orb-2 { width: 300px; height: 300px; background: rgba(56,189,248,0.1); bottom: -80px; right: -80px; }
        .nf-orb-3 { width: 250px; height: 250px; background: rgba(99,102,241,0.08); top: 50%; left: 50%; transform: translate(-50%,-50%); }

        .nf-card {
          position: relative; z-index: 1;
          text-align: center;
          max-width: 520px; width: 100%;
          padding: 52px 44px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 28px;
          backdrop-filter: blur(20px);
          box-shadow: 0 0 0 1px rgba(56,189,248,0.08), 0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06);
          animation: cardIn 0.7s cubic-bezier(.22,1,.36,1) both;
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(40px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Floating astronaut / lost icon */
        .nf-icon-wrap {
          margin: 0 auto 28px;
          width: 90px; height: 90px;
          border-radius: 50%;
          background: rgba(99,102,241,0.12);
          border: 2px solid rgba(99,102,241,0.3);
          display: flex; align-items: center; justify-content: center;
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-10px); }
        }

        .nf-icon { font-size: 2.6rem; }

        /* 404 */
        .nf-code {
          font-size: clamp(4.5rem, 14vw, 7rem);
          font-weight: 800;
          line-height: 1;
          margin-bottom: 6px;
          background: linear-gradient(135deg, #6366f1 0%, #818cf8 50%, #38bdf8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -2px;
        }

        .nf-label {
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 4px;
          color: rgba(99,102,241,0.7);
          text-transform: uppercase;
          margin-bottom: 20px;
        }

        .nf-divider {
          width: 48px; height: 2px;
          background: linear-gradient(90deg, transparent, #38bdf8, transparent);
          margin: 0 auto 20px; border-radius: 2px;
        }

        .nf-title {
          font-size: 1.4rem; font-weight: 700;
          color: #fff; margin-bottom: 12px; letter-spacing: -0.3px;
        }

        .nf-desc {
          font-size: 0.95rem;
          color: rgba(255,255,255,0.5);
          line-height: 1.6; margin-bottom: 36px;
          max-width: 340px; margin-left: auto; margin-right: auto;
        }

        .nf-btn-group {
          display: flex; gap: 12px;
          justify-content: center; flex-wrap: wrap;
        }

        .nf-btn-home {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 13px 28px;
          background: linear-gradient(135deg, #15156b, #38bdf8);
          color: #fff; text-decoration: none; border-radius: 12px;
          font-weight: 700; font-size: 0.95rem;
          font-family: inherit; border: none; cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 20px rgba(56,189,248,0.25);
        }
        .nf-btn-home:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(56,189,248,0.4); }

        .nf-btn-back {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 13px 28px;
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.75);
          border-radius: 12px; font-weight: 600; font-size: 0.95rem;
          font-family: inherit; border: 1px solid rgba(255,255,255,0.1);
          cursor: pointer; transition: all 0.3s ease;
          text-decoration: none;
        }
        .nf-btn-back:hover { background: rgba(255,255,255,0.1); color: #fff; transform: translateY(-2px); }

        .nf-brand {
          margin-top: 32px; font-size: 0.78rem;
          color: rgba(255,255,255,0.2);
          letter-spacing: 2px; text-transform: uppercase; font-weight: 600;
        }
        .nf-brand span { color: #38bdf8; }

        @media (max-width: 480px) {
          .nf-card { padding: 36px 22px; border-radius: 20px; }
          .nf-title { font-size: 1.2rem; }
          .nf-desc { font-size: 0.88rem; }
          .nf-btn-group { flex-direction: column; align-items: center; }
          .nf-btn-home, .nf-btn-back { width: 100%; justify-content: center; }
          .nf-icon-wrap { width: 76px; height: 76px; }
          .nf-icon { font-size: 2.2rem; }
        }
      `}</style>

      <div className="nf-root">
        <canvas ref={canvasRef} className="nf-canvas" />
        <div className="nf-orb nf-orb-1" />
        <div className="nf-orb nf-orb-2" />
        <div className="nf-orb nf-orb-3" />

        <div className="nf-card">
          <div className="nf-icon-wrap">
            <span className="nf-icon">🔭</span>
          </div>

          <div className="nf-code">404</div>
          <div className="nf-label">Page Not Found</div>

          <div className="nf-divider" />

          <h1 className="nf-title">Lost in cyberspace?</h1>
          <p className="nf-desc" role="alert">
            The page you're looking for doesn't exist or has been moved.
            Let's get you back to safety!
          </p>

          <div className="nf-btn-group">
            <button className="nf-btn-home" onClick={() => navigate("/")}>🏠 Go Home</button>
            <button className="nf-btn-back" onClick={() => window.history.back()}>← Go Back</button>
          </div>

          <div className="nf-brand">Protected by <span>PHISHXRAY</span></div>
        </div>
      </div>
    </>
  );
}