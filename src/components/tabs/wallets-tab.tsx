"use client";

import React, { useState } from "react";
import { TrashIcon } from "../icons";
import { formatCurrency } from "@/lib/money";
import type { WalletItem, WalletType } from "@/lib/types";

interface WalletsTabProps {
  wallets: WalletItem[];
  currency: string;
  onRefresh: () => Promise<void>;
  onRemoveWallet: (id: string) => Promise<void>;
}

export function WalletsTab({
  wallets,
  currency,
  onRefresh,
  onRemoveWallet,
}: WalletsTabProps) {
  const [walletName, setWalletName] = useState("");
  const [walletType, setWalletType] = useState<WalletType>("BANK");
  const [walletInitial, setWalletInitial] = useState("0");
  const [walletSubmitting, setWalletSubmitting] = useState(false);
  const [walletFeedback, setWalletFeedback] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {wallets.map((w) => {
          const isConfirming = confirmRemoveId === w.id;
          return (
            <div
              key={w.id}
              className="flex flex-col justify-between rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-lg bg-[var(--surface-2)] px-2.5 py-1 text-xs font-semibold text-[var(--ink-muted)]">
                    {w.type}
                  </span>
                  {wallets.length > 1 && (
                    <>
                      {isConfirming ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => void handleConfirmRemove(w.id)}
                            className="min-h-10 rounded-lg bg-[var(--expense)] px-2.5 text-xs font-semibold text-white"
                          >
                            Remove
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmRemoveId(null)}
                            className="min-h-10 rounded-lg border border-[var(--border)] px-2 text-xs font-medium text-[var(--ink-muted)]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmRemoveId(w.id)}
                          aria-label={`Remove or archive ${w.name}`}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--expense)]"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
                <h2 className="mt-3 text-base font-bold text-[var(--ink)]">
                  {w.name}
                </h2>
                <p className="tabular-nums mt-1.5 break-words text-2xl font-bold text-[var(--ink)]">
                  {formatCurrency(w.balance, w.currency)}
                </p>
              </div>
              <p className="tabular-nums mt-4 text-xs text-[var(--ink-muted)]">
                Opening balance: {formatCurrency(w.initialBalance, w.currency)}
              </p>
            </div>
          );
        })}
      </div>

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
          <div className="sm:col-span-4">
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
              placeholder="BCA Savings, GoPay, Cash"
              value={walletName}
              onChange={(e) => setWalletName(e.target.value)}
              className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]"
            />
          </div>

          <div className="sm:col-span-3">
            <label
              htmlFor="wallet-type"
              className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
            >
              Account Type
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

          <div className="sm:col-span-3">
            <label
              htmlFor="wallet-initial"
              className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
            >
              Opening Balance ({currency})
            </label>
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
    </div>
  );
}
