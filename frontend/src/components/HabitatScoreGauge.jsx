import React, { useEffect, useState } from "react";
import { scoreColor } from "@/lib/score";

export const HabitatScoreGauge = ({ score = 0, size = 180 }) => {
  const [display, setDisplay] = useState(0);
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = scoreColor(score);

  useEffect(() => {
    let raf;
    const start = performance.now();
    const duration = 900;
    const animate = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(eased * score));
      if (p < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const offset = circumference - (display / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} data-testid="habitat-score-display">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(230,213,184,0.1)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.1s linear", filter: `drop-shadow(0 0 8px ${color}99)` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-accent text-5xl" style={{ color: "var(--sand-warm)" }}>{display}</span>
        <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>/ 100 health</span>
      </div>
    </div>
  );
};
