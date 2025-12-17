import { useParams, useNavigate } from "react-router-dom";
import { JSX, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Wallet, LogOut, Plus, Check, X, Trash2 } from "lucide-react";
import { supabase } from "../supabaseClient";
import { api } from "../services/api";

export default function DashboardWindows() {
  const { name } = useParams();
  const navigate = useNavigate();

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [addingJob, setAddingJob] = useState(false);
  const [showJobInput, setShowJobInput] = useState(false);
  const [newJobName, setNewJobName] = useState("");

  // 🌙 / ☀️ DARK MODE AUTO (Windows + macOS)
  const [dark, setDark] = useState(
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  /* ---------------- FETCH COMPANY ---------------- */
  useEffect(() => {
    async function fetchCompany() {
      const { data, error } = await supabase
        .from("companies")
        .select("id")
        .eq("name", name)
        .single();

      if (error || !data) {
        console.error("Error fetching company:", error);
        alert("Impossible de trouver cette company.");
        setCompanyId(null);
      } else {
        setCompanyId(data.id);
      }

      setLoadingCompany(false);
    }

    fetchCompany();
  }, [name]);

  /* ---------------- FETCH JOBS ---------------- */
  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function fetchJobs() {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("company_id", companyId)
        .order("name");

      if (error) {
        console.error("Error loading jobs:", error);
      } else {
        setJobs(data || []);
      }

      setLoading(false);
    }

    fetchJobs();
  }, [companyId]);

  /* ---------------- SAVE JOB ---------------- */
  async function saveJob() {
    if (!companyId) return alert("Company non chargée.");
    if (!newJobName || !newJobName.trim()) return;

    setAddingJob(true);

    const { data, error } = await supabase
      .from("jobs")
      .insert([{ name: newJobName.trim(), company_id: companyId }])
      .select("*")
      .single();

    if (error) {
      alert("Erreur création job.");
      console.error(error);
    } else {
      setJobs((prev) =>
        [...prev, data].sort((a, b) =>
          (a.name || "").localeCompare(b.name || "")
        )
      );
      setNewJobName("");
      setShowJobInput(false);
    }

    setAddingJob(false);
    setAddingJob(false);
  }

  /* ---------------- DELETE JOB ---------------- */
  const handleDeleteJob = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Empêche la navigation
    if (!confirm("Voulez-vous vraiment supprimer ce job ? Cette action est irréversible.")) return;

    try {
      await api.deleteJob(id);
      setJobs((prev) => prev.filter((j) => j.id !== id));
    } catch (err) {
      console.error("Erreur suppression job:", err);
      alert("Erreur lors de la suppression du job.");
    }
  };

  const sidebarItems = [
    {
      icon: <Users size={18} />,
      label: "Crew Management",
      path: `/windows/company/${name}/crew-management`,
    },
    { icon: <Wallet size={18} />, label: "Payroll" },
  ];

  /* ---------------- WINDOWS UI ---------------- */
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={`h-screen w-full flex overflow-hidden transition-colors duration-300 ${dark ? "bg-[#050814] text-white" : "bg-[#e5ecff] text-black"
        }`}
      style={{
        fontFamily: "'Segoe UI', system-ui",
      }}
    >
      {/* ---------------- SIDEBAR ---------------- */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`
          w-64 h-full px-6 py-8 flex flex-col justify-between select-none
          backdrop-blur-xl border-r shadow-[4px_0_35px_rgba(0,0,0,0.25)]
          ${dark
            ? "bg-white/10 border-white/20"
            : "bg-white/90 border-black/10"
          }
        `}
      >
        <div className="flex flex-col gap-3 mt-2">
          {sidebarItems.map((item, index) => (
            <SidebarItem
              key={index}
              icon={item.icon}
              label={item.label}
              onClick={() => item.path && navigate(item.path)}
              dark={dark}
            />
          ))}
        </div>

        {/* FOOTER */}
        <div
          className={`
            mt-auto pt-4 border-t flex flex-col gap-4
            ${dark ? "border-white/20" : "border-black/10"}
          `}
        >
          <p
            className={`text-xs ${dark ? "text-white/60" : "text-black/70"
              }`}
          >
            Company:{" "}
            <span
              className={`font-medium capitalize ${dark ? "text-white" : "text-black"
                }`}
            >
              {name}
            </span>
          </p>

          <motion.button
            whileHover={{
              scale: 1.05,
              backgroundColor: dark
                ? "rgba(255,77,77,0.15)"
                : "rgba(220,53,69,0.12)",
              boxShadow: "0 0 10px rgba(255,77,77,0.25)",
            }}
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate("/windows/home")}
            className={`
              flex items-center justify-center gap-2 py-2 rounded-xl
              font-medium text-sm transition
              ${dark
                ? "text-red-400"
                : "text-red-600 bg-white/80 hover:bg-white"
              }
            `}
          >
            <LogOut size={16} />
            Quitter
          </motion.button>
        </div>
      </motion.aside>

      {/* ---------------- MAIN CONTENT ---------------- */}
      <motion.main
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`flex-1 p-10 overflow-y-auto transition-colors ${dark ? "text-white" : "text-black"
          }`}
      >
        <h1 className="text-3xl font-semibold mb-8">
          Dashboard – {name}
        </h1>

        {/* ---------------- JOBS CARD ---------------- */}
        <div
          className={`
            rounded-3xl p-8 mb-10 backdrop-blur-2xl border shadow-[0_8px_40px_rgba(0,0,0,0.2)]
            ${dark
              ? "bg-white/10 border-white/20"
              : "bg-white border-black/10"
            }
        `}
        >
          <div className="flex items-center justify-between mb-4">
            <h3
              className={`text-xl font-medium ${dark ? "text-white/90" : "text-black/90"
                }`}
            >
              Jobs
            </h3>

            <button
              onClick={() => {
                setShowJobInput(true);
                setTimeout(() => document.getElementById("new-job-input")?.focus(), 50);
              }}
              disabled={loadingCompany || addingJob || showJobInput}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-xl shadow border transition
                ${loadingCompany || addingJob || showJobInput
                  ? dark
                    ? "bg-white/5 text-gray-400 border-white/10 cursor-not-allowed"
                    : "bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed"
                  : dark
                    ? "bg-white/15 hover:bg-white/25 text-white border-white/30"
                    : "bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
                }
              `}
            >
              <Plus size={16} />
              {addingJob ? "Ajout..." : "Ajouter Job"}
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {/* NEW JOB INPUT ROW */}
            <AnimatePresence>
              {showJobInput && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  className={`
                      flex items-center gap-2 p-2 rounded-xl border
                      ${dark ? "bg-white/5 border-white/15" : "bg-white border-gray-200"}
                   `}
                >
                  <input
                    id="new-job-input"
                    type="text"
                    value={newJobName}
                    onChange={(e) => setNewJobName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveJob();
                      if (e.key === "Escape") setShowJobInput(false);
                    }}
                    placeholder="Nom du nouveau job..."
                    className={`
                      flex-1 bg-transparent outline-none px-2
                      ${dark ? "text-white placeholder-white/40" : "text-black placeholder-gray-400"}
                    `}
                  />
                  <button
                    onClick={saveJob}
                    disabled={addingJob}
                    className="p-2 rounded-lg bg-green-500/20 text-green-500 hover:bg-green-500/30 transition"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    onClick={() => setShowJobInput(false)}
                    className="p-2 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30 transition"
                  >
                    <X size={18} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {loading ? (
              <p className={dark ? "text-white/60" : "text-black/60"}>
                Chargement...
              </p>
            ) : jobs.length === 0 && !showJobInput ? (
              <p className={dark ? "text-white/60" : "text-black/60"}>
                Aucun job trouvé.
              </p>
            ) : (
              jobs.map((job) => (
                <motion.div
                  key={job.id}
                  whileHover={{ scale: 1.02 }}
                  className={`
                      p-4 rounded-xl shadow border cursor-pointer transition group
                      ${dark
                      ? "bg-white/15 border-white/20 hover:bg-white/25 text-white"
                      : "bg-white border-black/10 hover:bg-blue-50 text-black"
                    }
                    `}
                  onClick={() =>
                    navigate(
                      `/windows/company/${name}/crew-management?job=${job.id}`
                    )
                  }
                >

                  <div className="flex justify-between items-center">
                    <p className="font-medium">{job.name}</p>
                    <button
                      onClick={(e) => handleDeleteJob(job.id, e)}
                      className={`
                        p-2 rounded-lg transition opacity-0 group-hover:opacity-100
                        ${dark ? "hover:bg-red-500/20 text-red-400" : "hover:bg-red-100 text-red-600"}
                      `}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </motion.main>
    </motion.div>
  );
}

/* ---------------- SIDEBAR ITEM ---------------- */
function SidebarItem({
  icon,
  label,
  onClick,
  dark,
}: {
  icon: JSX.Element;
  label: string;
  onClick?: () => void;
  dark: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={`
        flex items-center gap-3 px-3 py-2 rounded-lg
        backdrop-blur-xl border transition-all duration-200 text-sm font-medium
        ${dark
          ? "bg-white/10 hover:bg-white/20 text-white/80 border-white/20"
          : "bg-white/80 hover:bg-white text-black/80 border-black/10"
        }
      `}
    >
      <span className={dark ? "text-white" : "text-black"}>{icon}</span>
      <span>{label}</span>
    </motion.button>
  );
}
