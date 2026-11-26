import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FoliqMark } from "@/components/icons";
import { ReportActions } from "@/components/report-actions";
import { getCurrentUser } from "@/lib/auth";
import {
  computeGoalProgress,
  convertCurrencyAmount,
  type SavedRateRecord,
} from "@/lib/currency";
import {
  clampTimezoneOffset,
  computeBudgetProgress,
  computeCashflow,
  formatCurrency,
  formatMonthKey,
  fromMinorUnits,
  getMonthRangeForOffset,
  toLocalDateKey,
  toMinorUnits,
} from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Monthly Financial Report",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function formatReadableMonth(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

export default async function MonthlyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; tzOffset?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }

  const params = await searchParams;
  const month =
    params.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month)
      ? params.month
      : formatMonthKey(new Date());
  const parsedTz =
    params.tzOffset !== undefined ? Number.parseInt(params.tzOffset, 10) : 0;
  const tzOffset = clampTimezoneOffset(
    Number.isFinite(parsedTz) ? parsedTz : 0,
  );
  const { start, end } = getMonthRangeForOffset(month, tzOffset);

  const [
    allWallets,
    categories,
    sourceSums,
    incomingTransferSums,
    monthTransactions,
    budgets,
    savingsGoals,
    savedRateRows,
  ] = await Promise.all([
    prisma.wallet.findMany({
      where: { userId: user.id, isArchived: false },
      orderBy: { createdAt: "asc" },
    }),
    prisma.category.findMany({
      where: { userId: user.id },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
    prisma.transaction.groupBy({
      by: ["walletId", "type"],
      where: { userId: user.id },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["targetWalletId"],
      where: {
        userId: user.id,
        type: "TRANSFER",
        targetWalletId: { not: null },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: {
        userId: user.id,
        occurredAt: { gte: start, lt: end },
      },
      include: {
        wallet: { select: { id: true, name: true, currency: true } },
        targetWallet: { select: { id: true, name: true, currency: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
    }),
    prisma.budget.findMany({
      where: { userId: user.id, month },
      include: { category: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.savingsGoal.findMany({
      where: { userId: user.id },
      orderBy: [{ isCompleted: "asc" }, { createdAt: "asc" }],
    }),
    prisma.exchangeRate.findMany({ where: { userId: user.id } }),
  ]);

  const savedRates: SavedRateRecord[] = savedRateRows.map((r) => ({
    fromCurrency: r.fromCurrency,
    toCurrency: r.toCurrency,
    rate: Number(r.rate.toString()),
  }));

  const toPrimary = (amount: number, curr: string) =>
    convertCurrencyAmount(amount, curr, user.currency, savedRates);

  const balancesMinor = new Map<string, number>();
  for (const w of allWallets) {
    balancesMinor.set(w.id, toMinorUnits(w.initialBalance.toString()));
  }
  for (const row of sourceSums) {
    const cur = balancesMinor.get(row.walletId);
    if (cur === undefined || !row._sum.amount) continue;
    const minor = toMinorUnits(row._sum.amount.toString());
    balancesMinor.set(row.walletId, row.type === "INCOME" ? cur + minor : cur - minor);
  }
  for (const row of incomingTransferSums) {
    if (!row.targetWalletId || !row._sum.amount) continue;
    const cur = balancesMinor.get(row.targetWalletId);
    if (cur === undefined) continue;
    balancesMinor.set(row.targetWalletId, cur + toMinorUnits(row._sum.amount.toString()));
  }

  const walletSummaries = allWallets.map((w) => {
    const balance = fromMinorUnits(balancesMinor.get(w.id) ?? 0);
    return {
      id: w.id,
      name: w.name,
      type: w.type,
      currency: w.currency,
      balance,
      balanceInPrimary: toPrimary(balance, w.currency),
    };
  });

  const netWorth = fromMinorUnits(
    walletSummaries.reduce((sum, w) => sum + toMinorUnits(w.balanceInPrimary), 0),
  );

  const cashflow = computeCashflow(
    monthTransactions.map((tx) => ({
      type: tx.type,
      amount: toPrimary(Number(tx.amount.toString()), tx.wallet.currency),
      walletId: tx.walletId,
      targetWalletId: tx.targetWalletId,
      categoryId: tx.categoryId,
    })),
  );

  const spendByCategoryMinor = new Map<string, number>();
  for (const tx of monthTransactions) {
    if (tx.type === "EXPENSE" && tx.categoryId) {
      const converted = toPrimary(Number(tx.amount.toString()), tx.wallet.currency);
      spendByCategoryMinor.set(
        tx.categoryId,
        (spendByCategoryMinor.get(tx.categoryId) ?? 0) + toMinorUnits(converted),
      );
    }
  }

  const categoryBreakdown = categories
    .filter((c) => c.type === "EXPENSE")
    .map((c) => ({
      id: c.id,
      name: c.name,
      total: fromMinorUnits(spendByCategoryMinor.get(c.id) ?? 0),
    }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  const budgetRows = budgets.map((b) => {
    const limit = Number(b.limitAmount.toString());
    const spent = fromMinorUnits(spendByCategoryMinor.get(b.categoryId) ?? 0);
    return {
      id: b.id,
      name: b.category.name,
      limit,
      spent,
      ...computeBudgetProgress(spent, limit),
    };
  });

  const goalRows = savingsGoals.map((g) => {
    const target = Number(g.targetAmount.toString());
    const current = Number(g.currentAmount.toString());
    return {
      id: g.id,
      name: g.name,
      currency: g.currency,
      target,
      current,
      ...computeGoalProgress(current, target),
    };
  });

  const monthTitle = formatReadableMonth(month);
  const generatedDate = toLocalDateKey(new Date(), tzOffset);

  return (
    <div className="min-h-dvh bg-[var(--ground)] px-4 pb-10 text-[var(--ink)] safe-top-page safe-bottom sm:px-8 print:bg-white print:p-0 print:text-slate-900">
      <div className="mx-auto max-w-4xl">
        <ReportActions />

        <article className="space-y-6 rounded-[24px] border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:p-8 print:rounded-none print:border-0 print:bg-white print:p-0">
          {/* Statement Header */}
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] pb-5 print:border-slate-300">
            <div className="flex items-center gap-3">
              <FoliqMark className="h-9 w-9" />
              <div>
                <h1 className="text-xl font-bold tracking-tight">
                  Foliq Monthly Financial Statement
                </h1>
                <p className="mt-0.5 text-sm text-[var(--ink-muted)] print:text-slate-600">
                  {monthTitle} · Prepared for {user.name}
                </p>
              </div>
            </div>
            <div className="text-left text-xs text-[var(--ink-muted)] sm:text-right print:text-slate-600">
              <p>Primary Currency: {user.currency}</p>
              <p className="tabular-nums mt-0.5">Generated: {generatedDate}</p>
            </div>
          </header>

          {/* 4-Card KPI Summary */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:break-inside-avoid">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-4 print:border-slate-300 print:bg-slate-50">
              <p className="text-xs font-semibold text-[var(--ink-muted)] print:text-slate-600">
                Total Net Balance
              </p>
              <p className="tabular-nums mt-1.5 text-lg font-bold">
                {formatCurrency(netWorth, user.currency)}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-4 print:border-slate-300 print:bg-slate-50">
              <p className="text-xs font-semibold text-[var(--ink-muted)] print:text-slate-600">
                Monthly Income
              </p>
              <p className="tabular-nums mt-1.5 text-lg font-bold text-[var(--income)] print:text-emerald-700">
                {formatCurrency(cashflow.income, user.currency)}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-4 print:border-slate-300 print:bg-slate-50">
              <p className="text-xs font-semibold text-[var(--ink-muted)] print:text-slate-600">
                Monthly Expenses
              </p>
              <p className="tabular-nums mt-1.5 text-lg font-bold text-[var(--expense)] print:text-rose-700">
                {formatCurrency(cashflow.expense, user.currency)}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-4 print:border-slate-300 print:bg-slate-50">
              <p className="text-xs font-semibold text-[var(--ink-muted)] print:text-slate-600">
                Net Cashflow ({cashflow.savingsRate}%)
              </p>
              <p className="tabular-nums mt-1.5 text-lg font-bold">
                {formatCurrency(cashflow.net, user.currency, { signed: true })}
              </p>
            </div>
          </section>

          {/* Active Wallets Snapshot */}
          <section className="print:break-inside-avoid">
            <h2 className="mb-2.5 text-sm font-bold uppercase tracking-wide text-[var(--ink-muted)] print:text-slate-600">
              Active Wallets ({walletSummaries.length})
            </h2>
            <div className="overflow-x-auto rounded-xl border border-[var(--border)] print:border-slate-300">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--surface-2)]/60 text-xs text-[var(--ink-muted)] print:border-slate-300 print:bg-slate-100 print:text-slate-700">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold sm:px-3.5">Wallet</th>
                    <th className="hidden px-3.5 py-2.5 font-semibold sm:table-cell print:table-cell">
                      Type
                    </th>
                    <th className="px-3 py-2.5 text-right font-semibold sm:px-3.5">
                      Balance
                    </th>
                    <th className="hidden px-3.5 py-2.5 text-right font-semibold sm:table-cell print:table-cell">
                      In {user.currency}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] print:divide-slate-200">
                  {walletSummaries.map((w) => (
                    <tr key={w.id}>
                      <td className="px-3 py-2.5 sm:px-3.5">
                        <p className="font-semibold text-[var(--ink)] print:text-slate-900">
                          {w.name}
                        </p>
                        <p className="text-[11px] text-[var(--ink-muted)] sm:hidden print:hidden">
                          {w.type} · {w.currency}
                        </p>
                      </td>
                      <td className="hidden px-3.5 py-2.5 text-xs text-[var(--ink-muted)] sm:table-cell print:table-cell print:text-slate-600">
                        {w.type} · {w.currency}
                      </td>
                      <td className="tabular-nums whitespace-nowrap px-3 py-2.5 text-right font-semibold sm:px-3.5 sm:font-medium">
                        <p>{formatCurrency(w.balance, w.currency)}</p>
                        {w.currency !== user.currency && (
                          <p className="text-[11px] font-medium text-[var(--ink-muted)] sm:hidden print:hidden">
                            ≈ {formatCurrency(w.balanceInPrimary, user.currency)}
                          </p>
                        )}
                      </td>
                      <td className="tabular-nums hidden whitespace-nowrap px-3.5 py-2.5 text-right font-semibold sm:table-cell print:table-cell">
                        {formatCurrency(w.balanceInPrimary, user.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Expense Breakdown & Budgets Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <section className="print:break-inside-avoid">
              <h2 className="mb-2.5 text-sm font-bold uppercase tracking-wide text-[var(--ink-muted)] print:text-slate-600">
                Expense Breakdown ({monthTitle})
              </h2>
              {categoryBreakdown.length === 0 ? (
                <p className="rounded-xl border border-[var(--border)] p-4 text-sm text-[var(--ink-muted)] print:border-slate-300">
                  No expenses recorded for {monthTitle}.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[var(--border)] print:border-slate-300">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-[var(--border)] bg-[var(--surface-2)]/60 text-xs text-[var(--ink-muted)] print:border-slate-300 print:bg-slate-100">
                      <tr>
                        <th className="px-3.5 py-2 font-semibold">Category</th>
                        <th className="px-3.5 py-2 text-right font-semibold">
                          Total
                        </th>
                        <th className="px-3.5 py-2 text-right font-semibold">
                          Share
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] print:divide-slate-200">
                      {categoryBreakdown.map((item) => {
                        const share =
                          cashflow.expense > 0
                            ? Math.round((item.total / cashflow.expense) * 100)
                            : 0;
                        return (
                          <tr key={item.id}>
                            <td className="px-3.5 py-2 font-medium">
                              {item.name}
                            </td>
                            <td className="tabular-nums px-3.5 py-2 text-right font-semibold">
                              {formatCurrency(item.total, user.currency)}
                            </td>
                            <td className="tabular-nums px-3.5 py-2 text-right text-xs text-[var(--ink-muted)] print:text-slate-600">
                              {share}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="print:break-inside-avoid">
              <h2 className="mb-2.5 text-sm font-bold uppercase tracking-wide text-[var(--ink-muted)] print:text-slate-600">
                Monthly Budgets & Goals
              </h2>
              {budgetRows.length === 0 && goalRows.length === 0 ? (
                <p className="rounded-xl border border-[var(--border)] p-4 text-sm text-[var(--ink-muted)] print:border-slate-300">
                  No budgets or savings goals configured for {monthTitle}.
                </p>
              ) : (
                <div className="space-y-3">
                  {budgetRows.length > 0 && (
                    <div className="overflow-x-auto rounded-xl border border-[var(--border)] print:border-slate-300">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-[var(--border)] bg-[var(--surface-2)]/60 text-[var(--ink-muted)] print:border-slate-300 print:bg-slate-100">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Budget</th>
                            <th className="px-3 py-2 text-right font-semibold">
                              Spent / Limit
                            </th>
                            <th className="px-3 py-2 text-right font-semibold">
                              %
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)] print:divide-slate-200">
                          {budgetRows.map((b) => (
                            <tr key={b.id}>
                              <td className="px-3 py-2 font-medium">{b.name}</td>
                              <td className="tabular-nums px-3 py-2 text-right">
                                {formatCurrency(b.spent, user.currency)} /{" "}
                                {formatCurrency(b.limit, user.currency)}
                              </td>
                              <td className="tabular-nums px-3 py-2 text-right font-semibold">
                                {b.percent}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {goalRows.length > 0 && (
                    <div className="overflow-x-auto rounded-xl border border-[var(--border)] print:border-slate-300">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-[var(--border)] bg-[var(--surface-2)]/60 text-[var(--ink-muted)] print:border-slate-300 print:bg-slate-100">
                          <tr>
                            <th className="px-3 py-2 font-semibold">
                              Savings Goal
                            </th>
                            <th className="px-3 py-2 text-right font-semibold">
                              Saved / Target
                            </th>
                            <th className="px-3 py-2 text-right font-semibold">
                              %
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)] print:divide-slate-200">
                          {goalRows.map((g) => (
                            <tr key={g.id}>
                              <td className="px-3 py-2 font-medium">{g.name}</td>
                              <td className="tabular-nums px-3 py-2 text-right">
                                {formatCurrency(g.current, g.currency)} /{" "}
                                {formatCurrency(g.target, g.currency)}
                              </td>
                              <td className="tabular-nums px-3 py-2 text-right font-semibold">
                                {g.percent}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>

          {/* Complete Chronological Ledger */}
          <section>
            <h2 className="mb-2.5 text-sm font-bold uppercase tracking-wide text-[var(--ink-muted)] print:text-slate-600">
              Transactions Ledger ({monthTransactions.length})
            </h2>
            {monthTransactions.length === 0 ? (
              <p className="rounded-xl border border-[var(--border)] p-4 text-sm text-[var(--ink-muted)] print:border-slate-300">
                No transactions recorded in {monthTitle}.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[var(--border)] print:border-slate-300">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[var(--border)] bg-[var(--surface-2)]/60 text-[var(--ink-muted)] print:border-slate-300 print:bg-slate-100">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Date</th>
                      <th className="px-3 py-2 font-semibold">Category / Type</th>
                      <th className="px-3 py-2 font-semibold">Wallet</th>
                      <th className="px-3 py-2 font-semibold">Note</th>
                      <th className="px-3 py-2 text-right font-semibold">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] print:divide-slate-200">
                    {monthTransactions.map((tx) => {
                      const amt = Number(tx.amount.toString());
                      const isIncome = tx.type === "INCOME";
                      const isTransfer = tx.type === "TRANSFER";
                      const formatted = isTransfer
                        ? formatCurrency(amt, tx.wallet.currency)
                        : formatCurrency(isIncome ? amt : -amt, tx.wallet.currency, {
                            signed: true,
                          });
                      return (
                        <tr key={tx.id}>
                          <td className="tabular-nums whitespace-nowrap px-3 py-2 text-[var(--ink-muted)] print:text-slate-600">
                            {toLocalDateKey(tx.occurredAt, tzOffset)}
                          </td>
                          <td className="px-3 py-2 font-medium">
                            {isTransfer
                              ? `Transfer to ${tx.targetWallet?.name ?? "Wallet"}`
                              : (tx.category?.name ?? tx.type)}
                          </td>
                          <td className="px-3 py-2 text-[var(--ink-muted)] print:text-slate-600">
                            {tx.wallet.name}
                          </td>
                          <td className="px-3 py-2">{tx.note || "-"}</td>
                          <td className="tabular-nums whitespace-nowrap px-3 py-2 text-right font-semibold">
                            {formatted}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </article>
      </div>
    </div>
  );
}
