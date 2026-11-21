import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Building2, Check, Clapperboard, LoaderCircle, LogOut, Pencil, Plus, Shuffle, Trash2, X } from "lucide-react";
import { api } from "../../services/api";
import { amIAdmin } from "../../services/license";
import { supabase } from "../../supabaseClient";
import { installedInterface } from "../shell/InterfacePicker";
import AccessRequests from "../admin/AccessRequests";
import TeamManager from "../admin/TeamManager";
import { Brand, GlassFrame, Hero, Panel, ThemeToggle, Tile, colorFor, type GlassOS } from "../glass/Glass";

export const NEW_COMPANY = "Nouveau";
export const NEW_PROJECT = "__new";

export type HomeViewModel = {
  companies: string[];
  loading: boolean;
  selected: string | null;
  setSelected: (value: string) => void;
  projects: Array<{ id: string; name: string }>;
  loadingProjects: boolean;
  selectedProjectId: string;
  setSelectedProjectId: (value: string) => void;
  newCompany: string;
  setNewCompany: (value: string) => void;
  newProject: string;
  setNewProject: (value: string) => void;
  onEnter: () => void;
  reloadCompanies: () => Promise<void>;
};

export default function HomeView({ os, vm }: { os: GlassOS; vm: HomeViewModel }) {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let active = true;
    amIAdmin().then((yes) => active && setIsAdmin(yes));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setRenaming(null);
    setActionError("");
  }, [vm.selected]);

  async function saveRename(current: string) {
    if (renaming === null || renaming.trim() === current) {
      setRenaming(null);
      return;
    }
    setBusy(true);
    setActionError("");
    try {
      const company = await api.getCompanyByName(current);
      const renamed = await api.renameCompany(company.id, renaming);
      await vm.reloadCompanies();
      vm.setSelected(renamed.name);
      setRenaming(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "The company could not be renamed.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteCompany(current: string) {
    const typed = window.prompt(
      `Delete ${current} with ALL its projects, crew members and contracts? This cannot be undone.\n\nType the company name to confirm:`,
    );
    if (typed === null) return;
    if (typed.trim() !== current) {
      setActionError("The name did not match: nothing was deleted.");
      return;
    }
    setBusy(true);
    setActionError("");
    try {
      const company = await api.getCompanyByName(current);
      await api.deleteCompany(company.id);
      vm.setSelected("");
      await vm.reloadCompanies();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "The company could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  const isNew = vm.selected === NEW_COMPANY;
  const hasCompany = Boolean(vm.selected) && !isNew;
  const creatingProject = hasCompany && (vm.selectedProjectId === NEW_PROJECT || (!vm.loadingProjects && vm.projects.length === 0));
  const canEnter = isNew
    ? Boolean(vm.newCompany.trim() && vm.newProject.trim())
    : hasCompany && (creatingProject ? Boolean(vm.newProject.trim()) : Boolean(vm.selectedProjectId));

  return (
    <GlassFrame os={os} centered>
      <div className="lf-topbar">
        <Brand />
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <AccessRequests os={os} />
          <TeamManager os={os} />
          <ThemeToggle />
          {/* Development only: the installed app keeps the design of its own system. */}
          {!installedInterface() && (
            <button type="button" className="lf-btn lf-btn-ghost lf-btn-sm" onClick={() => navigate("/")}>
              <Shuffle /> Switch interface
            </button>
          )}
          <button
            type="button"
            className="lf-btn lf-btn-ghost lf-btn-sm"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate(`/${os === "win" ? "windows" : "mac"}/auth`);
            }}
          >
            <LogOut /> Sign out
          </button>
        </div>
      </div>

      <Hero
        title="Welcome to Logifilm"
        subtitle={isAdmin ? "Choose a company, then the project you are working on." : "Choose one of your companies, then the project you are working on."}
      />

      <Panel title="1. Company">
        {vm.loading ? (
          <p className="lf-muted">Loading companies…</p>
        ) : vm.companies.length === 0 && !isAdmin ? (
          <p className="lf-muted">
            You do not have access to a company yet. Ask your administrator to add you to one in <strong>Team</strong>, then sign in again.
          </p>
        ) : (
          <div className="lf-pick-grid" role="radiogroup" aria-label="Company">
            {vm.companies.map((company) => (
              <button
                key={company}
                type="button"
                role="radio"
                aria-checked={vm.selected === company}
                className={`lf-pick${vm.selected === company ? " is-selected" : ""}`}
                onClick={() => vm.setSelected(company)}
              >
                <Tile color={colorFor(company)}><Building2 /></Tile>
                <span>{company}</span>
              </button>
            ))}
            {isAdmin && (
            <button
              type="button"
              role="radio"
              aria-checked={isNew}
              className={`lf-pick is-dashed${isNew ? " is-selected" : ""}`}
              onClick={() => vm.setSelected(NEW_COMPANY)}
            >
              <Tile color="slate"><Plus /></Tile>
              <span>New company</span>
            </button>
            )}
          </div>
        )}

        {isAdmin && hasCompany && vm.selected && (
          <div className="lf-company-actions">
            {renaming !== null ? (
              <>
                <input
                  className="lf-input"
                  style={{ flex: "1 1 220px", width: "auto" }}
                  value={renaming}
                  onChange={(event) => setRenaming(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void saveRename(vm.selected!);
                    if (event.key === "Escape") setRenaming(null);
                  }}
                  aria-label="New company name"
                  autoFocus
                  disabled={busy}
                />
                <button type="button" className="lf-btn lf-btn-primary lf-btn-sm" onClick={() => saveRename(vm.selected!)} disabled={busy || !renaming.trim()}>
                  {busy ? <LoaderCircle className="animate-spin" /> : <Check />} Save
                </button>
                <button type="button" className="lf-btn lf-btn-ghost lf-btn-sm" onClick={() => setRenaming(null)} disabled={busy}>
                  <X /> Cancel
                </button>
              </>
            ) : (
              <>
                <button type="button" className="lf-btn lf-btn-ghost lf-btn-sm" onClick={() => setRenaming(vm.selected)} disabled={busy}>
                  <Pencil /> Rename {vm.selected}
                </button>
                <button type="button" className="lf-btn lf-btn-danger lf-btn-sm" onClick={() => deleteCompany(vm.selected!)} disabled={busy}>
                  {busy ? <LoaderCircle className="animate-spin" /> : <Trash2 />} Delete {vm.selected}
                </button>
              </>
            )}
          </div>
        )}
        {actionError && <div className="lf-alert" role="alert" style={{ marginTop: 12 }}>{actionError}</div>}
      </Panel>

      <AnimatePresence mode="wait">
        {isNew && (
          <motion.div key="new" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
            <Panel title="2. New company">
              <div className="lf-form-grid">
                <label className="lf-label">
                  <span>Company name</span>
                  <input className="lf-input" value={vm.newCompany} onChange={(event) => vm.setNewCompany(event.target.value)} placeholder="e.g. Atlas Prod" />
                </label>
                <label className="lf-label">
                  <span>First project</span>
                  <input className="lf-input" value={vm.newProject} onChange={(event) => vm.setNewProject(event.target.value)} placeholder="e.g. Feature film 2026" />
                </label>
              </div>
            </Panel>
          </motion.div>
        )}

        {hasCompany && (
          <motion.div key={`projects-${vm.selected}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
            <Panel title={`2. ${vm.selected} project`}>
              {vm.loadingProjects ? (
                <p className="lf-muted">Loading projects…</p>
              ) : (
                <div className="lf-pick-grid" role="radiogroup" aria-label="Project">
                  {vm.projects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      role="radio"
                      aria-checked={vm.selectedProjectId === project.id}
                      className={`lf-pick${vm.selectedProjectId === project.id ? " is-selected" : ""}`}
                      onClick={() => vm.setSelectedProjectId(project.id)}
                    >
                      <Tile color={colorFor(project.name)}><Clapperboard /></Tile>
                      <span>{project.name}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={creatingProject}
                    className={`lf-pick is-dashed${creatingProject ? " is-selected" : ""}`}
                    onClick={() => vm.setSelectedProjectId(NEW_PROJECT)}
                  >
                    <Tile color="slate"><Plus /></Tile>
                    <span>{vm.projects.length === 0 ? "First project" : "New project"}</span>
                  </button>
                </div>
              )}

              {creatingProject && (
                <label className="lf-label" style={{ marginTop: 14 }}>
                  <span>Project name</span>
                  <input
                    className="lf-input"
                    value={vm.newProject}
                    onChange={(event) => vm.setNewProject(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && vm.newProject.trim()) vm.onEnter();
                    }}
                    placeholder="e.g. Medina series"
                    autoFocus
                  />
                </label>
              )}
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>

      {vm.selected && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" className="lf-btn lf-btn-primary" onClick={vm.onEnter} disabled={!canEnter} style={{ padding: "11px 22px", fontSize: 14 }}>
            {isNew || creatingProject ? "Create and open project" : "Open project"} <ArrowRight />
          </button>
        </div>
      )}
    </GlassFrame>
  );
}
