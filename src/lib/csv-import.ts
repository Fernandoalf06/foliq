export interface CsvColumnMapping {
  dateCol: number;
  amountCol: number;
  typeCol: number; // -1 if inferred from amount sign
  noteCol: number; // -1 if none
  categoryCol: number; // -1 if none
}

export interface ParsedImportRow {
  type: "EXPENSE" | "INCOME";
  amount: number;
  occurredAt: string;
  note: string;
  categoryName: string;
}

/**
 * Strip UTF-8 BOM and detect whether comma or semicolon is the primary delimiter.
 */
function detectDelimiter(headerLine: string): "," | ";" {
  let commas = 0;
  let semicolons = 0;
  let inQuotes = false;
  for (let i = 0; i < headerLine.length; i += 1) {
    const ch = headerLine[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes) {
      if (ch === ",") commas += 1;
      if (ch === ";") semicolons += 1;
    }
  }
  return semicolons > commas ? ";" : ",";
}

/**
 * RFC-4180 compliant CSV parser supporting comma or semicolon delimiters,
 * quoted fields, escaped double-quotes, CRLF/LF line endings, and BOM stripping.
 */
export function parseCsvText(raw: string): {
  headers: string[];
  rows: string[][];
} {
  const cleaned = raw.replace(/^\uFEFF/, "").trim();
  if (!cleaned) return { headers: [], rows: [] };

  const firstNewline = cleaned.search(/\r?\n/);
  const firstLine = firstNewline === -1 ? cleaned : cleaned.slice(0, firstNewline);
  const delimiter = detectDelimiter(firstLine);

  const parsedRows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i += 1) {
    const ch = cleaned[i];
    const next = cleaned[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\r" && next === "\n") {
      row.push(cell.trim());
      if (row.some((v) => v.length > 0)) parsedRows.push(row);
      row = [];
      cell = "";
      i += 1;
    } else if (ch === "\n" || ch === "\r") {
      row.push(cell.trim());
      if (row.some((v) => v.length > 0)) parsedRows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }

  row.push(cell.trim());
  if (row.some((v) => v.length > 0)) parsedRows.push(row);

  if (parsedRows.length === 0) return { headers: [], rows: [] };
  const [headers, ...rows] = parsedRows;
  return { headers, rows };
}

/**
 * Parse currency strings across Indonesian (1.500.000,50 / Rp 50.000)
 * and international (1,500.50 / (25.00) / -45000) formats.
 */
export function parseFlexibleAmount(raw: string): number | null {
  let s = raw.trim();
  if (!s) return null;

  let negative = false;
  if (s.startsWith("(") && s.endsWith(")")) {
    negative = true;
    s = s.slice(1, -1).trim();
  }
  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1).trim();
  } else if (s.startsWith("+")) {
    s = s.slice(1).trim();
  }

  // Strip currency symbols, letters, spaces, and formula-neutralization apostrophe
  s = s.replace(/^'/, "").replace(/[A-Za-z$€£¥\s]/g, "");
  if (!s || !/\d/.test(s)) return null;

  const hasDot = s.includes(".");
  const hasComma = s.includes(",");

  if (hasDot && hasComma) {
    // Whichever appears last is the decimal separator
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    const parts = s.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      s = `${parts[0]}.${parts[1]}`;
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasDot) {
    const parts = s.split(".");
    // Indonesian thousands separator pattern like 150.000 or 1.500.000
    if (
      parts.length > 2 ||
      (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3)
    ) {
      s = s.replace(/\./g, "");
    }
  }

  const num = Number.parseFloat(s);
  if (!Number.isFinite(num) || num === 0) return null;
  const rounded = Math.round(num * 100) / 100;
  return negative ? -rounded : rounded;
}

/**
 * Parse ISO timestamps, YYYY-MM-DD, DD/MM/YYYY, or DD-MM-YYYY dates.
 */
export function parseFlexibleDate(raw: string): Date | null {
  const s = raw.trim().replace(/^'/, "");
  if (!s) return null;

  // ISO date-only YYYY-MM-DD or YYYY/MM/DD
  const ymd = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymd) {
    const y = Number(ymd[1]);
    const m = Number(ymd[2]);
    const d = Number(ymd[3]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return new Date(Date.UTC(y, m - 1, d, 5, 0, 0));
    }
  }

  // DD/MM/YYYY or DD-MM-YYYY (common in Indonesian bank statements)
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    const first = Number(dmy[1]);
    const second = Number(dmy[2]);
    const y = Number(dmy[3]);
    // Disambiguate DD/MM vs MM/DD: default to DD/MM unless second > 12
    const day = second > 12 ? second : first;
    const month = second > 12 ? first : second;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(Date.UTC(y, month - 1, day, 5, 0, 0));
    }
  }

  // Full ISO timestamp or standard JS date string
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime()) && parsed.getUTCFullYear() >= 2000) {
    return parsed;
  }

  return null;
}

export function detectCsvColumnMapping(headers: string[]): CsvColumnMapping {
  const lower = headers.map((h) => h.trim().toLowerCase());

  const findCol = (patterns: RegExp[]) =>
    lower.findIndex((h) => patterns.some((p) => p.test(h)));

  const dateCol = findCol([/^date$/, /tanggal/, /occurred/, /time/, /tgl/]);
  const amountCol = findCol([
    /^amount$/,
    /jumlah/,
    /nominal/,
    /nilai/,
    /mutasi/,
    /total/,
    /value/,
  ]);
  const typeCol = findCol([/^type$/, /jenis/, /cr\/db/, /db\/cr/, /direction/, /tipe/]);
  const noteCol = findCol([
    /^note$/,
    /keterangan/,
    /desc/,
    /memo/,
    /merchant/,
    /uraian/,
    /berita/,
  ]);
  const categoryCol = findCol([/^category$/, /kategori/]);

  return {
    dateCol: dateCol >= 0 ? dateCol : 0,
    amountCol: amountCol >= 0 ? amountCol : Math.min(1, Math.max(0, headers.length - 1)),
    typeCol,
    noteCol,
    categoryCol,
  };
}

export function mapCsvRowsToImports(
  rows: string[][],
  mapping: CsvColumnMapping,
): { valid: ParsedImportRow[]; skipped: number } {
  const valid: ParsedImportRow[] = [];
  let skipped = 0;

  const hasAnyNegative =
    mapping.typeCol < 0 &&
    rows.some((r) => {
      const amt = parseFlexibleAmount(r[mapping.amountCol] ?? "");
      return amt !== null && amt < 0;
    });

  for (const row of rows) {
    const rawDate = row[mapping.dateCol] ?? "";
    const rawAmount = row[mapping.amountCol] ?? "";
    const rawType = mapping.typeCol >= 0 ? (row[mapping.typeCol] ?? "") : "";
    const rawNote = mapping.noteCol >= 0 ? (row[mapping.noteCol] ?? "") : "";
    const rawCategory =
      mapping.categoryCol >= 0 ? (row[mapping.categoryCol] ?? "") : "";

    const parsedDate = parseFlexibleDate(rawDate);
    const parsedAmount = parseFlexibleAmount(rawAmount);
    if (!parsedDate || parsedAmount === null) {
      skipped += 1;
      continue;
    }

    const typeToken = rawType.trim().toLowerCase();
    // Skip neutral transfers during single-wallet statement import
    if (typeToken === "transfer") {
      skipped += 1;
      continue;
    }

    let type: "EXPENSE" | "INCOME";
    if (
      typeToken === "income" ||
      typeToken === "cr" ||
      typeToken === "credit" ||
      typeToken === "kredit" ||
      typeToken === "masuk"
    ) {
      type = "INCOME";
    } else if (
      typeToken === "expense" ||
      typeToken === "db" ||
      typeToken === "debit" ||
      typeToken === "keluar"
    ) {
      type = "EXPENSE";
    } else if (parsedAmount < 0) {
      type = "EXPENSE";
    } else if (
      mapping.typeCol < 0 &&
      (hasAnyNegative || rawAmount.trim().startsWith("+"))
    ) {
      type = "INCOME";
    } else {
      type = "EXPENSE";
    }

    const cleanNote = rawNote.replace(/^'/, "").trim().slice(0, 240);
    const cleanCategory = rawCategory.replace(/^'/, "").trim().slice(0, 40);

    valid.push({
      type,
      amount: Math.abs(parsedAmount),
      occurredAt: parsedDate.toISOString(),
      note: cleanNote,
      categoryName: cleanCategory,
    });
  }

  return { valid, skipped };
}
