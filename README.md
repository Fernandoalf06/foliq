# Foliq

**Foliq** is a personal finance tracker Progressive Web App (PWA) designed for fast daily expense capture on iPhone Safari (*Add to Home Screen*) and structured cashflow analysis on desktop browsers.

Built with **Next.js App Router**, **TypeScript**, **Tailwind CSS**, **Neon Serverless PostgreSQL**, **Prisma ORM**, and deployed via **Vercel CLI**.

---

## Key Features (`v1.2.4`)

- **Privacy Mode & Daily Speed UX:** One-tap **Hide/Show Balances** toggle in the header and sidebar masks every monetary figure and chart tooltip (`••••••••`), paired with desktop keyboard shortcuts (`N`, `P`, `[`, `]`, `1`-`5`), one-tap **Today** month jump, proportional skeleton loaders, and auto-dismissing floating toasts.
- **Smart Quick Entry with Inline Calculator & Offline Queue:** Floating Liquid Glass bottom dock with a one-tap `+` action, iOS sheet grabber handle, remembered last-used wallet, CSP-safe inline math calculator (`45000+18000`, `150000/3`), `Clear` chip, inline editing, and automatic local queueing + auto-sync when capturing offline.
- **Overview Active Wallet Quick-Strip & MoM Insights:** Glanceable horizontal active-wallet balance strip inside the Total Net Balance hero card, Month-over-Month (`vs prev month`) income/expense deltas, daily average spend, and 6M/12M **Net Worth** & **Cashflow** trend charts.
- **Multi-Currency Wallets & Saved Exchange Rates:** Assign `IDR`, `USD`, `SGD`, or `EUR` per wallet, save custom conversion rates in Settings, and view native wallet balances alongside live converted totals (`≈`) in your Primary Display Currency.
- **Savings Goals & Sinking Funds:** Create dedicated savings targets (emergency fund, travel, gadgets) inside **Wallets & Goals** with optional target dates, optional linked wallets, quick `+ Add` / `Withdraw` progress controls, and an Overview progress strip.
- **CSV Bank Statement Import Wizard:** Upload `.csv` bank statements or Foliq backups (comma or semicolon delimited, Indonesian & international number/date formats) with automatic column mapping, live preview, and duplicate skipping (up to 500 rows per batch).
- **Printable Monthly Report / PDF Summary (`/report`):** Generate an authenticated, print-optimized monthly financial statement covering KPIs, wallet snapshots, category breakdown, budgets, savings goals, and complete ledger entries ready for iOS/Desktop **Save as PDF**.
- **Recurring Bills, Subscriptions & Income:** Schedule weekly, monthly, or yearly bills and salary with timezone-aware *Due now* / *Upcoming (7d)* alerts on Overview, atomic one-tap **Record Now** (advancing `nextDueDate` with month-end clamping), and Pause/Resume controls.
- **Apple Shortcuts Quick Capture API:** Generate revocable `flq_...` Bearer tokens in Settings to trigger instant expense logging from iPhone **Back Tap**, **Action Button**, or **Siri Shortcuts** via `POST /api/shortcuts/record`.
- **Monthly Category Budgets, Rollover & Category Manager:** Set monthly caps per expense category with clear pacing status (*On track*, *Near limit* at >= 80%, and *Over budget*), copy caps from the previous month in one tap (`POST /api/budgets/copy`), and create, rename, change icons, or safely delete categories.
- **Ledger Search, Category Filter & Filtered Subtotals:** Filter entries by keyword, wallet, category, and type with a live subtotal summary bar (`In`, `Out`, `Net`), inline editing, two-step delete, CSV export, and PDF report access.
- **Crisp Utility + Restrained Liquid Glass UI & Single-Owner Security:** Solid high-contrast matte financial cards in Light and OLED Dark modes paired with frosted Liquid Glass strictly on floating navigation chrome, safely open-sourced while locked exclusively to your configured `OWNER_EMAIL`.

---

## Architecture & Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript | Full-stack PWA UI, Server Components, and REST API routes |
| Styling & Visual System | Tailwind CSS v4 + `DESIGN.md` tokens | Responsive mobile/tablet/desktop shell, Light & OLED Dark themes |
| Database | Neon Serverless PostgreSQL | Auto-suspending serverless Postgres with branching support |
| ORM | Prisma 7 (`@prisma/adapter-neon`) | Type-safe schema, migrations, and serverless driver adapter |
| Authentication | Custom Neon Session Auth (`scrypt` + HTTP-Only Cookie) | Single-owner allowlist (`OWNER_EMAIL`), rate limiting, iOS Passwords / Face ID autofill |
| Validation | Zod | Strict request and form schema enforcement |
| Charts | Recharts | Responsive daily income vs. expense bar charts |
| Testing | Vitest | Unit tests for balance, transfer, budget, and CSV calculations |
| Deployment | Vercel CLI | HTTPS hosting required for iOS Safari PWA installation |

---

## Project Structure

```text
.
├── AGENTS.md                 # Mandatory repo, SemVer, changelog, release & security rules
├── DESIGN.md                 # Visual direction, verified WCAG AA palette, Liquid Glass dose cap
├── CHANGELOG.md              # Release history (Keep a Changelog + SemVer)
├── prisma/
│   ├── schema.prisma         # PostgreSQL schema (User, Session, Wallet, Category, Transaction, Budget, RecurringRule, SavingsGoal, ExchangeRate, ApiToken, AuthRateLimit)
│   └── seed.ts               # Safe fictional demo seed (never overwrites existing users)
├── public/
│   └── sw.js                 # Static-asset Service Worker with offline fallback (never caches /api/* or auth HTML)
└── src/
    ├── app/
    │   ├── api/              # Auth, Dashboard, Wallets, Transactions (+ CSV Import), Budgets, Recurring, Goals, Categories, Settings/Rates/Tokens, Shortcuts, Export CSV
    │   ├── report/           # Authenticated Printable Monthly Financial Statement / PDF Summary
    │   ├── icon-192/         # Dynamic 192x192 PWA icon
    │   ├── icon.tsx          # Dynamic 512x512 maskable PWA icon
    │   ├── apple-icon.tsx    # Dynamic 180x180 iOS Home Screen icon
    │   ├── manifest.ts       # Web App Manifest
    │   ├── layout.tsx        # Root layout, font, PWA metadata, no-flash theme init
    │   └── page.tsx          # Server-side auth gate entry
    ├── components/
    │   ├── tabs/             # OverviewTab, LedgerTab, WalletsTab, GoalsSection, BudgetsTab, RecurringSection, SettingsTab, ExchangeRatesSection, CsvImportSection, ShortcutsSection
    │   └── ...               # AuthScreen, FoliqApp, QuickEntrySheet, CashflowChart, TrendChart, TransactionRow, ReportActions, custom SVG icons
    └── lib/                  # Prisma Neon client, auth/token/rate-limit, CSRF security, money/currency/recurring/csv-import/offline-queue logic, Zod schemas
```

---

## Local Development & Self-Hosting Setup

### Prerequisites

- Node.js `>= 20.19` (tested on Node 24)
- A [Neon](https://neon.tech) PostgreSQL database (or provisioned automatically via Vercel CLI)
- [Vercel CLI](https://vercel.com/docs/cli) (`npm i -g vercel`)

### 1. Clone & Install

```bash
git clone https://github.com/Fernandoalf06/foliq.git
cd foliq
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your private values (never commit `.env.local`):

```bash
cp .env.example .env.local
```

Required variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL pooled connection string (`?sslmode=require`) |
| `OWNER_EMAIL` | Your personal email address allowed to register and sign in |
| `SESSION_SECRET` | Random 64-char hex string (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
| `NEXT_PUBLIC_APP_URL` | Public URL of your deployment (e.g., `https://your-foliq.vercel.app`) |

### 3. Generate Prisma Client & Push Schema to Neon

```bash
npm run db:generate
npm run db:push
```

*(Optional)* Seed clearly fictional sample data into an empty database:

```bash
npm run db:seed
```

### 4. Run Locally & Verify

```bash
npm run dev
npm run test
npm run typecheck
npm run lint
npm run build
```

---

## Deploying with Vercel CLI & Neon Integration

You can provision Neon and connect it directly through Vercel CLI:

```bash
# 1. Link project to your Vercel account
vercel link --yes

# 2. Provision Neon Serverless PostgreSQL automatically (Free tier, Singapore region)
vercel integration add neon --name foliq-db --plan free_v3 -m region=sin1 -m auth=false

# 3. Configure single-owner authentication secrets in Vercel
vercel env add OWNER_EMAIL production preview development
vercel env add SESSION_SECRET production preview development

# 4. Pull environment variables locally and push Prisma schema
vercel env pull .env.local
npm run db:push

# 5. Deploy to production
vercel deploy --prod
```

---

## Installing Foliq on iPhone (Safari PWA)

1. Open your deployed HTTPS Vercel URL in **Safari** on iPhone.
2. Tap the **Share** button in the Safari toolbar.
3. Scroll down and select **Add to Home Screen**.
4. Confirm the name **Foliq** and tap **Add**.
5. Launch **Foliq** from your Home Screen. When you sign in, save your credentials to **Apple Passwords** so future sign-ins work in one tap with **Face ID**.

### Setting Up Apple Shortcuts (iPhone Back Tap / Action Button)

1. Open Foliq on iPhone, go to **Settings > Apple Shortcuts & Quick Capture API**, and generate a named token (e.g., `iPhone Back Tap`). Copy the `flq_...` token immediately (it is displayed once).
2. Open the iOS **Shortcuts** app and tap **+** to create a new shortcut (e.g., *Log to Foliq*).
3. Add **Ask for Input** (Number) for the amount and **Ask for Input** (Text) for the note.
4. Add **Get Contents of URL**:
   - **URL:** `https://<your-foliq-domain>/api/shortcuts/record`
   - **Method:** `POST`
   - **Headers:** `Authorization`: `Bearer flq_<your-token>` and `Content-Type`: `application/json`
   - **Request Body (JSON):**
     ```json
     {
       "amount": 35000,
       "type": "EXPENSE",
       "wallet": "E-Wallet",
       "category": "Food & Dining",
       "note": "Coffee"
     }
     ```
5. *(Optional)* Bind the shortcut to **Settings > Accessibility > Touch > Back Tap** or your iPhone **Action Button**.

---

## Security Model (Public Repo + Private Finances)

- **Zero Secrets in Git:** `.env*` files are strictly ignored by `.gitignore`; only `.env.example` is tracked.
- **Single-Owner Registration Lock:** `/api/auth/register` rejects any email that does not match `OWNER_EMAIL` and blocks creation of additional accounts once the owner vault exists.
- **Password, Session & Rate-Limit Hardening:** Passwords use Node `crypto.scrypt` with random per-user salts, constant-time comparison, and dummy verification on invalid emails. Session cookies are `HttpOnly`, `Secure` (production), `SameSite=Lax`, stored as HMAC-SHA256 hashes in Neon, and expired sessions are pruned automatically on sign-in. Brute-force rate limits persist in Neon (`auth_rate_limits`) across serverless instances for login, registration, password changes, and Shortcuts webhook tokens.
- **Revocable Shortcuts API Tokens:** `/api/shortcuts/record` authenticates via Bearer `flq_` tokens hashed with HMAC-SHA256 (`SESSION_SECRET`), displays raw tokens once at creation, caps active tokens at 10 per account, and supports instant revocation from Settings.
- **CSRF, CSP & CSV Export Safety:** All mutating API routes verify same-origin headers, `next.config.ts` enforces a `Content-Security-Policy` plus strict frame/content-type/referrer headers, and CSV exports neutralize spreadsheet formula prefixes (`=`, `+`, `-`, `@`).
- **No Private Caching:** `public/sw.js` bypasses `/api/*` and dynamic authenticated HTML routes, caching only static assets with a clean offline fallback screen.
- **Private Indexing Policy:** `robots: { index: false, follow: false }` prevents search engines from indexing your personal deployment.

---

## Versioning & Release Policy

Every change to Foliq follows the mandatory workflow defined in [AGENTS.md](./AGENTS.md):

1. Commit with Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).
2. Bump `"version"` in `package.json` using Semantic Versioning (`MAJOR.MINOR.PATCH`).
3. Update `CHANGELOG.md` and `README.md`.
4. Pass `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build`.
5. Complete the mandatory **Full Audit Gate** (Bugs + Security + UI/UX) and resolve all Critical/High findings before advancing to a newer version.
6. Tag (`git tag -a vX.Y.Z -m "Release vX.Y.Z"`), push to GitHub, create a GitHub Release (`gh release create`), and deploy via `vercel deploy --prod`.

---

## Roadmap

- **v0.1.0:** Single-owner Neon auth, multi-wallet ledger, transfers, Quick Entry sheet, monthly cashflow & daily bar chart, category budgets, CSV export, iOS PWA shell.
- **v0.1.1:** Local timezone accuracy (WIB/UTC+7), Neon persistent serverless rate limiting, CSV formula injection protection, CSRF Origin check & CSP header, UUID param validation, PostgreSQL `groupBy` wallet balance aggregation, Show/Hide password toggle, live currency preview, two-step wallet/budget delete confirmations, 192px PWA icon, and modular tab decomposition.
- **v0.2.0:** Edit transactions, inline wallet editing & archived wallet restoration, and dedicated Settings panel (profile/currency, change password with session revocation, all-time CSV backup, appearance & vault info).
- **v0.2.1:** Password-change persistent rate limiting, Settings feedback persistence fix, Quick Entry transfer/date guardrails, server-side active-wallet & archived-wallet invariants, live currency previews on Wallet/Budget forms, dynamic version display, and mandatory Full Audit Gate in `AGENTS.md`.
- **v0.3.0:** Recurring transactions (subscriptions, bills & salary with atomic one-tap recording), local offline capture queue with auto-sync on reconnect, and authenticated Apple Shortcuts webhook + revocable `flq_` API tokens.
- **v0.4.0:** Multi-currency wallets with saved Neon exchange rates, Savings Goals / Sinking Funds with quick contribute/withdraw progress tracking, and 6M/12M Net Worth & Cashflow trend charts.
- **v0.4.1:** Refined Liquid Glass floating dock opacity & blur (`26px`) for crisp scrolled-text legibility in Light and Dark OLED modes, and fixed desktop `Wallet Name` placeholder clipping.
- **v1.0.0:** CSV Bank Statement Import Wizard (RFC-4180 parser, Indonesian/international number & date formats, column mapping, duplicate skipping) and authenticated Printable Monthly Financial Report / PDF Summary (`/report`).
- **v1.1.0:** Privacy Mode (Hide/Show Balances across all views and charts), Smart Quick Entry (inline CSP-safe math calculator, remembered last wallet, Clear chip, iOS grabber), Overview Active Wallet quick-strip + MoM & daily average KPIs, Jump to Today, desktop keyboard shortcuts, floating auto-dismiss toast, and skeleton loaders.
- **v1.2.0:** 1-Tap Copy Budgets from Previous Month (`POST /api/budgets/copy`), Category filter + dynamic multi-currency Filtered Subtotal bar in Ledger, full Category Manager (rename, 12-icon picker, safe delete with recurring-rule invariant), and sleek `.no-scrollbar` Active Wallets quick-strip.
- **v1.2.1:** iPhone standalone PWA safe-area fix for `/report` and header controls, global 1:1 viewport zoom lock + `16px` touch input anti-zoom + iOS `datetime-local` fit, global tactile press feedback, inline loading spinners, top sync progress bar, smooth sheet/tab enter transitions, and automatic Save Entry confirmation toast.
- **v1.2.2:** iOS Safari Quick Entry sheet body scroll lock (`position: fixed` preserving scroll offset + `overscroll-y-contain` + backdrop/boundary touchmove trap) so scrolling exclusively targets the active Record Entry form.
- **v1.2.3:** iOS 26+ standalone PWA top-blur mitigation (100% opaque sticky app & `/report` headers, standalone opaque status-bar shield with `54px` minimum Dynamic Island floor, `"default"` status bar style + live Light/Dark `theme-color` sync) and `48px` mobile CSV tap targets in Settings.
- **v1.2.4 (Current):** Restored `position: sticky; top: 0` on the opaque app header and `/report` action bar by switching root `overflow-x: hidden` to `overflow-x: clip`, keeping the top bar anchored during scrolling while preserving zero horizontal overflow.

---

## License

MIT License. See [LICENSE](./LICENSE).
