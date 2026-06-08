import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, FileText, Search } from "lucide-react";
import { motion } from "framer-motion";
import { saveAs } from "file-saver";
import { api, ContractRecord, CrewMember } from "../services/api";
import { createContractPdf } from "../utils/contractPdf";

export default function ContractsMac() {
  const { name } = useParams();
  const navigate = useNavigate();
  const [companyMembers, setCompanyMembers] = useState<CrewMember[]>([]);
  const [searchResults, setSearchResults] = useState<CrewMember[]>([]);
  const [knownMembers, setKnownMembers] = useState<CrewMember[]>([]);
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

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
    async function load() {
      if (!name) return;

      setLoading(true);
      try {
        const company = await api.getCompanyByName(name);
        const members = await api.getCrewMembers(company.id);
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
  }, [name]);

  useEffect(() => {
    const term = query.trim();

    if (!term) {
      setSearchResults([]);
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
  }, [query]);

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
        alert(`PDF telecharge, mais sauvegarde impossible.\n\nErreur Supabase: ${message}\n\nExecutez supabase_contracts_schema.sql dans le SQL Editor Supabase.`);
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
      alert("Impossible de telecharger ce contrat.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen w-full bg-[linear-gradient(180deg,#f6f7ff,#e8ecff)] p-10 text-black dark:bg-[linear-gradient(180deg,#1a1b1f,#0f1014)] dark:text-white"
      style={{ fontFamily: "'SF Pro Display', system-ui" }}
    >
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Contrats</h1>
          <p className="text-sm text-black/55 dark:text-white/55">{name}</p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/50 px-4 py-2 text-sm text-red-500 shadow dark:bg-white/10"
        >
          <ArrowLeft size={16} />
          Retour
        </button>
      </div>

      <section className="mb-8 rounded-3xl border border-white/30 bg-white/60 p-6 shadow dark:border-white/10 dark:bg-white/10">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
          <Search size={18} />
          Rechercher un membre
        </h2>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom, prenom, ID card, poste..."
          className="mb-4 w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm outline-none dark:border-white/10 dark:bg-white/10 dark:text-white"
        />

        {loading || searching ? (
          <p className="text-sm opacity-60">Chargement...</p>
        ) : filteredMembers.length === 0 ? (
          <p className="text-sm opacity-60">Aucun membre trouve.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10">
            <table className="w-full text-sm">
              <thead className="text-left text-black/60 dark:text-white/60">
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
                  <tr key={member.id} className="border-t border-black/10 dark:border-white/10">
                    <td className="px-4 py-3">{member.first_name}</td>
                    <td className="px-4 py-3">{member.last_name}</td>
                    <td className="px-4 py-3">{member.id_card_number}</td>
                    <td className="px-4 py-3">{member.position}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleGenerate(member)}
                        disabled={generatingId === member.id}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-3 py-2 text-xs font-medium text-white hover:bg-blue-600 disabled:opacity-60"
                      >
                        <FileText size={14} />
                        {generatingId === member.id ? "Generation..." : "Generer le contrat"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-white/30 bg-white/60 p-6 shadow dark:border-white/10 dark:bg-white/10">
        <h2 className="mb-4 text-xl font-semibold">Crew Contract</h2>
        {contracts.length === 0 ? (
          <p className="text-sm opacity-60">Aucun contrat genere.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {contracts.map((contract) => {
              const member = memberById.get(contract.crew_member_id);
              const fullName = `${member?.first_name || ""} ${member?.last_name || ""}`.trim();

              return (
                <div
                  key={contract.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-black/10 bg-white/60 px-4 py-3 dark:border-white/10 dark:bg-white/5"
                >
                  <div>
                    <p className="font-medium">{contract.contract_name}</p>
                    <p className="text-xs opacity-60">{fullName || contract.crew_member_id}</p>
                  </div>
                  <button
                    onClick={() => handleDownloadContract(contract)}
                    className="flex items-center gap-2 rounded-xl bg-green-500 px-3 py-2 text-xs font-medium text-white hover:bg-green-600"
                  >
                    <Download size={14} />
                    Telecharger
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
