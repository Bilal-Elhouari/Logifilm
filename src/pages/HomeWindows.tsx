import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { supabase } from "../supabaseClient";

export default function HomeWindows() {
  const [selected, setSelected] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [companies, setCompanies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // State for new company form
  const [newCompany, setNewCompany] = useState("");
  const [newJob, setNewJob] = useState("");

  /* ---------------------------------------------------------
     🌗 DARK / LIGHT AUTO (Windows)
  --------------------------------------------------------- */
  const [dark, setDark] = useState(
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  /* ---------------------------------------------------------
     🔐 AUTH CHECK
  --------------------------------------------------------- */
  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) navigate("/windows/auth");
    }
    checkAuth();
  }, []);

  /* ---------------------------------------------------------
     FETCH COMPANIES
  --------------------------------------------------------- */
  useEffect(() => {
    async function fetchCompanies() {
      try {
        const data = await api.getAllCompanies();
        if (data) {
          setCompanies(data.map((c: { name: string }) => c.name));
        }
      } catch (error) {
        console.error("Error fetching companies:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchCompanies();
  }, []);

  /* ---------------------------------------------------------
     RESPONSIVE SCALE
  --------------------------------------------------------- */
  useEffect(() => {
    function updateScale() {
      const w = window.innerWidth;
      if (w < 900) setScale(0.9);
      else if (w < 1400) setScale(1);
      else setScale(1.1);
    }
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const showEnterButton = selected !== null && selected !== "";

  return (
    <div
      className="relative h-screen w-full flex flex-col items-center overflow-hidden"
      style={{
        fontFamily: "'Segoe UI', system-ui",
        background: dark
          ? "linear-gradient(180deg,#0b0f1a,#080a12)"
          : "linear-gradient(180deg,#f2f6ff,#e4e8f8)",
      }}
    >
      {/* BACKDROP / MICA LAYER */}
      <div
        className={`
          absolute inset-0 backdrop-blur-2xl 
          ${dark ? "bg-[#0b0f1a]/60" : "bg-white/20"}
        `}
      />

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col items-center pt-24 px-4 w-full">
        <h1
          className={`
            text-4xl font-semibold mb-20 drop-shadow-xl
            ${dark ? "text-white" : "text-[#1a1f29]"}
          `}
        >
          LogiFilm – Home
        </h1>

        {/* MAIN CARD */}
        <motion.div
          animate={{ scale }}
          transition={{ duration: 0.35 }}
          className={`
            w-full max-w-xl p-8 rounded-3xl shadow-xl border backdrop-blur-2xl
            ${dark
              ? "bg-white/5 border-white/10 text-white"
              : "bg-white/70 border-gray-300 text-[#1a1f29]"
            }
          `}
        >
          {/* SELECT COMPANY */}
          <div className="mb-8">
            <div className="relative">
              <select
                className={`
                  w-full px-4 py-3 rounded-xl border shadow-sm appearance-none
                  ${dark
                    ? "bg-white/10 border-white/20 text-white"
                    : "bg-white border-gray-300 text-black"
                  }
                `}
                value={selected || ""}
                onChange={(e) => setSelected(e.target.value)}
                disabled={loading}
              >
                <option value="" disabled>
                  {loading ? "Loading..." : "Select a company"}
                </option>

                {companies.map((c) => (
                  <option key={c} value={c} className="text-black">
                    {c}
                  </option>
                ))}

                <option value="Nouveau" className="text-black">New</option>
              </select>

              <div
                className={`
                  absolute right-4 top-1/2 -translate-y-1/2 text-lg
                  ${dark ? "text-white/50" : "text-gray-500"}
                `}
              >
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
                transition={{ duration: 0.25 }}
                className="space-y-6 mb-8"
              >
                <Field
                  dark={dark}
                  label="Company"
                  placeholder="Enter your company"
                  value={newCompany}
                  onChange={setNewCompany}
                />
                <Field
                  dark={dark}
                  label="Job"
                  placeholder="Enter your job"
                  value={newJob}
                  onChange={setNewJob}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ENTER BUTTON */}
          <AnimatePresence>
            {showEnterButton && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                transition={{ duration: 0.25 }}
                className="flex w-full justify-center"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={async () => {
                    if (selected === "Nouveau") {
                      const companyName = newCompany.trim();
                      const jobName = newJob.trim();

                      if (!companyName) {
                        alert("Please enter a company name");
                        return;
                      }
                      if (!jobName) {
                        alert("Please enter a job name");
                        return;
                      }

                      try {
                        const createdCompany = await api.createCompany(companyName);
                        await api.createJob(jobName, createdCompany.id);
                        navigate(`/windows/company/${companyName}`);
                      } catch (err: any) {
                        alert("Error creating company or job: " + (err.message || err));
                        return;
                      }
                    } else {
                      navigate(`/windows/company/${selected}`);
                    }
                  }}
                  className={`
                    px-12 py-3 rounded-xl font-semibold transition-all shadow-md
                    ${dark
                      ? "bg-blue-600 text-white hover:bg-blue-500"
                      : "bg-blue-600 text-white hover:bg-blue-500"
                    }
                  `}
                >
                  Enter
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

/* ---------------- FIELD COMPONENT ---------------- */
function Field({
  label,
  placeholder,
  dark,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  dark: boolean;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="flex flex-col">
      <label className={`text-sm mb-1 font-medium ${dark ? "text-white/90" : "text-gray-700"}`}>
        {label}
      </label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`
          w-full px-4 py-3 rounded-xl border transition
          ${dark
            ? "bg-white/10 border-white/20 text-white placeholder-white/40"
            : "bg-white border-gray-300 text-black"
          }
        `}
      />
    </div>
  );
}
