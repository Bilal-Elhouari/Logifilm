import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Download, ChevronDown, Save } from "lucide-react";
import jsPDF from "jspdf";
import { api } from "../services/api";

/* ---------------- TYPESCRIPT INTERFACES ---------------- */
interface InputMacProps {
  dark: boolean;
  label: string;
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: "text" | "date" | "number";
  onFocus?: () => void;
  onBlur?: () => void;
  readOnly?: boolean;
  maxLength?: number;
}

interface SelectPerDayWeekMacProps {
  value: string;
  onChange: (value: string) => void;
  dark: boolean;
}

interface SelectBankNameMacProps {
  value: string;
  onChange: (value: string) => void;
  dark: boolean;
}

interface StaticSignatureMacProps {
  label: string;
  dark: boolean;
}

export default function NewStarterFormMac() {
  const { name } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get("job");
  const editId = searchParams.get("edit"); // ✅ Edit ID

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /* ---------------- DARK MODE AUTO sync macOS ---------------- */
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
      if (!name) return;
      try {
        const data = await api.getCompanyByName(name);
        if (data) setCompanyId(data.id);
      } catch (e) {
        console.error(e);
      }
    }
    loadCompany();
  }, [name]);

  /* ---------------- LOAD DATA FOR EDIT ---------------- */
  useEffect(() => {
    if (!editId) return;

    async function loadCrewMember() {
      try {
        const data = await api.getCrewMemberById(editId!);
        if (data) {
          setFormData({
            firstName: data.first_name || "",
            lastName: data.last_name || "",
            birth: data.date_of_birth || "",
            idCard: data.id_card_number || "",
            patent: data.patent_number || "",
            address: data.address || "",
            phone: data.phone || "",
            mobile: data.mobile || "",
            position: data.position || "",
            department: data.department || "",
            startDate: data.start_date || "",
            endDate: data.end_date || "",
            rate: data.rate ? formatCurrency(data.rate) : "",
            perWeek: data.per_week || "",
            dayWorked: data.day_worked ? formatCurrency(data.day_worked) : "",
            holidayWorked: data.holiday_worked || "",
            travelDay: data.travel_day || "",
            dailyRate: data.daily_rate ? formatCurrency(data.daily_rate) : "",
            allowance: data.living_allowance || "",
            perDiem: data.per_diem || "",
            accommodation: data.accommodation || "",
            payment: data.payment_method || "",
            bankAccount: data.bank_account_number || "",
            bankName: data.bank_name || "",
            acctCode: data.account_code || "",
            travelDate: data.travel_date || "",
            note: data.notes || "",
            ice: data.ice || "",
            ifNumber: data.if_number || "",
          });
          if (data.project_title) setProjectTitle(data.project_title);
        }
      } catch (e) {
        console.error("Erreur chargement member:", e);
      }
    }
    loadCrewMember();
  }, [editId]);

  /* ---------------- FORM DATA ---------------- */
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    birth: "",
    idCard: "",
    patent: "",
    address: "",
    phone: "",
    mobile: "",
    position: "",
    department: "",
    startDate: "",
    endDate: "",
    rate: "",
    perWeek: "",
    dayWorked: "",
    holidayWorked: "",
    travelDay: "",
    dailyRate: "",
    allowance: "",
    perDiem: "",
    accommodation: "",
    payment: "",
    bankAccount: "",
    bankName: "",
    acctCode: "",
    travelDate: "",
    note: "",
    ice: "",
    ifNumber: "", // ✅ AJOUT ICI
  });

  const [projectTitle, setProjectTitle] = useState("");

  /* ---------------- HELPERS ---------------- */
  const clean = (v: any) => (v === "" ? null : v);
  const cleanNumber = (v: any) => {
    if (!v) return null;
    // Remove all non-numeric characters except decimal point
    const cleaned = String(v).replace(/[^\d.]/g, "");
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
  };

  const formatCurrency = (value: number) =>
    `${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} MAD`;

  const handleChange = (key: string, val: any) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
  };

  /* ---------------- RATE LOGIC ---------------- */
  const handleRateInput = (val: string) => {
    const cleanVal = val.replace(/[^\d.]/g, "");
    setFormData((prev) => ({ ...prev, rate: cleanVal }));
  };

  const handleRateFocus = () => {
    const numeric = parseFloat(formData.rate.replace(/[^\d.]/g, ""));
    setFormData((prev) => ({
      ...prev,
      rate: !isNaN(numeric) ? numeric.toString() : "",
    }));
  };

  const handleRateBlur = () => {
    const numeric = parseFloat(formData.rate);
    if (!isNaN(numeric)) {
      const dailyNumeric = numeric / 6;
      const seventhNumeric = dailyNumeric * 2;

      setFormData((prev) => ({
        ...prev,
        rate: formatCurrency(numeric),
        dailyRate: formatCurrency(dailyNumeric),
        dayWorked: formatCurrency(seventhNumeric), // 7th DAY WORKED auto
      }));
    }
  };

  /* ---------------- BANK ACCOUNT VALIDATION ---------------- */
  const handleBankAccountInput = (val: string) => {
    const digits = val.replace(/\D/g, ""); // chiffre uniquement
    if (digits.length <= 24) {
      setFormData((prev) => ({ ...prev, bankAccount: digits }));
    }
  };

  /* ---------------- IF VALIDATION ---------------- */
  const handleIfInput = (val: string) => {
    const digits = val.replace(/\D/g, ""); // chiffres uniquement
    if (digits.length <= 15) {
      setFormData((prev) => ({ ...prev, ifNumber: digits }));
    }
  };



  /* ---------------- SAVE ---------------- */
  const handleSave = async () => {
    if (!companyId) {
      alert("❌ Erreur: Impossible de trouver la compagnie. Veuillez réessayer.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        company_id: companyId,
        job_id: jobId,

        project_title: projectTitle,

        first_name: formData.firstName,
        last_name: formData.lastName,
        date_of_birth: formData.birth,
        id_card_number: formData.idCard,
        patent_number: formData.patent,
        // sex: null,

        address: formData.address,
        phone: formData.phone,
        mobile: formData.mobile,

        position: formData.position,
        department: formData.department,
        start_date: formData.startDate,
        end_date: formData.endDate,

        rate: cleanNumber(formData.rate),
        daily_rate: cleanNumber(formData.dailyRate),
        day_worked: cleanNumber(formData.dayWorked),
        per_week: formData.perWeek,
        holiday_worked: clean(formData.holidayWorked),
        travel_day: clean(formData.travelDay),

        living_allowance: clean(formData.allowance),
        per_diem: clean(formData.perDiem),
        accommodation: formData.accommodation,

        payment_method: formData.payment,
        bank_account_number: formData.bankAccount,
        bank_name: formData.bankName,
        account_code: formData.acctCode,
        ice: formData.ice,
        if_number: formData.ifNumber,

        travel_date: formData.travelDate,
        notes: formData.note,
      };

      console.log('📤 PAYLOAD:', payload);

      if (editId) {
        // UPDATE
        await api.updateCrewMember(editId, payload);
        alert("✅ Modifications sauvegardées avec succès!");
      } else {
        // CREATE
        await api.createStarterForm(payload);
        alert("✅ Formulaire sauvegardé avec succès!");
      }

      navigate(-1);
    } catch (e: any) {
      console.error("Erreur lors de la sauvegarde:", e);
      alert(`❌ Erreur lors de la sauvegarde: ${e.message || "Erreur inconnue. Vérifiez la console."}`);
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePDF = () => {
    const pdf = new jsPDF("p", "mm", "a4");

    // -----------------------------
    // BASE CONFIG
    // -----------------------------
    const leftX = 20;
    const rightX = 115;
    const lineHeight = 10;
    let y = 22;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text(name?.toUpperCase() || "COMPANY NAME", 105, y, { align: "center" });

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
    // CLEAN FIELDS (NEW FIX 🔥)
    // -----------------------------

    const leftFieldsRaw: [string, string][] = [
      ["FIRST NAME :", formData.firstName],
      ["ID CARD NO :", formData.idCard],
      ["ADDRESS :", formData.address],
      ["TELEPHONE # :", formData.phone],
      ["POSITION :", formData.position],
      ["START DATE :", formData.startDate],
      ["RATE :", formData.rate],
      ["7th DAY WORKED :", formData.dayWorked],
      ["TRAVEL DAY :", formData.travelDay],
      ["LIVING ALLOWANCE :", formData.allowance],
      ["ACCOMMODATION :", formData.accommodation],
      ["BANK NAME :", formData.bankName],
      ["ACCT CODE :", formData.acctCode],
      ["ICE :", formData.ice],
      ["BANK ACCOUNT# :", formData.bankAccount],
    ];

    const rightFieldsRaw: [string, string][] = [
      ["NAME :", formData.lastName],
      ["DATE OF BIRTH :", formData.birth],
      ["PATENT :", formData.patent],
      ["MOBILE # :", formData.mobile],
      ["DEPARTMENT :", formData.department],
      ["END DATE :", formData.endDate],
      ["PER DAY/WEEK :", formData.perWeek],
      ["HOLIDAY WORKED :", formData.holidayWorked],
      ["DAILY RATE :", formData.dailyRate],
      ["PER DIEM :", formData.perDiem],
      ["PAYMENT METHOD :", formData.payment],
      ["TRAVEL DATE :", formData.travelDate],
      ["IF :", formData.ifNumber],
      ["NOTE :", formData.note],
    ];

    // ✅ GARDE LES CHAMPS MÊME VIDES
    const cleanField = (entry: [string, string]): boolean =>
      entry[0] !== undefined &&
      entry[0] !== null &&
      entry[0].toString().trim() !== "";


    const leftFields = leftFieldsRaw.filter(cleanField);
    const rightFields = rightFieldsRaw.filter(cleanField);

    // -----------------------------
    // RENDU DES CHAMPS (safe loop)
    // -----------------------------
    // -----------------------------
    // RENDU DES CHAMPS (safe loop)
    // -----------------------------
    pdf.setDrawColor(0);   // 🖤 NOIR pour les traits des champs
    pdf.setLineWidth(0); // optionnel mais propre

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
        pdf.text(leftFields[i][1] || "", leftX + 42, yPos);
        pdf.line(leftX + 40, yPos + 1.5, 95, yPos + 1.5);
      }

      // RIGHT COLUMN
      if (rightFields[i]) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10.5);
        pdf.text(rightFields[i][0], rightX, yPos);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(12);
        pdf.text(rightFields[i][1] || "", rightX + 45, yPos);
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

    pdf.save(`StartForm_${name || "Company"}_${projectTitle || ""}.pdf`);
  };



  /* ---------------- RENDER ---------------- */
  return (
    <div
      className={`
        min-h-screen w-full flex flex-col items-center py-10 px-6 transition
        ${dark
          ? "bg-[#0e0e0f] text-white"
          : "bg-gradient-to-b from-[#F7F9FF] to-[#E7ECFF] text-black"
        }
      `}
    >
      {/* HEADER BUTTONS */}
      <div className="w-full max-w-5xl flex justify-between mb-6">
        {/* BACK */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate(-1)}
          className={`
            flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium
            border backdrop-blur-xl transition shadow-sm
            ${dark
              ? "bg-white/10 border-white/20 text-blue-300 hover:bg-white/20"
              : "bg-white/60 border-gray-300 text-blue-600 hover:bg-white"
            }
          `}
        >
          <ArrowLeft size={16} />
          Back
        </motion.button>

        {/* SAVE + PDF */}
        <div className="flex gap-4">
          {/* SAVE */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleSave}
            disabled={saving}
            className={`
              flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium shadow-md transition
              ${dark
                ? "bg-blue-600/80 hover:bg-blue-600 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
              }
            `}
          >
            <Save size={16} />
            {saving ? "Saving…" : editId ? "Update" : "Save"}
          </motion.button>

          {/* PDF */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleGeneratePDF}
            className={`
              flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium shadow-md transition
              ${dark
                ? "bg-green-600/80 hover:bg-green-600 text-white"
                : "bg-green-600 hover:bg-green-700 text-white"
              }
            `}
          >
            <Download size={16} />
            Generate PDF
          </motion.button>
        </div>
      </div>

      {/* FORM CARD */}
      <div
        className={`
          w-full max-w-5xl rounded-3xl border shadow-xl p-10 transition
          ${dark
            ? "bg-white/5 border-white/10 backdrop-blur-xl"
            : "bg-white/70 backdrop-blur-xl border-gray-200"
          }
        `}
      >
        {/* COMPANY + PROJECT TITLE */}
        <div className="text-center mb-8">
          <h1
            className={`text-[26px] font-semibold ${dark ? "text-white" : "text-gray-900"
              }`}
          >
            {editId ? "Modifier un Membre" : (name?.toUpperCase() || "COMPANY NAME")}
          </h1>

          <input
            type="text"
            placeholder="Project title"
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            className={`
              mt-3 text-[18px] font-medium px-4 py-2 rounded-xl shadow-sm text-center
              focus:outline-none focus:ring-2 transition
              ${dark
                ? "bg-white/10 border-white/20 text-white placeholder-gray-400 focus:ring-blue-500/40"
                : "bg-white/80 border-gray-300 text-gray-700 placeholder-gray-400 focus:ring-blue-400/40"
              }
            `}
          />
        </div>

        {/* FORM */}
        <form
          className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm"
          onSubmit={(e) => e.preventDefault()}
        >
          {Object.keys(formData).map((key) => {
            const label = key.replace(/([A-Z])/g, " $1").toUpperCase();



            // BANK ACCOUNT# (digits only + max 24)
            if (key === "bankAccount")
              return (
                <InputMac
                  key={key}
                  dark={dark}
                  label="BANK ACCOUNT#"
                  value={formData.bankAccount}
                  onChange={(e: any) => handleBankAccountInput(e.target.value)}
                  maxLength={24}
                />
              );





            // RATE
            if (key === "rate")
              return (
                <InputMac
                  key={key}
                  dark={dark}
                  label="RATE"
                  value={formData.rate}
                  onChange={(e: any) => handleRateInput(e.target.value)}
                  onFocus={handleRateFocus}
                  onBlur={handleRateBlur}
                />
              );

            // DAILY RATE (read only)
            if (key === "dailyRate")
              return (
                <InputMac
                  key={key}
                  dark={dark}
                  label="DAILY RATE"
                  value={formData.dailyRate}
                  readOnly
                />
              );

            // 7th DAY WORKED (read only auto)
            if (key === "dayWorked")
              return (
                <InputMac
                  key={key}
                  dark={dark}
                  label="7th DAY WORKED"
                  value={formData.dayWorked}
                  readOnly
                />
              );

            // DATES
            if (["birth", "startDate", "endDate", "travelDate"].includes(key))
              return (
                <InputMac
                  key={key}
                  dark={dark}
                  type="date"
                  label={label}
                  value={formData[key as keyof typeof formData]}
                  onChange={(e: any) => handleChange(key, e.target.value)}
                />
              );

            // PER DAY/WEEK (enum)
            if (key === "perWeek")
              return (
                <SelectPerDayWeekMac
                  key={key}
                  dark={dark}
                  value={formData.perWeek}
                  onChange={(v: any) => handleChange("perWeek", v)}
                />
              );

            // BANK NAME (banks + other)
            if (key === "bankName")
              return (
                <SelectBankNameMac
                  key={key}
                  dark={dark}
                  value={formData.bankName}
                  onChange={(v: any) => handleChange("bankName", v)}
                />
              );
            // IF (digits only, max 15)
            if (key === "ifNumber")
              return (
                <InputMac
                  key={key}
                  dark={dark}
                  label="IF"
                  value={formData.ifNumber}
                  onChange={(e: any) => handleIfInput(e.target.value)}
                  maxLength={15}
                />
              );


            // DEFAULT INPUT
            return (
              <InputMac
                key={key}
                dark={dark}
                label={label}
                value={formData[key as keyof typeof formData]}
                onChange={(e: any) => handleChange(key, e.target.value)}
              />
            );
          })}
        </form>

        {/* SIGNATURES */}
        <div className="grid grid-cols-2 gap-8 mt-10 text-sm">
          <div>
            <label
              className={`font-semibold italic mb-2 ${dark ? "text-gray-200" : "text-gray-700"
                }`}
            >
              EMPLOYEE SIGNATURE
            </label>
            <div
              className={`w-full h-28 rounded-xl border ${dark
                ? "border-white/20 bg-white/5"
                : "border-gray-300 bg-gray-100"
                }`}
            ></div>
          </div>

          <div className="flex flex-col gap-3">
            {[
              "APPROVAL",
              "LINE PRODUCER",
              "PRODUCTION MANAGER",
              "ACCOUNTS",
              "HOD",
            ].map((lbl) => (
              <StaticSignatureMac key={lbl} dark={dark} label={lbl} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- INPUT ---------------- */
function InputMac({
  dark,
  label,
  value,
  onChange,
  type = "text",
  onFocus,
  onBlur,
  readOnly = false,
  maxLength,
}: InputMacProps) {
  return (
    <div className="flex flex-col">
      <label
        className={`font-semibold mb-1 text-xs ${dark ? "text-gray-200" : "text-gray-800"
          }`}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        maxLength={maxLength}
        className={`
          px-3 py-2 rounded-xl border text-sm transition focus:ring-2 focus:outline-none
          ${dark
            ? "bg-white/10 border-white/20 text-white placeholder-gray-400 focus:ring-blue-500/40"
            : "bg-white/80 border-gray-300 text-gray-800 placeholder-gray-400 focus:ring-blue-300"
          }
        `}
      />
    </div>
  );
}

/* ---------------- SELECT PER DAY/WEEK ---------------- */
function SelectPerDayWeekMac({ value, onChange, dark }: SelectPerDayWeekMacProps) {
  const [open, setOpen] = useState(false);
  const options = ["DAY", "WEEK"];
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="flex flex-col relative" ref={dropdownRef}>
      <label
        className={`font-semibold mb-1 text-xs ${dark ? "text-gray-200" : "text-gray-800"
          }`}
      >
        PER DAY/WEEK
      </label>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`
          w-full px-3 py-2 rounded-xl border text-sm flex justify-between items-center transition
          ${dark
            ? "bg-white/10 border-white/20 text-white focus:ring-blue-500/40"
            : "bg-white/80 border-gray-300 text-gray-800 focus:ring-blue-300"
          }
        `}
      >
        <span>{value || "Select"}</span>
        <ChevronDown
          className={`w-4 h-4 ${dark ? "text-gray-400" : "text-gray-500"}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className={`
              absolute top-12 w-full rounded-xl overflow-hidden border shadow-xl z-10
              ${dark ? "bg-[#1b1b1d] border-white/10" : "bg-white border-gray-200"}
            `}
          >
            {options.map((opt) => (
              <button
                type="button"
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`
                  w-full text-left px-4 py-2 text-sm
                  ${value === opt
                    ? dark
                      ? "bg-blue-500/20 text-blue-300"
                      : "bg-blue-100 text-blue-700"
                    : dark
                      ? "hover:bg-white/10"
                      : "hover:bg-gray-100"
                  }
                `}
              >
                {opt}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- SELECT BANK NAME ---------------- */
function SelectBankNameMac({ value, onChange, dark }: SelectBankNameMacProps) {
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const banks = [
    "Attijariwafa Bank",
    "Banque Populaire",
    "BMCE Bank of Africa",
    "CIH Bank",
    "BMCI",
    "Société Générale Maroc",
    "Crédit Agricole du Maroc",
    "Crédit du Maroc",
    "Al Barid Bank",
    "Bank Assafa",
    "Umnia Bank",
    "Bank Al Yousr",
  ];

  useEffect(() => {
    if (value && !banks.includes(value)) {
      setShowCustom(true);
    }
  }, [value]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="flex flex-col relative" ref={dropdownRef}>
      <label
        className={`font-semibold mb-1 text-xs ${dark ? "text-gray-200" : "text-gray-800"
          }`}
      >
        BANK NAME
      </label>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`
          w-full px-3 py-2 rounded-xl border text-sm flex justify-between items-center transition
          ${dark
            ? "bg-white/10 border-white/20 text-white focus:ring-blue-500/40"
            : "bg-white/80 border-gray-300 text-gray-800 focus:ring-blue-300"
          }
        `}
      >
        <span>{value || "Select Bank"}</span>
        <ChevronDown
          className={`w-4 h-4 ${dark ? "text-gray-400" : "text-gray-500"}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className={`
              absolute top-12 w-full rounded-xl overflow-hidden border shadow-xl z-20 max-h-60 overflow-y-auto
              ${dark ? "bg-[#1b1b1d] border-white/10" : "bg-white border-gray-200"}
            `}
          >
            {banks.map((bank) => (
              <button
                type="button"
                key={bank}
                onClick={() => {
                  onChange(bank);
                  setShowCustom(false);
                  setOpen(false);
                }}
                className={`
                  w-full text-left px-4 py-2 text-sm
                  ${value === bank
                    ? dark
                      ? "bg-blue-500/20 text-blue-300"
                      : "bg-blue-100 text-blue-700"
                    : dark
                      ? "hover:bg-white/10"
                      : "hover:bg-gray-100"
                  }
                `}
              >
                {bank}
              </button>
            ))}

            {/* OTHER OPTION */}
            <button
              type="button"
              onClick={() => {
                setShowCustom(true);
                onChange("");
                setOpen(false);
              }}
              className={`
                w-full text-left px-4 py-2 text-sm border-t
                ${dark
                  ? "border-white/10 hover:bg-white/10"
                  : "border-gray-200 hover:bg-gray-100"
                }
              `}
            >
              Other
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {showCustom && (
        <input
          type="text"
          placeholder="Enter bank name"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`
            mt-2 px-3 py-2 rounded-xl border text-sm
            ${dark
              ? "bg-white/10 border-white/20 text-white placeholder-gray-400"
              : "bg-white border-gray-300 text-gray-800 placeholder-gray-400"
            }
          `}
        />
      )}
    </div>
  );
}

/* ---------------- SIGNATURE LINE ---------------- */
function StaticSignatureMac({ label, dark }: StaticSignatureMacProps) {
  return (
    <div className="flex flex-col">
      <label
        className={`font-semibold mb-1 text-xs ${dark ? "text-gray-200" : "text-gray-800"
          }`}
      >
        {label}
      </label>

      <div className="flex items-center justify-between">
        <div
          className={`flex-1 h-7 rounded-xl border ${dark ? "border-white/20 bg-white/5" : "border-gray-300 bg-gray-100"
            }`}
        ></div>

        <span
          className={`ml-3 text-xs tracking-widest ${dark ? "text-gray-500" : "text-gray-400"
            }`}
        >
          ..................................................
        </span>
      </div>
    </div>
  );
}