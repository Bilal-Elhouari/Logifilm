import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Download, FileSpreadsheet, Upload, Users } from "lucide-react";
import * as XLSXStyle from "xlsx-js-style";
import { saveAs } from "file-saver";
import { api, type CrewMember } from "../services/api";
import {
  parsePayrollWorkbook,
  suggestCrewMember,
  type PayrollMember,
} from "../utils/payrollInvoice";
import { createStyledInvoiceWorkbook } from "../utils/invoiceWorkbook";

export default function PayrollInvoices() {
  const { name } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get("job");
  const platform = window.location.pathname.startsWith("/mac") ? "mac" : "windows";
  const [dark, setDark] = useState(window.matchMedia("(prefers-color-scheme: dark)").matches);
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [payrollMembers, setPayrollMembers] = useState<PayrollMember[]>([]);
  const [matches, setMatches] = useState<Record<number, string>>({});
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [clientIce, setClientIce] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [invoicePrefix, setInvoicePrefix] = useState("INV");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [projectName, setProjectName] = useState<string | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (event: MediaQueryListEvent) => setDark(event.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    if (!name) return;
    setLoading(true);
    api.getCompanyByName(name)
      .then((company) => api.getCrewMembers(company.id, jobId || undefined))
      .then((members) => setCrewMembers((members || []) as CrewMember[]))
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Impossible de charger les startforms."))
      .finally(() => setLoading(false));
  }, [jobId, name]);

  useEffect(() => {
    if (!jobId) {
      setProjectName(null);
      return;
    }

    api.getJobById(jobId)
      .then((project) => setProjectName(project?.name || null))
      .catch(() => setProjectName(null));
  }, [jobId]);

  const memberById = useMemo(
    () => new Map(crewMembers.filter((member) => member.id).map((member) => [member.id as string, member])),
    [crewMembers]
  );

  const matchedCount = Object.values(matches).filter(Boolean).length;

  const importPayroll = async (file: File) => {
    setError("");
    try {
      const parsed = parsePayrollWorkbook(await file.arrayBuffer());
      const nextMatches: Record<number, string> = {};
      const nextSelected = new Set<number>();

      parsed.forEach((payroll, index) => {
        const suggestion = suggestCrewMember(payroll.name, crewMembers);
        if (suggestion?.id) {
          nextMatches[index] = suggestion.id;
          nextSelected.add(index);
        }
      });

      setPayrollMembers(parsed);
      setMatches(nextMatches);
      setSelected(nextSelected);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Lecture du Payroll impossible.");
    }
  };

  const generateInvoices = () => {
    const assignments = [...selected]
      .sort((a, b) => a - b)
      .map((index) => {
        const member = memberById.get(matches[index]);
        return member ? { payroll: payrollMembers[index], member } : null;
      })
      .filter((assignment): assignment is NonNullable<typeof assignment> => Boolean(assignment));

    if (assignments.length === 0) {
      setError("Sélectionnez au moins une ligne avec un startform associé.");
      return;
    }

    const workbook = createStyledInvoiceWorkbook({
      name: name || "Company",
      ice: clientIce,
      address: clientAddress,
      invoicePrefix,
    }, assignments);
    const output = XLSXStyle.write(workbook, { bookType: "xlsx", type: "array" });
    const safeCompany = (name || "Company").replace(/[^a-z0-9]+/gi, "_");
    const safeProject = projectName ? `_${projectName.replace(/[^a-z0-9]+/gi, "_")}` : "";
    saveAs(
      new Blob([output], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      `Invoices_${safeCompany}${safeProject}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const toggleSelected = (index: number) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else if (matches[index]) next.add(index);
      return next;
    });
  };

  const surface = dark ? "bg-white/10 border-white/20" : "bg-white border-black/10";
  const muted = dark ? "text-white/60" : "text-black/60";

  return (
    <main className={`min-h-screen p-8 ${dark ? "bg-[#050814] text-white" : "bg-[#e5ecff] text-black"}`}>
      <div className="mx-auto max-w-7xl">
        <button
          onClick={() => navigate(
            jobId
              ? `/${platform}/company/${encodeURIComponent(name || "")}/project/${jobId}`
              : `/${platform}/company/${encodeURIComponent(name || "")}`
          )}
          className={`mb-6 flex items-center gap-2 rounded-xl border px-4 py-2 ${surface}`}
        >
          <ArrowLeft size={17} /> Retour au dashboard
        </button>

        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Payroll vers Invoices</h1>
            {jobId && (
              <p className={`mt-2 font-medium ${muted}`}>
                Project: {projectName || "Project"}
              </p>
            )}
            <p className={`mt-2 ${muted}`}>
              Importez le Payroll, vérifiez les startforms associés, puis générez les factures finales.
            </p>
          </div>
          <button
            onClick={generateInvoices}
            disabled={selected.size === 0}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={18} /> Générer {selected.size} invoice(s)
          </button>
        </div>

        <section className={`mb-6 rounded-3xl border p-6 shadow-xl ${surface}`}>
          <label className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-blue-400/60 p-8 text-center hover:bg-blue-500/10">
            <Upload size={25} />
            <span>
              <strong>Choisir un fichier Payroll Excel</strong>
              <span className={`mt-1 block text-sm ${muted}`}>Formats .xlsx et .xls</span>
            </span>
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importPayroll(file);
              }}
            />
          </label>
        </section>

        <section className={`mb-6 rounded-3xl border p-6 shadow-xl ${surface}`}>
          <h2 className="mb-1 text-lg font-semibold">Informations de l’émetteur</h2>
          <p className={`mb-4 text-sm ${muted}`}>
            Ces informations concernent la compagnie qui émet la facture. Les informations du client proviennent automatiquement de son startform.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <Field
              label="ICE de l’émetteur"
              value={clientIce}
              onChange={setClientIce}
              placeholder="Ex: 001565136000057"
              dark={dark}
            />
            <Field
              label="Adresse de l’émetteur"
              value={clientAddress}
              onChange={setClientAddress}
              placeholder="Adresse complète"
              dark={dark}
            />
            <Field
              label="Préfixe facture"
              value={invoicePrefix}
              onChange={setInvoicePrefix}
              placeholder="INV"
              dark={dark}
            />
          </div>
        </section>

        {error && <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-500">{error}</div>}

        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <Stat icon={<FileSpreadsheet />} label="Payroll members" value={payrollMembers.length} surface={surface} muted={muted} />
          <Stat icon={<Users />} label="Startforms disponibles" value={crewMembers.length} surface={surface} muted={muted} />
          <Stat icon={<CheckCircle2 />} label="Rapprochements trouvés" value={matchedCount} surface={surface} muted={muted} />
        </div>

        {loading ? (
          <p className={muted}>Chargement des startforms...</p>
        ) : payrollMembers.length > 0 ? (
          <section className={`overflow-hidden rounded-3xl border shadow-xl ${surface}`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-sm">
                <thead className={dark ? "bg-white/10" : "bg-black/5"}>
                  <tr>
                    <th className="p-4 text-left">Inclure</th>
                    <th className="p-4 text-left">Compte</th>
                    <th className="p-4 text-left">Membre Payroll</th>
                    <th className="p-4 text-left">Poste</th>
                    <th className="p-4 text-left">Période / lignes</th>
                    <th className="p-4 text-left">Total Payroll</th>
                    <th className="p-4 text-left">Startform associé</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollMembers.map((payroll, index) => (
                    <tr key={`${payroll.accountCode}-${payroll.name}-${index}`} className="border-t border-current/10">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selected.has(index)}
                          disabled={!matches[index]}
                          onChange={() => toggleSelected(index)}
                        />
                      </td>
                      <td className="p-4 font-mono text-xs">{payroll.accountCode}</td>
                      <td className="p-4 font-medium">{payroll.name}</td>
                      <td className="p-4">{payroll.position}</td>
                      <td className="p-4">{payroll.lines.length} ligne(s)</td>
                      <td className="p-4">{payroll.payrollTotal?.toLocaleString("fr-FR") || "À compléter"}</td>
                      <td className="p-4">
                        <select
                          value={matches[index] || ""}
                          onChange={(event) => {
                            const value = event.target.value;
                            setMatches((current) => ({ ...current, [index]: value }));
                            setSelected((current) => {
                              const next = new Set(current);
                              if (value) next.add(index);
                              else next.delete(index);
                              return next;
                            });
                          }}
                          className={`w-full rounded-lg border px-3 py-2 ${dark ? "bg-[#111827] border-white/20" : "bg-white border-black/20"}`}
                        >
                          <option value="">Aucun startform</option>
                          {crewMembers.map((member) => (
                            <option key={member.id} value={member.id}>
                              {[member.first_name, member.last_name].filter(Boolean).join(" ")} — {member.position || "Sans poste"}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  dark,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  dark: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase opacity-60">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500 ${
          dark ? "border-white/20 bg-white/5" : "border-black/15 bg-white"
        }`}
      />
    </label>
  );
}

function Stat({
  icon,
  label,
  value,
  surface,
  muted,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  surface: string;
  muted: string;
}) {
  return (
    <div className={`rounded-2xl border p-5 ${surface}`}>
      <div className="mb-3 text-blue-500">{icon}</div>
      <div className="text-2xl font-semibold">{value}</div>
      <div className={`text-sm ${muted}`}>{label}</div>
    </div>
  );
}
