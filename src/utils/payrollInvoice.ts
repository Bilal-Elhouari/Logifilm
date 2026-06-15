import * as XLSX from "xlsx-js-style";
import type { CrewMember } from "../services/api";
import { normalizeSearchTerm } from "./search";

export interface PayrollLine {
  description: string;
  from: string | null;
  to: string | null;
  quantity: number | null;
  unit: string | null;
  rate: number | null;
  amount: number | null;
}

export interface PayrollMember {
  accountCode: string;
  name: string;
  position: string;
  lines: PayrollLine[];
  payrollTotal: number | null;
}

export interface InvoiceAssignment {
  payroll: PayrollMember;
  member: CrewMember;
}

export interface InvoiceClient {
  name: string;
  ice?: string;
  address?: string;
  invoicePrefix?: string;
}

const accountCodePattern = /^\d{4}-+\d+/;

const asText = (value: unknown) => String(value ?? "").trim();

const asNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(asText(value).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};

const excelDateToText = (value: unknown) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toLocaleDateString("fr-FR");
  }

  const serial = asNumber(value);
  if (serial && serial > 20000) {
    const parsed = XLSX.SSF.parse_date_code(serial);
    if (parsed) {
      return `${String(parsed.d).padStart(2, "0")}/${String(parsed.m).padStart(2, "0")}/${parsed.y}`;
    }
  }

  return asText(value) || null;
};

const isMemberRow = (row: unknown[]) =>
  accountCodePattern.test(asText(row[0])) && Boolean(asText(row[2])) && Boolean(asText(row[3]));

export function parsePayrollWorkbook(buffer: ArrayBuffer): PayrollMember[] {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("Le fichier Payroll ne contient aucune feuille.");

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
  });

  const members: PayrollMember[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (!isMemberRow(row)) continue;

    const lines: PayrollLine[] = [];
    let cursor = index + 1;

    while (cursor < rows.length && !isMemberRow(rows[cursor])) {
      const detail = rows[cursor];
      const description = asText(detail[2]);
      const hasPayrollData = [detail[4], detail[5], detail[6], detail[7], detail[8], detail[9]]
        .some((value) => value !== null && asText(value) !== "");

      if (description && hasPayrollData) {
        lines.push({
          description,
          from: excelDateToText(detail[4]),
          to: excelDateToText(detail[5]),
          quantity: asNumber(detail[6]),
          unit: asText(detail[7]) || null,
          rate: asNumber(detail[8]),
          amount: asNumber(detail[9]),
        });
      }
      cursor += 1;
    }

    const explicitTotal = asNumber(rows[index + 1]?.[10]);
    const amountTotal = lines.reduce((sum, line) => sum + (line.amount || 0), 0);

    members.push({
      accountCode: asText(row[0]),
      name: asText(row[2]),
      position: asText(row[3]),
      lines,
      payrollTotal: explicitTotal ?? (amountTotal > 0 ? amountTotal : null),
    });
  }

  return members;
}

const matchKey = (value: string) =>
  normalizeSearchTerm(value)
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");

export function suggestCrewMember(payrollName: string, members: CrewMember[]) {
  const target = matchKey(payrollName);
  if (!target) return null;

  const exact = members.find((member) =>
    matchKey(`${member.first_name || ""} ${member.last_name || ""}`) === target
  );
  if (exact) return exact;

  const targetTokens = new Set(target.split(" "));
  let bestMember: CrewMember | null = null;
  let bestScore = 0;

  for (const member of members) {
    const candidate = matchKey(`${member.first_name || ""} ${member.last_name || ""}`);
    const candidateTokens = candidate.split(" ").filter(Boolean);
    const common = candidateTokens.filter((token) => targetTokens.has(token)).length;
    const score = common / Math.max(targetTokens.size, candidateTokens.length, 1);
    if (score > bestScore) {
      bestMember = member;
      bestScore = score;
    }
  }

  return bestScore >= 0.75 ? bestMember : null;
}

const legalValue = (label: string, value: string | null | undefined) =>
  value ? `${label}: ${value}` : label;

const safeSheetName = (name: string, used: Set<string>) => {
  const base = name.replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 28) || "Invoice";
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${base.slice(0, 25)} ${suffix}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
};

export function createInvoiceWorkbook(client: InvoiceClient, assignments: InvoiceAssignment[]) {
  const workbook = XLSX.utils.book_new();
  const usedSheetNames = new Set<string>();
  const invoiceDate = new Date().toLocaleDateString("fr-FR");
  const invoicePrefix = (client.invoicePrefix || "INV").replace(/[^a-z0-9-]+/gi, "").toUpperCase() || "INV";

  assignments.forEach(({ payroll, member }, index) => {
    const fullName = `${member.first_name || ""} ${member.last_name || ""}`.trim() || payroll.name;
    const invoiceNumber = `${invoicePrefix}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(index + 1).padStart(3, "0")}`;
    const detailStart = 23;
    const details = payroll.lines.length > 0 ? payroll.lines : [{
      description: `Prestation de service en tant que ${payroll.position}`,
      from: null,
      to: null,
      quantity: null,
      unit: null,
      rate: null,
      amount: payroll.payrollTotal,
    }];
    const total = payroll.payrollTotal ?? details.reduce((sum, line) => sum + (line.amount || 0), 0);

    const rows: unknown[][] = [
      [],
      [fullName.toUpperCase()],
      [member.address || ""],
      [[member.zip_code, member.city].filter(Boolean).join(" ")],
      [legalValue("PATENTE", member.patent_number)],
      [legalValue("ICE", member.ice)],
      [legalValue("IF", member.if_number)],
      [null, null, "DATE :", invoiceDate],
      [null, null, "N° FACTURE :", invoiceNumber],
      [],
      [],
      [],
      [],
      ["Client", client.name],
      ["ICE", client.ice || ""],
      ["Adresse", client.address || ""],
      [],
      [],
      [],
      [],
      [],
      ["DESCRIPTION", "PERIODE", "QTE / TAUX", "MONTANT MAD"],
    ];

    details.forEach((line) => {
      const period = [line.from, line.to].filter(Boolean).join(" au ");
      const quantityRate = [
        line.quantity !== null ? `${line.quantity} ${line.unit || ""}`.trim() : "",
        line.rate !== null ? `x ${line.rate}` : "",
      ].filter(Boolean).join(" ");
      rows.push([line.description, period, quantityRate, line.amount ?? ""]);
    });

    rows.push(
      [],
      [null, null, "Total à payer", total],
      [],
      ["Détails bancaires"],
      ["Intitulé", fullName],
      ["Nom de la Banque", member.bank_name || ""],
      ["Mode de paiement", member.payment_method || ""],
      ["N° de compte", member.bank_account_number || ""],
      ["Compte analytique", payroll.accountCode],
    );

    const sheet = XLSX.utils.aoa_to_sheet(rows);
    const totalRow = detailStart + details.length + 1;
    sheet["!merges"] = [
      { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } },
      { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } },
      { s: { r: 6, c: 0 }, e: { r: 6, c: 1 } },
      { s: { r: totalRow + 2, c: 0 }, e: { r: totalRow + 2, c: 1 } },
    ];
    sheet["!cols"] = [{ wch: 42 }, { wch: 26 }, { wch: 22 }, { wch: 18 }];
    sheet["!rows"] = [{ hpt: 10 }, { hpt: 25 }];

    const sheetName = safeSheetName(fullName, usedSheetNames);
    XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  });

  return workbook;
}
