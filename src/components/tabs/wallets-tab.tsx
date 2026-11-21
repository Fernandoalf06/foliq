"use client";

import React, { useState } from "react";
import { EditIcon, RestoreIcon, TrashIcon } from "../icons";
import { GoalsSection } from "./goals-section";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import { formatCurrency } from "@/lib/money";
import type { SavingsGoalItem, WalletItem, WalletType } from "@/lib/types";

interface WalletsTabProps {
  wallets: WalletItem[];
  archivedWallets: WalletItem[];
  savingsGoals: SavingsGoalItem[];
  currency: string;
  onRefresh: () => Promise<void>;
  onRemoveWallet: (id: string) => Promise<void>;
  onRestoreWallet: (id: string) => Promise<void>;
}

export function WalletsTab({
  wallets,
  archivedWallets,
  savingsGoals,
  currency,
  onRefresh,
  onRemoveWallet,
  onRestoreWallet,
}: WalletsTabProps) {
  const [subView, setSubView] = useState<"wallets" | "goals">("wallets");
  const [walletName, setWalletName] = useState("");
  const [walletType, setWalletType] = useState<WalletType>("BANK");
  const [walletCurrency, setWalletCurrency] = useState(currency);
  const [walletInitial, setWalletInitial] = useState("0");
  const [walletSubmitting, setWalletSubmitting] = useState(false);
  const [walletFeedback, setWalletFeedback] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  // Inline Edit state
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<WalletType>("BANK");
  const [editCurrency, setEditCurrency] = useState(currency);
  const [editInitial, setEditInitial] = useState("0");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const startEditing = (wallet: WalletItem) => {
    setConfirmRemoveId(null);
    setEditError(null);
    setEditingWalletId(wallet.id);
    setEditName(wallet.name);
    setEditType(wallet.type);
    setEditCurrency(wallet.currency);
    setEditInitial(String(wallet.initialBalance));
  };

  const handleSaveEdit = async (e: React.FormEvent, walletId: string) => {
    e.preventDefault();
    setEditError(null);
    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/wallets/${walletId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          type: editType,
          currency: editCurrency,
          initialBalance: Number.parseFloat(editInitial || "0") || 0,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError(json.error || "Failed to update wallet.");
        setEditSubmitting(false);
        return;
      }
      setEditingWalletId(null);
      await onRefresh();
    } catch {
      setEditError("Network error while updating wallet.");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleAddWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setWalletFeedback(null);
    setWalletSubmitting(true);
    try {
      const res = await fetch("/api/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: walletName,
          type: walletType,
          currency: walletCurrency,
          initialBalance: Number.parseFloat(walletInitial || "0") || 0,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setWalletFeedback(json.error || "Failed to add wallet.");
        setWalletSubmitting(false);
        return;
      }
      setWalletName("");
      setWalletInitial("0");
      setWalletFeedback("Wallet added.");
      await onRefresh();
    } catch {
      setWalletFeedback("Network error while adding wallet.");
    } finally {
      setWalletSubmitting(false);
    }
  };

  const handleConfirmRemove = async (id: string) => {
    await onRemoveWallet(id);
    setConfirmRemoveId(null);
  };

  return (
    <div className="space-y-5">
      <div
        role="tablist"
        aria-label="Wallets and savings goals view"
        className="grid max-w-md grid-cols-2 gap-1 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={subView === "wallets"}
          onClick={() => setSubView("wallets")}
          className={`min-h-11 rounded-xl px-3 text-sm font-semibold transition-colors ${
            subView === "wallets"
              ? "bg-[var(--accent)] text-white"
              : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
          }`}
        >
          Wallets ({wallets.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subView === "goals"}
          onClick={() => setSubView("goals")}
          className={`min-h-11 rounded-xl px-3 text-sm font-semibold transition-colors ${
            subView === "goals"
              ? "bg-[var(--accent)] text-white"
              : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
          }`}
        >
          Savings Goals ({savingsGoals.length})
        </button>
      </div>

      {subView === "goals" ? (
        <GoalsSection
          goals={savingsGoals}
          wallets={wallets}
          currency={currency}
          onRefresh={onRefresh}
        />
      ) : (
        <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {wallets.map((w) => {
          const isConfirming = confirmRemoveId === w.id;
          const isEditing = editingWalletId === w.id;

          if (isEditing) {
            return (
              <form
                key={w.id}
                onSubmit={(e) => void handleSaveEdit(e, w.id)}
                className="space-y-3 rounded-[20px] border border-[var(--accent)] bg-[var(--surface-1)] p-5"
              >
                <p className="text-sm font-bold text-[var(--ink)]">
                  Edit Wallet
                </p>
                {editError && (
                  <p role="alert" className="text-xs font-medium text-[var(--expense)]">
                    {editError}
                  </p>
                )}
                <div>
                  <label
                    htmlFor={`edit-wallet-name-${w.id}`}
                    className="mb-1 block text-xs font-medium text-[var(--ink-muted)]"
                  >
                    Name
                  </label>
                  <input
                    id={`edit-wallet-name-${w.id}`}
                    type="text"
                    required
                    maxLength={40}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--ink)]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label
                      htmlFor={`edit-wallet-type-${w.id}`}
                      className="mb-1 block text-xs font-medium text-[var(--ink-muted)]"
                    >
                      Account Type
                    </label>
                    <select
                      id={`edit-wallet-type-${w.id}`}
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as WalletType)}
                      className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--ink)]"
                    >
                      <option value="BANK">Bank</option>
                      <option value="EWALLET">E-Wallet</option>
                      <option value="CASH">Cash</option>
                      <option value="SAVINGS">Savings</option>
                      <option value="CREDIT">Credit</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor={`edit-wallet-currency-${w.id}`}
                      className="mb-1 block text-xs font-medium text-[var(--ink-muted)]"
                    >
                      Currency
                    </label>
                    <select
                      id={`edit-wallet-currency-${w.id}`}
                      value={editCurrency}
                      onChange={(e) => setEditCurrency(e.target.value)}
                      className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--ink)]"
                    >
                      {SUPPORTED_CURRENCIES.map((code) => (
                        <option key={code} value={code}>
                          {code}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <label
                      htmlFor={`edit-wallet-initial-${w.id}`}
                      className="block text-xs font-medium text-[var(--ink-muted)]"
                    >
                      Opening Balance ({editCurrency})
                    </label>
                    {editInitial.trim() !== "" &&
                      Number.isFinite(Number.parseFloat(editInitial)) && (
                        <span className="tabular-nums text-xs font-semibold text-[var(--accent-text)]">
                          {formatCurrency(
                            Number.parseFloat(editInitial),
                            editCurrency,
                          )}
                        </span>
                      )}
                  </div>
                  <input
                    id={`edit-wallet-initial-${w.id}`}
                    type="number"
                    step="any"
                    inputMode="decimal"
                    value={editInitial}
                    onChange={(e) => setEditInitial(e.target.value)}
                    className="tabular-nums h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--ink)]"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="h-11 flex-1 rounded-xl bg-[var(--accent)] px-3 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
                  >
                    {editSubmitting ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingWalletId(null)}
                    className="h-11 rounded-xl border border-[var(--border)] px-3 text-xs font-semibold text-[var(--ink-muted)]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            );
          }

          return (
            <div
              key={w.id}
              className="flex flex-col justify-between rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-lg bg-[var(--surface-2)] px-2.5 py-1 text-xs font-semibold text-[var(--ink-muted)]">
                      {w.type}
                    </span>
                    <span className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs font-semibold text-[var(--ink-muted)]">
                      {w.currency}
                    </span>
                  </div>

                  {isConfirming ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void handleConfirmRemove(w.id)}
                        className="min-h-11 rounded-lg bg-[var(--expense)] px-3 text-xs font-semibold text-white"
                      >
                        Remove
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmRemoveId(null)}
                        className="min-h-11 rounded-lg border border-[var(--border)] px-2.5 text-xs font-medium text-[var(--ink-muted)]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => startEditing(w)}
                        aria-label={`Edit ${w.name}`}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--accent-text)]"
                      >
                        <EditIcon className="h-4 w-4" />
                      </button>
                      {wallets.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setConfirmRemoveId(w.id)}
                          aria-label={`Remove or archive ${w.name}`}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--expense)]"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <h2 className="mt-3 text-base font-bold text-[var(--ink)]">
                  {w.name}
                </h2>
                <p className="tabular-nums mt-1.5 break-words text-2xl font-bold text-[var(--ink)]">
                  {formatCurrency(w.balance, w.currency)}
                </p>
                {w.currency !== currency && (
                  <p className="tabular-nums mt-1 text-xs font-medium text-[var(--accent-text)]">
                    ≈ {formatCurrency(w.balanceInPrimary, currency)}
                  </p>
                )}
              </div>
              <p className="tabular-nums mt-4 text-xs text-[var(--ink-muted)]">
                Opening balance: {formatCurrency(w.initialBalance, w.currency)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Add Wallet Form */}
      <section className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-6">
        <h2 className="text-base font-bold text-[var(--ink)]">
          Add a New Wallet
        </h2>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Separate cash, bank accounts, e-wallets, savings, or credit cards to
          keep balances accurate.
        </p>

        {walletFeedback && (
          <p className="mt-3 text-sm font-medium text-[var(--accent-text)]">
            {walletFeedback}
          </p>
        )}

        <form
          onSubmit={handleAddWallet}
          className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-12"
        >
          <div className="sm:col-span-3">
            <label
              htmlFor="wallet-name"
              className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
            >
              Wallet Name
            </label>
            <input
              id="wallet-name"
              type="text"
              required
              maxLength={40}
              placeholder="BCA Savings, USD Wise"
              value={walletName}
              onChange={(e) => setWalletName(e.target.value)}
              className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="wallet-type"
              className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
            >
              Type
            </label>
            <select
              id="wallet-type"
              value={walletType}
              onChange={(e) => setWalletType(e.target.value as WalletType)}
              className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--ink)]"
            >
              <option value="BANK">Bank</option>
              <option value="EWALLET">E-Wallet</option>
              <option value="CASH">Cash</option>
              <option value="SAVINGS">Savings</option>
              <option value="CREDIT">Credit</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="wallet-currency"
              className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
            >
              Currency
            </label>
            <select
              id="wallet-currency"
              value={walletCurrency}
              onChange={(e) => setWalletCurrency(e.target.value)}
              className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--ink)]"
            >
              {SUPPORTED_CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <label
                htmlFor="wallet-initial"
                className="block text-sm font-medium text-[var(--ink)]"
              >
                Opening ({walletCurrency})
              </label>
              {walletInitial.trim() !== "" &&
                Number.isFinite(Number.parseFloat(walletInitial)) &&
                Number.parseFloat(walletInitial) !== 0 && (
                  <span className="tabular-nums text-xs font-semibold text-[var(--accent-text)]">
                    {formatCurrency(
                      Number.parseFloat(walletInitial),
                      walletCurrency,
                    )}
                  </span>
                )}
            </div>
            <input
              id="wallet-initial"
              type="number"
              step="any"
              inputMode="decimal"
              value={walletInitial}
              onChange={(e) => setWalletInitial(e.target.value)}
              className="tabular-nums h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 text-sm text-[var(--ink)]"
            />
          </div>

          <div className="flex items-end sm:col-span-2">
            <button
              type="submit"
              disabled={walletSubmitting}
              className="h-12 w-full rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {walletSubmitting ? "Adding..." : "Add Wallet"}
            </button>
          </div>
        </form>
      </section>

      {/* Archived Wallets Section (Unarchive support) */}
      {archivedWallets.length > 0 && (
        <section className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-6">
          <h2 className="text-base font-bold text-[var(--ink)]">
            Archived Wallets ({archivedWallets.length})
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Archived wallets keep historical transactions intact without
            appearing in active totals. Restore any wallet below to include it
            again.
          </p>
          <ul className="mt-4 divide-y divide-[var(--border)]">
            {archivedWallets.map((w) => (
              <li
                key={w.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--ink)]">
                    {w.name}{" "}
                    <span className="ml-1 rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-medium text-[var(--ink-muted)]">
                      {w.type}
                    </span>
                  </p>
                  <p className="tabular-nums mt-0.5 text-xs text-[var(--ink-muted)]">
                    Recorded balance: {formatCurrency(w.balance, w.currency)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void onRestoreWallet(w.id)}
                  className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 text-xs font-semibold text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent-text)]"
                >
                  <RestoreIcon className="h-4 w-4" />
                  <span>Restore</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
        </>
      )}
    </div>
  );
}
