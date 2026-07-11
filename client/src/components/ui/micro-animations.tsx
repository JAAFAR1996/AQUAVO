import { useEffect, useRef, useState } from "react";

let stylesInjected = false;

function injectStyles() {
  if (stylesInjected || typeof document === "undefined") return;
  stylesInjected = true;

  const style = document.createElement("style");
  style.textContent = `
@keyframes ma-ring-burst {
  0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
  60%  { box-shadow: 0 0 0 16px rgba(34,197,94,0); }
  100% { box-shadow: 0 0 0 16px rgba(34,197,94,0); }
}
@keyframes ma-check-in {
  0%   { opacity: 0; transform: scale(0.4); }
  40%  { opacity: 1; transform: scale(1.1); }
  60%  { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(0.8); }
}
@keyframes ma-heartbeat {
  0%   { transform: scale(1); }
  20%  { transform: scale(1.3); }
  40%  { transform: scale(1); }
  60%  { transform: scale(1.15); }
  80%  { transform: scale(1); }
  100% { transform: scale(1); }
}
@keyframes ma-idle-pulse {
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.06); }
}
@keyframes ma-points-float {
  0%   { opacity: 1; transform: translateY(0); }
  80%  { opacity: 0.6; }
  100% { opacity: 0; transform: translateY(-48px); }
}
@keyframes ma-ripple {
  0%   { transform: scale(0); opacity: 0.45; }
  100% { transform: scale(4); opacity: 0; }
}
`;
  document.head.appendChild(style);
}

export interface CartPulseProps {
  children: React.ReactNode;
  triggered: boolean;
  onComplete?: () => void;
}

export function CartPulse({ children, triggered, onComplete }: CartPulseProps) {
  injectStyles();
  const [active, setActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!triggered) return;
    setActive(true);
    timerRef.current = setTimeout(() => {
      setActive(false);
      onComplete?.();
    }, 700);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [triggered, onComplete]);

  return (
    <div
      className="relative inline-flex"
      style={
        active
          ? { animation: "ma-ring-burst 600ms ease-out forwards", borderRadius: "inherit" }
          : undefined
      }
    >
      {children}
      {active && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "-6px",
            insetInlineEnd: "-6px",
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            backgroundColor: "#22c55e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "ma-check-in 600ms ease-out forwards",
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          <svg
            viewBox="0 0 12 12"
            width="11"
            height="11"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="2,6 5,9 10,3" />
          </svg>
        </span>
      )}
    </div>
  );
}

export interface HeartBeatProps {
  children: React.ReactNode;
  active: boolean;
}

export function HeartBeat({ children, active }: HeartBeatProps) {
  injectStyles();

  const style: React.CSSProperties = active
    ? {
        display: "inline-flex",
        animation: "ma-heartbeat 400ms ease-in-out forwards",
        filter: "drop-shadow(0 0 6px rgba(239,68,68,0.7))",
        transformOrigin: "center",
      }
    : {
        display: "inline-flex",
        animation: "ma-idle-pulse 2.4s ease-in-out infinite",
        transformOrigin: "center",
      };

  return <span style={style}>{children}</span>;
}

export interface PointsFloatProps {
  points: number;
  trigger: boolean;
}

export function PointsFloat({ points, trigger }: PointsFloatProps) {
  injectStyles();
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!trigger || points <= 0) return;
    setVisible(true);
    timerRef.current = setTimeout(() => setVisible(false), 900);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [trigger, points]);

  if (!visible) return null;

  return (
    <span
      aria-live="polite"
      style={{
        position: "absolute",
        top: "-28px",
        insetInlineStart: "50%",
        transform: "translateX(-50%)",
        color: "#0B93A6",
        fontWeight: 700,
        fontSize: "13px",
        whiteSpace: "nowrap",
        pointerEvents: "none",
        animation: "ma-points-float 900ms ease-out forwards",
        zIndex: 20,
      }}
    >
      {`+${points} نقطة`}
    </span>
  );
}

export interface RippleButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

interface RippleItem {
  id: number;
  x: number;
  y: number;
}

export function RippleButton({ children, className, onClick }: RippleButtonProps) {
  injectStyles();
  const [ripples, setRipples] = useState<RippleItem[]>([]);
  const nextId = useRef(0);

  const handleClick = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = nextId.current++;

    setRipples((prev) => [...prev, { id, x, y }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);

    onClick?.(e);
  };

  return (
    <div
      className={className}
      style={{ position: "relative", overflow: "hidden", display: "inline-flex" }}
      onClick={handleClick}
    >
      {children}
      {ripples.map((r) => (
        <span
          key={r.id}
          aria-hidden="true"
          style={{
            position: "absolute",
            top: r.y - 10,
            left: r.x - 10,
            width: 20,
            height: 20,
            borderRadius: "50%",
            backgroundColor: "rgba(11,147,166,0.35)",
            animation: "ma-ripple 600ms ease-out forwards",
            pointerEvents: "none",
            zIndex: 5,
          }}
        />
      ))}
    </div>
  );
}
