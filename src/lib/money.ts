export interface LedgerEntry {
  type: "EXPENSE" | "INCOME" | "TRANSFER";
  amount: number | string;
  walletId: string;
  targetWalletId?: string | null;
  categoryId?: string | null;
}

export interface WalletSeed {
  id: string;
  initialBalance: number | string;
}

/**
 * Convert numeric or decimal string into exact integer minor units (cents).
 * Avoids IEEE-754 floating-point drift during balance and cashflow sums.
 */
export function toMinorUnits(value: number | string): number {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return 0;
    return Math.round(value * 100);
  }
  const cleaned = value.trim();
  if (!cleaned) return 0;
  const negative = cleaned.startsWith("-");
  const unsigned = negative ? cleaned.slice(1) : cleaned;
  const [wholePart = "0", fracPart = ""] = unsigned.split(".");
  const whole = Number.parseInt(wholePart.replace(/[^0-9]/g, "") || "0", 10);
  const paddedFrac = (fracPart.replace(/[^0-9]/g, "") + "00").slice(0, 2);
  const frac = Number.parseInt(paddedFrac, 10);
  const total = whole * 100 + frac;
  return negative ? -total : total;
}

export function fromMinorUnits(minor: number): number {
  return minor / 100;
}

/**
 * Compute exact current balance for every wallet from initial balance + all ledger entries.
 * Transfers subtract from source wallet and add to target wallet without affecting net worth.
 */
export function computeWalletBalances(
  wallets: WalletSeed[],
  entries: LedgerEntry[],
): Map<string, number> {
  const balancesMinor = new Map<string, number>();
  for (const w of wallets) {
    balancesMinor.set(w.id, toMinorUnits(w.initialBalance));
  }

  for (const tx of entries) {
    const minor = toMinorUnits(tx.amount);
    if (minor <= 0) continue;

    if (tx.type === "INCOME") {
      balancesMinor.set(
        tx.walletId,
        (balancesMinor.get(tx.walletId) ?? 0) + minor,
      );
    } else if (tx.type === "EXPENSE") {
      balancesMinor.set(
        tx.walletId,
        (balancesMinor.get(tx.walletId) ?? 0) - minor,
      );
    } else if (tx.type === "TRANSFER") {
      balancesMinor.set(
        tx.walletId,
        (balancesMinor.get(tx.walletId) ?? 0) - minor,
      );
      if (tx.targetWalletId) {
        balancesMinor.set(
          tx.targetWalletId,
          (balancesMinor.get(tx.targetWalletId) ?? 0) + minor,
        );
      }
    }
  }

  const result = new Map<string, number>();
  for (const [id, minor] of balancesMinor.entries()) {
    result.set(id, fromMinorUnits(minor));
  }
  return result;
}

/**
 * Compute monthly cashflow totals. Transfers are excluded from income/expense totals
 * so moving funds between own wallets never inflates spending or income.
 */
export function computeCashflow(entries: LedgerEntry[]): {
  income: number;
  expense: number;
  net: number;
  savingsRate: number;
} {
  let incomeMinor = 0;
  let expenseMinor = 0;

  for (const tx of entries) {
    const minor = toMinorUnits(tx.amount);
    if (minor <= 0) continue;
    if (tx.type === "INCOME") incomeMinor += minor;
    else if (tx.type === "EXPENSE") expenseMinor += minor;
  }

  const netMinor = incomeMinor - expenseMinor;
  const savingsRate =
    incomeMinor > 0 ? Math.round((netMinor / incomeMinor) * 100) : 0;

  return {
    income: fromMinorUnits(incomeMinor),
    expense: fromMinorUnits(expenseMinor),
    net: fromMinorUnits(netMinor),
    savingsRate,
  };
}

export function computeBudgetProgress(spent: number, limit: number): {
  percent: number;
  remaining: number;
  status: "safe" | "warning" | "exceeded";
} {
  const spentMinor = toMinorUnits(spent);
  const limitMinor = toMinorUnits(limit);
  if (limitMinor <= 0) {
    return { percent: 0, remaining: 0, status: "safe" };
  }
  const percent = Math.round((spentMinor / limitMinor) * 100);
  const remaining = fromMinorUnits(limitMinor - spentMinor);
  const status =
    spentMinor > limitMinor
      ? "exceeded"
      : percent >= 80
        ? "warning"
        : "safe";
  return { percent, remaining, status };
}

export function formatCurrency(
  amount: number,
  currency: string = "IDR",
  options?: { signed?: boolean; compact?: boolean },
): string {
  const abs = Math.abs(amount);
  const locale = currency === "IDR" ? "id-ID" : "en-US";
  const maxFrac = currency === "IDR" ? 0 : 2;
  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: options?.compact ? 1 : maxFrac,
    minimumFractionDigits: options?.compact ? 0 : maxFrac,
    notation: options?.compact ? "compact" : "standard",
  }).format(abs);

  if (amount < 0) return `-${formatted}`;
  if (options?.signed && amount > 0) return `+${formatted}`;
  return formatted;
}

export function formatMonthKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function escapeCsvCell(value: string | number | null | undefined): string {
  const str = String(value ?? "");
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
