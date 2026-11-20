import type { RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Clapperboard, FileText, FolderOpen, Plus, Trash2, Users, Wallet, X } from "lucide-react";
import { GlassFrame, Hero, Panel, Tile, type GlassColor, type GlassOS } from "../glass/Glass";
import CompanySidebar from "../glass/CompanySidebar";

/* eslint-disable @typescript-eslint/no-explicit-any -- les projets viennent de Supabase sans type strict */

export type DashboardViewModel = {
  companyName: string;
  projectId: string | null;
  projectName: string | null;
  jobs: any[];
  loading: boolean;
  loadingCompany: boolean;
  addingJob: boolean;
  showJobInput: boolean;
  setShowJobInput: (value: boolean) => void;
  newJobName: string;
  setNewJobName: (value: string) => void;
  newJobInputRef: RefObject<HTMLInputElement | null>;
  onSaveJob: () => void;
  onDeleteJob: (id: string, event: React.MouseEvent) => void;
  onOpenProject: (id: string) => void;
  onOpenSection: (section: "crew" | "contracts" | "payroll") => void;
};

const PROJECT_COLORS: GlassColor[] = ["violet", "blue", "teal", "amber", "pink", "green"];

const SECTIONS: Array<{ key: "crew" | "contracts" | "payroll"; label: string; text: string; color: GlassColor; icon: React.ReactNode }> = [
  { key: "crew", label: "Crew", text: "Starter forms, Excel export and start form PDFs.", color: "violet", icon: <Users /> },
  { key: "contracts", label: "Contracts", text: "Contracts generated and signed for this project.", color: "teal", icon: <FileText /> },
  { key: "payroll", label: "Payroll", text: "Import the payroll file and create invoices per crew member.", color: "green", icon: <Wallet /> },
];

export default function DashboardView({ os, vm }: { os: GlassOS; vm: DashboardViewModel }) {
  const isWin = os === "win";
  const inProject = Boolean(vm.projectId);

  return (
    <GlassFrame
      os={os}
      sidebar={
        <CompanySidebar
          os={os}
          companyName={vm.companyName}
          jobId={vm.projectId}
          jobName={vm.projectName}
          active={inProject ? "project" : "projects"}
        />
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: "flex", flexDirection: "column", gap: 18 }}
      >
        {inProject ? (
          <>
            <Hero
              crumbs={`${vm.companyName} › Projects`}
              title={vm.projectName || "Project"}
              subtitle="Everything for this project, kept separate from the company's other projects."
            />
            <div className="lf-section-grid">
              {SECTIONS.map((section) => (
                <button
                  key={section.key}
                  type="button"
                  className={`lf-section-card lf-c-${section.color}`}
                  onClick={() => vm.onOpenSection(section.key)}
                >
                  <Tile color={section.color}>{section.icon}</Tile>
                  <strong>{section.label}</strong>
                  <span>{section.text}</span>
                  <em>
                    Open <ArrowRight />
                  </em>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <Hero
              crumbs={vm.companyName}
              title="Projects"
              subtitle={
                vm.loading ? "Loading…" : `${vm.jobs.length} project${vm.jobs.length === 1 ? "" : "s"} in this company`
              }
              actions={
                <button
                  type="button"
                  className={`lf-btn ${isWin ? "lf-btn-white" : "lf-btn-primary"}`}
                  onClick={() => vm.setShowJobInput(true)}
                  disabled={vm.loadingCompany || vm.addingJob || vm.showJobInput}
                >
                  <Plus /> {vm.addingJob ? "Adding…" : "New project"}
                </button>
              }
            />

            <AnimatePresence>
              {vm.showJobInput && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                  <Panel title="New project">
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <label className="lf-field" style={{ minWidth: 240 }}>
                        <Clapperboard />
                        <input
                          ref={vm.newJobInputRef}
                          className="lf-input"
                          type="text"
                          value={vm.newJobName}
                          onChange={(event) => vm.setNewJobName(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") vm.onSaveJob();
                            if (event.key === "Escape") {
                              vm.setNewJobName("");
                              vm.setShowJobInput(false);
                            }
                          }}
                          placeholder="Project name (e.g. feature film, series, commercial…)"
                          disabled={vm.addingJob}
                          aria-label="New project name"
                        />
                      </label>
                      <button type="button" className="lf-btn lf-btn-success" onClick={vm.onSaveJob} disabled={vm.addingJob || !vm.newJobName.trim()}>
                        <Check /> Create
                      </button>
                      <button
                        type="button"
                        className="lf-btn lf-btn-ghost"
                        onClick={() => {
                          vm.setNewJobName("");
                          vm.setShowJobInput(false);
                        }}
                      >
                        <X /> Cancel
                      </button>
                    </div>
                  </Panel>
                </motion.div>
              )}
            </AnimatePresence>

            {vm.loading ? (
              <p className="lf-muted">Loading projects…</p>
            ) : vm.jobs.length === 0 ? (
              <Panel>
                <div style={{ textAlign: "center", padding: "24px 8px" }}>
                  <div style={{ display: "inline-flex", marginBottom: 10 }}>
                    <Tile color="amber"><FolderOpen /></Tile>
                  </div>
                  <div style={{ fontWeight: 600 }}>No projects yet</div>
                  <p className="lf-muted" style={{ margin: "4px 0 0" }}>Create your first project with “New project”.</p>
                </div>
              </Panel>
            ) : (
              <div className="lf-project-grid">
                {vm.jobs.map((job, index) => {
                  const color = PROJECT_COLORS[index % PROJECT_COLORS.length];
                  return (
                    <div
                      key={job.id}
                      role="button"
                      tabIndex={0}
                      className={`lf-project-card lf-c-${color}`}
                      onClick={() => vm.onOpenProject(job.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          vm.onOpenProject(job.id);
                        }
                      }}
                    >
                      <Tile color={color}><Clapperboard /></Tile>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <strong>{job.name}</strong>
                        {job.created_at && (
                          <span>Created {new Date(job.created_at).toLocaleDateString("en-GB")}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="lf-btn lf-btn-danger lf-btn-sm lf-project-delete"
                        onClick={(event) => vm.onDeleteJob(job.id, event)}
                        aria-label={`Delete project ${job.name}`}
                        title="Delete project"
                      >
                        <Trash2 />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </motion.div>
    </GlassFrame>
  );
}
