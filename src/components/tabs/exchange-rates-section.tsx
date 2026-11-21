"use client";

import React, { useState } from "react";
import { GlobeIcon } from "../icons";
import type { ExchangeRateItem } from "@/lib/types";

interface ExchangeRatesSectionProps {
  primaryCurrency: string;
  rates: ExchangeRateItem[];
  onRefresh: () => Promise<void>;
}

export function ExchangeRatesSection({
  primaryCurrency,
  rates,
  onRefresh,
}: ExchangeRatesSectionProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingCurrency, setSavingCurrency] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSaveRate = async (fromCurrency: string, fallbackRate: number) => {
    setFeedback(null);
    const pairKey = `${fromCurrency}->${primaryCurrency}`;
    const raw = drafts[pairKey] ?? String(fallbackRate);
    const parsed = Number.parseFloat(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setFeedback({
        type: "error",
        text: `Enter a valid rate greater than 0 for ${fromCurrency}.`,
      });
      return;
    }

    setSavingCurrency(fromCurrency);
    try {
      const res = await fetch("/api/settings/rates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromCurrency,
          toCurrency: primaryCurrency,
          rate: parsed,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({
          type: "error",
          text: json.error || "Failed to save exchange rate.",
        });
        setSavingCurrency(null);
        return;
      }
      setFeedback({
        type: "success",
        text: `Saved 1 ${fromCurrency} = ${parsed} ${primaryCurrency}.`,
      });
      await onRefresh();
    } catch {
      setFeedback({
        type: "error",
        text: "Network error while saving exchange rate.",
      });
    } finally {
      setSavingCurrency(null);
    }
  };

  return (
    <section className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-text)]">
          <GlobeIcon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-[var(--ink)]">
            Multi-Currency Exchange Rates
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Configure custom conversion rates to your primary display currency (
            <span className="font-semibold text-[var(--ink)]">
              {primaryCurrency}
            </span>
            ). Multi-currency wallets convert automatically into your Total Net
            Balance and trend charts.
          </p>
        </div>
      </div>

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

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        {rates.map((item) => {
          const pairKey = `${item.fromCurrency}->${primaryCurrency}`;
          const inputVal = drafts[pairKey] ?? String(item.rate);
          return (
            <div
              key={pairKey}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/70 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor={`rate-${item.fromCurrency}`}
                  className="text-sm font-bold text-[var(--ink)]"
                >
                  1 {item.fromCurrency} to {primaryCurrency}
                </label>
                <span className="rounded-md bg-[var(--surface-1)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ink-muted)]">
                  {item.isCustom ? "Saved" : "Default"}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <input
                  id={`rate-${item.fromCurrency}`}
                  type="number"
                  step="any"
                  min="0"
                  inputMode="decimal"
                  value={inputVal}
                  onChange={(e) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [pairKey]: e.target.value,
                    }))
                  }
                  className="tabular-nums h-11 min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-sm font-semibold text-[var(--ink)]"
                />
                <button
                  type="button"
                  disabled={savingCurrency === item.fromCurrency}
                  onClick={() =>
                    void handleSaveRate(item.fromCurrency, item.rate)
                  }
                  className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] px-3.5 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
                >
                  {savingCurrency === item.fromCurrency ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
