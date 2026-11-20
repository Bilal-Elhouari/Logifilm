import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Banknote, BriefcaseBusiness, Download, IdCard, MapPin, PenLine, Plane, Save } from "lucide-react";
import { GlassFrame, Hero, Panel, Tile, type GlassColor, type GlassOS } from "../glass/Glass";
import CompanySidebar from "../glass/CompanySidebar";

export type AllowanceKind = "living" | "perDiem";

/** Champs du formulaire (mêmes clés que dans les pages Mac et Windows). */
export type StarterFormData = {
  firstName: string;
  lastName: string;
  birth: string;
  idCard: string;
  patent: string;
  address: string;
  phone: string;
  mobile: string;
  position: string;
  department: string;
  startDate: string;
  endDate: string;
  rate: string;
  perWeek: string;
  dayWorked: string;
  holidayWorked: string;
  travelDay: string;
  dailyRate: string;
  allowance: string;
  perDiem: string;
  accommodation: string;
  payment: string;
  bankAccount: string;
  bankName: string;
  acctCode: string;
  travelDate: string;
  note: string;
  ice: string;
  ifNumber: string;
};

export type StarterFormViewModel = {
  companyName: string;
  jobId: string | null;
  editId: string | null;
  projectTitle: string;
  setProjectTitle: (value: string) => void;
  formData: StarterFormData;
  onChange: (key: keyof StarterFormData, value: string) => void;
  onRateInput: (value: string) => void;
  onRateFocus: () => void;
  onRateBlur: () => void;
  onBankAccountInput: (value: string) => void;
  onIfInput: (value: string) => void;
  allowanceKind: AllowanceKind;
  onAllowanceKindChange: (kind: AllowanceKind) => void;
  saving: boolean;
  onSave: () => void;
  onPdf: () => void;
  onBack: () => void;
};

const BANKS = [
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

export default function StarterFormView({ os, vm }: { os: GlassOS; vm: StarterFormViewModel }) {
  const isWin = os === "win";
  const f = vm.formData;
  const text = (key: keyof StarterFormData, label: string, extra: Partial<FieldProps> = {}) => (
    <Field label={label} value={f[key]} onChange={(value) => vm.onChange(key, value)} {...extra} />
  );
  const fullName = [f.firstName, f.lastName].filter(Boolean).join(" ");

  return (
    <GlassFrame
      os={os}
      sidebar={<CompanySidebar os={os} companyName={vm.companyName} jobId={vm.jobId} jobName={vm.projectTitle || null} active="crew" />}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: "flex", flexDirection: "column", gap: 18 }}
      >
        <Hero
          crumbs={`${vm.companyName} › Crew`}
          title={vm.editId ? `Edit ${fullName || "crew member"}` : "New starter"}
          subtitle="Moroccan crew start form. The PDF keeps its usual layout."
          actions={
            <>
              <button type="button" className="lf-btn lf-btn-glass" onClick={vm.onBack}>
                <ArrowLeft /> Back
              </button>
              <button type="button" className="lf-btn lf-btn-glass" onClick={vm.onPdf}>
                <Download /> Generate PDF
              </button>
              <button type="button" className={`lf-btn ${isWin ? "lf-btn-white" : "lf-btn-primary"}`} onClick={vm.onSave} disabled={vm.saving}>
                <Save /> {vm.saving ? "Saving…" : vm.editId ? "Update" : "Save"}
              </button>
            </>
          }
        />

        <form className="lf-starter" onSubmit={(event) => event.preventDefault()}>
          <Section color="slate" icon={<BriefcaseBusiness />} title="Project">
            <Field
              label="Project title"
              value={vm.projectTitle}
              onChange={vm.setProjectTitle}
              readOnly={Boolean(vm.jobId)}
              hint={vm.jobId ? "Selected project" : undefined}
            />
          </Section>

          <Section color="violet" icon={<IdCard />} title="Identity">
            {text("firstName", "First name")}
            {text("lastName", "Last name")}
            {text("birth", "Date of birth", { type: "date" })}
            {text("idCard", "ID card no.")}
            {text("patent", "Patent")}
            {text("ice", "ICE")}
            <Field label="IF" value={f.ifNumber} onChange={vm.onIfInput} maxLength={15} inputMode="numeric" hint="Digits only, 15 max." />
          </Section>

          <Section color="blue" icon={<MapPin />} title="Contact details">
            {text("address", "Address", { wide: true })}
            {text("phone", "Telephone", { type: "tel" })}
            {text("mobile", "Mobile", { type: "tel" })}
          </Section>

          <Section color="teal" icon={<BriefcaseBusiness />} title="Position">
            {text("position", "Position")}
            {text("department", "Department")}
            {text("startDate", "Start date", { type: "date" })}
            {text("endDate", "End date", { type: "date" })}
          </Section>

          <Section color="green" icon={<Banknote />} title="Rates">
            <Field
              label="Rate (per week)"
              value={f.rate}
              onChange={vm.onRateInput}
              onFocus={vm.onRateFocus}
              onBlur={vm.onRateBlur}
              inputMode="decimal"
              hint="Calculates the daily rate, 7th day and holiday rates."
            />
            <SelectField label="Per day / week" value={f.perWeek} onChange={(value) => vm.onChange("perWeek", value)} options={[["", "Select"], ["DAY", "Day"], ["WEEK", "Week"]]} />
            <Field label="Daily rate" value={f.dailyRate} readOnly hint="Calculated automatically" />
            <Field label="7th day worked" value={f.dayWorked} readOnly hint="Calculated automatically" />
            {text("holidayWorked", "Holiday worked")}
            {text("travelDay", "Travel day")}
            <div className="lf-label">
              <span>Allowance / per diem</span>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 0.9fr) minmax(0, 1.1fr)", gap: 8 }}>
                <select
                  className="lf-select"
                  value={vm.allowanceKind}
                  onChange={(event) => vm.onAllowanceKindChange(event.target.value as AllowanceKind)}
                  aria-label="Allowance type"
                >
                  <option value="living">Living allowance</option>
                  <option value="perDiem">Per diem</option>
                </select>
                <input
                  className="lf-input"
                  value={vm.allowanceKind === "perDiem" ? f.perDiem : f.allowance}
                  onChange={(event) => vm.onChange(vm.allowanceKind === "perDiem" ? "perDiem" : "allowance", event.target.value)}
                  placeholder={vm.allowanceKind === "perDiem" ? "Enter per diem" : "Enter living allowance"}
                  aria-label="Amount"
                />
              </div>
            </div>
            {text("accommodation", "Accommodation")}
          </Section>

          <Section color="amber" icon={<Banknote />} title="Payment">
            <SelectField label="Payment method" value={f.payment} onChange={(value) => vm.onChange("payment", value)} options={[["", "Select payment method"], ["Cash", "Cash"], ["Wire", "Wire"]]} />
            <BankField value={f.bankName} onChange={(value) => vm.onChange("bankName", value)} />
            <Field label="Bank account #" value={f.bankAccount} onChange={vm.onBankAccountInput} maxLength={24} inputMode="numeric" hint="Digits only, 24 max." />
            {text("acctCode", "Acct code")}
          </Section>

          <Section color="pink" icon={<Plane />} title="Travel and notes">
            {text("travelDate", "Travel date", { type: "date" })}
            <label className="lf-label lf-wide">
              <span>Note</span>
              <textarea className="lf-input" rows={3} value={f.note} onChange={(event) => vm.onChange("note", event.target.value)} />
            </label>
          </Section>

          <Section color="slate" icon={<PenLine />} title="Signatures (on the printed PDF)">
            <div className="lf-label lf-wide">
              <span>Employee signature</span>
              <div className="lf-signature" />
            </div>
            {["Approval", "Line producer", "Production manager", "Accounts", "HOD"].map((label) => (
              <div key={label} className="lf-label">
                <span>{label}</span>
                <div className="lf-signature lf-signature-line" />
              </div>
            ))}
          </Section>
        </form>
      </motion.div>
    </GlassFrame>
  );
}

/* ---------------- Éléments du formulaire ---------------- */
function Section({ color, icon, title, children }: { color: GlassColor; icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <Panel
      title={
        <span className="lf-who">
          <Tile color={color}>{icon}</Tile>
          {title}
        </span>
      }
    >
      <div className="lf-form-grid">{children}</div>
    </Panel>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  type?: "text" | "date" | "tel";
  readOnly?: boolean;
  maxLength?: number;
  inputMode?: "numeric" | "decimal";
  hint?: string;
  wide?: boolean;
};

function Field({ label, value, onChange, onFocus, onBlur, type = "text", readOnly, maxLength, inputMode, hint, wide }: FieldProps) {
  return (
    <label className={`lf-label${wide ? " lf-wide" : ""}`}>
      <span>{label}</span>
      <input
        className={`lf-input${readOnly ? " is-readonly" : ""}`}
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        onFocus={onFocus}
        onBlur={onBlur}
        maxLength={maxLength}
        inputMode={inputMode}
      />
      {hint && <small className="lf-hint">{hint}</small>}
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return (
    <label className="lf-label">
      <span>{label}</span>
      <select className="lf-select" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

const OTHER_BANK = "__other";

/** Liste des banques marocaines, avec « Autre » pour saisir un nom libre. */
function BankField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [custom, setCustom] = useState(Boolean(value) && !BANKS.includes(value));

  useEffect(() => {
    if (value && !BANKS.includes(value)) setCustom(true);
  }, [value]);

  return (
    <label className="lf-label">
      <span>Bank name</span>
      <select
        className="lf-select"
        value={custom ? OTHER_BANK : value}
        onChange={(event) => {
          const next = event.target.value;
          if (next === OTHER_BANK) {
            setCustom(true);
            onChange("");
          } else {
            setCustom(false);
            onChange(next);
          }
        }}
      >
        <option value="">Select bank</option>
        {BANKS.map((bank) => (
          <option key={bank} value={bank}>{bank}</option>
        ))}
        <option value={OTHER_BANK}>Other…</option>
      </select>
      {custom && (
        <input className="lf-input" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Enter bank name" aria-label="Bank name" />
      )}
    </label>
  );
}
