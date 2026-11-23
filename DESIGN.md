---
name: "Deebo's College"
description: "A printed JoSAA cutoff almanac crossed with a terminal. Dark, dense, and ruled like a ledger."
colors:
  deep-ink: "#0d1116"
  ledger-canvas: "#161d27"
  slate-panel: "#212730"
  slate-panel-raised: "#252f3d"
  hairline: "#49505980"
  hairline-strong: "#757d8975"
  parchment: "#ebe7e4"
  parchment-dim: "#ebe7e4d9"
  faded-slate: "#a8adb4"
  tidal-blue: "#6a9fcc"
  terracotta: "#b86b52"
  sunkiss: "#e1b06e"
  sage: "#a3a473"
  tidal-dim: "#4b607c"
  signal-coral: "#e8704f"
  selection-wash: "#6a9fcc3d"
typography:
  display:
    fontFamily: "Source Serif 4, Iowan Old Style, Georgia, serif"
    fontSize: "64px"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Source Serif 4, Iowan Old Style, Georgia, serif"
    fontSize: "40px"
    fontWeight: 400
    lineHeight: 1.08
  title:
    fontFamily: "Source Serif 4, Iowan Old Style, Georgia, serif"
    fontSize: "17px"
    fontWeight: 500
    lineHeight: 1.3
  body:
    fontFamily: "Commit Mono, SFMono-Regular, Menlo, monospace"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  data:
    fontFamily: "Commit Mono, SFMono-Regular, Menlo, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
    fontFeature: "tabular-nums"
  label:
    fontFamily: "Commit Mono, SFMono-Regular, Menlo, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0.08em"
  folio:
    fontFamily: "Departure Mono, Commit Mono, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0.04em"
rounded:
  none: "0px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "20px"
  "5": "40px"
  "6": "60px"
  "7": "80px"
components:
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.parchment}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "40px"
  button-quiet-hover:
    backgroundColor: "{colors.slate-panel-raised}"
    textColor: "{colors.parchment}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "40px"
  button-primary:
    backgroundColor: "{colors.tidal-blue}"
    textColor: "{colors.deep-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "40px"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.parchment-dim}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 4px"
    height: "32px"
  input:
    backgroundColor: "{colors.slate-panel}"
    textColor: "{colors.parchment}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "10px 12px"
    height: "44px"
  input-focus:
    backgroundColor: "{colors.slate-panel}"
    textColor: "{colors.parchment}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "10px 12px"
  rank-input:
    backgroundColor: "{colors.slate-panel}"
    textColor: "{colors.parchment}"
    typography: "Source Serif 4, 48px, tabular-nums"
    rounded: "{rounded.none}"
    padding: "0 12px"
    height: "64px"
  segmented-option:
    backgroundColor: "transparent"
    textColor: "{colors.faded-slate}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 12px"
    height: "44px"
  segmented-option-active:
    backgroundColor: "{colors.selection-wash}"
    textColor: "{colors.parchment}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 12px"
    height: "44px"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.parchment-dim}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "3px 8px"
  modal-card:
    backgroundColor: "{colors.ledger-canvas}"
    textColor: "{colors.parchment}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "20px"
    width: "560px"
---

# Design System: Deebo's College

## Overview

**Creative North Star: "The Cutoff Ledger"**

A printed JoSAA cutoff almanac crossed with a terminal. The page is a ledger that finds your line in it. It is not a dashboard of recommendation cards, and every screen refuses that default: no centered hero card, no card grid, no rounded shadows. Density is honest. A student under counselling pressure should scan a ruled table and find their rank in it faster than any chat UI would let them.

The world runs dark only. A deep ink navy ground carries parchment text, terracotta and sage and sunkissed state ticks, tidal blue actions, 1px hairlines, and square corners everywhere. Source Serif 4 speaks in display sizes; Commit Mono carries every number, label and control; Departure Mono marks folios and axis labels like a typewritten index. The signature element is the Rank Rail: a log-scale rail with the student's rank fixed at center and each closing rank ticked left for reach or right for safe.

**Key Characteristics:**

- Dark only, deep ink ground, no light theme and no theme toggle.
- Square corners everywhere (`--radius: 0`). No border radius survives.
- 1px hairlines separate everything. No drop shadows at rest.
- Serif for display, mono for everything operational.
- Numbers are tabular and right-aligned in data columns.
- Uppercase micro labels with 0.08em tracking, never a kicker above a heading.
- Accent blue is rare: primary actions and the active step only.

## Colors

A dark editorial palette: ink grounds, parchment text, one blue accent, and three state hues borrowed from the data itself (reach, target, safe).

### Primary
- **Tidal Blue** (#6a9fcc): The single accent. Primary buttons, active nav step, focus outlines, links in motion. Used on well under 10% of any screen.
- **Selection Wash** (#6a9fcc3d): Tidal blue at 24% over dark. The selected state of segmented options and answer rows.

### Secondary
- **Terracotta** (#b86b52): The reach state. Closing ranks harder than the student's rank. Also the axis color of the Rank Rail specimen.
- **Sunkiss** (#e1b06e): The target state. Closing ranks within reach band of the student's rank.
- **Sage** (#a3a473): The safe state. Closing ranks well below the student's rank.

### Neutral
- **Deep Ink** (#0d1116): Page ground.
- **Ledger Canvas** (#161d27): Modal cards, detail rows, inset surfaces.
- **Slate Panel** (#212730): Inputs, hover wash on rows, figure panels.
- **Slate Panel Raised** (#252f3d): Button hover, pressed states.
- **Hairline** (#49505980): Row dividers, table rules, borders at rest.
- **Hairline Strong** (#757d8975): Bottom rules under headers, chip borders, hover borders.
- **Parchment** (#ebe7e4): Primary text, institute names, headings.
- **Parchment Dim** (#ebe7e4d9): Body copy, secondary text.
- **Faded Slate** (#a8adb4): Muted labels, folios, placeholders.
- **Tidal Dim** (#4b607c): The neutral marker on the Rank Rail, de-emphasized ticks.
- **Signal Coral** (#e8704f): Errors, destructive actions. Paired with text, never color alone.

### Named Rules
**The One Blue Rule.** Tidal blue marks actions and the current step, nothing else. Data states speak in terracotta, sunkiss, and sage, not blue.

**The No New Hex Rule.** Every color in the UI resolves to a token in `tokens.css`. Screens add no hex values of their own.

## Typography

**Display Font:** Source Serif 4 (self-hosted woff2, Georgia fallback)
**Body Font:** Commit Mono (self-hosted otf, Menlo fallback)
**Label/Folio Font:** Departure Mono (self-hosted woff2, Commit Mono fallback)

**Character:** A serif that reads like a printed almanac headline over a mono that reads like a terminal. The pairing is the product: a ledger, not an app.

### Hierarchy
- **Display** (400, 64px desktop / 40px tablet / 36px phone, 1.02): One per screen. The screen's single serif statement.
- **Headline** (400, 40px, 1.08): Interview questions and legal page titles.
- **Title** (500, 17px, 1.3): Institute names in the results table, serif.
- **Body** (400, 15px, 1.55): Long copy. Legal prose runs Commit Mono at 14px.
- **Data** (400, 13px, 1.4, tabular): Table cells, counts, ranks. Tabular numerals always on.
- **Label** (400, 11px, 0.08em uppercase): Field labels, buttons, nav, segmented controls.
- **Folio** (400, 11px, 0.04em uppercase): Departure Mono. Figure numbers, table folios, axis labels.

### Named Rules
**The One Serif Statement Rule.** Serif appears in display sizes, headlines, institute names and the rank input only. If a piece of text is operational, it is mono.

**The No Kicker Rule.** Never an eyebrow or running head above a heading. The heading carries its own weight.

## Layout

A 12-column page grid under a 64px top bar, max width 1400px, 20px gutters growing to 40px at 900px and up. The top bar carries the wordmark left, the step nav center, stats and account sign-in right. Screens below it are either a form-plus-aside split (profile: 7 columns form, 5 columns sticky specimen) or a full-width ruled table (results). The sticky results toolbar sits directly under the top bar at the same ground color, so pinned rows read as one continuous frame stratum. A footer colophon closes every screen with data provenance and legal links. The spacing scale is 4, 8, 12, 20, 40, 60, 80. Breakpoints: 900px (table collapses to stacked rows, splits go single column) and 480px (display steps down to 36px).

## Elevation & Depth

Flat by default. There are no box shadows anywhere in the system. Depth is carried by tonal layering: Deep Ink ground, Ledger Canvas insets, Slate Panel controls, with hairlines marking every seam. Modals sit on a scrim backdrop that dims rather than blurs. Focus rings are the only raised element: a 2px solid accent outline.

### Shadow Vocabulary
None. The system is shadowless.

## Shapes

Square corners everywhere: `--radius: 0`. Buttons, inputs, modals, chips, tables, the rail, all rectangles. The form language is ruled paper: 1px borders at rest, hairline dividers between rows, a 2px bottom rule under active nav and the top bar's bottom hairline. The only curves in the system are the plotted marker dots on the Rank Rail, which are 6px rotated squares, kept tiny.

## Components

### Buttons
- **Shape:** Square corners (0). Uppercase Commit Mono labels at 11px / 0.08em.
- **Quiet (default):** Transparent ground, hairline-strong border, parchment text. Padding 0 20px, min-height 40px.
- **Primary:** Tidal blue ground, deep ink text. The only filled button on a screen, ideally one.
- **Text:** No border, parchment-dim, sentence case, underline on hover with 4px offset. Min-height 32px.
- **Hover / Focus:** Quiet buttons wash to Slate Panel Raised; primary mixes toward parchment. Focus is a 2px solid accent outline.

### Chips
- **Style:** Transparent ground, hairline-strong border, 3px 8px padding, mono label plus tabular count. Used for catalogue counts and profile tags. Selected state is the Selection Wash.

### Containers
- **Corner:** Square.
- **Background:** Slate Panel for figures, Ledger Canvas for modals and detail rows.
- **Border:** 1px hairline-strong on modal cards, plain hairlines elsewhere.
- **Padding:** 20px internal.

### Inputs / Fields
- **Style:** Slate Panel ground, hairline border, parchment text in Commit Mono 14px. Min-height 44px.
- **Focus:** Border shifts to tidal blue. No glow, no ring on inputs.
- **Error:** Signal coral message text below the field, input aria-invalid.
- **Rank input:** The one expressive control. Source Serif 4 at 48px in a 64px field, tabular numerals, no spinner buttons.

### Navigation
- **Style:** Top bar 64px on Deep Ink, bottom hairline. Step items are mono labels with a 2px bottom rule that turns accent blue when active. Unavailable steps sit at 35% opacity. The wordmark is serif 21px with a mono "JoSAA index" sub-mark behind a hairline-strong divider.

### Rank Rail
- **Behavior:** The signature component. A log-scale rail from 1 to 300k. In specimen mode it plots the student's rank and their Advanced rank against the full axis. In row mode it is compact: the student's rank fixed at center, each closing rank ticked left (reach) or right (safe) with a state-colored marker and a text label. Markers are 2px sticks with 6px diamond heads.

## Do's and Don'ts

### Do:
- **Do** keep every screen dark. Deep Ink ground, no light variant, no toggle.
- **Do** resolve every color from `tokens.css`. No new hex values in screen CSS.
- **Do** use tabular numerals for every number that can change or be compared.
- **Do** let hairlines do the separating. Rows, sections, toolbars: 1px rules.
- **Do** keep serif for the one display statement per screen and institute names.
- **Do** label missing data as a plain dash, never "N/A".
- **Do** keep the accent blue rare: primary actions, active step, focus.

### Don't:
- **Don't** use border radius anywhere. The system is square.
- **Don't** add shadows, glows, or blurred backdrops.
- **Don't** put a kicker or eyebrow above a heading.
- **Don't** build card grids of equal tiles. The results screen is a ruled table.
- **Don't** use color alone to carry meaning. State ticks also carry text labels.
- **Don't** round inputs or buttons "just a little". 0 means 0.
