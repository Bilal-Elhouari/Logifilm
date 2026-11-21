import { useCallback, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import HomeView from "../components/home/HomeView";
import { supabase } from "../supabaseClient";

export default function HomeWindows() {
  const [selected, setSelected] = useState<string | null>(null);
  const [companies, setCompanies] = useState<string[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const navigate = useNavigate();

  // State for new company form
  const [newCompany, setNewCompany] = useState("");
  const [newProject, setNewProject] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");

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

  /* LOAD COMPANIES */
  const fetchCompanies = useCallback(async () => {
    try {
      const data = await api.getAllCompanies();
      setCompanies((data || []).map((c) => c.name));
    } catch (err) {
      console.error("Error fetching companies:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    setProjects([]);
    setSelectedProjectId("");
    setNewProject("");

    if (!selected || selected === "Nouveau") return;
    const companyName = selected;

    async function fetchProjects() {
      setLoadingProjects(true);
      try {
        const company = await api.getCompanyByName(companyName);
        const data = await api.getJobsByCompany(company.id);
        setProjects((data || []) as { id: string; name: string }[]);
      } catch (error) {
        console.error("Error fetching projects:", error);
        alert("Unable to load projects for this company.");
      } finally {
        setLoadingProjects(false);
      }
    }

    fetchProjects();
  }, [selected]);

  async function handleEnter() {
    if (selected === "Nouveau") {
      const companyName = newCompany.trim();
      const projectName = newProject.trim();

      if (!companyName) {
        alert("Please enter a company name.");
        return;
      }
      if (!projectName) {
        alert("Please enter a project name.");
        return;
      }

      try {
        const createdCompany = await api.createCompany(companyName);
        const createdProject = await api.createJob(projectName, createdCompany.id);
        navigate(
          `/windows/company/${encodeURIComponent(companyName)}/project/${createdProject.id}`
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        alert("Error creating company or project: " + message);
      }
      return;
    }

    if (!selected) return;

    try {
      const company = await api.getCompanyByName(selected);
      let projectId = selectedProjectId;

      if (selectedProjectId === "__new" || projects.length === 0) {
        const projectName = newProject.trim();
        if (!projectName) {
          alert("Please enter a project name.");
          return;
        }
        const createdProject = await api.createJob(projectName, company.id);
        projectId = createdProject.id;
      }

      if (!projectId) {
        alert("Please select a project.");
        return;
      }

      navigate(
        `/windows/company/${encodeURIComponent(selected)}/project/${projectId}`
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert("Error opening project: " + message);
    }
  }

  return (
    <HomeView
      os="win"
      vm={{
        companies,
        loading,
        selected,
        setSelected,
        projects,
        loadingProjects,
        selectedProjectId,
        setSelectedProjectId,
        newCompany,
        setNewCompany,
        newProject,
        setNewProject,
        onEnter: handleEnter,
        reloadCompanies: fetchCompanies,
      }}
    />
  );
}
