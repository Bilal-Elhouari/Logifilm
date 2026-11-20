import type { RefObject } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  CheckSquare,
  Database,
  FileDown,
  FileText,
  Link2,
  Pencil,
  Search,
  Trash2,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import type { ContractRecord } from "../../services/api";
import { Avatar, DeptChip, GlassFrame, Hero, Panel, StatCard, StatGrid, type GlassOS } from "../glass/Glass";
import CompanySidebar from "../glass/CompanySidebar";

/* eslint-disable @typescript-eslint/no-explicit-any -- les membres viennent de Supabase sans type strict */

export type CrewTab = "database" | "contract";

/** Tout ce dont la vue a besoin : l'état et les actions restent dans la page. */
export type CrewManagementViewModel = {
  companyName: string;
  jobId: string | null;
  jobName: string | null;
  activeTab: CrewTab;
  setActiveTab: (tab: CrewTab) => void;

  crewMembers: any[];
  loading: boolean;
  selectedIds: Set<string>;
  toggleSelectAll: () => void;
  toggleSelectOne: (id: string, event: React.MouseEvent) => void;
  onExportSelected: () => void;

  globalSearch: string;
  setGlobalSearch: (value: string) => void;
  onGlobalSearch: () => void;
  searchingGlobal: boolean;
  hasGlobalSearched: boolean;
  globalResults: any[];
  onExportGlobalResults: () => void;
  onAssignStarter: (memberId: string) => void;
  assigningId: string | null;
  globalSearchInputRef: RefObject<HTMLInputElement | null>;

  jobs: any[];
  selectedJobId: string;
  setSelectedJobId: (value: string) => void;
  onAssignSelectedToJob: () => void;
  assigningToJob: boolean;

  contracts: ContractRecord[];
  loadingContracts: boolean;
  downloadingContractId: string | null;
  onDownloadContract: (contract: ContractRecord) => void;

  onNewStarter: () => void;
  onEdit: (memberId: string) => void;
  onPdf: (member: any) => void;
  onDelete: (memberId: string) => void;
  onBack: () => void;
};

const money = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** Colonnes détaillées de la fiche, dans l'ordre de l'export Excel. */
const DETAIL_COLUMNS: Array<{ key: string; label: string; numeric?: boolean; wide?: boolean }> = [
  { key: "start_date", label: "Start date" },
  { key: "end_date", label: "End date" },
  { key: "phone", label: "Phone" },
  { key: "mobile", label: "Mobile" },
  { key: "rate", label: "Rate", numeric: true },
  { key: "daily_rate", label: "Daily rate", numeric: true },
  { key: "day_worked", label: "7th day", numeric: true },
  { key: "per_week", label: "Per day / week" },
  { key: "holiday_worked", label: "Holiday worked" },
  { key: "travel_day", label: "Travel day" },
  { key: "living_allowance", label: "Allowance" },
  { key: "per_diem", label: "Per diem" },
  { key: "accommodation", label: "Accommodation" },
  { key: "id_card_number", label: "ID card" },
  { key: "date_of_birth", label: "Date of birth" },
  { key: "patent_number", label: "Patent" },
  { key: "address", label: "Address", wide: true },
  { key: "ice", label: "ICE" },
  { key: "if_number", label: "IF" },
  { key: "payment_method", label: "Payment" },
  { key: "bank_name", label: "Bank" },
  { key: "bank_account_number", label: "Account #" },
  { key: "account_code", label: "Acct code" },
  { key: "travel_date", label: "Travel date" },
  { key: "notes", label: "Notes", wide: true },
];

export default function CrewManagementView({ os, vm }: { os: GlassOS; vm: CrewManagementViewModel }) {
  const isWin = os === "win";
  const scope = vm.jobId ? vm.jobName || "Project" : "All projects";
  const departments = new Set(
    vm.crewMembers.map((member) => (member.department || "").trim().toLowerCase()).filter(Boolean),
  );
  const dailyTotal = vm.crewMembers.reduce((sum, member) => sum + (Number(member.daily_rate) || 0), 0);
  const allSelected = vm.crewMembers.length > 0 && vm.selectedIds.size === vm.crewMembers.length;

  return (
    <GlassFrame
      os={os}
      sidebar={
        <CompanySidebar os={os} companyName={vm.companyName} jobId={vm.jobId} jobName={vm.jobName} active="crew" />
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: "flex", flexDirection: "column", gap: 18 }}
      >
        <Hero
          crumbs={`${vm.companyName} › ${scope}`}
          title="Crew"
          subtitle={`${vm.crewMembers.length} member${vm.crewMembers.length === 1 ? "" : "s"} · ${scope}`}
          actions={
            <>
              <button type="button" className="lf-btn lf-btn-glass" onClick={vm.onBack}>
                <ArrowLeft /> Back
              </button>
              <button type="button" className={`lf-btn ${isWin ? "lf-btn-white" : "lf-btn-primary"}`} onClick={vm.onNewStarter}>
                <UserPlus /> New starter
              </button>
            </>
          }
        />

        <StatGrid>
          <StatCard icon={<Users />} color="violet" value={vm.crewMembers.length} label="Crew members" />
          <StatCard icon={<Building2 />} color="green" value={departments.size} label="Departments" />
          <StatCard icon={<CheckSquare />} color="amber" value={vm.selectedIds.size} label="Selected" />
          <StatCard icon={<Wallet />} color="blue" value={money.format(dailyTotal)} label="MAD / day (total)" />
        </StatGrid>

        <div className="lf-segment" role="tablist" aria-label="View">
          <button
            type="button"
            role="tab"
            aria-selected={vm.activeTab === "database"}
            className={vm.activeTab === "database" ? "is-active" : ""}
            onClick={() => vm.setActiveTab("database")}
          >
            <Database /> Crew list
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={vm.activeTab === "contract"}
            className={vm.activeTab === "contract" ? "is-active" : ""}
            onClick={() => vm.setActiveTab("contract")}
          >
            <FileText /> Crew contracts
          </button>
        </div>

        {vm.activeTab === "database" ? <CrewList vm={vm} allSelected={allSelected} /> : <CrewContracts vm={vm} />}
      </motion.div>
    </GlassFrame>
  );
}

/* ---------------- Onglet : liste de l'équipe ---------------- */
function CrewList({ vm, allSelected }: { vm: CrewManagementViewModel; allSelected: boolean }) {
  return (
    <>
      <Panel title="Search all starter forms">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <label className="lf-field" style={{ minWidth: 240 }}>
            <Search />
            <input
              ref={vm.globalSearchInputRef}
              className="lf-input"
              type="text"
              value={vm.globalSearch}
              onChange={(event) => vm.setGlobalSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") vm.onGlobalSearch();
              }}
              placeholder="First name, last name, position, department or ID card…"
              aria-label="Search starter forms"
            />
          </label>
          <button type="button" className="lf-btn lf-btn-primary" onClick={vm.onGlobalSearch} disabled={vm.searchingGlobal}>
            <Search /> {vm.searchingGlobal ? "Searching…" : "Search"}
          </button>
        </div>

        {vm.globalResults.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span className="lf-muted">
                {vm.globalResults.length} starter form{vm.globalResults.length === 1 ? "" : "s"} found
              </span>
              <button type="button" className="lf-btn lf-btn-success lf-btn-sm" onClick={vm.onExportGlobalResults}>
                <FileDown /> Export results
              </button>
            </div>
            <div className="lf-table-wrap">
              <table className="lf-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>ID card</th>
                    <th>Position</th>
                    <th>Department</th>
                    <th>Project</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {vm.globalResults.map((member) => (
                    <tr key={member.id}>
                      <td className="lf-strong">
                        <span className="lf-who">
                          <Avatar first={member.first_name} last={member.last_name} />
                          {[member.first_name, member.last_name].filter(Boolean).join(" ")}
                        </span>
                      </td>
                      <td>{member.id_card_number}</td>
                      <td>{member.position}</td>
                      <td><DeptChip name={member.department} /></td>
                      <td>{member.project_title}</td>
                      <td>
                        <div className="lf-row-actions">
                          <button
                            type="button"
                            className="lf-btn lf-btn-soft-ok lf-btn-sm"
                            onClick={() => vm.onAssignStarter(member.id)}
                            disabled={vm.assigningId === member.id}
                          >
                            <Link2 />
                            {vm.assigningId === member.id ? "Assigning…" : vm.jobId ? "Assign to project" : "Assign to company"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {vm.hasGlobalSearched && !vm.searchingGlobal && vm.globalResults.length === 0 && (
          <p className="lf-muted" style={{ marginTop: 12 }}>No starter form matches this search.</p>
        )}
      </Panel>

      {!vm.jobId && (
        <div className="lf-callout is-accent" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Assign selection to a project</div>
            <div className="lf-muted">Tick one or more people in the list, then choose the project.</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select
              className="lf-select"
              style={{ minWidth: 220, width: "auto" }}
              value={vm.selectedJobId}
              onChange={(event) => vm.setSelectedJobId(event.target.value)}
              disabled={vm.jobs.length === 0}
              aria-label="Target project"
            >
              <option value="">{vm.jobs.length === 0 ? "No project available" : "Choose a project"}</option>
              {vm.jobs.map((job) => (
                <option key={job.id} value={job.id}>{job.name}</option>
              ))}
            </select>
            <button
              type="button"
              className="lf-btn lf-btn-primary"
              onClick={vm.onAssignSelectedToJob}
              disabled={vm.assigningToJob || vm.selectedIds.size === 0 || !vm.selectedJobId}
            >
              {vm.assigningToJob ? "Assigning…" : `Assign (${vm.selectedIds.size})`}
            </button>
          </div>
        </div>
      )}

      <Panel
        title="Crew list"
        bodyClassName=""
        actions={
          vm.selectedIds.size > 0 && (
            <button type="button" className="lf-btn lf-btn-success" onClick={vm.onExportSelected}>
              <FileDown /> Export Excel ({vm.selectedIds.size})
            </button>
          )
        }
      >
        {vm.loading ? (
          <p className="lf-muted lf-panel-body">Loading…</p>
        ) : vm.crewMembers.length === 0 ? (
          <p className="lf-muted lf-panel-body">No crew members yet. Add one with “New starter”.</p>
        ) : (
          <div className="lf-table-wrap">
            <table className="lf-table">
              <thead>
                <tr>
                  <th className="lf-sticky">
                    <input type="checkbox" checked={allSelected} onChange={vm.toggleSelectAll} aria-label="Select all" />
                  </th>
                  <th className="lf-sticky-2">Name</th>
                  <th>Position</th>
                  <th>Department</th>
                  {DETAIL_COLUMNS.map((column) => (
                    <th key={column.key} className={column.numeric ? "lf-num" : undefined}>{column.label}</th>
                  ))}
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vm.crewMembers.map((member) => (
                  <tr key={member.id}>
                    <td className="lf-sticky" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={vm.selectedIds.has(member.id)}
                        onChange={(event) => vm.toggleSelectOne(member.id, event as unknown as React.MouseEvent)}
                        aria-label={`Select ${member.first_name || ""} ${member.last_name || ""}`}
                      />
                    </td>
                    <td className="lf-strong lf-sticky-2">
                      <span className="lf-who">
                        <Avatar first={member.first_name} last={member.last_name} />
                        {[member.first_name, member.last_name].filter(Boolean).join(" ") || "—"}
                      </span>
                    </td>
                    <td>{member.position}</td>
                    <td><DeptChip name={member.department} /></td>
                    {DETAIL_COLUMNS.map((column) => (
                      <td
                        key={column.key}
                        className={column.numeric ? "lf-num" : undefined}
                        style={column.wide ? { maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" } : undefined}
                        title={column.wide ? member[column.key] || "" : undefined}
                      >
                        {member[column.key]}
                      </td>
                    ))}
                    <td>
                      <div className="lf-row-actions">
                        <button type="button" className="lf-btn lf-btn-soft lf-btn-sm" onClick={() => vm.onEdit(member.id)}>
                          <Pencil /> Edit
                        </button>
                        <button type="button" className="lf-btn lf-btn-soft-ok lf-btn-sm" onClick={() => vm.onPdf(member)}>
                          <FileDown /> PDF
                        </button>
                        <button
                          type="button"
                          className="lf-btn lf-btn-danger lf-btn-sm"
                          onClick={() => vm.onDelete(member.id)}
                          aria-label={`Delete ${member.first_name || ""} ${member.last_name || ""}`}
                        >
                          <Trash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

/* ---------------- Onglet : contrats de l'équipe ---------------- */
function CrewContracts({ vm }: { vm: CrewManagementViewModel }) {
  return (
    <Panel title="Crew contracts" bodyClassName="">
      {vm.loadingContracts ? (
        <p className="lf-muted lf-panel-body">Loading contracts…</p>
      ) : vm.contracts.length === 0 ? (
        <p className="lf-muted lf-panel-body">No generated contract for the crew members of this project.</p>
      ) : (
        <div className="lf-table-wrap">
          <table className="lf-table">
            <thead>
              <tr>
                <th>Crew member</th>
                <th>Contract</th>
                <th>Date</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {vm.contracts.map((contract) => {
                const member = vm.crewMembers.find((item) => item.id === contract.crew_member_id);
                const contractId = contract.id || contract.file_path;
                return (
                  <tr key={contractId}>
                    <td className="lf-strong">
                      <span className="lf-who">
                        <Avatar first={member?.first_name} last={member?.last_name} />
                        {[member?.first_name, member?.last_name].filter(Boolean).join(" ") || "Crew member"}
                      </span>
                    </td>
                    <td>{contract.contract_name}</td>
                    <td>{contract.created_at ? new Date(contract.created_at).toLocaleDateString("en-GB") : ""}</td>
                    <td>
                      <div className="lf-row-actions">
                        <button
                          type="button"
                          className="lf-btn lf-btn-soft lf-btn-sm"
                          onClick={() => vm.onDownloadContract(contract)}
                          disabled={vm.downloadingContractId === contractId}
                        >
                          <FileDown /> {vm.downloadingContractId === contractId ? "Downloading…" : "Download"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
