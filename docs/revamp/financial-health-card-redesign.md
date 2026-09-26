# Financial Health Card Redesign — "Score Ring" concept

**Status:** Idea / mockup only — not yet implemented in the app.
**Target component:** `src/components/home/HomeFinancialHealthCard.tsx` (Card 1 of the swiper — "Health Metrics" page. Net Worth and Total Assets pages are untouched.)

## Why

The Home dashboard is meant to feel like a "Financial Health System/OS" for the app, but the current Health Metrics card is just four plain icon+text rows (Runway, Spending, Investment Boost, Debt Drag) stacked vertically. It's functional but not iconic — nothing about it is memorable or instantly recognizable the way, say, an Apple Watch activity ring or a car dashboard gauge is.

## The concept

Replace the vertical list with:

1. **A circular Health Score ring** as the hero — a single 0–100 number in the center of a radial progress ring, colored by tier:
   - 70–100 → `colors.success` (green) — "Good"
   - 40–69 → `colors.warning` (amber) — presumably "Fair" (not mocked yet)
   - 0–39 → `colors.error` (red) — presumably "Needs Attention" (not mocked yet)
   - A small pill badge sits under the ring naming the tier (e.g. "Good").
2. **The four existing metrics become a 2×2 icon-tile grid** below the ring instead of a vertical list — each tile keeps its established icon + semantic color (Runway/Investment Boost = success or primary, Spending = warning, Debt Drag = error), just presented as a compact tile (icon circle, label, value) instead of a full-width row.
3. The "View Financial Health" button and the 3-dot page indicator stay as they are today.

This still needs a real "Health Score" number computed somewhere (not just the four existing metrics as separate lines) — that calculation doesn't exist yet and would need to be designed (likely a weighted blend of the four metrics, normalized to 0–100).

**Mockup:** [financial-health-score-ring.html](./financial-health-score-ring.html)

## The calibrating (no-data-yet) state

The app already has a "Calibrating" state for when a user has some data but every one of the four metrics is simultaneously uncomputable (no expense history → infinite runway, no investing, no debt). Today that's a plain icon + two lines of text, unrelated visually to the real card.

The redesigned calibrating state reuses the **same ring shell** as the populated card, so the two states read as one coherent system rather than two different designs bolted together:

- The ring track stays; instead of a score arc, a short segment rotates around it (a "scanning" animation — a real CSS spin in-app, since a static mockup can only show one animation frame) in `colors.primary`.
- The center shows a radar/scan icon + "Calibrating" instead of a score number.
- The pill below reads "Gathering data" in neutral blue instead of a tier color, since there's no tier to report yet.
- The 2×2 tile grid still renders, but muted: gray icon circles and an em-dash (—) instead of a value. This is deliberate — it previews the layout the user is about to get, so nothing visually jumps in size the moment real data arrives, and it doubles as a bit of "coming soon" texture.
- No CTA button, consistent with the existing rule of not showing a button when there's nothing yet to view (same pattern used for the Debt Strategy screen's "Congrats, you have no debts!" state).
- A short encouragement note (icon + one line) sits where the button would normally be: *"Keep logging your income and expenses — your Health Score and stats above will switch on once there's enough to go on."*

**Mockup:** [financial-health-calibrating.html](./financial-health-calibrating.html)

## Open questions before implementation

- What is the actual Health Score formula? (Some weighted combination of runway, spending pace, investment boost, and debt drag, normalized 0–100 — needs a real design pass, not just reusing the four raw metrics.)
- Fair/Needs Attention tier copy and exact score thresholds (mocked at 70/40 as a starting guess).
- Whether the scanning ring animation should be a rotating short arc (as mocked) or a pulsing full ring — either is easy in React Native (`Animated`/`react-native-reanimated`, already a dependency used elsewhere in the app, e.g. `DraggableIconButton.tsx`).
