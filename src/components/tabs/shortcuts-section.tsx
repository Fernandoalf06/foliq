"use client";

import React, { useEffect, useState } from "react";
import { CheckIcon, CopyIcon, KeyIcon, TrashIcon } from "../icons";
import type { ApiTokenItem } from "@/lib/types";

export function ShortcutsSection() {
  const [tokens, setTokens] = useState<ApiTokenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tokenName, setTokenName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newRawToken, setNewRawToken] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<"token" | "url" | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const endpointUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/shortcuts/record`
      : "/api/shortcuts/record";

  useEffect(() => {
    let active = true;
    fetch("/api/settings/tokens", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!active) return;
        if (json?.tokens) setTokens(json.tokens as ApiTokenItem[]);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const copyText = async (value: string, field: "token" | "url") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Clipboard API unavailable in restricted context
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNewRawToken(null);
    setCreating(true);
    try {
      const res = await fetch("/api/settings/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tokenName }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Failed to generate token.");
        setCreating(false);
        return;
      }
      setTokens((prev) => [json.token as ApiTokenItem, ...prev]);
      setNewRawToken(json.rawToken as string);
      setTokenName("");
    } catch {
      setError("Network error while generating token.");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/settings/tokens/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "Failed to revoke token.");
        return;
      }
      setTokens((prev) => prev.filter((t) => t.id !== id));
      setConfirmRevokeId(null);
    } catch {
      setError("Network error while revoking token.");
    }
  };

  return (
    <section className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-text)]">
          <KeyIcon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-[var(--ink)]">
            Apple Shortcuts & Quick Capture API
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Trigger expense logging from iPhone Back Tap, Action Button, or Siri
            Shortcuts using a revocable Bearer token.
          </p>
        </div>
      </div>

      {/* Webhook Endpoint & Sample Payload */}
      <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-[var(--ink-muted)]">
            POST Endpoint
          </span>
          <button
            type="button"
            onClick={() => void copyText(endpointUrl, "url")}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-semibold text-[var(--ink)] hover:border-[var(--accent)]"
          >
            {copiedField === "url" ? (
              <>
                <CheckIcon className="h-3.5 w-3.5 text-[var(--income)]" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <CopyIcon className="h-3.5 w-3.5" />
                <span>Copy URL</span>
              </>
            )}
          </button>
        </div>
        <p className="mt-1 break-all font-mono text-xs text-[var(--ink)]">
          {endpointUrl}
        </p>
        <p className="mt-2 text-xs text-[var(--ink-muted)]">
          Header:{" "}
          <code className="font-mono text-[var(--ink)]">
            Authorization: Bearer flq_...
          </code>{" "}
          · JSON body:{" "}
          <code className="font-mono text-[var(--ink)]">
            {`{"amount": 35000, "wallet": "E-Wallet", "category": "Food & Dining", "note": "Coffee"}`}
          </code>
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-[var(--expense)]/30 bg-[var(--expense-soft)] px-3.5 py-2.5 text-sm font-medium text-[var(--expense)]"
        >
          {error}
        </div>
      )}

      {newRawToken && (
        <div
          role="status"
          className="mt-4 rounded-xl border border-[var(--income)]/35 bg-[var(--income-soft)] p-4"
        >
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--income)]">
            Copy this token now (shown once)
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <code className="break-all font-mono text-xs font-semibold text-[var(--ink)]">
              {newRawToken}
            </code>
            <button
              type="button"
              onClick={() => void copyText(newRawToken, "token")}
              className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 text-xs font-semibold text-white"
            >
              {copiedField === "token" ? (
                <>
                  <CheckIcon className="h-3.5 w-3.5" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <CopyIcon className="h-3.5 w-3.5" />
                  <span>Copy Token</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <form
        onSubmit={handleGenerate}
        className="mt-4 flex flex-col gap-3 sm:flex-row"
      >
        <div className="flex-1">
          <label htmlFor="shortcut-token-name" className="sr-only">
            API token label
          </label>
          <input
            id="shortcut-token-name"
            type="text"
            required
            minLength={2}
            maxLength={50}
            placeholder="Token name (e.g. iPhone Back Tap)"
            value={tokenName}
            onChange={(e) => setTokenName(e.target.value)}
            className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]"
          />
        </div>
        <button
          type="submit"
          disabled={creating}
          className="h-12 shrink-0 rounded-xl bg-[var(--accent)] px-5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          {creating ? "Generating..." : "Generate Token"}
        </button>
      </form>

      <div className="mt-5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          Active Tokens ({tokens.length})
        </h3>
        {loading ? (
          <p className="mt-2 text-xs text-[var(--ink-muted)]">
            Loading tokens...
          </p>
        ) : tokens.length === 0 ? (
          <p className="mt-2 text-xs text-[var(--ink-muted)]">
            No API tokens created yet. Generate one above to connect Apple
            Shortcuts.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-[var(--border)]">
            {tokens.map((t) => {
              const isConfirming = confirmRevokeId === t.id;
              return (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--ink)]">
                      {t.name}
                    </p>
                    <p className="text-xs text-[var(--ink-muted)]">
                      <code className="font-mono">{t.tokenPrefix}...</code> ·{" "}
                      {t.lastUsedAt
                        ? `Last used ${new Date(t.lastUsedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                        : "Never used"}
                    </p>
                  </div>
                  {isConfirming ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void handleRevoke(t.id)}
                        className="min-h-11 rounded-lg bg-[var(--expense)] px-3 text-xs font-semibold text-white"
                      >
                        Revoke
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmRevokeId(null)}
                        className="min-h-11 rounded-lg border border-[var(--border)] px-2.5 text-xs font-medium text-[var(--ink-muted)]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmRevokeId(t.id)}
                      aria-label={`Revoke token ${t.name}`}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--expense)]"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
