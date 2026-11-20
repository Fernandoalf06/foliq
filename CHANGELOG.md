# Changelog

All notable changes to **Foliq** are documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
