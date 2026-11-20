import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Building2, Clapperboard, LogOut, Plus, Shuffle } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { installedInterface } from "../shell/InterfacePicker";
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
};

export default function HomeView({ os, vm }: { os: GlassOS; vm: HomeViewModel }) {
  const navigate = useNavigate();
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

      <Hero title="Welcome to Logifilm" subtitle="Choose a company, then the project you are working on." />

      <Panel title="1. Company">
        {vm.loading ? (
          <p className="lf-muted">Loading companies…</p>
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
          </div>
        )}
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
