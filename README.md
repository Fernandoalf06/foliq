# Foliq

**Foliq** is a personal finance tracker Progressive Web App (PWA) designed for fast daily expense capture on iPhone Safari (*Add to Home Screen*) and structured cashflow analysis on desktop browsers.

Built with **Next.js App Router**, **TypeScript**, **Tailwind CSS**, **Neon Serverless PostgreSQL**, **Prisma ORM**, and deployed via **Vercel CLI**.

---

## Key Features (`v0.4.1`)

- **Multi-Currency Wallets & Saved Exchange Rates:** Assign `IDR`, `USD`, `SGD`, or `EUR` per wallet, save custom conversion rates in Settings, and view native wallet balances alongside live converted totals (`≈`) in your Primary Display Currency.
- **Savings Goals & Sinking Funds:** Create dedicated savings targets (emergency fund, travel, gadgets) inside **Wallets & Goals** with optional target dates, optional linked wallets, quick `+ Add` / `Withdraw` progress controls, and an Overview progress strip.
- **6-Month & 12-Month Net Worth & Cashflow Trends:** Analyze multi-month **Net Worth** growth curves and **Income vs. Expense** bar trends across `6M` and `12M` windows directly on Overview.
- **Quick Entry, Editing & Offline Capture Queue:** Floating Liquid Glass bottom dock with a one-tap `+` action for recording **Expenses**, **Income**, and same-currency **Transfers** with wallet-aware currency presets, live formatted previews, inline editing, and automatic local queueing + auto-sync when capturing offline.
- **Recurring Bills, Subscriptions & Income:** Schedule weekly, monthly, or yearly bills and salary with timezone-aware *Due now* / *Upcoming (7d)* alerts on Overview, atomic one-tap **Record Now** (advancing `nextDueDate` with month-end clamping), and Pause/Resume controls.
- **Apple Shortcuts Quick Capture API:** Generate revocable `flq_...` Bearer tokens in Settings to trigger instant expense logging from iPhone **Back Tap**, **Action Button**, or **Siri Shortcuts** via `POST /api/shortcuts/record`.
- **Monthly Category Budgets & Custom Categories:** Set monthly caps per expense category with clear pacing status (*On track*, *Near limit* at >= 80%, and *Over budget*), two-step delete confirmations, and custom category creation.
- **Crisp Utility + Restrained Liquid Glass UI:** Solid high-contrast matte financial cards in Light and OLED Dark modes paired with frosted Liquid Glass strictly on floating navigation chrome.
- **Single-Owner Security Model:** Designed to be safely open-sourced in a public repository while keeping your live deployment locked exclusively to your configured `OWNER_EMAIL`.

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
    │   ├── api/              # Auth, Dashboard, Wallets, Transactions, Budgets, Recurring, Goals, Categories, Settings/Rates/Tokens, Shortcuts, Export CSV
    │   ├── icon-192/         # Dynamic 192x192 PWA icon
    │   ├── icon.tsx          # Dynamic 512x512 maskable PWA icon
    │   ├── apple-icon.tsx    # Dynamic 180x180 iOS Home Screen icon
    │   ├── manifest.ts       # Web App Manifest
    │   ├── layout.tsx        # Root layout, font, PWA metadata, no-flash theme init
    │   └── page.tsx          # Server-side auth gate entry
    ├── components/
    │   ├── tabs/             # OverviewTab, LedgerTab, WalletsTab, GoalsSection, BudgetsTab, RecurringSection, SettingsTab, ExchangeRatesSection, ShortcutsSection
    │   └── ...               # AuthScreen, FoliqApp, QuickEntrySheet, CashflowChart, TrendChart, TransactionRow, custom SVG icons
    └── lib/                  # Prisma Neon client, auth/token/rate-limit, CSRF security, money/currency/recurring/offline-queue logic, Zod schemas
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
- **v0.4.1 (Current):** Refined Liquid Glass floating dock opacity & blur (`26px`) for crisp scrolled-text legibility in Light and Dark OLED modes, and fixed desktop `Wallet Name` placeholder clipping.
- **v1.0.0 (Planned):** CSV bank statement import wizard, customizable net-worth reports / printable monthly PDF summaries, and final v1.0 stability milestone.

---

## License

MIT License. See [LICENSE](./LICENSE).
