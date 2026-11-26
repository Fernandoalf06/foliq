"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronLeftIcon, PrinterIcon, SpinnerIcon } from "./icons";

export function ReportActions() {
  const [navigatingBack, setNavigatingBack] = useState(false);
  const [preparingPrint, setPreparingPrint] = useState(false);

  const handlePrint = () => {
    setPreparingPrint(true);
    window.setTimeout(() => {
      window.print();
      setPreparingPrint(false);
    }, 80);
  };

  return (
    <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
      <Link
        href="/"
        onClick={() => setNavigatingBack(true)}
        className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3.5 text-sm font-semibold text-[var(--ink)] hover:border-[var(--accent)]"
      >
        {navigatingBack ? (
          <SpinnerIcon className="h-4 w-4 text-[var(--accent-text)]" />
        ) : (
          <ChevronLeftIcon className="h-4 w-4" />
        )}
        <span>{navigatingBack ? "Returning..." : "Back to Foliq"}</span>
      </Link>
      <button
        type="button"
        disabled={preparingPrint}
        onClick={handlePrint}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
      >
        {preparingPrint ? (
          <SpinnerIcon className="h-4 w-4" />
        ) : (
          <PrinterIcon className="h-4 w-4" />
        )}
        <span>{preparingPrint ? "Opening print..." : "Print / Save as PDF"}</span>
      </button>
    </div>
  );
}
