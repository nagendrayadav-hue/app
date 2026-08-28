import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import axios from "axios";
import html2canvas from "html2canvas";
import { X, Trash2, MapPin, Share2, Loader2 } from "lucide-react";
import { MapView } from "@/components/MapView";
import { ShareCard } from "@/components/ShareCard";
import { scoreColor, scoreLabel, scoreTier } from "@/lib/score";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FILTERS = [
  { id: "all", label: "All", testid: "map-post-filter-all" },
  { id: "healthy", label: "Healthy", testid: "map-post-filter-healthy" },
  { id: "moderate", label: "At Risk", testid: "map-post-filter-moderate" },
  { id: "critical", label: "Critical", testid: "map-post-filter-critical" },
];

export const HabitatMapTab = ({ posts, onChanged }) => {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef(null);

  const filtered = useMemo(
    () => (filter === "all" ? posts : posts.filter((p) => scoreTier(p.score) === filter)),
    [posts, filter]
  );

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const shareSnapshot = async () => {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      await new Promise((r) => setTimeout(r, 120));
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#070E0B",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const dataUrl = canvas.toDataURL("image/png");
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `biodash-${selected.location_name.replace(/\s+/g, "-")}.png`, { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "BioDash habitat", text: `${selected.location_name} — score ${selected.score}` });
        toast.success("Snapshot shared");
      } else {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = file.name;
        a.click();
        toast.success("Snapshot downloaded");
      }
    } catch (e) {
      console.error("share snapshot failed", e);
      toast.error("Could not create snapshot");
    } finally {
      setSharing(false);
    }
  };

  const remove = async (id) => {
    try {
      await axios.delete(`${API}/habitat/posts/${id}`);
      toast.success("Post removed");
      setSelected(null);
      onChanged && onChanged();
    } catch {
      toast.error("Could not remove post");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] font-accent mb-1" style={{ color: "var(--emerald-bright)" }}>Global Overview</p>
          <h2 className="font-display text-3xl" style={{ color: "var(--sand-warm)" }}>Habitat Map</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              data-testid={f.testid}
              onClick={() => setFilter(f.id)}
              className="px-4 py-1.5 rounded-full text-xs font-accent uppercase transition-colors duration-200"
              style={{
                background: filter === f.id ? "var(--emerald)" : "rgba(7,14,11,0.5)",
                color: filter === f.id ? "var(--bg-primary)" : "var(--text-muted)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="glass rounded-2xl p-4">
          <MapView posts={filtered} selectedId={selected?.id} onSelect={setSelected} height={520} />
          <div className="flex items-center gap-5 mt-4 px-2 text-xs font-mono" style={{ color: "var(--text-muted)" }}>
            <Legend color="#10B981" label="Healthy 70-100" />
            <Legend color="#F59E0B" label="At Risk 40-69" />
            <Legend color="#EF4444" label="Critical 0-39" />
          </div>
        </div>

        <div className="glass rounded-2xl p-5 max-h-[600px] overflow-y-auto">
          <p className="text-xs uppercase tracking-[0.2em] font-accent mb-4" style={{ color: "var(--emerald-bright)" }}>
            Saved Posts · {filtered.length}
          </p>
          <div className="space-y-3">
            {filtered.map((p) => (
              <button
                key={p.id}
                data-testid="saved-post-card-item"
                onClick={() => setSelected(p)}
                className="w-full text-left rounded-xl overflow-hidden flex gap-3 p-2 transition-colors duration-200"
                style={{ background: selected?.id === p.id ? "var(--surface-hover)" : "rgba(7,14,11,0.4)", border: "1px solid var(--border-subtle)" }}
              >
                <img src={p.image_base64} alt={p.location_name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-body text-sm truncate" style={{ color: "var(--sand-warm)" }}>{p.location_name}</p>
                  <p className="text-xs truncate mb-1" style={{ color: "var(--text-muted)" }}>{p.ecosystem}</p>
                  <span className="text-xs font-accent" style={{ color: scoreColor(p.score) }}>{p.score} · {scoreLabel(p.score)}</span>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm font-body py-8 text-center" style={{ color: "var(--text-muted)" }}>No posts in this tier</p>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(7,14,11,0.85)", backdropFilter: "blur(6px)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass rounded-2xl max-w-md w-full overflow-hidden"
            >
              <div className="relative">
                <img src={selected.image_base64} alt={selected.location_name} className="w-full h-56 object-cover" />
                <button onClick={() => setSelected(null)} className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(7,14,11,0.7)", color: "var(--sand-warm)" }}>
                  <X size={18} />
                </button>
                <div className="absolute bottom-3 left-4 px-3 py-1 rounded-full text-xs font-accent uppercase" style={{ background: `${scoreColor(selected.score)}dd`, color: "#070E0B" }}>
                  {selected.score} · {scoreLabel(selected.score)}
                </div>
              </div>
              <div className="p-6">
                <h3 className="font-display text-2xl mb-1" style={{ color: "var(--sand-warm)" }}>{selected.location_name}</h3>
                <div className="flex items-center gap-1.5 text-xs font-mono mb-4" style={{ color: "var(--text-muted)" }}>
                  <MapPin size={12} /> {selected.latitude.toFixed(3)}, {selected.longitude.toFixed(3)} · {selected.ecosystem}
                </div>
                <p className="prose-notable mb-5" style={{ color: "var(--text-secondary)" }}>{selected.summary}</p>
                <div className="flex gap-3">
                  <button
                    data-testid="post-share-button"
                    onClick={shareSnapshot}
                    disabled={sharing}
                    className="flex-1 py-2.5 rounded-xl font-accent uppercase text-xs flex items-center justify-center gap-2 transition-transform duration-200 hover:scale-[1.02] disabled:opacity-50"
                    style={{ background: "var(--emerald)", color: "var(--bg-primary)" }}
                  >
                    {sharing ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />} Share
                  </button>
                  <button
                    onClick={() => remove(selected.id)}
                    className="flex-1 py-2.5 rounded-xl font-accent uppercase text-xs flex items-center justify-center gap-2 transition-colors duration-200"
                    style={{ background: "rgba(153,27,27,0.2)", color: "#FCA5A5", border: "1px solid rgba(153,27,27,0.5)" }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ShareCard ref={cardRef} post={selected} />
    </div>
  );
};

const Legend = ({ color, label }) => (
  <span className="flex items-center gap-1.5">
    <span className="w-2.5 h-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
    {label}
  </span>
);
