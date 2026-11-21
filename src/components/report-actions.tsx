"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeftIcon, PrinterIcon } from "./icons";

export function ReportActions() {
  return (
    <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
      <Link
        href="/"
        className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3.5 text-sm font-semibold text-[var(--ink)] hover:border-[var(--accent)]"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        <span>Back to Foliq</span>
      </Link>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
      >
        <PrinterIcon className="h-4 w-4" />
        <span>Print / Save as PDF</span>
      </button>
    </div>
  );
}
