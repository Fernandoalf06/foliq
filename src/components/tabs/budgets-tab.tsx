"use client";

import React, { useState } from "react";
import { CategoryGlyph, CopyIcon, TrashIcon } from "../icons";
import { CategoriesManager } from "./categories-manager";
import { RecurringSection } from "./recurring-section";
import { formatCurrency } from "@/lib/money";
import { maskAmount } from "@/lib/preferences";
import type {
  BudgetItem,
  CategoryItem,
  RecurringRuleItem,
  WalletItem,
} from "@/lib/types";

function formatPreviousMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 2, 1)));
}

interface BudgetsTabProps {
  budgets: BudgetItem[];
  recurringRules: RecurringRuleItem[];
  wallets: WalletItem[];
  categories: CategoryItem[];
  month: string;
  monthLabel: string;
  currency: string;
  privacyMode: boolean;
  onRefresh: () => Promise<void>;
  onDeleteBudget: (id: string) => Promise<void>;
  onRecordRecurring: (id: string) => Promise<void>;
}

export function BudgetsTab({
  budgets,
  recurringRules,
  wallets,
  categories,
  month,
  monthLabel,
  currency,
  privacyMode,
  onRefresh,
  onDeleteBudget,
  onRecordRecurring,
}: BudgetsTabProps) {
  const [subView, setSubView] = useState<"caps" | "recurring">("caps");
  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [budgetLimit, setBudgetLimit] = useState("");
  const [budgetSubmitting, setBudgetSubmitting] = useState(false);
  const [budgetFeedback, setBudgetFeedback] = useState<string | null>(null);
  const [copyingBudgets, setCopyingBudgets] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const prevMonthLabel = formatPreviousMonthLabel(month);

  const effectiveCategoryId = expenseCategories.some(
    (c) => c.id === selectedCategoryId,
  )
    ? selectedCategoryId
    : (expenseCategories[0]?.id ?? "");

  const handleCopyFromPrevious = async () => {
    setCopyFeedback(null);
    setCopyingBudgets(true);
    try {
      const res = await fetch("/api/budgets/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetMonth: month }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCopyFeedback({
          type: "error",
          text: json.error || `No budgets available in ${prevMonthLabel}.`,
        });
        setCopyingBudgets(false);
        return;
      }
      const copied = Number(json.copied ?? 0);
      const skipped = Number(json.skippedExisting ?? 0);
      setCopyFeedback({
        type: "success",
        text:
          copied > 0
            ? `Copied ${copied} ${copied === 1 ? "budget" : "budgets"} from ${prevMonthLabel}${skipped > 0 ? ` (${skipped} already set)` : ""}.`
            : `All budgets from ${prevMonthLabel} are already set in ${monthLabel}.`,
      });
      await onRefresh();
    } catch {
      setCopyFeedback({
        type: "error",
        text: "Network error while copying budgets.",
      });
    } finally {
      setCopyingBudgets(false);
    }
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setBudgetFeedback(null);
    setBudgetSubmitting(true);
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: effectiveCategoryId,
          month,
          limitAmount: Number.parseFloat(budgetLimit),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBudgetFeedback(json.error || "Failed to save budget.");
        setBudgetSubmitting(false);
        return;
      }
      setBudgetLimit("");
      setBudgetFeedback("Budget saved.");
      await onRefresh();
    } catch {
      setBudgetFeedback("Network error while saving budget.");
    } finally {
      setBudgetSubmitting(false);
    }
  };

  const handleConfirmDeleteBudget = async (id: string) => {
    await onDeleteBudget(id);
    setConfirmDeleteId(null);
  };

  const dueCount = recurringRules.filter(
    (r) => r.isActive && r.dueStatus === "due",
  ).length;

  return (
    <div className="space-y-5">
      <div
        role="tablist"
        aria-label="Budgets and recurring view"
        className="grid max-w-md grid-cols-2 gap-1 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={subView === "caps"}
          onClick={() => setSubView("caps")}
          className={`min-h-11 rounded-xl px-3 text-sm font-semibold transition-colors ${
            subView === "caps"
              ? "bg-[var(--accent)] text-white"
              : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
          }`}
        >
          Monthly Caps ({budgets.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subView === "recurring"}
          onClick={() => setSubView("recurring")}
          className={`min-h-11 rounded-xl px-3 text-sm font-semibold transition-colors ${
            subView === "recurring"
              ? "bg-[var(--accent)] text-white"
              : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
          }`}
        >
          Recurring{dueCount > 0 ? ` (${dueCount} due)` : ` (${recurringRules.length})`}
        </button>
      </div>

      {subView === "recurring" ? (
        <RecurringSection
          rules={recurringRules}
          wallets={wallets}
          categories={categories}
          currency={currency}
          privacyMode={privacyMode}
          onRefresh={onRefresh}
          onRecordRule={onRecordRecurring}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              Spending Caps for {monthLabel}
            </p>
            <button
              type="button"
              disabled={copyingBudgets}
              onClick={() => void handleCopyFromPrevious()}
              className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3.5 text-xs font-semibold text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent-text)] disabled:opacity-50"
            >
              <CopyIcon className="h-3.5 w-3.5" />
              <span>
                {copyingBudgets
                  ? "Copying..."
                  : `Copy from ${prevMonthLabel}`}
              </span>
            </button>
          </div>

          {copyFeedback && (
            <div
              role={copyFeedback.type === "error" ? "alert" : "status"}
              className={`rounded-xl px-3.5 py-2.5 text-sm font-medium ${
                copyFeedback.type === "error"
                  ? "border border-[var(--expense)]/30 bg-[var(--expense-soft)] text-[var(--expense)]"
                  : "border border-[var(--income)]/30 bg-[var(--income-soft)] text-[var(--income)]"
              }`}
            >
              {copyFeedback.text}
            </div>
          )}

          {budgets.length === 0 ? (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-6">
          <h2 className="text-base font-bold text-[var(--ink)]">
            No category budgets set for {monthLabel}
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Set a monthly spending cap below or copy last month&apos;s caps in
            one tap to monitor pacing.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {budgets.map((b) => {
            const barColor =
              b.status === "exceeded"
                ? "var(--expense)"
                : b.status === "warning"
                  ? "var(--warning)"
                  : "var(--income)";
            const statusLabel =
              b.status === "exceeded"
                ? "Over budget"
                : b.status === "warning"
                  ? "Near limit"
                  : "On track";
            const isConfirming = confirmDeleteId === b.id;

            return (
              <div
                key={b.id}
                className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--ink)]">
                      <CategoryGlyph icon={b.categoryIcon} className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[var(--ink)]">
                        {b.categoryName}
                      </h2>
                      <p
                        className="text-xs font-semibold"
                        style={{ color: barColor }}
                      >
                        {statusLabel} ({b.percent}%)
                      </p>
                    </div>
                  </div>

                  {isConfirming ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void handleConfirmDeleteBudget(b.id)}
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
                      onClick={() => setConfirmDeleteId(b.id)}
                      aria-label={`Remove budget for ${b.categoryName}`}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--expense)]"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, b.percent)}%`,
                      backgroundColor: barColor,
                    }}
                  />
                </div>

                <div className="tabular-nums mt-3 flex items-center justify-between text-xs text-[var(--ink-muted)]">
                  <span>
                    Spent:{" "}
                    {maskAmount(formatCurrency(b.spent, currency), privacyMode)}
                  </span>
                  <span>
                    Limit:{" "}
                    {maskAmount(
                      formatCurrency(b.limitAmount, currency),
                      privacyMode,
                    )}
                  </span>
                </div>
                <p className="tabular-nums mt-1 text-xs font-semibold text-[var(--ink)]">
                  {b.remaining >= 0
                    ? `${maskAmount(formatCurrency(b.remaining, currency), privacyMode)} remaining`
                    : `${maskAmount(formatCurrency(Math.abs(b.remaining), currency), privacyMode)} over cap`}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5">
          <h2 className="text-base font-bold text-[var(--ink)]">
            Set Monthly Category Cap ({monthLabel})
          </h2>
          {budgetFeedback && (
            <p className="mt-2 text-sm font-medium text-[var(--accent-text)]">
              {budgetFeedback}
            </p>
          )}
          <form onSubmit={handleSaveBudget} className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="budget-category"
                className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
              >
                Expense Category
              </label>
              <select
                id="budget-category"
                value={effectiveCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
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
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <label
                  htmlFor="budget-limit"
                  className="block text-sm font-medium text-[var(--ink)]"
                >
                  Monthly Limit ({currency})
                </label>
                {budgetLimit.trim() !== "" &&
                  Number.isFinite(Number.parseFloat(budgetLimit)) &&
                  Number.parseFloat(budgetLimit) > 0 && (
                    <span
                      aria-live="polite"
                      className="tabular-nums text-xs font-semibold text-[var(--accent-text)]"
                    >
                      {formatCurrency(
                        Number.parseFloat(budgetLimit),
                        currency,
                      )}
                    </span>
                  )}
              </div>
              <input
                id="budget-limit"
                type="number"
                step="any"
                min="1"
                required
                inputMode="decimal"
                placeholder="2000000"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(e.target.value)}
                className="tabular-nums h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]"
              />
            </div>
            <button
              type="submit"
              disabled={budgetSubmitting}
              className="h-12 w-full rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {budgetSubmitting ? "Saving..." : "Save Monthly Cap"}
            </button>
          </form>
        </section>

        <CategoriesManager categories={categories} onRefresh={onRefresh} />
      </div>
        </>
      )}
    </div>
  );
}
