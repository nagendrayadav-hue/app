import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { Activity, TrendingUp, TrendingDown, Layers, FileDown, BookOpen } from "lucide-react";
import { HabitatScoreGauge } from "@/components/HabitatScoreGauge";
import { scoreColor, scoreLabel, scoreTier } from "@/lib/score";
import { downloadHabitatsCsv, downloadManualPdf } from "@/lib/exports";

const StatCard = ({ icon, label, value, sub, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="glass card-glow rounded-2xl p-5"
  >
    <div className="flex items-center gap-2 mb-3" style={{ color: color || "var(--emerald-bright)" }}>
      {icon}
      <span className="text-[10px] uppercase tracking-[0.2em] font-accent">{label}</span>
    </div>
    <p className="font-display text-4xl leading-none" style={{ color: "var(--sand-warm)" }}>{value}</p>
    {sub && <p className="prose-notable mt-2 truncate" style={{ color: "var(--text-muted)" }}>{sub}</p>}
  </motion.div>
);

const tooltipStyle = {
  background: "#0E1813",
  border: "1px solid rgba(230,213,184,0.15)",
  borderRadius: 10,
  color: "#F4EAE1",
  fontSize: 12,
  fontFamily: "'Outfit',sans-serif",
};

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

  const pieData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "Healthy", value: stats.tiers.healthy, color: "#10B981" },
      { name: "At Risk", value: stats.tiers.moderate, color: "#F59E0B" },
      { name: "Critical", value: stats.tiers.critical, color: "#EF4444" },
    ].filter((d) => d.value > 0);
  }, [stats]);

  const barData = useMemo(
    () => [...posts]
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((p) => ({
        name: p.location_name.split(",")[0].slice(0, 12),
        score: p.score,
        color: scoreColor(p.score),
      })),
    [posts]
  );

  if (!stats) {
    return (
      <div className="glass rounded-2xl p-16 text-center">
        <p className="prose-notable" style={{ color: "var(--text-muted)" }}>Save a habitat post to see insights</p>
      </div>
    );
  }

  const tierRows = [
    { label: "Healthy", color: "#10B981", count: stats.tiers.healthy },
    { label: "At Risk", color: "#F59E0B", count: stats.tiers.moderate },
    { label: "Critical", color: "#EF4444", count: stats.tiers.critical },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] font-accent mb-1" style={{ color: "var(--emerald-bright)" }}>Trend Insights</p>
          <h2 className="font-display text-3xl sm:text-4xl" style={{ color: "var(--sand-warm)" }}>Habitat Health Overview</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            data-testid="download-csv-button"
            onClick={() => downloadHabitatsCsv(posts)}
            className="px-4 py-2 rounded-full text-xs font-accent uppercase flex items-center gap-2 transition-transform duration-200 hover:scale-[1.03]"
            style={{ background: "var(--emerald)", color: "var(--bg-primary)" }}
          >
            <FileDown size={14} /> CSV
          </button>
          <button
            data-testid="download-manual-button"
            onClick={downloadManualPdf}
            className="px-4 py-2 rounded-full text-xs font-accent uppercase flex items-center gap-2 transition-colors duration-200"
            style={{ background: "rgba(7,14,11,0.5)", color: "var(--sand-warm)", border: "1px solid var(--border-subtle)" }}
          >
            <BookOpen size={14} /> Manual
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        {/* Average gauge */}
        <div className="glass card-glow rounded-2xl p-8 flex flex-col items-center justify-center text-center" data-testid="stats-average-score">
          <p className="text-[10px] uppercase tracking-[0.2em] font-accent mb-4" style={{ color: "var(--emerald-bright)" }}>Average Health</p>
          <HabitatScoreGauge score={stats.avg} size={200} />
          <span
            className="mt-5 inline-block px-4 py-1.5 rounded-full text-xs font-accent uppercase"
            style={{ background: `${scoreColor(stats.avg)}22`, color: scoreColor(stats.avg), border: `1px solid ${scoreColor(stats.avg)}55` }}
          >
            Fleet is {scoreLabel(stats.avg)}
          </span>
        </div>

        <div className="grid gap-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<Layers size={15} />} label="Total" value={stats.total} sub="habitats logged" delay={0.05} />
            <StatCard icon={<Activity size={15} />} label="Spread" value={`${stats.worst.score}–${stats.best.score}`} sub="score range" delay={0.1} />
            <StatCard icon={<TrendingUp size={15} />} label="Healthiest" value={stats.best.score} sub={stats.best.location_name} color="#34D399" delay={0.15} />
            <StatCard icon={<TrendingDown size={15} />} label="At Risk" value={stats.worst.score} sub={stats.worst.location_name} color="#FCA5A5" delay={0.2} />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Pie */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass card-glow rounded-2xl p-6" data-testid="stats-pie-chart">
              <p className="text-[10px] uppercase tracking-[0.2em] font-accent mb-4" style={{ color: "var(--emerald-bright)" }}>Tier Distribution</p>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={78} paddingAngle={3} stroke="none">
                      {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-2">
                {tierRows.map((t) => (
                  <span key={t.label} className="flex items-center gap-1.5 text-[10px] font-accent uppercase" style={{ color: "var(--text-secondary)" }}>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.color, boxShadow: `0 0 8px ${t.color}` }} />
                    {t.label} {t.count}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Bar */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass card-glow rounded-2xl p-6" data-testid="stats-bar-chart">
              <p className="text-[10px] uppercase tracking-[0.2em] font-accent mb-4" style={{ color: "var(--emerald-bright)" }}>Scores by Habitat</p>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(230,213,184,0.08)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "#8C9E93", fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={50} />
                    <YAxis domain={[0, 100]} tick={{ fill: "#8C9E93", fontSize: 10 }} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(16,185,129,0.08)" }} />
                    <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                      {barData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};
