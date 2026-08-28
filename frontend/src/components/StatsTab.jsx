import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Activity, TrendingUp, TrendingDown, Layers, MapPin } from "lucide-react";
import { HabitatScoreGauge } from "@/components/HabitatScoreGauge";
import { scoreColor, scoreLabel, scoreTier } from "@/lib/score";

const StatCard = ({ icon, label, value, sub, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="glass rounded-2xl p-6"
  >
    <div className="flex items-center gap-2 mb-3" style={{ color: color || "var(--emerald-bright)" }}>
      {icon}
      <span className="text-[10px] uppercase tracking-[0.2em] font-accent">{label}</span>
    </div>
    <p className="font-display text-4xl leading-none" style={{ color: "var(--sand-warm)" }}>{value}</p>
    {sub && <p className="prose-notable mt-2" style={{ color: "var(--text-muted)" }}>{sub}</p>}
  </motion.div>
);

export const StatsTab = ({ posts }) => {
  const stats = useMemo(() => {
    if (!posts.length) return null;
    const scores = posts.map((p) => p.score);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const tiers = { healthy: 0, moderate: 0, critical: 0 };
    posts.forEach((p) => { tiers[scoreTier(p.score)]++; });
    const best = [...posts].sort((a, b) => b.score - a.score)[0];
    const worst = [...posts].sort((a, b) => a.score - b.score)[0];
    return { avg, tiers, best, worst, total: posts.length };
  }, [posts]);

  if (!stats) {
    return (
      <div className="glass rounded-2xl p-16 text-center">
        <p className="prose-notable" style={{ color: "var(--text-muted)" }}>Save a habitat post to see insights</p>
      </div>
    );
  }

  const tierRows = [
    { key: "healthy", label: "Healthy", color: "#10B981", count: stats.tiers.healthy },
    { key: "moderate", label: "At Risk", color: "#F59E0B", count: stats.tiers.moderate },
    { key: "critical", label: "Critical", color: "#EF4444", count: stats.tiers.critical },
  ];

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.25em] font-accent mb-1" style={{ color: "var(--emerald-bright)" }}>Trend Insights</p>
        <h2 className="font-display text-3xl sm:text-4xl" style={{ color: "var(--sand-warm)" }}>Habitat Health Overview</h2>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        {/* Average gauge */}
        <div className="glass rounded-2xl p-8 flex flex-col items-center justify-center text-center" data-testid="stats-average-score">
          <p className="text-[10px] uppercase tracking-[0.2em] font-accent mb-4" style={{ color: "var(--emerald-bright)" }}>Average Health</p>
          <HabitatScoreGauge score={stats.avg} size={200} />
          <span
            className="mt-5 inline-block px-4 py-1.5 rounded-full text-xs font-accent uppercase"
            style={{ background: `${scoreColor(stats.avg)}22`, color: scoreColor(stats.avg), border: `1px solid ${scoreColor(stats.avg)}55` }}
          >
            Fleet is {scoreLabel(stats.avg)}
          </span>
        </div>

        {/* Right column */}
        <div className="grid gap-6">
          <div className="grid sm:grid-cols-2 gap-6">
            <StatCard icon={<Layers size={15} />} label="Total Posts" value={stats.total} sub="habitats logged" delay={0.05} />
            <StatCard icon={<Activity size={15} />} label="Median Range" value={`${stats.worst.score}–${stats.best.score}`} sub="score spread" delay={0.1} />
            <StatCard icon={<TrendingUp size={15} />} label="Healthiest" value={stats.best.score} sub={stats.best.location_name} color="#34D399" delay={0.15} />
            <StatCard icon={<TrendingDown size={15} />} label="Most At Risk" value={stats.worst.score} sub={stats.worst.location_name} color="#FCA5A5" delay={0.2} />
          </div>

          {/* Distribution */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass rounded-2xl p-6" data-testid="stats-distribution">
            <div className="flex items-center gap-2 mb-5" style={{ color: "var(--emerald-bright)" }}>
              <MapPin size={15} />
              <span className="text-[10px] uppercase tracking-[0.2em] font-accent">Tier Distribution</span>
            </div>
            <div className="space-y-4">
              {tierRows.map((t) => {
                const pct = Math.round((t.count / stats.total) * 100);
                return (
                  <div key={t.key}>
                    <div className="flex items-center justify-between mb-1.5 text-xs font-accent" style={{ color: "var(--text-secondary)" }}>
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.color, boxShadow: `0 0 8px ${t.color}` }} />
                        {t.label}
                      </span>
                      <span style={{ color: "var(--text-muted)" }}>{t.count} · {pct}%</span>
                    </div>
                    <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(230,213,184,0.08)" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                        className="h-full rounded-full"
                        style={{ background: t.color, boxShadow: `0 0 12px ${t.color}` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
