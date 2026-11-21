import { describe, expect, it } from "vitest";
import {
  detectCsvColumnMapping,
  mapCsvRowsToImports,
  parseCsvText,
  parseFlexibleAmount,
  parseFlexibleDate,
} from "./csv-import";

describe("CSV statement import parser", () => {
  it("parses comma and semicolon CSV with BOM and quoted fields", () => {
    const commaCsv =
      '\uFEFFDate,Type,Amount,Category,Note\r\n2026-11-20,EXPENSE,45000,"Food & Dining","Kopi, Roti ""Butter"""\r\n';
    const parsedComma = parseCsvText(commaCsv);
    expect(parsedComma.headers).toEqual([
      "Date",
      "Type",
      "Amount",
      "Category",
      "Note",
    ]);
    expect(parsedComma.rows).toHaveLength(1);
    expect(parsedComma.rows[0][4]).toBe('Kopi, Roti "Butter"');

    const semiCsv =
      "Tanggal;Keterangan;Nominal;Jenis\n20/11/2026;Gaji Bulanan;Rp 12.500.000;CR\n21/11/2026;Listrik PLN;Rp 350.000;DB";
    const parsedSemi = parseCsvText(semiCsv);
    expect(parsedSemi.headers).toEqual([
      "Tanggal",
      "Keterangan",
      "Nominal",
      "Jenis",
    ]);
    expect(parsedSemi.rows).toHaveLength(2);
  });

  it("parses Indonesian and international currency amounts", () => {
    expect(parseFlexibleAmount("Rp 150.000")).toBe(150000);
    expect(parseFlexibleAmount("1.250.500,75")).toBe(1250500.75);
    expect(parseFlexibleAmount("$1,250.50")).toBe(1250.5);
    expect(parseFlexibleAmount("(35.25)")).toBe(-35.25);
    expect(parseFlexibleAmount("-45000")).toBe(-45000);
    expect(parseFlexibleAmount("0")).toBeNull();
    expect(parseFlexibleAmount("abc")).toBeNull();
  });

  it("parses ISO and DD/MM/YYYY dates", () => {
    expect(parseFlexibleDate("2026-11-21")?.toISOString().slice(0, 10)).toBe(
      "2026-11-21",
    );
    expect(parseFlexibleDate("21/11/2026")?.toISOString().slice(0, 10)).toBe(
      "2026-11-21",
    );
    expect(parseFlexibleDate("invalid-date")).toBeNull();
  });

  it("auto-maps Indonesian bank CSV and infers signed statements cleanly", () => {
    const indo = parseCsvText(
      "Tanggal;Keterangan;Nominal;Jenis\n20/11/2026;Gaji;Rp 10.000.000;CR\n21/11/2026;Makan Siang;Rp 45.000;DB",
    );
    const indoMap = detectCsvColumnMapping(indo.headers);
    const indoResult = mapCsvRowsToImports(indo.rows, indoMap);
    expect(indoResult.skipped).toBe(0);
    expect(indoResult.valid).toHaveLength(2);
    expect(indoResult.valid[0]).toMatchObject({
      type: "INCOME",
      amount: 10000000,
      note: "Gaji",
    });
    expect(indoResult.valid[1]).toMatchObject({
      type: "EXPENSE",
      amount: 45000,
      note: "Makan Siang",
    });

    const signed = parseCsvText(
      "Date,Description,Amount\n2026-11-01,Salary,5000\n2026-11-02,Groceries,-85.50\n2026-11-03,Broken,notanumber",
    );
    const signedMap = detectCsvColumnMapping(signed.headers);
    const signedResult = mapCsvRowsToImports(signed.rows, signedMap);
    expect(signedResult.skipped).toBe(1);
    expect(signedResult.valid).toHaveLength(2);
    expect(signedResult.valid[0].type).toBe("INCOME");
    expect(signedResult.valid[1]).toMatchObject({
      type: "EXPENSE",
      amount: 85.5,
    });
  });
});
