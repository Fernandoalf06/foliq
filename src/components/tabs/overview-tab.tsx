"use client";

import React, { useState } from "react";
import { CashflowChart } from "../cashflow-chart";
import {
  CategoryGlyph,
  PlusIcon,
  RepeatIcon,
  TargetIcon,
  TransferIcon,
} from "../icons";
import { TransactionRow } from "../transaction-row";
import { TrendChart } from "../trend-chart";
import { formatCurrency } from "@/lib/money";
import type {
  DashboardPayload,
  TransactionItem,
  TransactionType,
} from "@/lib/types";

interface OverviewTabProps {
  data: DashboardPayload;
  currency: string;
  monthLabel: string;
  onOpenQuickEntry: (type: TransactionType) => void;
  onEditTransaction: (tx: TransactionItem) => void;
  onRecordRecurring: (id: string) => Promise<void>;
  onNavigateTab: (tab: "ledger" | "budgets" | "wallets") => void;
}

export function OverviewTab({
  data,
  currency,
  monthLabel,
  onOpenQuickEntry,
  onEditTransaction,
  onRecordRecurring,
  onNavigateTab,
}: OverviewTabProps) {
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const dueOrUpcoming = data.recurringRules.filter(
    (r) =>
      r.isActive && (r.dueStatus === "due" || r.dueStatus === "upcoming"),
  );

  const handleRecord = async (id: string) => {
    setRecordingId(id);
    await onRecordRecurring(id);
    setRecordingId(null);
  };
  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-12">
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-6 md:col-span-7">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
            Total Net Balance
          </p>
          <p className="tabular-nums mt-2 break-words text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
            {formatCurrency(data.netWorth, currency)}
          </p>
          <p className="mt-2 text-xs text-[var(--ink-muted)]">
            Across {data.wallets.length} active{" "}
            {data.wallets.length === 1 ? "wallet" : "wallets"}
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => onOpenQuickEntry("EXPENSE")}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] active:scale-[0.98]"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Add Expense</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenQuickEntry("INCOME")}
              className="inline-flex h-11 items-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 text-sm font-semibold text-[var(--ink)] hover:border-[var(--accent)] active:scale-[0.98]"
            >
              Record Income
            </button>
            <button
              type="button"
              onClick={() => onOpenQuickEntry("TRANSFER")}
              className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3.5 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface-2)] active:scale-[0.98]"
            >
              <TransferIcon className="h-4 w-4" />
              <span>Transfer</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:col-span-5 md:grid-cols-1">
          <div className="min-w-0 rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:p-5">
            <p className="text-xs font-semibold text-[var(--ink-muted)]">
              Income ({monthLabel})
            </p>
            <p
              className="tabular-nums mt-1.5 break-words text-xl font-bold sm:text-2xl"
              style={{ color: "var(--income)" }}
            >
              {formatCurrency(data.cashflow.income, currency, {
                signed: data.cashflow.income > 0,
              })}
            </p>
          </div>

          <div className="min-w-0 rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:p-5">
            <p className="text-xs font-semibold text-[var(--ink-muted)]">
              Expenses ({monthLabel})
            </p>
            <p
              className="tabular-nums mt-1.5 break-words text-xl font-bold sm:text-2xl"
              style={{ color: "var(--expense)" }}
            >
              {formatCurrency(
                data.cashflow.expense > 0 ? -data.cashflow.expense : 0,
                currency,
              )}
            </p>
            {data.cashflow.income > 0 && (
              <p className="tabular-nums mt-1 text-xs text-[var(--ink-muted)]">
                Net{" "}
                {formatCurrency(data.cashflow.net, currency, { signed: true })}{" "}
                ({data.cashflow.savingsRate}% saved)
              </p>
            )}
          </div>
        </div>
      </section>

      {dueOrUpcoming.length > 0 && (
        <section className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--ink)]">
              <RepeatIcon className="h-4 w-4 text-[var(--accent-text)]" />
              <span>Due & Upcoming Recurring ({dueOrUpcoming.length})</span>
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab("budgets")}
              className="min-h-11 px-2 text-xs font-semibold text-[var(--accent-text)] hover:underline"
            >
              Manage schedules
            </button>
          </div>
          <ul className="divide-y divide-[var(--border)]">
            {dueOrUpcoming.slice(0, 4).map((rule) => {
              const isIncome = rule.type === "INCOME";
              return (
                <li
                  key={rule.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-1 last:pb-1"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--ink)]">
                      {rule.title}{" "}
                      <span
                        className="ml-1 text-xs font-semibold"
                        style={{
                          color:
                            rule.dueStatus === "due"
                              ? "var(--expense)"
                              : "var(--warning)",
                        }}
                      >
                        ({rule.dueStatus === "due" ? "Due now" : "Upcoming"})
                      </span>
                    </p>
                    <p className="text-xs text-[var(--ink-muted)]">
                      {rule.wallet.name} · {rule.category.name}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2.5">
                    <span
                      className="tabular-nums text-sm font-semibold"
                      style={{
                        color: isIncome ? "var(--income)" : "var(--expense)",
                      }}
                    >
                      {formatCurrency(
                        isIncome ? rule.amount : -rule.amount,
                        currency,
                        { signed: isIncome },
                      )}
                    </span>
                    <button
                      type="button"
                      disabled={recordingId === rule.id}
                      onClick={() => void handleRecord(rule.id)}
                      className="inline-flex h-11 items-center rounded-xl bg-[var(--accent)] px-3.5 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
                    >
                      {recordingId === rule.id ? "Saving..." : "Record"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <CashflowChart
        data={data.dailySeries}
        currency={currency}
        monthLabel={monthLabel}
      />

      {data.monthlyTrend.length > 0 && (
        <TrendChart data={data.monthlyTrend} currency={currency} />
      )}

      {data.savingsGoals.length > 0 && (
        <section className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--ink)]">
              <TargetIcon className="h-4 w-4 text-[var(--accent-text)]" />
              <span>Savings Goals ({data.savingsGoals.length})</span>
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab("wallets")}
              className="min-h-11 px-2 text-xs font-semibold text-[var(--accent-text)] hover:underline"
            >
              Manage goals
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {data.savingsGoals.slice(0, 3).map((goal) => (
              <div
                key={goal.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-[var(--ink)]">
                    {goal.name}
                  </p>
                  <span className="tabular-nums shrink-0 text-xs font-semibold text-[var(--accent-text)]">
                    {goal.percent}%
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-1)]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, goal.percent)}%`,
                      backgroundColor: goal.isCompleted
                        ? "var(--income)"
                        : "var(--accent)",
                    }}
                  />
                </div>
                <p className="tabular-nums mt-2 text-xs text-[var(--ink-muted)]">
                  {formatCurrency(goal.currentAmount, goal.currency)} /{" "}
                  {formatCurrency(goal.targetAmount, goal.currency)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5 lg:col-span-7">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-[var(--ink)]">
              Recent Entries
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab("ledger")}
              className="min-h-11 px-2 text-xs font-semibold text-[var(--accent-text)] hover:underline"
            >
              View all ({data.transactions.length})
            </button>
          </div>

          {data.transactions.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm font-medium text-[var(--ink)]">
                No transactions in {monthLabel}
              </p>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                Record your first expense, income, or wallet transfer to start
                tracking.
              </p>
              <button
                type="button"
                onClick={() => onOpenQuickEntry("EXPENSE")}
                className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Record First Entry</span>
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {data.transactions.slice(0, 6).map((tx) => (
                <TransactionRow
                  key={tx.id}
                  tx={tx}
                  currency={currency}
                  allowActions
                  onEdit={onEditTransaction}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5 lg:col-span-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-[var(--ink)]">
              Top Expense Categories
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab("budgets")}
              className="min-h-11 px-2 text-xs font-semibold text-[var(--accent-text)] hover:underline"
            >
              Manage budgets
            </button>
          </div>

          {data.categoryBreakdown.length === 0 ? (
            <p className="py-6 text-sm text-[var(--ink-muted)]">
              Expense categories will appear here once you log spending in{" "}
              {monthLabel}.
            </p>
          ) : (
            <ul className="space-y-3.5">
              {data.categoryBreakdown.slice(0, 5).map((item) => {
                const share =
                  data.cashflow.expense > 0
                    ? Math.round((item.total / data.cashflow.expense) * 100)
                    : 0;
                return (
                  <li key={item.categoryId}>
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2 font-medium text-[var(--ink)]">
                        <CategoryGlyph
                          icon={item.icon}
                          className="h-4 w-4 shrink-0 text-[var(--ink-muted)]"
                        />
                        <span className="truncate">{item.name}</span>
                      </span>
                      <span className="tabular-nums shrink-0 font-semibold text-[var(--ink)]">
                        {formatCurrency(item.total, currency)} ({share}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                      <div
                        className="h-full rounded-full bg-[var(--accent)]"
                        style={{ width: `${Math.min(100, share)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
