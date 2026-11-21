"use client";

import React, { useState } from "react";
import { CheckIcon, TargetIcon, TrashIcon } from "../icons";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import { formatCurrency } from "@/lib/money";
import type { SavingsGoalItem, WalletItem } from "@/lib/types";

interface GoalsSectionProps {
  goals: SavingsGoalItem[];
  wallets: WalletItem[];
  currency: string;
  onRefresh: () => Promise<void>;
}

function formatTargetDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function GoalsSection({
  goals,
  wallets,
  currency,
  onRefresh,
}: GoalsSectionProps) {
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("0");
  const [goalCurrency, setGoalCurrency] = useState(currency);
  const [targetDate, setTargetDate] = useState("");
  const [walletId, setWalletId] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [deltaByGoal, setDeltaByGoal] = useState<Record<string, string>>({});
  const [updatingGoalId, setUpdatingGoalId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const parsedTarget = Number.parseFloat(targetAmount);
    const parsedCurrent = Number.parseFloat(currentAmount || "0") || 0;
    if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      setFeedback({
        type: "error",
        text: "Enter a valid target amount greater than 0.",
      });
      return;
    }

    let isoTargetDate: string | null = null;
    if (targetDate) {
      const parsedDate = new Date(`${targetDate}T09:00:00`);
      if (Number.isNaN(parsedDate.getTime())) {
        setFeedback({ type: "error", text: "Choose a valid target date." });
        return;
      }
      isoTargetDate = parsedDate.toISOString();
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          targetAmount: parsedTarget,
          currentAmount: parsedCurrent,
          currency: goalCurrency,
          targetDate: isoTargetDate,
          walletId: walletId || null,
          note: note.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({
          type: "error",
          text: json.error || "Failed to create savings goal.",
        });
        setSubmitting(false);
        return;
      }
      setName("");
      setTargetAmount("");
      setCurrentAmount("0");
      setTargetDate("");
      setWalletId("");
      setNote("");
      setFeedback({ type: "success", text: "Savings goal created." });
      await onRefresh();
    } catch {
      setFeedback({
        type: "error",
        text: "Network error while creating savings goal.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustProgress = async (
    goalId: string,
    direction: 1 | -1,
  ) => {
    const raw = deltaByGoal[goalId] ?? "";
    const parsed = Number.parseFloat(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setFeedback({
        type: "error",
        text: "Enter an amount greater than 0 to contribute or withdraw.",
      });
      return;
    }

    setFeedback(null);
    setUpdatingGoalId(goalId);
    try {
      const res = await fetch(`/api/goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deltaAmount: parsed * direction }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({
          type: "error",
          text: json.error || "Could not update savings progress.",
        });
        setUpdatingGoalId(null);
        return;
      }
      setDeltaByGoal((prev) => ({ ...prev, [goalId]: "" }));
      await onRefresh();
    } catch {
      setFeedback({
        type: "error",
        text: "Network error while updating savings progress.",
      });
    } finally {
      setUpdatingGoalId(null);
    }
  };

  const handleDelete = async (goalId: string) => {
    setFeedback(null);
    try {
      const res = await fetch(`/api/goals/${goalId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setFeedback({
          type: "error",
          text: json.error || "Could not delete savings goal.",
        });
        return;
      }
      setConfirmDeleteId(null);
      await onRefresh();
    } catch {
      setFeedback({
        type: "error",
        text: "Network error while deleting savings goal.",
      });
    }
  };

  return (
    <div className="space-y-5">
      {goals.length === 0 ? (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-6">
          <h2 className="text-base font-bold text-[var(--ink)]">
            No savings goals yet
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Create sinking funds for your emergency fund, travel, gadgets, or
            annual expenses and track contributions below.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {goals.map((goal) => {
            const isConfirming = confirmDeleteId === goal.id;
            const deltaVal = deltaByGoal[goal.id] ?? "";
            const barColor =
              goal.status === "completed"
                ? "var(--income)"
                : goal.status === "near"
                  ? "var(--accent)"
                  : "var(--accent)";

            return (
              <div
                key={goal.id}
                className="flex flex-col justify-between rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          backgroundColor: goal.isCompleted
                            ? "var(--income-soft)"
                            : "var(--accent-soft)",
                          color: goal.isCompleted
                            ? "var(--income)"
                            : "var(--accent-text)",
                        }}
                      >
                        {goal.isCompleted ? (
                          <CheckIcon className="h-4 w-4" />
                        ) : (
                          <TargetIcon className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-bold text-[var(--ink)]">
                          {goal.name}
                        </h3>
                        <p className="truncate text-xs text-[var(--ink-muted)]">
                          {goal.wallet ? goal.wallet.name : "Unlinked fund"}
                          {goal.targetDate
                            ? ` · Target ${formatTargetDate(goal.targetDate)}`
                            : ""}
                        </p>
                      </div>
                    </div>

                    {isConfirming ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => void handleDelete(goal.id)}
                          className="min-h-11 rounded-lg bg-[var(--expense)] px-3 text-xs font-semibold text-white"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="min-h-11 rounded-lg border border-[var(--border)] px-2.5 text-xs font-medium text-[var(--ink-muted)]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(goal.id)}
                        aria-label={`Delete savings goal ${goal.name}`}
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--expense)]"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
                    <p className="tabular-nums text-lg font-bold text-[var(--ink)]">
                      {formatCurrency(goal.currentAmount, goal.currency)}
                    </p>
                    <p className="tabular-nums text-xs font-medium text-[var(--ink-muted)]">
                      of {formatCurrency(goal.targetAmount, goal.currency)} (
                      {goal.percent}%)
                    </p>
                  </div>

                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, goal.percent)}%`,
                        backgroundColor: barColor,
                      }}
                    />
                  </div>

                  <p className="tabular-nums mt-2 text-xs text-[var(--ink-muted)]">
                    {goal.isCompleted
                      ? "Goal reached."
                      : `${formatCurrency(goal.remaining, goal.currency)} remaining`}
                    {goal.note ? ` · ${goal.note}` : ""}
                  </p>
                </div>

                {/* Quick Contribute / Withdraw controls */}
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3.5">
                  <label htmlFor={`goal-delta-${goal.id}`} className="sr-only">
                    Contribution amount for {goal.name}
                  </label>
                  <input
                    id={`goal-delta-${goal.id}`}
                    type="number"
                    step="any"
                    min="0"
                    inputMode="decimal"
                    placeholder={`Amount (${goal.currency})`}
                    value={deltaVal}
                    onChange={(e) =>
                      setDeltaByGoal((prev) => ({
                        ...prev,
                        [goal.id]: e.target.value,
                      }))
                    }
                    className="tabular-nums h-11 min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-xs text-[var(--ink)] placeholder:text-[var(--ink-muted)]"
                  />
                  <button
                    type="button"
                    disabled={updatingGoalId === goal.id}
                    onClick={() => void handleAdjustProgress(goal.id, 1)}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--accent)] px-3.5 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
                  >
                    + Add
                  </button>
                  <button
                    type="button"
                    disabled={
                      updatingGoalId === goal.id || goal.currentAmount <= 0
                    }
                    onClick={() => void handleAdjustProgress(goal.id, -1)}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-xs font-semibold text-[var(--ink)] hover:border-[var(--accent)] disabled:opacity-50"
                  >
                    Withdraw
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Savings Goal Form */}
      <section className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-6">
        <h2 className="text-base font-bold text-[var(--ink)]">
          Create a Savings Goal
        </h2>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Set a target amount and optional deadline to track dedicated savings
          separately from daily spending.
        </p>

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

        <form
          onSubmit={handleCreate}
          className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-12"
        >
          <div className="sm:col-span-5">
            <label
              htmlFor="goal-name"
              className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
            >
              Goal Name
            </label>
            <input
              id="goal-name"
              type="text"
              required
              maxLength={60}
              placeholder="Emergency Fund, Japan Trip, MacBook"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]"
            />
          </div>

          <div className="sm:col-span-4">
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <label
                htmlFor="goal-target"
                className="block text-sm font-medium text-[var(--ink)]"
              >
                Target ({goalCurrency})
              </label>
              {targetAmount.trim() !== "" &&
                Number.isFinite(Number.parseFloat(targetAmount)) &&
                Number.parseFloat(targetAmount) > 0 && (
                  <span className="tabular-nums text-xs font-semibold text-[var(--accent-text)]">
                    {formatCurrency(
                      Number.parseFloat(targetAmount),
                      goalCurrency,
                    )}
                  </span>
                )}
            </div>
            <input
              id="goal-target"
              type="number"
              step="any"
              min="1"
              required
              inputMode="decimal"
              placeholder="15000000"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="tabular-nums h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]"
            />
          </div>

          <div className="sm:col-span-3">
            <label
              htmlFor="goal-currency"
              className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
            >
              Currency
            </label>
            <select
              id="goal-currency"
              value={goalCurrency}
              onChange={(e) => setGoalCurrency(e.target.value)}
              className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--ink)]"
            >
              {SUPPORTED_CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-4">
            <label
              htmlFor="goal-current"
              className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
            >
              Already Saved ({goalCurrency})
            </label>
            <input
              id="goal-current"
              type="number"
              step="any"
              min="0"
              inputMode="decimal"
              value={currentAmount}
              onChange={(e) => setCurrentAmount(e.target.value)}
              className="tabular-nums h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 text-sm text-[var(--ink)]"
            />
          </div>

          <div className="sm:col-span-4">
            <label
              htmlFor="goal-date"
              className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
            >
              Target Date (optional)
            </label>
            <input
              id="goal-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--ink)]"
            />
          </div>

          <div className="sm:col-span-4">
            <label
              htmlFor="goal-wallet"
              className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
            >
              Linked Wallet (optional)
            </label>
            <select
              id="goal-wallet"
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--ink)]"
            >
              <option value="">None (Standalone fund)</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.currency})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-9">
            <label
              htmlFor="goal-note"
              className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
            >
              Note (optional)
            </label>
            <input
              id="goal-note"
              type="text"
              maxLength={240}
              placeholder="6 months of living expenses"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]"
            />
          </div>

          <div className="flex items-end sm:col-span-3">
            <button
              type="submit"
              disabled={submitting}
              className="h-12 w-full rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Goal"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
