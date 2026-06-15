import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  UserPlus,
  Database,
  FileText,
  Pencil,
  FileDown,
  Search,
  Link2,
} from "lucide-react";
import { motion } from "framer-motion";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { api, ContractRecord } from "../services/api";

export default function CrewManagementWindows() {
  const { name } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get("job");

  const [activeTab, setActiveTab] = useState<"database" | "contract">("database");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [crewMembers, setCrewMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [jobName, setJobName] = useState<string | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [assigningToJob, setAssigningToJob] = useState(false);
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [downloadingContractId, setDownloadingContractId] = useState<string | null>(null);

  // ✅ MULTI-SELECTION STATE
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [globalSearch, setGlobalSearch] = useState("");
  const [globalResults, setGlobalResults] = useState<any[]>([]);
  const [searchingGlobal, setSearchingGlobal] = useState(false);
  const [hasGlobalSearched, setHasGlobalSearched] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const globalSearchInputRef = useRef<HTMLInputElement>(null);

  /* ---------------- DARK / LIGHT AUTO ---------------- */
  const [dark, setDark] = useState(
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  /* ---------------- FETCH COMPANY ---------------- */
  useEffect(() => {
    async function loadCompany() {
      try {
        const data = await api.getCompanyByName(name!);
        if (data) setCompanyId(data.id);
      } catch (e) {
        console.error(e);
      }
    }
    loadCompany();
  }, [name]);

  /* ---------------- FETCH CREW MEMBERS ---------------- */
  useEffect(() => {
    if (!companyId) return;

    async function loadCrew() {
      setLoading(true);
      try {
        if (jobId) {
          try {
            const j = await api.getJobById(jobId);
            setJobName(j?.name || null);
          } catch (e) {
            console.error("Error loading job name", e);
          }
        } else {
          setJobName(null);
        }

        const data = await api.getCrewMembers(companyId!, jobId || undefined);
        setCrewMembers(data || []);
      } finally {
        setLoading(false);
      }
    }

    loadCrew();
  }, [companyId, activeTab, jobId]);

  useEffect(() => {
    if (activeTab !== "contract") return;

    const memberIds = crewMembers
      .map((member) => member.id)
      .filter((id): id is string => Boolean(id));

    async function loadContracts() {
      setLoadingContracts(true);
      try {
        const data = await api.getContractsByCrewMemberIds(memberIds);
        setContracts(data || []);
      } catch (err) {
        console.error("Error loading job contracts:", err);
        setContracts([]);
      } finally {
        setLoadingContracts(false);
      }
    }

    loadContracts();
  }, [activeTab, crewMembers]);

  useEffect(() => {
    if (!companyId) return;

    async function loadJobs() {
      try {
        const data = await api.getJobsByCompany(companyId!);
        setJobs(data || []);
      } catch (err) {
        console.error("Error loading jobs:", err);
      }
    }

    loadJobs();
  }, [companyId]);

  /* ---------------- DELETE ---------------- */
  const handleDelete = async (id: string) => {
    if (!confirm("Delete crew member?")) return;
    try {
      await api.deleteCrewMember(id);
      setCrewMembers((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  /* ---------------- PDF (MATCHING FORM LAYOUT) ---------------- */
  const generatePDF = (m: any) => {
    const pdf = new jsPDF("p", "mm", "a4");

    // Helper functions for formatting
    const formatCurrency = (val: any) => {
      if (!val) return "";
      return val.toString().endsWith(" MAD") ? val : `${val} MAD`;
    };

    // -----------------------------
    // BASE CONFIG
    // -----------------------------
    const leftX = 20;
    const rightX = 115;
    const lineHeight = 10;
    let y = 22;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text((name?.toUpperCase() || "COMPANY NAME"), 105, y, { align: "center" });

    y += 9;
    pdf.setFontSize(12);
    pdf.text("MOROCCAN CREW START FORM", 105, y, { align: "center" });

    y += 4;
    pdf.setDrawColor(160);
    pdf.setLineWidth(0.4);
    pdf.line(75, y, 135, y);

    y += 14;
    pdf.setDrawColor(120, 0, 0);
    pdf.setLineWidth(0.3);
    pdf.line(15, y, 195, y);

    y += 10;
    pdf.setFontSize(11);

    // -----------------------------
    // DATA MAPPING
    // -----------------------------

    // Map existing member object to the form structure
    const leftFieldsRaw = [
      ["FIRST NAME :", m.first_name],
      ["ID CARD NO :", m.id_card_number],
      ["ADDRESS :", m.address],
      ["TELEPHONE # :", m.phone],
      ["POSITION :", m.position],
      ["START DATE :", m.start_date],
      ["RATE :", formatCurrency(m.rate)],
      ["7th DAY WORKED :", formatCurrency(m.day_worked)],
      ["TRAVEL DAY :", m.travel_day],
      ["LIVING ALLOWANCE :", m.living_allowance],
      ["ACCOMMODATION :", m.accommodation],
      ["BANK NAME :", m.bank_name],
      ["ACCT CODE :", m.account_code],
      ["ICE :", m.ice],
      ["BANK ACCOUNT# :", m.bank_account_number],
    ];

    const rightFieldsRaw = [
      ["NAME :", m.last_name],
      ["DATE OF BIRTH :", m.date_of_birth],
      ["PATENT :", m.patent_number],
      ["MOBILE # :", m.mobile],
      ["DEPARTMENT :", m.department],
      ["END DATE :", m.end_date],
      ["PER DAY/WEEK :", m.per_week],
      ["HOLIDAY WORKED :", m.holiday_worked],
      ["DAILY RATE :", formatCurrency(m.daily_rate)],
      ["PER DIEM :", m.per_diem],
      ["PAYMENT METHOD :", m.payment_method],
      ["TRAVEL DATE :", m.travel_date],
      ["IF :", m.if_number],
      ["NOTE :", m.notes],
    ];

    // ✅ GARDE LES CHAMPS MÊME VIDES
    const cleanField = (entry: any[]): entry is any[] => {
      const label = entry[0];
      return label !== undefined && label !== null && label.toString().trim() !== "";
    };

    const leftFields = leftFieldsRaw.filter(cleanField);
    const rightFields = rightFieldsRaw.filter(cleanField);

    // -----------------------------
    // RENDU DES CHAMPS
    // -----------------------------
    pdf.setDrawColor(0);
    pdf.setLineWidth(0);

    const maxRows = Math.max(leftFields.length, rightFields.length);

    for (let i = 0; i < maxRows; i++) {
      const yPos = y + i * lineHeight;

      // LEFT COLUMN
      if (leftFields[i]) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10.5);
        pdf.text(leftFields[i][0], leftX, yPos);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(12);
        pdf.text(String(leftFields[i][1] || ""), leftX + 42, yPos);
        pdf.line(leftX + 40, yPos + 1.5, 95, yPos + 1.5);
      }

      // RIGHT COLUMN
      if (rightFields[i]) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10.5);
        pdf.text(rightFields[i][0], rightX, yPos);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(12);
        pdf.text(String(rightFields[i][1] || ""), rightX + 45, yPos);
        pdf.line(rightX + 42, yPos + 1.5, 195, yPos + 1.5);
      }
    }

    y = y + maxRows * lineHeight + 8;

    // -----------------------------
    // SIGNATURE BLOCK
    // -----------------------------
    pdf.setDrawColor(0);
    pdf.setLineWidth(0.3);
    pdf.line(15, y, 195, y);

    y += 10;

    pdf.setFont("helvetica", "bold");
    pdf.text("EMPLOYEE SIGNATURE :", leftX, y);
    y += 3;
    pdf.rect(leftX, y, 80, 30);

    const sigX = 105;
    let sy = y;

    const sigFields = [
      "APPROVAL : ..........................................................",
      "MOR LINE PRODUCER : .........................................",
      "UPM MOROCCO : .......................................................",
      "ACCOUNTS : ..........................................................",
      "HOD : ...............................................................",
    ];

    sigFields.forEach((label) => {
      pdf.setFont("helvetica", "bold");
      pdf.text(label, sigX, sy + 5);
      sy += 12;
    });

    pdf.save(`Starter_${m.first_name}_${m.last_name}.pdf`);
  };

  /* ------------------ EXCEL EXPORT ------------------ */
  const exportCrewMembersToExcel = (membersToExport: any[], fileName: string) => {
    const data = membersToExport.map((m) => ({
      "First Name": m.first_name,
      "Last Name": m.last_name,
      "Position": m.position,
      "Department": m.department,
      "Start Date": m.start_date,
      "End Date": m.end_date,
      "Phone": m.phone,
      "Mobile": m.mobile,
      "Rate": m.rate,
      "Daily Rate": m.daily_rate,
      "Day Worked": m.day_worked,
      "Per Week": m.per_week,
      "Holiday Worked": m.holiday_worked,
      "Travel Day": m.travel_day,
      "Allowance": m.living_allowance,
      "Per Diem": m.per_diem,
      "Accommodation": m.accommodation,
      "ID Card": m.id_card_number,
      "Date of Birth": m.date_of_birth,
      "Patent": m.patent_number,
      "Address": m.address,
      "ICE": m.ice,
      "IF Number": m.if_number,
      "Payment": m.payment_method,
      "Bank Name": m.bank_name,
      "Account #": m.bank_account_number,
      "Acct Code": m.account_code,
      "Travel Date": m.travel_date,
      "Notes": m.notes,
    }));

    // Create Worksheet
    const ws = XLSX.utils.json_to_sheet(data);

    // Auto-width for columns
    const wscols = Object.keys(data[0] || {}).map(k => ({ wch: Math.max(k.length, 15) }));
    ws['!cols'] = wscols;

    // Create Workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Crew List");

    // Generate Excel File
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });

    saveAs(blob, fileName);
  };

  const handleDownloadContract = async (contract: ContractRecord) => {
    setDownloadingContractId(contract.id || contract.file_path);
    try {
      const blob = await api.downloadContractFile(contract.file_path);
      saveAs(blob, contract.contract_name);
    } catch (err) {
      console.error("Contract download error:", err);
      alert("Unable to download this contract.");
    } finally {
      setDownloadingContractId(null);
    }
  };

  const handleExportExcel = () => {
    if (selectedIds.size === 0) return;

    const membersToExport = crewMembers.filter((m) => selectedIds.has(m.id));
    exportCrewMembersToExcel(
      membersToExport,
      `Crew_List_${name || "Export"}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const handleExportGlobalResults = () => {
    if (globalResults.length === 0) return;

    exportCrewMembersToExcel(
      globalResults,
      `Starter_Search_${name || "Export"}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  /* ------------------ SELECTION HANDLERS ------------------ */
  const toggleSelectAll = () => {
    if (selectedIds.size === crewMembers.length) {
      setSelectedIds(new Set()); // Deselect all
    } else {
      setSelectedIds(new Set(crewMembers.map((m) => m.id))); // Select all
    }
  };

  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Stop row click navigation
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleGlobalSearch = async () => {
    const q = globalSearch.trim();

    if (q.length < 2) {
      alert("Type at least 2 letters to search.");
      return;
    }

    setSearchingGlobal(true);
    setHasGlobalSearched(true);
    setGlobalResults([]);
    try {
      const data = await api.searchCrewMembers(q);
      setGlobalResults(data || []);
    } catch (err) {
      console.error("Error searching starter forms:", err);
      alert("Error while searching.");
    } finally {
      setSearchingGlobal(false);
    }
  };

  const handleAssignStarter = async (memberId: string) => {
    if (!companyId) {
      alert("Company not loaded.");
      return;
    }

    setAssigningId(memberId);
    try {
      const created = await api.duplicateCrewMemberForAssignment(
        memberId,
        companyId,
        jobId || null
      );
      setCrewMembers((prev) => [created, ...prev]);
      setSelectedIds(new Set());
      setGlobalSearch("");
      setGlobalResults([]);
      setHasGlobalSearched(false);
      alert(jobId ? "Starter form assigned to job." : "Starter form added to company.");
      setTimeout(() => globalSearchInputRef.current?.focus(), 50);
    } catch (err) {
      console.error("Error assigning starter form:", err);
      alert("Error while assigning.");
    } finally {
      setAssigningId(null);
    }
  };

  const handleAssignSelectedToJob = async () => {
    if (!selectedJobId) {
      alert("Select a job.");
      return;
    }

    if (selectedIds.size === 0) {
      alert("Select at least one crew member.");
      return;
    }

    setAssigningToJob(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(
        ids.map((id) => api.updateCrewMember(id, { job_id: selectedJobId }))
      );

      setCrewMembers((prev) =>
        prev.map((member) =>
          selectedIds.has(member.id) ? { ...member, job_id: selectedJobId } : member
        )
      );
      setSelectedIds(new Set());
      setSelectedJobId("");
      alert("Crew member(s) assigned to job.");
    } catch (err) {
      console.error("Error assigning to job:", err);
      alert("Error while assigning to job.");
    } finally {
      setAssigningToJob(false);
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className={`h-screen w-full flex overflow-hidden transition-colors duration-300 ${dark ? "bg-[#050814] text-white" : "bg-[#e5ecff] text-black"
        }`}
      style={{ fontFamily: "'Segoe UI', system-ui" }}
    >
      {/* ---------------- SIDEBAR ---------------- */}
      <aside
        className={`
        w-64 px-6 py-8 flex flex-col justify-between backdrop-blur-xl border-r shadow-xl
        ${dark
            ? "bg-white/10 border-white/20 text-white"
            : "bg-white/90 border-black/10 text-black"
          }
        `}
      >
        <div className="flex flex-col gap-3">
          {/* NEW STARTER */}
          <button
            onClick={() =>
              navigate(`/windows/new-starter/${encodeURIComponent(name || "")}?job=${jobId ?? ""}`)
            }
            className={`
              flex items-center gap-3 px-4 py-2 rounded-xl border transition
              ${dark
                ? "bg-white/10 hover:bg-white/20 border-white/20 text-white"
                : "bg-blue-50 hover:bg-blue-100 border-blue-300 text-black"
              }
            `}
          >
            <UserPlus size={18} /> New Starter
          </button>

          {/* CONTRACT */}
          <button
            onClick={() => setActiveTab("contract")}
            className={`
              flex items-center gap-3 px-4 py-2 rounded-xl border transition
              ${activeTab === "contract"
                ? dark
                  ? "bg-blue-600/40 border-blue-400 shadow-[0_0_10px_rgba(60,120,255,0.5)]"
                  : "bg-blue-200 border-blue-500 shadow-[0_0_12px_rgba(0,80,255,0.4)]"
                : dark
                  ? "bg-white/10 hover:bg-white/20 border-white/20"
                  : "bg-white/70 hover:bg-white border-black/10"
              }
            `}
          >
            <FileText size={18} /> Crew Contract
          </button>

          {/* CREW LIST */}
          <button
            onClick={() => setActiveTab("database")}
            className={`
              flex items-center gap-3 px-4 py-2 rounded-xl border transition
              ${activeTab === "database"
                ? dark
                  ? "bg-blue-600/40 border-blue-400 shadow-[0_0_10px_rgba(60,120,255,0.5)]"
                  : "bg-blue-200 border-blue-500 shadow-[0_0_12px_rgba(0,80,255,0.4)]"
                : dark
                  ? "bg-white/10 hover:bg-white/20 border-white/20"
                  : "bg-white/70 hover:bg-white border-black/10"
              }
            `}
          >
            <Database size={18} /> Crew List
          </button>
        </div>

        {/* BACK BUTTON */}
        <button
          onClick={() => navigate(-1)}
          className={`
            flex items-center justify-center gap-2 py-2 rounded-xl border transition
            ${dark
              ? "bg-red-500/20 hover:bg-red-500/30 border-red-400 text-red-300"
              : "bg-red-100 hover:bg-red-200 border-red-400 text-red-700"
            }
          `}
        >
          <ArrowLeft size={16} /> Back
        </button>
      </aside>

      {/* ---------------- MAIN CONTENT ---------------- */}
      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex-1 p-10 overflow-y-auto"
      >
        <h1
          className={`text-3xl font-semibold mb-8 tracking-tight ${dark ? "text-white" : "text-black"
            }`}
        >
          Crew Management — {jobId ? jobName || "Job" : "All Jobs"} <span className="text-sm opacity-50">({name})</span>
        </h1>

        {/* ---------------- CREW LIST TAB ---------------- */}
        {activeTab === "database" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className={`
              p-6 rounded-3xl backdrop-blur-xl border shadow-xl
              ${dark
                ? "bg-white/10 border-white/20 text-white"
                : "bg-white border-black/10 text-black"
              }
            `}
          >
            <div className="flex justify-between items-center mb-4">
              <h2
                className={`text-xl font-semibold ${dark ? "text-white/90" : "text-black/90"
                  }`}
              >
                Crew List
              </h2>

              {/* EXPORT BUTTON */}
              {selectedIds.size > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={handleExportExcel}
                  className="
                    flex items-center gap-2 px-4 py-2 rounded-lg 
                    bg-green-600 text-white font-medium shadow-md 
                    hover:bg-green-700 transition
                  "
                >
                  <FileDown size={18} />
                  Export Excel ({selectedIds.size})
                </motion.button>
              )}
            </div>

            <div
              className={`mb-6 rounded-2xl border p-4 ${dark
                ? "bg-white/5 border-white/15"
                : "bg-gray-50 border-gray-200"
                }`}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Search
                    className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${dark ? "text-white/40" : "text-black/40"
                      }`}
                  />
                  <input
                    ref={globalSearchInputRef}
                    type="text"
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleGlobalSearch();
                    }}
                    placeholder="Search global starter forms by first or last name"
                    className={`w-full rounded-lg border px-10 py-3 text-sm outline-none transition ${dark
                      ? "bg-white/10 border-white/15 text-white placeholder-white/35 focus:border-blue-400/60"
                      : "bg-white border-gray-300 text-black placeholder-gray-400 focus:border-blue-500"
                      }`}
                  />
                </div>

                <button
                  onClick={handleGlobalSearch}
                  disabled={searchingGlobal}
                  className="
                    flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3
                    text-sm font-medium text-white shadow hover:bg-blue-700 disabled:opacity-60
                  "
                >
                  <Search size={16} />
                  {searchingGlobal ? "Searching..." : "Search"}
                </button>
              </div>

              {globalResults.length > 0 && (
                <>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className={dark ? "text-sm text-white/60" : "text-sm text-black/60"}>
                    {globalResults.length} starter form(s) found
                  </p>
                  <button
                    onClick={handleExportGlobalResults}
                    className="
                      flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2
                      text-xs font-medium text-white shadow hover:bg-green-700
                    "
                  >
                    <FileDown size={14} />
                    Export search
                  </button>
                </div>

                <div
                  className={`mt-3 overflow-x-auto rounded-xl border ${dark ? "border-white/15" : "border-gray-200"
                    }`}
                >
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={dark ? "text-gray-300" : "text-gray-600"}>
                        <th className="px-3 py-2 text-left">First Name</th>
                        <th className="px-3 py-2 text-left">Last Name</th>
                        <th className="px-3 py-2 text-left">ID Card</th>
                        <th className="px-3 py-2 text-left">Position</th>
                        <th className="px-3 py-2 text-left">Department</th>
                        <th className="px-3 py-2 text-left">Project</th>
                        <th className="px-3 py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {globalResults.map((m) => (
                        <tr
                          key={m.id}
                          className={`border-t ${dark ? "border-white/10 text-white" : "border-gray-200 text-black"
                            }`}
                        >
                          <td className="px-3 py-2 whitespace-nowrap">{m.first_name}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{m.last_name}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{m.id_card_number}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{m.position}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{m.department}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{m.project_title}</td>
                          <td className="px-3 py-2 text-right">
                            <button
                              onClick={() => handleAssignStarter(m.id)}
                              disabled={assigningId === m.id}
                              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-60 ${dark
                                ? "bg-green-500/20 text-green-300 hover:bg-green-500/30"
                                : "bg-green-100 text-green-700 hover:bg-green-200"
                                }`}
                            >
                              <Link2 size={14} />
                              {assigningId === m.id
                                ? "Assigning..."
                                : jobId
                                  ? "Assign to job"
                                  : "Assign to company"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </>
              )}

              {hasGlobalSearched && !searchingGlobal && globalResults.length === 0 && (
                <p
                  className={`mt-4 rounded-lg border px-4 py-3 text-sm ${dark
                    ? "border-white/15 bg-white/5 text-white/60"
                    : "border-gray-200 bg-white text-black/60"
                    }`}
                >
                  No global starter form found for this search.
                </p>
              )}
            </div>

            {!jobId && (
              <div
                className={`mb-6 rounded-2xl border p-4 ${dark
                  ? "border-blue-400/20 bg-blue-500/10"
                  : "border-blue-200 bg-blue-50"
                  }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className={dark ? "text-sm font-medium text-white" : "text-sm font-medium text-black"}>
                      Assign selected crew members to a job
                    </p>
                    <p className={dark ? "text-xs text-white/55" : "text-xs text-black/55"}>
                      Select one or more rows in All Jobs, then choose the target job.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <select
                      value={selectedJobId}
                      onChange={(e) => setSelectedJobId(e.target.value)}
                      disabled={jobs.length === 0}
                      className={`min-w-[220px] rounded-lg border px-3 py-2 text-sm outline-none ${dark
                        ? "border-white/15 bg-white/10 text-white"
                        : "border-gray-300 bg-white text-black"
                        }`}
                    >
                      <option value="" className="text-black">
                        {jobs.length === 0 ? "No job available" : "Choose a job"}
                      </option>
                      {jobs.map((job) => (
                        <option key={job.id} value={job.id} className="text-black">
                          {job.name}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={handleAssignSelectedToJob}
                      disabled={assigningToJob || selectedIds.size === 0 || !selectedJobId}
                      className="
                        rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow
                        hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50
                      "
                    >
                      {assigningToJob
                        ? "Assigning..."
                        : `Assign (${selectedIds.size})`}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <p className={dark ? "text-white/70" : "text-black/60"}>
                Loading...
              </p>
            ) : crewMembers.length === 0 ? (
              <p className={dark ? "text-white/70" : "text-black/60"}>
                No crew members found.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table
                  className={`w-full text-sm rounded-2xl overflow-hidden shadow ${dark ? "text-white" : "text-black"
                    }`}
                >
                  <thead>
                    <tr
                      className={`text-left text-sm font-semibold border-b ${dark
                        ? "bg-white/5 border-white/10 text-gray-300"
                        : "bg-gray-50 border-gray-200 text-gray-600"
                        }`}
                    >
                      {/* CHECKBOX ALL */}
                      <th className="px-4 py-3 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={crewMembers.length > 0 && selectedIds.size === crewMembers.length}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-3 whitespace-nowrap">First Name</th>
                      <th className="px-4 py-3 whitespace-nowrap">Last Name</th>
                      <th className="px-4 py-3 whitespace-nowrap">Position</th>
                      <th className="px-4 py-3 whitespace-nowrap">Department</th>

                      <th className="px-4 py-3 whitespace-nowrap">Start Date</th>
                      <th className="px-4 py-3 whitespace-nowrap">End Date</th>

                      <th className="px-4 py-3 whitespace-nowrap">Phone</th>
                      <th className="px-4 py-3 whitespace-nowrap">Mobile</th>
                      {/* <th className="px-4 py-3 whitespace-nowrap">Email</th> */}

                      <th className="px-4 py-3 whitespace-nowrap">Rate</th>
                      <th className="px-4 py-3 whitespace-nowrap">Daily Rate</th>
                      <th className="px-4 py-3 whitespace-nowrap">Day Worked</th>
                      <th className="px-4 py-3 whitespace-nowrap">Per Week</th>
                      <th className="px-4 py-3 whitespace-nowrap">Holiday Worked</th>
                      <th className="px-4 py-3 whitespace-nowrap">Travel Day</th>

                      <th className="px-4 py-3 whitespace-nowrap">Allowance</th>
                      <th className="px-4 py-3 whitespace-nowrap">Per Diem</th>
                      <th className="px-4 py-3 whitespace-nowrap">Accommodation</th>

                      <th className="px-4 py-3 whitespace-nowrap">ID Card</th>
                      <th className="px-4 py-3 whitespace-nowrap">Date of Birth</th>
                      <th className="px-4 py-3 whitespace-nowrap">Patent</th>
                      <th className="px-4 py-3 whitespace-nowrap">Address</th>
                      <th className="px-4 py-3 whitespace-nowrap">ICE</th>
                      <th className="px-4 py-3 whitespace-nowrap">IF Number</th>

                      <th className="px-4 py-3 whitespace-nowrap">Payment</th>
                      <th className="px-4 py-3 whitespace-nowrap">Bank Name</th>
                      <th className="px-4 py-3 whitespace-nowrap">Account #</th>
                      <th className="px-4 py-3 whitespace-nowrap">Acct Code</th>

                      <th className="px-4 py-3 whitespace-nowrap">Travel Date</th>
                      <th className="px-4 py-3 whitespace-nowrap">Notes</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {crewMembers.map((m, i) => (
                      <motion.tr
                        key={m.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: i * 0.03 }}
                        className={`
                          border-b transition cursor-pointer
                          ${dark
                            ? "border-white/10 hover:bg-white/10"
                            : "border-black/10 hover:bg-blue-50"
                          }
                        `}
                      >
                        {/* CHECKBOX ROW */}
                        <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(m.id)}
                            onChange={(e) => toggleSelectOne(m.id, e as any)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{m.first_name}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{m.last_name}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{m.position}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{m.department}</td>

                        <td className="px-4 py-3 whitespace-nowrap">{m.start_date}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{m.end_date}</td>

                        <td className="px-4 py-3 whitespace-nowrap">{m.phone}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{m.mobile}</td>

                        <td className="px-4 py-3 whitespace-nowrap">{m.rate}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{m.daily_rate}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{m.day_worked}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{m.per_week}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{m.holiday_worked}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{m.travel_day}</td>

                        <td className="px-4 py-3 whitespace-nowrap">{m.living_allowance}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{m.per_diem}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{m.accommodation}</td>

                        <td className="px-4 py-3 whitespace-nowrap">{m.id_card_number}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{m.date_of_birth}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{m.patent_number}</td>
                        <td className="px-4 py-3 whitespace-nowrap truncate max-w-[150px]" title={m.address || ""}>{m.address}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{m.ice}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{m.if_number}</td>

                        <td className="px-4 py-3 whitespace-nowrap">{m.payment_method}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{m.bank_name}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{m.bank_account_number}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{m.account_code}</td>

                        <td className="px-4 py-3 whitespace-nowrap">{m.travel_date}</td>
                        <td className="px-4 py-3 whitespace-nowrap truncate max-w-[200px]" title={m.notes || ""}>{m.notes}</td>

                        <td className="px-4 py-3 flex gap-2">
                          <button
                            onClick={() =>
                              navigate(
                                `/windows/new-starter/${encodeURIComponent(name || "")}?job=${jobId ?? ""}&edit=${m.id}`
                              )
                            }
                            className={`
                              px-3 py-1 rounded-xl text-xs transition flex items-center gap-1
                              ${dark
                                ? "bg-blue-500/20 hover:bg-blue-500/30"
                                : "bg-blue-200 hover:bg-blue-300"
                              }
                            `}
                          >
                            <Pencil size={14} /> Edit
                          </button>

                          <button
                            onClick={() => generatePDF(m)}
                            className={`
                              px-3 py-1 rounded-xl text-xs transition flex items-center gap-1
                              ${dark
                                ? "bg-green-500/20 hover:bg-green-500/30"
                                : "bg-green-200 hover:bg-green-300"
                              }
                            `}
                          >
                            <FileDown size={14} /> PDF
                          </button>

                          <button
                            onClick={() => handleDelete(m.id)}
                            className={`
                              px-3 py-1 rounded-xl text-xs transition
                              ${dark
                                ? "bg-red-500/20 hover:bg-red-500/30"
                                : "bg-red-200 hover:bg-red-300"
                              }
                            `}
                          >
                            Delete
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {/* ---------------- CONTRACT TAB ---------------- */}
        {activeTab === "contract" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, zIndex: 0, y: 0 }}
            transition={{ duration: 0.35 }}
            className={`
              p-6 rounded-3xl backdrop-blur-xl border shadow-xl
              ${dark
                ? "bg-white/10 border-white/20 text-white"
                : "bg-white border-black/10 text-black"
              }
            `}
          >
            <h2 className="text-xl font-semibold mb-4">Crew Contract</h2>
            {loadingContracts ? (
              <p className={dark ? "text-white/70" : "text-black/70"}>Loading contracts...</p>
            ) : contracts.length === 0 ? (
              <p className={dark ? "text-white/70" : "text-black/70"}>
                No generated contract for the crew members assigned to this job.
              </p>
            ) : (
              <div className={`overflow-x-auto rounded-xl border ${dark ? "border-white/15" : "border-black/10"}`}>
                <table className={`w-full text-left ${dark ? "text-white/90" : "text-black/90"}`}>
                  <thead className={dark ? "bg-white/10 text-white/70" : "bg-black/5 text-black/70"}>
                    <tr>
                      <th className="px-4 py-3">Crew member</th>
                      <th className="px-4 py-3">Contract</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map((contract) => {
                      const member = crewMembers.find((item) => item.id === contract.crew_member_id);
                      const contractId = contract.id || contract.file_path;
                      return (
                        <tr key={contractId} className={dark ? "border-t border-white/15 text-white/90" : "border-t border-black/10 text-black/90"}>
                          <td className="px-4 py-3 font-medium">
                            {[member?.first_name, member?.last_name].filter(Boolean).join(" ") || "Crew member"}
                          </td>
                          <td className="px-4 py-3">{contract.contract_name}</td>
                          <td className="px-4 py-3">
                            {contract.created_at ? new Date(contract.created_at).toLocaleDateString("fr-FR") : ""}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDownloadContract(contract)}
                              disabled={downloadingContractId === contractId}
                              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm disabled:opacity-50 ${
                                dark ? "bg-blue-500/25 hover:bg-blue-500/35 text-blue-100" : "bg-blue-100 hover:bg-blue-200 text-blue-800"
                              }`}
                            >
                              <FileDown size={16} />
                              {downloadingContractId === contractId ? "Downloading..." : "Download"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
      </motion.main>
    </motion.div>
  );
}
