import * as XLSXStyle from "xlsx-js-style";
import type { CellObject, WorkSheet } from "xlsx";
import type { InvoiceAssignment, InvoiceClient, PayrollLine } from "./payrollInvoice";

type StyledCell = CellObject & { s?: Record<string, unknown> };
type StyledSheet = WorkSheet & {
  "!margins"?: Record<string, number>;
  "!pageSetup"?: Record<string, unknown>;
  "!sheetViews"?: Array<Record<string, unknown>>;
};

const thinBorder = {
  top: { style: "thin", color: { rgb: "B7C9D6" } },
  bottom: { style: "thin", color: { rgb: "B7C9D6" } },
  left: { style: "thin", color: { rgb: "B7C9D6" } },
  right: { style: "thin", color: { rgb: "B7C9D6" } },
};

const styleRange = (
  sheet: WorkSheet,
  range: string,
  style: Record<string, unknown>,
  numberFormat?: string
) => {
  const decoded = XLSXStyle.utils.decode_range(range);
  for (let row = decoded.s.r; row <= decoded.e.r; row += 1) {
    for (let col = decoded.s.c; col <= decoded.e.c; col += 1) {
      const address = XLSXStyle.utils.encode_cell({ r: row, c: col });
      const cell = (sheet[address] || { t: "s", v: "" }) as StyledCell;
      cell.s = style;
      if (numberFormat) cell.z = numberFormat;
      sheet[address] = cell;
    }
  }
};

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

const fallbackLine = (position: string | null, amount: number | null): PayrollLine => ({
  description: `Prestation de service en tant que ${position || ""}`.trim(),
  from: null,
  to: null,
  quantity: null,
  unit: null,
  rate: null,
  amount,
});

export function createStyledInvoiceWorkbook(issuer: InvoiceClient, assignments: InvoiceAssignment[]) {
  const workbook = XLSXStyle.utils.book_new();
  const usedSheetNames = new Set<string>();
  const invoiceDate = new Date().toLocaleDateString("fr-FR");
  const invoicePrefix = (issuer.invoicePrefix || "INV").replace(/[^a-z0-9-]+/gi, "").toUpperCase() || "INV";

  assignments.forEach(({ payroll, member }, index) => {
    const fullName = `${member.first_name || ""} ${member.last_name || ""}`.trim() || payroll.name;
    const invoiceNumber = `${invoicePrefix}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(index + 1).padStart(3, "0")}`;
    const details = payroll.lines.length ? payroll.lines : [fallbackLine(payroll.position, payroll.payrollTotal)];
    const total = payroll.payrollTotal ?? details.reduce((sum, line) => sum + (line.amount || 0), 0);

    const rows: unknown[][] = [
      ["FACTURE"],
      [],
      ["ÉMETTEUR", null, "INFORMATIONS FACTURE"],
      ["Nom", issuer.name.toUpperCase(), "Date", invoiceDate],
      ["ICE", issuer.ice || "", "N° facture", invoiceNumber],
      ["Adresse", issuer.address || "", "Compte analytique", payroll.accountCode],
      [],
      [],
      ["CLIENT / STARTFORM"],
      ["Nom", fullName.toUpperCase()],
      ["Fonction", payroll.position],
      ["Adresse", member.address || ""],
      ["Ville", [member.zip_code, member.city].filter(Boolean).join(" ")],
      ["PATENTE", member.patent_number || ""],
      ["ICE", member.ice || ""],
      ["IF", member.if_number || ""],
      [],
      ["DÉTAIL DES PRESTATIONS"],
      ["DESCRIPTION", "PÉRIODE", "QTÉ / TAUX", "MONTANT MAD"],
    ];

    const detailsHeaderRow = rows.length;
    details.forEach((line) => {
      rows.push([
        line.description,
        [line.from, line.to].filter(Boolean).join(" au "),
        [
          line.quantity !== null ? `${line.quantity} ${line.unit || ""}`.trim() : "",
          line.rate !== null ? `x ${line.rate.toLocaleString("fr-FR")}` : "",
        ].filter(Boolean).join(" "),
        line.amount ?? "",
      ]);
    });
    const detailsEndRow = rows.length;

    rows.push(
      [],
      [null, null, "TOTAL À PAYER", total],
      [],
      ["DÉTAILS BANCAIRES"],
      ["Intitulé du compte", fullName],
      ["Nom de la banque", member.bank_name || ""],
      ["Mode de paiement", member.payment_method || ""],
      ["N° de compte", member.bank_account_number || ""],
      [],
      ["Merci pour votre collaboration."],
    );

    const totalRow = detailsEndRow + 1;
    const bankHeaderRow = detailsEndRow + 3;
    const lastRow = rows.length;
    const sheet = XLSXStyle.utils.aoa_to_sheet(rows) as StyledSheet;

    sheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } },
      { s: { r: 2, c: 2 }, e: { r: 2, c: 3 } },
      { s: { r: 8, c: 0 }, e: { r: 8, c: 3 } },
      { s: { r: 9, c: 1 }, e: { r: 9, c: 3 } },
      { s: { r: 10, c: 1 }, e: { r: 10, c: 3 } },
      { s: { r: 11, c: 1 }, e: { r: 11, c: 3 } },
      { s: { r: 12, c: 1 }, e: { r: 12, c: 3 } },
      { s: { r: 13, c: 1 }, e: { r: 13, c: 3 } },
      { s: { r: 14, c: 1 }, e: { r: 14, c: 3 } },
      { s: { r: 15, c: 1 }, e: { r: 15, c: 3 } },
      { s: { r: 17, c: 0 }, e: { r: 17, c: 3 } },
      { s: { r: bankHeaderRow, c: 0 }, e: { r: bankHeaderRow, c: 3 } },
      { s: { r: lastRow - 1, c: 0 }, e: { r: lastRow - 1, c: 3 } },
    ];

    const baseStyle = {
      font: { name: "Calibri", sz: 11, color: { rgb: "243746" } },
      alignment: { vertical: "center", wrapText: true },
    };
    styleRange(sheet, `A1:D${lastRow}`, baseStyle);
    styleRange(sheet, "A1:D1", {
      fill: { fgColor: { rgb: "17365D" } },
      font: { name: "Calibri", sz: 22, bold: true, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center", vertical: "center" },
    });

    const sectionStyle = {
      fill: { fgColor: { rgb: "D9EAF7" } },
      font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "17365D" } },
      alignment: { horizontal: "left", vertical: "center" },
      border: thinBorder,
    };
    ["A3:B3", "C3:D3", "A9:D9", "A18:D18", `A${bankHeaderRow + 1}:D${bankHeaderRow + 1}`]
      .forEach((range) => styleRange(sheet, range, sectionStyle));

    const infoStyle = {
      fill: { fgColor: { rgb: "F7FAFC" } },
      border: thinBorder,
      font: { name: "Calibri", sz: 10, color: { rgb: "243746" } },
      alignment: { vertical: "center", wrapText: true },
    };
    styleRange(sheet, "A4:D7", infoStyle);
    styleRange(sheet, "A10:D16", infoStyle);
    styleRange(sheet, `A${bankHeaderRow + 2}:D${bankHeaderRow + 5}`, infoStyle);
    ["A4:A7", "C4:C6", "A10:A16", `A${bankHeaderRow + 2}:A${bankHeaderRow + 5}`]
      .forEach((range) => styleRange(sheet, range, {
        ...infoStyle,
        fill: { fgColor: { rgb: "EEF4F8" } },
        font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "17365D" } },
      }));

    styleRange(sheet, `A${detailsHeaderRow}:D${detailsHeaderRow}`, {
      fill: { fgColor: { rgb: "17365D" } },
      font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: thinBorder,
    });

    for (let row = detailsHeaderRow + 1; row <= detailsEndRow; row += 1) {
      const lineStyle = {
        fill: { fgColor: { rgb: row % 2 === 0 ? "F7FAFC" : "FFFFFF" } },
        font: { name: "Calibri", sz: 10, color: { rgb: "243746" } },
        alignment: { vertical: "center", wrapText: true },
        border: thinBorder,
      };
      styleRange(sheet, `A${row}:D${row}`, lineStyle);
      styleRange(sheet, `D${row}:D${row}`, {
        ...lineStyle,
        alignment: { horizontal: "right", vertical: "center" },
      }, '#,##0.00 "MAD"');
    }

    const totalStyle = {
      fill: { fgColor: { rgb: "E2F0D9" } },
      font: { name: "Calibri", sz: 12, bold: true, color: { rgb: "1F4E28" } },
      alignment: { horizontal: "right", vertical: "center" },
      border: thinBorder,
    };
    styleRange(sheet, `C${totalRow + 1}:D${totalRow + 1}`, totalStyle);
    styleRange(sheet, `D${totalRow + 1}:D${totalRow + 1}`, totalStyle, '#,##0.00 "MAD"');
    styleRange(sheet, `A${lastRow}:D${lastRow}`, {
      font: { name: "Calibri", sz: 10, italic: true, color: { rgb: "64748B" } },
      alignment: { horizontal: "center", vertical: "center" },
    });

    sheet["!cols"] = [{ wch: 31 }, { wch: 27 }, { wch: 24 }, { wch: 20 }];
    sheet["!rows"] = rows.map((_, row) => ({
      hpt: row === 0 ? 34 : [2, 8, 17, bankHeaderRow].includes(row) ? 22 : 19,
    }));
    sheet["!margins"] = { left: 0.35, right: 0.35, top: 0.45, bottom: 0.45, header: 0.2, footer: 0.2 };
    sheet["!pageSetup"] = { orientation: "portrait", paperSize: 9, fitToWidth: 1, fitToHeight: 1 };
    sheet["!sheetViews"] = [{ showGridLines: false }];

    XLSXStyle.utils.book_append_sheet(workbook, sheet, safeSheetName(fullName, usedSheetNames));
  });

  return workbook;
}
