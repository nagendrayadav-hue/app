import React from "react";
import { scoreColor, scoreLabel } from "@/lib/score";

// A fixed-size shareable card rendered off-screen and rasterized with html2canvas.
// Avoids external map tiles (CORS taint); the mini-map is drawn with CSS.
export const ShareCard = React.forwardRef(({ post, imageOverride }, ref) => {
  if (!post) return null;
  const c = scoreColor(post.score);
  const imgSrc = imageOverride || post.image_base64;
  // position pin inside the mini map panel (approx equirectangular)
  const left = ((post.longitude + 180) / 360) * 100;
  const top = ((90 - post.latitude) / 180) * 100;

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        left: -10000,
        top: 0,
        width: 540,
        background: "#070E0B",
        fontFamily: "'Notable','Outfit',sans-serif",
        overflow: "hidden",
        borderRadius: 24,
      }}
    >
      <div style={{ position: "relative", height: 300 }}>
        <img
          src={imgSrc}
          alt=""
          crossOrigin="anonymous"
          style={{ width: "100%", height: 300, objectFit: "cover", display: "block" }}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(7,14,11,0.95), transparent 55%)" }} />
        <div style={{ position: "absolute", top: 20, left: 20, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: "#064E3B", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 14px rgba(16,185,129,0.4)" }}>
            <span style={{ color: "#A7F3D0", fontSize: 15 }}>❦</span>
          </div>
          <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, color: "#F4EAE1" }}>
            Bio<span style={{ color: "#34D399" }}>Dash</span>
          </span>
        </div>
        <div style={{ position: "absolute", bottom: 18, right: 20, textAlign: "right" }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 72, lineHeight: 1, color: c, textShadow: `0 0 24px ${c}88` }}>{post.score}</div>
          <div style={{ fontSize: 11, letterSpacing: 2, color: c, textTransform: "uppercase" }}>{scoreLabel(post.score)}</div>
        </div>
      </div>

      <div style={{ padding: "24px 28px 28px" }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 30, color: "#F4EAE1", marginBottom: 4 }}>{post.location_name}</div>
        <div style={{ fontSize: 10, letterSpacing: 1.5, color: "#8C9E93", marginBottom: 18, textTransform: "uppercase" }}>{post.ecosystem}</div>

        <div style={{ display: "flex", gap: 18 }}>
          {/* mini map */}
          <div style={{ position: "relative", width: 180, height: 108, borderRadius: 12, background: "#0A1410", border: "1px solid rgba(230,213,184,0.12)", overflow: "hidden", flexShrink: 0 }}>
            <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(16,185,129,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.12) 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
            <div style={{ position: "absolute", left: `${left}%`, top: `${top}%`, transform: "translate(-50%,-50%)", width: 14, height: 14, borderRadius: "50%", background: c, boxShadow: `0 0 0 4px ${c}33, 0 0 14px ${c}`, border: "2px solid #060C09" }} />
          </div>
          <div style={{ flex: 1, fontSize: 11, color: "#D4C5A9", lineHeight: 1.7 }}>
            <div style={{ letterSpacing: 1, color: "#34D399", textTransform: "uppercase", marginBottom: 6, fontSize: 9 }}>Coordinates</div>
            <div>{post.latitude.toFixed(4)}, {post.longitude.toFixed(4)}</div>
            <div style={{ marginTop: 10, fontSize: 9, color: "#8C9E93", letterSpacing: 1 }}>HABITAT INTELLIGENCE</div>
          </div>
        </div>
      </div>
    </div>
  );
});
