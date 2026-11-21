import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  buildTrailingMonthKeys,
  computeGoalProgress,
  convertCurrencyAmount,
  formatShortMonthLabel,
  resolveExchangeRate,
  SUPPORTED_CURRENCIES,
  type SavedRateRecord,
} from "@/lib/currency";
import {
  clampTimezoneOffset,
  computeBudgetProgress,
  computeCashflow,
  formatMonthKey,
  fromMinorUnits,
  getMonthRangeForOffset,
  toLocalDateKey,
  toMinorUnits,
} from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getRecurringDueStatus } from "@/lib/recurring";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawMonth = request.nextUrl.searchParams.get("month");
    const rawTzOffset = request.nextUrl.searchParams.get("tzOffset");
    const parsedTz =
      rawTzOffset !== null ? Number.parseInt(rawTzOffset, 10) : 0;
    const tzOffset = clampTimezoneOffset(
      Number.isFinite(parsedTz) ? parsedTz : 0,
    );

    const month =
      rawMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(rawMonth)
        ? rawMonth
        : formatMonthKey(new Date());
    const { start, end } = getMonthRangeForOffset(month, tzOffset);

    const trendMonthKeys = buildTrailingMonthKeys(month, 12);
    const { start: trendStart } = getMonthRangeForOffset(
      trendMonthKeys[0],
      tzOffset,
    );

    const [
      allWallets,
      categories,
      sourceSums,
      incomingTransferSums,
      monthTransactions,
      budgets,
      recurringRules,
      savingsGoals,
      savedRateRows,
      trendTransactions,
    ] = await Promise.all([
      prisma.wallet.findMany({
        where: { userId: user.id },
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
          wallet: { select: { id: true, name: true, type: true, currency: true } },
          targetWallet: {
            select: { id: true, name: true, type: true, currency: true },
          },
          category: { select: { id: true, name: true, icon: true, type: true } },
        },
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      }),
      prisma.budget.findMany({
        where: { userId: user.id, month },
        include: {
          category: { select: { id: true, name: true, icon: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.recurringRule.findMany({
        where: { userId: user.id },
        include: {
          wallet: { select: { id: true, name: true, type: true } },
          category: { select: { id: true, name: true, icon: true, type: true } },
        },
        orderBy: [{ isActive: "desc" }, { nextDueDate: "asc" }],
      }),
      prisma.savingsGoal.findMany({
        where: { userId: user.id },
        include: {
          wallet: { select: { id: true, name: true, currency: true } },
        },
        orderBy: [{ isCompleted: "asc" }, { createdAt: "asc" }],
      }),
      prisma.exchangeRate.findMany({
        where: { userId: user.id },
      }),
      prisma.transaction.findMany({
        where: {
          userId: user.id,
          type: { in: ["INCOME", "EXPENSE"] },
          occurredAt: { gte: trendStart },
        },
        select: {
          type: true,
          amount: true,
          occurredAt: true,
          walletId: true,
        },
      }),
    ]);

    const savedRates: SavedRateRecord[] = savedRateRows.map((r) => ({
      fromCurrency: r.fromCurrency,
      toCurrency: r.toCurrency,
      rate: Number(r.rate.toString()),
    }));

    const walletCurrencyById = new Map<string, string>();
    const activeWalletIds = new Set<string>();
    for (const w of allWallets) {
      walletCurrencyById.set(w.id, w.currency);
      if (!w.isArchived) activeWalletIds.add(w.id);
    }

    const toPrimaryAmount = (amountNum: number, walletCurrency: string) =>
      convertCurrencyAmount(amountNum, walletCurrency, user.currency, savedRates);

    // Aggregate exact wallet balances in minor units using PostgreSQL groupBy sums
    const balancesMinor = new Map<string, number>();
    for (const w of allWallets) {
      balancesMinor.set(w.id, toMinorUnits(w.initialBalance.toString()));
    }

    for (const row of sourceSums) {
      const current = balancesMinor.get(row.walletId);
      if (current === undefined || !row._sum.amount) continue;
      const minor = toMinorUnits(row._sum.amount.toString());
      if (row.type === "INCOME") {
        balancesMinor.set(row.walletId, current + minor);
      } else {
        balancesMinor.set(row.walletId, current - minor);
      }
    }

    for (const row of incomingTransferSums) {
      if (!row.targetWalletId || !row._sum.amount) continue;
      const current = balancesMinor.get(row.targetWalletId);
      if (current === undefined) continue;
      const minor = toMinorUnits(row._sum.amount.toString());
      balancesMinor.set(row.targetWalletId, current + minor);
    }

    const toSerializedWallet = (w: (typeof allWallets)[number]) => {
      const balance = fromMinorUnits(balancesMinor.get(w.id) ?? 0);
      const resolved = resolveExchangeRate(w.currency, user.currency, savedRates);
      const balanceInPrimary = toPrimaryAmount(balance, w.currency);
      return {
        id: w.id,
        name: w.name,
        type: w.type,
        currency: w.currency,
        initialBalance: Number(w.initialBalance.toString()),
        balance,
        balanceInPrimary,
        exchangeRate: Number(resolved.rate.toFixed(6)),
      };
    };

    const serializedWallets = allWallets
      .filter((w) => !w.isArchived)
      .map(toSerializedWallet);
    const archivedWallets = allWallets
      .filter((w) => w.isArchived)
      .map(toSerializedWallet);

    const netWorthMinor = serializedWallets.reduce(
      (sum, w) => sum + toMinorUnits(w.balanceInPrimary),
      0,
    );

    const monthEntriesInPrimary = monthTransactions.map((tx) => {
      const converted = toPrimaryAmount(
        Number(tx.amount.toString()),
        tx.wallet.currency,
      );
      return {
        type: tx.type,
        amount: converted,
        walletId: tx.walletId,
        targetWalletId: tx.targetWalletId,
        categoryId: tx.categoryId,
      };
    });

    const cashflow = computeCashflow(monthEntriesInPrimary);

    const spendByCategoryMinor = new Map<string, number>();
    const dailyMap = new Map<string, { income: number; expense: number }>();

    for (const tx of monthTransactions) {
      const converted = toPrimaryAmount(
        Number(tx.amount.toString()),
        tx.wallet.currency,
      );
      const minor = toMinorUnits(converted);
      const dayKey = toLocalDateKey(tx.occurredAt, tzOffset);
      const bucket = dailyMap.get(dayKey) ?? { income: 0, expense: 0 };

      if (tx.type === "EXPENSE") {
        bucket.expense += minor;
        if (tx.categoryId) {
          spendByCategoryMinor.set(
            tx.categoryId,
            (spendByCategoryMinor.get(tx.categoryId) ?? 0) + minor,
          );
        }
      } else if (tx.type === "INCOME") {
        bucket.income += minor;
      }
      dailyMap.set(dayKey, bucket);
    }

    const dailySeries = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, totals]) => ({
        date,
        label: date.slice(8, 10),
        income: fromMinorUnits(totals.income),
        expense: fromMinorUnits(totals.expense),
      }));

    // Build 12-month cashflow & reconstructed month-end net worth trend
    const trendBuckets = new Map<
      string,
      { income: number; expense: number; activeNet: number }
    >();
    for (const key of trendMonthKeys) {
      trendBuckets.set(key, { income: 0, expense: 0, activeNet: 0 });
    }

    let postSelectedMonthActiveNetMinor = 0;
    for (const tx of trendTransactions) {
      const walletCurr = walletCurrencyById.get(tx.walletId) ?? user.currency;
      const convertedMinor = toMinorUnits(
        toPrimaryAmount(Number(tx.amount.toString()), walletCurr),
      );
      const signedMinor =
        tx.type === "INCOME" ? convertedMinor : -convertedMinor;

      if (tx.occurredAt >= end) {
        if (activeWalletIds.has(tx.walletId)) {
          postSelectedMonthActiveNetMinor += signedMinor;
        }
        continue;
      }

      const monthKey = toLocalDateKey(tx.occurredAt, tzOffset).slice(0, 7);
      const bucket = trendBuckets.get(monthKey);
      if (!bucket) continue;

      if (tx.type === "INCOME") {
        bucket.income += convertedMinor;
      } else if (tx.type === "EXPENSE") {
        bucket.expense += convertedMinor;
      }
      if (activeWalletIds.has(tx.walletId)) {
        bucket.activeNet += signedMinor;
      }
    }

    const monthEndNetWorthMinor = new Array<number>(trendMonthKeys.length).fill(0);
    let runningNetWorth = netWorthMinor - postSelectedMonthActiveNetMinor;
    for (let i = trendMonthKeys.length - 1; i >= 0; i -= 1) {
      monthEndNetWorthMinor[i] = runningNetWorth;
      const bucket = trendBuckets.get(trendMonthKeys[i]);
      if (bucket) {
        runningNetWorth -= bucket.activeNet;
      }
    }

    const monthlyTrend = trendMonthKeys.map((key, idx) => {
      const bucket = trendBuckets.get(key) ?? {
        income: 0,
        expense: 0,
        activeNet: 0,
      };
      return {
        month: key,
        label: formatShortMonthLabel(key),
        income: fromMinorUnits(bucket.income),
        expense: fromMinorUnits(bucket.expense),
        net: fromMinorUnits(bucket.income - bucket.expense),
        netWorth: fromMinorUnits(monthEndNetWorthMinor[idx]),
      };
    });

    const categoryBreakdown = categories
      .filter((c) => c.type === "EXPENSE")
      .map((c) => ({
        categoryId: c.id,
        name: c.name,
        icon: c.icon,
        total: fromMinorUnits(spendByCategoryMinor.get(c.id) ?? 0),
      }))
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total);

    const serializedBudgets = budgets.map((b) => {
      const limitAmount = Number(b.limitAmount.toString());
      const spent = fromMinorUnits(
        spendByCategoryMinor.get(b.categoryId) ?? 0,
      );
      const progress = computeBudgetProgress(spent, limitAmount);
      return {
        id: b.id,
        month: b.month,
        categoryId: b.categoryId,
        categoryName: b.category.name,
        categoryIcon: b.category.icon,
        limitAmount,
        spent,
        ...progress,
      };
    });

    const serializedTransactions = monthTransactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: Number(tx.amount.toString()),
      note: tx.note,
      occurredAt: tx.occurredAt.toISOString(),
      wallet: tx.wallet,
      targetWallet: tx.targetWallet,
      category: tx.category,
    }));

    const now = new Date();
    const serializedRecurring = recurringRules.map((r) => ({
      id: r.id,
      title: r.title,
      type: r.type,
      amount: Number(r.amount.toString()),
      cadence: r.cadence,
      nextDueDate: r.nextDueDate.toISOString(),
      dueStatus: getRecurringDueStatus(r.nextDueDate, now, tzOffset),
      isActive: r.isActive,
      note: r.note,
      wallet: r.wallet,
      category: r.category,
    }));

    const serializedGoals = savingsGoals.map((g) => {
      const targetAmount = Number(g.targetAmount.toString());
      const currentAmount = Number(g.currentAmount.toString());
      return {
        id: g.id,
        name: g.name,
        targetAmount,
        currentAmount,
        currency: g.currency,
        targetDate: g.targetDate ? g.targetDate.toISOString() : null,
        note: g.note,
        isCompleted: g.isCompleted,
        wallet: g.wallet,
        ...computeGoalProgress(currentAmount, targetAmount),
      };
    });

    const exchangeRates = SUPPORTED_CURRENCIES.filter(
      (c) => c !== user.currency,
    ).map((fromCurrency) => {
      const resolved = resolveExchangeRate(fromCurrency, user.currency, savedRates);
      const exactRow = savedRateRows.find(
        (r) =>
          (r.fromCurrency === fromCurrency && r.toCurrency === user.currency) ||
          (r.fromCurrency === user.currency && r.toCurrency === fromCurrency),
      );
      return {
        fromCurrency,
        toCurrency: user.currency,
        rate: Number(resolved.rate.toFixed(6)),
        isCustom: resolved.isCustom,
        updatedAt: exactRow ? exactRow.updatedAt.toISOString() : null,
      };
    });

    return NextResponse.json({
      user,
      month,
      netWorth: fromMinorUnits(netWorthMinor),
      cashflow,
      wallets: serializedWallets,
      archivedWallets,
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        icon: c.icon,
      })),
      transactions: serializedTransactions,
      budgets: serializedBudgets,
      recurringRules: serializedRecurring,
      savingsGoals: serializedGoals,
      exchangeRates,
      categoryBreakdown,
      dailySeries,
      monthlyTrend,
    });
  } catch (error) {
    console.error("Dashboard GET error:", error);
    return NextResponse.json(
      { error: "Failed to load financial overview" },
      { status: 500 },
    );
  }
}
