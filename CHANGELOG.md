# Changelog

All notable changes to **Foliq** are documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.2.4] - 2026-11-27

### Fixed

- **Sticky Header & Report Action Bar Anchor (`src/app/globals.css`):** Replaced `overflow-x: hidden` with `overflow-x: clip` on `html` and `body` so `position: sticky; top: 0` on the opaque app `<header>` and `/report` action bar remains pinned while scrolling (preventing WebKit top-edge unanchoring on iOS Safari PWA) while preserving zero horizontal overflow.

### Changed

- Bumped Service Worker shell cache namespace to `foliq-shell-v1-2-4`.

## [1.2.3] - 2026-11-27

### Fixed

- **iOS 26+ Standalone PWA Top Blur & Header Obstruction (`src/app/layout.tsx`, `src/app/globals.css`, `src/components/foliq-app.tsx`, `src/components/report-actions.tsx`, `src/components/theme-provider.tsx`):**
  - Made the main sticky `<header>` and `/report` action bar 100% solid opaque (`bg-[var(--ground)]`, removing `/95` alpha and `backdrop-blur-sm`) so WebKit recognizes the top bar as a valid opaque edge anchor instead of rendering a native progressive blur scrim over header controls.
  - Added a standalone-only fixed opaque `.pwa-status-bar-shield` (`height: max(env(safe-area-inset-top, 0px), 54px)`) and enforced minimum standalone safe-area clearance (`calc(max(env(safe-area-inset-top, 0px), 54px) + 1rem)` / `+ 1.25rem`) so headers and `/report` buttons remain below the Dynamic Island and top blur fade zone even if iOS reports `0px` on cold start or route transitions.
  - Switched `appleWebApp.statusBarStyle` from `"black-translucent"` to `"default"` and synced `<meta name="theme-color">` dynamically with Foliq's active Light (`#F5F6F8`) and Dark OLED (`#000000`) theme.
- **Settings Mobile CSV Export Tap Targets (`src/components/tabs/settings-tab.tsx`):** Replaced mobile vertical `flex-1` collapse with `h-12 shrink-0 sm:flex-1` so `Export All (CSV)` and monthly CSV download buttons maintain a full `48px` tap target height on mobile screens.

### Changed

- Bumped Service Worker shell cache namespace to `foliq-shell-v1-2-3`.

## [1.2.2] - 2026-11-27

### Fixed

- **iOS Safari Quick Entry Background Scroll-Through Lock (`src/components/quick-entry-sheet.tsx`):** Locked `document.body` (`position: fixed` preserving exact `scrollY` offset on close), added `overscroll-y-contain` + `touch-pan-y` to the Quick Entry form, and trapped backdrop/header/boundary `touchmove` gestures so scrolling inside **Record Entry** exclusively scrolls the active sheet and never leaks to the background dashboard.

### Changed

- Bumped Service Worker shell cache namespace to `foliq-shell-v1-2-2`.

## [1.2.1] - 2026-11-27

### Fixed

- **iPhone PWA Top Safe-Area Obstruction (`/report` & Header):** Applied `safe-top-page` (`calc(env(safe-area-inset-top, 0px) + 1rem)`) on `/report` and Auth views and added breathing space above `.safe-top` so `Back to Foliq`, `Print / Save as PDF`, and top controls are never hidden behind the iPhone Status Bar or Dynamic Island.
- **Mobile Report Active Wallets Table:** Made `/report` wallet rows responsive on `390px` viewports so wallet names and balances never clip horizontally.
- **iOS Auto-Zoom & Global Fixed 1:1 Viewport Lock:**
  - Configured `maximumScale: 1` and `userScalable: false` in `src/app/layout.tsx` viewport metadata, added global `gesturestart`/`gesturechange`/`gestureend` and multi-touch pinch guards in `ThemeProvider`, and added `touch-action: pan-x pan-y` + `manipulation` across all interactive controls.
  - Enforced `font-size: 16px` on mobile/touch `<input>`, `<select>`, and `<textarea>` elements globally so iOS Safari never auto-zooms when focusing Quick Entry or any form field.
  - Disabled automatic input focusing on touch devices when opening Quick Entry, blurred active fields cleanly on submit/close, and constrained `input[type="datetime-local"]` widths on iOS Safari.
- **Desktop Category Placeholder:** Shortened the `Add Custom Category` placeholder (`"Coffee, Gym, Hobby"`) so it never clips on desktop viewports.

### Added

- **Global Tactile Button Feedback, Loading Spinners & Micro-Animations:**
  - Added global tactile press animation (`scale(0.97)` + smooth easing) across all enabled buttons, links, and tabs (respecting `prefers-reduced-motion`).
  - Added `SpinnerIcon` visual loading states across Save Entry, Auth submit, Add Wallet, Save Monthly Cap, Copy Budgets, Create Category, Save Profile, Update Password, Sign Out, Report (PDF) navigation, and Back to Foliq / Print buttons.
  - Added a slim top progress bar under the sticky header during month sync and server mutations, smooth enter animations for Quick Entry Sheet (`.animate-sheet-in`) and tab switches (`.animate-tab-in`), and an automatic confirmation toast after saving or editing a transaction.

### Changed

- Bumped Service Worker shell cache namespace to `foliq-shell-v1-2-1`.

## [1.2.0] - 2026-11-21

### Added

- **1-Tap Copy Budgets from Previous Month (`POST /api/budgets/copy`):** Roll over all spending caps from the previous calendar month into the currently viewed month in one tap without overwriting any caps already customized for the current month.
- **Ledger Category Filter & Dynamic Filtered Subtotal Bar (`src/components/tabs/ledger-tab.tsx`):**
  - Added a Category dropdown filter alongside Search, Wallet, and Type filters plus a one-tap **Reset filters** action.
  - Added a live **Filtered Subtotal Summary Bar** showing matching entry count, Income (`In`), Expenses (`Out`), and `Net` totals with automatic multi-currency conversion and Privacy Mode masking.
- **Custom Category Manager (`PATCH/DELETE /api/categories/[id]`, `src/components/tabs/categories-manager.tsx`):**
  - View Expense and Income categories, rename or switch icons across all 12 geometric glyphs inline, create custom categories with chosen icons, and remove unused categories with two-step confirmation.
  - Enforces server-side invariants preventing deletion of the last category per type or any category referenced by a recurring schedule.

### Changed

- Added `.no-scrollbar` utility styling to the Overview **Active Wallets** horizontal quick-strip so narrow desktop and mobile viewports stay visually clean without a bulky native horizontal scrollbar.
- Expanded `src/lib/validators.test.ts` for `budgetCopySchema` and `categoryUpdateSchema` and bumped Service Worker cache to `foliq-shell-v1-2-0`.

## [1.1.0] - 2026-11-21

### Added

- **Privacy Mode (Hide/Show Balances):** Added a hydration-safe (`useSyncExternalStore`) Privacy Mode toggle in both the desktop sidebar and mobile header (`localStorage`-persisted) that masks all sensitive monetary figures (`••••••••`) across Overview, Wallet cards, Ledger rows, Budgets, Recurring schedules, Savings Goals, and Recharts axes/tooltips.
- **Smart Quick Entry Speed Upgrades:**
  - **Safe Inline Calculator (`src/lib/math-input.ts`):** Type arithmetic expressions like `45000+18000` or `150000/3` directly into the Quick Entry amount field using a CSP-safe recursive-descent parser (no `eval()`) with live formatted `= Rp ...` preview.
  - **Remember Last Wallet:** New Quick Entry transactions automatically pre-select your most recently used active wallet (`foliq_last_wallet_v1`).
  - **Quick Clear & iOS Grabber Pill:** Added a one-tap `Clear` button alongside `44px` amount preset chips and a subtle iOS grabber handle on mobile sheets.
- **Overview Active Wallet Quick-Strip & MoM Insights:**
  - Added a horizontal scrollable **Active Wallets** quick-strip directly inside the Total Net Balance hero card so balances across all wallets are visible at a glance.
  - Added Month-over-Month (`vs <prev month>`) percentage deltas on the Income and Expenses KPI cards plus daily average spending (`Avg .../day`).
- **Jump to Today, Desktop Keyboard Shortcuts & Floating Toast:**
  - Added one-tap return to the current month (tapping the active month pill or desktop `Today` button) when browsing past or future months.
  - Added desktop keyboard shortcuts (`N` Quick Entry, `P` Privacy Mode, `[` / `]` switch month, `1`-`5` switch tabs) automatically suppressed inside form inputs or dialogs.
  - Upgraded success notifications to an auto-dismissing (`3.5s`) floating toast with zero layout shift, and replaced initial text loading with a proportional Overview skeleton loader + subtle month-switch transition.
- **Expanded Unit Tests:** Added `src/lib/math-input.test.ts` covering arithmetic precedence, parentheses, unicode operators, division-by-zero rejection, and malformed input guards (32 passing tests across 9 suites).

### Fixed

- Fixed duplicated `| Foliq` `<title>` suffix on `/report` (`Monthly Financial Report`).
- Upgraded two-step Budget delete confirmation buttons to `44px` minimum height (`min-h-11`).

### Changed

- Bumped Service Worker shell cache namespace to `foliq-shell-v1-1-0`.

## [1.0.0] - 2026-11-21

### Added

- **First Stable Production Release (`v1.0.0`):** Completes the full personal finance PWA feature set across iPhone Safari (*Add to Home Screen*) and desktop browsers.
- **CSV Bank Statement Import Wizard (`src/lib/csv-import.ts`, `POST /api/transactions/import`, `src/components/tabs/csv-import-section.tsx`):**
  - Upload `.csv` files (up to 2 MB) or paste raw CSV text from Foliq backups and Indonesian/international bank statements (supports comma or semicolon delimiters, RFC-4180 quotes, UTF-8 BOM, Indonesian `Rp 150.000` / `1.250.500,75` and international `$1,250.50` / `(35.25)` amount formats, and `DD/MM/YYYY` / `YYYY-MM-DD` dates).
  - Auto-detects Date, Amount, Type (`DB`/`CR`/`Expense`/`Income`/signed), Note, and Category columns with manual override controls, a 5-row live preview table, and optional duplicate detection against existing Neon records (capped safely at 500 entries per atomic batch).
- **Printable Monthly Financial Report / PDF Summary (`/report`, `src/app/report/page.tsx`):**
  - Server-authenticated monthly financial statement accessible from the desktop sidebar, Ledger toolbar, and Settings Backup panel (`/report?month=YYYY-MM&tzOffset=...`).
  - Displays Total Net Balance, Monthly Income, Monthly Expenses, Net Cashflow & Savings Rate, Active Wallets (native + primary converted balances), Expense Breakdown by Category, Monthly Budgets & Savings Goals progress, and the full chronological monthly ledger.
  - Includes dedicated `@media print` paper styling (`14mm` page margins, high-contrast black-on-white print typography regardless of OLED Dark mode, and one-tap **Print / Save as PDF** button).
- **Expanded Unit Tests:** Added `src/lib/csv-import.test.ts` and expanded `src/lib/validators.test.ts` (29 passing unit tests across 8 suites).

### Changed

- Upgraded Ledger type filter pills to `44px` minimum height and added a quick **PDF** report link alongside **CSV** export.
- Bumped Service Worker shell cache namespace to `foliq-shell-v1-0-0`.

## [0.4.1] - 2026-11-21

### Fixed

- **Liquid Glass Floating Dock Legibility:** Raised `--glass-bg` opacity (`0.90` in Light mode, `0.88` in Dark OLED mode) and increased backdrop blur to `26px` so scrolled card headings no longer bleed visually behind mobile bottom dock labels.
- **Desktop Wallet Placeholder Clipping:** Shortened the Add Wallet `Wallet Name` placeholder (`"BCA, GoPay, USD"`) so it fits cleanly without right-edge text clipping on desktop viewports.

### Changed

- Bumped Service Worker shell cache namespace to `foliq-shell-v0-4-1`.

## [0.4.0] - 2026-11-21

### Added

- **Multi-Currency Wallets & Saved Exchange Rates (`exchange_rates`):**
  - Wallets now support individual currencies (`IDR`, `USD`, `SGD`, `EUR`) on both creation and inline editing without overriding other wallets when changing Primary Display Currency.
  - Added **Multi-Currency Exchange Rates** configuration in Settings (`GET/PUT /api/settings/rates`) backed by Neon PostgreSQL with custom + fallback conversion (`src/lib/currency.ts`).
  - Total Net Balance, monthly cashflow, category breakdowns, budgets, and trend charts automatically convert foreign-currency wallets into your primary currency, while each wallet card and ledger row preserves its native currency formatting (`≈` converted preview shown for foreign-currency wallets).
- **Savings Goals & Sinking Funds (`savings_goals`):**
  - Added full CRUD and quick contribute/withdraw progress tracking (`GET/POST /api/goals`, `PATCH/DELETE /api/goals/[id]`) supporting multi-currency targets, optional deadlines, optional linked wallets, and automatic completion status.
  - Added a **Savings Goals** sub-view inside **Wallets & Goals** plus a live **Savings Goals** progress strip on Overview.
- **6-Month & 12-Month Net Worth & Cashflow Trend Charts (`src/components/trend-chart.tsx`):**
  - Added an interactive multi-month trend chart on Overview with `Net Worth` (reconstructed month-end balance curve) and `Cashflow` (monthly Income vs. Expense bars) modes across `6M` and `12M` windows, fully timezone-aligned and multi-currency aware.
- **Expanded Unit Tests:** Added `src/lib/currency.test.ts` (direct/inverse/fallback exchange rates, currency conversion, goal progress, trailing month key generation) and expanded `src/lib/validators.test.ts` for goals and exchange rates.

### Changed

- Enforced same-currency transfer validation on `POST /api/transactions`, `PATCH /api/transactions/[id]`, and Quick Entry to prevent silent cross-currency ledger distortion.
- Updated `GET /api/export` CSV backups and `POST /api/shortcuts/record` responses to report each transaction's native wallet currency instead of forcing primary account currency.
- Updated `PATCH /api/settings/profile` so changing primary display currency no longer overwrites individual wallet currencies.
- Upgraded mobile header month-switcher chevrons and inline delete confirmation buttons to `44px` minimum height and bumped Service Worker cache to `foliq-shell-v0-4-0`.

## [0.3.0] - 2026-11-21

### Added

- **Recurring Bills, Subscriptions & Income (`recurring_rules`):**
  - Added full CRUD endpoints (`GET/POST /api/recurring`, `PATCH/DELETE /api/recurring/[id]`) and atomic one-tap recording (`POST /api/recurring/[id]/record`) with optimistic concurrency protection (`409` on concurrent double-tap) and month-end date clamping (`WEEKLY`, `MONTHLY`, `YEARLY`).
  - Added timezone-aware due status tracking (`due`, `upcoming` within 7 days, `scheduled`) surfaced in a **Due & Upcoming Recurring** panel on Overview and a **Recurring** sub-view inside **Budgets & Recurring** with Pause/Resume and two-step Delete.
- **Offline Capture Queue (`src/lib/offline-queue.ts`):**
  - New entries submitted in Quick Entry while offline (or during a network drop) are queued safely in local device storage instead of being lost.
  - Added a hydration-safe (`useSyncExternalStore`) **Pending Offline Queue** banner with automatic sequential replay on browser `online` reconnection, manual **Sync Now** with concurrency guard, and two-step **Discard** controls.
- **Authenticated Apple Shortcuts Webhook & Revocable API Tokens (`api_tokens`):**
  - Added **Apple Shortcuts & Quick Capture API** management inside Settings (`GET/POST /api/settings/tokens`, `DELETE /api/settings/tokens/[id]`, capped at 10 active tokens) showing each `flq_...` token once on creation and storing only HMAC-SHA256 hashes in Neon.
  - Added `POST /api/shortcuts/record` authenticated via `Authorization: Bearer flq_...` so iPhone Back Tap, Action Button, or Siri Shortcuts can log expenses or income directly into Neon with smart wallet/category name matching and safe fallback.
- **Expanded Unit Tests:** Added `src/lib/recurring.test.ts` (cadence advancement, leap-year clamping, WIB timezone due classification), `src/lib/offline-queue.test.ts`, and expanded `src/lib/validators.test.ts` for recurring, token, and shortcut schemas.

### Changed

- Updated the Budgets tab heading to **Budgets & Recurring** with a segmented `Monthly Caps` / `Recurring` switcher.
- Updated `DELETE /api/wallets/[id]` to check linked recurring schedules alongside transactions before deleting vs. archiving a wallet.
- Updated Service Worker cache namespace to `foliq-shell-v0-3-0`.

### Security

- Enforced Neon-backed persistent rate limiting (`isPersistentAuthRateLimited` + `checkPersistentAuthRateLimit`) on `POST /api/shortcuts/record` before database token lookups so blocked IPs receive `429 Too Many Requests` without hammering `api_tokens`.
- Enforced single-display revocable `flq_` API tokens hashed with HMAC-SHA256 (`SESSION_SECRET`) and strict Bearer authentication on `/api/shortcuts/record`.

## [0.2.1] - 2026-11-21

### Security

- **Password Change Rate Limiting:** Enforced Neon-backed persistent rate limiting (`checkPersistentAuthRateLimit`) on `POST /api/settings/password` to prevent unlimited current-password brute-force attempts on an active session.

### Fixed

- **Settings Save Confirmation Stability:** Removed the remounting `key` on `SettingsTab` so saving Display Name or Primary Currency preserves the confirmation banner instead of immediately unmounting the tab and resetting in-progress password fields.
- **Quick Entry Transfer & Date Edge Cases:** Prevented identical source/destination wallet defaults when switching an edited entry to Transfer, auto-switched destination wallet when source matches it, and added safe date validation if the Date & Time field is cleared.
- **Archived Wallet Reassignment Guard:** Restricted `PATCH /api/transactions/[id]` so archived wallets can only remain attached to existing historical entries and cannot be newly reassigned.
- **Server-Side Active Wallet Invariant:** Enforced the minimum one active wallet invariant on `DELETE /api/wallets/[id]` and `PATCH /api/wallets/[id]` (`isArchived: true`) so API callers cannot leave an account with zero active wallets.

### Changed

- **Consistent Live Currency Previews:** Added live formatted currency previews to Opening Balance inputs (Add & Edit Wallet) and Monthly Budget Limit inputs to prevent zero-count typos in IDR.
- **Dynamic Version Display & Audit Governance:** Sourced the Settings footer version directly from `package.json`, bumped the Service Worker cache to `foliq-shell-v0-2-1`, and codified the mandatory Full Audit Gate (Bugs + Security + UI/UX before any newer version) in `AGENTS.md`.

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
