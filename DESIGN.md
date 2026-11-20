# Foliq Design Direction (`DESIGN.md`)

> Design Read: Reading this as a Personal Finance Tracker PWA for iPhone and desktop daily use, in a Crisp Utility style with restrained Apple-inspired Liquid Glass surfaces, dial `ENERGY 2 / RHYTHM 2 / MOTION 2`.

## 1. Visual Identity & Personality

- **Character:** Crisp Utility. Fast, quiet, accurate, and tactile for daily money tracking on iPhone Safari (standalone PWA) and desktop browsers.
- **Identity Motif:**
  - The **Foliq geometric monogram**: two precision staggered bars forming a clean `F` inside a Cobalt squircle (derived from ledger columns and quick capture).
  - **Restrained Liquid Glass** floating chrome with crisp 1px specular top/edge hairlines hovering above solid, high-contrast matte financial sheets.
  - **Tabular numeric rhythm**: every monetary figure uses `tabular-nums` with explicit sign (`+` / `-`) and currency formatting (`IDR` / configurable currency).

## 2. Dials & Levers

- **Dial:** `ENERGY 2 / RHYTHM 2 / MOTION 2`
- **One Focal Point per Screen:**
  - Overview: Net Balance and current-month cashflow headline.
  - Quick Entry Sheet: Numeric amount display and primary Save action.
  - Transactions: Filterable chronological ledger grouped by date.
  - Wallets: Total liquid balance across wallets with transfer action.
  - Budgets: Monthly category pacing bars against remaining allowance.
- **One Deliberate Accent:** Cobalt (`#1D4ED8` light / `#2563EB` dark buttons, `#60A5FA` dark interactive text) reserved for active navigation state, primary action buttons, and focus indicators.

## 3. Verified WCAG AA Color System

Palette stays strictly within neutral surfaces + 1 Cobalt accent, plus functional financial polarity tokens (always paired with signs and labels, never color alone):

| Token | Light Mode | Dark Mode (OLED) | Verified Contrast |
|---|---|---|---|
| Ground | `#F5F6F8` | `#000000` | Base canvas |
| Surface 1 (Cards / Lists) | `#FFFFFF` | `#111215` | Solid matte for number clarity |
| Surface 2 (Inputs / Subtle fills) | `#ECEFF4` | `#1A1C22` | Elevation step without heavy shadows |
| Hairline Border | `#D8DEE9` | `#272B34` | Crisp 1px boundary |
| Primary Ink | `#0F172A` | `#F1F5F9` | 16.51:1 (light), 17.10:1 (dark) |
| Secondary Ink | `#475569` | `#94A3B8` | 7.58:1 (light), 7.30:1 (dark) |
| Primary Accent Fill | `#1D4ED8` | `#2563EB` | 6.70:1 / 5.17:1 with `#FFFFFF` text |
| Primary Accent Text | `#1D4ED8` | `#60A5FA` | 6.70:1 (light), 7.37:1 (dark) |
| Income Polarity | `#047857` | `#34D399` | 5.48:1 (light), 9.74:1 (dark) |
| Expense Polarity | `#BE123C` | `#FB7185` | 6.29:1 (light), 6.96:1 (dark) |
| Budget Warning | `#B45309` | `#FBBF24` | 5.02:1 (light), 11.22:1 (dark) |

## 4. Liquid Glass Rules (Anti-Slop Dose Cap)

To achieve a genuine iOS Liquid Glass feel without falling into generic blurred-card slop (R-10):
- **Allowed ONLY on 2 floating chrome surfaces:**
  1. The floating bottom navigation dock (mobile) / compact header pill.
  2. The Quick Entry modal/sheet backdrop and floating top bar.
- **Specification:** `backdrop-filter: blur(22px) saturate(180%)`, translucent tinted fill (`rgba(255,255,255,0.78)` light / `rgba(22,24,29,0.78)` dark), 1px specular rim (`rgba(255,255,255,0.65)` light / `rgba(255,255,255,0.12)` dark), and a single purposeful lift shadow separating the dock from scrolled content (R-12).
- **Forbidden:** Never apply blur/glassmorphism to regular transaction cards, wallet cards, budget rows, or form inputs. Data surfaces stay solid matte for effortless readability in sunlight and dark rooms.

## 5. Typography, Radius, Icons & Motion

- **Typography (R-06):** `Plus Jakarta Sans` via `next/font/google`. Chosen for crisp geometric clarity on small iOS screens and distinct personality outside default Inter/Geist. `tabular-nums` applied to all balances, totals, and amounts.
- **Radius Hierarchy (R-11):**
  - Cards & containers: `20px` (`rounded-[20px]`)
  - Inputs & interactive rows: `12px` (`rounded-xl`)
  - Segmented controls & floating dock: `24px` / pill only for the floating dock and type selector, never uniformly on every card and input.
- **Icons (R-04):** Custom minimal geometric SVG icon set (`src/components/icons.tsx`) built specifically for financial concepts (wallets, cashflow arrows, transfer, budget gauge, lock, export, theme) with consistent 1.8px stroke. Zero generic AI glyphs (no sparkles, stars, robots, or decorative emojis).
- **Motion (R-19):** Smooth 180-240ms cubic-bezier transitions for sheet presentation, segmented tab indicator, and button active press scale (`0.98`). Wrapped with `prefers-reduced-motion: reduce` disablement. Zero endless loops or decorative pulsing dots.
- **Responsive Breakpoints (R-03):**
  - Mobile (`< 640px`): Single-column stacked flow, floating bottom Liquid Glass dock with safe-area padding (`env(safe-area-inset-bottom)`), minimum `44x44px` touch targets, full-height bottom sheet for Quick Entry.
  - Tablet (`640px - 1023px`): Two-column summary & wallet grid with compact top bar and bottom dock.
  - Desktop (`>= 1024px`): Centered spacious utility shell (`max-w-5xl`) with crisp left rail or top bar navigation and two-column overview/analytics composition.
