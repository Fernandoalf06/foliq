# Changelog

All notable changes to **Foliq** are documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.2.0] - 2026-11-21

### Added

- **Edit Transactions (`PATCH /api/transactions/[id]`):** Tap the Edit button on any Overview or Ledger entry to modify its type, amount, wallet, transfer destination, category, date/time, or note inside the Liquid Glass sheet without deleting and re-entering.
- **Edit & Restore Archived Wallets:** Added inline editing for wallet name, account type, and opening balance on every wallet card, plus an **Archived Wallets** section with one-tap restoration (`isArchived: false`) so archived wallets and their balances are never lost.
- **Settings Panel (`SettingsTab`):** Added a dedicated Settings view accessible from the desktop sidebar and mobile top bar, featuring:
  - **Profile & Primary Currency (`PATCH /api/settings/profile`):** Update display name and switch primary currency (`IDR`, `USD`, `SGD`, `EUR`) across wallets.
  - **Change Owner Password (`POST /api/settings/password`):** Update owner password with Show/Hide toggle and automatic revocation of all other active device sessions.
  - **All-Time & Monthly CSV Backup:** Direct download actions for full historical CSV backups (`/api/export`) and selected-month backups.
  - **Appearance & Vault Info:** Light/Dark OLED toggle, active owner identity, version display (`v0.2.0`), and Sign Out control.
- **Validation Regression Tests:** Added unit test suite (`src/lib/validators.test.ts`) covering UUID validation, transaction transfer/category invariants, profile updates, and password-change rules.

### Changed

- Updated Service Worker cache namespace to `foliq-shell-v0-2-0`.
- Replaced the mobile top-right Sign Out icon with a dedicated Settings shortcut (keeping Sign Out inside Settings and the desktop rail) so all settings remain one tap away while keeping the floating Liquid Glass bottom dock focused on the 4 core financial views + Quick Entry.

## [0.1.1] - 2026-11-21

### Security

- **Serverless-Safe Persistent Rate Limiting:** Migrated login and registration rate limits from process memory to a dedicated `auth_rate_limits` table in Neon PostgreSQL so brute-force protection holds across Vercel serverless instances and cold starts.
- **CSV Formula Injection Protection:** Neutralized spreadsheet formula prefixes (`=`, `+`, `-`, `@`, tab, CR) on text fields in CSV exports while keeping numeric amount columns intact.
- **Defense-in-Depth CSRF & CSP Headers:** Added same-origin verification (`assertSameOrigin`) on all mutating `POST`/`PATCH`/`DELETE` API endpoints and configured a `Content-Security-Policy` header in `next.config.ts`.
- **Constant-Time Auth & Session Hygiene:** Added dummy `scrypt` verification on non-owner or missing-user login attempts to reduce timing side channels and automatically prune expired user sessions on sign-in.

### Fixed

- **Local Timezone Accuracy (WIB / UTC+7 & Global Offsets):** Dashboard month boundaries, daily cashflow bar chart bucketing, CSV monthly exports, and Ledger date grouping now respect the user's local timezone offset instead of UTC, fixing transactions recorded between 00:00 and 06:59 WIB shifting to the previous day or month.
- **Strict UUID Validation:** Validated wallet, transaction, and budget IDs as UUIDs before querying PostgreSQL so invalid IDs return `400 Bad Request` instead of `500 Internal Server Error`.
- **Service Worker Cache Safety:** Removed dynamic authenticated `/` HTML from Service Worker precaching and added a self-contained offline fallback page so stale auth state is never served offline.
- **Action Error Visibility:** Failed delete/remove actions on transactions, wallets, and budgets now display a dismissible error alert instead of failing silently.

### Changed

- **PostgreSQL GroupBy Wallet Aggregation:** Replaced full-ledger memory loading in `/api/dashboard` with indexed PostgreSQL `groupBy` sums for faster wallet balance computation.
- **Quick Entry & Auth UX Polish:** Added live formatted currency preview while typing amounts (preventing zero-count typos in IDR), two-step delete confirmations on Wallets and Budgets, an accessible Show/Hide Password toggle and owner recovery note on the Sign In screen, and a `192x192` `"any"` PWA manifest icon (`/icon-192`).
- **Modular Component Architecture:** Decomposed `src/components/foliq-app.tsx` into focused tab modules (`overview-tab`, `ledger-tab`, `wallets-tab`, `budgets-tab`, `transaction-row`).

## [0.1.0] - 2026-11-21

### Added

- **Installable iPhone & Desktop PWA:** Web App Manifest, standalone display mode, safe-area inset handling, Apple touch icon, and a shell Service Worker that excludes private `/api/*` financial data from caching.
- **Crisp Utility UI with Restrained Liquid Glass:** Mobile-first floating Liquid Glass bottom dock and Quick Entry sheet paired with solid matte cards, tabular numbers, verified WCAG AA contrast ratios, and automatic + manual Light / Dark OLED mode switching.
- **Single-Owner Authentication:** Email and password authentication backed by Neon PostgreSQL sessions, `scrypt` password hashing, HTTP-Only cookies, sliding-window rate limiting, and `OWNER_EMAIL` registration allowlisting (compatible with iOS Passwords and Face ID autofill).
- **Multi-Wallet Ledger & Transfers:** Support for Cash, Bank, E-Wallet, Savings, and Credit wallets with exact minor-unit balance computation and neutral wallet-to-wallet transfers that never inflate monthly income or spending.
- **Quick Entry Sheet:** Fast expense, income, and transfer recording with currency quick-add presets, category selection, date/time control, and optional notes.
- **Monthly Cashflow Overview & Chart:** Total net balance, monthly income/expense totals, savings rate calculation, top spending categories breakdown, and a daily income vs. expense bar chart.
- **Monthly Category Budgets & Custom Categories:** Per-category monthly caps with on-track, near-limit, and over-budget pacing alerts plus custom expense/income category creation.
- **Ledger Search, Filtering & CSV Export:** Chronological date-grouped transaction list with keyword search, transaction type and wallet filters, two-step delete confirmation, and RFC-safe monthly CSV backup export.
- **Project Governance & Automated Infrastructure:** Permanent engineering standards in `AGENTS.md`, design direction in `DESIGN.md`, Neon PostgreSQL integration via Vercel CLI, and unit tests for financial math.
