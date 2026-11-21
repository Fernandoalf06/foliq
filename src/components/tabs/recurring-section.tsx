"use client";

import React, { useState } from "react";
import { CategoryGlyph, RepeatIcon, TrashIcon } from "../icons";
import { formatCurrency } from "@/lib/money";
import type {
  CategoryItem,
  CategoryType,
  RecurringCadence,
  RecurringRuleItem,
  WalletItem,
} from "@/lib/types";

interface RecurringSectionProps {
  rules: RecurringRuleItem[];
  wallets: WalletItem[];
  categories: CategoryItem[];
  currency: string;
  onRefresh: () => Promise<void>;
  onRecordRule: (id: string) => Promise<void>;
}

function toLocalDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDueDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function RecurringSection({
  rules,
  wallets,
  categories,
  currency,
  onRefresh,
  onRecordRule,
}: RecurringSectionProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<CategoryType>("EXPENSE");
  const [amount, setAmount] = useState("");
  const [selectedWalletId, setSelectedWalletId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [cadence, setCadence] = useState<RecurringCadence>("MONTHLY");
  const [nextDueLocal, setNextDueLocal] = useState(() =>
    toLocalDateInput(new Date()),
  );
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [recordingId, setRecordingId] = useState<string | null>(null);

  const effectiveWalletId = wallets.some((w) => w.id === selectedWalletId)
    ? selectedWalletId
    : (wallets[0]?.id ?? "");

  const matchingCategories = categories.filter((c) => c.type === type);
  const effectiveCategoryId = matchingCategories.some(
    (c) => c.id === selectedCategoryId,
  )
    ? selectedCategoryId
    : (matchingCategories[0]?.id ?? "");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const parsedDate = new Date(`${nextDueLocal}T09:00:00`);
    if (!nextDueLocal || Number.isNaN(parsedDate.getTime())) {
      setFeedback({ type: "error", text: "Choose a valid next due date." });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          type,
          amount: Number.parseFloat(amount),
          walletId: effectiveWalletId,
          categoryId: effectiveCategoryId,
          cadence,
          nextDueDate: parsedDate.toISOString(),
          note: note.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({
          type: "error",
          text: json.error || "Failed to save recurring rule.",
        });
        setSubmitting(false);
        return;
      }
      setTitle("");
      setAmount("");
      setNote("");
      setFeedback({ type: "success", text: "Recurring schedule saved." });
      await onRefresh();
    } catch {
      setFeedback({
        type: "error",
        text: "Network error while saving recurring rule.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (rule: RecurringRuleItem) => {
    setFeedback(null);
    try {
      const res = await fetch(`/api/recurring/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !rule.isActive }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setFeedback({
          type: "error",
          text: json.error || "Could not update recurring status.",
        });
        return;
      }
      await onRefresh();
    } catch {
      setFeedback({
        type: "error",
        text: "Network error while updating recurring status.",
      });
    }
  };

  const handleDelete = async (id: string) => {
    setFeedback(null);
    try {
      const res = await fetch(`/api/recurring/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setFeedback({
          type: "error",
          text: json.error || "Could not delete recurring rule.",
        });
        return;
      }
      setConfirmDeleteId(null);
      await onRefresh();
    } catch {
      setFeedback({
        type: "error",
        text: "Network error while deleting recurring rule.",
      });
    }
  };

  const handleRecordNow = async (id: string) => {
    setRecordingId(id);
    await onRecordRule(id);
    setRecordingId(null);
  };

  return (
    <div className="space-y-5">
      {rules.length === 0 ? (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-6">
          <h2 className="text-base font-bold text-[var(--ink)]">
            No recurring bills or income yet
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Add rent, internet, subscriptions, or monthly salary below to record
            them in one tap whenever they are due.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {rules.map((rule) => {
            const isIncome = rule.type === "INCOME";
            const isConfirming = confirmDeleteId === rule.id;
            const statusText = !rule.isActive
              ? "Paused"
              : rule.dueStatus === "due"
                ? "Due now"
                : rule.dueStatus === "upcoming"
                  ? "Upcoming (7d)"
                  : "Scheduled";
            const statusColor = !rule.isActive
              ? "var(--ink-muted)"
              : rule.dueStatus === "due"
                ? "var(--expense)"
                : rule.dueStatus === "upcoming"
                  ? "var(--warning)"
                  : "var(--income)";

            return (
              <div
                key={rule.id}
                className="flex flex-col justify-between rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--ink)]">
                        <CategoryGlyph
                          icon={rule.category.icon}
                          className="h-4 w-4"
                        />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-bold text-[var(--ink)]">
                          {rule.title}
                        </h3>
                        <p className="truncate text-xs text-[var(--ink-muted)]">
                          {rule.wallet.name} · {rule.category.name} ·{" "}
                          {rule.cadence.toLowerCase()}
                        </p>
                      </div>
                    </div>

                    {isConfirming ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => void handleDelete(rule.id)}
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
                        onClick={() => setConfirmDeleteId(rule.id)}
                        aria-label={`Delete recurring rule ${rule.title}`}
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--expense)]"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
                    <p
                      className="tabular-nums text-xl font-bold"
                      style={{
                        color: isIncome ? "var(--income)" : "var(--expense)",
                      }}
                    >
                      {formatCurrency(
                        isIncome ? rule.amount : -rule.amount,
                        currency,
                        { signed: isIncome },
                      )}
                    </p>
                    <span
                      className="text-xs font-semibold"
                      style={{ color: statusColor }}
                    >
                      {statusText} · Next: {formatDueDate(rule.nextDueDate)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!rule.isActive || recordingId === rule.id}
                    onClick={() => void handleRecordNow(rule.id)}
                    className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
                  >
                    <RepeatIcon className="h-3.5 w-3.5" />
                    <span>
                      {recordingId === rule.id ? "Recording..." : "Record Now"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleToggleActive(rule)}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 text-xs font-semibold text-[var(--ink)] hover:border-[var(--accent)]"
                  >
                    {rule.isActive ? "Pause" : "Resume"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Recurring Rule Form */}
      <section className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-6">
        <h2 className="text-base font-bold text-[var(--ink)]">
          Add Recurring Bill or Income
        </h2>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Schedule repeating bills, subscriptions, or salary so you can post
          them to your ledger in one tap.
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
              htmlFor="rec-title"
              className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
            >
              Title
            </label>
            <input
              id="rec-title"
              type="text"
              required
              maxLength={60}
              placeholder="Internet, Rent, Monthly Salary"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]"
            />
          </div>

          <div className="sm:col-span-3">
            <label
              htmlFor="rec-type"
              className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
            >
              Type
            </label>
            <select
              id="rec-type"
              value={type}
              onChange={(e) => setType(e.target.value as CategoryType)}
              className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--ink)]"
            >
              <option value="EXPENSE">Expense</option>
              <option value="INCOME">Income</option>
            </select>
          </div>

          <div className="sm:col-span-4">
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <label
                htmlFor="rec-amount"
                className="block text-sm font-medium text-[var(--ink)]"
              >
                Amount ({currency})
              </label>
              {amount.trim() !== "" &&
                Number.isFinite(Number.parseFloat(amount)) &&
                Number.parseFloat(amount) > 0 && (
                  <span className="tabular-nums text-xs font-semibold text-[var(--accent-text)]">
                    {formatCurrency(Number.parseFloat(amount), currency)}
                  </span>
                )}
            </div>
            <input
              id="rec-amount"
              type="number"
              step="any"
              min="1"
              required
              inputMode="decimal"
              placeholder="350000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="tabular-nums h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]"
            />
          </div>

          <div className="sm:col-span-4">
            <label
              htmlFor="rec-wallet"
              className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
            >
              Wallet
            </label>
            <select
              id="rec-wallet"
              value={effectiveWalletId}
              onChange={(e) => setSelectedWalletId(e.target.value)}
              className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--ink)]"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-4">
            <label
              htmlFor="rec-category"
              className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
            >
              Category
            </label>
            <select
              id="rec-category"
              value={effectiveCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--ink)]"
            >
              {matchingCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-4">
            <label
              htmlFor="rec-cadence"
              className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
            >
              Frequency
            </label>
            <select
              id="rec-cadence"
              value={cadence}
              onChange={(e) => setCadence(e.target.value as RecurringCadence)}
              className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--ink)]"
            >
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>

          <div className="sm:col-span-4">
            <label
              htmlFor="rec-due"
              className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
            >
              Next Due Date
            </label>
            <input
              id="rec-due"
              type="date"
              required
              value={nextDueLocal}
              onChange={(e) => setNextDueLocal(e.target.value)}
              className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--ink)]"
            />
          </div>

          <div className="sm:col-span-5">
            <label
              htmlFor="rec-note"
              className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
            >
              Note (optional)
            </label>
            <input
              id="rec-note"
              type="text"
              maxLength={240}
              placeholder="Account number or reminder"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]"
            />
          </div>

          <div className="flex items-end sm:col-span-3">
            <button
              type="submit"
              disabled={submitting || wallets.length === 0}
              className="h-12 w-full rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Schedule"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
