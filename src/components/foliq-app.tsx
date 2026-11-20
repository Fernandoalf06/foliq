"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CashflowChart } from "./cashflow-chart";
import {
  BudgetIcon,
  CategoryGlyph,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  FoliqMark,
  LedgerIcon,
  MoonIcon,
  OverviewIcon,
  PlusIcon,
  SignOutIcon,
  SunIcon,
  TransferIcon,
  TrashIcon,
  WalletIcon,
} from "./icons";
import { QuickEntrySheet } from "./quick-entry-sheet";
import { useTheme } from "./theme-provider";
import { formatCurrency, formatMonthKey } from "@/lib/money";
import type {
  DashboardPayload,
  TransactionItem,
  TransactionType,
  WalletType,
} from "@/lib/types";

type ActiveTab = "overview" | "ledger" | "wallets" | "budgets";

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

function formatDateHeading(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

export function FoliqApp({ onSignedOut }: FoliqAppProps) {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [month, setMonth] = useState(() => formatMonthKey(new Date()));
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick Entry Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetInitialType, setSheetInitialType] =
    useState<TransactionType>("EXPENSE");

  // Ledger filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | TransactionType>("ALL");
  const [walletFilter, setWalletFilter] = useState("ALL");
  const [confirmDeleteTxId, setConfirmDeleteTxId] = useState<string | null>(
    null,
  );

  // Add Wallet form
  const [walletName, setWalletName] = useState("");
  const [walletType, setWalletType] = useState<WalletType>("BANK");
  const [walletInitial, setWalletInitial] = useState("0");
  const [walletSubmitting, setWalletSubmitting] = useState(false);
  const [walletFeedback, setWalletFeedback] = useState<string | null>(null);

  // Set Budget form
  const [budgetCategoryId, setBudgetCategoryId] = useState("");
  const [budgetLimit, setBudgetLimit] = useState("");
  const [budgetSubmitting, setBudgetSubmitting] = useState(false);
  const [budgetFeedback, setBudgetFeedback] = useState<string | null>(null);

  // Add Category form
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<"EXPENSE" | "INCOME">(
    "EXPENSE",
  );
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const [categoryFeedback, setCategoryFeedback] = useState<string | null>(null);

  const fetchDashboardData = useCallback(
    async (targetMonth: string): Promise<{ ok: boolean; error?: string; payload?: DashboardPayload }> => {
      try {
        const res = await fetch(
          `/api/dashboard?month=${encodeURIComponent(targetMonth)}`,
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
    [onSignedOut],
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
    setSheetInitialType(initialType);
    setSheetOpen(true);
  };

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    onSignedOut();
  };

  const handleDeleteTransaction = async (id: string) => {
    const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    if (res.ok) {
      setConfirmDeleteTxId(null);
      await loadDashboard(month);
    }
  };

  const handleAddWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setWalletFeedback(null);
    setWalletSubmitting(true);
    try {
      const res = await fetch("/api/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: walletName,
          type: walletType,
          initialBalance: Number.parseFloat(walletInitial || "0") || 0,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setWalletFeedback(json.error || "Failed to add wallet.");
        setWalletSubmitting(false);
        return;
      }
      setWalletName("");
      setWalletInitial("0");
      setWalletFeedback("Wallet added.");
      await loadDashboard(month);
    } catch {
      setWalletFeedback("Network error while adding wallet.");
    } finally {
      setWalletSubmitting(false);
    }
  };

  const handleRemoveWallet = async (id: string) => {
    const res = await fetch(`/api/wallets/${id}`, { method: "DELETE" });
    if (res.ok) {
      await loadDashboard(month);
    }
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setBudgetFeedback(null);
    setBudgetSubmitting(true);
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: effectiveBudgetCategoryId,
          month,
          limitAmount: Number.parseFloat(budgetLimit),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBudgetFeedback(json.error || "Failed to save budget.");
        setBudgetSubmitting(false);
        return;
      }
      setBudgetLimit("");
      setBudgetFeedback("Budget saved.");
      await loadDashboard(month);
    } catch {
      setBudgetFeedback("Network error while saving budget.");
    } finally {
      setBudgetSubmitting(false);
    }
  };

  const handleDeleteBudget = async (id: string) => {
    const res = await fetch(`/api/budgets?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await loadDashboard(month);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryFeedback(null);
    setCategorySubmitting(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCategoryName,
          type: newCategoryType,
          icon: newCategoryType === "INCOME" ? "briefcase" : "tag",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCategoryFeedback(json.error || "Failed to add category.");
        setCategorySubmitting(false);
        return;
      }
      setNewCategoryName("");
      setCategoryFeedback("Category created.");
      await loadDashboard(month);
    } catch {
      setCategoryFeedback("Network error while creating category.");
    } finally {
      setCategorySubmitting(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    if (!data) return [];
    const q = searchQuery.trim().toLowerCase();
    return data.transactions.filter((tx) => {
      if (typeFilter !== "ALL" && tx.type !== typeFilter) return false;
      if (
        walletFilter !== "ALL" &&
        tx.wallet.id !== walletFilter &&
        tx.targetWallet?.id !== walletFilter
      ) {
        return false;
      }
      if (!q) return true;
      const hay = [
        tx.note,
        tx.category?.name ?? "",
        tx.wallet.name,
        tx.targetWallet?.name ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [data, searchQuery, typeFilter, walletFilter]);

  const groupedTransactions = useMemo(() => {
    const groups: Array<{ dateKey: string; label: string; items: TransactionItem[] }> =
      [];
    const map = new Map<string, TransactionItem[]>();
    for (const tx of filteredTransactions) {
      const key = tx.occurredAt.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(tx);
      map.set(key, list);
    }
    for (const [dateKey, items] of map.entries()) {
      groups.push({
        dateKey,
        label: formatDateHeading(items[0].occurredAt),
        items,
      });
    }
    return groups;
  }, [filteredTransactions]);

  const monthLabel = formatReadableMonth(month);
  const currency = data?.user.currency ?? "IDR";
  const expenseCategories =
    data?.categories.filter((c) => c.type === "EXPENSE") ?? [];
  const effectiveBudgetCategoryId = expenseCategories.some(
    (c) => c.id === budgetCategoryId,
  )
    ? budgetCategoryId
    : (expenseCategories[0]?.id ?? "");

  const navItems: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ReactNode;
  }> = [
    { id: "overview", label: "Overview", icon: <OverviewIcon /> },
    { id: "ledger", label: "Ledger", icon: <LedgerIcon /> },
    { id: "wallets", label: "Wallets", icon: <WalletIcon /> },
    { id: "budgets", label: "Budgets", icon: <BudgetIcon /> },
  ];

  const renderTransactionRow = (tx: TransactionItem, allowDelete = false) => {
    const isIncome = tx.type === "INCOME";
    const isTransfer = tx.type === "TRANSFER";
    const title = isTransfer
      ? `${tx.wallet.name} to ${tx.targetWallet?.name ?? "Wallet"}`
      : tx.category?.name ?? "Uncategorized";
    const subtitle = isTransfer
      ? tx.note || "Wallet transfer"
      : tx.note
        ? `${tx.wallet.name} · ${tx.note}`
        : tx.wallet.name;

    const amountText = isTransfer
      ? formatCurrency(tx.amount, currency)
      : formatCurrency(isIncome ? tx.amount : -tx.amount, currency, {
          signed: true,
        });

    return (
      <li
        key={tx.id}
        className="flex items-center justify-between gap-3 py-3.5 first:pt-1 last:pb-1"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{
              backgroundColor: isTransfer
                ? "var(--accent-soft)"
                : isIncome
                  ? "var(--income-soft)"
                  : "var(--surface-2)",
              color: isTransfer
                ? "var(--accent-text)"
                : isIncome
                  ? "var(--income)"
                  : "var(--ink)",
            }}
          >
            {isTransfer ? (
              <TransferIcon className="h-4 w-4" />
            ) : (
              <CategoryGlyph
                icon={tx.category?.icon ?? "tag"}
                className="h-4 w-4"
              />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--ink)]">
              {title}
            </p>
            <p className="truncate text-xs text-[var(--ink-muted)]">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span
            className="tabular-nums text-sm font-semibold"
            style={{
              color: isTransfer
                ? "var(--ink)"
                : isIncome
                  ? "var(--income)"
                  : "var(--expense)",
            }}
          >
            {amountText}
          </span>

          {allowDelete && (
            <>
              {confirmDeleteTxId === tx.id ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void handleDeleteTransaction(tx.id)}
                    className="min-h-9 rounded-lg bg-[var(--expense)] px-2.5 text-xs font-semibold text-white"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteTxId(null)}
                    className="min-h-9 rounded-lg border border-[var(--border)] px-2 text-xs font-medium text-[var(--ink-muted)]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteTxId(tx.id)}
                  aria-label={`Delete ${title} transaction`}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--expense)]"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </>
          )}
        </div>
      </li>
    );
  };

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
          {navItems.map((item) => {
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
            href={`/api/export?month=${encodeURIComponent(month)}`}
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
        {/* Compact Sticky Header */}
        <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--ground)]/95 px-4 py-3 backdrop-blur-sm safe-top sm:px-6">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 lg:hidden">
              <FoliqMark className="h-7 w-7" />
              <span className="text-base font-bold tracking-tight text-[var(--ink)]">
                Foliq
              </span>
            </div>

            <div className="hidden lg:block">
              <h1 className="text-xl font-bold tracking-tight text-[var(--ink)]">
                {activeTab === "overview"
                  ? "Overview"
                  : activeTab === "ledger"
                    ? "Ledger"
                    : activeTab === "wallets"
                      ? "Wallets"
                      : "Monthly Budgets"}
              </h1>
            </div>

            {/* Month Switcher */}
            <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-1">
              <button
                type="button"
                onClick={() => setMonth((m) => shiftMonth(m, -1))}
                aria-label="Previous month"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <span className="tabular-nums min-w-[84px] px-1 text-center text-xs font-semibold text-[var(--ink)] sm:text-sm">
                {monthLabel}
              </span>
              <button
                type="button"
                onClick={() => setMonth((m) => shiftMonth(m, 1))}
                aria-label="Next month"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Mobile/Tablet Quick Controls */}
            <div className="flex items-center gap-1.5 lg:hidden">
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
                onClick={() => void handleSignOut()}
                aria-label="Sign out"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--expense)]"
              >
                <SignOutIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area (generous pb-32 on mobile so Liquid Glass dock never covers content) */}
        <main className="mx-auto max-w-5xl px-4 pb-32 pt-5 sm:px-6 lg:pb-12 lg:pt-6">
          {/* Mobile Screen Heading */}
          <h1 className="mb-4 text-2xl font-bold tracking-tight text-[var(--ink)] lg:hidden">
            {activeTab === "overview"
              ? "Overview"
              : activeTab === "ledger"
                ? "Ledger"
                : activeTab === "wallets"
                  ? "Wallets"
                  : "Monthly Budgets"}
          </h1>

          {/* Loading State (R-27) */}
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

          {/* Error State (R-27) */}
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
            <div className="space-y-5">
              {/* Focal Point: Net Balance & Monthly Cashflow */}
              <section className="grid grid-cols-1 gap-4 md:grid-cols-12">
                <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-6 md:col-span-7">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                    Total Net Balance
                  </p>
                  <p className="tabular-nums mt-2 text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
                    {formatCurrency(data.netWorth, currency)}
                  </p>
                  <p className="mt-2 text-xs text-[var(--ink-muted)]">
                    Across {data.wallets.length} active{" "}
                    {data.wallets.length === 1 ? "wallet" : "wallets"}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={() => openQuickEntry("EXPENSE")}
                      className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] active:scale-[0.98]"
                    >
                      <PlusIcon className="h-4 w-4" />
                      <span>Add Expense</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openQuickEntry("INCOME")}
                      className="inline-flex h-11 items-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 text-sm font-semibold text-[var(--ink)] hover:border-[var(--accent)] active:scale-[0.98]"
                    >
                      Record Income
                    </button>
                    <button
                      type="button"
                      onClick={() => openQuickEntry("TRANSFER")}
                      className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3.5 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface-2)] active:scale-[0.98]"
                    >
                      <TransferIcon className="h-4 w-4" />
                      <span>Transfer</span>
                    </button>
                  </div>
                </div>

                {/* Cashflow Summary Stack */}
                <div className="grid grid-cols-2 gap-3 md:col-span-5 md:grid-cols-1">
                  <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:p-5">
                    <p className="text-xs font-semibold text-[var(--ink-muted)]">
                      Income ({monthLabel})
                    </p>
                    <p
                      className="tabular-nums mt-1.5 text-xl font-bold sm:text-2xl"
                      style={{ color: "var(--income)" }}
                    >
                      {formatCurrency(data.cashflow.income, currency, {
                        signed: data.cashflow.income > 0,
                      })}
                    </p>
                  </div>

                  <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:p-5">
                    <p className="text-xs font-semibold text-[var(--ink-muted)]">
                      Expenses ({monthLabel})
                    </p>
                    <p
                      className="tabular-nums mt-1.5 text-xl font-bold sm:text-2xl"
                      style={{ color: "var(--expense)" }}
                    >
                      {formatCurrency(
                        data.cashflow.expense > 0
                          ? -data.cashflow.expense
                          : 0,
                        currency,
                      )}
                    </p>
                    {data.cashflow.income > 0 && (
                      <p className="tabular-nums mt-1 text-xs text-[var(--ink-muted)]">
                        Net {formatCurrency(data.cashflow.net, currency, { signed: true })} ({data.cashflow.savingsRate}% saved)
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* Daily Cashflow Bar Chart */}
              <CashflowChart
                data={data.dailySeries}
                currency={currency}
                monthLabel={monthLabel}
              />

              {/* Two-column lower composition: Recent Entries + Top Spending */}
              <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5 lg:col-span-7">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="text-base font-semibold text-[var(--ink)]">
                      Recent Entries
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab("ledger")}
                      className="min-h-11 px-2 text-xs font-semibold text-[var(--accent-text)] hover:underline"
                    >
                      View all ({data.transactions.length})
                    </button>
                  </div>

                  {data.transactions.length === 0 ? (
                    <div className="py-6 text-center">
                      <p className="text-sm font-medium text-[var(--ink)]">
                        No transactions in {monthLabel}
                      </p>
                      <p className="mt-1 text-xs text-[var(--ink-muted)]">
                        Record your first expense, income, or wallet transfer to
                        start tracking.
                      </p>
                      <button
                        type="button"
                        onClick={() => openQuickEntry("EXPENSE")}
                        className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white"
                      >
                        <PlusIcon className="h-4 w-4" />
                        <span>Record First Entry</span>
                      </button>
                    </div>
                  ) : (
                    <ul className="divide-y divide-[var(--border)]">
                      {data.transactions
                        .slice(0, 6)
                        .map((tx) => renderTransactionRow(tx, false))}
                    </ul>
                  )}
                </div>

                <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5 lg:col-span-5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="text-base font-semibold text-[var(--ink)]">
                      Top Expense Categories
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab("budgets")}
                      className="min-h-11 px-2 text-xs font-semibold text-[var(--accent-text)] hover:underline"
                    >
                      Manage budgets
                    </button>
                  </div>

                  {data.categoryBreakdown.length === 0 ? (
                    <p className="py-6 text-sm text-[var(--ink-muted)]">
                      Expense categories will appear here once you log spending
                      in {monthLabel}.
                    </p>
                  ) : (
                    <ul className="space-y-3.5">
                      {data.categoryBreakdown.slice(0, 5).map((item) => {
                        const share =
                          data.cashflow.expense > 0
                            ? Math.round(
                                (item.total / data.cashflow.expense) * 100,
                              )
                            : 0;
                        return (
                          <li key={item.categoryId}>
                            <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                              <span className="flex min-w-0 items-center gap-2 font-medium text-[var(--ink)]">
                                <CategoryGlyph
                                  icon={item.icon}
                                  className="h-4 w-4 shrink-0 text-[var(--ink-muted)]"
                                />
                                <span className="truncate">{item.name}</span>
                              </span>
                              <span className="tabular-nums shrink-0 font-semibold text-[var(--ink)]">
                                {formatCurrency(item.total, currency)} ({share}%)
                              </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                              <div
                                className="h-full rounded-full bg-[var(--accent)]"
                                style={{ width: `${Math.min(100, share)}%` }}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* LEDGER VIEW */}
          {data && activeTab === "ledger" && (
            <div className="space-y-4">
              <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:p-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                  <div className="sm:col-span-5">
                    <label htmlFor="ledger-search" className="sr-only">
                      Search notes, categories, or wallets
                    </label>
                    <input
                      id="ledger-search"
                      type="search"
                      placeholder="Search note, category, or wallet"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label htmlFor="ledger-wallet-filter" className="sr-only">
                      Filter by wallet
                    </label>
                    <select
                      id="ledger-wallet-filter"
                      value={walletFilter}
                      onChange={(e) => setWalletFilter(e.target.value)}
                      className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--ink)]"
                    >
                      <option value="ALL">All wallets</option>
                      {data.wallets.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <a
                      href={`/api/export?month=${encodeURIComponent(month)}`}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface-2)]"
                    >
                      <DownloadIcon className="h-4 w-4" />
                      <span>Export CSV</span>
                    </a>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(["ALL", "EXPENSE", "INCOME", "TRANSFER"] as const).map(
                    (f) => {
                      const active = typeFilter === f;
                      return (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setTypeFilter(f)}
                          aria-pressed={active}
                          className={`min-h-10 rounded-xl px-3.5 text-xs font-semibold transition-colors ${
                            active
                              ? "bg-[var(--accent)] text-white"
                              : "bg-[var(--surface-2)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
                          }`}
                        >
                          {f === "ALL"
                            ? "All"
                            : f === "EXPENSE"
                              ? "Expenses"
                              : f === "INCOME"
                                ? "Income"
                                : "Transfers"}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              {groupedTransactions.length === 0 ? (
                <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-8 text-center">
                  <p className="text-base font-semibold text-[var(--ink)]">
                    {data.transactions.length === 0
                      ? `No entries in ${monthLabel} yet`
                      : "No entries match your current filter"}
                  </p>
                  <p className="mt-1 text-sm text-[var(--ink-muted)]">
                    {data.transactions.length === 0
                      ? "Tap Record Entry to log an expense, income, or wallet transfer."
                      : "Clear your search or choose All to view every entry."}
                  </p>
                  {data.transactions.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setTypeFilter("ALL");
                        setWalletFilter("ALL");
                      }}
                      className="mt-4 inline-flex h-11 items-center rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--ink)]"
                    >
                      Reset Filters
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openQuickEntry("EXPENSE")}
                      className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white"
                    >
                      <PlusIcon className="h-4 w-4" />
                      <span>Record Entry</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedTransactions.map((group) => (
                    <section
                      key={group.dateKey}
                      className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:p-5"
                    >
                      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                        {group.label}
                      </h2>
                      <ul className="divide-y divide-[var(--border)]">
                        {group.items.map((tx) => renderTransactionRow(tx, true))}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* WALLETS VIEW */}
          {data && activeTab === "wallets" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.wallets.map((w) => (
                  <div
                    key={w.id}
                    className="flex flex-col justify-between rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-lg bg-[var(--surface-2)] px-2.5 py-1 text-xs font-semibold text-[var(--ink-muted)]">
                          {w.type}
                        </span>
                        {data.wallets.length > 1 && (
                          <button
                            type="button"
                            onClick={() => void handleRemoveWallet(w.id)}
                            aria-label={`Remove or archive ${w.name}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--expense)]"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <h2 className="mt-3 text-base font-bold text-[var(--ink)]">
                        {w.name}
                      </h2>
                      <p className="tabular-nums mt-1.5 text-2xl font-bold text-[var(--ink)]">
                        {formatCurrency(w.balance, w.currency)}
                      </p>
                    </div>
                    <p className="tabular-nums mt-4 text-xs text-[var(--ink-muted)]">
                      Opening balance:{" "}
                      {formatCurrency(w.initialBalance, w.currency)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Add Wallet Form */}
              <section className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-6">
                <h2 className="text-base font-bold text-[var(--ink)]">
                  Add a New Wallet
                </h2>
                <p className="mt-1 text-sm text-[var(--ink-muted)]">
                  Separate cash, bank accounts, e-wallets, savings, or credit
                  cards to keep balances accurate.
                </p>

                {walletFeedback && (
                  <p className="mt-3 text-sm font-medium text-[var(--accent-text)]">
                    {walletFeedback}
                  </p>
                )}

                <form
                  onSubmit={handleAddWallet}
                  className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-12"
                >
                  <div className="sm:col-span-4">
                    <label
                      htmlFor="wallet-name"
                      className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
                    >
                      Wallet Name
                    </label>
                    <input
                      id="wallet-name"
                      type="text"
                      required
                      maxLength={40}
                      placeholder="BCA Savings, GoPay, Cash"
                      value={walletName}
                      onChange={(e) => setWalletName(e.target.value)}
                      className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label
                      htmlFor="wallet-type"
                      className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
                    >
                      Account Type
                    </label>
                    <select
                      id="wallet-type"
                      value={walletType}
                      onChange={(e) =>
                        setWalletType(e.target.value as WalletType)
                      }
                      className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--ink)]"
                    >
                      <option value="BANK">Bank</option>
                      <option value="EWALLET">E-Wallet</option>
                      <option value="CASH">Cash</option>
                      <option value="SAVINGS">Savings</option>
                      <option value="CREDIT">Credit</option>
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label
                      htmlFor="wallet-initial"
                      className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
                    >
                      Opening Balance ({currency})
                    </label>
                    <input
                      id="wallet-initial"
                      type="number"
                      step="any"
                      inputMode="decimal"
                      value={walletInitial}
                      onChange={(e) => setWalletInitial(e.target.value)}
                      className="tabular-nums h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 text-sm text-[var(--ink)]"
                    />
                  </div>

                  <div className="flex items-end sm:col-span-2">
                    <button
                      type="submit"
                      disabled={walletSubmitting}
                      className="h-12 w-full rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
                    >
                      {walletSubmitting ? "Adding..." : "Add Wallet"}
                    </button>
                  </div>
                </form>
              </section>
            </div>
          )}

          {/* BUDGETS VIEW */}
          {data && activeTab === "budgets" && (
            <div className="space-y-5">
              {data.budgets.length === 0 ? (
                <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-6">
                  <h2 className="text-base font-bold text-[var(--ink)]">
                    No category budgets set for {monthLabel}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--ink-muted)]">
                    Set a monthly spending cap below to monitor pacing with
                    on-track, near-limit, and over-budget alerts.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {data.budgets.map((b) => {
                    const barColor =
                      b.status === "exceeded"
                        ? "var(--expense)"
                        : b.status === "warning"
                          ? "var(--warning)"
                          : "var(--income)";
                    const statusLabel =
                      b.status === "exceeded"
                        ? "Over budget"
                        : b.status === "warning"
                          ? "Near limit"
                          : "On track";

                    return (
                      <div
                        key={b.id}
                        className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--ink)]">
                              <CategoryGlyph
                                icon={b.categoryIcon}
                                className="h-4 w-4"
                              />
                            </div>
                            <div>
                              <h2 className="text-base font-bold text-[var(--ink)]">
                                {b.categoryName}
                              </h2>
                              <p
                                className="text-xs font-semibold"
                                style={{ color: barColor }}
                              >
                                {statusLabel} ({b.percent}%)
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => void handleDeleteBudget(b.id)}
                            aria-label={`Remove budget for ${b.categoryName}`}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--expense)]"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, b.percent)}%`,
                              backgroundColor: barColor,
                            }}
                          />
                        </div>

                        <div className="tabular-nums mt-3 flex items-center justify-between text-xs text-[var(--ink-muted)]">
                          <span>
                            Spent: {formatCurrency(b.spent, currency)}
                          </span>
                          <span>
                            Limit: {formatCurrency(b.limitAmount, currency)}
                          </span>
                        </div>
                        <p className="tabular-nums mt-1 text-xs font-semibold text-[var(--ink)]">
                          {b.remaining >= 0
                            ? `${formatCurrency(b.remaining, currency)} remaining`
                            : `${formatCurrency(Math.abs(b.remaining), currency)} over cap`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Set Budget + Custom Category Forms */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <section className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5">
                  <h2 className="text-base font-bold text-[var(--ink)]">
                    Set Monthly Category Cap ({monthLabel})
                  </h2>
                  {budgetFeedback && (
                    <p className="mt-2 text-sm font-medium text-[var(--accent-text)]">
                      {budgetFeedback}
                    </p>
                  )}
                  <form onSubmit={handleSaveBudget} className="mt-4 space-y-4">
                    <div>
                      <label
                        htmlFor="budget-category"
                        className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
                      >
                        Expense Category
                      </label>
                      <select
                        id="budget-category"
                        value={effectiveBudgetCategoryId}
                        onChange={(e) => setBudgetCategoryId(e.target.value)}
                        className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--ink)]"
                      >
                        {expenseCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="budget-limit"
                        className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
                      >
                        Monthly Limit ({currency})
                      </label>
                      <input
                        id="budget-limit"
                        type="number"
                        step="any"
                        min="1"
                        required
                        inputMode="decimal"
                        placeholder="2000000"
                        value={budgetLimit}
                        onChange={(e) => setBudgetLimit(e.target.value)}
                        className="tabular-nums h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={budgetSubmitting}
                      className="h-12 w-full rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
                    >
                      {budgetSubmitting ? "Saving..." : "Save Monthly Cap"}
                    </button>
                  </form>
                </section>

                <section className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5">
                  <h2 className="text-base font-bold text-[var(--ink)]">
                    Add Custom Category
                  </h2>
                  {categoryFeedback && (
                    <p className="mt-2 text-sm font-medium text-[var(--accent-text)]">
                      {categoryFeedback}
                    </p>
                  )}
                  <form onSubmit={handleAddCategory} className="mt-4 space-y-4">
                    <div>
                      <label
                        htmlFor="category-name"
                        className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
                      >
                        Category Name
                      </label>
                      <input
                        id="category-name"
                        type="text"
                        required
                        maxLength={32}
                        placeholder="Coffee, Gym, Side Project"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="category-type"
                        className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
                      >
                        Category Type
                      </label>
                      <select
                        id="category-type"
                        value={newCategoryType}
                        onChange={(e) =>
                          setNewCategoryType(
                            e.target.value as "EXPENSE" | "INCOME",
                          )
                        }
                        className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--ink)]"
                      >
                        <option value="EXPENSE">Expense</option>
                        <option value="INCOME">Income</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={categorySubmitting}
                      className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 text-sm font-semibold text-[var(--ink)] hover:border-[var(--accent)] disabled:opacity-50"
                    >
                      {categorySubmitting ? "Creating..." : "Create Category"}
                    </button>
                  </form>
                </section>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Mobile & Tablet Floating Liquid Glass Dock (< 1024px) */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 safe-bottom lg:hidden">
        <nav
          aria-label="Mobile navigation"
          className="liquid-glass pointer-events-auto mx-auto flex max-w-md items-center justify-between gap-1 rounded-[28px] px-2 py-1.5"
        >
          {navItems.slice(0, 2).map((item) => {
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

          {navItems.slice(2).map((item) => {
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

      {/* Quick Entry Liquid Glass Sheet */}
      {data && (
        <QuickEntrySheet
          open={sheetOpen}
          initialType={sheetInitialType}
          currency={currency}
          wallets={data.wallets}
          categories={data.categories}
          onClose={() => setSheetOpen(false)}
          onSaved={() => loadDashboard(month)}
        />
      )}
    </div>
  );
}
