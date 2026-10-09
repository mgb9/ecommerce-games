# Data Detective — build handover

A root-cause diagnosis game for WM956-15, built to [PLAN-data-detective.md](PLAN-data-detective.md).
**Nine cases are built** (2026-10-08): eight generated cases (`src/engine/cases.js`) and Case 9, real 2015
GA exports. The sections below are in build order — later sections supersede earlier ones where they differ;
the latest state is in "Inbox, case file and order value" near the end.

## Run it
```bash
npm install
npm run dev      # http://localhost:5176
npm test         # 264 tests
npm run build
```
(From the repo root the dev server is wired in `.claude/launch.json` as `data-detective`.) A plain link opens
the case inbox; `?case=N` opens case N's ticket directly.

## GA-depth rebuild (phase A — done)
After feedback that "you just click a few things and you find it," the workspace was rebuilt to feel like a
real, navigable GA4 property and — crucially — to make the investigation genuinely hard:
- **GA-style left-nav with grouped reports.** `REPORTS` in the engine groups dimensions under Acquisition /
  Engagement / Monetisation / Demographics / Tech. The flat 6-tab strip is gone; there are now 8 reports in
  a sticky sidebar plus a Home overview. Two new dimensions (`campaign`, `userType`) add haystack.
- **Secondary-dimension pivot (the big difficulty lever).** The giveaway pre-baked "Device × Browser"
  report is GONE. `buildCrossTab(caseData, dimA, dimB)` computes ANY cross-tab on demand when the analyst
  adds a secondary dimension to a report (a `<select>` on every report panel). So case 2 now requires the
  real analyst move: notice Safari is soft on the Browser report, *hypothesise* a device interaction, and
  add Device as a secondary dimension yourself — there's no button screaming "click me". The header tracks
  REPORTS opened and PIVOTS built; the reveal reports both.
- **`buildCrossTab` is exact and general** — derived expected-value algebra (see the long comment in
  `engine.js`), reconciles to the topline every day for BOTH incident types, is commutative, and on a
  single-dimension incident (case 1) just spreads the effect evenly (so the wrong pivot is a real dead end).
  17 of the 49 tests cover it and the cross-tab/compound-scoring paths.
- **Compound diagnosis + scoring.** The diagnose form has an optional "Is it a combination of segments?"
  section (secondary dimension + its segment). `scoreDiagnosis` compares unordered {dim:segment} pairs, so
  the answer is commutative and naming only one half of a compound cause is correctly marked wrong.
- Verified live: the GA left-nav renders with all 8 reports; opening Browser then pivoting on Device builds
  the cross-tab showing Mobile/Safari at −92pp against a flat −2pp field; the compound diagnose form scores
  4/4; case 1's payment report still shows PayPal −66pp directly with no pivot needed (stays Standard).

## Layout
- `src/engine/engine.js` — **pure, dependency-free, seeded.** The defining property: every session has
  independent attributes across all six dimensions (device/browser/country/source/payment/page), so a
  segment's rate is the topline rate scaled by how far that segment's own multiplier sits from its
  dimension's weighted average — `rate = topline(t) · mult(segment,t) / W_D(t)`. Consequence: the dimension
  containing the incident shows ONE segment moving on its own; every other dimension shows every segment
  riding the topline in lockstep (no differential signal). That's what makes the diagnosis a real skill
  rather than a lucky click, and it's directly asserted in tests.
- `src/engine/engine.test.js` — 41 tests: finiteness, determinism, the **exact reconciliation invariant**
  (segment purchases/sessions sum to topline, every dimension, every day — proven for compound dimensions
  too), the **isolated-vs-proportional** sanity test, the red herring being genuinely debunkable from the
  data (not just a popup label), `summariseSegments`/`summariseTopline`, the three incident shapes
  (cliff/gradual/spike-revert), `scoreDiagnosis`, and a full case-2-specific section proving the compound
  mechanic (see below).
- **UI layout (refactored 2026-10)** — `src/ui/App.jsx` is now just the root (case selection, instructor
  config, plain-language provider); each case component owns its session state and is remounted (`key`)
  to start afresh. `theme.js` = tokens + style helpers, `shared.jsx` = components common to both case
  types (header band, side nav, sortable-table hook, pick groups, reveal atoms), `generated/` = cases 1–4
  (one file per phase/report view), `field/` = case 5. `screens.smoke.test.jsx` renders every screen.
  The description below predates the split but still describes the behaviour.
- `src/ui/App.jsx` — phases ticket → investigate → diagnose → reveal, now parameterised over `caseIndex`
  (the intro screen's case picker) rather than hardcoded to one case. Every place that used to iterate the
  static `DIMENSIONS` list (the dimension picker, investigation log, diagnose form, reveal labels) now
  iterates `caseData.breakdowns` instead, so a case-specific extra breakdown (the compound dimension) shows
  up automatically without special-casing. The investigation workspace is styled as a GA4-like analytics
  dashboard: a 4-card KPI overview (Sessions/Conversion rate/Purchases/Revenue, each with an inline
  sparkline and a "vs Wk1" delta badge), a topline chart with a dashed Wk1-baseline reference line and its
  own delta badge, a dimension picker that swaps in a multi-line breakdown chart (skipped in favour of the
  table alone when a breakdown has more than 6 segments — the compound dimension has 12) plus a sortable
  GA-style data table (Segment/Share-with-proportion-bar/Wk1/Now/Δ/Purchases/Revenue, click any header to
  sort), an investigation log, a structured diagnosis form (dimension/segment/cause/date), then a reveal
  scoring all four fields against the truth and tagging each timeline event REAL CAUSE / RED HERRING.
- The KPI cards are a deliberate diagnostic aid, not just decoration: Sessions stays near-flat (≈−1%) while
  Conversion/Purchases/Revenue all drop ≈24-25%, so the glance-level read already points away from "traffic
  problem" and toward "conversion problem" before any drill-down — mirrors how a real GA4 landing page would
  read for this exact incident.

## Case 1: "Checkout's broken — revenue's down"
PayPal gateway migration on day 18 craters PayPal's conversion rate ~65% while every other payment method
stays flat. A same-day "marketing campaign" is a genuine red herring — it visibly bumps email-sourced
sessions (check the topline's Sessions toggle), but checking Traffic source shows every segment dropping by
the *same* amount, which is what debunks it (not a separate "did the bumped segment also convert worse"
check — the proportional-everywhere pattern itself is the tell). A third event two days earlier ("database
maintenance") is a pure decoy with no data effect at all.

## Difficulty tuning — built for MSc-level rigour, not a giveaway
The first pass at this case was too easy in a way no amount of noise-slider tuning would fix: the event
labels literally said **"PayPal gateway migrated to v3 API"** and **"Spring Sale email blast sent"** — a
student could read the ticket-time timeline and answer dimension/segment/cause without ever opening the
dashboard. Fixed with four changes, all covered by tests:
- **Event labels are now oblique** ("Backend infrastructure patch deployed to production", "Spring
  marketing campaign launched", "Database maintenance window completed") — plausible changelog entries that
  don't name the dimension, segment, or cause type. `engine.test.js`'s "ticket-time event labels don't name
  the true dimension/segment" test guards this for any future case too.
- **The incident is real but no longer a near-total wipeout**: `factor` went from 0.12 (an ~88% in-segment
  collapse, ~24% topline effect) to 0.35 (~65% in-segment, ~15-20% topline effect). Still unambiguous once
  correctly segmented (PayPal: 4.0%→1.4%, every other method ≈ unchanged) but no longer a screaming cliff
  visible from the topline alone.
- **`summariseSegments` no longer pre-ranks by anomaly size.** It used to sort by `|pctChange|` descending,
  so the answer was always row 1 the instant you picked the right dimension. It now defaults to share
  (volume) order — like a real analytics table — so ranking by impact requires actively clicking the table's
  Δ column, not a freebie.
- **Default noise raised** from 1.0× to 1.4× (`App.jsx`'s initial `cfg.noise`) — noisier day-to-day data so
  single-day eyeballing is less reliable than the week-1-vs-week-4 table comparison. The instructor panel's
  0.2×-2× range is unchanged, so a cohort can still be dialled easier or harder from this new default.

## Case 2: "Conversion's drifting down — nobody can pin it on anything" (Advanced)
The genuinely hard case. The true cause is a **compound/interaction segment** — Mobile Safari
specifically, not Mobile or Safari alone — from a checkout layout bug that only breaks in Mobile Safari's
WebKit rendering. Device and browser stay independently sampled (no new correlation was introduced, which
would have changed every other dimension's behaviour too); instead a new incident type, `"rate-joint"`,
targets the INTERSECTION of two segments directly. The maths (derived and verified against the engine's
exact-reconciliation invariant in tests):

```
topline(t)        = baseline(t) · [Wa(t)·Wb(t) + pJoint·(jf(t)-1)] · Π(other 4 dims)
rate(segA, dimA)   = topline(t) · multA · [Wb(t) + shareB·multB·(jf(t)-1)] / jointDenom(t)
rate(d≠segA, dimA) = topline(t) · mult_d · Wb(t) / jointDenom(t)        (symmetric for dimB)
```

Consequence, confirmed both in tests and live in the browser:
- **Device alone**: Mobile shows a real but partial dip (≈−23%) — diluted by all the unaffected
  Mobile+Chrome traffic. Desktop/Tablet stay essentially flat (NOT tracking the topline — conditioning on
  device≠mobile makes the joint effect deterministically zero, mathematically distinct from how an
  uninvolved dimension behaves).
- **Browser alone**: Safari shows a similar partial dip (≈−33%) — diluted by unaffected Desktop+Safari
  traffic. Chrome/Firefox/Edge stay flat.
- **Neither single report is conclusive** — both look "a bit off" but well short of explaining an
  incident.
- **Device × Browser** (a new compound breakdown, generated only for cases with a `rate-joint` incident):
  Mobile + Safari collapses ≈−92% while all 11 other cells sit at a uniform ≈−2pp (noise level). This is
  the one report that isolates the true, undiluted cause.
- **Country/Source/Payment/Page** (uninvolved dimensions): every segment moves uniformly with the topline
  (≈−8% to −10%) — the same "wrong dimension" dead-end signature as case 1.
- The topline itself is deliberately subtle (≈−8 to −10% conversion/revenue, vs case 1's ≈−17%) — a joint
  segment is structurally a smaller slice of traffic than a single-dimension segment (it's the PRODUCT of
  two shares), so even a near-total in-cell collapse can only move the topline so far. This is a real
  mathematical ceiling, not a tuning choice, and it matches the ticket's "nothing looks dramatically
  broken" framing.
- A real, debunkable red herring: a competitor's price-match guarantee genuinely pulls paid-search
  sessions down ~30% for a few days, but conversion on the sessions that stay is unaffected — a volume
  story, not a quality one, and it doesn't overlap with the real incident's date anyway.

## Verified in-browser
**Case 1:** KPI cards read Sessions ≈−1% vs Conversion/Purchases/Revenue ≈−24/−25%; Device (wrong dimension)
shows all three segments dropping together; Payment method (right dimension) isolates PayPal at −88pp vs
≈−1pp for others, Share column's proportion bar reading 25%; Traffic source shows all five segments moving
by the same −24pp (the red-herring debunk); table sorting by Revenue correctly re-sorts descending; the
diagnose → reveal loop scores 4/4 and 0/4 correctly in both directions; the instructor panel's 🎲 + Apply
correctly regenerates.

**Case 2:** the case-select pills switch cases correctly; the 7th "Device × Browser" breakdown appears only
for this case; Device shows Mobile −24pp diluted, Browser shows Safari −34pp diluted, the cross-tab table
shows Mobile + Safari at −92pp against a flat field of −2pp everywhere else (with the "12 cells — too many
to chart cleanly" message correctly suppressing the spaghetti line chart in favour of the table); the
diagnose form's segment list correctly populates all 12 cross-tab options when "Device × Browser" is
chosen; submitting the correct compound answer scores 4/4 with the reveal correctly explaining the
dilution/cross-tab reasoning and tagging both red herrings.

## Caught during build
- `PickGroup` expects `{id, name}` options; `CAUSE_TYPES` uses `{id, label}`. The dimension/segment pick
  lists were mapped correctly but the cause-type list wasn't, so the cause pills rendered blank. Fixed by
  mapping `label → name` at the call site (consistent with how dimensions are already mapped) rather than
  changing the shared component.
- The first red-herring test asserted email's conversion rate stays *flat* across the shift window — wrong,
  because the shift window (days 18–20) overlaps the real incident's start, so email's raw rate also dips
  from the sitewide PayPal effect. Fixed the test to assert email moves *in line with the topline* (no
  extra effect from its own session bump), which is the actually-intended property.

## "More data, more detailed" pass (done)
A follow-up to make the property feel like a real, data-dense GA4 install:
- **Engagement-metric layer.** Every topline day and every segment row now also carries `engagementRate`,
  `engagedSessions`, `avgEngagementTime`, `events` (and topline `newUsers`) — computed with the same
  topline-reconciling formula as conversion (a `<test>` checks the sessions-weighted segment average equals
  the topline). They are deliberately **independent of the incident** (decoys): a test asserts PayPal's
  engagement stays flat on the very days its conversion collapses. So the Home overview now has **8 KPI
  cards** (Sessions / New users / Engaged sessions / Engagement rate / Avg engagement / Events / Conversions
  / Revenue) and every report table has grouped columns (USERS / ENGAGEMENT / CONV. RATE / CONVERSIONS) —
  more to read, and more bait. The table header even tells you only Conv. rate is incident-driven.
- **Three more dimensions** — Region, Age, Gender (Demographics group) → **11 reports** total, more haystack.
- **Realtime report** — a GA-style "Users in the last 30 minutes" view (big number + per-minute bar chart +
  Top countries / Top landing pages right now), `realtimeSnapshot()` in the engine, deterministic per seed.
  Pure atmosphere with a teaching note (realtime can't catch a slow multi-week drift).
- `buildCrossTab` carries the engagement metrics into cross-tab cells too, so pivots show the full column set.
- Verified live on case 1: 8 KPI cards render with engagement reading ≈−1/2/3% while Conversions/Revenue
  read −20% (the decoy contrast is visible at a glance); the Region report shows the grouped wide table;
  Realtime renders. 55 tests pass; engine reconciliation invariants still hold.

## Phase B — funnel + date range (done)
The remaining two of the four depth features, now built:
- **Multi-stage funnel.** `buildFunnel(caseData, filters, curWindow, cmpWindow)` decomposes the overall
  conversion rate into 4 step-rates (sessions→view→add-to-cart→checkout→purchase) whose product equals the
  overall (a test checks this every day). Each incident carries a `stage` (PayPal → `purchase`, Mobile
  Safari → `atc`). When — and ONLY when — you've filtered to the incident's exact target segment/cell, the
  drop is attributed to that one step (others stay flat) so the funnel tells you WHICH step broke → points
  at the cause. At whole-site level, or on a partial filter, the dip smears evenly and pins nothing (tested:
  whole-site spread < 0.05; partial joint-match returns `attributedStage: null`). The UI is a "Funnel
  exploration" report with up to two segment filters; verified live that Mobile×Safari isolates Add-to-cart
  at −92pp while the other three steps read −0pp.
- **Date-range / comparison control.** A `DateRangeBar` (presets: Last 7/14/21 days × compare to First week
  or Preceding period; `precedingPeriod()` in the engine) drives a `curWindow`/`cmpWindow` threaded through
  every KPI card, report table and the funnel. The Home overview keeps the full 4-week trend always visible
  with the comparison (grey) and current (amber) windows shaded as `ReferenceArea`s — chosen over a Brush
  that zoomed the chart and hid the incident's context. **Subtlety fixed:** count-metric % change is per-day
  normalised, so comparing a 21-day window to a 7-day baseline doesn't read as a fake +200% from summing 3×
  the days (the headline number stays the window total; only the delta normalises). Tested.

## Student release pass (2026-10)
- **Narrative = data.** Every magnitude a ticket or reveal quotes is pinned across eight seeds in
  `engine.test.js` ("case narratives match the generated data"). Fixed claims that were wrong: case 1
  PayPal fell ~65% (not "almost zero"); case 2 Mobile alone ≈ −20%, Safari alone ≈ −33% (not "a little
  worse"); case 4 mobile/tablet RISE ~12% under the masking mix shift while desktop is ≈ −20%. Case 5
  self-referrals are 1,923 transactions (1,999 included the 76 sandbox fakes). If you retune the engine,
  those tests tell you which sentence to rewrite.
- **Debrief.** Each case's `truth.lesson` is shown as "The principle"; `reviewTrail()` (engine) says whether
  the student opened the view where the signal lives (the dimension's report, or the cross-tab for a
  compound cause), its position in their trail, dead ends, and whether the funnel would have named the step.
- **Case report download** (`src/ui/caseReport.js`): Markdown with calls vs truth, the trail in order, the
  explanation, the principle and seminar reflection prompts (plan §8's assessable artifact). Case 5's lists
  the flagged rows and the clue chain.
- **Progress** (`src/ui/progress.js`): best score per case in `localStorage["dd-progress"]`, shown on the
  case pills; finishing any case sets the hub's `wmg-games-progress.dd` flag.
- **Cohort links** (`src/ui/urlConfig.js`): `?case=1–5&seed=…&noise=0.2–2`; the instructor panel copies one.
- **Accessibility / small screens:** below 860px the report nav becomes a native `<select>` with optgroups
  and two-column screens stack (`useNarrow()` in shared.jsx); checked at 320px. The game header no longer
  sticks (the shell bar does); the report nav sticks below it via `--dd-shell-h`, published by App from the
  shell's bar height. Phase changes scroll to top and focus the screen heading. Card titles are `<h3>`;
  pickers/pills expose `aria-pressed`; charts are `role="img"` with text summaries; tables have row headers;
  the instructor panel is a modal dialog. Small red text/buttons use `T.playerText`/`T.playerBtn` (#D6261B)
  — #EE3124 is only 4.1:1 on white. Contrast + axe clean on every screen at 1280px and 375px.

## Rigour pass (2026-10-08) — supersedes parts of the release pass above
- **Case content lives in `src/engine/cases.js`**; engine.js is mechanics only. Each case has ≥2 **variants**
  (different segment, day, ticket and explanation); the seed picks one (`pickVariant`), so a cohort can't pass
  the answer round but a shared seed still gives a class the same variant. `variantFor(id, seed, attempt)`
  moves each retry on to the next variant, with a derived seed (`DD-2026·2`).
- **Segment sampling noise.** Segments used to move in exact lockstep with the topline, so sorting by Δ gave the
  answer away. Each segment's sessions, purchases and engagement now wobble like a sample of its size
  (`SEG_RATE_NOISE`, scaled by the noise level) and are rescaled so every dimension still sums exactly to the
  topline. Cross-tab cells get the same noise and are raked (IPF) to BOTH marginal reports, built in a
  canonical orientation so A × B ≡ B × A. `noise: 0` reproduces the old exact model — the mechanics tests use
  it (`exact()` in engine.test.js); the narrative tests use 1.4 with noise on.
- **Three new cases** (5 stockout slow bleed — `gradual` shape, ±3-day date window; 6 tracking false alarm —
  incident `type: "tracking"` hits analytics only, while the topline's `orders` (back office, ~96% coverage)
  doesn't move; 7 normal week — no incident, a `calendarEvents` dip, truth `dimension: null`). Every cause type
  is now the answer somewhere (tested). The diagnosis form has "None — nothing is broken". The field case is
  now **Case 8** (metadata in `fieldcase-meta.js`).
- **Back-office orders** report (`orders` in the nav, every case): orders vs analytics conversions + coverage.
- **First attempt only** is scored and shown (`recordFirstAttempt`); students state **confidence** (50/70/90)
  before submitting; the reveal gives a calibration verdict and the intro a running calibration summary.
- **Refresh-proof**: App + case state mirror to `sessionStorage` (`src/ui/session.js`), keyed by run.
- **Instructor panel** only with `?instructor` in the link (remembered; `?instructor=off` forgets).
- **Single Simpler English control**: inside the WMG shell the game follows the shell's switch
  (`wmg-simpler` + `wmg:simplerchange`) and hides its own; the old bridge script in index.html is gone.
- **Report chart** lines have dash patterns + a legend. **Code-split**: the dashboard (charts) and Case 8 load on
  demand; first load ~76 KB gzipped (was ~188 KB).
- **Case 8 provenance**: `plaSummary` in fieldcase-data.js (from the full landing-pages export; regenerate with
  `GA_DIR=… python3 scripts/gen_fieldcase.py`), pinned by fieldcase-provenance.test.js and tied to the clue
  text by fieldcase.test.js.
- **Screen-reader test**: `SCREEN-READER-TEST.md` (VoiceOver, ~1 hour) — not yet run.
- **Case report = a printable page, saved as PDF** (replaces the Markdown download). `report/generatedReport.js`
  and `field/fieldReport.js` build a plain data model (score, principle, calls, coaching derived from the trail,
  trail, story, reflection, glossary words from each case's `words`); `report/ReportView.jsx` renders it. Students
  can type their name (localStorage) and reflection answers (session) first. "Save as PDF" is the browser's
  print → Save as PDF: print CSS in theme.js shows only the report (answers print as text, blanks as ruled
  lines), the shell hides its bar in print, and the page title becomes the PDF's file name. Chrome's output is
  a tagged PDF (H1–H3, tables, lists, en-GB) — checked with headless Chrome `--print-to-pdf`.

## Inbox, case file and order value (2026-10-08)
- **Case inbox** (`src/ui/Inbox.jsx`) is the landing screen: every case as a ticket (number, level, channel,
  the subject of the variant this student would get), its status as text (Not played / Next up / In progress /
  "First attempt 3/4"), and a real button per case. `?case=N` still opens a case directly. App state is now
  `{v: 2, view: "inbox"|"case"|"casefile", caseIndex, cfg, run, attempts, nav}`; `nav` counts screen changes so
  focus moves to each new screen's h1 (not on first load); session records without `v: 2` are ignored. Going
  back to the inbox keeps the case as it was ("Return to case 03" / "Back to your results"). **A case this
  browser has already played reopens on the next variant** (`nextAttempt` in `src/ui/caseList.js`), even in a
  new tab — so an instructor re-running a played case sees "fresh variant (attempt 2)". The intro's case pills
  and calibration note are gone.
- **Case file** (`src/ui/CaseFile.jsx`, linked from the inbox once a case is finished): cases played, fully
  right first time, calls right; a case-by-case table (first attempt, stated confidence, a short calibration
  verdict — `calibrationShort` in labels.js); calibration per confidence level (bar vs a tick at the claimed
  %, plus mean stated confidence vs hit rate, always with a small-sample caveat); and the principle of each
  case PLAYED (unplayed ones would give answers away). It prints through the same `dd-report` print CSS as the
  case report — `ReportArticle` / `PrintBar` / `useDocumentTitle` were extracted from ReportView for this.
  It reads `dd-progress` only; the record shape is unchanged.
- **Per-segment order value.** Every segment has an `aov` multiplier (wide spread only on country, region,
  age, gender — dimensions no case shifts; ≈1.0 elsewhere; card/PayPal/Apple Pay exactly 1.0 to keep case 1's
  revenue pins). Topline AOV comes from the expected-value model in `dayWeights` (purchase-weighted aov per
  dimension, exact joint correction for rate-joint incidents), calibrated to £42 on a clean day, with small
  daily noise. Segment and cross-tab revenue are sampled (`AOV_SPREAD`, √orders) then rescaled / raked so
  revenue reconciles exactly like purchases (tested for every variant and both cross-tab marginals).
  **Order values use their own RNG streams** (`:aov`, `:xa:`): sessions, conversion, purchases and
  engagement of cases 1–7 are byte-identical to before (checked by hashing every variant); only revenue moved.
  Back-office revenue uses the true (no tracking fault) AOV.
- **New Case 8 "Orders up, revenue down"** (`type: "aov"` incident: `factor` scales the segment's AOV,
  `rateFactor` its conversion; never pinned to a funnel step). v0: a staff code leaks to a German deal site
  (Germany AOV −55%, conversion +30–55%, visits +20–25%). v1: loyalty free-delivery threshold cut (returning AOV
  ≈ −30%, conversion +10–20%). Both: orders up, revenue down, topline AOV about −1/6. New cause type
  `pricing_promo`; `truth.lens: "aov"`. **The field case is now Case 9** (`fieldcase-meta.js`, which now also
  holds its title and principle, so the inbox/case file don't load its data).
- **Report lenses**: each report can be viewed by Conversion rate / Sessions / Revenue / Avg order value
  (`LENS_DEFS` in ReportPanel.jsx). The chart and the table's Was / Now / Δ follow the lens (stable column keys,
  so a sort survives); counts are per day. The lens is case state and carries across reports; `lenses`
  ("report:metric") is logged like `viewed`/`pivots`, and `reviewTrail(…, lenses)` coaches the AOV case.
  Home: the Events KPI card is now Avg order value; the topline toggle has AOV too.
- **Small multiples** (`SmallMultiples.jsx`) replace the "too many rows to chart" note for reports over 6 rows
  (cross-tabs up to 30 cells): inline SVG, one shared scale from 0 whose top is set by the bulk of the data
  (spikes are clipped and the panel says "off scale"), comparison/current windows shaded, hover read-out. One
  `role="img"` description; the table carries the numbers. Two columns at 320 px.
- **Units fix.** Δ columns (report table, funnel) showed a *relative* change labelled "pp". They now show the
  relative change (−66%) and, for rates, the absolute pp difference beside it. Figures quoted as "pp" in the
  older sections above were relative changes — read them as %.
- **Narrative fixes the new lenses would have exposed:** case 3 v1 no longer claims "traffic is up" (session
  shifts are zero-sum shares, so the topline doesn't rise); case 4's tickets no longer claim revenue is softer
  than the conversion dip (true on only some seeds).
- Checked in the browser: inbox → Case 8 → AOV lens → Region × Age small multiples → diagnosis → reveal (lens
  line) → inbox status → case file, at 1280 px and 320 px (no horizontal scroll); axe-core WCAG 2.2 AA clean on
  the inbox, case file, case intro and the cross-tab dashboard. VoiceOver script updated (22 steps), not yet run.

## Learning outcomes and skills development (2026-10-08)
Prompted by the module's PTES result for **Skills Development (87.9%, below the department)**. PTES asks whether
the course built confidence in independent learning, creativity, research skills, communicating to diverse
audiences, thinking about the skills needed for a career, and preparation for a career (Section G of the PTES
2020 questionnaire). Students rate skills they *recognise* developing, so the game now names them, shows
the evidence, and gives students words they can use.
- **The module's own terms** (`src/engine/outcomes.js`): the four learning outcomes verbatim from the 2026/27
  specification, the specification's transferable and subject-specific skills, and the catalogue link
  (courses.warwick.ac.uk/modules/2026/WM956-15). `LOS` in shared.jsx now uses this wording (it paraphrased).
- **Each case's mapping** (`outcomes` in cases.js and fieldcase-meta.js): LO3 always; "partly LO1" for cases
  01, 02, 06, 09 (the fault sits in a technology); LO2 and LO4 never claimed (the coverage matrix's honest
  reading — LO4 is the group Website Build). Plus a syllabus topic, three case-specific skills with what
  practising them looked like, and a CV evidence line. Communication and self-assessment are practised in
  every case. Tested.
- **Where it shows:** the case intro ("What this case develops" — outcomes as visible text, not tooltips);
  inbox rows (LO tags) and an inbox panel of what the cases do and don't develop; the reveal ("Skills you
  practised", with the student's own confidence-vs-result line); the case report ("What this case
  developed": outcomes, skills, a CV line; header tag now the case's LOs); the case file ("Skills record"
  with the cases still to practise each skill, CV lines for every case played, LO coverage, and "Using this in
  your assessment" for the Business Report and the Website Build).
- **New communication exercise:** "Your reply to {sender}" in every case report — write to the person who
  raised the ticket, for a non-analyst: what happened, how sure you are, what next and who does it. Prints
  as text or ruled lines.
- **Hub** (`index.html` → `docs/index.html`): the LO panel used paraphrases that didn't match the
  specification (LO4 was "Operate a store under constraints"); it now uses shortened spec wording, says LO4 is
  assessed through the group Website Build, and links to the catalogue. Marketplace Tycoon no longer claims LO4.
- Checked: axe-core clean on intro, reveal, report, inbox and case file; 320 px reflow on inbox, intro and case
  file. The hub's only axe finding is pre-existing, in the shared WMG shell ("WMG home" link name vs its text).

## Twelve cases, self-rating, cohort tally (2026-10-08, "do all 12")
The user asked for the whole improvement list. Numbering is **stable**: cases 1–9 kept their numbers; the new
ones are 10 (second real-data case), 11 and 12 (generated). `ALL_CASES` (`src/ui/caseList.js`) is the play order
by number with `kind: "generated" | "field"`; App's `caseIndex` indexes it (session record `v: 3`).
- **Engine**: per-case `scale: { sessions, aov }` (scale 1 is byte-identical to before — checked by hashing every
  variant); `spike-revert` takes `days`; a new **"attribution"** incident moves what analytics attributes between
  two segments of one dimension with the topline, AOV product and order book unchanged to the last decimal —
  `moves: "sessions"` (lost campaign tags: sessions and their conversions go to `to`, so the segment's own rate
  holds and `to` becomes a blend) or `moves: "credit"` (a model change: conversions move, sessions don't). Two new
  cause types: `fulfilment`, `attribution_change`. `reviewTrail` reports `needsTotal/usedTotal` (back-office
  orders, or the report by sessions/revenue) for attribution cases.
- **Case 11 "Four markets, two warehouses"** (Advanced, `scale 25 × 2.2` → ~68,000 sessions and £1.6m a week):
  a five-day (v0, Germany, checkout) or four-day (v1, France, purchase) fulfilment-system outage that has
  **already healed** when the ticket arrives; lost revenue ≈ £160k / £95k, pinned across 10 seeds; "last 7 days"
  shows only part of it. Lesson: size it over the days it ran; a healed dip needs a post-mortem, not a rollback.
- **Case 12 "The channel that collapsed on paper"** (Advanced): v0 newsletter template loses its campaign tags
  (email sessions −70%, Direct's double, email's rate flat on average); v1 attribution model switched to
  data-driven (retargeting's conversions halve, generic search's rise, sessions unchanged). Both: sitewide and
  order book flat; no funnel step. Covers the matrix's digital-marketing gap (attribution).
- **Case 10 "The Christmas plan"** (field data): the same six 2015 exports, marketing's question. Ranked by
  revenue the top products are HP service contracts (£229,451 from 4 purchases, £57,363 each; five lines ≈ £504k,
  ~15% of revenue); by units, trade baskets (343 SSDs in 4 purchases); the consumer sellers are the Samsung TVs,
  bought one at a time (96/62/52/15). 65+ converts best (2.76%), not the 35–44s (2.44%), on 58% age coverage;
  Shopping-ad landings bounce 82%. `fieldcase.js` is now **dataset + FIELD_QUESTIONS** (`FIELD_CASES`,
  `fieldCaseById`, `scoreFieldDiagnosis(guess, flags, q)`); the UI takes `def`. Facts pinned in fieldcase.test.js.
- **Explanations restructured** (item 6): every variant's `explanation` is `{ what, data, herrings, next, plain:{…} }`
  — four short parts, each with a Simpler-English version (shorter sentences, same numbers). Rendered by
  `Explanation` (shared.jsx) on reveals and as sub-headed sections in reports (`explanationSections` in labels.js).
  Case 9's explanation likewise; `FIELD_EXPLANATION` is the joined string for the provenance test.
- **Skills self-rating** (item 4, `SkillsRating.jsx`, `cohort.js` SKILL_STATEMENTS): six statements rated 1–5 —
  the PTES skills questions in the game's words — asked once on the inbox before the first case (skippable,
  re-openable) and again from the case file ("How you rate yourself": before vs now, with the change marked).
  `dd-skills` in localStorage.
- **Reply self-check** (item 7): four boxes under "Your reply to {sender}" in the case report; the count and
  whether a reply was written are saved to the case's progress record (`recordReply`) and print as ☑/☐.
- **Progress records** now keep `calls` (which calls were right) and `at`; old records still work.
- **Result code + cohort tally** (item 11, `cohort.js`, `InstructorTally.jsx`): the case file's "Share your results
  with your tutor" shows a code like `DD3|DD-2026|1:4/4@90:1111:r3,9:2/3@70:101|S:342534/443544` (scores,
  confidence, calls, reply check, ratings — no name). The tutor pastes a batch into the tally (instructor panel →
  "Cohort tally"): per case played / mean / fully right / call missed most / replies; confidence vs results;
  ratings before and after; unreadable lines flagged; mixed seeds warned. Nothing leaves the browser. Tested
  (cohort.test.js).
- **Instructor answer sheet** (item 5, `AnswerSheet.jsx`, instructor panel → "Answer sheet for this seed"): every
  case by number — each generated variant with which one this seed gives first, its ticket, answer, where it
  shows, real event and "what happened"; the field cases' three calls and core clues. Printable.
- **Bundle**: the instructor screens and the field cases load on demand (the answer sheet needs the field
  questions, so it must stay lazy or the 2015 archive lands in the first download). First load is now ~104 KB
  gzipped (was ~86 KB): the four-part explanations carry a Simpler-English copy of every variant, and there
  are two more generated cases.
- **Checked**: 235 tests; cases 1–7 byte-identical apart from the new fields; browser run-through of cases 10,
  11, 12, the rating, the case file, both instructor views; axe clean on every new screen; 320 px reflow;
  headless-Chrome print of the case file and a case report (tagged PDFs, A4, headings in order —
  scratchpad `printcheck.mjs` drives Chrome over CDP, seeding progress first). VoiceOver script updated, not run.

## Data and answers audit (2026-10-08)
The user asked for a check that the data and the answers match and are right. An audit over 212 seeds (not the
tests' 10) found the texts quoted fixed numbers ("revenue down 15–20%", "Mobile down about a fifth") that
many seeds' data contradicted — e.g. case 1's ticket was wrong for 61/212 seeds — and that in Case 4 v0 a
noise blip elsewhere outshone the real fault in 8% of seeds. Fixed at the root:
- **Numbers in text come from the student's own data.** Each variant has `facts(h)` (cases.js); its ticket body
  and explanation say `{{name}}` and `{{day:N}}` (a day in the dashboard's labels, "W3 Fri" — the old texts said
  "day 18", which the dashboard calls day 19). generateCase fills them (fillText). Ticket subjects stay static
  (the inbox shows them unfilled; tested).
- **Every seed must tell the story** (`storyHolds` in engine.js): the true segment's differential (its change
  minus the rest of its dimension's) must be ≥1.3× any same-direction rival among big segments in every
  dimension; when nothing broke, no segment with ≥10% share may move beyond 2.5 sd of the wobble its size and
  the noise level make normal (`wobbleSd`, checked against 4,000 noise-only differentials — conservative,
  z sd ≈ 0.8); plus each variant's `requires` (its ticket's premise, e.g. "orders are up"). If a draw fails,
  generateCase redraws from `${seed}~k` (MAX_DRAWS 16) — deterministic; draw 0 is the seed itself, so a seed
  that already passed is byte-identical. Tested over 40 seeds × noise 0.6/1.4/2.0: never out of draws.
- **Cause options relabelled by where the fault is** so exactly one fits each case (a warehouse upgrade is
  "fulfilment systems failed", not "a website release"; lost campaign tags are "analytics now credits sales to
  different channels", not "analytics stopped recording sales").
- **Case 10's answer was wrong against the full export**: the Sony 75" (15 buyers) is 16th by buyers, not 4th;
  a Samsung 32" (39) and the TomTom Runner (27) outrank it but weren't in the game's rows. The generator now also
  keeps the top 14 products by unique purchases and the two iPad bulk orders (ids `pr-b*`, so every existing id
  and clue is unchanged; regenerated with all six exports copied via Finder). Answer, clue and explanation
  corrected; "five contract lines ≈ £504k" now says "the five biggest" (there are 23, £622k).
- **Case 9**: "60 iPads in one order" was true but the row wasn't shown — now it is, and flagging it counts;
  "the ~424 real referral sales are mostly price-comparison sites" was unsupported (the named ones are about
  half price-comparison; most of the 424 are in the export's unnamed tail) — reworded.
- **Case 11**: "five markets" (the report has four plus "Other"), "France is the smallest of the big markets"
  (the USA is smaller) and a lesson/CV line saying "five-day" for a variant that lasts four — fixed.
- **Case 12 v0**: the red herring (a discount cut) was refuted by email's conversion rate, which is too noisy to
  refute anything on some seeds; it is now a send-day change, refuted by the total.
- **Answer sheet** now shows each variant's "what the data showed" with the seed's numbers, the date tolerance,
  and where a mix-shift case's signal shows.

## Tutor's guide (2026-10-09)
An instructor-only page (Instructor → "Tutor's guide"; view `guide`, lazy-loaded like the answer sheet and tally,
and never restored on refresh — App maps a saved `guide`/`answers`/`tally` view back to the inbox). Printable.
- **Built from the cases**, so it can't drift: the glance table, outcomes and skills come from `ALL_CASES`,
  `outcomes.js` and `suiteCoverage`; each generated variant's answer and "where it shows" come from
  `answerText` / `whereItShows` (`src/ui/answerText.js`), now shared with the answer sheet. The guide leaves out
  start days (`withStart: false`) because they change with the seed — the answer sheet has those.
- **Authored content** in `src/engine/tutorNotes.js`: per case `minutes`, 2–3 debrief `prompts`,
  `misconceptions` (common wrong turns) and an `extension`; plus `SEQUENCES` (a first seminar, a longer workshop, self-study — titles name no duration; the guide sums play time and debriefs come on top). Tested: every case has notes, sequences name real cases, and no note contains a day,
  percentage or £ figure (they must hold for every seed).
- Sections: running a session (links, seed, noise, `?instructor`), sequences, debriefing with the answer sheet
  and tally, skills development (the PTES context — tutor-facing only; never shown to students), accessibility,
  then case by case.

## Deliberately deferred
- **Which call a student gets wrong most** (dimension / segment / cause / start) across cases — with at most nine
  cases it would be noise, and it needs a progress-schema change.
- **Case ids in links** (`?case=cold-case-2015`) so a renumbering never breaks a shared link. (Cases 10–12 were
  added without renumbering, so no link changed this time.)
- AOV spread on device / source / campaign / user type is kept near 1.0 so existing narratives hold; widening
  it means re-pinning those cases' revenue claims.
- A cross-case reflection section in the case file (questions spanning several cases) — the case reports have
  per-case reflection already.
- Rubric hooks for the Business Report (the user chose not to, 2026-10-08).
- An "is it still happening?" field on the diagnosis form (Case 11 teaches it through the explanation instead).
