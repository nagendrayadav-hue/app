import React, { useRef } from "react";
import { scoreColor } from "@/lib/score";

const MAP_IMG = "https://upload.wikimedia.org/wikipedia/commons/8/83/Equirectangular_projection_SW.jpg";

const project = (lat, lng) => ({
  left: ((lng + 180) / 360) * 100,
  top: ((90 - lat) / 180) * 100,
});

const unproject = (xPct, yPct) => ({
  longitude: +((xPct / 100) * 360 - 180).toFixed(4),
  latitude: +(90 - (yPct / 100) * 180).toFixed(4),
});

export const MapView = ({
  posts = [],
  selectedId = null,
  onSelect = () => {},
  onPick = null,
  pickMarker = null,
  height = 480,
}) => {
  const ref = useRef(null);

  const handleClick = (e) => {
    if (!onPick || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    onPick(unproject(xPct, yPct));
  };

  return (
    <div
      ref={ref}
      onClick={handleClick}
      data-testid="map-container-2d"
      className="relative w-full rounded-2xl overflow-hidden"
      style={{
        height,
        background: "#0A1410",
        border: "1px solid var(--border-subtle)",
        cursor: onPick ? "crosshair" : "default",
      }}
    >
      <img
        src={MAP_IMG}
        alt="World map"
        className="absolute inset-0 w-full h-full object-fill select-none pointer-events-none"
        style={{ filter: "grayscale(1) brightness(0.32) sepia(1) hue-rotate(90deg) saturate(1.6)", opacity: 0.55 }}
        draggable={false}
      />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 50% 40%, rgba(16,185,129,0.08), transparent 70%)" }} />

      {posts.map((p) => {
        const { left, top } = project(p.latitude, p.longitude);
        const c = scoreColor(p.score);
        const isSel = selectedId === p.id;
        return (
          <button
            key={p.id}
            data-testid="map-pin-item"
            onClick={(e) => { e.stopPropagation(); onSelect(p); }}
            className="absolute z-10"
            style={{ left: `${left}%`, top: `${top}%`, transform: "translate(-50%,-50%)" }}
            title={`${p.location_name} — ${p.score}`}
          >
            <span
              className="block rounded-full"
              style={{
                width: isSel ? 20 : 14,
                height: isSel ? 20 : 14,
                background: c,
                border: "2px solid rgba(7,14,11,0.9)",
                boxShadow: `0 0 0 4px ${c}33, 0 0 14px ${c}`,
                animation: "pin-pulse 2.4s ease-in-out infinite",
              }}
            />
          </button>
        );
      })}

      {pickMarker && (
        <div
          className="absolute z-20 pointer-events-none"
          style={{ ...(() => { const { left, top } = project(pickMarker.latitude, pickMarker.longitude); return { left: `${left}%`, top: `${top}%` }; })(), transform: "translate(-50%,-50%)" }}
        >
          <span className="block w-4 h-4 rounded-full" style={{ background: "var(--sand-warm)", border: "2px solid var(--emerald)", boxShadow: "0 0 12px rgba(244,234,225,0.8)" }} />
        </div>
      )}
    </div>
  );
};
