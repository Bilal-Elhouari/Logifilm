import { motion } from "framer-motion";
import { ArrowLeft, Download, FileCheck2, FileText, Search, Users } from "lucide-react";
import type { ContractRecord, CrewMember } from "../../services/api";
import { Avatar, DeptChip, GlassFrame, Hero, Panel, StatCard, StatGrid, type GlassOS } from "../glass/Glass";
import CompanySidebar from "../glass/CompanySidebar";

export type ContractsViewModel = {
  companyName: string;
  jobId: string | null;
  projectName: string | null;
  query: string;
  setQuery: (value: string) => void;
  loading: boolean;
  searching: boolean;
  members: CrewMember[];
  totalMembers: number;
  contracts: ContractRecord[];
  memberById: Map<string | undefined, CrewMember>;
  generatingId: string | null;
  onGenerate: (member: CrewMember) => void;
  onDownload: (contract: ContractRecord) => void;
  onBack: () => void;
};

export default function ContractsView({ os, vm }: { os: GlassOS; vm: ContractsViewModel }) {
  const scope = vm.jobId ? vm.projectName || "Project" : "All projects";
  const membersWithContract = new Set(vm.contracts.map((contract) => contract.crew_member_id)).size;
  const withoutContract = Math.max(vm.totalMembers - membersWithContract, 0);

  return (
    <GlassFrame
      os={os}
      sidebar={<CompanySidebar os={os} companyName={vm.companyName} jobId={vm.jobId} jobName={vm.projectName} active="contracts" />}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: "flex", flexDirection: "column", gap: 18 }}
      >
        <Hero
          crumbs={`${vm.companyName} › ${scope}`}
          title="Contracts"
          subtitle="Generate a crew member's contract PDF; it is also saved in Logifilm."
          actions={
            <button type="button" className="lf-btn lf-btn-glass" onClick={vm.onBack}>
              <ArrowLeft /> Back
            </button>
          }
        />

        <StatGrid>
          <StatCard icon={<Users />} color="violet" value={vm.totalMembers} label="Crew members" />
          <StatCard icon={<FileCheck2 />} color="green" value={vm.contracts.length} label="Contracts generated" />
          <StatCard icon={<FileText />} color="amber" value={withoutContract} label="Without contract" />
          <StatCard icon={<Download />} color="blue" value={membersWithContract} label="With contract" />
        </StatGrid>

        <Panel title="Generate a contract" bodyClassName="">
          <div className="lf-panel-body" style={{ paddingBottom: 12 }}>
            <label className="lf-field">
              <Search />
              <input
                className="lf-input"
                value={vm.query}
                onChange={(event) => vm.setQuery(event.target.value)}
                placeholder={vm.jobId ? "Filter: name, ID card, position, department…" : "Search all starter forms: name, ID card, position…"}
                aria-label="Search crew members"
              />
            </label>
          </div>
          {vm.loading || vm.searching ? (
            <p className="lf-muted lf-panel-body">Loading…</p>
          ) : vm.members.length === 0 ? (
            <p className="lf-muted lf-panel-body">No crew member found.</p>
          ) : (
            <div className="lf-table-wrap">
              <table className="lf-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>ID card</th>
                    <th>Position</th>
                    <th>Department</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {vm.members.map((member) => (
                    <tr key={member.id}>
                      <td className="lf-strong">
                        <span className="lf-who">
                          <Avatar first={member.first_name} last={member.last_name} />
                          {[member.first_name, member.last_name].filter(Boolean).join(" ") || "—"}
                        </span>
                      </td>
                      <td>{member.id_card_number}</td>
                      <td>{member.position}</td>
                      <td><DeptChip name={member.department} /></td>
                      <td>
                        <div className="lf-row-actions">
                          <button
                            type="button"
                            className="lf-btn lf-btn-primary lf-btn-sm"
                            onClick={() => vm.onGenerate(member)}
                            disabled={vm.generatingId === member.id}
                          >
                            <FileText /> {vm.generatingId === member.id ? "Generating…" : "Generate contract"}
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

        <Panel title={`Generated contracts (${vm.contracts.length})`} bodyClassName="">
          {vm.contracts.length === 0 ? (
            <p className="lf-muted lf-panel-body">No contract generated yet.</p>
          ) : (
            <div className="lf-table-wrap">
              <table className="lf-table">
                <thead>
                  <tr>
                    <th>Crew member</th>
                    <th>File</th>
                    <th>Date</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {vm.contracts.map((contract) => {
                    const member = vm.memberById.get(contract.crew_member_id);
                    const fullName = `${member?.first_name || ""} ${member?.last_name || ""}`.trim();
                    return (
                      <tr key={contract.id || contract.file_path}>
                        <td className="lf-strong">
                          <span className="lf-who">
                            <Avatar first={member?.first_name} last={member?.last_name} />
                            {fullName || "Crew member"}
                          </span>
                        </td>
                        <td>{contract.contract_name}</td>
                        <td>{contract.created_at ? new Date(contract.created_at).toLocaleDateString("en-GB") : ""}</td>
                        <td>
                          <div className="lf-row-actions">
                            <button type="button" className="lf-btn lf-btn-soft-ok lf-btn-sm" onClick={() => vm.onDownload(contract)}>
                              <Download /> Download
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
      </motion.div>
    </GlassFrame>
  );
}
