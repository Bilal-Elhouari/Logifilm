import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Download, FileSpreadsheet, Upload, Users } from "lucide-react";
import * as XLSXStyle from "xlsx-js-style";
import { saveAs } from "file-saver";
import { api, type CrewMember } from "../services/api";
import {
  parsePayrollWorkbook,
  suggestCrewMember,
  type PayrollMember,
} from "../utils/payrollInvoice";
import { GlassFrame, Hero, Panel, StatCard, StatGrid, Tile } from "../components/glass/Glass";
import CompanySidebar from "../components/glass/CompanySidebar";
import { createStyledInvoiceWorkbook } from "../utils/invoiceWorkbook";

export default function PayrollInvoices() {
  const { name } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get("job");
  // L'app utilise HashRouter : le chemin est dans useLocation(), pas dans window.location.pathname.
  const { pathname } = useLocation();
  const platform = pathname.startsWith("/mac") ? "mac" : "windows";
  const os = platform === "mac" ? "mac" : "win";
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
    if (!name) return;
    setLoading(true);
    api.getCompanyByName(name)
      .then((company) => api.getCrewMembers(company.id, jobId || undefined))
      .then((members) => setCrewMembers((members || []) as CrewMember[]))
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load starter forms."))
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
      setError(cause instanceof Error ? cause.message : "Unable to read the payroll file.");
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
      setError("Select at least one row with a matched starter form.");
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

  return (
    <GlassFrame
      os={os}
      sidebar={<CompanySidebar os={os} companyName={name || ""} jobId={jobId} jobName={projectName} active="payroll" />}
    >
      <Hero
        crumbs={`${name || ""} › ${jobId ? projectName || "Project" : "All projects"}`}
        title="Payroll to invoices"
        subtitle="Import the payroll file, check the matched starter forms, then generate the invoices."
        actions={
          <>
            <button
              type="button"
              className="lf-btn lf-btn-glass"
              onClick={() =>
                navigate(
                  jobId
                    ? `/${platform}/company/${encodeURIComponent(name || "")}/project/${jobId}`
                    : `/${platform}/company/${encodeURIComponent(name || "")}`
                )
              }
            >
              <ArrowLeft /> Back
            </button>
            <button
              type="button"
              className={`lf-btn ${os === "win" ? "lf-btn-white" : "lf-btn-primary"}`}
              onClick={generateInvoices}
              disabled={selected.size === 0}
            >
              <Download /> Generate {selected.size} invoice{selected.size === 1 ? "" : "s"}
            </button>
          </>
        }
      />

      <StatGrid>
        <StatCard icon={<FileSpreadsheet />} color="violet" value={payrollMembers.length} label="Payroll members" />
        <StatCard icon={<Users />} color="blue" value={crewMembers.length} label="Starter forms available" />
        <StatCard icon={<CheckCircle2 />} color="green" value={matchedCount} label="Matches found" />
        <StatCard icon={<Download />} color="amber" value={selected.size} label="Invoices to generate" />
      </StatGrid>

      <label className="lf-dropzone">
        <Tile color="green"><Upload /></Tile>
        <span>
          <strong>Choose a payroll Excel file</strong>
          <small>.xlsx and .xls formats</small>
        </span>
        <input
          type="file"
          accept=".xlsx,.xls"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importPayroll(file);
          }}
        />
      </label>

      <Panel title="Issuer details">
        <p className="lf-muted" style={{ margin: "0 0 12px" }}>
          The company issuing the invoice. Crew member details come automatically from their starter form.
        </p>
        <div className="lf-form-grid">
          <Field label="Issuer ICE" value={clientIce} onChange={setClientIce} placeholder="15 digits" />
          <Field label="Issuer address" value={clientAddress} onChange={setClientAddress} placeholder="Full address" />
          <Field label="Invoice prefix" value={invoicePrefix} onChange={setInvoicePrefix} placeholder="INV" />
        </div>
      </Panel>

      {error && <div className="lf-alert" role="alert">{error}</div>}

      {loading ? (
        <p className="lf-muted">Loading starter forms…</p>
      ) : payrollMembers.length > 0 ? (
        <Panel title="Payroll ↔ starter form matching" bodyClassName="">
          <div className="lf-table-wrap">
            <table className="lf-table" style={{ minWidth: 980 }}>
              <thead>
                <tr>
                  <th>Include</th>
                  <th>Account</th>
                  <th>Payroll member</th>
                  <th>Position</th>
                  <th>Lines</th>
                  <th className="lf-num">Total</th>
                  <th>Matched starter form</th>
                </tr>
              </thead>
              <tbody>
                {payrollMembers.map((payroll, index) => (
                  <tr key={`${payroll.accountCode}-${payroll.name}-${index}`}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(index)}
                        disabled={!matches[index]}
                        onChange={() => toggleSelected(index)}
                        aria-label={`Include ${payroll.name}`}
                      />
                    </td>
                    <td style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }}>{payroll.accountCode}</td>
                    <td className="lf-strong">{payroll.name}</td>
                    <td>{payroll.position}</td>
                    <td>{payroll.lines.length} line{payroll.lines.length === 1 ? "" : "s"}</td>
                    <td className="lf-num">
                      {payroll.payrollTotal != null ? (
                        `${payroll.payrollTotal.toLocaleString("en-US")} MAD`
                      ) : (
                        <span className="lf-chip lf-c-amber">To complete</span>
                      )}
                    </td>
                    <td style={{ minWidth: 260 }}>
                      <select
                        className="lf-select"
                        value={matches[index] || ""}
                        aria-label={`Starter form matched to ${payroll.name}`}
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
                      >
                        <option value="">No starter form</option>
                        {crewMembers.map((member) => (
                          <option key={member.id} value={member.id}>
                            {[member.first_name, member.last_name].filter(Boolean).join(" ")} — {member.position || "No position"}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}
    </GlassFrame>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="lf-label">
      <span>{label}</span>
      <input className="lf-input" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}
