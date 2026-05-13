import { useCallback, useEffect, useState } from "react";

const KEYFRAMES = `
  @keyframes aq-body-draw { to { stroke-dashoffset: 0; } }
  @keyframes aq-tail-draw { to { stroke-dashoffset: 0; } }
  @keyframes aq-fin-draw { to { stroke-dashoffset: 0; } }
  @keyframes aq-eye-pop {
    from { opacity: 0; transform: scale(0); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes aq-swim {
    0%, 100% { transform: translateX(-5px) rotate(-3deg); }
    50% { transform: translateX(5px) rotate(3deg); }
  }
  @keyframes aq-dot {
    0%, 100% { opacity: 0.2; transform: scale(0.7); }
    50% { opacity: 1; transform: scale(1.15); }
  }
  @keyframes aq-aurora-1 {
    0% { transform: translate(-8%, -12%) scale(1) rotate(0deg); }
    33% { transform: translate(6%, 10%) scale(1.15) rotate(120deg); }
    66% { transform: translate(-4%, 6%) scale(0.9) rotate(240deg); }
    100% { transform: translate(-8%, -12%) scale(1) rotate(360deg); }
  }
  @keyframes aq-aurora-2 {
    0% { transform: translate(10%, 8%) scale(1) rotate(0deg); }
    33% { transform: translate(-6%, -8%) scale(1.1) rotate(-120deg); }
    66% { transform: translate(4%, -4%) scale(0.95) rotate(-240deg); }
    100% { transform: translate(10%, 8%) scale(1) rotate(-360deg); }
  }
  @keyframes aq-aurora-3 {
    0% { transform: translate(0%, 0%) scale(1); }
    50% { transform: translate(-6%, 8%) scale(1.2); }
    100% { transform: translate(0%, 0%) scale(1); }
  }
  @keyframes aq-scan {
    0% { left: -35%; opacity: 0; }
    8% { opacity: 1; }
    92% { opacity: 1; }
    100% { left: 135%; opacity: 0; }
  }
  @keyframes aq-glow {
    0%, 100% { text-shadow: 0 0 18px rgba(25,155,184,.55), 0 0 36px rgba(25,155,184,.2); }
    50% { text-shadow: 0 0 28px rgba(25,155,184,.9), 0 0 56px rgba(25,155,184,.4), 0 0 80px rgba(13,232,255,.15); }
  }
  @keyframes aq-fade-up {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

export function PageLoader() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#010611",
      }}
    >
      <style>{KEYFRAMES}</style>

      <svg
        viewBox="0 0 142 90"
        width="142"
        height="90"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          animation: "aq-swim 2.2s ease-in-out 1.55s infinite",
          overflow: "visible",
        }}
      >
        <path
          d="M96,45 C82,22 40,19 20,45 C40,71 82,68 96,45 Z"
          stroke="#199bb8"
          strokeWidth="2.3"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="235"
          strokeDashoffset="235"
          style={{ animation: "aq-body-draw 1.05s cubic-bezier(.4,0,.2,1) 0.05s forwards" }}
        />
        <path
          d="M96,45 L122,28 L115,45 L122,62 Z"
          stroke="#199bb8"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="95"
          strokeDashoffset="95"
          style={{ animation: "aq-tail-draw 0.55s cubic-bezier(.4,0,.2,1) 0.95s forwards" }}
        />
        <path
          d="M56,21 C63,8 76,8 77,21"
          stroke="#199bb8"
          strokeWidth="1.7"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="42"
          strokeDashoffset="42"
          style={{ animation: "aq-fin-draw 0.5s cubic-bezier(.4,0,.2,1) 0.72s forwards" }}
        />
        <path
          d="M65,58 Q56,70 51,61"
          stroke="rgba(25,155,184,.55)"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="28"
          strokeDashoffset="28"
          style={{ animation: "aq-fin-draw 0.4s ease 1.0s forwards" }}
        />
        <path
          d="M57,34 Q63,41 57,48"
          stroke="rgba(25,155,184,.35)"
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="22"
          strokeDashoffset="22"
          style={{ animation: "aq-fin-draw 0.4s ease 1.1s forwards" }}
        />
        <circle
          cx="33"
          cy="41"
          r="4.8"
          stroke="#199bb8"
          strokeWidth="1.8"
          fill="none"
          opacity="0"
          style={{
            animation: "aq-eye-pop 0.35s cubic-bezier(.34,1.56,.64,1) 1.15s forwards",
            transformOrigin: "33px 41px",
          }}
        />
        <circle
          cx="33"
          cy="41"
          r="2.2"
          fill="#199bb8"
          opacity="0"
          style={{
            animation: "aq-eye-pop 0.3s ease 1.28s forwards",
            transformOrigin: "33px 41px",
          }}
        />
        <circle
          cx="35"
          cy="39"
          r="0.9"
          fill="rgba(255,255,255,.7)"
          opacity="0"
          style={{
            animation: "aq-eye-pop 0.2s ease 1.38s forwards",
            transformOrigin: "35px 39px",
          }}
        />
      </svg>

      <div style={{ display: "flex", gap: "10px", marginTop: "28px" }}>
        {[0, 0.22, 0.44].map((delay, index) => (
          <div
            key={index}
            style={{
              width: "7px",
              height: "7px",
              background: "#199bb8",
              borderRadius: "50%",
              animation: `aq-dot 1.5s ease-in-out ${delay}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface AppInitLoaderProps {
  onDone: () => void;
}

export function AppInitLoader({ onDone }: AppInitLoaderProps) {
  const [fading, setFading] = useState(false);
  const triggerDone = useCallback(onDone, [onDone]);

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setFading(true), 1700);
    const doneTimer = window.setTimeout(() => triggerDone(), 2100);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
    };
  }, [triggerDone]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#010611",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        overflow: "hidden",
        opacity: fading ? 0 : 1,
        transition: "opacity 0.4s ease",
        pointerEvents: fading ? "none" : "all",
      }}
    >
      <style>{KEYFRAMES}</style>

      <div
        style={{
          position: "absolute",
          inset: 0,
          filter: "blur(72px)",
          opacity: 0.65,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: "65vw",
            height: "65vw",
            top: "-8%",
            left: "-8%",
            background: "radial-gradient(ellipse, rgba(25,155,184,.55) 0%, transparent 68%)",
            borderRadius: "50%",
            animation: "aq-aurora-1 9s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "55vw",
            height: "55vw",
            bottom: "-8%",
            right: "-8%",
            background: "radial-gradient(ellipse, rgba(13,232,255,.32) 0%, transparent 68%)",
            borderRadius: "50%",
            animation: "aq-aurora-2 11s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "38vw",
            height: "38vw",
            top: "35%",
            right: "22%",
            background: "radial-gradient(ellipse, rgba(255,215,0,.14) 0%, transparent 68%)",
            borderRadius: "50%",
            animation: "aq-aurora-3 13s ease-in-out 1.5s infinite",
          }}
        />
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "22px",
          direction: "rtl",
        }}
      >
        <div
          style={{
            fontFamily: '"Segoe UI", system-ui, sans-serif',
            fontSize: "2.9rem",
            fontWeight: 800,
            letterSpacing: "6px",
            color: "#199bb8",
            animation: "aq-glow 2.8s ease-in-out infinite, aq-fade-up 0.7s ease forwards",
          }}
        >
          AQUAVO
        </div>

        <div
          style={{
            width: "164px",
            height: "2px",
            background: "rgba(25,155,184,.12)",
            borderRadius: "2px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              height: "100%",
              width: "32%",
              background: "linear-gradient(90deg, transparent, #199bb8, #0de8ff, transparent)",
              animation: "aq-scan 1.85s ease-in-out infinite",
            }}
          />
        </div>

        <p
          style={{
            color: "rgba(148,163,184,.65)",
            fontSize: "0.8rem",
            letterSpacing: "2px",
            fontFamily: "system-ui, sans-serif",
            animation: "aq-fade-up 0.9s ease 0.35s both",
          }}
        >
          أحواض السمك والمعدات المائية
        </p>
      </div>
    </div>
  );
}
