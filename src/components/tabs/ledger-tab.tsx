"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { DownloadIcon, PlusIcon, PrinterIcon } from "../icons";
import { TransactionRow } from "../transaction-row";
import type {
  DashboardPayload,
  TransactionItem,
  TransactionType,
} from "@/lib/types";

interface LedgerTabProps {
  data: DashboardPayload;
  currency: string;
  monthLabel: string;
  exportHref: string;
  reportHref: string;
  onOpenQuickEntry: (type: TransactionType) => void;
  onEditTransaction: (tx: TransactionItem) => void;
  onDeleteTransaction: (id: string) => Promise<void>;
}

function getLocalDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateHeading(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

export function LedgerTab({
  data,
  currency,
  monthLabel,
  exportHref,
  reportHref,
  onOpenQuickEntry,
  onEditTransaction,
  onDeleteTransaction,
}: LedgerTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | TransactionType>("ALL");
  const [walletFilter, setWalletFilter] = useState("ALL");
  const [confirmDeleteTxId, setConfirmDeleteTxId] = useState<string | null>(
    null,
  );

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return data.transactions.filter((tx) => {
      if (typeFilter !== "ALL" && tx.type !== typeFilter) return false;
      if (
        walletFilter !== "ALL" &&
        tx.wallet.id !== walletFilter &&
        tx.targetWallet?.id !== walletFilter
      ) {
        return false;
      }
      if (!q) return true;
      const hay = [
        tx.note,
        tx.category?.name ?? "",
        tx.wallet.name,
        tx.targetWallet?.name ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [data.transactions, searchQuery, typeFilter, walletFilter]);

  const groupedTransactions = useMemo(() => {
    const groups: Array<{
      dateKey: string;
      label: string;
      items: TransactionItem[];
    }> = [];
    const map = new Map<string, TransactionItem[]>();
    for (const tx of filteredTransactions) {
      const key = getLocalDateKey(tx.occurredAt);
      const list = map.get(key) ?? [];
      list.push(tx);
      map.set(key, list);
    }
    for (const [dateKey, items] of map.entries()) {
      groups.push({
        dateKey,
        label: formatDateHeading(items[0].occurredAt),
        items,
      });
    }
    return groups;
  }, [filteredTransactions]);

  const handleConfirmDelete = async (id: string) => {
    await onDeleteTransaction(id);
    setConfirmDeleteTxId(null);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
          <div className="sm:col-span-5">
            <label htmlFor="ledger-search" className="sr-only">
              Search notes, categories, or wallets
            </label>
            <input
              id="ledger-search"
              type="search"
              placeholder="Search note, category, or wallet"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]"
            />
          </div>

          <div className="sm:col-span-4">
            <label htmlFor="ledger-wallet-filter" className="sr-only">
              Filter by wallet
            </label>
            <select
              id="ledger-wallet-filter"
              value={walletFilter}
              onChange={(e) => setWalletFilter(e.target.value)}
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--ink)]"
            >
              <option value="ALL">All wallets</option>
              {data.wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 sm:col-span-3">
            <a
              href={exportHref}
              className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-2.5 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--surface-2)]"
            >
              <DownloadIcon className="h-4 w-4 shrink-0" />
              <span>CSV</span>
            </a>
            <Link
              href={reportHref}
              className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-2.5 text-xs font-semibold text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent-text)]"
            >
              <PrinterIcon className="h-4 w-4 shrink-0" />
              <span>PDF</span>
            </Link>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {(["ALL", "EXPENSE", "INCOME", "TRANSFER"] as const).map((f) => {
            const active = typeFilter === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setTypeFilter(f)}
                aria-pressed={active}
                className={`min-h-11 rounded-xl px-3.5 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--surface-2)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
                }`}
              >
                {f === "ALL"
                  ? "All"
                  : f === "EXPENSE"
                    ? "Expenses"
                    : f === "INCOME"
                      ? "Income"
                      : "Transfers"}
              </button>
            );
          })}
        </div>
      </div>

      {groupedTransactions.length === 0 ? (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-8 text-center">
          <p className="text-base font-semibold text-[var(--ink)]">
            {data.transactions.length === 0
              ? `No entries in ${monthLabel} yet`
              : "No entries match your current filter"}
          </p>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            {data.transactions.length === 0
              ? "Tap Record Entry to log an expense, income, or wallet transfer."
              : "Clear your search or choose All to view every entry."}
          </p>
          {data.transactions.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setTypeFilter("ALL");
                setWalletFilter("ALL");
              }}
              className="mt-4 inline-flex h-11 items-center rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--ink)]"
            >
              Reset Filters
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenQuickEntry("EXPENSE")}
              className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Record Entry</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {groupedTransactions.map((group) => (
            <section
              key={group.dateKey}
              className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:p-5"
            >
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                {group.label}
              </h2>
              <ul className="divide-y divide-[var(--border)]">
                {group.items.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    tx={tx}
                    currency={currency}
                    allowActions
                    isConfirmingDelete={confirmDeleteTxId === tx.id}
                    onEdit={onEditTransaction}
                    onRequestDelete={setConfirmDeleteTxId}
                    onConfirmDelete={(id) => void handleConfirmDelete(id)}
                    onCancelDelete={() => setConfirmDeleteTxId(null)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
