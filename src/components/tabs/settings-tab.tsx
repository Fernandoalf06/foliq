"use client";

import React, { useState } from "react";
import pkg from "../../../package.json";
import {
  DownloadIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MoonIcon,
  SignOutIcon,
  SunIcon,
} from "../icons";
import { useTheme } from "../theme-provider";
import { ExchangeRatesSection } from "./exchange-rates-section";
import { ShortcutsSection } from "./shortcuts-section";
import type { ExchangeRateItem, UserProfile } from "@/lib/types";

interface SettingsTabProps {
  user: UserProfile;
  exchangeRates: ExchangeRateItem[];
  monthLabel: string;
  monthExportHref: string;
  onRefresh: () => Promise<void>;
  onSignOut: () => Promise<void>;
}

export function SettingsTab({
  user,
  exchangeRates,
  monthLabel,
  monthExportHref,
  onRefresh,
  onSignOut,
}: SettingsTabProps) {
  const { theme, toggleTheme } = useTheme();

  // Profile & Currency state
  const [name, setName] = useState(user.name);
  const [currency, setCurrency] = useState<"IDR" | "USD" | "SGD" | "EUR">(
    (["IDR", "USD", "SGD", "EUR"].includes(user.currency)
      ? user.currency
      : "IDR") as "IDR" | "USD" | "SGD" | "EUR",
  );
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Password Change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileFeedback(null);
    setProfileSubmitting(true);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, currency }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProfileFeedback({
          type: "error",
          text: json.error || "Failed to save profile settings.",
        });
        setProfileSubmitting(false);
        return;
      }
      setProfileFeedback({
        type: "success",
        text: "Profile and primary currency updated.",
      });
      await onRefresh();
    } catch {
      setProfileFeedback({
        type: "error",
        text: "Network error while saving profile.",
      });
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({
        type: "error",
        text: "New password and confirmation do not match.",
      });
      return;
    }

    setPasswordSubmitting(true);
    try {
      const res = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPasswordFeedback({
          type: "error",
          text: json.error || "Failed to update password.",
        });
        setPasswordSubmitting(false);
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordFeedback({
        type: "success",
        text: "Password updated. Other device sessions have been signed out.",
      });
    } catch {
      setPasswordFeedback({
        type: "error",
        text: "Network error while updating password.",
      });
    } finally {
      setPasswordSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Profile & Currency */}
        <section className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-6">
          <h2 className="text-base font-bold text-[var(--ink)]">
            Profile & Primary Currency
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Signed in as{" "}
            <span className="font-medium text-[var(--ink)]">{user.email}</span>.
            Primary currency controls Net Balance and trend chart conversion
            while each wallet keeps its own currency.
          </p>

          {profileFeedback && (
            <div
              role={profileFeedback.type === "error" ? "alert" : "status"}
              className={`mt-4 rounded-xl px-3.5 py-2.5 text-sm font-medium ${
                profileFeedback.type === "error"
                  ? "border border-[var(--expense)]/30 bg-[var(--expense-soft)] text-[var(--expense)]"
                  : "border border-[var(--income)]/30 bg-[var(--income-soft)] text-[var(--income)]"
              }`}
            >
              {profileFeedback.text}
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="settings-name"
                className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
              >
                Display Name
              </label>
              <input
                id="settings-name"
                type="text"
                required
                minLength={2}
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 text-sm text-[var(--ink)]"
              />
            </div>

            <div>
              <label
                htmlFor="settings-currency"
                className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
              >
                Primary Currency
              </label>
              <select
                id="settings-currency"
                value={currency}
                onChange={(e) =>
                  setCurrency(e.target.value as "IDR" | "USD" | "SGD" | "EUR")
                }
                className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--ink)]"
              >
                <option value="IDR">IDR (Indonesian Rupiah)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="SGD">SGD (Singapore Dollar)</option>
                <option value="EUR">EUR (Euro)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={profileSubmitting}
              className="h-12 w-full rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {profileSubmitting ? "Saving profile..." : "Save Profile"}
            </button>
          </form>
        </section>

        {/* Change Password */}
        <section className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-[var(--ink)]">
                Change Owner Password
              </h2>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">
                Updating your password automatically signs out all other active
                devices.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPasswords((prev) => !prev)}
              aria-label={showPasswords ? "Hide passwords" : "Show passwords"}
              aria-pressed={showPasswords}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
            >
              {showPasswords ? (
                <EyeOffIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>

          {passwordFeedback && (
            <div
              role={passwordFeedback.type === "error" ? "alert" : "status"}
              className={`mt-4 rounded-xl px-3.5 py-2.5 text-sm font-medium ${
                passwordFeedback.type === "error"
                  ? "border border-[var(--expense)]/30 bg-[var(--expense-soft)] text-[var(--expense)]"
                  : "border border-[var(--income)]/30 bg-[var(--income-soft)] text-[var(--income)]"
              }`}
            >
              {passwordFeedback.text}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="mt-4 space-y-3.5">
            <div>
              <label
                htmlFor="settings-current-password"
                className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
              >
                Current Password
              </label>
              <input
                id="settings-current-password"
                type={showPasswords ? "text" : "password"}
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 text-sm text-[var(--ink)]"
              />
            </div>

            <div>
              <label
                htmlFor="settings-new-password"
                className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
              >
                New Password
              </label>
              <input
                id="settings-new-password"
                type={showPasswords ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]"
              />
            </div>

            <div>
              <label
                htmlFor="settings-confirm-password"
                className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
              >
                Confirm New Password
              </label>
              <input
                id="settings-confirm-password"
                type={showPasswords ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 text-sm text-[var(--ink)]"
              />
            </div>

            <button
              type="submit"
              disabled={passwordSubmitting}
              className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 text-sm font-semibold text-[var(--ink)] hover:border-[var(--accent)] disabled:opacity-50"
            >
              {passwordSubmitting ? "Updating password..." : "Update Password"}
            </button>
          </form>
        </section>
      </div>

      {/* Multi-Currency Exchange Rates */}
      <ExchangeRatesSection
        primaryCurrency={user.currency}
        rates={exchangeRates}
        onRefresh={onRefresh}
      />

      {/* Apple Shortcuts & API Tokens */}
      <ShortcutsSection />

      {/* Data Backup & Appearance */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-6">
          <h2 className="text-base font-bold text-[var(--ink)]">
            Data Backup & CSV Export
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Download formula-safe UTF-8 CSV backups of your ledger for offline
            archiving or spreadsheet analysis.
          </p>
          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
            <a
              href="/api/export"
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
            >
              <DownloadIcon className="h-4 w-4" />
              <span>Export All History (CSV)</span>
            </a>
            <a
              href={monthExportHref}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 text-sm font-semibold text-[var(--ink)] hover:border-[var(--accent)]"
            >
              <DownloadIcon className="h-4 w-4" />
              <span>Export {monthLabel}</span>
            </a>
          </div>
        </section>

        <section className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-6">
          <h2 className="text-base font-bold text-[var(--ink)]">
            Appearance & Vault Session
          </h2>
          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-12 w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 text-sm font-semibold text-[var(--ink)] hover:border-[var(--accent)]"
            >
              <span className="inline-flex items-center gap-2.5">
                {theme === "dark" ? (
                  <SunIcon className="h-4 w-4" />
                ) : (
                  <MoonIcon className="h-4 w-4" />
                )}
                <span>
                  {theme === "dark"
                    ? "Switch to Light Mode"
                    : "Switch to Dark OLED Mode"}
                </span>
              </span>
              <span className="text-xs font-medium text-[var(--ink-muted)]">
                {theme === "dark" ? "Dark" : "Light"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => void onSignOut()}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--expense)]/35 bg-[var(--expense-soft)] px-4 text-sm font-semibold text-[var(--expense)] hover:opacity-90"
            >
              <SignOutIcon className="h-4 w-4" />
              <span>Sign Out of Foliq</span>
            </button>

            <p className="flex items-center gap-2 pt-1 text-xs text-[var(--ink-muted)]">
              <LockIcon className="h-3.5 w-3.5 shrink-0" />
              <span>
                Foliq v{pkg.version} · Single-owner Neon PostgreSQL session
              </span>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
