import { useCallback, useEffect, useState } from "react";
import "@/App.css";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "sonner";
import { Header } from "@/components/Header";
import { HabitatUploadTab } from "@/components/HabitatUploadTab";
import { HabitatMapTab } from "@/components/HabitatMapTab";
import { AnimalIdentifyTab } from "@/components/AnimalIdentifyTab";
import { StatsTab } from "@/components/StatsTab";
import { Login } from "@/components/Login";
import { AuroraBackground } from "@/components/AuroraBackground";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const setAuthHeader = (token) => {
  if (token) axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  else delete axios.defaults.headers.common["Authorization"];
};

function App() {
  const [authed, setAuthed] = useState(null); // null=checking, false=out, true=in
  const initialTab = new URLSearchParams(window.location.search).get("tab") || "upload";
  const [tab, setTab] = useState(["upload", "map", "insights", "animal"].includes(initialTab) ? initialTab : "upload");
  const [posts, setPosts] = useState([]);

  const loadPosts = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/habitat/posts`);
      setPosts(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("biodash_token");
    if (!token) { setAuthed(false); return; }
    setAuthHeader(token);
    axios
      .get(`${API}/auth/me`)
      .then(() => setAuthed(true))
      .catch(() => { localStorage.removeItem("biodash_token"); setAuthHeader(null); setAuthed(false); });
  }, []);

  useEffect(() => { if (authed) loadPosts(); }, [authed, loadPosts]);

  const handleLogin = (token, user) => {
    localStorage.setItem("biodash_token", token);
    setAuthHeader(token);
    setAuthed(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("biodash_token");
    setAuthHeader(null);
    setAuthed(false);
  };

  if (authed === null) {
    return <div className="min-h-screen" style={{ background: "#070E0B" }} />;
  }

  if (!authed) return <Login onLogin={handleLogin} />;

  return (
    <div className="min-h-screen grain relative" data-testid="app-root">
      <AuroraBackground />
      <div className="relative" style={{ zIndex: 10 }}>
        <Header active={tab} onChange={setTab} onLogout={handleLogout} />
        <main className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {tab === "upload" && <HabitatUploadTab onSaved={() => { loadPosts(); setTab("map"); }} />}
              {tab === "map" && <HabitatMapTab posts={posts} onChanged={loadPosts} />}
              {tab === "insights" && <StatsTab posts={posts} />}
              {tab === "animal" && <AnimalIdentifyTab />}
            </motion.div>
          </AnimatePresence>
        </main>
        <footer className="max-w-6xl mx-auto px-5 sm:px-8 py-8 text-xs font-mono" style={{ color: "var(--text-muted)" }}>
          BioDash · habitat intelligence
        </footer>
      </div>
      <Toaster theme="dark" position="bottom-right" richColors />
    </div>
  );
}

export default App;
