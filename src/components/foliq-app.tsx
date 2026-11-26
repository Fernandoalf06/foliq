"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import {
  BudgetIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloudOffIcon,
  DownloadIcon,
  EyeIcon,
  EyeOffIcon,
  FoliqMark,
  LedgerIcon,
  MoonIcon,
  OverviewIcon,
  PlusIcon,
  PrinterIcon,
  SettingsIcon,
  SignOutIcon,
  SpinnerIcon,
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
import {
  clearOfflineQueue,
  getOfflineQueueServerSnapshot,
  getOfflineQueueSnapshot,
  readOfflineQueue,
  removeOfflineTransaction,
  subscribeOfflineQueue,
} from "@/lib/offline-queue";
import {
  getPrivacyServerSnapshot,
  getPrivacySnapshot,
  setPrivacyMode,
  subscribePrivacy,
} from "@/lib/preferences";
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
  const [currentMonth] = useState(() => formatMonthKey(new Date()));
  const [month, setMonth] = useState(() => formatMonthKey(new Date()));
  const [tzOffset] = useState(() => new Date().getTimezoneOffset());
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [openingReport, setOpeningReport] = useState(false);
  const [busyAction, setBusyAction] = useState(false);

  const privacyMode = useSyncExternalStore(
    subscribePrivacy,
    getPrivacySnapshot,
    getPrivacyServerSnapshot,
  );
  const togglePrivacy = useCallback(() => {
    setPrivacyMode(!privacyMode);
  }, [privacyMode]);

  const pendingQueue = useSyncExternalStore(
    subscribeOfflineQueue,
    getOfflineQueueSnapshot,
    getOfflineQueueServerSnapshot,
  );
  const [syncingQueue, setSyncingQueue] = useState(false);
  const [confirmClearQueue, setConfirmClearQueue] = useState(false);
  const syncingRef = useRef(false);

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

  useEffect(() => {
    if (!statusNotice) return;
    const timer = window.setTimeout(() => {
      setStatusNotice(null);
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [statusNotice]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (sheetOpen || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === "n") {
        e.preventDefault();
        setEditingTransaction(null);
        setSheetInitialType("EXPENSE");
        setSheetOpen(true);
      } else if (key === "p") {
        e.preventDefault();
        togglePrivacy();
      } else if (e.key === "[") {
        e.preventDefault();
        setMonth((m) => shiftMonth(m, -1));
      } else if (e.key === "]") {
        e.preventDefault();
        setMonth((m) => shiftMonth(m, 1));
      } else if (e.key === "1") {
        setActiveTab("overview");
      } else if (e.key === "2") {
        setActiveTab("ledger");
      } else if (e.key === "3") {
        setActiveTab("wallets");
      } else if (e.key === "4") {
        setActiveTab("budgets");
      } else if (e.key === "5") {
        setActiveTab("settings");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sheetOpen, togglePrivacy]);

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
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    onSignedOut();
  };

  const handleDeleteTransaction = async (id: string) => {
    setActionError(null);
    setBusyAction(true);
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setActionError(json.error || "Failed to delete transaction.");
        return;
      }
      setStatusNotice("Transaction deleted.");
      await loadDashboard(month);
    } catch {
      setActionError("Network error while deleting transaction.");
    } finally {
      setBusyAction(false);
    }
  };

  const handleRemoveWallet = async (id: string) => {
    setActionError(null);
    setBusyAction(true);
    try {
      const res = await fetch(`/api/wallets/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setActionError(json.error || "Failed to remove wallet.");
        return;
      }
      setStatusNotice("Wallet updated.");
      await loadDashboard(month);
    } catch {
      setActionError("Network error while removing wallet.");
    } finally {
      setBusyAction(false);
    }
  };

  const handleRestoreWallet = async (id: string) => {
    setActionError(null);
    setBusyAction(true);
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
      setStatusNotice("Wallet restored.");
      await loadDashboard(month);
    } catch {
      setActionError("Network error while restoring wallet.");
    } finally {
      setBusyAction(false);
    }
  };

  const handleDeleteBudget = async (id: string) => {
    setActionError(null);
    setBusyAction(true);
    try {
      const res = await fetch(`/api/budgets?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setActionError(json.error || "Failed to delete budget.");
        return;
      }
      setStatusNotice("Budget removed.");
      await loadDashboard(month);
    } catch {
      setActionError("Network error while deleting budget.");
    } finally {
      setBusyAction(false);
    }
  };

  const handleRecordRecurring = async (id: string) => {
    setActionError(null);
    setStatusNotice(null);
    try {
      const res = await fetch(`/api/recurring/${id}/record`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401) {
        onSignedOut();
        return;
      }
      if (!res.ok) {
        setActionError(json.error || "Failed to record recurring transaction.");
        return;
      }
      setStatusNotice("Recurring entry recorded and next due date advanced.");
      await loadDashboard(month);
    } catch {
      setActionError("Network error while recording recurring transaction.");
    }
  };

  const syncOfflineQueue = useCallback(async () => {
    if (syncingRef.current) return;
    const queued = readOfflineQueue();
    if (queued.length === 0) return;

    syncingRef.current = true;
    setSyncingQueue(true);
    setActionError(null);
    setConfirmClearQueue(false);

    let syncedCount = 0;
    try {
      for (const item of queued) {
        const res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: item.type,
            amount: item.amount,
            walletId: item.walletId,
            targetWalletId: item.targetWalletId,
            categoryId: item.categoryId,
            note: item.note,
            occurredAt: item.occurredAt,
          }),
        });

        if (res.status === 401) {
          onSignedOut();
          return;
        }

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          setActionError(
            json.error ||
              "Could not sync an offline entry. Check your wallet or discard stale items.",
          );
          break;
        }

        removeOfflineTransaction(item.localId);
        syncedCount += 1;
      }

      if (syncedCount > 0) {
        setStatusNotice(
          `Synced ${syncedCount} queued ${syncedCount === 1 ? "entry" : "entries"} to Neon.`,
        );
        await loadDashboard(month);
      }
    } catch {
      setActionError(
        "Still offline. Your queued entries remain stored safely on this device.",
      );
    } finally {
      syncingRef.current = false;
      setSyncingQueue(false);
    }
  }, [loadDashboard, month, onSignedOut]);

  useEffect(() => {
    const handleOnline = () => {
      if (readOfflineQueue().length > 0) {
        void syncOfflineQueue();
      }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [syncOfflineQueue]);

  const monthLabel = formatReadableMonth(month);
  const currency = data?.user.currency ?? "IDR";
  const exportHref = `/api/export?month=${encodeURIComponent(month)}&tzOffset=${encodeURIComponent(String(tzOffset))}`;
  const reportHref = `/report?month=${encodeURIComponent(month)}&tzOffset=${encodeURIComponent(String(tzOffset))}`;

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
          ? "Wallets & Goals"
          : activeTab === "budgets"
            ? "Budgets & Recurring"
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
          <Link
            href={reportHref}
            onClick={() => setOpeningReport(true)}
            className="flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
          >
            {openingReport ? (
              <SpinnerIcon className="h-4 w-4 text-[var(--accent-text)]" />
            ) : (
              <PrinterIcon className="h-4 w-4" />
            )}
            <span>
              {openingReport ? "Opening report..." : `${monthLabel} Report (PDF)`}
            </span>
          </Link>
          <a
            href={exportHref}
            className="flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
          >
            <DownloadIcon className="h-4 w-4" />
            <span>Export {monthLabel} CSV</span>
          </a>
          <button
            type="button"
            onClick={togglePrivacy}
            aria-pressed={privacyMode}
            className="flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
          >
            {privacyMode ? (
              <EyeIcon className="h-4 w-4" />
            ) : (
              <EyeOffIcon className="h-4 w-4" />
            )}
            <span>{privacyMode ? "Show Balances" : "Hide Balances"}</span>
          </button>
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
            disabled={signingOut}
            onClick={() => void handleSignOut()}
            className="flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--expense)] disabled:opacity-60"
          >
            {signingOut ? (
              <SpinnerIcon className="h-4 w-4" />
            ) : (
              <SignOutIcon className="h-4 w-4" />
            )}
            <span>{signingOut ? "Signing out..." : "Sign Out"}</span>
          </button>
        </div>
      </aside>

      {/* Main Column */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--ground)]/95 px-3 pb-2.5 backdrop-blur-sm safe-top sm:px-6">
          {(busyAction || Boolean(data && data.month !== month) || syncingQueue) && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-[var(--accent-soft)]"
            >
              <div className="animate-progress-bar h-full w-1/3 rounded-full bg-[var(--accent)]" />
            </div>
          )}
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-2">
            <div className="flex shrink-0 items-center gap-2 lg:hidden">
              <FoliqMark className="h-7 w-7" />
              <span className="hidden text-base font-bold tracking-tight text-[var(--ink)] min-[420px]:inline">
                Foliq
              </span>
            </div>

            <div className="hidden lg:block">
              <h1 className="text-xl font-bold tracking-tight text-[var(--ink)]">
                {pageHeading}
              </h1>
            </div>

            <div className="flex min-w-0 items-center gap-1.5">
              <div className="flex min-w-0 items-center gap-0.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-0.5 sm:gap-1 sm:p-1">
                <button
                  type="button"
                  onClick={() => setMonth((m) => shiftMonth(m, -1))}
                  aria-label="Previous month"
                  className="inline-flex h-11 w-10 items-center justify-center rounded-lg text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)] sm:w-11"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>
                {month !== currentMonth ? (
                  <button
                    type="button"
                    onClick={() => setMonth(currentMonth)}
                    title="Jump to current month"
                    aria-label={`${monthLabel}. Tap to return to current month`}
                    className="tabular-nums inline-flex h-11 min-w-[66px] items-center justify-center gap-1.5 rounded-lg px-1.5 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--surface-2)] sm:min-w-[84px] sm:text-sm"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]"
                      aria-hidden="true"
                    />
                    <span>{monthLabel}</span>
                  </button>
                ) : (
                  <span className="tabular-nums min-w-[66px] px-1 text-center text-xs font-semibold text-[var(--ink)] sm:min-w-[84px] sm:text-sm">
                    {monthLabel}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setMonth((m) => shiftMonth(m, 1))}
                  aria-label="Next month"
                  className="inline-flex h-11 w-10 items-center justify-center rounded-lg text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)] sm:w-11"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>

              {month !== currentMonth && (
                <button
                  type="button"
                  onClick={() => setMonth(currentMonth)}
                  className="hidden h-11 items-center rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-3 text-xs font-semibold text-[var(--accent-text)] hover:border-[var(--accent)] sm:inline-flex"
                >
                  Today
                </button>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1 lg:hidden">
              <button
                type="button"
                onClick={togglePrivacy}
                aria-label={privacyMode ? "Show balances" : "Hide balances"}
                aria-pressed={privacyMode}
                className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${
                  privacyMode
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)]"
                    : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--ink)] hover:bg-[var(--surface-2)]"
                }`}
              >
                {privacyMode ? (
                  <EyeIcon className="h-4 w-4" />
                ) : (
                  <EyeOffIcon className="h-4 w-4" />
                )}
              </button>
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

          {pendingQueue.length > 0 && (
            <div
              role="status"
              className="mb-4 flex flex-col gap-3 rounded-[20px] border border-[var(--accent)]/30 bg-[var(--accent-soft)] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <CloudOffIcon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent-text)]" />
                <div>
                  <p className="text-sm font-semibold text-[var(--ink)]">
                    {pendingQueue.length} offline{" "}
                    {pendingQueue.length === 1 ? "entry" : "entries"} pending
                    sync
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                    Stored locally on this device and queued to sync to Neon
                    when connected.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={syncingQueue}
                  onClick={() => void syncOfflineQueue()}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--accent)] px-4 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
                >
                  {syncingQueue ? "Syncing..." : "Sync Now"}
                </button>
                {confirmClearQueue ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        clearOfflineQueue();
                        setConfirmClearQueue(false);
                        setStatusNotice("Offline queue cleared.");
                      }}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--expense)] px-3 text-xs font-semibold text-white"
                    >
                      Confirm Discard
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClearQueue(false)}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-semibold text-[var(--ink)]"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmClearQueue(true)}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)]"
                  >
                    Discard
                  </button>
                )}
              </div>
            </div>
          )}

          {actionError && (
            <div
              role="alert"
              className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[var(--expense)]/30 bg-[var(--expense-soft)] px-4 py-3 text-sm font-medium text-[var(--expense)]"
            >
              <span>{actionError}</span>
              <button
                type="button"
                onClick={() => setActionError(null)}
                className="min-h-11 rounded-lg px-2 text-xs font-semibold underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {loading && !data && (
            <div
              role="status"
              aria-label={`Loading ledger for ${monthLabel}`}
              className="space-y-5 animate-pulse"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                <div className="h-52 rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-6 md:col-span-7">
                  <div className="h-3 w-28 rounded bg-[var(--surface-2)]" />
                  <div className="mt-4 h-9 w-56 rounded-lg bg-[var(--surface-2)]" />
                  <div className="mt-3 h-3 w-36 rounded bg-[var(--surface-2)]" />
                  <div className="mt-6 flex gap-2.5">
                    <div className="h-11 w-32 rounded-xl bg-[var(--surface-2)]" />
                    <div className="h-11 w-32 rounded-xl bg-[var(--surface-2)]" />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:col-span-5 md:grid-cols-1">
                  <div className="h-24 rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5">
                    <div className="h-3 w-24 rounded bg-[var(--surface-2)]" />
                    <div className="mt-3 h-7 w-36 rounded bg-[var(--surface-2)]" />
                  </div>
                  <div className="h-24 rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5">
                    <div className="h-3 w-24 rounded bg-[var(--surface-2)]" />
                    <div className="mt-3 h-7 w-36 rounded bg-[var(--surface-2)]" />
                  </div>
                </div>
              </div>
              <div className="h-64 rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5" />
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

          <div
            key={activeTab}
            className={
              data && data.month !== month
                ? "animate-tab-in opacity-70 transition-opacity duration-150"
                : "animate-tab-in transition-opacity duration-150"
            }
          >
            {data && activeTab === "overview" && (
              <OverviewTab
                data={data}
                currency={currency}
                monthLabel={monthLabel}
                privacyMode={privacyMode}
                onOpenQuickEntry={openQuickEntry}
                onEditTransaction={openEditTransaction}
                onRecordRecurring={handleRecordRecurring}
                onNavigateTab={setActiveTab}
              />
            )}

            {data && activeTab === "ledger" && (
              <LedgerTab
                data={data}
                currency={currency}
                monthLabel={monthLabel}
                privacyMode={privacyMode}
                exportHref={exportHref}
                reportHref={reportHref}
                onOpenQuickEntry={openQuickEntry}
                onEditTransaction={openEditTransaction}
                onDeleteTransaction={handleDeleteTransaction}
              />
            )}

            {data && activeTab === "wallets" && (
              <WalletsTab
                wallets={data.wallets}
                archivedWallets={data.archivedWallets}
                savingsGoals={data.savingsGoals}
                currency={currency}
                privacyMode={privacyMode}
                onRefresh={() => loadDashboard(month)}
                onRemoveWallet={handleRemoveWallet}
                onRestoreWallet={handleRestoreWallet}
              />
            )}

            {data && activeTab === "budgets" && (
              <BudgetsTab
                budgets={data.budgets}
                recurringRules={data.recurringRules}
                wallets={data.wallets}
                categories={data.categories}
                month={month}
                monthLabel={monthLabel}
                currency={currency}
                privacyMode={privacyMode}
                onRefresh={() => loadDashboard(month)}
                onDeleteBudget={handleDeleteBudget}
                onRecordRecurring={handleRecordRecurring}
              />
            )}

            {data && activeTab === "settings" && (
              <SettingsTab
                user={data.user}
                wallets={data.wallets}
                categories={data.categories}
                exchangeRates={data.exchangeRates}
                monthLabel={monthLabel}
                monthExportHref={exportHref}
                reportHref={reportHref}
                onRefresh={() => loadDashboard(month)}
                onSignOut={handleSignOut}
              />
            )}
          </div>
        </main>
      </div>

      {/* Floating Auto-Dismiss Toast */}
      {statusNotice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 left-4 right-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-[var(--income)]/40 bg-[var(--surface-1)] px-4 py-3 text-sm font-medium text-[var(--ink)] shadow-lg lg:bottom-6 lg:left-auto lg:right-6 lg:mx-0"
        >
          <span className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-[var(--income)]"
              aria-hidden="true"
            />
            <span>{statusNotice}</span>
          </span>
          <button
            type="button"
            onClick={() => setStatusNotice(null)}
            className="min-h-11 shrink-0 rounded-lg px-2 text-xs font-semibold text-[var(--accent-text)] hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

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
          onSaved={async () => {
            setStatusNotice(
              editingTransaction
                ? "Transaction changes saved."
                : "Entry saved to your ledger.",
            );
            await loadDashboard(month);
          }}
          onOfflineQueued={() =>
            setStatusNotice(
              "Saved to offline queue. It will sync automatically when you reconnect.",
            )
          }
        />
      )}
    </div>
  );
}
