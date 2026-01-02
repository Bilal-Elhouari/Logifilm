import { useParams, useNavigate } from "react-router-dom";
import { JSX, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Wallet, LogOut, Plus, Trash2 } from "lucide-react";
import { supabase } from "../supabaseClient";
import { api } from "../services/api";

export default function DashboardMac() {
  const { name } = useParams();
  const navigate = useNavigate();

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [addingJob, setAddingJob] = useState(false);

  // Modal state for adding job
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [newJobName, setNewJobName] = useState("");

  /* ---------------- FETCH COMPANY ---------------- */
  useEffect(() => {
    async function fetchCompany() {
      if (!name) {
        setLoadingCompany(false);
        return;
      }

      // Use ilike for case-insensitive match
      const { data, error } = await supabase
        .from("companies")
        .select("id")
        .ilike("name", name)
        .single();

      if (error || !data) {
        console.error("Error fetching company:", error, "Name searched:", name);
        alert("Impossible de trouver cette company.");
        setCompanyId(null);
      } else {
        console.log("Company found:", data.id);
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

  /* ---------------- ADD JOB ---------------- */
  async function addJob() {
    if (!companyId) {
      alert("Company non chargée.");
      return;
    }

    if (!newJobName.trim()) {
      return;
    }

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
      setShowAddJobModal(false);
    }

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
      path: `/mac/company/${name}/crew-management`,
    },
    { icon: <Wallet size={18} />, label: "Payroll" },
  ];

  /* ---------------- UI ---------------- */
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="h-screen w-full flex overflow-hidden
      bg-[linear-gradient(180deg,#f8f9ff,#e8edff)]
      dark:bg-[linear-gradient(180deg,#1a1b1f,#0f1014)]
    "
      style={{
        fontFamily: "'SF Pro Display', -apple-system, system-ui",
      }}
    >
      {/* ---------------- SIDEBAR ---------------- */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="
          w-64 h-full px-6 py-8 flex flex-col justify-between select-none
          bg-white/40 dark:bg-white/10 
          backdrop-blur-2xl
          border-r border-white/30 dark:border-white/10
          shadow-[4px_0_25px_rgba(0,0,0,0.05)]
        "
      >
        <div className="flex flex-col gap-4 mt-2">
          {sidebarItems.map((item, index) => (
            <SidebarItem
              key={index}
              icon={item.icon}
              label={item.label}
              onClick={() => item.path && navigate(item.path)}
            />
          ))}
        </div>

        {/* FOOTER */}
        <div className="mt-auto pt-4 border-t border-white/30 dark:border-white/10 flex flex-col gap-4">
          <p className="text-xs text-black/50 dark:text-white/50">
            Company:{" "}
            <span className="text-black dark:text-white font-medium capitalize">
              {name}
            </span>
          </p>

          <motion.button
            whileHover={{
              scale: 1.05,
              backgroundColor: "rgba(255, 77, 77, 0.15)",
              boxShadow: "0 0 10px rgba(255,77,77,0.25)",
            }}
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate("/mac/home")}
            className="
              flex items-center justify-center gap-2 py-2 rounded-xl
              text-red-500 font-medium text-sm
              hover:brightness-110 
            "
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
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex-1 p-10 overflow-y-auto"
      >
        <h1 className="text-3xl font-semibold mb-8 text-black dark:text-white">
          Dashboard – {name}
        </h1>

        {/* ---------------- JOBS CARD ---------------- */}
        <div
          className="
            rounded-3xl p-8 mb-10
            bg-white/70 dark:bg-white/10 backdrop-blur-3xl 
            shadow-[0_8px_30px_rgba(0,0,0,0.08)]
            border border-white/40 dark:border-white/10
        "
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-medium text-black/80 dark:text-white/80">
              Jobs
            </h3>

            <button
              onClick={() => {
                console.log("Button clicked! loadingCompany:", loadingCompany, "addingJob:", addingJob);
                setShowAddJobModal(true);
              }}
              disabled={loadingCompany || addingJob}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-xl shadow border transition
                ${loadingCompany || addingJob
                  ? "bg-gray-200 dark:bg-white/5 text-gray-500 cursor-not-allowed"
                  : "bg-white/80 dark:bg-white/10 hover:brightness-110 text-black dark:text-white"
                }
              `}
            >
              <Plus size={16} />
              {addingJob ? "Ajout..." : "+ Ajouter Job"}
            </button>
          </div>

          {loading ? (
            <p className="text-black/50 dark:text-white/50">Chargement...</p>
          ) : jobs.length === 0 ? (
            <p className="text-black/50 dark:text-white/50">Aucun job trouvé.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {jobs.map((job) => (
                <motion.div
                  key={job.id}
                  whileHover={{ scale: 1.02 }}
                  className="
                    p-4 rounded-2xl bg-white/90 dark:bg-white/10 
                    shadow cursor-pointer border 
                    border-white/30 dark:border-white/10
                    hover:brightness-110 transition group
                  "
                  onClick={() =>
                    navigate(`/mac/company/${name}/crew-management?job=${job.id}`)
                  }
                >
                  <div className="flex justify-between items-center">
                    <p className="text-black dark:text-white font-medium">{job.name}</p>
                    <button
                      onClick={(e) => handleDeleteJob(job.id, e)}
                      className="
                        p-2 rounded-lg transition opacity-0 group-hover:opacity-100
                        hover:bg-red-500/20 text-red-500
                      "
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.main>

      {/* ---------------- ADD JOB MODAL ---------------- */}
      <AnimatePresence>
        {showAddJobModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAddJobModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="
                w-full max-w-md p-6 rounded-2xl
                bg-white dark:bg-[#2a2a2e]
                shadow-[0_20px_60px_rgba(0,0,0,0.3)]
                border border-gray-200 dark:border-white/10
              "
            >
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                Nouveau Job
              </h3>

              <input
                type="text"
                value={newJobName}
                onChange={(e) => setNewJobName(e.target.value)}
                placeholder="Nom du job..."
                autoFocus
                className="
                  w-full px-4 py-3 rounded-xl mb-4
                  bg-gray-100 dark:bg-white/10
                  border border-gray-300 dark:border-white/20
                  text-gray-900 dark:text-white
                  placeholder-gray-500 dark:placeholder-gray-400
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                "
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newJobName.trim()) {
                    addJob();
                  }
                }}
              />

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowAddJobModal(false);
                    setNewJobName("");
                  }}
                  className="
                    px-4 py-2 rounded-xl
                    bg-gray-200 dark:bg-white/10
                    text-gray-700 dark:text-white
                    hover:bg-gray-300 dark:hover:bg-white/20
                    transition
                  "
                >
                  Annuler
                </button>
                <button
                  onClick={addJob}
                  disabled={!newJobName.trim() || addingJob}
                  className={`
                    px-4 py-2 rounded-xl font-medium transition
                    ${!newJobName.trim() || addingJob
                      ? "bg-blue-300 text-white cursor-not-allowed"
                      : "bg-blue-500 text-white hover:bg-blue-600"
                    }
                  `}
                >
                  {addingJob ? "Création..." : "Créer"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ---------------- SIDEBAR ITEM ---------------- */
function SidebarItem({
  icon,
  label,
  onClick,
}: {
  icon: JSX.Element;
  label: string;
  onClick?: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{
        scale: 1.03,
      }}
      whileTap={{ scale: 0.97 }}
      className="
        flex items-center gap-3 px-3 py-2 rounded-lg
        text-black/70 dark:text-white/70 
        hover:text-black dark:hover:text-white
        bg-white/30 dark:bg-white/5 
        backdrop-blur-xl border border-white/20 dark:border-white/10
        transition-all duration-200 text-sm font-medium
      "
    >
      <span className="text-black/70 dark:text-white/70">{icon}</span>
      <span>{label}</span>
    </motion.button>
  );
}
