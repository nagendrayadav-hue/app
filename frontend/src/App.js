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

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function App() {
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

  useEffect(() => { loadPosts(); }, [loadPosts]);

  return (
    <div className="min-h-screen grain" data-testid="app-root">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(circle at 15% 0%, rgba(6,78,59,0.35), transparent 45%), radial-gradient(circle at 85% 100%, rgba(16,185,129,0.12), transparent 50%)" }}
      />
      <div className="relative z-10">
        <Header active={tab} onChange={setTab} />
        <main className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
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
