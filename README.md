# Foliq

**Foliq** is a personal finance tracker Progressive Web App (PWA) designed for fast daily expense capture on iPhone Safari (*Add to Home Screen*) and structured cashflow analysis on desktop browsers.

Built with **Next.js App Router**, **TypeScript**, **Tailwind CSS**, **Neon Serverless PostgreSQL**, **Prisma ORM**, and deployed via **Vercel CLI**.

---

## Key Features (`v0.2.0`)

- **Quick Entry & Full Transaction Editing:** Floating Liquid Glass bottom dock with a one-tap `+` action for recording **Expenses**, **Income**, and **Transfers** with numeric presets, live formatted currency preview, and full inline editing of any existing entry.
- **Multi-Wallet Management & Archiving:** Track, edit, archive, and restore Cash, Bank, E-Wallet, Savings, and Credit accounts with exact minor-unit arithmetic (`NUMERIC(15, 2)` via PostgreSQL `groupBy`) and neutral transfers between wallets.
- **Timezone-Accurate Cashflow & Analytics:** View total net balance, monthly income vs. expenses, savings rate, top spending categories, and a daily cashflow bar chart aligned to your local timezone (e.g., WIB `UTC+7`).
- **Monthly Category Budgets:** Set monthly caps per expense category with clear pacing status (*On track*, *Near limit* at >= 80%, and *Over budget*), two-step delete confirmations, and custom category creation.
- **Settings & Vault Controls:** Dedicated Settings view for updating display name and primary currency (`IDR`, `USD`, `SGD`, `EUR`), changing owner password with automatic cross-device session revocation, toggling Light / OLED Dark mode, and downloading all-time or monthly CSV backups.
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
│   ├── schema.prisma         # PostgreSQL schema (User, Session, Wallet, Category, Transaction, Budget, AuthRateLimit)
│   └── seed.ts               # Safe fictional demo seed (never overwrites existing users)
├── public/
│   └── sw.js                 # Static-asset Service Worker with offline fallback (never caches /api/* or auth HTML)
└── src/
    ├── app/
    │   ├── api/              # Auth, Dashboard, Wallets, Transactions, Budgets, Categories, Settings, Export CSV
    │   ├── icon-192/         # Dynamic 192x192 PWA icon
    │   ├── icon.tsx          # Dynamic 512x512 maskable PWA icon
    │   ├── apple-icon.tsx    # Dynamic 180x180 iOS Home Screen icon
    │   ├── manifest.ts       # Web App Manifest
    │   ├── layout.tsx        # Root layout, font, PWA metadata, no-flash theme init
    │   └── page.tsx          # Server-side auth gate entry
    ├── components/
    │   ├── tabs/             # OverviewTab, LedgerTab, WalletsTab, BudgetsTab, SettingsTab
    │   └── ...               # AuthScreen, FoliqApp, QuickEntrySheet, CashflowChart, TransactionRow, custom SVG icons
    └── lib/                  # Prisma Neon client, auth/rate-limit, CSRF security, exact money/timezone math, Zod schemas
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

---

## Security Model (Public Repo + Private Finances)

- **Zero Secrets in Git:** `.env*` files are strictly ignored by `.gitignore`; only `.env.example` is tracked.
- **Single-Owner Registration Lock:** `/api/auth/register` rejects any email that does not match `OWNER_EMAIL` and blocks creation of additional accounts once the owner vault exists.
- **Password, Session & Rate-Limit Hardening:** Passwords use Node `crypto.scrypt` with random per-user salts, constant-time comparison, and dummy verification on invalid emails. Session cookies are `HttpOnly`, `Secure` (production), `SameSite=Lax`, stored as HMAC-SHA256 hashes in Neon, and expired sessions are pruned automatically on sign-in. Brute-force rate limits persist in Neon (`auth_rate_limits`) across serverless instances.
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
5. Tag (`git tag -a vX.Y.Z -m "Release vX.Y.Z"`), push to GitHub, create a GitHub Release (`gh release create`), and deploy via `vercel deploy --prod`.

---

## Roadmap

- **v0.1.0:** Single-owner Neon auth, multi-wallet ledger, transfers, Quick Entry sheet, monthly cashflow & daily bar chart, category budgets, CSV export, iOS PWA shell.
- **v0.1.1:** Local timezone accuracy (WIB/UTC+7), Neon persistent serverless rate limiting, CSV formula injection protection, CSRF Origin check & CSP header, UUID param validation, PostgreSQL `groupBy` wallet balance aggregation, Show/Hide password toggle, live currency preview, two-step wallet/budget delete confirmations, 192px PWA icon, and modular tab decomposition.
- **v0.2.0 (Current):** Edit transactions, inline wallet editing & archived wallet restoration, and dedicated Settings panel (profile/currency, change password with session revocation, all-time CSV backup, appearance & vault info).
- **v0.3.0 (Planned):** Recurring transactions (subscriptions & bills), offline capture queue, and authenticated Apple Shortcuts webhook endpoint for one-tap Back Tap / Action Button expense capture from iPhone Lock Screen.

---

## License

MIT License. See [LICENSE](./LICENSE).
