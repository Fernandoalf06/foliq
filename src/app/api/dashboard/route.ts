import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
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

    const [
      wallets,
      categories,
      sourceSums,
      incomingTransferSums,
      monthTransactions,
      budgets,
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
          wallet: { select: { id: true, name: true, type: true } },
          targetWallet: { select: { id: true, name: true, type: true } },
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
    ]);

    // Aggregate exact wallet balances in minor units using PostgreSQL groupBy sums
    const balancesMinor = new Map<string, number>();
    for (const w of wallets) {
      balancesMinor.set(w.id, toMinorUnits(w.initialBalance.toString()));
    }

    for (const row of sourceSums) {
      const current = balancesMinor.get(row.walletId);
      if (current === undefined || !row._sum.amount) continue;
      const minor = toMinorUnits(row._sum.amount.toString());
      if (row.type === "INCOME") {
        balancesMinor.set(row.walletId, current + minor);
      } else {
        // Both EXPENSE and outgoing TRANSFER reduce source wallet balance
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

    const serializedWallets = wallets.map((w) => ({
      id: w.id,
      name: w.name,
      type: w.type,
      currency: w.currency,
      initialBalance: Number(w.initialBalance.toString()),
      balance: fromMinorUnits(balancesMinor.get(w.id) ?? 0),
    }));

    const netWorthMinor = serializedWallets.reduce(
      (sum, w) => sum + toMinorUnits(w.balance),
      0,
    );

    const monthEntries = monthTransactions.map((tx) => ({
      type: tx.type,
      amount: tx.amount.toString(),
      walletId: tx.walletId,
      targetWalletId: tx.targetWalletId,
      categoryId: tx.categoryId,
    }));

    const cashflow = computeCashflow(monthEntries);

    const spendByCategoryMinor = new Map<string, number>();
    const dailyMap = new Map<string, { income: number; expense: number }>();

    for (const tx of monthTransactions) {
      const minor = toMinorUnits(tx.amount.toString());
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

    return NextResponse.json({
      user,
      month,
      netWorth: fromMinorUnits(netWorthMinor),
      cashflow,
      wallets: serializedWallets,
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        icon: c.icon,
      })),
      transactions: serializedTransactions,
      budgets: serializedBudgets,
      categoryBreakdown,
      dailySeries,
    });
  } catch (error) {
    console.error("Dashboard GET error:", error);
    return NextResponse.json(
      { error: "Failed to load financial overview" },
      { status: 500 },
    );
  }
}
