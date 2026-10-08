# Data Detective — build handover

A root-cause diagnosis game for WM956-15, built to [PLAN-data-detective.md](PLAN-data-detective.md).
**Two cases of the planned 8-case arc are built**: case 1 validated the investigation-workspace
interaction; case 2 is a deliberately much harder "Advanced" case built for MSc-level rigour.

## Run it
```bash
npm install
npm run dev      # http://localhost:5176
npm test         # 63 tests
npm run build
```
(From the repo root the dev server is wired in `.claude/launch.json` as `data-detective`.) The intro
screen has a case-select control (pill buttons per `CASES` entry, tagged Standard/Advanced) — pick a case
before opening the dashboard.

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

## Deliberately deferred
- Cases 3–8 from the plan's original table (country/traffic-quality/site-speed/false-alarm/inventory/
  seasonal-no-issue) — the engine's `incidentFactorAt` shapes and `CASES` array are structured to add them
  without rework; the `rate-joint` mechanism + `buildCrossTab` are available to any future compound case.
- A proper case-inbox list screen — the intro screen's pill-button case picker is a minimal stand-in,
  workable for 2 cases but would want a real ticket-queue UI once there are several more.
- CSV/Markdown export and the cross-case calibration summary screen — the plan's reflection prompts
  reference cases that don't exist yet.
- A per-segment Sessions view in the breakdown chart (currently locked to conversion rate) — would let
  students see the case-1 email session-bump directly per-segment rather than only via the topline toggle.
- AOV is a single global constant (`AOV = 42`) — `summariseSegments` computes `aovLate` per segment for
  forward-compatibility, but it's always exactly 42 today, so it's deliberately NOT shown as a table column
  (would just be a confusing constant). Worth surfacing once a case introduces real per-segment AOV variation.
- The compound breakdown's multi-line chart is suppressed (table-only) above 6 segments — a 12-line chart
  was too cluttered to read. Could revisit with a smarter palette or small-multiples instead of suppressing
  it outright, if a future case wants the chart back for a compound dimension.
