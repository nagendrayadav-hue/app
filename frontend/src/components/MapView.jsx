import React, { useRef } from "react";
import { scoreColor } from "@/lib/score";

export const MAP_IMG =
  "https://customer-assets-4nw71qhi.emergentagent.net/job_891b7276-d691-4ce2-a826-eeae4e1be549/artifacts/99e2krwo_image.png";

// Calibration: fractional position within the dotted-map image for the
// geographic corners. Tuned so seed pins land on the correct continents.
const FX0 = 0.145, FX1 = 0.985; // x-fraction at LNG_MIN / LNG_MAX
const FY0 = 0.155, FY1 = 0.895; // y-fraction at LAT_TOP / LAT_BOTTOM
const LNG_MIN = -168, LNG_MAX = 192;
const LAT_TOP = 83, LAT_BOTTOM = -56;

const project = (lat, lng) => ({
  left: (FX0 + ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * (FX1 - FX0)) * 100,
  top: (FY0 + ((LAT_TOP - lat) / (LAT_TOP - LAT_BOTTOM)) * (FY1 - FY0)) * 100,
});

const unproject = (xPct, yPct) => {
  const lng = LNG_MIN + ((xPct / 100 - FX0) / (FX1 - FX0)) * (LNG_MAX - LNG_MIN);
  const lat = LAT_TOP - ((yPct / 100 - FY0) / (FY1 - FY0)) * (LAT_TOP - LAT_BOTTOM);
  return {
    longitude: +Math.max(-180, Math.min(180, lng)).toFixed(4),
    latitude: +Math.max(-90, Math.min(90, lat)).toFixed(4),
  };
};

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
        background: "#060C09",
        border: "1px solid var(--border-subtle)",
        cursor: onPick ? "crosshair" : "default",
      }}
    >
      <img
        src={MAP_IMG}
        alt="World map"
        className="absolute inset-0 w-full h-full object-fill select-none pointer-events-none"
        style={{
          filter:
            "invert(1) sepia(1) saturate(3) hue-rotate(90deg) brightness(0.9) contrast(1.1)",
          opacity: 0.5,
        }}
        draggable={false}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, rgba(16,185,129,0.10), transparent 65%)",
        }}
      />

      {posts.map((p) => {
        const { left, top } = project(p.latitude, p.longitude);
        const c = scoreColor(p.score);
        const isSel = selectedId === p.id;
        return (
          <button
            key={p.id}
            data-testid="map-pin-item"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(p);
            }}
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
                border: "2px solid rgba(6,12,9,0.95)",
                boxShadow: `0 0 0 4px ${c}33, 0 0 16px ${c}`,
                animation: "pin-pulse 2.4s ease-in-out infinite",
              }}
            />
          </button>
        );
      })}

      {pickMarker && (
        <div
          className="absolute z-20 pointer-events-none"
          style={{
            ...(() => {
              const { left, top } = project(pickMarker.latitude, pickMarker.longitude);
              return { left: `${left}%`, top: `${top}%` };
            })(),
            transform: "translate(-50%,-50%)",
          }}
        >
          <span
            className="block w-4 h-4 rounded-full"
            style={{
              background: "var(--sand-warm)",
              border: "2px solid var(--emerald)",
              boxShadow: "0 0 12px rgba(244,234,225,0.8)",
            }}
          />
        </div>
      )}
    </div>
  );
};
