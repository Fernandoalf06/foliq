import { describe, expect, it } from "vitest";
import {
  clampTimezoneOffset,
  computeBudgetProgress,
  computeCashflow,
  computeWalletBalances,
  escapeCsvCell,
  formatCurrency,
  getMonthRangeForOffset,
  toLocalDateKey,
  toMinorUnits,
} from "./money";

describe("money utilities", () => {
  it("converts decimal values accurately without float drift", () => {
    expect(toMinorUnits("100000.00")).toBe(10000000);
    expect(toMinorUnits(19.99)).toBe(1999);
    expect(toMinorUnits("0.10") + toMinorUnits("0.20")).toBe(30);
    expect(toMinorUnits("-50.25")).toBe(-5025);
  });

  it("computes wallet balances accurately across income, expense, and transfer", () => {
    const wallets = [
      { id: "bank", initialBalance: 5000000 },
      { id: "ewallet", initialBalance: 250000 },
      { id: "cash", initialBalance: 100000 },
    ];
    const transactions = [
      { type: "INCOME" as const, amount: 2000000, walletId: "bank" },
      { type: "EXPENSE" as const, amount: 75000, walletId: "cash" },
      {
        type: "TRANSFER" as const,
        amount: 500000,
        walletId: "bank",
        targetWalletId: "ewallet",
      },
      { type: "EXPENSE" as const, amount: 45000, walletId: "ewallet" },
    ];

    const balances = computeWalletBalances(wallets, transactions);
    expect(balances.get("bank")).toBe(6500000);
    expect(balances.get("ewallet")).toBe(705000);
    expect(balances.get("cash")).toBe(25000);

    const netWorth =
      (balances.get("bank") ?? 0) +
      (balances.get("ewallet") ?? 0) +
      (balances.get("cash") ?? 0);
    expect(netWorth).toBe(5350000 + 2000000 - 120000);
  });

  it("excludes transfers from monthly cashflow income and expense totals", () => {
    const flow = computeCashflow([
      { type: "INCOME", amount: 10000000, walletId: "bank" },
      { type: "EXPENSE", amount: 2500000, walletId: "bank" },
      {
        type: "TRANSFER",
        amount: 3000000,
        walletId: "bank",
        targetWalletId: "ewallet",
      },
    ]);

    expect(flow.income).toBe(10000000);
    expect(flow.expense).toBe(2500000);
    expect(flow.net).toBe(7500000);
    expect(flow.savingsRate).toBe(75);
  });

  it("classifies budget utilization accurately", () => {
    expect(computeBudgetProgress(400000, 1000000)).toEqual({
      percent: 40,
      remaining: 600000,
      status: "safe",
    });
    expect(computeBudgetProgress(850000, 1000000)).toEqual({
      percent: 85,
      remaining: 150000,
      status: "warning",
    });
    expect(computeBudgetProgress(1200000, 1000000)).toEqual({
      percent: 120,
      remaining: -200000,
      status: "exceeded",
    });
  });

  it("computes local timezone month ranges and date keys accurately for WIB (UTC+7)", () => {
    // Asia/Jakarta (UTC+7) -> JS getTimezoneOffset() is -420
    const { start, end } = getMonthRangeForOffset("2026-11", -420);
    expect(start.toISOString()).toBe("2026-10-31T17:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-30T17:00:00.000Z");

    // 2026-11-01 02:30 WIB is 2026-10-31T19:30:00Z
    const earlyMorningWib = new Date("2026-10-31T19:30:00.000Z");
    expect(earlyMorningWib >= start && earlyMorningWib < end).toBe(true);
    expect(toLocalDateKey(earlyMorningWib, -420)).toBe("2026-11-01");

    // Extreme offsets are clamped safely
    expect(clampTimezoneOffset(99999)).toBe(840);
    expect(clampTimezoneOffset(-99999)).toBe(-840);
  });

  it("neutralizes CSV formula injection while preserving numeric columns", () => {
    expect(formatCurrency(50000, "IDR", { signed: true })).toContain("+");
    expect(formatCurrency(-50000, "IDR")).toContain("-");
    expect(escapeCsvCell('Coffee, "iced"')).toBe('"Coffee, ""iced"""');
    expect(escapeCsvCell("=SUM(A1:A5)")).toBe("'=SUM(A1:A5)");
    expect(escapeCsvCell("+bonus")).toBe("'+bonus");
    expect(escapeCsvCell("-10+20")).toBe("'-10+20");
    expect(escapeCsvCell("@account")).toBe("'@account");
    expect(escapeCsvCell("-50000", { numeric: true })).toBe("-50000");
    expect(escapeCsvCell("Normal note")).toBe("Normal note");
  });
});
