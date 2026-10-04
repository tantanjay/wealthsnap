# App Redesign — Home hub, privacy modes, Insights sheets, slim Profile, Learn tab

**Status:** Idea / mockup only — not yet implemented in the app.
**Mockup:** [navigation-redesign.html](./navigation-redesign.html) — one fully clickable phone prototype. This file and that HTML are the single source for the whole redesign.

## Why

- Home has grown to five full-bleed hero cards (Financial Health, Cash Flow, Portfolio, Debts, Savings Goals), each with a solid colored background, a large number, its own CTA and 2–3 swipe pages. Every block is equally loud, Recent Transactions is pushed far down, and there are four separate swipe states to learn.
- Money views are scattered: Investment and History are bottom tabs, while Debts, Savings Goals, Insights and Financial Health hide behind Home cards.
- Profile is one long scroll mixing settings, help docs and about/manifesto content.
- The privacy toggle replaces every amount with `****`, which makes Home useless and still signals to an onlooker that there's something worth hiding.

## 1. Navigation

**Bottom bar:** Home · Insights · Record · Profile · Learn (Record stays the raised center action).

| Today | After |
| --- | --- |
| Investment tab | Home → **Holdings** pill |
| History tab | Home → **Ledger** pill |
| Debts screen (Home stack) | Home → **Loans** pill |
| Savings Goals screen (Home stack) | Home → **Goals** pill |
| Insights screen (Home stack, reached from the Cash Flow card) | **Insights** tab |
| Financial Health screen | **Removed** — content moves into Insights bottom sheets (section 4) |
| Help / About / Manifesto inside Profile | **Learn** tab |

Every existing `navigate('Investment' | 'History' | 'Debts' | 'SavingsGoals' | 'FinancialHealth')` call has to route to the new pill or tab instead.

## 2. Home

**Header:** greeting + one sliders button (Home Settings). No eye button. The sliders button shows a small badge (`%` or `***`) while Discreet or Hidden is active.

**Top menu (scrollable pills, sticky under the header):** Snapshot · Ledger · Holdings · Goals · Loans. "Loans" instead of "Debts" because it covers both money you owe and money owed to you.

### Snapshot

1. **Static hero.** Projected Net Worth as the big number, with Runway (and its change) and Total Assets as sub-figures. No swipe. "See details" switches to the Insights tab; the ⓘ keeps the existing "How is this calculated?" sheet.
2. **One grouped list** replaces the other four cards: tinted icon circle, label, main value (monospace, tabular), secondary line, chevron. Tapping a row jumps to its pill (Cash → Ledger, Investments → Holdings, Loans → Loans, Goals → Goals). No colored backgrounds — identity comes from the icon tint; green/red only on values that mean good/bad.
3. **One Overall / This month toggle** above the list replaces every card's own swipe modes.
   - Cash "This month" = Income − Expense as the main value, transfers on the secondary line (covers both of today's monthly cash pages).
   - Loans' obligations ("₱3.1k of ₱4.5k due this month") become the row's secondary line instead of a third swipe page.
4. **Recent** (3 transactions) with "See all" → Ledger.

Spending pace, budget %, Investment Boost and Debt Drag leave Home; they live in Insights.

### Ledger / Holdings / Goals / Loans

- **Ledger:** search, filter chips (All / Income / Expense / Transfers), this month's income and expense, transactions grouped by day.
- **Holdings:** portfolio total and all-time return, allocation bar by asset type, each holding with value, weight and return.
- **Goals:** saved-in-goals total and this month's contributions, one progress card per goal.
- **Loans:** "You owe / Owed to you" switch, outstanding and due-this-month, one progress card per loan with its next due date.

### Home Settings (bottom sheet)

- **Privacy:** Open / Discreet / Hidden. Picking one applies it immediately; there is no separate toggle. It replaces today's eye buttons (Home, History, Investments, Insights headers) and the floating gear's privacy item.
- **Snapshot order:** drag to reorder the list rows. The hero stays pinned on top.

## 3. Privacy modes

| Mode | What it shows |
| --- | --- |
| **Open** | Every amount. |
| **Discreet** | Only scale-free numbers — percentages, months, counts, progress bars. Useful, but never reveals how much money is involved. |
| **Hidden** | Every amount masked with `****` (today's privacy behavior). |

The chosen mode applies app-wide (Insights isn't under Home but still follows it). Screens without a Discreet version fall back to Hidden.

### What Discreet shows

| Spot | Open | Discreet |
| --- | --- | --- |
| Hero | Projected Net Worth ₱ | Net worth change this month % |
| Hero sub-figure | Total Assets ₱ | Savings rate % |
| Runway | months | months (already scale-free) |
| Cash row | balance ₱ | % kept of income (Overall) / savings rate (This month) |
| Investments row / Holdings | value ₱ | total return %, weight % per holding |
| Loans row / Loans | outstanding ₱ | % repaid, obligations paid count |
| Goals row / Goals | balance ₱ | % to target, goals on track |
| Ledger / Recent | amounts | name, category and date only |
| Debt Drag sheet stepper | ₱ extra per month | number of steps |

Dropped in Discreet because they still leak scale: Investment Boost months (a huge "+N months" implies investments far exceed spending), portfolio value, and individual transaction amounts.

## 4. Insights

Header with a sliders button (Insights Settings), then the **Financial Health** grid, monthly spending, budgets, and an "Ask about your money" entry to the AI chat. The "strict, conservative math" disclaimer from the old screen sits under the grid.

### Financial Health grid

- **Not scrollable anymore.** It replaces today's `InsightsOverviewCards`, a horizontal carousel of 10 cards shown 2 per page with paging dots. The new grid is a fixed 2×2 of exactly 4 tiles: no swipe, no dots.
- **The user picks the 4.** The pool is 13 numbers: today's 10 overview cards plus the three that used to live only on the Financial Health screen.

| Pool | Source |
| --- | --- |
| Runway | Merges today's "Financial Runway" card with the Financial Health screen's runway |
| Spending pace, Debt drag, Investment boost | **New to Insights** (from the Financial Health screen) |
| Budget health, Net cash flow, Savings rate, Total income, Total expense, Burn rate, Daily average, Annualized exp., Top category | Today's overview cards, unchanged |

- **Default 4:** Runway, Spending pace, Debt drag, Investment boost.
- **Show all** (link next to the section header) opens a bottom sheet listing all 13 with their current numbers; the 4 on the grid are tagged. Tapping a row opens that number's detail sheet.
- **Tapping a tile** opens its detail sheet: the four below get the full Financial Health content; the others get their value plus "How is this calculated?" (today's info modals for Runway, Budget health and Daily average move here).
- Every tile and row follows the privacy mode (Discreet shows each number's scale-free version; Investment boost shows "—").

### Insights Settings (bottom sheet)

- **Financial health grid:** checklist of all 13 with a "N of 4" counter. **Checking also orders:** checked items move to the top in the order they were checked, each labeled "Card 1–4", and that is their order on the grid. Unchecking one moves the ones below it up a slot; the next item checked takes the last slot. Once 4 are checked, the rest are disabled until one is unchecked. No separate drag-to-reorder for the grid.
  - Example: grid is Runway, Spending pace, Debt drag, Savings rate. Uncheck Debt drag and Savings rate, then check Total income (→ Card 3) and Total expense (→ Card 4). Uncheck Runway: Spending pace, Total income and Total expense move up to Cards 1–3, and checking Daily average makes it Card 4.
- **Section order:** drag to reorder the sections below the grid (today's "reorder the main analysis sections"). Today's "reorder the top summary cards" option goes away — the grid picker replaces it.

### Financial Health detail sheets

The Financial Health screen is removed. Its four cards map one-to-one onto four of the pool's tiles; tapping one opens a bottom sheet with that card's content.

| Tile | Sheet content (today's component) |
| --- | --- |
| **Runway** | `FinancialStateCard` — runway months and change, "cash covers you until", cash vs monthly costs, spending vs average, debt drag, investments boost |
| **Spending pace** | `SpendingCashFlowCard` — net flow this month, spending trend vs baseline, impact on self-sustain |
| **Debt drag** | `DebtPressureCard` — mandatory payments, interest cost, self-sustain delay, "If you add extra per month" stepper → "Debt-free N months sooner" |
| **Investment boost** | `WealthGrowthCard` — portfolio value, 12-month return, annual dividend impact, "If you invest your surplus" → "Self-sustain arrives N years earlier" |

"How is this calculated?" (today's `FinancialHealthHelpModal`) becomes a collapsible section inside each sheet — no modal opened on top of a bottom sheet.

## 5. Profile

Account and app settings only:

- **Money setup:** Budgets, Recurring Rules, Reminders
- **Data:** Auto Backup, Import / Export
- **Security & Intelligence:** App Lock, Google Gemini
- **Appearance:** Theme

## 6. Learn

- **Guides:** short reads on each metric (Getting Started, What Runway Tells You, Discreet Mode, Saving with Goals, …)
- **Help Center:** Math & Formulas, FAQ, Contact the Developer
- **About WealthSnap:** Why It's Free, Manifesto, Rate WealthSnap, Version / what's new

## 7. Migration of saved state

Nothing should require user action, so existing preferences migrate silently:

| Saved today | Becomes |
| --- | --- |
| Home card order (`financial-health`, `cash-flow`, `portfolio`, `debt`, `savings-goals`, `transactions`) | Snapshot row order (cash, investments, loans, goals); `financial-health` and `transactions` are dropped because the hero and Recent are fixed |
| Per-card display modes (cash flow, investment, debt, financial health) | Ignored; replaced by the single Overall / This month toggle |
| Privacy on/off (`PRIVACY_ENABLED`) | On → **Hidden**, off → **Open** |
| Insights overview card order | Ignored; the Financial Health grid starts with the default 4 (Runway, Spending pace, Debt drag, Investment boost) |
| Insights section order | Kept as-is |

## 8. Versioning

Per `.notes/dev/versioning-and-release-process.md` Section 1, this is a **MINOR** release (new screens, redesigned navigation, new persisted preference) as long as the migration above is silent — 1.19.0 from 1.18.0. Calling it 2.0.0 is a deliberate product choice and would need a line added to that doc allowing MAJOR for a full redesign.

## Open questions before implementation

- Learn as a bottom tab vs a section inside Profile (bottom slots are usually for daily-use destinations).
- Budgets / Recurring Rules / Reminders in Profile ("Money setup") or in Insights next to the budget bars?
- Hero color: keep the primary-blue fill, or go neutral like the rows?
- Floating gear bubble: its per-screen actions need rethinking once Investment and History stop being tabs, and its privacy item goes away.
- Discreet formulas (savings rate window, "on track" for goals, % kept of income) need entries in `docs/METRICS.md` before coding.
- Rollout: (1) Snapshot + privacy modes, (2) Home top menu with Ledger / Holdings / Goals / Loans, (3) Insights sheets + Financial Health screen removal, (4) bottom bar + Profile / Learn split.
