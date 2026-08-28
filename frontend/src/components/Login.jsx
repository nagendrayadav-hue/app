import React, { useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Leaf, Lock, Mail, Loader2, ArrowRight } from "lucide-react";
import { AuroraBackground } from "@/components/AuroraBackground";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const HERO = "https://images.unsplash.com/photo-1765833667313-2dbad5069581?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";

const formatErr = (detail) => {
  if (detail == null) return "Something went wrong";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((e) => e?.msg || "").join(" ");
  return String(detail);
};

export const Login = ({ onLogin }) => {
  const [email, setEmail] = useState("ranger@biodash.app");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(`${API}/auth/login`, { email, password });
      onLogin(data.token, data.user);
    } catch (err) {
      setError(formatErr(err.response?.data?.detail) || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grain relative flex items-center justify-center p-4" data-testid="login-screen">
      <AuroraBackground />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-4xl grid md:grid-cols-2 rounded-3xl overflow-hidden glass"
        style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}
      >
        {/* hero */}
        <div className="relative hidden md:block">
          <img src={HERO} alt="habitat" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(7,14,11,0.3), rgba(7,14,11,0.95))" }} />
          <div className="absolute bottom-8 left-8 right-8">
            <p className="font-display text-4xl leading-tight" style={{ color: "var(--sand-warm)" }}>
              Read the pulse of the wild.
            </p>
            <p className="prose-notable mt-3" style={{ color: "var(--emerald-light)" }}>
              Habitat intelligence, one photo at a time.
            </p>
          </div>
        </div>

        {/* form */}
        <div className="p-8 sm:p-12 flex flex-col justify-center" style={{ background: "rgba(7,14,11,0.5)" }}>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "var(--emerald-deep)", boxShadow: "0 0 22px rgba(16,185,129,0.4)" }}>
              <Leaf size={22} color="#A7F3D0" />
            </div>
            <span className="font-display text-3xl" style={{ color: "var(--sand-warm)" }}>
              Bio<span style={{ color: "var(--emerald-bright)" }}>Dash</span>
            </span>
          </div>

          <h1 className="font-display text-3xl mb-1" style={{ color: "var(--sand-warm)" }}>Welcome back</h1>
          <p className="prose-notable mb-8" style={{ color: "var(--text-muted)" }}>Sign in to your field station.</p>

          <form onSubmit={submit} className="space-y-4">
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2" color="var(--text-muted)" />
              <input
                data-testid="login-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full pl-11 pr-4 py-3 rounded-xl outline-none focus:ring-2 transition-shadow"
                style={{ background: "rgba(20,34,27,0.7)", border: "1px solid var(--border-subtle)", color: "var(--sand-warm)", fontSize: 13 }}
                required
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2" color="var(--text-muted)" />
              <input
                data-testid="login-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full pl-11 pr-4 py-3 rounded-xl outline-none focus:ring-2 transition-shadow"
                style={{ background: "rgba(20,34,27,0.7)", border: "1px solid var(--border-subtle)", color: "var(--sand-warm)", fontSize: 13 }}
                required
              />
            </div>

            {error && (
              <p data-testid="login-error" className="text-xs" style={{ color: "#FCA5A5" }}>{error}</p>
            )}

            <button
              data-testid="login-submit-button"
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-accent uppercase text-sm flex items-center justify-center gap-2 transition-transform duration-200 hover:scale-[1.02] disabled:opacity-50"
              style={{ background: "var(--emerald-bright)", color: "var(--bg-primary)" }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <>Enter <ArrowRight size={16} /></>}
            </button>
          </form>

          <p className="mt-6 text-[10px]" style={{ color: "var(--text-muted)" }}>
            Demo access · ranger@biodash.app / wildlife123
          </p>
        </div>
      </motion.div>
    </div>
  );
};
