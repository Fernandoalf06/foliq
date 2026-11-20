# Foliq Project Standards & Agent Rules

This file defines mandatory, non-negotiable engineering standards for **Foliq** (Personal Finance Tracker PWA). Every agent and contributor working in this repository MUST follow these rules on every change, update, or release.

## 1. Project Identity & Stack

- **App Name:** Foliq
- **Repository:** `https://github.com/Fernandoalf06/foliq` (Public)
- **Framework:** Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Database & ORM:** Neon (Serverless PostgreSQL) + Prisma ORM (`@prisma/adapter-neon`)
- **Authentication:** Email + Password with Single-Owner Lock (`OWNER_EMAIL`), `scrypt` password hashing, and Neon-backed HTTP-Only secure session cookies
- **Deployment:** Vercel CLI (HTTPS PWA target for iPhone Safari *Add to Home Screen* and desktop browsers)

## 2. Public Repository & Security Absolutes

Because this repository is **public** while the deployed app manages **personal financial data**:

1. **Zero Secrets in Git:** Never commit `.env`, `.env.local`, `.env.production`, `DATABASE_URL`, session secrets, API keys, or real personal financial records. Only commit `.env.example` with safe placeholder values.
2. **Single-Owner Protection:** Registration and sign-in MUST enforce the `OWNER_EMAIL` allowlist configured via environment variables so unauthorized visitors cannot create accounts on the public deployment.
3. **Server-Side Enforcement:** Validate all payloads with Zod on the server, verify session ownership on every mutation/query, and keep financial calculations exact (using `NUMERIC`/`Decimal` or integer minor units, never imprecise binary floats).
4. **Demo/Seed Separation:** Seed scripts may only insert clearly fictional demo data and must never overwrite production user records.

## 3. Mandatory Update, Versioning, README & Release Workflow

Every update, feature addition, bug fix, or release MUST complete ALL applicable steps below before the task is considered finished:

1. **Conventional Commits:** Use `feat:`, `fix:`, `docs:`, `refactor:`, `perf:`, `test:`, `chore:` prefixes with clear, concise messages.
2. **Semantic Versioning (`SemVer`):**
   - `0.x.y` during pre-1.0 initial development; `1.0.0` for first stable production release.
   - `PATCH` (`x.y.Z`): bug fixes, copy/style tweaks, non-breaking maintenance.
   - `MINOR` (`x.Y.0`): backwards-compatible new features or meaningful enhancements.
   - `MAJOR` (`X.0.0`): breaking schema, API, or workflow changes.
   - Always update `"version"` in `package.json` to match the release tag.
3. **Changelog (`CHANGELOG.md`):**
   - Update `CHANGELOG.md` for every version bump using Keep a Changelog sections (`Added`, `Changed`, `Fixed`, `Security`) written clearly for humans.
4. **Documentation (`README.md`):**
   - Keep `README.md` clear, detailed, and always in sync with the codebase: features, screenshots/architecture, tech stack, local & Neon setup, Vercel CLI deployment steps, iPhone PWA installation guide, security model, and release roadmap.
5. **Pre-Release Verification Gate:**
   - Run typecheck, lint, unit tests, and production build (`npm run build`) before tagging or deploying.
6. **Git Tag & GitHub Release:**
   - Commit version bump, `CHANGELOG.md`, and `README.md`.
   - Create annotated tag `vX.Y.Z` (`git tag -a vX.Y.Z -m "Release vX.Y.Z"`).
   - Push commits and tags to `origin`.
   - Publish a GitHub Release with release notes via `gh release create vX.Y.Z`.
7. **Vercel Deployment:**
   - Deploy updates via Vercel CLI (`vercel deploy` for previews, `vercel deploy --prod` for releases) and verify environment variables are configured in Vercel rather than source files.

## 4. Global Skills Usage Policy

Proactively load and apply relevant global skills during execution instead of writing generic boilerplate:

- **UI, Layout & Accessibility:** Read `DESIGN.md` for visual direction, then apply `antislop`, `antislop-ui`, `antislop-layoutmobile`, `antislop-human`, `responsive-design`, `dark-mode-design`, `fixing-accessibility`, and `fixing-metadata`.
- **Architecture & Data:** `nextjs-app-router-patterns`, `postgresql-table-design`, `postgres-best-practices`, `database-migration`, `auth-implementation-patterns`, `secrets-management`.
- **Release & Quality:** `code-review-and-quality`, `changelog-generator`, `deploy-to-vercel`, `vercel-cli-with-tokens`, `webapp-testing`.
