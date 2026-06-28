import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Download, FileText, Search } from "lucide-react";
import { motion } from "framer-motion";
import { saveAs } from "file-saver";
import { api, ContractRecord, CrewMember } from "../services/api";
import { createContractPdf } from "../utils/contractPdf";

export default function ContractsWindows() {
  const { name } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get("job");
  const [companyMembers, setCompanyMembers] = useState<CrewMember[]>([]);
  const [searchResults, setSearchResults] = useState<CrewMember[]>([]);
  const [knownMembers, setKnownMembers] = useState<CrewMember[]>([]);
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [dark, setDark] = useState(window.matchMedia("(prefers-color-scheme: dark)").matches);

  const rememberMembers = (members: CrewMember[]) => {
    setKnownMembers((prev) => {
      const byId = new Map<string, CrewMember>();
      [...prev, ...members].forEach((member) => {
        if (member.id) byId.set(member.id, member);
      });
      return Array.from(byId.values());
    });
  };

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    async function load() {
      if (!name) return;

      setLoading(true);
      try {
        const company = await api.getCompanyByName(name);
        const members = await api.getCrewMembers(company.id, jobId || undefined);
        setCompanyMembers(members || []);
        rememberMembers(members || []);

        const companyMemberIds = (members || [])
          .map((member) => member.id)
          .filter((id): id is string => Boolean(id));
        const rows = await api.getContractsByCrewMemberIds(companyMemberIds);
        setContracts(rows || []);

        const ids = (rows || []).map((contract) => contract.crew_member_id).filter(Boolean);
        const contractMembers = await api.getCrewMembersByIds(ids);
        rememberMembers(contractMembers || []);
      } catch (err) {
        console.error("Contracts load error:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [name, jobId]);

  useEffect(() => {
    if (!jobId) {
      setProjectName(null);
      return;
    }

    api.getJobById(jobId)
      .then((project) => setProjectName(project?.name || null))
      .catch(() => setProjectName(null));
  }, [jobId]);

  useEffect(() => {
    const term = query.trim();

    if (!term) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    if (jobId) {
      const normalized = term.toLowerCase();
      setSearchResults(companyMembers.filter((member) =>
        [
          member.first_name,
          member.last_name,
          member.id_card_number,
          member.position,
          member.department,
        ].some((value) => String(value || "").toLowerCase().includes(normalized))
      ));
      setSearching(false);
      return;
    }

    setSearching(true);
    const timeoutId = window.setTimeout(async () => {
      try {
        const results = await api.searchCrewMembers(term);
        setSearchResults(results || []);
        rememberMembers(results || []);
      } catch (err) {
        console.error("Contract member search error:", err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [companyMembers, jobId, query]);

  const filteredMembers = useMemo(() => {
    return query.trim() ? searchResults : companyMembers;
  }, [companyMembers, query, searchResults]);

  const memberById = useMemo(() => {
    return new Map(knownMembers.map((member) => [member.id, member]));
  }, [knownMembers]);

  const handleGenerate = async (member: CrewMember) => {
    if (!member.id || !name) return;

    setGeneratingId(member.id);
    try {
      const fullName = `${member.first_name || ""}_${member.last_name || ""}`.replace(/\s+/g, "_");
      const contractName = `Contract_${fullName || "Crew"}_${new Date().toISOString().slice(0, 10)}.pdf`;
      const pdf = createContractPdf(member);
      const blob = pdf.output("blob");

      saveAs(blob, contractName);

      try {
        const saved = await api.saveContract(member.id, contractName, blob);
        setContracts((prev) => [saved, ...prev]);
      } catch (saveError) {
        console.error("Contract save error:", saveError);
        const message = saveError instanceof Error
          ? saveError.message
          : String((saveError as { message?: string })?.message || saveError);
        alert(`PDF downloaded, but saving failed.\n\nSupabase error: ${message}\n\nRun supabase_contracts_schema.sql in the Supabase SQL Editor.`);
      }
    } finally {
      setGeneratingId(null);
    }
  };

  const handleDownloadContract = async (contract: ContractRecord) => {
    try {
      const blob = await api.downloadContractFile(contract.file_path);
      saveAs(blob, contract.contract_name);
    } catch (err) {
      console.error("Contract download error:", err);
      alert("Unable to download this contract.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`min-h-screen w-full p-10 ${dark ? "bg-[#050814] text-white" : "bg-[#e5ecff] text-black"}`}
      style={{ fontFamily: "'Segoe UI', system-ui" }}
    >
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Contracts</h1>
          <p className={dark ? "text-sm text-white/55" : "text-sm text-black/55"}>
            {jobId ? `${name} / ${projectName || "Project"}` : name}
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm ${dark ? "border-red-400 bg-red-500/20 text-red-300" : "border-red-300 bg-red-100 text-red-700"}`}
        >
          <ArrowLeft size={16} />
          Back
        </button>
      </div>

      <section className={`mb-8 rounded-3xl border p-6 shadow-xl ${dark ? "border-white/20 bg-white/10" : "border-black/10 bg-white"}`}>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
          <Search size={18} />
          Search crew member
        </h2>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name, ID card, position..."
          className={`mb-4 w-full rounded-lg border px-4 py-3 text-sm outline-none ${dark ? "border-white/15 bg-white/10 text-white placeholder-white/35" : "border-gray-300 bg-white text-black"}`}
        />

        {loading || searching ? (
          <p className="text-sm opacity-60">Loading...</p>
        ) : filteredMembers.length === 0 ? (
          <p className="text-sm opacity-60">No crew member found.</p>
        ) : (
          <div className={`overflow-x-auto rounded-xl border ${dark ? "border-white/15" : "border-gray-200"}`}>
            <table className="w-full text-sm">
              <thead className={dark ? "text-left text-white/60" : "text-left text-black/60"}>
                <tr>
                  <th className="px-4 py-3">First Name</th>
                  <th className="px-4 py-3">Last Name</th>
                  <th className="px-4 py-3">ID Card</th>
                  <th className="px-4 py-3">Position</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => (
                  <tr key={member.id} className={dark ? "border-t border-white/10" : "border-t border-gray-200"}>
                    <td className="px-4 py-3">{member.first_name}</td>
                    <td className="px-4 py-3">{member.last_name}</td>
                    <td className="px-4 py-3">{member.id_card_number}</td>
                    <td className="px-4 py-3">{member.position}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleGenerate(member)}
                        disabled={generatingId === member.id}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                      >
                        <FileText size={14} />
                        {generatingId === member.id ? "Generating..." : "Generate contract"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={`rounded-3xl border p-6 shadow-xl ${dark ? "border-white/20 bg-white/10" : "border-black/10 bg-white"}`}>
        <h2 className="mb-4 text-xl font-semibold">Contracts</h2>
        {contracts.length === 0 ? (
          <p className="text-sm opacity-60">No generated contract.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {contracts.map((contract) => {
              const member = memberById.get(contract.crew_member_id);
              const fullName = `${member?.first_name || ""} ${member?.last_name || ""}`.trim();

              return (
                <div
                  key={contract.id}
                  className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 ${dark ? "border-white/15 bg-white/5" : "border-gray-200 bg-gray-50"}`}
                >
                  <div>
                    <p className="font-medium">{contract.contract_name}</p>
                    <p className="text-xs opacity-60">{fullName || contract.crew_member_id}</p>
                  </div>
                  <button
                    onClick={() => handleDownloadContract(contract)}
                    className="flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700"
                  >
                    <Download size={14} />
                    Download
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </motion.div>
  );
}
