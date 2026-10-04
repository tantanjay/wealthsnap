# Design System — Refined Minimal

The visual rules for every WealthSnap screen. Read this before building or restyling any UI. The reference implementation is the clickable prototype at [mock/navigation-redesign/navigation-redesign.html](../mock/navigation-redesign/navigation-redesign.html) — its CSS variables mirror the tokens below one-to-one.

**The idea in one line:** minimal means *fewer containers and deliberate hierarchy*, not the same box repeated. Content sits on the page; numbers carry the design.

## 1. Principles

1. **Content on the page.** Lists are rows separated by hairlines, never boxed in cards. Containers exist only for tiles (inset fill) and floating layers (sheets).
2. **One accent, spent on meaning.** The accent color marks only "you can tap this" or "you are here": active tab, primary button, links, selected controls, chart highlight. Never a decorative fill (no solid-color hero blocks).
3. **Three color jobs, never mixed.** Neutral (surfaces, text), Accent (interaction), Semantic (good / bad / caution). A fourth, Domain, only identifies Cash / Investments / Loans / Goals — and only as a dot or a progress fill.
4. **Green / red mean good / bad, not up / down.** Debt going down is green. Spending going up is red. Neutral changes are grey.
5. **Every main number has context.** A value is followed by a change line (vs last month, % of target, etc.) in the semantic tone it deserves.
6. **One hero per screen.** At most one `display`-size number per screen or sheet.
7. **Simplify by hiding, not shrinking.** Rarely changed choices live in a settings sheet, not as always-visible controls.

## 2. Tokens

### Color

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `bg` | `#FFFFFF` | `#0E1013` | Page background, tab bar |
| `inset` | `#F4F5F7` | `#1A1D22` | Tiles, input fields, segmented track, sheet footer, formula blocks |
| `raised` | `#FFFFFF` | `#2A2E35` | Anything that sits *on* an `inset` surface and must read as lifted: selected segment, stepper buttons. Never use `bg` for this — in dark mode `bg` is the darkest surface and reads as a hole |
| `hairline` | `#ECEDF0` | `#262A30` | Row dividers, tab bar top border, progress track |
| `sheet` | `#FFFFFF` | `#16191D` | Bottom sheet surface |
| `text` | `#121417` | `#ECEEF1` | Primary text and numbers |
| `text2` | `#6B7280` | `#9AA1AB` | Secondary text, labels, row icons |
| `text3` | `#8A919C` | `#7A818C` | Non-essential marks only: chevrons, placeholders, disabled states. Any label someone needs to read uses `text2` |
| `accent` | `#1976D2` | `#4A90E2` | Interaction only (see principle 2) |
| `accentSoft` | accent @ 10% | accent @ 16% | Selected category tile, avatar background |
| `onAccent` | `#FFFFFF` | `#FFFFFF` | Text/icons on accent fills |
| `success` | `#2E7D32` | `#66BB6A` | Good |
| `danger` | `#D32F2F` | `#EF5350` | Bad |
| `warning` | `#E65100` | `#FFA726` | Caution (e.g. budget 70–90%) |
| `domainCash` | `#6E8CB5` | `#8FA9CC` | Cash dot |
| `domainInvest` | `#8E7CC3` | `#A89AD6` | Investments dot, allocation bar (100 / 60 / 30% opacity per asset type) |
| `domainLoans` | `#B0896B` | `#C4A288` | Loans dot and progress |
| `domainGoals` | `#3AA39A` | `#5CBDB3` | Goals dot and progress |
| `scrim` | black @ 40% | black @ 60% | Behind sheets |

Domain colors are deliberately muted and never reuse a semantic or accent hue.

### Type

One family: **Inter** (400 / 500 / 600). Every number uses tabular figures (`fontVariant: ['tabular-nums']` in React Native). No monospace font in UI.

| Style | Size / line | Weight | Use |
| --- | --- | --- | --- |
| `display` | 32 / 38, letter-spacing −0.02em | 600 | The one hero number per screen or sheet |
| `title` | 22 / 28, −0.01em | 600 | Screen titles, sheet titles, tile values |
| `body` | 15 / 22 | 500 | Row titles, row values, buttons (600) |
| `small` | 13 / 18 | 400 (500 for links, 600 for section headers) | Secondary lines, labels, tabs, section headers |
| `caption` | 11 / 14 | 400–500 | Change lines under row values, tab bar labels, chart axes |

Exceptions: the Record amount input is 44 / 52 (600). Nothing else goes outside the scale.

Text is sentence case everywhere (no ALL-CAPS section labels).

### Spacing and shape

- **Spacing scale:** 4, 8, 12, 16, 20, 24, 32. Nothing else.
- **Screen gutter:** 20. **Section gap:** 24 above each section header, 4 below.
- **Row:** 12 vertical padding, min height 56, 12 gap between parts.
- **Radius:** 8 (`sm` — chips, segments, formula blocks), 12 (`md` — tiles, fields, buttons), 20 (`lg` — sheet top corners), full (dots, avatars, FAB).
- **Elevation:** none for in-flow content. Shadows only on floating layers: sheets and the Record FAB.

## 3. Components

| Component | Recipe |
| --- | --- |
| **Top bar** | Left: greeting or screen title (`title`). Right: one settings icon (`options-outline`, 22, `text2`). When privacy isn't Open, a small `inset` chip ("Discreet" / "Hidden", `caption` 500) sits left of the icon. |
| **Underline tabs** | `small` 500; inactive `text2`; active `text` + 2px `accent` underline; hairline under the whole strip; 20 gap; horizontally scrollable; sticky under the top bar. Replaces filled pills. |
| **Hero** | `small` `text2` label → `display` number → `small` change line (semantic tone, ▲/▼ allowed here only) → optional 1.5px `accent` sparkline (no axes, no fill) → inline secondary stats (`small`, label in `text2`, value in `text`). No container. |
| **Section header** | `small` 600 `text` title on the left; optional `small` 500 `accent` action on the right ("See all", "Show all", "Overall ⌄"). |
| **Row** | Leading: 8px domain dot, or 20px outline icon in `text2`. Middle: `body` title + `small` `text2` secondary. Trailing: `body` value + `caption` change line in its tone; chevron (`text3`, 16) only when the row navigates somewhere not obvious. Hairline divider; none after the last row. |
| **Progress** | 4px bar on `hairline` track, radius 2. Fill = domain color (goals, loans) or semantic color when the value is good/bad (budgets: ≤70 success, ≤90 warning, >90 danger). |
| **Tile** | `inset` fill, radius 12, padding 16, no border or shadow. `small` `text2` label (optional 15px outline icon) → `title` value → `caption` change line. Used only in grids (Insights Financial Health) and horizontal shelves (Learn guides). |
| **Period / mode switch** | A text action in the section header that toggles ("Overall ⌄"). Use a segmented control only when two views are peers on the same screen (Loans: You owe / Owed to you; Record: transaction type). Max one segmented control per screen. |
| **Segmented control** | `inset` track (radius 10, padding 3); options `small` 500 `text2`; selected = `raised` fill + hairline ring + `text`. |
| **Chip filters** | `small` 500; inactive plain `text2`; selected `inset` fill + `text`. |
| **Field** | `inset` fill, radius 12, padding 12, 18px leading icon, placeholder `text3`. |
| **Primary button** | Full width, 48 tall, radius 12, `accent` fill, `onAccent` `body` 600, sentence case ("Save expense"). One per screen or sheet. |
| **Bottom tab bar** | `bg`, hairline top, 5 items. Inactive icons and labels `text2`; active = filled icon + `accent`. Labels `caption` 500. Center Record = 48px `accent` circle raised 18px, the only floating accent; its shadow is accent-tinted in light and plain black in dark. |
| **Bottom sheet** | `sheet` fill, top radius 20, 36×4 grabber. Title `title` *or* a hero (label / display / change line). Body rows follow the Row recipe. Footer: `inset` background + hairline top, holding the primary button. Never open a modal on top of a sheet — use a collapsible section instead. |
| **"How is this calculated?"** | Collapsible: `small` 500 `accent` summary with `calculator-outline` icon → `inset` formula block (radius 8, `small`) → one `small` `text2` explanation line. |
| **Selection lists** | Radio (20px ring, accent dot) for single choice; numbered checkbox (22px, radius 6, accent fill with position number) when choice order matters. |
| **Charts** | Bars: `accent` at 22% opacity, current period at 100%, top radius 4, no gridlines, `caption` `text2` axis labels. Lines: 1.5px `accent`. |

## 4. Numbers

- Currency: symbol + grouped digits (`₱128,450`); compact (`₱1.2M`, `₱21k`) only in secondary lines.
- Signs: `+` and true minus `−` (U+2212), never a hyphen.
- Change lines say *what they compare to* when it isn't obvious ("vs Sep", "this month", "all time").
- Tone follows meaning (principle 4), decided per metric — document it with the metric in `docs/METRICS.md`.

## 5. Privacy rendering

Every amount renders through one helper that knows the current mode (Open / Discreet / Hidden):

- **Open:** the value.
- **Discreet:** the metric's scale-free alternative (%, months, counts, progress). Each metric defines its own; if it has none, the value is omitted (e.g. transaction amounts) or shown as "—" (Investment boost).
- **Hidden:** `****`, keeping a leading sign (`+****`).

Change lines and secondary text go through the same helper. Months, percentages and counts render unchanged in every mode.

## 6. Building a new screen — checklist

1. Start from the page (`bg`). Decide the one hero number, if any.
2. Put the screen's controls in at most: top bar + one tab strip + one switch. Move anything rarely changed into the screen's settings sheet.
3. Lay out sections: header (`small` 600) + rows. No cards around lists.
4. Use tiles only for a grid or shelf of peer metrics.
5. Every number: tabular figures, a change line if it's a main number, correct semantic tone, routed through the privacy helper.
6. Icons: Ionicons outline, `text2`. Domain identity only via the 8px dot or progress fill.
7. Only spacing values from the scale; only the three radii.
8. Check the screen in dark mode and in all three privacy modes. In dark mode, confirm every "selected" or "lifted" element is *lighter* than what it sits on, and that no readable text uses `text3`.
9. Compare against the nearest existing screen in the prototype before writing new markup.

## 7. Don't

- Using `bg` as a "selected" or "lifted" fill on top of `inset` (inverts in dark mode — use `raised`).
- Solid-color blocks behind headline numbers.
- Icon circles with colored backgrounds in lists.
- Shadows on in-flow content.
- Using `success`/`danger` for domain identity (e.g. red for Loans).
- ALL-CAPS labels, monospace numbers, or font sizes outside the scale.
- Two segmented controls, or a segmented control where a header text toggle would do.
- A modal opened from inside a bottom sheet.

## 8. Implementation notes (React Native)

- Tokens live in `src/styles/theme.ts` (light and dark objects with the names above); components read them through `useTheme()`. No hex values in components.
- Load Inter with `expo-font` (already a dependency), e.g. via `@expo-google-fonts/inter`; expose the weights as `fontFamily` entries in the type styles.
- Type styles, spacing and radii are exported constants (`type.display`, `space[4]`, `radius.md`), so screens never hand-write sizes.
- Build the shared pieces once — `Row`, `SectionHeader`, `Tile`, `Hero`, `ChangeLine`, `UnderlineTabs`, `Sheet` — and compose screens from them.
