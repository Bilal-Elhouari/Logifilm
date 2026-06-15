import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parsePayrollWorkbook, suggestCrewMember } from "./payrollInvoice";
import { createStyledInvoiceWorkbook } from "./invoiceWorkbook";
import type { CrewMember } from "../services/api";

describe("payroll invoice helpers", () => {
  it("extracts payroll members and their detail lines", () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["ACCOUNT #", null, "DESCRIPTION", "POSITION", "FROM", "TO", "#", "UNIT", "RATE", "AMOUNT IN MAD"],
      ["4006-562", null, "ABDELHAKIM OUISKI", "ELECTRICIAN"],
      [null, null, "SALARY", null, 44753, 44758, 6, "DAYS", 800, 4800, 5800],
      [null, null, "PER DIEMS", null, 44753, 44757, 5, "DAYS", 200, 1000],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Payroll");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;

    const result = parsePayrollWorkbook(buffer);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("ABDELHAKIM OUISKI");
    expect(result[0].lines).toHaveLength(2);
    expect(result[0].payrollTotal).toBe(5800);
  });

  it("matches names independently of first-name order", () => {
    const member = {
      company_id: "company",
      first_name: "OUISKI",
      last_name: "ABDELHAKIM",
    } as CrewMember;

    expect(suggestCrewMember("ABDELHAKIM OUISKI", [member])).toBe(member);
  });

  it("creates a final invoice sheet with payroll and startform details", () => {
    const member = {
      company_id: "company",
      first_name: "OUISKI",
      last_name: "ABDELHAKIM",
      ice: "002297046000006",
      bank_name: "Attijariwafa Banque",
      bank_account_number: "007450000657300019163671",
    } as CrewMember;

    const workbook = createStyledInvoiceWorkbook(
      { name: "ZAK PRODUCTIONS", ice: "001565136000057", invoicePrefix: "ZAK" },
      [{
        member,
        payroll: {
          accountCode: "4006-562",
          name: "ABDELHAKIM OUISKI",
          position: "ELECTRICIAN",
          payrollTotal: 5000,
          lines: [{
            description: "SALARY",
            from: "10/07/2022",
            to: "16/07/2022",
            quantity: 6,
            unit: "DAYS",
            rate: 800,
            amount: 5000,
          }],
        },
      }]
    );

    expect(workbook.SheetNames).toEqual(["OUISKI ABDELHAKIM"]);
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[workbook.SheetNames[0]], {
      header: 1,
      defval: null,
    });
    expect(rows.flat()).toContain("ZAK PRODUCTIONS");
    expect(rows.flat()).toContain("Attijariwafa Banque");
    expect(rows.flat()).toContain(5000);
    expect(rows[3]).toContain("ZAK PRODUCTIONS");
    expect(rows[9]).toContain("OUISKI ABDELHAKIM");
    expect(workbook.Sheets[workbook.SheetNames[0]].A1.s.fill.fgColor.rgb).toBe("17365D");
    expect(workbook.Sheets[workbook.SheetNames[0]].A19.s.fill.fgColor.rgb).toBe("17365D");
    expect(workbook.Sheets[workbook.SheetNames[0]].D22.z).toContain("MAD");
  });
});
