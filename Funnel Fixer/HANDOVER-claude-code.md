# Funnel Fixer — build handover

A diagnostic CRO game for WM956-15, built to [PLAN-funnel-fixer.md](PLAN-funnel-fixer.md).
Third game in the suite — same architecture as Marketplace Tycoon and Conversion Lab
(pure seeded engine + single-file React + Vitest).

## Run it
```bash
npm install
npm run dev      # http://localhost:5174 (port 5174 to sit alongside Conversion Lab on 5173)
npm test         # 38 tests
npm run build
```
(From the repo root the dev server is wired in `.claude/launch.json` as `funnel-fixer`.)

## Layout
- `src/engine/engine.js` — **pure, dependency-free, seeded.** The teaching maths is in the open:
  - **Opportunity sizing** — `leaks()` values each stage's gap-to-benchmark in £:
    `entering × (benchmark − actual) × downstreamConversion × marginPerOrder`. The biggest entry is the
    bottleneck — and it is deliberately NOT the biggest %-gap stage (add-to-cart £9.0k beats the −15pp
    purchase leak at £4.5k).
  - **Interventions** close a fraction of the gap-to-CEILING, which gives a ceiling effect (a near-optimal
    stage barely moves) and diminishing returns (sequential gap-closing) for free.
  - **CAC is incremental** — `acqSpend ÷ (purchases gained from the bought sessions)`, not blended across
    organic purchases. That's what makes the leaky-bucket trap bite into an unfixed funnel.
  - Rate fixes **persist** (so the bottleneck moves across quarters); acquisition boosts are **ongoing**
    (re-bought each quarter); a deployed free-shipping **margin cut persists** (the compounding trap).
- `src/engine/engine.test.js` — finiteness, determinism, and the **sanity tests** the plan asks for:
  spending on a near-ceiling stage yields ≈£0 ROI; fixing the true bottleneck yields the most; the
  bottleneck moves after a fix; the leaky bucket (paid → LTV/CAC < 3, ROI < 1); the margin trap;
  diminishing returns on a stacked stage.
- `src/ui/App.jsx` — phases intro → diagnose → allocate → result → end. `FunnelViz` is the signature
  visual (a tapering, animated funnel with rates, benchmark deltas and the £ leak per stage). Predict-then-
  reveal (biggest money leak + best-ROI bet), the budget basket with a meter, per-intervention ROI bars,
  the moving-bottleneck callout, profit + LTV/CAC charts, the ⚙ instructor drawer, and CSV/Markdown export.

## The lesson arc
The funnel starts with two big leaks — add-to-cart (early, high-volume) and checkout→purchase (late, big
%-gap). Quarter 1 teaches "size it in money": the scary −15pp purchase gap is a smaller £ leak than the
−4pp add-to-cart gap. Fix it and the bottleneck moves (Theory of Constraints), so each quarter is a fresh
diagnosis. The acquisition levers spring the leaky-bucket trap; free shipping springs the margin trap.

## Instructor presets
Top-heavy leak, Abandonment crisis, Tight budget (£8k), Cheap-traffic temptation (high AOV/margin to make
paid look attractive), Low noise, plus full sliders for budget, quarters, sessions, AOV, margin, repeat,
mobile share and the starting funnel rates. Seed shared across a cohort → debrief is about decisions.

## Notes
- Determinism flows entirely through `makeRng(seed)`; per-intervention noise is keyed on `(seed, id)` so a
  counterfactual that removes a different intervention doesn't shift it (needed for honest marginal ROI).
- The LTV/CAC chart only plots quarters with paid acquisition — an all-organic playthrough leaves it empty
  (with a note), by design.
- Verified end-to-end in the browser: diagnose → reveal → allocate → 4 quarters → debrief → CSV export.
- House tokens match the suite (Bricolage/Hanken/JetBrains Mono; amber `#F2A93B` = act, gold `#C9A06A` =
  instructor; green/red = outcome).


---

## Rigour and release pass (2026-11-11)

Brought towards the Data Detective / Conversion Lab standard: scoring that is right, a debrief written from
the run, staff-only settings, saved progress, accessibility. **Not yet done** (DD/CL have them): the
skills record, self-rating, written task, printable log, cohort result code/tally and tutor's guide.

### What was wrong, and what it is now
- **One-quarter ROI judged durable fixes as wasted money.** A one-off fix stays for the rest of the game,
  but its ROI was reported for one quarter: "More payment options" showed 0.5× (red, counted as *wasted
  spend*) though it returns ~2× over four quarters and is in the profit-maximising plan. The "best-ROI"
  answer in quarter 2 was *Paid traffic* (1.0× in the quarter) over *Faster page load* (0.9× × 3
  quarters). Now every purchase has a **return over the plan** (`planValue`: a rate fix earns this
  quarter's gain, then its gain at base traffic in each later quarter, everything else held; bought
  traffic earns only its own quarter). The best-bet question, its scoring, the results table and "spend
  not paid back" all use it; the quarter's figure is shown beside it.
- **A "bottleneck" worth £0.** Once no stage was below benchmark, `bottleneckOf` still named Product view
  and the diagnosis question had no right answer. `bottleneckOf` now returns `null`; both questions have a
  **"none"** option (no stage below benchmark / nothing earns back its cost) that is correct when true.
- **The debrief was fixed text** — it said the biggest gap (checkout→purchase) was a smaller leak than
  add-to-cart (false under the *Abandonment crisis* preset), that "you re-diagnosed each round", and that
  CAC climbed, whatever the student did. `buildDebrief(records, cfg)` now writes five cards from the
  records: sizing, the moving bottleneck, bought traffic (or what it would have cost at the start and end
  funnels), free shipping (or what it would have done), payback. `debrief.test.js` checks each claim
  against the run over 8 presets × 5 ways of playing × 12 seeds.
- **The student couldn't reason about the best bet** — a fix's strength and the stage ceilings were
  hidden. Each fix now shows what it acts on and how strongly (`actsOn`: strong ≥40% of the remaining
  headroom, moderate ≥20%, light), and the funnel shows best-in-class beside the benchmark. A pick within
  5% of the best counts (outcome noise is ±8%).
- **Had to buy something every quarter.** Spending nothing is allowed, and is the right call when nothing
  pays back.
- **Leaks ignored a free-shipping margin cut** (`leaks(rates, sessions, cfg, marginCut)` now values an
  order at the margin in force). **`ltvCac`** is `null`, not `Infinity`, when no traffic was bought
  (records are JSON). "Gross profit" was profit after spend and is labelled so. LO claim is now LO3 only
  (the hub card was corrected to LO3 to match).
- Engine numbers for a given seed and basket are unchanged except leak values after a margin cut.

### Structure
`src/ui/` now follows Conversion Lab: `App.jsx` (state, saved to the tab's session), `screens.jsx`
(Intro, Diagnose, Allocate, ResultView, EndView, FunnelViz), `InstructorPanel.jsx`, `shared.jsx`,
`theme.js`, `session.js`, `progress.js`, `urlConfig.js`.

### Staff settings, links, saved progress
- The instructor dialog appears only after `?instructor` (remembered; `?instructor=off` forgets).
- `?seed=NAME` starts on a shared seed (the dialog shows the link to give students).
- `sessionStorage` `ff-session:*`: screen, funnel, calls, basket, records, settings — a refresh resumes;
  a quarter's result is recomputed from what it started with. `localStorage` `ff-progress`: the first
  finished run, the best and the count; finishing sets the hub's `wmg-games-progress.ff`.

### Accessibility (the suite's patterns)
Glossary terms are disclosure buttons; both calls are labelled groups of `aria-pressed` buttons; the
basket is toggle buttons with a `role="status"` budget; one h1 per screen, cards h2, scorecards h3; focus
moves to each new screen's heading; the funnel is a list with a plain sentence per stage; charts are
`role="img"` with their values; results are scored in words; contrast tokens from CL (`playerBtn`,
`selText`, darker olive and instructor brown); the header no longer sticks; reduced motion respected;
Simpler English follows the WMG shell's switch (the click-bridge script is gone). Checked at 375px.
**Not run:** axe on the built page, a screen reader.
