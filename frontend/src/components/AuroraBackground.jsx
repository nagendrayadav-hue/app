import React from "react";
import { MEDIA } from "@/lib/media";

export const AuroraBackground = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
    <div className="absolute inset-0" style={{ background: "#070E0B" }} />

    {/* organic misty-forest texture */}
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: `url(${MEDIA.bgTexture})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        opacity: 0.14,
        filter: "grayscale(0.3) brightness(0.7)",
        mixBlendMode: "luminosity",
      }}
    />
    {/* emerald wash to keep it on-theme */}
    <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, rgba(7,14,11,0.7), rgba(6,78,59,0.35) 50%, rgba(7,14,11,0.92))" }} />

    {/* animated emerald orbs */}
    <div className="aurora-orb" style={{ width: 620, height: 620, top: "-12%", left: "-8%", background: "radial-gradient(circle, rgba(16,185,129,0.35), transparent 70%)" }} />
    <div className="aurora-orb aurora-slow" style={{ width: 520, height: 520, bottom: "-14%", right: "-6%", background: "radial-gradient(circle, rgba(6,78,59,0.55), transparent 70%)" }} />
    <div className="aurora-orb aurora-mid" style={{ width: 380, height: 380, top: "35%", left: "55%", background: "radial-gradient(circle, rgba(52,211,153,0.18), transparent 70%)" }} />

    {/* faint contour grid */}
    <div
      className="absolute inset-0"
      style={{
        opacity: 0.5,
        backgroundImage:
          "linear-gradient(rgba(230,213,184,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(230,213,184,0.035) 1px, transparent 1px)",
        backgroundSize: "64px 64px",
        maskImage: "radial-gradient(circle at 50% 30%, black, transparent 80%)",
        WebkitMaskImage: "radial-gradient(circle at 50% 30%, black, transparent 80%)",
      }}
    />
  </div>
);
