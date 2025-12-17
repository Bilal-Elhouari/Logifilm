import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { supabase } from "../supabaseClient";

export default function HomeMac() {
  const [selected, setSelected] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [companies, setCompanies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  /* AUTH CHECK */
  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) navigate("/mac/auth");
    }
    checkAuth();
  }, []);

  /* LOAD COMPANIES */
  useEffect(() => {
    async function fetchCompanies() {
      try {
        const data = await api.getAllCompanies();
        if (data) setCompanies(data.map((c: any) => c.name));
      } catch (err) {
        console.error("Error fetching companies:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCompanies();
  }, []);

  /* RESPONSIVE SCALE */
  useEffect(() => {
    function updateScale() {
      const w = window.innerWidth;
      if (w < 900) setScale(0.9);
      else if (w < 1400) setScale(1);
      else setScale(1.15);
    }
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const showEnterButton = selected !== null && selected !== "";

  /* ENTER */
  const handleEnter = async () => {
    const companyInput = document.querySelector(
      'input[placeholder="Entrer votre company"]'
    ) as HTMLInputElement;

    const jobInput = document.querySelector(
      'input[placeholder="Entrer votre job"]'
    ) as HTMLInputElement;

    let companyName =
      selected === "Nouveau" ? companyInput?.value.trim() : selected;

    if (selected === "Nouveau") {
      if (!companyName) return alert("Veuillez entrer un nom de company.");

      try {
        const createdCompany = await api.createCompany(companyName);

        const jobName = jobInput?.value.trim();
        if (!jobName) return alert("Veuillez entrer un job.");

        await api.createJob(jobName, createdCompany.id);
        navigate(`/mac/company/${companyName}`);
        return;
      } catch (err: any) {
        alert("Erreur creation: " + (err.message || err));
        return;
      }
    }

    navigate(`/mac/company/${companyName}`);
  };

  /* UI */
  return (
    <div
      className="relative h-screen w-full flex flex-col items-center
      bg-[linear-gradient(180deg,#f8f9ff,#e8edff)] 
      dark:bg-[linear-gradient(180deg,#1a1b1f,#0f1014)]
    "
      style={{
        fontFamily: "'SF Pro Display', -apple-system, system-ui",
      }}
    >
      {/* MAC TOP BAR */}
      <div
        className="
        w-full h-12 fixed top-0 left-0 z-30
        backdrop-blur-xl bg-white/40 dark:bg-white/10
        border-b border-white/30 dark:border-white/10
        flex items-center justify-center
        text-black dark:text-white 
        text-sm font-medium
      "
      >
        LogiFilm
      </div>

      {/* MAIN */}
      <div className="flex-1 flex flex-col items-center justify-start pt-24 px-4 w-full">
        <h1 className="text-4xl font-semibold mb-20 text-black dark:text-white">
          LogiFilm - Home
        </h1>

        {/* CARD */}
        <motion.div
          animate={{ scale }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="
          w-full max-w-xl p-8 rounded-3xl
          bg-white/60 dark:bg-white/10 
          backdrop-blur-3xl
          shadow-[0_6px_30px_rgba(0,0,0,0.12)]
          border border-white/50 dark:border-white/10
        "
        >
          {/* SELECT COMPANY */}
          <div className="mb-8">
            <div className="relative">
              <select
                className="
                  w-full px-4 py-3 rounded-2xl 
                  bg-white/80 dark:bg-white/5
                  border border-gray-300 dark:border-white/10 
                  shadow-sm text-gray-700 dark:text-white
                  focus:outline-none appearance-none transition
                "
                value={selected || ""}
                onChange={(e) => setSelected(e.target.value)}
                disabled={loading}
              >
                <option value="" disabled>
                  {loading ? "Chargement..." : "Sélectionnez une company"}
                </option>

                {companies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}

                <option value="Nouveau">Nouveau</option>
              </select>

              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-300 pointer-events-none">
                ▼
              </div>
            </div>
          </div>

          {/* NEW COMPANY FORM */}
          <AnimatePresence>
            {selected === "Nouveau" && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.35 }}
                className="space-y-6 mb-8"
              >
                <Field label="Company" placeholder="Entrer votre company" />
                <Field label="Job" placeholder="Entrer votre job" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ENTER BUTTON */}
          <AnimatePresence>
            {showEnterButton && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.3 }}
                className="flex w-full justify-center"
              >
                <button
                  onClick={handleEnter}
                  className="
                    px-10 py-3 rounded-2xl 
                    bg-white/70 dark:bg-white/10 
                    backdrop-blur-xl 
                    shadow-md border border-white/30 dark:border-white/10 
                    text-black dark:text-white font-medium 
                    hover:scale-105 hover:bg-white/90 dark:hover:bg-white/20
                    active:scale-95
                    transition-all
                  "
                >
                  Entrer
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

function Field({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div className="flex flex-col">
      <label className="text-sm font-medium text-black/70 dark:text-white/70 mb-1">
        {label}
      </label>
      <input
        type="text"
        placeholder={placeholder}
        className="
          w-full px-4 py-3 rounded-2xl 
          bg-gray-100 dark:bg-white/5 
          border border-gray-300 dark:border-white/10
          text-black dark:text-white
          focus:outline-none
        "
      />
    </div>
  );
}
