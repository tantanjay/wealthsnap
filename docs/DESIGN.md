# Design System — Layered + identity

The visual rules for every WealthSnap screen. Read this before building or restyling any UI. The reference implementation is the Home Snapshot tab: [src/components/home/SnapshotView.tsx](../src/components/home/SnapshotView.tsx) inside the Home frame in [src/screens/HomeScreen.tsx](../src/screens/HomeScreen.tsx). The older clickable prototype at [docs/mockups/navigation-redesign/navigation-redesign.html](mockups/navigation-redesign/navigation-redesign.html) still shows layout, type and navigation, but predates the canvas, groups, hero panel and icon tiles; where they disagree, this file wins.

**The idea in one line:** two flat planes — a soft grey canvas and white grouped sections on it — give the page depth without shadows; the hero panel and tinted icon tiles give it identity. Numbers still carry the design.

## 1. Principles

1. **Sections sit in one grouped surface on a tinted canvas.** The page is the `canvas`. Each section (a list of rows, a chart, a block of form fields) sits in one white `Group` surface, inset 14 from the screen edge. Section headers sit on the canvas above their group. No nested cards inside a group, and no shadows on either plane.
2. **One accent, spent on meaning.** The accent color marks only "you can tap this" or "you are here": active tab, primary button, links, selected controls, chart highlight. The one exception is the hero panel, a *soft* accent tint behind the screen's hero — never a solid accent block.
3. **Four color jobs, never mixed.** Neutral (surfaces, text), Accent (interaction), Semantic (good / bad / caution), and Domain, which only identifies Cash / Investments / Loans / Goals — as a soft icon tile, a dot, or a progress fill.
4. **Row icons use a soft tile.** Every row icon sits in a 32px tile: the domain's soft tint with the icon in the domain color for domain rows, a neutral tile with a `text2` icon otherwise.
5. **Green / red mean good / bad, not up / down.** Debt going down is green. Spending going up is red. Neutral changes are grey.
6. **Every main number has context.** A value is followed by a change line (vs last month, % of target, etc.) in the semantic tone it deserves.
7. **One hero per screen,** in the hero panel. At most one `display`-size number per screen or sheet.
8. **Simplify by hiding, not shrinking.** Rarely changed choices live in a settings sheet, not as always-visible controls.

## 2. Tokens

### Color

Surfaces, from back to front. In dark mode each step is lighter than the one behind it; keep it that way.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `canvas` | `#F3F4F6` | `#0B0D10` | Page background, sheet body, top bar and tab strip area |
| `bg` | = `canvas` | = `canvas` | Legacy name for `canvas`. Don't use in new code; the migration replaces every use (§7) |
| `group` | `#FFFFFF` | `#16191D` | Grouped section surface, tab bar, sheet footer band, anything inset-like that sits directly on the canvas (fields, chips, tiles) |
| `heroPanel` | `#E8F1FB` | `#16233A` | The hero panel behind the screen's one hero |
| `inset` | `#F4F5F7` | `#1F2328` | Inside a group only: fields, selected chips, formula blocks, tiles in a group. On the canvas it is invisible in light mode — use `group` there |
| `raised` | `#FFFFFF` | `#2A2E35` | Anything that sits *on* an `inset` or `track` surface and must read as lifted: selected segment, stepper buttons, a dragged row. Never use `canvas`/`bg` for this |
| `track` | `#E8EAED` | `#1F2328` | Segmented-control track; reads on both canvas and group |
| `hairline` | `#ECEDF0` | `#262A30` | Row dividers inside groups, tab bar top border, progress track |
| `sheet` | `#FFFFFF` | `#16191D` | Centered dialog surface (CustomAlert). Bottom sheets use `canvas` |
| `text` | `#121417` | `#ECEEF1` | Primary text and numbers |
| `text2` | `#6B7280` | `#9AA1AB` | Secondary text, labels, neutral row icons |
| `text3` | `#8A919C` | `#7A818C` | Non-essential marks only: chevrons, placeholders, disabled states. Any label someone needs to read uses `text2` |
| `accent` | `#1976D2` | `#4A90E2` | Interaction only (see principle 2) |
| `accentSoft` | accent @ 10% | accent @ 16% | Selected category tile, avatar background |
| `onAccent` | `#FFFFFF` | `#FFFFFF` | Text/icons on accent fills |
| `onSemantic` | `#FFFFFF` | `#FFFFFF` | Text/icons on `success`/`danger` fills (treemap tiles, swipe-delete). Never `onAccent`, which is dark in some skins |
| `success` | `#2E7D32` | `#66BB6A` | Good |
| `danger` | `#D32F2F` | `#EF5350` | Bad |
| `warning` | `#E65100` | `#FFA726` | Caution (e.g. budget 70–90%) |
| `domainCash` | `#6E8CB5` | `#8FA9CC` | Cash icon / dot |
| `domainInvest` | `#8E7CC3` | `#A89AD6` | Investments icon / dot, allocation bar (100 / 60 / 30% opacity per asset type) |
| `domainLoans` | `#B0896B` | `#C4A288` | Loans icon / dot and progress |
| `domainGoals` | `#3AA39A` | `#5CBDB3` | Goals icon / dot and progress |
| `domainCashSoft` | `#E8EDF3` | `#313944` | Cash icon tile (domain @ 16% light / 22% dark over `group`, precomputed) |
| `domainInvestSoft` | `#EDEAF5` | `#363546` | Investments icon tile |
| `domainLoansSoft` | `#F2ECE7` | `#3C3735` | Loans icon tile |
| `domainGoalsSoft` | `#DFF0EF` | `#253D3E` | Goals icon tile |
| `tileNeutral` | black @ 6% | white @ 6% | Neutral icon tile |
| `scrim` | black @ 40% | black @ 60% | Behind sheets |
| `qrSurface` | `#FFFFFF` | `#FFFFFF` | Behind a QR code (scanners need dark on light) |
| `onMedia` | `#FFFFFF` | `#FFFFFF` | Marks drawn over a camera feed or photo |
| `chart` | `#3A8FA6` `#C25A7C` `#84923A` `#A05FA8` `#A8862A` `#5D7F5B` `#C27A4E` `#6B6F7A` | `#5FB0C6` `#E07F9E` `#AEBB62` `#C084C7` `#D6B45A` `#8EB08A` `#DE9A70` `#8B92A3` | Categorical chart palette: pies and their legends only (slice *i* = `chart[i % 8]`, its legend/row dot the same). Never for status, domain identity or interaction |

Other constants: `SPARK_FILL_OPACITY` = 0.14 (the hero sparkline's fill, fading to 0).

Domain colors are deliberately muted and never reuse a semantic or accent hue. The `chart` hues are muted the same way and ordered so neighbouring slices differ in both hue and lightness.

Severity in dialogs and notices (icon + color, see `src/utils/severity.ts` for icons): error `danger`, warning `warning`, success `success`, info `text2`.

### Skins

The values above are the **Layered** skin. `SKINS` in `src/styles/theme.ts` holds 10 skins, each with a light and a dark token set; `useTheme().ds` is `SKINS[skin][mode]`. Skin and mode are separate settings (Profile → Appearance → Skin), so every skin works with Light, Dark and System.

- **A skin sets 8 roles only:** `canvas`, `group`, `heroPanel`, `text`, `text2`, `hairline`, `accent`, `onAccent`.
- **Derived from those:** `accentSoft` (accent @ 10% / 16%), the hero sparkline fill, `inset` (a step off `group` toward `text`), `raised`, `track`, `sheet` (= `group`), `text3` (between `text2` and `canvas`) and the `domain*Soft` tiles (domain over the skin's `group`).
- **Never change per skin:** `success`, `danger`, `warning`, the `domain*` colors, `chart[]`, `onSemantic`, `tileNeutral`, `scrim`, `qrSurface`, `onMedia`. Gain is green and loss is red in every skin.
- **Components never branch on the skin.** They read `ds` like any other token; if something looks wrong in one skin, fix the token or its derivation, not the component.
- **Adding a skin:** add its id to `SkinId` and one `skin(name, description, light, dark)` entry to `SKINS`, giving the 8 roles in order for each mode. Check text, `text2` and `accent` against `group`, `canvas` and `heroPanel`, and `onAccent` against `accent`, staying no lower than Layered's own contrast; then look at Home, Insights, Profile, a form and a sheet in both modes.

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

- **Spacing scale:** 4, 8, 12, 16, 20, 24, 32. Nothing else, except the group layout below.
- **Group layout** (`layout` in theme.ts): groups and the hero panel sit `groupInset` = 14 from the screen edge; group content is padded `groupPadding` = 14 inside. So group content (rows, section-header text) starts 28 from the screen edge.
- **Top bar and tab strip gutter:** 20. **Section gap:** 24 above each section header, 8 between a grouped header and its group.
- **Row:** 12 vertical padding, min height 56, 12 gap between parts.
- **Radius:** 8 (`sm` — chips, segments, formula blocks), 9 (row icon tiles), 12 (`md` — tiles, fields, buttons), 16 (`group` — groups, hero panel), 20 (`lg` — sheet top corners), full (dots, avatars, FAB).
- **Elevation:** none for in-flow content. Shadows only on floating layers: sheets, dropdown menus and the Record FAB.

## 3. Components

| Component | Recipe |
| --- | --- |
| **Top bar** | On the canvas. Left: greeting or screen title (`title`). Right: one settings icon (`options-outline`, 22, `text2`). When privacy isn't Open, a small `group` chip ("Discreet" / "Hidden", `caption` 500) sits left of the icon. |
| **Underline tabs** | On the canvas. `small` 500; inactive `text2`; active `text` + 2px `accent` underline; hairline under the whole strip; 20 gap; horizontally scrollable; sticky under the top bar. |
| **Group** (`ds/Group`) | `group` fill, radius 16, 14 horizontal padding, no border or shadow. Row lists go straight in (`<Group>`); non-row content (chart, fields, text) uses `<Group padded>` for 14 vertical padding. `inset` adds the 14 side margin when the parent isn't already padded by `layout.groupInset`. Clips the last row's hairline even if `last` is forgotten. |
| **Hero** | Sits in the hero panel (`<Hero panel>`: `heroPanel` fill, radius 16, padding 16). `small` `text2` label → `display` number → `small` change line (semantic tone, ▲/▼ allowed here only) → optional 1.5px `accent` sparkline with a faint `accent` fill (14% fading to 0, no axes) → inline secondary stats (`small`, label in `text2`, value in `text`). |
| **Section header** | On the canvas above its group: `<SectionHeader grouped>`, which pads the text 14 so it lines up with the group's content. `small` 600 `text` title on the left; optional `small` 500 `accent` action on the right ("See all", "Show all", "Overall ⌄"). |
| **Row** | Inside a Group. Leading: 32px icon tile, radius 9, 18px icon. `domain` → that domain's soft tile with the icon in the domain color (default icons: cash `wallet-outline`, investments `trending-up-outline`, loans `card-outline`, goals `flag-outline`; `icon` overrides). `icon` alone → `tileNeutral` tile with a `text2` icon. `iconStyle="plain"` keeps the old 8px dot / bare 20px icon; `leading` takes custom content (radio, checkbox, a tone-colored status icon). Middle: `body` title + `small` `text2` secondary. Trailing: `body` value + `caption` change line in its tone; chevron (`text3`, 16) only when the row navigates somewhere not obvious. Hairline divider; none after the last row (`last`). |
| **Progress** | 4px bar on `hairline` track, radius 2. Fill = domain color (goals, loans) or semantic color when the value is good/bad (budgets: ≤70 success, ≤90 warning, >90 danger). |
| **Tile** | Radius 12, padding 16, no border or shadow. On the canvas it is its own surface (`group` fill, the default); inside a Group pass `inGroup` for an `inset` fill. `small` `text2` label (optional 15px outline icon) → `title` value → `caption` change line. Used only in grids (Insights Financial Health) and horizontal shelves (Learn guides). |
| **Period / mode switch** | A text action in the section header that toggles ("Overall ⌄"). Use a segmented control only when two views are peers on the same screen (Loans: You owe / Owed to you; Record: transaction type). Max one segmented control per screen. |
| **Segmented control** | `track` fill (radius 10, padding 3), works on canvas and in a group; options `small` 500 `text2`; selected = `raised` fill + hairline ring + `text`. |
| **Chip filters** | `small` 500; inactive plain `text2`; selected = `inset` fill inside a group, `group` fill on the canvas, + `text`. |
| **Field** | Inside a `<Group padded>`: `inset` fill, radius 12, padding 12, 18px leading icon, placeholder `text3`. A field that must sit directly on the canvas (a search bar above a list) uses `group` fill instead. |
| **Primary button** | Full width, 48 tall, radius 12, `accent` fill, `onAccent` `body` 600, sentence case ("Save expense"). One per screen or sheet. |
| **Bottom tab bar** | `group` fill, hairline top, 5 items. Inactive icons and labels `text2`; active = filled icon + `accent`. Labels `caption` 500. Center Record = 48px `accent` circle raised above the bar, the only floating accent; its shadow is accent-tinted in light and plain black in dark. |
| **Bottom sheet** | `canvas` fill, top radius 20, 36×4 grabber, body inset 14 from the edges. Title `title` (lined up with group content) *or* a hero (`<Hero panel>`). Body content sits in Groups, exactly like a screen. Footer: `group` band + hairline top, holding the primary button. Both `ds/Sheet` and `common/BottomModal` draw this. Never open a modal on top of a sheet — use a collapsible section instead. |
| **Dialog** (CustomAlert) | `sheet` fill (white / `#16191D`), radius 20, centered. Footer: `inset` band + hairline top. |
| **"How is this calculated?"** | In its own `<Group padded>`. Collapsible: `small` 500 `accent` summary with `calculator-outline` icon → `inset` formula block (radius 8, `small`) → one `small` `text2` explanation line. |
| **Selection lists** | Rows in a Group. Radio (20px ring, accent dot) for single choice; numbered checkbox (22px, radius 6, accent fill with position number) when choice order matters. |
| **Charts** | In a `<Group padded>`. Anything that must match the surface behind it (pointer borders, a donut's inner circle) uses `group`. Bars: `accent` at 100% for recorded amounts, 22% for projected or estimated ones (the projected rest of this month stacks faint on top of its solid part); a pressed bar dims to 70%. Top radius 4, no gridlines, `caption` `text2` axis labels. Lines: 1.5px `accent`; the recorded (actual) series may carry a soft `accent` fill fading from 18% to 0, projections and averages never do. |

## 4. Numbers

- Currency: symbol + grouped digits (`₱128,450`); compact (`₱1.2M`, `₱21k`) only in secondary lines.
- Signs: `+` and true minus `−` (U+2212), never a hyphen.
- Change lines say *what they compare to* when it isn't obvious ("vs Sep", "this month", "all time").
- Tone follows meaning (principle 5), decided per metric — document it with the metric in `docs/METRICS.md`.

## 5. Privacy rendering

Every amount renders through one helper that knows the current mode (Open / Discreet / Hidden):

- **Open:** the value.
- **Discreet:** the metric's scale-free alternative (%, months, counts, progress). Each metric defines its own; if it has none, the value is shown as "—" (Investment boost). A single transaction's own amount shows as in Open; totals built from them (day, month) stay out.
- **Hidden:** `****`, keeping a leading sign (`+****`).

Change lines and secondary text go through the same helper. Months, percentages and counts render unchanged in every mode.

## 6. Building a new screen — checklist

1. Start from the canvas. Decide the one hero number, if any, and put it in the hero panel.
2. Put the screen's controls in at most: top bar + one tab strip + one switch. Move anything rarely changed into the screen's settings sheet.
3. Lay out sections: `SectionHeader grouped` on the canvas + one `Group` holding the section's rows, chart or fields.
4. Use tiles only for a grid or shelf of peer metrics.
5. Every number: tabular figures, a change line if it's a main number, correct semantic tone, routed through the privacy helper.
6. Icons: Ionicons outline, in the Row's tile — `domain` for cash/investment/loan/goal rows, `icon` (neutral tile) otherwise.
7. Only spacing values from the scale (plus the 14 group layout); only the listed radii.
8. Check the screen in dark mode and in all three privacy modes. In dark mode, confirm every "selected" or "lifted" element is *lighter* than what it sits on, and that no readable text uses `text3`. In light mode, confirm nothing `inset`-filled sits directly on the canvas.
9. Compare against the Home Snapshot tab before writing new markup.

## 7. Migration recipe

For moving an existing Refined Minimal screen, form or sheet onto Layered + identity. Do every step that applies; the Home Snapshot tab is the worked example.

### Every file

1. **`ds.bg`:** replace each use with `ds.canvas` (page backgrounds, full-screen views, `PrivacyGuard`-style overlays) **or** `ds.group` (anything that must read as a surface, or must match the group it now sits in: chart pointer borders, a donut's `innerCircleColor`, `Card flat`). Drop `style={{ backgroundColor: ds.bg }}` passed to `ScreenWrapper`; it defaults to the canvas.
2. **`ds.inset`:** keep it if the element ends up inside a Group. If it stays directly on the canvas or a sheet body (a chip, a field above a list, an empty-state circle, a tile, a notice block), switch it to `ds.group`.
3. **`ds.sheet`:** keep it only for centered dialogs. Inside a bottom sheet, delete background overrides that paint `ds.sheet` (the sheet body is the canvas); chart borders that matched the sheet become `ds.group`; a dragged/lifted row becomes `ds.raised`.
4. **Side gutter:** a scroll content container that used `paddingHorizontal: space[5]` (20) or 16 uses `layout.groupInset` (14). Full-width lists that can't be padded (FlatList, SectionList) wrap content in `<Group inset>`. Top bars and `UnderlineTabs` keep their 20.
5. **No hard-coded hex, no new shadows, no cards inside groups.**

### Screens

1. **Hero:** add `panel` to the screen's one `<Hero>`; replace its top padding with `marginTop: space[3]` (the panel brings its own padding).
2. **Sections:** each `SectionHeader` gets `grouped`, and the rows under it are wrapped in one `<Group>`. Keep `last` on the final row.
3. **Non-row sections** (charts, text blocks, empty text, a Financial Health summary): `<Group padded>`.
4. **A group with no header above it** (e.g. the first block after the top bar): give it `style={{ marginTop: space[4] }}`.
5. **Rows:** nothing to rename — `icon` now draws a neutral tile and `domain` a tinted tile. Add `domain` to rows that stand for a cash account, holding, loan or goal (pass `icon` too if the default domain icon is wrong). Rows whose leading mark carries meaning of its own (tone-colored alert icons, radios, avatars) keep `leading`. Use `iconStyle="plain"` only when a 32px tile genuinely doesn't fit, and say why in a comment.
6. **Tiles:** a grid or shelf of tiles on the canvas needs no change. A tile inside a Group gets `inGroup`.
7. **Bespoke surfaces** that hand-roll a white or `inset` box around a list (custom card containers, bordered blocks) are replaced by `Group`.

### Forms (full-page and in-sheet)

1. Page or sheet body is the canvas.
2. Group fields by meaning: each block is an optional `SectionHeader grouped` + `<Group padded>` holding the fields. Fields keep their `inset` fill, radius 12; vertical gap between fields `space[3]`.
3. Switch rows, picker rows and "choose account / category" rows go in a `<Group>` as `Row`s.
4. The one segmented control (transaction type) stays on the canvas above the groups; nothing to change — it uses `track`.
5. A field that has to sit on the canvas by itself (the Record amount, a search bar) uses `ds.group`.
6. The primary button stays as is (on the canvas or in the sheet footer).

### Sheets (`ds/Sheet`, `common/BottomModal`)

1. Nothing to change on the container: both now draw a canvas body, a 14 side inset, a title lined up with group content and a `group` footer band.
2. Wrap the body content in Groups exactly as for a screen (rows → `<Group>`, everything else → `<Group padded>`). The first group directly under the title needs no header; later sections use `SectionHeader grouped`.
3. A sheet whose header is a hero uses `<Hero panel>`.
4. Collapsible "How is this calculated?" blocks go in their own `<Group padded>`; the formula block stays `inset`.
5. Remove `contentStyle` / inner-view paddings or backgrounds that assumed the old 20 gutter or a white body.
6. Drag-to-reorder lists sit in a Group; the dragged row uses `ds.raised`.

### Shared components

New components introduced by this direction: `ds/Group` only. Changed APIs (all backward compatible): `Row` `iconStyle`, `Hero` `panel`, `SectionHeader` `grouped`, `Tile` `inGroup`. Don't add another shared component without listing it here.

## 8. Don't

- Content straight on the canvas when it belongs to a section — rows, charts and field blocks go in a Group.
- Cards or bordered boxes nested inside a Group, or a Group per row.
- `inset` fill directly on the canvas (it disappears in light mode — use `group`).
- Using `canvas`/`bg` as a "selected" or "lifted" fill (it's the darkest surface in dark mode — use `raised`).
- Solid-color blocks behind headline numbers; the hero panel is a soft tint, and only the hero gets one.
- Saturated or semantic-colored icon tiles; tiles are the domain's soft tint or neutral, never `success`/`danger`/`accent`.
- Shadows on in-flow content (groups, hero panel, tiles).
- Using `success`/`danger` for domain identity (e.g. red for Loans).
- ALL-CAPS labels, monospace numbers, or font sizes outside the scale.
- Two segmented controls, or a segmented control where a header text toggle would do.
- A modal opened from inside a bottom sheet.

## 9. Implementation notes (React Native)

- Tokens live in `src/styles/theme.ts` (light and dark objects with the names above); components read them through `useTheme()` as `const { ds, elevation } = useTheme()` (`ds.text2`, `ds.group`, `elevation.sheet`). No hex values in components.
- Load Inter with `expo-font` (already a dependency), e.g. via `@expo-google-fonts/inter`; expose the weights as `fontFamily` entries in the type styles.
- Type styles, spacing, radii and the group layout are exported constants (`type.display`, `space[4]`, `radius.group`, `layout.groupInset`), so screens never hand-write sizes.
- Build the shared pieces once — `Group`, `Row`, `SectionHeader`, `Tile`, `Hero`, `ChangeLine`, `UnderlineTabs`, `Sheet` — and compose screens from them.
