"use client";

import React, { useMemo, useState } from "react";
import { UploadIcon } from "../icons";
import {
  detectCsvColumnMapping,
  mapCsvRowsToImports,
  parseCsvText,
  type CsvColumnMapping,
} from "@/lib/csv-import";
import { formatCurrency } from "@/lib/money";
import type { CategoryItem, WalletItem } from "@/lib/types";

interface CsvImportSectionProps {
  wallets: WalletItem[];
  categories: CategoryItem[];
  onRefresh: () => Promise<void>;
}

const MAX_IMPORT_ROWS = 500;

export function CsvImportSection({
  wallets,
  categories,
  onRefresh,
}: CsvImportSectionProps) {
  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");
  const incomeCategories = categories.filter((c) => c.type === "INCOME");

  const [rawCsv, setRawCsv] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedWalletId, setSelectedWalletId] = useState("");
  const [selectedExpenseCatId, setSelectedExpenseCatId] = useState("");
  const [selectedIncomeCatId, setSelectedIncomeCatId] = useState("");
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [customMapping, setCustomMapping] = useState<CsvColumnMapping | null>(
    null,
  );
  const [importing, setImporting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const effectiveWalletId = wallets.some((w) => w.id === selectedWalletId)
    ? selectedWalletId
    : (wallets[0]?.id ?? "");
  const effectiveWallet = wallets.find((w) => w.id === effectiveWalletId);

  const effectiveExpenseCatId = expenseCategories.some(
    (c) => c.id === selectedExpenseCatId,
  )
    ? selectedExpenseCatId
    : (expenseCategories[0]?.id ?? "");

  const effectiveIncomeCatId = incomeCategories.some(
    (c) => c.id === selectedIncomeCatId,
  )
    ? selectedIncomeCatId
    : (incomeCategories[0]?.id ?? "");

  const parsed = useMemo(() => parseCsvText(rawCsv), [rawCsv]);

  const mapping = useMemo(() => {
    if (customMapping && parsed.headers.length > 0) return customMapping;
    return detectCsvColumnMapping(parsed.headers);
  }, [customMapping, parsed.headers]);

  const mapped = useMemo(() => {
    if (parsed.headers.length === 0 || parsed.rows.length === 0) {
      return { valid: [], skipped: 0 };
    }
    return mapCsvRowsToImports(parsed.rows, mapping);
  }, [parsed.headers.length, parsed.rows, mapping]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFeedback(null);
    if (file.size > 2 * 1024 * 1024) {
      setFeedback({
        type: "error",
        text: "CSV file is larger than 2 MB. Split large statements into smaller batches.",
      });
      return;
    }
    try {
      const text = await file.text();
      setFileName(file.name);
      setRawCsv(text);
      setCustomMapping(null);
    } catch {
      setFeedback({ type: "error", text: "Could not read selected CSV file." });
    }
  };

  const handleImport = async () => {
    if (mapped.valid.length === 0) return;
    setFeedback(null);
    setImporting(true);
    try {
      const batch = mapped.valid.slice(0, MAX_IMPORT_ROWS);
      const res = await fetch("/api/transactions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletId: effectiveWalletId,
          defaultExpenseCategoryId: effectiveExpenseCatId,
          defaultIncomeCategoryId: effectiveIncomeCatId,
          skipDuplicates,
          entries: batch,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({
          type: "error",
          text: json.error || "Failed to import CSV transactions.",
        });
        setImporting(false);
        return;
      }

      const importedCount = Number(json.imported ?? 0);
      const skippedDupCount = Number(json.skippedDuplicates ?? 0);
      setFeedback({
        type: "success",
        text: `Imported ${importedCount} ${importedCount === 1 ? "entry" : "entries"} into ${json.walletName ?? "wallet"}${skippedDupCount > 0 ? ` (${skippedDupCount} duplicates skipped)` : ""}.`,
      });
      setRawCsv("");
      setFileName(null);
      setCustomMapping(null);
      await onRefresh();
    } catch {
      setFeedback({
        type: "error",
        text: "Network error while importing CSV transactions.",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <section className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-text)]">
          <UploadIcon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-[var(--ink)]">
            CSV Bank Statement Import Wizard
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Import transactions from Foliq CSV backups or bank statements (comma
            or semicolon separated, up to {MAX_IMPORT_ROWS} rows per batch) with
            automatic duplicate detection.
          </p>
        </div>
      </div>

      {feedback && (
        <div
          role={feedback.type === "error" ? "alert" : "status"}
          className={`mt-4 rounded-xl px-3.5 py-2.5 text-sm font-medium ${
            feedback.type === "error"
              ? "border border-[var(--expense)]/30 bg-[var(--expense-soft)] text-[var(--expense)]"
              : "border border-[var(--income)]/30 bg-[var(--income-soft)] text-[var(--income)]"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Step 1: Target wallet, default categories, and file upload */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label
            htmlFor="csv-target-wallet"
            className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
          >
            Target Wallet
          </label>
          <select
            id="csv-target-wallet"
            value={effectiveWalletId}
            onChange={(e) => setSelectedWalletId(e.target.value)}
            className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--ink)]"
          >
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.currency})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="csv-default-expense"
            className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
          >
            Fallback Expense Category
          </label>
          <select
            id="csv-default-expense"
            value={effectiveExpenseCatId}
            onChange={(e) => setSelectedExpenseCatId(e.target.value)}
            className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--ink)]"
          >
            {expenseCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="csv-default-income"
            className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
          >
            Fallback Income Category
          </label>
          <select
            id="csv-default-income"
            value={effectiveIncomeCatId}
            onChange={(e) => setSelectedIncomeCatId(e.target.value)}
            className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--ink)]"
          >
            {incomeCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label
          htmlFor="csv-file-input"
          className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 text-sm font-semibold text-[var(--ink)] hover:border-[var(--accent)]"
        >
          <UploadIcon className="h-4 w-4" />
          <span>{fileName ? `Selected: ${fileName}` : "Choose .CSV File"}</span>
          <input
            id="csv-file-input"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => void handleFileChange(e)}
            className="sr-only"
          />
        </label>

        {rawCsv && (
          <button
            type="button"
            onClick={() => {
              setRawCsv("");
              setFileName(null);
              setCustomMapping(null);
              setFeedback(null);
            }}
            className="inline-flex h-11 items-center rounded-xl border border-[var(--border)] px-3 text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)]"
          >
            Clear CSV
          </button>
        )}
      </div>

      <div className="mt-3">
        <label
          htmlFor="csv-paste-area"
          className="mb-1.5 block text-xs font-medium text-[var(--ink-muted)]"
        >
          Or paste CSV text directly (first line must be headers)
        </label>
        <textarea
          id="csv-paste-area"
          rows={3}
          placeholder="Date,Type,Amount,Category,Note&#10;2026-11-20,EXPENSE,45000,Food & Dining,Coffee"
          value={rawCsv}
          onChange={(e) => {
            setRawCsv(e.target.value);
            setCustomMapping(null);
          }}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 font-mono text-xs text-[var(--ink)] placeholder:text-[var(--ink-muted)]"
        />
      </div>

      {/* Step 2: Column Mapping & Live Preview */}
      {parsed.headers.length > 0 && (
        <div className="mt-4 space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label
                htmlFor="map-date"
                className="mb-1 block text-xs font-semibold text-[var(--ink-muted)]"
              >
                Date Column
              </label>
              <select
                id="map-date"
                value={mapping.dateCol}
                onChange={(e) =>
                  setCustomMapping({
                    ...mapping,
                    dateCol: Number(e.target.value),
                  })
                }
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-2.5 text-xs text-[var(--ink)]"
              >
                {parsed.headers.map((h, i) => (
                  <option key={`${h}-${i}`} value={i}>
                    {h || `Column ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="map-amount"
                className="mb-1 block text-xs font-semibold text-[var(--ink-muted)]"
              >
                Amount Column
              </label>
              <select
                id="map-amount"
                value={mapping.amountCol}
                onChange={(e) =>
                  setCustomMapping({
                    ...mapping,
                    amountCol: Number(e.target.value),
                  })
                }
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-2.5 text-xs text-[var(--ink)]"
              >
                {parsed.headers.map((h, i) => (
                  <option key={`${h}-${i}`} value={i}>
                    {h || `Column ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="map-type"
                className="mb-1 block text-xs font-semibold text-[var(--ink-muted)]"
              >
                Type / DB-CR
              </label>
              <select
                id="map-type"
                value={mapping.typeCol}
                onChange={(e) =>
                  setCustomMapping({
                    ...mapping,
                    typeCol: Number(e.target.value),
                  })
                }
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-2.5 text-xs text-[var(--ink)]"
              >
                <option value={-1}>Infer from +/- sign</option>
                {parsed.headers.map((h, i) => (
                  <option key={`${h}-${i}`} value={i}>
                    {h || `Column ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="map-note"
                className="mb-1 block text-xs font-semibold text-[var(--ink-muted)]"
              >
                Note / Description
              </label>
              <select
                id="map-note"
                value={mapping.noteCol}
                onChange={(e) =>
                  setCustomMapping({
                    ...mapping,
                    noteCol: Number(e.target.value),
                  })
                }
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-2.5 text-xs text-[var(--ink)]"
              >
                <option value={-1}>None</option>
                {parsed.headers.map((h, i) => (
                  <option key={`${h}-${i}`} value={i}>
                    {h || `Column ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="map-category"
                className="mb-1 block text-xs font-semibold text-[var(--ink-muted)]"
              >
                Category (optional)
              </label>
              <select
                id="map-category"
                value={mapping.categoryCol}
                onChange={(e) =>
                  setCustomMapping({
                    ...mapping,
                    categoryCol: Number(e.target.value),
                  })
                }
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-2.5 text-xs text-[var(--ink)]"
              >
                <option value={-1}>Use fallback category</option>
                {parsed.headers.map((h, i) => (
                  <option key={`${h}-${i}`} value={i}>
                    {h || `Column ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--ink-muted)]">
            <span>
              Ready to import:{" "}
              <strong className="text-[var(--ink)]">
                {Math.min(mapped.valid.length, MAX_IMPORT_ROWS)}
              </strong>{" "}
              valid {mapped.valid.length === 1 ? "row" : "rows"}
              {mapped.valid.length > MAX_IMPORT_ROWS
                ? ` (capped at ${MAX_IMPORT_ROWS} per batch)`
                : ""}
              {mapped.skipped > 0
                ? ` · ${mapped.skipped} invalid/transfer rows skipped`
                : ""}
            </span>
            <label className="inline-flex min-h-11 items-center gap-2 font-medium text-[var(--ink)]">
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              <span>Skip duplicate entries</span>
            </label>
          </div>

          {mapped.valid.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[var(--border)] bg-[var(--surface-2)]/70 text-[var(--ink-muted)]">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Date</th>
                    <th className="px-3 py-2 font-semibold">Type</th>
                    <th className="px-3 py-2 font-semibold">Note</th>
                    <th className="px-3 py-2 text-right font-semibold">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {mapped.valid.slice(0, 5).map((item, idx) => (
                    <tr key={`${item.occurredAt}-${item.amount}-${idx}`}>
                      <td className="tabular-nums whitespace-nowrap px-3 py-2 text-[var(--ink-muted)]">
                        {item.occurredAt.slice(0, 10)}
                      </td>
                      <td className="px-3 py-2 font-semibold text-[var(--ink)]">
                        {item.type}
                      </td>
                      <td className="max-w-[200px] truncate px-3 py-2 text-[var(--ink)]">
                        {item.note || item.categoryName || "(No note)"}
                      </td>
                      <td
                        className="tabular-nums whitespace-nowrap px-3 py-2 text-right font-semibold"
                        style={{
                          color:
                            item.type === "INCOME"
                              ? "var(--income)"
                              : "var(--expense)",
                        }}
                      >
                        {formatCurrency(
                          item.type === "INCOME" ? item.amount : -item.amount,
                          effectiveWallet?.currency ?? "IDR",
                          { signed: true },
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            type="button"
            disabled={
              importing ||
              mapped.valid.length === 0 ||
              !effectiveWalletId ||
              !effectiveExpenseCatId ||
              !effectiveIncomeCatId
            }
            onClick={() => void handleImport()}
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 sm:w-auto sm:px-6"
          >
            {importing
              ? "Importing transactions..."
              : `Import ${Math.min(mapped.valid.length, MAX_IMPORT_ROWS)} Transactions`}
          </button>
        </div>
      )}
    </section>
  );
}
