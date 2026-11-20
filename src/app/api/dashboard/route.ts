import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  computeBudgetProgress,
  computeCashflow,
  computeWalletBalances,
  formatMonthKey,
  fromMinorUnits,
  toMinorUnits,
} from "@/lib/money";
import { prisma } from "@/lib/prisma";

function getMonthRange(monthKey: string): { start: Date; end: Date } {
  const [yearStr, monthStr] = monthKey.split("-");
  const year = Number.parseInt(yearStr, 10);
  const monthIdx = Number.parseInt(monthStr, 10) - 1;
  const start = new Date(Date.UTC(year, monthIdx, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIdx + 1, 1, 0, 0, 0));
  return { start, end };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawMonth = request.nextUrl.searchParams.get("month");
    const month =
      rawMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(rawMonth)
        ? rawMonth
        : formatMonthKey(new Date());
    const { start, end } = getMonthRange(month);

    const [wallets, categories, allLedgerRows, monthTransactions, budgets] =
      await Promise.all([
        prisma.wallet.findMany({
          where: { userId: user.id, isArchived: false },
          orderBy: { createdAt: "asc" },
        }),
        prisma.category.findMany({
          where: { userId: user.id },
          orderBy: [{ type: "asc" }, { name: "asc" }],
        }),
        prisma.transaction.findMany({
          where: { userId: user.id },
          select: {
            type: true,
            amount: true,
            walletId: true,
            targetWalletId: true,
          },
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

    const walletBalances = computeWalletBalances(
      wallets.map((w) => ({
        id: w.id,
        initialBalance: w.initialBalance.toString(),
      })),
      allLedgerRows.map((tx) => ({
        type: tx.type,
        amount: tx.amount.toString(),
        walletId: tx.walletId,
        targetWalletId: tx.targetWalletId,
      })),
    );

    const serializedWallets = wallets.map((w) => ({
      id: w.id,
      name: w.name,
      type: w.type,
      currency: w.currency,
      initialBalance: Number(w.initialBalance.toString()),
      balance: walletBalances.get(w.id) ?? 0,
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

    // Spend per category for the month (for budgets and top spending breakdown)
    const spendByCategoryMinor = new Map<string, number>();
    const dailyMap = new Map<string, { income: number; expense: number }>();

    for (const tx of monthTransactions) {
      const minor = toMinorUnits(tx.amount.toString());
      const dayKey = tx.occurredAt.toISOString().slice(0, 10);
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
