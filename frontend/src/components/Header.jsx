import React from "react";
import { motion } from "framer-motion";
import { Leaf } from "lucide-react";

const tabs = [
  { id: "upload", label: "Upload", testid: "nav-tab-upload" },
  { id: "map", label: "Map", testid: "nav-tab-map" },
  { id: "insights", label: "Insights", testid: "nav-tab-insights" },
  { id: "animal", label: "Animal", testid: "nav-tab-animal" },
];

export const Header = ({ active, onChange }) => {
  return (
    <header className="sticky top-0 z-50 glass border-b" style={{ borderColor: "var(--border-subtle)" }}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3" data-testid="header-brand-logo">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "var(--emerald-deep)", boxShadow: "0 0 18px rgba(16,185,129,0.35)" }}
          >
            <Leaf size={18} color="#A7F3D0" />
          </div>
          <div className="leading-none">
            <span className="font-display text-2xl tracking-tight" style={{ color: "var(--sand-warm)" }}>
              Bio<span style={{ color: "var(--emerald-bright)" }}>Dash</span>
            </span>
          </div>
        </div>

        <nav className="relative flex items-center gap-1 p-1 rounded-full" style={{ background: "rgba(7,14,11,0.6)", border: "1px solid var(--border-subtle)" }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              data-testid={t.testid}
              onClick={() => onChange(t.id)}
              className="relative px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-accent uppercase transition-colors duration-200"
              style={{ color: active === t.id ? "var(--bg-primary)" : "var(--text-muted)" }}
            >
              {active === t.id && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-full"
                  style={{ background: "var(--emerald-bright)" }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">{t.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
};
