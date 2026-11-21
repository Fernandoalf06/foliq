"use client";

import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/money";
import type { DailySeriesPoint } from "@/lib/types";

interface CashflowChartProps {
  data: DailySeriesPoint[];
  currency: string;
  monthLabel: string;
  privacyMode?: boolean;
}

export function CashflowChart({
  data,
  currency,
  monthLabel,
  privacyMode = false,
}: CashflowChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-[var(--ink)]">
            Daily income vs. expenses in {monthLabel}
          </h2>
        </div>
        <p className="py-8 text-sm text-[var(--ink-muted)]">
          No income or expense entries recorded for {monthLabel} yet. Add your
          first entry to see daily cashflow bars here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-[var(--ink)]">
          Daily income vs. expenses in {monthLabel}
        </h2>
        <div className="flex items-center gap-4 text-xs font-medium text-[var(--ink-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: "var(--income)" }}
              aria-hidden="true"
            />
            Income
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: "var(--expense)" }}
              aria-hidden="true"
            />
            Expense
          </span>
        </div>
      </div>

      <div className="h-56 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 6, right: 8, left: 4, bottom: 0 }}
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
              width={62}
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
              labelFormatter={(label) => `Day ${label}`}
            />
            <Bar
              dataKey="income"
              fill="var(--income)"
              radius={[6, 6, 0, 0]}
              maxBarSize={22}
            />
            <Bar
              dataKey="expense"
              fill="var(--expense)"
              radius={[6, 6, 0, 0]}
              maxBarSize={22}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
