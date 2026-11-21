export const SUPPORTED_CURRENCIES = ["IDR", "USD", "SGD", "EUR"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export interface SavedRateRecord {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
}

// Baseline reference units per 1 USD used only when the owner has not saved a custom rate yet
const DEFAULT_UNITS_PER_USD: Record<SupportedCurrency, number> = {
  USD: 1,
  IDR: 16000,
  SGD: 1.34,
  EUR: 0.92,
};

export function resolveExchangeRate(
  fromCurrency: string,
  toCurrency: string,
  savedRates: SavedRateRecord[] = [],
): { rate: number; isCustom: boolean } {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();
  if (from === to) {
    return { rate: 1, isCustom: false };
  }

  const direct = savedRates.find(
    (r) =>
      r.fromCurrency.toUpperCase() === from &&
      r.toCurrency.toUpperCase() === to &&
      r.rate > 0,
  );
  if (direct) {
    return { rate: direct.rate, isCustom: true };
  }

  const inverse = savedRates.find(
    (r) =>
      r.fromCurrency.toUpperCase() === to &&
      r.toCurrency.toUpperCase() === from &&
      r.rate > 0,
  );
  if (inverse) {
    return { rate: 1 / inverse.rate, isCustom: true };
  }

  const fromUnit =
    DEFAULT_UNITS_PER_USD[from as SupportedCurrency] ?? DEFAULT_UNITS_PER_USD.USD;
  const toUnit =
    DEFAULT_UNITS_PER_USD[to as SupportedCurrency] ?? DEFAULT_UNITS_PER_USD.USD;

  return { rate: toUnit / fromUnit, isCustom: false };
}

export function convertCurrencyAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  savedRates: SavedRateRecord[] = [],
): number {
  if (amount === 0) return 0;
  const { rate } = resolveExchangeRate(fromCurrency, toCurrency, savedRates);
  return Math.round(amount * rate * 100) / 100;
}

export function computeGoalProgress(
  currentAmount: number,
  targetAmount: number,
): {
  remaining: number;
  percent: number;
  status: "completed" | "near" | "in_progress";
} {
  const safeCurrent = Math.max(0, currentAmount);
  const safeTarget = Math.max(0, targetAmount);
  const remaining = Math.max(0, Math.round((safeTarget - safeCurrent) * 100) / 100);
  const percent =
    safeTarget > 0
      ? Math.min(100, Math.round((safeCurrent / safeTarget) * 100))
      : 0;
  const status =
    safeTarget > 0 && safeCurrent >= safeTarget
      ? "completed"
      : percent >= 75
        ? "near"
        : "in_progress";
  return { remaining, percent, status };
}

/**
 * Build trailing N-month keys ending at endMonth (inclusive), ascending (oldest -> newest).
 */
export function buildTrailingMonthKeys(
  endMonth: string,
  count: number,
): string[] {
  const [y, m] = endMonth.split("-").map(Number);
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    keys.push(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
    );
  }
  return keys;
}

export function formatShortMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: "UTC",
  }).format(d);
}
