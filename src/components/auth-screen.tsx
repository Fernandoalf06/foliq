"use client";

import React, { useState } from "react";
import {
  EyeIcon,
  EyeOffIcon,
  FoliqMark,
  LockIcon,
  MoonIcon,
  SunIcon,
} from "./icons";
import { useTheme } from "./theme-provider";

interface AuthScreenProps {
  hasOwnerAccount: boolean;
  ownerConfigured: boolean;
  onAuthenticated: () => void;
}

export function AuthScreen({
  hasOwnerAccount,
  ownerConfigured,
  onAuthenticated,
}: AuthScreenProps) {
  const { theme, toggleTheme } = useTheme();
  const [mode, setMode] = useState<"login" | "register">(
    hasOwnerAccount ? "login" : "register",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [currency, setCurrency] = useState<"IDR" | "USD" | "SGD" | "EUR">(
    "IDR",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const endpoint =
        mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const payload =
        mode === "register"
          ? { name, email, password, currency }
          : { email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Authentication failed. Please check your input.");
        setSubmitting(false);
        return;
      }

      onAuthenticated();
    } catch {
      setError("Network error. Check your connection and try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--ground)] px-4 py-6 safe-top safe-bottom">
      <header className="mx-auto flex w-full max-w-md items-center justify-between">
        <div className="flex items-center gap-2.5">
          <FoliqMark className="h-8 w-8" />
          <span className="text-lg font-bold tracking-tight text-[var(--ink)]">
            Foliq
          </span>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={
            theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
          }
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-[var(--ink)] transition-colors hover:bg-[var(--surface-2)] active:scale-[0.98]"
        >
          {theme === "dark" ? (
            <SunIcon className="h-5 w-5" />
          ) : (
            <MoonIcon className="h-5 w-5" />
          )}
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-6 sm:p-7">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--ink)]">
              {mode === "register"
                ? "Create your owner vault"
                : "Sign in to Foliq"}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-muted)]">
              {mode === "register"
                ? "Set up your single-owner account. Only the OWNER_EMAIL configured on the server can register."
                : "Access your personal wallets, daily cashflow, and monthly budgets. Compatible with iOS Passwords and Face ID autofill."}
            </p>
          </div>

          {!ownerConfigured && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning)]"
            >
              Server environment variable{" "}
              <code className="font-mono font-semibold">OWNER_EMAIL</code> is
              not configured yet. Add it in Vercel or{" "}
              <code className="font-mono">.env.local</code> before signing up.
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-[var(--expense)]/30 bg-[var(--expense-soft)] px-4 py-3 text-sm font-medium text-[var(--expense)]"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label
                  htmlFor="auth-name"
                  className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
                >
                  Your Name
                </label>
                <input
                  id="auth-name"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 text-base text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent)]"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="auth-email"
                className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
              >
                Owner Email
              </label>
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="username"
                inputMode="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 text-base text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent)]"
              />
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={mode === "register" ? 8 : 1}
                  autoComplete={
                    mode === "register" ? "new-password" : "current-password"
                  }
                  placeholder={
                    mode === "register"
                      ? "At least 8 characters"
                      : "Enter your password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] pl-3.5 pr-12 text-base text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute right-0.5 top-0.5 inline-flex h-11 w-11 items-center justify-center rounded-xl text-[var(--ink-muted)] hover:text-[var(--ink)]"
                >
                  {showPassword ? (
                    <EyeOffIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {mode === "register" && (
              <div>
                <label
                  htmlFor="auth-currency"
                  className="mb-1.5 block text-sm font-medium text-[var(--ink)]"
                >
                  Primary Currency
                </label>
                <select
                  id="auth-currency"
                  value={currency}
                  onChange={(e) =>
                    setCurrency(
                      e.target.value as "IDR" | "USD" | "SGD" | "EUR",
                    )
                  }
                  className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 text-base text-[var(--ink)]"
                >
                  <option value="IDR">IDR (Indonesian Rupiah)</option>
                  <option value="USD">USD (US Dollar)</option>
                  <option value="SGD">SGD (Singapore Dollar)</option>
                  <option value="EUR">EUR (Euro)</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !ownerConfigured}
              className="mt-2 inline-flex h-12 w-full items-center justify-center rounded-xl bg-[var(--accent)] px-4 text-base font-semibold text-white transition-transform hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-50"
            >
              {submitting
                ? mode === "register"
                  ? "Creating vault..."
                  : "Signing in..."
                : mode === "register"
                  ? "Create Owner Account"
                  : "Sign In"}
            </button>
          </form>

          {hasOwnerAccount && mode === "login" && (
            <p className="mt-4 text-center text-xs leading-relaxed text-[var(--ink-muted)]">
              Locked out? Reset your owner password from your local repository
              using Prisma and Neon CLI.
            </p>
          )}

          {!hasOwnerAccount && (
            <div className="mt-5 border-t border-[var(--border)] pt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode(mode === "register" ? "login" : "register");
                }}
                className="min-h-11 px-2 text-sm font-medium text-[var(--accent-text)] hover:underline"
              >
                {mode === "register"
                  ? "Already created an account? Sign in"
                  : "Need to initialize the owner account?"}
              </button>
            </div>
          )}
        </div>

        <footer className="mt-5 flex items-center justify-center gap-2 text-xs text-[var(--ink-muted)]">
          <LockIcon className="h-3.5 w-3.5" />
          <span>Single-owner Neon session authentication</span>
        </footer>
      </main>
    </div>
  );
}
