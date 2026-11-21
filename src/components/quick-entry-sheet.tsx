"use client";

import React, { useEffect, useRef, useState } from "react";
import { CategoryGlyph, CloseIcon, TransferIcon } from "./icons";
import { evaluateAmountExpression, hasMathOperator } from "@/lib/math-input";
import { formatCurrency } from "@/lib/money";
import { enqueueOfflineTransaction } from "@/lib/offline-queue";
import { readLastWalletId, saveLastWalletId } from "@/lib/preferences";
import type {
  CategoryItem,
  TransactionItem,
  TransactionType,
  WalletItem,
} from "@/lib/types";

interface QuickEntrySheetProps {
  open: boolean;
  initialType?: TransactionType;
  editingTransaction?: TransactionItem | null;
  currency: string;
  wallets: WalletItem[];
  categories: CategoryItem[];
  onClose: () => void;
  onSaved: () => Promise<void>;
  onOfflineQueued?: () => void;
}

function toLocalDateTimeInput(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function QuickEntrySheet(props: QuickEntrySheetProps) {
  if (!props.open) return null;
  const dialogKey = props.editingTransaction?.id ?? `new-${props.initialType ?? "EXPENSE"}`;
  return <QuickEntryDialog key={dialogKey} {...props} />;
}

function QuickEntryDialog({
  initialType = "EXPENSE",
  editingTransaction = null,
  currency,
  wallets,
  categories,
  onClose,
  onSaved,
  onOfflineQueued,
}: QuickEntrySheetProps) {
  const isEditing = Boolean(editingTransaction);

  const rememberedWalletId = !isEditing ? readLastWalletId() : null;
  const initialWalletId =
    editingTransaction?.wallet.id ??
    (rememberedWalletId && wallets.some((w) => w.id === rememberedWalletId)
      ? rememberedWalletId
      : (wallets[0]?.id ?? ""));
  const [type, setType] = useState<TransactionType>(
    editingTransaction?.type ?? initialType,
  );
  const [amount, setAmount] = useState(
    editingTransaction ? String(editingTransaction.amount) : "",
  );
  const [walletId, setWalletId] = useState(() => initialWalletId);
  const [targetWalletId, setTargetWalletId] = useState(
    () =>
      editingTransaction?.targetWallet?.id ??
      wallets.find((w) => w.id !== initialWalletId)?.id ??
      initialWalletId,
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    () => editingTransaction?.category?.id ?? "",
  );
  const [note, setNote] = useState(editingTransaction?.note ?? "");
  const [occurredLocal, setOccurredLocal] = useState(() =>
    toLocalDateTimeInput(
      editingTransaction ? new Date(editingTransaction.occurredAt) : new Date(),
    ),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  const filteredCategories = categories.filter((c) => c.type === type);
  const effectiveCategoryId = filteredCategories.some(
    (c) => c.id === selectedCategoryId,
  )
    ? selectedCategoryId
    : (filteredCategories[0]?.id ?? "");

  // Ensure an archived wallet from a historical transaction remains selectable while editing
  const selectableWallets = [...wallets];
  if (
    editingTransaction &&
    !selectableWallets.some((w) => w.id === editingTransaction.wallet.id)
  ) {
    selectableWallets.push({
      id: editingTransaction.wallet.id,
      name: `${editingTransaction.wallet.name} (Archived)`,
      type: editingTransaction.wallet.type,
      currency: editingTransaction.wallet.currency || currency,
      initialBalance: 0,
      balance: 0,
      balanceInPrimary: 0,
      exchangeRate: 1,
    });
  }
  if (
    editingTransaction?.targetWallet &&
    !selectableWallets.some((w) => w.id === editingTransaction.targetWallet?.id)
  ) {
    selectableWallets.push({
      id: editingTransaction.targetWallet.id,
      name: `${editingTransaction.targetWallet.name} (Archived)`,
      type: editingTransaction.targetWallet.type,
      currency: editingTransaction.targetWallet.currency || currency,
      initialBalance: 0,
      balance: 0,
      balanceInPrimary: 0,
      exchangeRate: 1,
    });
  }

  const activeSourceWallet = selectableWallets.find((w) => w.id === walletId);
  const activeTargetWallet = selectableWallets.find(
    (w) => w.id === targetWalletId,
  );
  const entryCurrency = activeSourceWallet?.currency ?? currency;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      amountInputRef.current?.focus();
    }, 60);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const presets =
    entryCurrency === "IDR"
      ? [
          { label: "+15k", value: 15000 },
          { label: "+50k", value: 50000 },
          { label: "+100k", value: 100000 },
          { label: "+500k", value: 500000 },
        ]
      : [
          { label: "+5", value: 5 },
          { label: "+20", value: 20 },
          { label: "+50", value: 50 },
          { label: "+100", value: 100 },
        ];

  const addPreset = (delta: number) => {
    const evaluated = evaluateAmountExpression(amount);
    const current = evaluated ?? (Number.parseFloat(amount || "0") || 0);
    setAmount(String(Math.round((current + delta) * 100) / 100));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = evaluateAmountExpression(amount);
    if (parsedAmount === null || parsedAmount <= 0) {
      setError("Enter a valid amount or math expression greater than 0.");
      return;
    }

    if (
      type === "TRANSFER" &&
      (!targetWalletId || targetWalletId === walletId)
    ) {
      setError("Choose two different wallets for a transfer.");
      return;
    }

    if (
      type === "TRANSFER" &&
      activeSourceWallet &&
      activeTargetWallet &&
      activeSourceWallet.currency !== activeTargetWallet.currency
    ) {
      setError(
        `Transfers require matching currencies (${activeSourceWallet.currency} to ${activeTargetWallet.currency} cannot be transferred directly).`,
      );
      return;
    }

    setSubmitting(true);
    const parsedDate = occurredLocal ? new Date(occurredLocal) : new Date();
    if (Number.isNaN(parsedDate.getTime())) {
      setError("Enter a valid date and time.");
      setSubmitting(false);
      return;
    }

    const occurredAt = parsedDate.toISOString();
    const payload = {
      type,
      amount: parsedAmount,
      walletId,
      targetWalletId: type === "TRANSFER" ? targetWalletId : null,
      categoryId: type === "TRANSFER" ? null : effectiveCategoryId,
      note: note.trim(),
      occurredAt,
    };

    if (!editingTransaction && typeof navigator !== "undefined" && !navigator.onLine) {
      saveLastWalletId(walletId);
      enqueueOfflineTransaction(payload);
      onOfflineQueued?.();
      setSubmitting(false);
      onClose();
      return;
    }

    try {
      const endpoint = editingTransaction
        ? `/api/transactions/${editingTransaction.id}`
        : "/api/transactions";
      const method = editingTransaction ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not save transaction.");
        setSubmitting(false);
        return;
      }

      saveLastWalletId(walletId);
      await onSaved();
      setSubmitting(false);
      onClose();
    } catch {
      if (!editingTransaction) {
        saveLastWalletId(walletId);
        enqueueOfflineTransaction(payload);
        onOfflineQueued?.();
        setSubmitting(false);
        onClose();
        return;
      }
      setError("You appear to be offline. Editing existing entries requires a connection.");
      setSubmitting(false);
    }
  };

  const evaluatedAmount = evaluateAmountExpression(amount);
  const amountHasMath = hasMathOperator(amount);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-entry-title"
        className="liquid-glass flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] sm:rounded-[28px]"
      >
        <div
          aria-hidden="true"
          className="flex justify-center pt-2.5 sm:hidden"
        >
          <span className="h-1 w-10 rounded-full bg-[var(--ink-muted)]/35" />
        </div>
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5 sm:py-4">
          <h2
            id="quick-entry-title"
            className="text-lg font-bold text-[var(--ink)]"
          >
            {isEditing ? "Edit Entry" : "Record Entry"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={
              isEditing ? "Close edit entry dialog" : "Close record entry dialog"
            }
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 space-y-5 overflow-y-auto bg-[var(--surface-1)]/92 px-5 py-5 safe-bottom"
        >
          <div
            role="tablist"
            aria-label="Transaction type"
            className="grid grid-cols-3 gap-1 rounded-2xl bg-[var(--surface-2)] p-1"
          >
            {(["EXPENSE", "INCOME", "TRANSFER"] as const).map((item) => {
              const active = type === item;
              return (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setType(item)}
                  className={`min-h-11 rounded-xl text-sm font-semibold transition-colors ${
                    active
                      ? "bg-[var(--surface-1)] text-[var(--ink)] shadow-sm"
                      : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  {item === "EXPENSE"
                    ? "Expense"
                    : item === "INCOME"
                      ? "Income"
                      : "Transfer"}
                </button>
              );
            })}
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-[var(--expense)]/30 bg-[var(--expense-soft)] px-3.5 py-2.5 text-sm font-medium text-[var(--expense)]"
            >
              {error}
            </div>
          )}

          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <label
                htmlFor="entry-amount"
                className="block text-sm font-medium text-[var(--ink-muted)]"
              >
                Amount ({entryCurrency})
              </label>
              {amount.trim() !== "" && evaluatedAmount !== null && (
                <span
                  aria-live="polite"
                  className="tabular-nums text-xs font-semibold text-[var(--accent-text)]"
                >
                  {amountHasMath ? "= " : ""}
                  {formatCurrency(evaluatedAmount, entryCurrency)}
                </span>
              )}
            </div>
            <input
              ref={amountInputRef}
              id="entry-amount"
              type="text"
              required
              inputMode="decimal"
              autoComplete="off"
              placeholder="0 or 45000+18000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="tabular-nums h-14 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 text-2xl font-bold text-[var(--ink)] placeholder:text-base placeholder:font-medium placeholder:text-[var(--ink-muted)]"
            />
            <div className="mt-2.5 flex flex-wrap gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => addPreset(preset.value)}
                  className="tabular-nums min-h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--surface-2)] active:scale-[0.98]"
                >
                  {preset.label}
                </button>
              ))}
              {amount.trim() !== "" && (
                <button
                  type="button"
                  onClick={() => setAmount("")}
                  className="min-h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)]"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="entry-wallet"
                className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
              >
                {type === "TRANSFER" ? "From Wallet" : "Wallet"}
              </label>
              <select
                id="entry-wallet"
                value={walletId}
                onChange={(e) => {
                  const nextWalletId = e.target.value;
                  setWalletId(nextWalletId);
                  if (nextWalletId === targetWalletId) {
                    const alternative = selectableWallets.find(
                      (w) => w.id !== nextWalletId,
                    );
                    if (alternative) setTargetWalletId(alternative.id);
                  }
                }}
                required
                className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm font-medium text-[var(--ink)]"
              >
                {selectableWallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.currency})
                  </option>
                ))}
              </select>
            </div>

            {type === "TRANSFER" ? (
              <div>
                <label
                  htmlFor="entry-target-wallet"
                  className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
                >
                  To Wallet
                </label>
                <select
                  id="entry-target-wallet"
                  value={targetWalletId}
                  onChange={(e) => setTargetWalletId(e.target.value)}
                  required
                  className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm font-medium text-[var(--ink)]"
                >
                  {selectableWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.type})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label
                  htmlFor="entry-date"
                  className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
                >
                  Date & Time
                </label>
                <input
                  id="entry-date"
                  type="datetime-local"
                  value={occurredLocal}
                  onChange={(e) => setOccurredLocal(e.target.value)}
                  className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--ink)]"
                />
              </div>
            )}
          </div>

          {type === "TRANSFER" && (
            <div className="flex items-center gap-2 rounded-xl bg-[var(--surface-2)] px-3.5 py-2.5 text-xs text-[var(--ink-muted)]">
              <TransferIcon className="h-4 w-4 shrink-0 text-[var(--accent-text)]" />
              <span>
                Transfers update both wallet balances without counting as
                monthly spending or income.
              </span>
            </div>
          )}

          {type !== "TRANSFER" && (
            <div>
              <span className="mb-2 block text-sm font-medium text-[var(--ink)]">
                Category
              </span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {filteredCategories.map((cat) => {
                  const selected = effectiveCategoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(cat.id)}
                      aria-pressed={selected}
                      className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors ${
                        selected
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)]"
                          : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--ink)] hover:bg-[var(--surface-2)]"
                      }`}
                    >
                      <CategoryGlyph
                        icon={cat.icon}
                        className="h-4 w-4 shrink-0"
                      />
                      <span className="truncate">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {type === "TRANSFER" && (
            <div>
              <label
                htmlFor="entry-transfer-date"
                className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
              >
                Date & Time
              </label>
              <input
                id="entry-transfer-date"
                type="datetime-local"
                value={occurredLocal}
                onChange={(e) => setOccurredLocal(e.target.value)}
                className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--ink)]"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="entry-note"
              className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
            >
              Note (optional)
            </label>
            <input
              id="entry-note"
              type="text"
              maxLength={240}
              placeholder="Merchant, item, or reference"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || selectableWallets.length === 0}
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[var(--accent)] px-4 text-base font-semibold text-white transition-transform hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-50"
          >
            {submitting
              ? isEditing
                ? "Saving changes..."
                : "Saving entry..."
              : isEditing
                ? "Save Changes"
                : "Save Entry"}
          </button>
        </form>
      </div>
    </div>
  );
}
