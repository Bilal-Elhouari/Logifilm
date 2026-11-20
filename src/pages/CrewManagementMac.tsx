import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { api, ContractRecord } from "../services/api";
import CrewManagementView from "../components/crew/CrewManagementView";

export default function CrewManagementMac() {
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

  /* ------------------ FETCH COMPANY ------------------ */
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

  /* ------------------ FETCH CREW MEMBERS ------------------ */
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

  /* ------------------ DELETE ------------------ */
  const handleDelete = async (id: string) => {
    if (!confirm("Delete crew member?")) return;
    try {
      await api.deleteCrewMember(id);
      setCrewMembers((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  /* ------------------ PDF ------------------ */
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
      alert(jobId ? "Starter form assigned to project." : "Starter form added to company.");
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
      alert("Select a project.");
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
      alert("Crew member(s) assigned to project.");
    } catch (err) {
      console.error("Error assigning to project:", err);
      alert("Error while assigning to project.");
    } finally {
      setAssigningToJob(false);
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <CrewManagementView
      os="mac"
      vm={{
        companyName: name || "",
        jobId,
        jobName,
        activeTab,
        setActiveTab,
        crewMembers,
        loading,
        selectedIds,
        toggleSelectAll,
        toggleSelectOne,
        onExportSelected: handleExportExcel,
        globalSearch,
        setGlobalSearch,
        onGlobalSearch: handleGlobalSearch,
        searchingGlobal,
        hasGlobalSearched,
        globalResults,
        onExportGlobalResults: handleExportGlobalResults,
        onAssignStarter: handleAssignStarter,
        assigningId,
        globalSearchInputRef,
        jobs,
        selectedJobId,
        setSelectedJobId,
        onAssignSelectedToJob: handleAssignSelectedToJob,
        assigningToJob,
        contracts,
        loadingContracts,
        downloadingContractId,
        onDownloadContract: handleDownloadContract,
        onNewStarter: () =>
          navigate(`/mac/new-starter/${encodeURIComponent(name || "")}?job=${jobId ?? ""}`),
        onEdit: (id) =>
          navigate(`/mac/new-starter/${encodeURIComponent(name || "")}?job=${jobId ?? ""}&edit=${id}`),
        onPdf: generatePDF,
        onDelete: handleDelete,
        onBack: () => navigate(-1),
      }}
    />
  );
}
