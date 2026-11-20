import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import jsPDF from "jspdf";
import { api } from "../services/api";
import StarterFormView, { type AllowanceKind } from "../components/starter/StarterFormView";

export default function NewStarterFormWindows() {
  const { name } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get("job");
  const editId = searchParams.get("edit"); // ✅ Edit mode ID

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
            holidayWorked: data.holiday_worked || "", // Text type now
            travelDay: data.travel_day || "", // Text
            dailyRate: data.daily_rate ? formatCurrency(data.daily_rate) : "",
            allowance: data.living_allowance || "", // Text
            perDiem: data.per_diem || "", // Text
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
          setAllowanceKind(data.per_diem ? "perDiem" : "living");
          if (data.project_title) setProjectTitle(data.project_title);
        }
      } catch (e) {
        console.error("Error loading crew member:", e);
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
    ifNumber: "",
  });

  const [projectTitle, setProjectTitle] = useState("");
  const [allowanceKind, setAllowanceKind] = useState<AllowanceKind>("living");

  useEffect(() => {
    if (!jobId) return;

    api.getJobById(jobId)
      .then((project) => {
        if (project?.name) setProjectTitle(project.name);
      })
      .catch((error) => {
        console.error("Error loading project:", error);
      });
  }, [jobId]);

  /* ---------------- HELPERS ---------------- */
  const clean = (v: any) => (v === "" ? null : v);
  const cleanNumber = (v: any) => {
    if (!v) return null;
    const cleaned = String(v)
      .replace(/MAD/gi, "")
      .replace(/\s/g, "")
      .replace(",", ".")
      .replace(/[^\d.-]/g, "");
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
    const cleanVal = val.replace(/[^\d.,]/g, "").replace(",", ".");
    setFormData((prev) => ({ ...prev, rate: cleanVal }));
  };

  const handleRateFocus = () => {
    const numeric = cleanNumber(formData.rate);
    setFormData((prev) => ({
      ...prev,
      rate: numeric !== null ? numeric.toString() : "",
    }));
  };

  const handleRateBlur = () => {
    const numeric = cleanNumber(formData.rate);
    if (numeric !== null) {
      const dailyNumeric = numeric / 6;
      const seventhNumeric = dailyNumeric * 2;

      setFormData((prev) => ({
        ...prev,
        rate: formatCurrency(numeric),
        dailyRate: formatCurrency(dailyNumeric),
        dayWorked: formatCurrency(seventhNumeric), // 7th DAY WORKED auto
        holidayWorked: formatCurrency(dailyNumeric),
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

  /* ---------------- IF VALIDATION (digits only, max 15) ---------------- */
  const handleIfInput = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (digits.length <= 15) {
      setFormData((prev) => ({ ...prev, ifNumber: digits }));
    }
  };



  /* ---------------- SAVE ---------------- */
  const handleSave = async () => {
    if (!companyId) {
      alert("❌ Error: company not found. Please try again.");
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

        living_allowance: allowanceKind === "living" ? clean(formData.allowance) : null,
        per_diem: allowanceKind === "perDiem" ? clean(formData.perDiem) : null,
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

      if (editId) {
        // ✅ MODE ÉDITION : UPDATE
        await api.updateCrewMember(editId, payload);
        alert("✅ Changes saved.");
      } else {
        // ✅ MODE CRÉATION : INSERT
        await api.createStarterForm(payload);
        alert("✅ Starter form saved.");
      }

      navigate(-1); // Retour à la liste
    } catch (e: any) {
      console.error("Error while saving:", e);
      alert(`❌ Error while saving: ${e.message || "Unknown error. Check the console."}`);
    } finally {
      setSaving(false);
    }
  };
  /* ---------------- PDF (⚠ NE PAS TOUCHER LE RENDU) ---------------- */
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
    pdf.text((name?.toUpperCase() || "COMPANY NAME"), 105, y, { align: "center" }); // Fix title

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
    // CLEAN FIELDS
    // -----------------------------

    const allowanceLabel = allowanceKind === "perDiem" ? "PER DIEM :" : "LIVING ALLOWANCE :";
    const allowanceValue = allowanceKind === "perDiem" ? formData.perDiem : formData.allowance;

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
      [allowanceLabel, allowanceValue],
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

    pdf.save(`Starter_${name || "Company"}_${projectTitle || ""}.pdf`);
  };



  /* ---------------- RENDER ---------------- */
  return (
    <StarterFormView
      os="win"
      vm={{
        companyName: name || "",
        jobId,
        editId,
        projectTitle,
        setProjectTitle,
        formData,
        onChange: handleChange,
        onRateInput: handleRateInput,
        onRateFocus: handleRateFocus,
        onRateBlur: handleRateBlur,
        onBankAccountInput: handleBankAccountInput,
        onIfInput: handleIfInput,
        allowanceKind,
        onAllowanceKindChange: (kind) => {
          const currentValue = allowanceKind === "perDiem" ? formData.perDiem : formData.allowance;
          setAllowanceKind(kind);
          setFormData((prev) => ({
            ...prev,
            allowance: kind === "living" ? currentValue : "",
            perDiem: kind === "perDiem" ? currentValue : "",
          }));
        },
        saving,
        onSave: handleSave,
        onPdf: handleGeneratePDF,
        onBack: () => navigate(-1),
      }}
    />
  );
}
