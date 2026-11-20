import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import DashboardView from "../components/dashboard/DashboardView";
import { api } from "../services/api";

export default function DashboardMac() {
  const { name, projectId } = useParams();
  const navigate = useNavigate();

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [addingJob, setAddingJob] = useState(false);
  const [showJobInput, setShowJobInput] = useState(false);
  const [newJobName, setNewJobName] = useState("");
  const newJobInputRef = useRef<HTMLInputElement>(null);

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
        alert("Company not found.");
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
    if (loadingCompany) return;

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
  }, [companyId, loadingCompany]);

  useEffect(() => {
    if (!showJobInput) return;
    window.setTimeout(() => newJobInputRef.current?.focus(), 50);
  }, [showJobInput]);

  useEffect(() => {
    if (!projectId) {
      setProjectName(null);
      return;
    }

    api.getJobById(projectId)
      .then((project) => setProjectName(project?.name || null))
      .catch((error) => {
        console.error("Error loading project:", error);
        setProjectName(null);
      });
  }, [projectId]);

  /* ---------------- SAVE JOB ---------------- */
  async function saveJob() {
    if (!companyId) return alert("Company not loaded.");
    const jobName = newJobName.trim();
    if (!jobName || addingJob) return;

    setAddingJob(true);

    try {
      const data = await api.createJob(jobName, companyId);

      setJobs((prev) =>
        [...prev, data].sort((a, b) => (a.name || "").localeCompare(b.name || ""))
      );
      setNewJobName("");
      setShowJobInput(false);
    } catch (error) {
      console.error("Error creating project:", error);
      alert(error instanceof Error ? error.message : "Error creating the project.");
    } finally {
      setAddingJob(false);
    }
  }

  /* ---------------- DELETE JOB ---------------- */
  const handleDeleteJob = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      !confirm(
        "Delete this project? This cannot be undone."
      )
    )
      return;

    try {
      await api.deleteJob(id);
      setJobs((prev) => prev.filter((j) => j.id !== id));
    } catch (err) {
      console.error("Error deleting project:", err);
      alert("Error deleting the project.");
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <DashboardView
      os="mac"
      vm={{
        companyName: name || "",
        projectId: projectId || null,
        projectName,
        jobs,
        loading,
        loadingCompany,
        addingJob,
        showJobInput,
        setShowJobInput,
        newJobName,
        setNewJobName,
        newJobInputRef,
        onSaveJob: saveJob,
        onDeleteJob: handleDeleteJob,
        onOpenProject: (id) => navigate(`/mac/company/${encodeURIComponent(name || "")}/project/${id}`),
        onOpenSection: (section) => {
          const path = section === "crew" ? "crew-management" : section;
          navigate(`/mac/company/${encodeURIComponent(name || "")}/${path}${projectId ? `?job=${projectId}` : ""}`);
        },
      }}
    />
  );
}
