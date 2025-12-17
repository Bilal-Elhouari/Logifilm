import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  UserPlus,
  Database,
  FileText,
  Pencil,
  FileDown,
} from "lucide-react";
import { motion } from "framer-motion";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { api } from "../services/api";

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

  // ✅ MULTI-SELECTION STATE
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
    if (!companyId || activeTab !== "database") return;

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
  const handleExportExcel = () => {
    if (selectedIds.size === 0) return;

    // Filter selected members
    const membersToExport = crewMembers.filter((m) => selectedIds.has(m.id));

    // Format data for Excel
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

    saveAs(blob, `Crew_List_${name || "Export"}_${new Date().toISOString().slice(0, 10)}.xlsx`);
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

  /* ------------------ UI ------------------ */
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="
        h-screen w-full flex overflow-hidden
        bg-[linear-gradient(180deg,#f6f7ff,#e8ecff)]
        dark:bg-[linear-gradient(180deg,#1a1b1f,#0f1014)]
      "
      style={{ fontFamily: "'SF Pro Display', system-ui" }}
    >
      {/* ------------------ SIDEBAR ------------------ */}
      <aside
        className="
        w-64 px-6 py-8 flex flex-col justify-between
        bg-white/40 dark:bg-white/10
        backdrop-blur-2xl border-r border-white/30 dark:border-white/10
        shadow-[8px_0_30px_rgba(0,0,0,0.08)]
        "
      >
        <div className="flex flex-col gap-3">

          {/* NEW STARTER */}
          <button
            onClick={() =>
              navigate(`/mac/new-starter/${name}?job=${jobId ?? ""}`)
            }
            className="
              flex items-center gap-3 px-4 py-2 rounded-2xl
              bg-white/50 dark:bg-white/5 
              backdrop-blur-xl border border-white/20 dark:border-white/10
              hover:brightness-110 active:scale-[0.98] 
              transition shadow text-black dark:text-white
            "
          >
            <UserPlus size={18} /> New Starter
          </button>

          {/* CONTRACT */}
          <button
            onClick={() => setActiveTab("contract")}
            className={`
              flex items-center gap-3 px-4 py-2 rounded-2xl transition shadow-sm
              backdrop-blur-xl border

              ${activeTab === "contract"
                ? "bg-[rgba(0,122,255,0.20)] dark:bg-[rgba(0,122,255,0.35)] border-blue-500/30 shadow-[0_0_12px_rgba(0,122,255,0.35)] text-black dark:text-white"
                : "bg-white/40 dark:bg-white/5 border-white/20 dark:border-white/10 hover:brightness-110 text-black dark:text-white"
              }
            `}
          >
            <FileText size={18} /> Crew Contract
          </button>

          {/* CREW LIST */}
          <button
            onClick={() => setActiveTab("database")}
            className={`
              flex items-center gap-3 px-4 py-2 rounded-2xl transition shadow-sm
              backdrop-blur-xl border

              ${activeTab === "database"
                ? "bg-[rgba(0,122,255,0.20)] dark:bg-[rgba(0,122,255,0.35)] border-blue-500/30 shadow-[0_0_12px_rgba(0,122,255,0.35)] text-black dark:text-white"
                : "bg-white/40 dark:bg-white/5 border-white/20 dark:border-white/10 hover:brightness-110 text-black dark:text-white"
              }
            `}
          >
            <Database size={18} /> Crew List
          </button>
        </div>

        {/* BACK */}
        <button
          onClick={() => navigate(-1)}
          className="
            flex items-center justify-center gap-2 py-2 rounded-2xl 
            bg-white/70 dark:bg-white/10 
            hover:brightness-110 transition text-red-500
            border border-white/30 dark:border-white/10 shadow
          "
        >
          <ArrowLeft size={16} /> Retour
        </button>
      </aside>

      {/* ------------------ MAIN CONTENT ------------------ */}
      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex-1 p-10 overflow-y-auto"
      >
        <h1 className="text-3xl font-semibold mb-8 text-black dark:text-white tracking-tight">
          Crew Management — {jobId ? jobName || "Job" : "All Jobs"} <span className="text-sm opacity-50">({name})</span>
        </h1>

        {/* ------------------ CREW LIST TAB ------------------ */}
        {activeTab === "database" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="
              bg-white/60 dark:bg-white/10
              backdrop-blur-2xl p-6 rounded-3xl
              border border-white/40 dark:border-white/10 
              shadow-[0_8px_35px_rgba(0,0,0,0.08)]
            "
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-black/80 dark:text-white/80">
                Crew List
              </h2>

              {/* EXPORT BUTTON */}
              {selectedIds.size > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={handleExportExcel}
                  className="
                    flex items-center gap-2 px-4 py-2 rounded-xl 
                    bg-green-500 text-white font-medium shadow-md 
                    hover:bg-green-600 transition
                  "
                >
                  <FileDown size={18} />
                  Export Excel ({selectedIds.size})
                </motion.button>
              )}
            </div>

            {loading ? (
              <p className="text-black/60 dark:text-white/60">Chargement...</p>
            ) : crewMembers.length === 0 ? (
              <p className="text-black/60 dark:text-white/60">
                Aucun membre trouvé.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table
                  className="
                    w-full text-sm rounded-2xl overflow-hidden 
                    shadow-[0_4px_25px_rgba(0,0,0,0.06)]
                  "
                >
                  <thead>
                    <tr className="text-black/70 dark:text-white/70 text-left">
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
                      <th className="px-4 py-3 whitespace-nowrap text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {crewMembers.map((m, index) => (
                      <motion.tr
                        key={m.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: index * 0.03 }}
                        className="
                          border-b border-black/10 dark:border-white/10
                          hover:bg-white/80 dark:hover:bg-white/5 
                          transition
                        "
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
                        <td className="px-4 py-3 whitespace-nowrap text-black dark:text-white">{m.first_name}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-black dark:text-white">{m.last_name}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-black dark:text-white">{m.position}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-black dark:text-white">{m.department}</td>

                        <td className="px-4 py-3 whitespace-nowrap text-black dark:text-white">{m.start_date}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-black dark:text-white">{m.end_date}</td>

                        <td className="px-4 py-3 whitespace-nowrap text-black dark:text-white">{m.phone}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-black dark:text-white">{m.mobile}</td>

                        <td className="px-4 py-3 whitespace-nowrap text-black dark:text-white">{m.rate}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-black dark:text-white">{m.daily_rate}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-black dark:text-white">{m.day_worked}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-black dark:text-white">{m.per_week}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-black dark:text-white">{m.holiday_worked}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-black dark:text-white">{m.travel_day}</td>

                        <td className="px-4 py-3 whitespace-nowrap text-black dark:text-white">{m.living_allowance}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-black dark:text-white">{m.per_diem}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-black dark:text-white">{m.accommodation}</td>

                        <td className="px-4 py-3 whitespace-nowrap text-black dark:text-white">{m.id_card_number}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-black dark:text-white">{m.date_of_birth}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-black dark:text-white">{m.patent_number}</td>
                        <td className="px-4 py-3 whitespace-nowrap truncate max-w-[150px] text-black dark:text-white" title={m.address || ""}>{m.address}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-black dark:text-white">{m.ice}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-black dark:text-white">{m.if_number}</td>

                        <td className="px-4 py-3 whitespace-nowrap text-black dark:text-white">{m.payment_method}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-black dark:text-white">{m.bank_name}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-black dark:text-white">{m.bank_account_number}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-black dark:text-white">{m.account_code}</td>

                        <td className="px-4 py-3 whitespace-nowrap text-black dark:text-white">{m.travel_date}</td>
                        <td className="px-4 py-3 whitespace-nowrap truncate max-w-[200px] text-black dark:text-white" title={m.notes || ""}>{m.notes}</td>

                        <td className="px-4 py-3 flex gap-2">
                          <button
                            onClick={() =>
                              navigate(
                                `/mac/new-starter/${name}?job=${jobId ?? ""}&edit=${m.id}`
                              )
                            }
                            className="
                              px-3 py-1 rounded-xl 
                              bg-blue-500/20 hover:bg-blue-500/30
                              dark:bg-blue-500/30 dark:hover:bg-blue-500/40
                              text-black dark:text-white text-xs flex items-center gap-1
                            "
                          >
                            <Pencil size={14} /> Edit
                          </button>

                          <button
                            onClick={() => generatePDF(m)}
                            className="
                              px-3 py-1 rounded-xl 
                              bg-green-500/20 hover:bg-green-500/30
                              dark:bg-green-500/30 dark:hover:bg-green-500/40
                              text-black dark:text-white text-xs flex items-center gap-1
                            "
                          >
                            <FileDown size={14} /> PDF
                          </button>

                          <button
                            onClick={() => handleDelete(m.id)}
                            className="
                              px-3 py-1 rounded-xl 
                              bg-red-500/20 hover:bg-red-500/30
                              dark:bg-red-500/30 dark:hover:bg-red-500/40
                              text-black dark:text-white text-xs
                            "
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

        {/* ------------------ CONTRACT TAB ------------------ */}
        {activeTab === "contract" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="
              bg-white/60 dark:bg-white/10 
              backdrop-blur-2xl p-6 rounded-3xl
              border border-white/40 dark:border-white/10 shadow
            "
          >
            <h2 className="text-xl font-semibold mb-4 text-black/80 dark:text-white/80">
              Crew Contract
            </h2>
            <p className="text-black/60 dark:text-white/60">
              Contract module coming soon…
            </p>
          </motion.div>
        )}
      </motion.main>
    </motion.div>
  );
}
