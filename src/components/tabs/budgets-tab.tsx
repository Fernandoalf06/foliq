"use client";

import React, { useState } from "react";
import { CategoryGlyph, TrashIcon } from "../icons";
import { formatCurrency } from "@/lib/money";
import type { BudgetItem, CategoryItem } from "@/lib/types";

interface BudgetsTabProps {
  budgets: BudgetItem[];
  categories: CategoryItem[];
  month: string;
  monthLabel: string;
  currency: string;
  onRefresh: () => Promise<void>;
  onDeleteBudget: (id: string) => Promise<void>;
}

export function BudgetsTab({
  budgets,
  categories,
  month,
  monthLabel,
  currency,
  onRefresh,
  onDeleteBudget,
}: BudgetsTabProps) {
  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [budgetLimit, setBudgetLimit] = useState("");
  const [budgetSubmitting, setBudgetSubmitting] = useState(false);
  const [budgetFeedback, setBudgetFeedback] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<"EXPENSE" | "INCOME">(
    "EXPENSE",
  );
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const [categoryFeedback, setCategoryFeedback] = useState<string | null>(null);

  const effectiveCategoryId = expenseCategories.some(
    (c) => c.id === selectedCategoryId,
  )
    ? selectedCategoryId
    : (expenseCategories[0]?.id ?? "");

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

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryFeedback(null);
    setCategorySubmitting(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCategoryName,
          type: newCategoryType,
          icon: newCategoryType === "INCOME" ? "briefcase" : "tag",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCategoryFeedback(json.error || "Failed to add category.");
        setCategorySubmitting(false);
        return;
      }
      setNewCategoryName("");
      setCategoryFeedback("Category created.");
      await onRefresh();
    } catch {
      setCategoryFeedback("Network error while creating category.");
    } finally {
      setCategorySubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {budgets.length === 0 ? (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-6">
          <h2 className="text-base font-bold text-[var(--ink)]">
            No category budgets set for {monthLabel}
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Set a monthly spending cap below to monitor pacing with on-track,
            near-limit, and over-budget alerts.
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
                        className="min-h-10 rounded-lg bg-[var(--expense)] px-2.5 text-xs font-semibold text-white"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="min-h-10 rounded-lg border border-[var(--border)] px-2 text-xs font-medium text-[var(--ink-muted)]"
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
                  <span>Spent: {formatCurrency(b.spent, currency)}</span>
                  <span>Limit: {formatCurrency(b.limitAmount, currency)}</span>
                </div>
                <p className="tabular-nums mt-1 text-xs font-semibold text-[var(--ink)]">
                  {b.remaining >= 0
                    ? `${formatCurrency(b.remaining, currency)} remaining`
                    : `${formatCurrency(Math.abs(b.remaining), currency)} over cap`}
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

        <section className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5">
          <h2 className="text-base font-bold text-[var(--ink)]">
            Add Custom Category
          </h2>
          {categoryFeedback && (
            <p className="mt-2 text-sm font-medium text-[var(--accent-text)]">
              {categoryFeedback}
            </p>
          )}
          <form onSubmit={handleAddCategory} className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="category-name"
                className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
              >
                Category Name
              </label>
              <input
                id="category-name"
                type="text"
                required
                maxLength={32}
                placeholder="Coffee, Gym, Side Project"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]"
              />
            </div>
            <div>
              <label
                htmlFor="category-type"
                className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
              >
                Category Type
              </label>
              <select
                id="category-type"
                value={newCategoryType}
                onChange={(e) =>
                  setNewCategoryType(e.target.value as "EXPENSE" | "INCOME")
                }
                className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--ink)]"
              >
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={categorySubmitting}
              className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 text-sm font-semibold text-[var(--ink)] hover:border-[var(--accent)] disabled:opacity-50"
            >
              {categorySubmitting ? "Creating..." : "Create Category"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
