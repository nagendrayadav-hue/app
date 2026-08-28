import React, { useRef, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Camera, Save, Loader2, MapPin, Leaf } from "lucide-react";
import { HabitatScoreGauge } from "@/components/HabitatScoreGauge";
import { MapView } from "@/components/MapView";
import { scoreLabel, scoreColor } from "@/lib/score";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const HabitatUploadTab = ({ onSaved }) => {
  const fileRef = useRef(null);
  const [image, setImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [locName, setLocName] = useState("");
  const [coords, setCoords] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result);
      setResult(null);
      setCoords(null);
    };
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    if (!image) return;
    setAnalyzing(true);
    try {
      const { data } = await axios.post(`${API}/habitat/analyze`, { image_base64: image });
      setResult(data);
      if (data.gps) {
        setCoords({ latitude: data.gps.latitude, longitude: data.gps.longitude });
        toast.success("Location found in photo GPS data");
      } else {
        toast.message("No GPS in photo — click the map to place it");
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const save = async () => {
    if (!result) return;
    if (!coords) { toast.error("Set a location by clicking on the map"); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/habitat/posts`, {
        image_base64: image,
        score: result.score,
        summary: result.summary,
        ecosystem: result.ecosystem,
        location_name: locName || result.ecosystem || "Unknown location",
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      toast.success("Habitat post saved to the map");
      setImage(null); setResult(null); setCoords(null); setLocName("");
      onSaved && onSaved();
    } catch (e) {
      toast.error("Could not save post");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Left: dropzone */}
      <div className="glass rounded-2xl p-6 sm:p-8">
        <p className="subheading text-xs uppercase tracking-[0.25em] mb-2 font-accent" style={{ color: "var(--emerald-bright)" }}>Habitat Photo</p>
        <h2 className="font-display text-3xl mb-6" style={{ color: "var(--sand-warm)" }}>Upload & Assess</h2>

        <input
          ref={fileRef}
          data-testid="habitat-file-input"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <div
          data-testid="habitat-upload-dropzone"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
          className="relative rounded-xl overflow-hidden cursor-pointer transition-colors duration-200 flex items-center justify-center"
          style={{ minHeight: 300, border: "1.5px dashed rgba(230,213,184,0.25)", background: "rgba(7,14,11,0.4)" }}
        >
          {image ? (
            <>
              <img src={image} alt="habitat" className="w-full h-[300px] object-cover" />
              {analyzing && <div className="scanline" />}
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-12 text-center px-6">
              <Camera size={34} color="var(--emerald-bright)" />
              <p className="font-body" style={{ color: "var(--text-secondary)" }}>Click or drop a habitat photo</p>
              <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>JPEG · PNG · WEBP</p>
            </div>
          )}
        </div>

        <button
          data-testid="habitat-analyze-button"
          disabled={!image || analyzing}
          onClick={analyze}
          className="mt-5 w-full py-3 rounded-xl font-accent uppercase text-sm flex items-center justify-center gap-2 transition-transform duration-200 hover:scale-[1.01] disabled:opacity-40"
          style={{ background: "var(--emerald)", color: "var(--bg-primary)" }}
        >
          {analyzing ? <><Loader2 size={16} className="animate-spin" /> Analyzing…</> : <><Leaf size={16} /> Analyze Habitat</>}
        </button>
      </div>

      {/* Right: results */}
      <div className="glass rounded-2xl p-6 sm:p-8">
        {!result ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-16">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid var(--border-subtle)" }}>
              <Leaf size={26} color="var(--text-muted)" />
            </div>
            <p className="font-body" style={{ color: "var(--text-muted)" }}>AI health assessment will appear here</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-6 mb-6">
              <HabitatScoreGauge score={result.score} size={150} />
              <div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-accent uppercase mb-2" style={{ background: `${scoreColor(result.score)}22`, color: scoreColor(result.score), border: `1px solid ${scoreColor(result.score)}55` }}>
                  {scoreLabel(result.score)}
                </span>
                <p className="font-display text-2xl" style={{ color: "var(--sand-warm)" }}>{result.ecosystem || "Ecosystem"}</p>
              </div>
            </div>

            <p className="text-xs uppercase tracking-[0.2em] font-accent mb-2" style={{ color: "var(--emerald-bright)" }}>Health Summary</p>
            <p data-testid="habitat-summary-text" className="font-body leading-relaxed mb-6" style={{ color: "var(--text-secondary)" }}>{result.summary}</p>

            <label className="text-xs uppercase tracking-[0.2em] font-accent mb-2 block" style={{ color: "var(--emerald-bright)" }}>Location Name</label>
            <input
              data-testid="habitat-location-input"
              value={locName}
              onChange={(e) => setLocName(e.target.value)}
              placeholder="e.g. Borneo Lowland Forest"
              className="w-full mb-4 px-4 py-2.5 rounded-lg font-body outline-none"
              style={{ background: "rgba(7,14,11,0.5)", border: "1px solid var(--border-subtle)", color: "var(--sand-warm)" }}
            />

            <div className="flex items-center gap-2 mb-2 text-xs font-mono" style={{ color: coords ? "var(--emerald-bright)" : "var(--text-muted)" }}>
              <MapPin size={13} />
              {coords ? `${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)}` : "Click map to set location"}
            </div>
            <MapView posts={[]} onPick={setCoords} pickMarker={coords} height={180} />

            <button
              data-testid="habitat-save-post-button"
              disabled={saving}
              onClick={save}
              className="mt-5 w-full py-3 rounded-xl font-accent uppercase text-sm flex items-center justify-center gap-2 transition-transform duration-200 hover:scale-[1.01] disabled:opacity-40"
              style={{ background: "var(--sand-warm)", color: "var(--bg-primary)" }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Post
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};
