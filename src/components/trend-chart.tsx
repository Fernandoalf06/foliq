"use client";

import React, { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendLineIcon } from "./icons";
import { formatCurrency } from "@/lib/money";
import type { MonthlyTrendPoint } from "@/lib/types";

interface TrendChartProps {
  data: MonthlyTrendPoint[];
  currency: string;
  privacyMode?: boolean;
}

export function TrendChart({
  data,
  currency,
  privacyMode = false,
}: TrendChartProps) {
  const [range, setRange] = useState<6 | 12>(6);
  const [mode, setMode] = useState<"netWorth" | "cashflow">("netWorth");

  const visibleData = range === 6 ? data.slice(-6) : data;
  const firstPoint = visibleData[0];
  const lastPoint = visibleData[visibleData.length - 1];
  const netWorthDelta =
    firstPoint && lastPoint ? lastPoint.netWorth - firstPoint.netWorth : 0;

  return (
    <section className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--ink)]">
            <TrendLineIcon className="h-4 w-4 text-[var(--accent-text)]" />
            <span>
              {mode === "netWorth"
                ? `${range}-Month Net Worth Trend`
                : `${range}-Month Cashflow Trend`}
            </span>
          </h2>
          {mode === "netWorth" && visibleData.length > 1 && (
            <p className="tabular-nums mt-0.5 text-xs text-[var(--ink-muted)]">
              Change across {range} months:{" "}
              <span
                className="font-semibold"
                style={{
                  color:
                    netWorthDelta >= 0 ? "var(--income)" : "var(--expense)",
                }}
              >
                {privacyMode
                  ? "••••••••"
                  : formatCurrency(netWorthDelta, currency, { signed: true })}
              </span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="tablist"
            aria-label="Trend chart metric"
            className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-0.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "netWorth"}
              onClick={() => setMode("netWorth")}
              className={`min-h-11 rounded-lg px-3 text-xs font-semibold transition-colors ${
                mode === "netWorth"
                  ? "bg-[var(--surface-1)] text-[var(--ink)] shadow-sm"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
            >
              Net Worth
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "cashflow"}
              onClick={() => setMode("cashflow")}
              className={`min-h-11 rounded-lg px-3 text-xs font-semibold transition-colors ${
                mode === "cashflow"
                  ? "bg-[var(--surface-1)] text-[var(--ink)] shadow-sm"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
            >
              Cashflow
            </button>
          </div>

          <div
            role="tablist"
            aria-label="Trend chart timeframe"
            className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-0.5"
          >
            {([6, 12] as const).map((months) => (
              <button
                key={months}
                type="button"
                role="tab"
                aria-selected={range === months}
                onClick={() => setRange(months)}
                className={`min-h-11 rounded-lg px-3 text-xs font-semibold transition-colors ${
                  range === months
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
                }`}
              >
                {months}M
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-60 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          {mode === "netWorth" ? (
            <AreaChart
              data={visibleData}
              margin={{ top: 8, right: 8, left: 4, bottom: 0 }}
            >
              <defs>
                <linearGradient id="foliqNetWorthFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--border)"
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--ink-muted)", fontSize: 12 }}
              />
              <YAxis
                width={64}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
                tickFormatter={(v: number) =>
                  privacyMode
                    ? "•••"
                    : formatCurrency(v, currency, { compact: true })
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--surface-1)",
                  borderColor: "var(--border)",
                  borderRadius: "12px",
                  color: "var(--ink)",
                  fontSize: "13px",
                }}
                formatter={(value) => [
                  privacyMode
                    ? "••••••••"
                    : formatCurrency(Number(value ?? 0), currency),
                  "Net Worth",
                ]}
                labelFormatter={(_label, payload) => {
                  const month = payload?.[0]?.payload?.month;
                  return month ? `Month ${month}` : "";
                }}
              />
              <Area
                type="monotone"
                dataKey="netWorth"
                stroke="var(--accent)"
                strokeWidth={2.5}
                fill="url(#foliqNetWorthFill)"
                activeDot={{ r: 5, fill: "var(--accent)" }}
              />
            </AreaChart>
          ) : (
            <BarChart
              data={visibleData}
              margin={{ top: 8, right: 8, left: 4, bottom: 0 }}
              barGap={4}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--border)"
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--ink-muted)", fontSize: 12 }}
              />
              <YAxis
                width={64}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
                tickFormatter={(v: number) =>
                  privacyMode
                    ? "•••"
                    : formatCurrency(v, currency, { compact: true })
                }
              />
              <Tooltip
                cursor={{ fill: "var(--surface-2)", opacity: 0.6 }}
                contentStyle={{
                  backgroundColor: "var(--surface-1)",
                  borderColor: "var(--border)",
                  borderRadius: "12px",
                  color: "var(--ink)",
                  fontSize: "13px",
                }}
                formatter={(value, name) => [
                  privacyMode
                    ? "••••••••"
                    : formatCurrency(Number(value ?? 0), currency),
                  name === "income" ? "Income" : "Expense",
                ]}
                labelFormatter={(_label, payload) => {
                  const month = payload?.[0]?.payload?.month;
                  return month ? `Month ${month}` : "";
                }}
              />
              <Bar
                dataKey="income"
                fill="var(--income)"
                radius={[6, 6, 0, 0]}
                maxBarSize={20}
              />
              <Bar
                dataKey="expense"
                fill="var(--expense)"
                radius={[6, 6, 0, 0]}
                maxBarSize={20}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </section>
  );
}
