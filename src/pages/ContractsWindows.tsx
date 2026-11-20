import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { saveAs } from "file-saver";
import { api, ContractRecord, CrewMember } from "../services/api";
import { createContractPdf } from "../utils/contractPdf";
import ContractsView from "../components/contracts/ContractsView";

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
    <ContractsView
      os="win"
      vm={{
        companyName: name || "",
        jobId,
        projectName,
        query,
        setQuery,
        loading,
        searching,
        members: filteredMembers,
        totalMembers: companyMembers.length,
        contracts,
        memberById,
        generatingId,
        onGenerate: handleGenerate,
        onDownload: handleDownloadContract,
        onBack: () => navigate(-1),
      }}
    />
  );
}
