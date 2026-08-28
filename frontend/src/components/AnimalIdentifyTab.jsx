import React, { useRef, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Camera, Loader2, ScanSearch, AlertTriangle, Fingerprint, Globe2 } from "lucide-react";
import { MapView } from "@/components/MapView";
import { MEDIA } from "@/lib/media";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const statusColor = (s = "") => {
  const t = s.toLowerCase();
  if (t.includes("critically")) return "#EF4444";
  if (t.includes("endangered")) return "#F97316";
  if (t.includes("vulnerable")) return "#F59E0B";
  if (t.includes("near")) return "#FDE047";
  if (t.includes("least")) return "#10B981";
  return "#8C9E93";
};

export const AnimalIdentifyTab = () => {
  const fileRef = useRef(null);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setImage(reader.result); setResult(null); };
    reader.readAsDataURL(file);
  };

  const identify = async () => {
    if (!image) return;
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/animal/analyze`, { image_base64: image });
      setResult(data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Identification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="glass card-glow rounded-2xl p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.25em] font-accent mb-2" style={{ color: "var(--emerald-bright)" }}>Species Scan</p>
        <h2 className="font-display text-3xl mb-6" style={{ color: "var(--sand-warm)" }}>Identify Wildlife</h2>

        <input ref={fileRef} data-testid="animal-file-input" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        <div
          data-testid="animal-upload-dropzone"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
          className="relative rounded-xl overflow-hidden cursor-pointer flex items-center justify-center"
          style={{ minHeight: 320, border: "1.5px dashed rgba(230,213,184,0.25)", backgroundImage: `linear-gradient(rgba(7,14,11,0.78), rgba(7,14,11,0.88)), url(${MEDIA.wildlifeDark})`, backgroundSize: "cover", backgroundPosition: "center" }}
        >
          {image ? (
            <>
              <img src={image} alt="animal" className="w-full h-[320px] object-cover" />
              {loading && <div className="scanline" />}
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-12 text-center px-6">
              <Camera size={34} color="var(--emerald-bright)" />
              <p className="font-body" style={{ color: "var(--text-secondary)" }}>Click or drop an animal photo</p>
              <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>JPEG · PNG · WEBP</p>
            </div>
          )}
        </div>

        <button
          data-testid="animal-identify-button"
          disabled={!image || loading}
          onClick={identify}
          className="mt-5 w-full py-3 rounded-xl font-accent uppercase text-sm flex items-center justify-center gap-2 transition-transform duration-200 hover:scale-[1.01] disabled:opacity-40"
          style={{ background: "var(--emerald)", color: "var(--bg-primary)" }}
        >
          {loading ? <><Loader2 size={16} className="animate-spin" /> Scanning…</> : <><ScanSearch size={16} /> Identify Animal</>}
        </button>
      </div>

      <div className="glass card-glow rounded-2xl p-6 sm:p-8">
        {!result ? (
          <div className="h-full relative flex flex-col items-center justify-center text-center gap-3 py-16 rounded-xl overflow-hidden">
            <div className="absolute inset-0" style={{ backgroundImage: `url(${MEDIA.wildlifeDark})`, backgroundSize: "cover", backgroundPosition: "center", opacity: 0.4 }} />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(7,14,11,0.95), rgba(7,14,11,0.5))" }} />
            <div className="relative w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid var(--border-subtle)", backdropFilter: "blur(4px)" }}>
              <Fingerprint size={26} color="var(--emerald-bright)" />
            </div>
            <p className="relative prose-notable" style={{ color: "var(--sand-warm)" }}>Species identification will appear here</p>
            <p className="relative text-xs" style={{ color: "var(--text-muted)" }}>Upload an animal photo to scan</p>
          </div>
        ) : (
          <motion.div data-testid="animal-result-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-start justify-between gap-4 mb-1">
              <h3 data-testid="animal-species-name" className="font-display text-3xl" style={{ color: "var(--sand-warm)" }}>{result.species}</h3>
              <span className="px-3 py-1 rounded-full text-xs font-accent uppercase whitespace-nowrap mt-1" style={{ background: `${statusColor(result.conservation_status)}22`, color: statusColor(result.conservation_status), border: `1px solid ${statusColor(result.conservation_status)}55` }}>
                {result.conservation_status}
              </span>
            </div>
            <p className="italic font-display text-lg mb-6" style={{ color: "var(--text-muted)" }}>{result.scientific_name}</p>

            <p className="text-xs uppercase tracking-[0.2em] font-accent mb-2" style={{ color: "var(--emerald-bright)" }}>Habitat Loss</p>
            <p data-testid="animal-habitat-loss-summary" className="prose-notable mb-6" style={{ color: "var(--text-secondary)" }}>{result.habitat_loss_summary}</p>

            {result.threats?.length > 0 && (
              <>
                <p className="text-xs uppercase tracking-[0.2em] font-accent mb-3" style={{ color: "var(--emerald-bright)" }}>Key Threats</p>
                <div className="space-y-2">
                  {result.threats.map((t, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-lg" style={{ background: "rgba(7,14,11,0.4)", border: "1px solid var(--border-subtle)" }}>
                      <AlertTriangle size={15} color="#F59E0B" className="flex-shrink-0" />
                      <span className="prose-notable" style={{ color: "var(--text-secondary)" }}>{t}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {result.native_range?.length > 0 && (
              <div className="mt-6" data-testid="animal-range-window">
                <div className="flex items-center gap-2 mb-2" style={{ color: "var(--emerald-bright)" }}>
                  <Globe2 size={15} />
                  <p className="text-xs uppercase tracking-[0.2em] font-accent">View Range</p>
                </div>
                {result.range_summary && (
                  <p className="prose-notable mb-3" style={{ color: "var(--text-muted)" }}>{result.range_summary}</p>
                )}
                <MapView rangePoints={result.native_range} height={200} />
                <p className="mt-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
                  {result.native_range.length} range markers · hover for regions
                </p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};
