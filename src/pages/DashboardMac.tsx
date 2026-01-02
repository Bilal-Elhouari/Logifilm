import { useParams, useNavigate } from "react-router-dom";
import { JSX, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Wallet, LogOut, Plus, Check, X, Trash2 } from "lucide-react";
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
  const [showJobInput, setShowJobInput] = useState(false);
  const [newJobName, setNewJobName] = useState("");

  // 🌙 / ☀️ DARK MODE AUTO (macOS)
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
        [...prev, data].sort((a, b) => (a.name || "").localeCompare(b.name || ""))
      );
      setNewJobName("");
      setShowJobInput(false);
    }

    setAddingJob(false);
  }

  /* ---------------- DELETE JOB ---------------- */
  const handleDeleteJob = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      !confirm(
        "Voulez-vous vraiment supprimer ce job ? Cette action est irréversible."
      )
    )
      return;

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

  /* ---------------- macOS UI ---------------- */
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.995 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className={`h-screen w-full flex overflow-hidden transition-colors duration-300 ${dark ? "bg-[#0b0f1a] text-white" : "bg-[#f3f5f9] text-black"
        }`}
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui',
      }}
    >
      {/* ---------------- SIDEBAR ---------------- */}
      <motion.aside
        initial={{ x: -14, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className={`
          w-[270px] h-full px-5 py-6 flex flex-col justify-between select-none
          border-r shadow-[6px_0_40px_rgba(0,0,0,0.22)]
          ${dark ? "border-white/10" : "border-black/10"}
        `}
        style={{
          background: dark
            ? "rgba(255,255,255,0.06)"
            : "rgba(255,255,255,0.70)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
        }}
      >
        {/* Top */}
        <div>
          <div className="mb-5">
            <p className={`text-[11px] tracking-wide ${dark ? "text-white/55" : "text-black/55"}`}>
              DASHBOARD
            </p>
            <h2 className="text-lg font-semibold capitalize leading-tight">
              {name}
            </h2>
          </div>

          <div className="flex flex-col gap-2">
            {sidebarItems.map((item, index) => (
              <SidebarItemMac
                key={index}
                icon={item.icon}
                label={item.label}
                onClick={() => item.path && navigate(item.path)}
                dark={dark}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          className={`
            mt-auto pt-4 border-t flex flex-col gap-3
            ${dark ? "border-white/10" : "border-black/10"}
          `}
        >
          <p className={`text-xs ${dark ? "text-white/55" : "text-black/60"}`}>
            Company:{" "}
            <span className={`font-medium capitalize ${dark ? "text-white" : "text-black"}`}>
              {name}
            </span>
          </p>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/mac/home")}
            className={`
              flex items-center justify-center gap-2 py-2 rounded-2xl
              font-medium text-sm transition border
              ${dark
                ? "text-white/80 border-white/10 hover:border-white/20"
                : "text-black/70 border-black/10 hover:border-black/20"}
            `}
            style={{
              background: dark
                ? "rgba(255,255,255,0.06)"
                : "rgba(255,255,255,0.65)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
            }}
          >
            <LogOut size={16} />
            Quitter
          </motion.button>
        </div>
      </motion.aside>

      {/* ---------------- MAIN ---------------- */}
      <motion.main
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`flex-1 p-10 overflow-y-auto transition-colors ${dark ? "text-white" : "text-black"
          }`}
      >
        <h1 className="text-3xl font-semibold mb-8">Dashboard</h1>

        {/* ---------------- JOBS CARD ---------------- */}
        <div
          className="rounded-[28px] p-7 mb-10 border shadow-[0_10px_45px_rgba(0,0,0,0.18)]"
          style={{
            background: dark
              ? "rgba(255,255,255,0.07)"
              : "rgba(255,255,255,0.75)",
            backdropFilter: "blur(22px)",
            WebkitBackdropFilter: "blur(22px)",
            borderColor: dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-xl font-semibold ${dark ? "text-white/90" : "text-black/90"}`}>
              Jobs
            </h3>

            <button
              onClick={() => {
                setShowJobInput(true);
                setTimeout(
                  () => document.getElementById("new-job-input")?.focus(),
                  50
                );
              }}
              disabled={loadingCompany || addingJob || showJobInput}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-2xl border transition
                ${loadingCompany || addingJob || showJobInput
                  ? dark
                    ? "bg-white/5 text-white/35 border-white/10 cursor-not-allowed"
                    : "bg-black/5 text-black/35 border-black/10 cursor-not-allowed"
                  : "text-white border-white/10"}
              `}
              style={{
                background:
                  loadingCompany || addingJob || showJobInput
                    ? undefined
                    : dark
                      ? "rgba(10,132,255,0.35)"
                      : "rgba(10,132,255,0.85)",
                boxShadow:
                  loadingCompany || addingJob || showJobInput
                    ? "none"
                    : "0 10px 30px rgba(10,132,255,0.22)",
              }}
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
                  initial={{ opacity: 0, height: 0, y: -8 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -8 }}
                  className="flex items-center gap-2 p-2 rounded-2xl border"
                  style={{
                    background: dark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(255,255,255,0.70)",
                    borderColor: dark
                      ? "rgba(255,255,255,0.10)"
                      : "rgba(0,0,0,0.10)",
                    backdropFilter: "blur(18px)",
                    WebkitBackdropFilter: "blur(18px)",
                  }}
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
                    className={`flex-1 bg-transparent outline-none px-2 ${dark ? "text-white placeholder-white/35" : "text-black placeholder-black/35"
                      }`}
                  />

                  <button
                    onClick={saveJob}
                    disabled={addingJob}
                    className="p-2 rounded-xl transition border"
                    style={{
                      background: "rgba(52,199,89,0.18)",
                      borderColor: "rgba(52,199,89,0.22)",
                    }}
                    title="Valider"
                  >
                    <Check size={18} className="text-[rgb(52,199,89)]" />
                  </button>

                  <button
                    onClick={() => setShowJobInput(false)}
                    className="p-2 rounded-xl transition border"
                    style={{
                      background: "rgba(255,69,58,0.16)",
                      borderColor: "rgba(255,69,58,0.20)",
                    }}
                    title="Annuler"
                  >
                    <X size={18} className="text-[rgb(255,69,58)]" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {loading ? (
              <p className={dark ? "text-white/55" : "text-black/55"}>Chargement...</p>
            ) : jobs.length === 0 && !showJobInput ? (
              <p className={dark ? "text-white/55" : "text-black/55"}>Aucun job trouvé.</p>
            ) : (
              jobs.map((job) => (
                <motion.div
                  key={job.id}
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.995 }}
                  className="p-4 rounded-2xl border cursor-pointer transition group"
                  style={{
                    background: dark
                      ? "rgba(255,255,255,0.07)"
                      : "rgba(255,255,255,0.72)",
                    borderColor: dark
                      ? "rgba(255,255,255,0.10)"
                      : "rgba(0,0,0,0.08)",
                    backdropFilter: "blur(18px)",
                    WebkitBackdropFilter: "blur(18px)",
                    boxShadow: dark
                      ? "0 10px 35px rgba(0,0,0,0.20)"
                      : "0 10px 35px rgba(0,0,0,0.10)",
                  }}
                  onClick={() =>
                    navigate(`/mac/company/${name}/crew-management?job=${job.id}`)
                  }
                >
                  <div className="flex justify-between items-center">
                    <p className="font-medium">{job.name}</p>
                    <button
                      onClick={(e) => handleDeleteJob(job.id, e)}
                      className={`
                        p-2 rounded-xl transition opacity-0 group-hover:opacity-100 border
                        ${dark ? "text-red-300 border-white/10" : "text-red-600 border-black/10"}
                      `}
                      style={{
                        background: dark
                          ? "rgba(255,69,58,0.12)"
                          : "rgba(255,69,58,0.10)",
                      }}
                      title="Supprimer"
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

/* ---------------- SIDEBAR ITEM (macOS) ---------------- */
function SidebarItemMac({
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
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        flex items-center gap-3 px-3 py-2 rounded-2xl text-sm font-medium
        border transition-all duration-200
        ${dark ? "text-white/80 border-white/10" : "text-black/70 border-black/10"}
      `}
      style={{
        background: dark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.60)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <span className={dark ? "text-white" : "text-black"}>{icon}</span>
      <span>{label}</span>
    </motion.button>
  );
}
