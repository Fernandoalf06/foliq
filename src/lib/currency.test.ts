import { describe, expect, it } from "vitest";
import {
  buildTrailingMonthKeys,
  computeGoalProgress,
  convertCurrencyAmount,
  resolveExchangeRate,
} from "./currency";

describe("multi-currency and goal helpers", () => {
  it("resolves direct, inverse, identity, and default exchange rates", () => {
    expect(resolveExchangeRate("IDR", "IDR")).toEqual({
      rate: 1,
      isCustom: false,
    });

    const saved = [{ fromCurrency: "USD", toCurrency: "IDR", rate: 16250 }];
    expect(resolveExchangeRate("USD", "IDR", saved)).toEqual({
      rate: 16250,
      isCustom: true,
    });

    const inverse = resolveExchangeRate("IDR", "USD", saved);
    expect(inverse.isCustom).toBe(true);
    expect(inverse.rate).toBeCloseTo(1 / 16250, 8);

    const fallback = resolveExchangeRate("SGD", "IDR", saved);
    expect(fallback.isCustom).toBe(false);
    expect(fallback.rate).toBeGreaterThan(10000);
  });

  it("converts currency amounts cleanly to 2 decimal places", () => {
    const saved = [{ fromCurrency: "USD", toCurrency: "IDR", rate: 16250 }];
    expect(convertCurrencyAmount(100, "USD", "IDR", saved)).toBe(1625000);
    expect(convertCurrencyAmount(0, "USD", "IDR", saved)).toBe(0);
  });

  it("computes savings goal progress accurately", () => {
    expect(computeGoalProgress(5000000, 10000000)).toEqual({
      remaining: 5000000,
      percent: 50,
      status: "in_progress",
    });

    expect(computeGoalProgress(8000000, 10000000)).toEqual({
      remaining: 2000000,
      percent: 80,
      status: "near",
    });

    expect(computeGoalProgress(12000000, 10000000)).toEqual({
      remaining: 0,
      percent: 100,
      status: "completed",
    });
  });

  it("builds trailing N month keys across year boundaries", () => {
    expect(buildTrailingMonthKeys("2026-02", 6)).toEqual([
      "2025-09",
      "2025-10",
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
  });
});
