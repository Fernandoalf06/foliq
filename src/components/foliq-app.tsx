"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  BudgetIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  FoliqMark,
  LedgerIcon,
  MoonIcon,
  OverviewIcon,
  PlusIcon,
  SettingsIcon,
  SignOutIcon,
  SunIcon,
  WalletIcon,
} from "./icons";
import { QuickEntrySheet } from "./quick-entry-sheet";
import { BudgetsTab } from "./tabs/budgets-tab";
import { LedgerTab } from "./tabs/ledger-tab";
import { OverviewTab } from "./tabs/overview-tab";
import { SettingsTab } from "./tabs/settings-tab";
import { WalletsTab } from "./tabs/wallets-tab";
import { useTheme } from "./theme-provider";
import { formatMonthKey } from "@/lib/money";
import type {
  DashboardPayload,
  TransactionItem,
  TransactionType,
} from "@/lib/types";

type ActiveTab = "overview" | "ledger" | "wallets" | "budgets" | "settings";

interface FoliqAppProps {
  onSignedOut: () => void;
}

function shiftMonth(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatReadableMonth(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export function FoliqApp({ onSignedOut }: FoliqAppProps) {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [month, setMonth] = useState(() => formatMonthKey(new Date()));
  const [tzOffset] = useState(() => new Date().getTimezoneOffset());
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetInitialType, setSheetInitialType] =
    useState<TransactionType>("EXPENSE");
  const [editingTransaction, setEditingTransaction] =
    useState<TransactionItem | null>(null);

  const fetchDashboardData = useCallback(
    async (
      targetMonth: string,
    ): Promise<{ ok: boolean; error?: string; payload?: DashboardPayload }> => {
      try {
        const res = await fetch(
          `/api/dashboard?month=${encodeURIComponent(targetMonth)}&tzOffset=${encodeURIComponent(String(tzOffset))}`,
          { cache: "no-store" },
        );
        if (res.status === 401) {
          onSignedOut();
          return { ok: false };
        }
        const json = await res.json().catch(() => null);
        if (!res.ok || !json) {
          return {
            ok: false,
            error: json?.error || "Unable to load your financial ledger.",
          };
        }
        return { ok: true, payload: json as DashboardPayload };
      } catch {
        return {
          ok: false,
          error: "Network error while connecting to Neon database.",
        };
      }
    },
    [onSignedOut, tzOffset],
  );

  const loadDashboard = useCallback(
    async (targetMonth: string) => {
      setLoading(true);
      setError(null);
      const result = await fetchDashboardData(targetMonth);
      if (result.ok && result.payload) {
        setData(result.payload);
      } else if (result.error) {
        setError(result.error);
      }
      setLoading(false);
    },
    [fetchDashboardData],
  );

  useEffect(() => {
    let active = true;
    fetchDashboardData(month).then((result) => {
      if (!active) return;
      if (result.ok && result.payload) {
        setData(result.payload);
        setError(null);
      } else if (result.error) {
        setError(result.error);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [month, fetchDashboardData]);

  const openQuickEntry = (initialType: TransactionType = "EXPENSE") => {
    setEditingTransaction(null);
    setSheetInitialType(initialType);
    setSheetOpen(true);
  };

  const openEditTransaction = (tx: TransactionItem) => {
    setEditingTransaction(tx);
    setSheetInitialType(tx.type);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setEditingTransaction(null);
  };

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    onSignedOut();
  };

  const handleDeleteTransaction = async (id: string) => {
    setActionError(null);
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setActionError(json.error || "Failed to delete transaction.");
        return;
      }
      await loadDashboard(month);
    } catch {
      setActionError("Network error while deleting transaction.");
    }
  };

  const handleRemoveWallet = async (id: string) => {
    setActionError(null);
    try {
      const res = await fetch(`/api/wallets/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setActionError(json.error || "Failed to remove wallet.");
        return;
      }
      await loadDashboard(month);
    } catch {
      setActionError("Network error while removing wallet.");
    }
  };

  const handleRestoreWallet = async (id: string) => {
    setActionError(null);
    try {
      const res = await fetch(`/api/wallets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: false }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setActionError(json.error || "Failed to restore wallet.");
        return;
      }
      await loadDashboard(month);
    } catch {
      setActionError("Network error while restoring wallet.");
    }
  };

  const handleDeleteBudget = async (id: string) => {
    setActionError(null);
    try {
      const res = await fetch(`/api/budgets?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setActionError(json.error || "Failed to delete budget.");
        return;
      }
      await loadDashboard(month);
    } catch {
      setActionError("Network error while deleting budget.");
    }
  };

  const monthLabel = formatReadableMonth(month);
  const currency = data?.user.currency ?? "IDR";
  const exportHref = `/api/export?month=${encodeURIComponent(month)}&tzOffset=${encodeURIComponent(String(tzOffset))}`;

  const primaryDockItems: Array<{
    id: Exclude<ActiveTab, "settings">;
    label: string;
    icon: React.ReactNode;
  }> = [
    { id: "overview", label: "Overview", icon: <OverviewIcon /> },
    { id: "ledger", label: "Ledger", icon: <LedgerIcon /> },
    { id: "wallets", label: "Wallets", icon: <WalletIcon /> },
    { id: "budgets", label: "Budgets", icon: <BudgetIcon /> },
  ];

  const desktopNavItems: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ReactNode;
  }> = [
    ...primaryDockItems,
    { id: "settings", label: "Settings", icon: <SettingsIcon /> },
  ];

  const pageHeading =
    activeTab === "overview"
      ? "Overview"
      : activeTab === "ledger"
        ? "Ledger"
        : activeTab === "wallets"
          ? "Wallets"
          : activeTab === "budgets"
            ? "Monthly Budgets"
            : "Settings";

  return (
    <div className="min-h-dvh bg-[var(--ground)] text-[var(--ink)]">
      {/* Desktop Sidebar Rail (>= 1024px) */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-[var(--border)] lg:bg-[var(--surface-1)] lg:px-4 lg:py-6">
        <div className="mb-6 flex items-center gap-2.5 px-2">
          <FoliqMark className="h-8 w-8" />
          <div>
            <p className="text-base font-bold leading-none text-[var(--ink)]">
              Foliq
            </p>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">
              Personal Ledger
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => openQuickEntry("EXPENSE")}
          className="mb-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white transition-transform hover:bg-[var(--accent-hover)] active:scale-[0.98]"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Record Entry</span>
        </button>

        <nav aria-label="Primary navigation" className="flex-1 space-y-1">
          {desktopNavItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                aria-current={active ? "page" : undefined}
                className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-[var(--accent-soft)] text-[var(--accent-text)]"
                    : "text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="space-y-2 border-t border-[var(--border)] pt-4">
          <a
            href={exportHref}
            className="flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
          >
            <DownloadIcon className="h-4 w-4" />
            <span>Export {monthLabel} CSV</span>
          </a>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
          >
            {theme === "dark" ? (
              <SunIcon className="h-4 w-4" />
            ) : (
              <MoonIcon className="h-4 w-4" />
            )}
            <span>{theme === "dark" ? "Light Mode" : "Dark OLED Mode"}</span>
          </button>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--expense)]"
          >
            <SignOutIcon className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Column */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--ground)]/95 px-3 py-2.5 backdrop-blur-sm safe-top sm:px-6">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-2">
            <div className="flex shrink-0 items-center gap-2 lg:hidden">
              <FoliqMark className="h-7 w-7" />
              <span className="hidden text-base font-bold tracking-tight text-[var(--ink)] min-[360px]:inline">
                Foliq
              </span>
            </div>

            <div className="hidden lg:block">
              <h1 className="text-xl font-bold tracking-tight text-[var(--ink)]">
                {pageHeading}
              </h1>
            </div>

            <div className="flex min-w-0 items-center gap-0.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-0.5 sm:gap-1 sm:p-1">
              <button
                type="button"
                onClick={() => setMonth((m) => shiftMonth(m, -1))}
                aria-label="Previous month"
                className="inline-flex h-10 w-9 items-center justify-center rounded-lg text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <span className="tabular-nums min-w-[70px] px-1 text-center text-xs font-semibold text-[var(--ink)] sm:min-w-[84px] sm:text-sm">
                {monthLabel}
              </span>
              <button
                type="button"
                onClick={() => setMonth((m) => shiftMonth(m, 1))}
                aria-label="Next month"
                className="inline-flex h-10 w-9 items-center justify-center rounded-lg text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 lg:hidden">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={
                  theme === "dark"
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                }
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-[var(--ink)] hover:bg-[var(--surface-2)]"
              >
                {theme === "dark" ? (
                  <SunIcon className="h-4 w-4" />
                ) : (
                  <MoonIcon className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                aria-label="Open settings"
                aria-current={activeTab === "settings" ? "page" : undefined}
                className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${
                  activeTab === "settings"
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)]"
                    : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                }`}
              >
                <SettingsIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 pb-32 pt-5 sm:px-6 lg:pb-12 lg:pt-6">
          <h1 className="mb-4 text-2xl font-bold tracking-tight text-[var(--ink)] lg:hidden">
            {pageHeading}
          </h1>

          {actionError && (
            <div
              role="alert"
              className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[var(--expense)]/30 bg-[var(--expense-soft)] px-4 py-3 text-sm font-medium text-[var(--expense)]"
            >
              <span>{actionError}</span>
              <button
                type="button"
                onClick={() => setActionError(null)}
                className="min-h-9 rounded-lg px-2 text-xs font-semibold underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {loading && !data && (
            <div
              role="status"
              className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-8 text-center"
            >
              <p className="text-sm font-semibold text-[var(--ink)]">
                Loading your ledger for {monthLabel}...
              </p>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                Syncing wallets, transactions, and category budgets from Neon.
              </p>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-[20px] border border-[var(--expense)]/30 bg-[var(--expense-soft)] p-5"
            >
              <p className="text-sm font-semibold text-[var(--expense)]">
                Could not load financial data
              </p>
              <p className="mt-1 text-sm text-[var(--ink)]">{error}</p>
              <button
                type="button"
                onClick={() => void loadDashboard(month)}
                className="mt-3 inline-flex h-11 items-center justify-center rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white"
              >
                Retry Sync
              </button>
            </div>
          )}

          {data && activeTab === "overview" && (
            <OverviewTab
              data={data}
              currency={currency}
              monthLabel={monthLabel}
              onOpenQuickEntry={openQuickEntry}
              onEditTransaction={openEditTransaction}
              onNavigateTab={setActiveTab}
            />
          )}

          {data && activeTab === "ledger" && (
            <LedgerTab
              data={data}
              currency={currency}
              monthLabel={monthLabel}
              exportHref={exportHref}
              onOpenQuickEntry={openQuickEntry}
              onEditTransaction={openEditTransaction}
              onDeleteTransaction={handleDeleteTransaction}
            />
          )}

          {data && activeTab === "wallets" && (
            <WalletsTab
              wallets={data.wallets}
              archivedWallets={data.archivedWallets}
              currency={currency}
              onRefresh={() => loadDashboard(month)}
              onRemoveWallet={handleRemoveWallet}
              onRestoreWallet={handleRestoreWallet}
            />
          )}

          {data && activeTab === "budgets" && (
            <BudgetsTab
              budgets={data.budgets}
              categories={data.categories}
              month={month}
              monthLabel={monthLabel}
              currency={currency}
              onRefresh={() => loadDashboard(month)}
              onDeleteBudget={handleDeleteBudget}
            />
          )}

          {data && activeTab === "settings" && (
            <SettingsTab
              user={data.user}
              monthLabel={monthLabel}
              monthExportHref={exportHref}
              onRefresh={() => loadDashboard(month)}
              onSignOut={handleSignOut}
            />
          )}
        </main>
      </div>

      {/* Mobile & Tablet Floating Liquid Glass Dock (< 1024px) */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 safe-bottom lg:hidden">
        <nav
          aria-label="Mobile navigation"
          className="liquid-glass pointer-events-auto mx-auto flex max-w-md items-center justify-between gap-1 rounded-[28px] px-2 py-1.5"
        >
          {primaryDockItems.slice(0, 2).map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 text-[11px] font-semibold transition-colors ${
                  active
                    ? "bg-[var(--accent-soft)] text-[var(--accent-text)]"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => openQuickEntry("EXPENSE")}
            aria-label="Record new transaction"
            className="mx-1 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] text-white shadow-sm transition-transform hover:bg-[var(--accent-hover)] active:scale-95"
          >
            <PlusIcon className="h-5 w-5" />
          </button>

          {primaryDockItems.slice(2).map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 text-[11px] font-semibold transition-colors ${
                  active
                    ? "bg-[var(--accent-soft)] text-[var(--accent-text)]"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {data && (
        <QuickEntrySheet
          open={sheetOpen}
          initialType={sheetInitialType}
          editingTransaction={editingTransaction}
          currency={currency}
          wallets={data.wallets}
          categories={data.categories}
          onClose={closeSheet}
          onSaved={() => loadDashboard(month)}
        />
      )}
    </div>
  );
}
