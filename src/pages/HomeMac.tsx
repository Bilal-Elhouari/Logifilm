import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { api } from "../services/api";
import { supabase } from "../supabaseClient";

interface Company {
  name: string;
}

export default function HomeMac() {
  const [selected, setSelected] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [companies, setCompanies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // State for new company form (CONTROLLED INPUTS)
  const [newCompany, setNewCompany] = useState("");
  const [newJob, setNewJob] = useState("");

  /* AUTH CHECK */
  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) navigate("/mac/auth");
    }
    checkAuth();
  }, [navigate]);

  /* LOAD COMPANIES */
  useEffect(() => {
    async function fetchCompanies() {
      try {
        const data = await api.getAllCompanies();
        if (data) setCompanies(data.map((c: Company) => c.name));
      } catch (err) {
        console.error("Error fetching companies:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCompanies();
  }, []);

  /* RESPONSIVE SCALE (DEBOUNCED) */
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    function updateScale() {
      const w = window.innerWidth;
      if (w < 900) setScale(0.9);
      else if (w < 1400) setScale(1);
      else setScale(1.15);
    }

    // Initial call
    updateScale();

    function handleResize() {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateScale, 100);
    }

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  /* CLICK OUTSIDE TO CLOSE DROPDOWN */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const showEnterButton = selected !== null && selected !== "";

  /* ENTER */
  const handleEnter = async () => {
    if (selected === "Nouveau") {
      const companyName = newCompany.trim();
      const jobName = newJob.trim();

      if (!companyName) {
        alert("Veuillez entrer un nom de company.");
        return;
      }
      if (!jobName) {
        alert("Veuillez entrer un job.");
        return;
      }

      try {
        const createdCompany = await api.createCompany(companyName);
        await api.createJob(jobName, createdCompany.id);
        navigate(`/mac/company/${companyName}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        alert("Erreur creation: " + message);
      }
      return;
    }

    navigate(`/mac/company/${selected}`);
  };

  const handleSelect = (value: string) => {
    setSelected(value);
    setDropdownOpen(false);
  };

  const displayValue = selected || (loading ? "Chargement..." : "Sélectionnez une company");

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
          {/* CUSTOM MACOS DROPDOWN */}
          <div className="mb-8" ref={dropdownRef}>
            <div className="relative">
              {/* DROPDOWN BUTTON */}
              <button
                type="button"
                onClick={() => !loading && setDropdownOpen(!dropdownOpen)}
                disabled={loading}
                className={`
                  w-full px-4 py-3 rounded-2xl 
                  bg-white/80 dark:bg-white/5
                  border border-gray-300 dark:border-white/10 
                  shadow-sm
                  focus:outline-none appearance-none transition
                  flex items-center justify-between
                  ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-white dark:hover:bg-white/10"}
                  ${selected ? "text-gray-800 dark:text-white" : "text-gray-500 dark:text-gray-400"}
                `}
              >
                <span>{displayValue}</span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* DROPDOWN MENU */}
              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="
                      absolute top-full left-0 right-0 mt-2 z-50
                      rounded-xl overflow-hidden
                      bg-white dark:bg-[#1c1c1e]
                      backdrop-blur-2xl
                      border border-gray-200 dark:border-white/20
                      shadow-[0_10px_40px_rgba(0,0,0,0.25)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)]
                      max-h-64 overflow-y-auto
                    "
                  >
                    {/* COMPANY OPTIONS */}
                    {companies.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleSelect(c)}
                        className={`
                          w-full text-left px-4 py-3 text-sm transition-colors
                          ${selected === c
                            ? "bg-blue-500 text-white"
                            : "text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10"
                          }
                        `}
                      >
                        {c}
                      </button>
                    ))}

                    {/* SEPARATOR */}
                    {companies.length > 0 && (
                      <div className="border-t border-gray-200 dark:border-white/10 my-1" />
                    )}

                    {/* NOUVEAU OPTION */}
                    <button
                      type="button"
                      onClick={() => handleSelect("Nouveau")}
                      className={`
                        w-full text-left px-4 py-3 text-sm font-medium transition-colors
                        ${selected === "Nouveau"
                          ? "bg-blue-500 text-white"
                          : "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/20"
                        }
                      `}
                    >
                      + Nouveau
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
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
                <Field
                  label="Company"
                  placeholder="Entrer votre company"
                  value={newCompany}
                  onChange={setNewCompany}
                />
                <Field
                  label="Job"
                  placeholder="Entrer votre job"
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

interface FieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
}

function Field({ label, placeholder, value, onChange }: FieldProps) {
  return (
    <div className="flex flex-col">
      <label className="text-sm font-medium text-black/70 dark:text-white/70 mb-1">
        {label}
      </label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
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


