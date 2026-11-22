# Deebo's College UI plan: The Cutoff Ledger

Development plan for the full frontend replacement. This file is for agents and reviewers, not for the browser.

## Direction

The product is a printed annual almanac of JoSAA closing ranks, with a terminal's precision. The interface is a ledger that finds your line in it, not a catalogue of college cards.

Signature move: the Rank Rail. A horizontal log-scale rail marks the student's rank as the fixed center. Every recommendation places its closing rank to the left (reach) or right (safe) of that center, with a text label in addition to color. The same rail appears as a large specimen on the profile screen and as a short gauge inside every result row. With all content removed, the page still reads as a ruled page with a vertical stack of rails and ticks.

The reference is pi.dev's editorial and terminal language: deep ink navy, parchment text, hairline rules, square corners, serif display, mono labels and data, a 20px grid. It is an Operate surface, so the world lends only type, palette, density and the one signature move. Navigation and controls stay standard.

## Tokens

Colors:

- `--bg-deep: #0d1116`
- `--bg-canvas: #161d27`
- `--panel: #212730`
- `--panel-soft: #252f3d`
- `--line: #49505980`
- `--line-strong: #757d8975`
- `--text: #ebe7e4`
- `--copy: #ebe7e4d9`
- `--muted: #a8adb4` (use this, not the lower-opacity pi.dev muted, for small text)
- `--accent: #6a9fcc` (actions, focus, links)
- `--reach: #b86b52` (terracotta, reach tick and axis)
- `--target: #e1b06e` (sunkissed, target)
- `--safe: #a3a473` (sage, safe)
- `--neutral-data: #4b607c` (tidal blue, secondary data)
- `--danger: #e8704f`
- `--selection: #6a9fcc3d`

Type:

- Display and headings: Source Serif 4, self-hosted variable woff2.
- Body, labels and data: Commit Mono, self-hosted OTF.
- Folios and axis labels: Departure Mono, self-hosted woff2.
- Scale: display `64/1.02`, h2 `40/1.08`, h3 `28/1.15`, institute name `17/1.3`, body `15/1.55`, compact body `14/1.5`, mono label `11/1.2` uppercase with `0.08em` tracking, data `13/1.4` with `font-variant-numeric: tabular-nums`.
- No fluid clamp typography. Use fixed steps and breakpoint overrides.

Space:

- Base 20px. Steps: 4, 8, 12, 20, 40, 60, 80.
- More space above a heading than below it.
- Page gutter: 20px mobile, 40px desktop. Max content width 1400px.

Borders and surfaces:

- 1px hairline borders, radius 0 everywhere.
- Corner marks only on figures: the rank specimen and modal frames. Never on the results table or every panel.
- No gradients, no glass, no blurred decorative layers, no soft rounded cards, no hard offset shadows.
- The 20px grid is a subtle background on the profile screen only, not behind the results table.

Motion:

- 120 to 160ms, exponential ease-out.
- Rank Rail tick moves with a short transform transition.
- Result row detail expands with a grid-template-rows or max-height transition and fades its content.
- Loading uses a thin progress line, not a spinner in the middle of content.
- Respect `prefers-reduced-motion`.

Browser surfaces:

- Selection uses `--selection`.
- Caret and focus ring use `--accent`; focus ring is 2px with 2px offset.
- Scrollbars theme from the palette.
- Tabular numerals on all data.

## Shell

Top bar, 64px desktop, 56px mobile, full width, bottom hairline:

- Left: inline axis mark plus serif wordmark `Deebo's College`, with `JoSAA index` in small mono.
- Center or next: index nav `01 Profile`, `02 Interview`, `03 Index`. The current step is underlined with the active stripe, available future steps are muted but clickable, unavailable steps are disabled. No fake terminal prompt, no icons-only nav.
- Right: `Statistics` text button and `Sign in` or a compact user menu with avatar initial, name, and Sign out.
- On mobile, the index nav scrolls horizontally on its own row. No hamburger for three steps.

Footer: colophon line with data provenance, Privacy, Terms, and the product name.

Error banner: full-width hairline block under the top bar, `role="alert"`, dismissible. No `alert()` calls.

## Screens

### 1. ProfileScreen

Asymmetric 12-column grid.

Left 7 columns:

- No folio or kicker above the heading. The nav step already names the step. The heading stands alone.
- H1 serif: `Find where your rank lands.` Two lines maximum at 64px.
- Lede in mono or body: one short sentence about matching the profile against every indexed branch.
- Form:
  - Rank as the largest control: label `All India Rank (CRL)`, input with 48px serif tabular numerals, hint `Use your JoSAA CRL`.
  - 3-up row: Category select, Gender segmented control (Male / Female), Home state select.
  - Advanced rank: a standard checkbox `I also have a JEE Advanced rank`, reveals the input when checked.
  - Preferences textarea, 3 rows, placeholder with examples.
  - Primary button `Build my index` with an arrow. Secondary text: `No account required.`
  - Inline validation, not alerts.
- Below the fold: a ruled 3-row method list, not cards:
  - `01 Eligibility` filters every branch by rank, category and home-state quota.
  - `02 Fit` ranks the survivors by cutoff distance, placement, campus and your preferences.
  - `03 Choice list` writes a CSV you can take to JoSAA.
- A provenance line: `Data: JoSAA 2024 Round 5 + 2025 · 79 institutes · 569 branches`.

Right 5 columns, sticky on desktop:

- Specimen figure with corner marks.
- Rank Rail: log scale 1 to 300,000 with ticks at 1, 100, 1k, 10k, 100k, a terracotta marker for CRL, and a tidal marker for Advanced rank when present.
- Caption `FIG. 01 / Rank position on a logarithmic scale.`
- Real counts fetched from `/colleges`, `/branches` and `/statistics` when available. Show `—` when unavailable, never invented numbers.
- A short `What the rail means` legend: left of center = reach, center = your rank, right = safe.

Brings back `userInputs` as initial values when the user returns to edit.

### 2. InterviewScreen

Left 8 columns:

- Top line: `Question 03 / 10` and a thin progress line. This is progress metadata, not an eyebrow over a heading.
- Question in serif 32px.
- Two answer rows, A and B:
  - A: yes title in serif 18, yes description in mono 13.
  - B: no title, no description.
  - Each row is a radio with a visible letter, ruled border, hover and focus states.
  - Keyboard A and B select, arrow keys move, Enter advances.
- `Skip this question` text button, `Previous` and `Skip all` in the footer.
- Auto-advance 160ms after selection. On the last question, show a summary step.

Right 4 columns:

- Sticky `Profile as understood` ledger. List field label, value `Yes`, `No` or `—`. It fills as answers land.
- Prefilled `true` values from free-text extraction show as `Yes`.

Summary step:

- Ruled table of question and answer, `Run the match` primary, `Tweak answers` secondary.
- `Skip all` still available.

### 3. ResultsScreen

Top profile strip:

- `Rank 5,000 · OPEN · Delhi · Advanced` in mono, with profile tags as small chips.
- `Amend` button opens an inline textarea with the current preferences and an `Apply and re-rank` button. Calls `onRefinePreferences`.

AI marginalia:

- The top 3 explanations as a 3-column ruled strip, each with a folio reference like `03 / IIT Tirupati · CSE`.
- Clicking a note scrolls to and expands that row.
- If there are no explanations, omit the strip.

Sticky toolbar:

- Search input.
- Probability segmented control: `All`, `Safe`, `Target`, `Reach` with counts. Text label always visible, color is additional.
- College type select: All, IIT, NIT, IIIT.
- Branch group toggles: CS, ECE, Mech, Civil+. Standard checkboxes with visible labels.
- College select, all unique colleges.
- Sort select: Cutoff, NIRF, Match.
- `Export CSV` button, with loading and error states.
- Count line: `11 of 250 entries`.
- `Clear filters` text button.

Table, not cards:

- Columns: folio, institute and branch, closing rank, Rank Rail, placement, CTC, NIRF, match, expand.
- Row height about 64px. Institute in serif 17, branch in mono 12 under it.
- Probability text label `Safe`, `Target`, `Reach`. Never color only.
- Missing values show `—`, not `N/A`.
- Click or keyboard activate a row to expand one detail panel across the table:
  - 2024 and 2025 closing ranks.
  - Average CTC, median CTC, placement percentage.
  - NIRF, category, exam.
  - Student clubs, sports, incubation centre, notable startups.
  - AI explanation when present.
  - Similarity score.
- Show the first 40 rows, then a `Load 40 more` button. Export always uses the full filtered set.
- Empty state teaches the filters: `Nothing in the index matches these filters.` plus `Clear filters`.

Mobile:

- The table becomes stacked entries with institute, branch, closing rank and rail visible. Secondary data lives in the expanded panel.
- The toolbar stacks, and branch toggles wrap.

Preserve the current filter logic where possible: search across college and branch, type detection, probability ratio using Advanced rank for IITs, branch group matching, NIRF and cutoff sorting. Drop the magic auto-selection of branches and college, keep only the initial college-type hint from preferences.

### 4. StatsModal

- Shared Modal primitive, 900px max, corner marks, `FIG. 03 / Search statistics`.
- KPI row: total searches, unique users, signed in, guest.
- Distribution bars for category and exam type, with label and count/percentage.
- Top 5 home states, top 5 colleges by average CTC, top 5 branches by CTC.
- Loading uses skeleton lines. Error shows Retry.
- Table numerals tabular. No color-only bars.

### 5. AuthModal

- Shared Modal primitive, 440px.
- `Demo access, email only.` No password field, no fake OAuth.
- Name optional, email required, inline error.
- Primary `Create session`, guest link `Continue as guest`.
- Note: `This is a course-project demo. Any email creates a local session.`

### 6. LegalPage

- Keep the existing Privacy Policy and Terms copy.
- Prose column 65ch, serif body, mono section numbers.
- Back link returns to the previous view.
- Back link to the previous view. No running head above the title.

## Files and ownership

Foundation, one agent, must finish first:

- `frontend/src/api.js`: fetch wrapper, category mapping, endpoints.
- `frontend/src/styles/tokens.css`
- `frontend/src/styles/base.css`
- `frontend/src/styles/ui.css`
- `frontend/src/styles/shell.css`
- `frontend/src/index.css`: imports the four style files.
- `frontend/src/components/BrandMark.jsx`
- `frontend/src/components/ui/Modal.jsx`
- `frontend/src/components/ui/Field.jsx`
- `frontend/src/components/ui/RankRail.jsx`
- `frontend/src/App.jsx`
- Temporary minimal stubs for the four screen files so the build stays green.

Parallel screen agents, after foundation, each owns only its files:

- Agent A: `frontend/src/components/ProfileScreen.jsx`, `frontend/src/components/profile.css`
- Agent B: `frontend/src/components/InterviewScreen.jsx`, `frontend/src/components/interview.css`
- Agent C: `frontend/src/components/ResultsScreen.jsx`, `frontend/src/components/results.css`
- Agent D: `frontend/src/components/StatsModal.jsx`, `frontend/src/components/AuthModal.jsx`, `frontend/src/components/LegalPage.jsx`, and their three CSS files.

No screen agent edits `App.jsx`, `index.css`, `api.js`, `ui/*`, `styles/*`, `package.json`, or another agent's files. If a shared primitive is missing, use a local class in the feature CSS and report it.

Delete after integration:

- `PredictorForm.jsx`
- `QuestionnaireWizard.jsx`
- `RecommendationsList.jsx`
- `StatsDashboardModal.jsx`
- `src/assets/logo.png`
- `src/assets/IIT_image.jpg`

Keep:

- `main.jsx`
- `index.html`
- `package.json`, lockfile
- `public/favicon.ico`
- `public/fonts/*`

## Shared contracts

`App.jsx` owns:

- `view`: `form | questionnaire | results | privacy | terms`
- `userInputs`, `results`, `questions`, `initialProfile`, `user`, `token`
- `loading`, `error`, `showStats`, `showAuth`
- `handlePredict(inputs)`, `handleQuestionnaireSubmit(profile)`, `handleRefinePreferences(text)`, `handleEdit()`, `handleAuthSuccess(data)`, `handleSignOut()`, `openStats()`, `openAuth()`, `closeStats()`, `closeAuth()`, `navigate(step)`, `showLegal(type)`

Props:

- `ProfileScreen`: `initialValues`, `onSubmit`, `loading`, `catalogue` (optional counts), `onOpenStats`
- `InterviewScreen`: `questions`, `initialProfile`, `onSubmit`, `onCancel`, `onSkipAll`
- `ResultsScreen`: `results`, `userInputs`, `token`, `onEdit`, `onRefinePreferences`
- `StatsModal`: `isOpen`, `onClose`, `token`
- `AuthModal`: `isOpen`, `onClose`, `onSuccess`
- `LegalPage`: `type`, `onBack`

`api.js`:

- `getBackendCategory(category, gender)`
- `generateQuestions({query, homestate}, token)`
- `recommend(payload, token)`
- `exportChoices(payload, token)` returns a Blob
- `login({name, email})`
- `statistics(token)`
- `colleges()`, `branches()`
- All throw an `ApiError` with `status` and `message`. On 401, App signs out and shows a session error.

## Rules for agents

- Read this plan, `PRODUCT.md`, `frontend/src/App.jsx`, the shared UI primitives and the relevant existing component before editing.
- Use only the tokens. No new hex values in feature CSS except derived `color-mix` from tokens.
- No em dashes in user-facing copy. No emoji. No `alert()`. No `console.log`.
- Standard controls: real `<button>`, `<select>`, `<input>`, `<textarea>`, `<table>`. No fake terminal inputs, no custom dropdowns.
- Every interactive element has hover, focus-visible, active and disabled states.
- Every data value uses tabular numerals.
- Missing data shows `—`, not `N/A`.
- No nested cards, no rounded corners, no gradients, no glass, no icon tiles.
- Keep copy short and specific. Do not invent claims.
- Run `npm run lint` and `npm run build` from `frontend/` before reporting. Fix errors in your own files. Report warnings you did not cause.
- Report exactly which files you created or changed and any behavior you dropped.

## Verification

- `cd frontend && npm run lint && npm run build`
- Start backend on 8010 with the local SQLite and Qdrant state, start Vite, and capture desktop and mobile screenshots with `.pi/skills/impeccable/scripts/impeccable first-viewport`.
- Drive the form, questionnaire and results once with a real rank.
- Check 360px, 768px and 1440px. Check empty filters, loading, error, long college names, missing data, keyboard focus and reduced motion.
