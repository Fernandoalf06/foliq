"use client";

import React from "react";
import { CategoryGlyph, EditIcon, TransferIcon, TrashIcon } from "./icons";
import { formatCurrency } from "@/lib/money";
import { maskAmount } from "@/lib/preferences";
import type { TransactionItem } from "@/lib/types";

interface TransactionRowProps {
  tx: TransactionItem;
  currency: string;
  privacyMode?: boolean;
  allowActions?: boolean;
  isConfirmingDelete?: boolean;
  onEdit?: (tx: TransactionItem) => void;
  onRequestDelete?: (id: string) => void;
  onConfirmDelete?: (id: string) => void;
  onCancelDelete?: () => void;
}

export function TransactionRow({
  tx,
  currency,
  privacyMode = false,
  allowActions = false,
  isConfirmingDelete = false,
  onEdit,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: TransactionRowProps) {
  const isIncome = tx.type === "INCOME";
  const isTransfer = tx.type === "TRANSFER";
  const title = isTransfer
    ? `${tx.wallet.name} to ${tx.targetWallet?.name ?? "Wallet"}`
    : (tx.category?.name ?? "Uncategorized");
  const subtitle = isTransfer
    ? tx.note || "Wallet transfer"
    : tx.note
      ? `${tx.wallet.name} · ${tx.note}`
      : tx.wallet.name;

  const txCurrency = tx.wallet.currency || currency;
  const rawAmountText = isTransfer
    ? formatCurrency(tx.amount, txCurrency)
    : formatCurrency(isIncome ? tx.amount : -tx.amount, txCurrency, {
        signed: true,
      });
  const amountText = maskAmount(rawAmountText, privacyMode);

  return (
    <li className="flex items-center justify-between gap-2 py-3.5 first:pt-1 last:pb-1 sm:gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            backgroundColor: isTransfer
              ? "var(--accent-soft)"
              : isIncome
                ? "var(--income-soft)"
                : "var(--surface-2)",
            color: isTransfer
              ? "var(--accent-text)"
              : isIncome
                ? "var(--income)"
                : "var(--ink)",
          }}
        >
          {isTransfer ? (
            <TransferIcon className="h-4 w-4" />
          ) : (
            <CategoryGlyph
              icon={tx.category?.icon ?? "tag"}
              className="h-4 w-4"
            />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--ink)]">
            {title}
          </p>
          <p className="truncate text-xs text-[var(--ink-muted)]">{subtitle}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
        <span
          className="tabular-nums text-sm font-semibold"
          style={{
            color: isTransfer
              ? "var(--ink)"
              : isIncome
                ? "var(--income)"
                : "var(--expense)",
          }}
        >
          {amountText}
        </span>

        {allowActions && (
          <>
            {isConfirmingDelete ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onConfirmDelete?.(tx.id)}
                  className="min-h-11 rounded-lg bg-[var(--expense)] px-3 text-xs font-semibold text-white"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => onCancelDelete?.()}
                  className="min-h-11 rounded-lg border border-[var(--border)] px-2.5 text-xs font-medium text-[var(--ink-muted)]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center">
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(tx)}
                    aria-label={`Edit ${title} transaction`}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--accent-text)]"
                  >
                    <EditIcon className="h-4 w-4" />
                  </button>
                )}
                {onRequestDelete && (
                  <button
                    type="button"
                    onClick={() => onRequestDelete(tx.id)}
                    aria-label={`Delete ${title} transaction`}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--expense)]"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </li>
  );
}
