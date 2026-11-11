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

## Skills, diagnosis log, tally and tutor's guide (2026-11-11, second pass)
The Data Detective / Conversion Lab features, so the game makes its skills visible. Nothing in the engine's
numbers changed.
- `src/engine/outcomes.js` — the spec's LO wording (shared with DD and CL), the skills catalogue with
  game-specific `how`, the game's `OUTCOMES` (LO3 only; syllabus; skills; a CV line). Communication and
  self-assessment are "by doing": communication is recorded only if the recommendation was written.
- Intro: "What this develops" (LO text, syllabus, skills, module link). Debrief: **"Your recommendation to
  Chrichton's head of e-commerce"** (`Recommendation.jsx`, four self-checks, saved as typed) and "Skills you
  practised".
- **Self-rating** (`SkillsRating.jsx`, six statements in `cohort.js`): phase `rate`, asked once before the first
  game (skippable), again from the log; stored in `ff-skills`.
- **Diagnosis log** (`DiagnosisLog.jsx`, phase `log`, printable — the `.ff-report` print CSS was already in
  `theme.js`): the first finished run quarter by quarter, how the calls held up, the debrief cards from that
  run, the recommendation, a skills record, the CV line, the four LOs (LO1/LO2 not covered, LO4 via the Website
  Build), assessment use, the ratings, and a **result code** `FF1|seed|L:bits|B:bits|P:±£k|R:checks|S:before/after`.
- `progress.js` — `first` now keeps the whole first run (`summariseRun`: rows, hit bits, untouched-funnel
  profit, debrief cards); `recommendation`; `ff-skills`. A `first` saved before this pass (no rows) still prints.
- **Instructor only** (behind `?instructor`, lazy-loaded; a refresh never lands a student on them): **cohort
  tally** (`InstructorTally.jsx`: per quarter how often each call was right, profit against an untouched funnel,
  recommendations, ratings) and the **tutor's guide** (`TutorGuide.jsx` + authored, number-free
  `src/engine/tutorNotes.js`): the opening funnel and first-quarter returns for the current settings, session
  plans, debrief questions, wrong turns, stretch questions, what each preset is for, LOs and skills, accessibility.
- Tests: `src/ui/cohort.test.js` (code round-trip, tally, outcomes), five more screen renders.
- Checked in the browser on the dev server: rating → full run → recommendation → log → code pasted into the
  tally → guide; `?instructor=off` on a staff page falls back to the game; log at 375px (table scrolls in its
  region, no page overflow). On the built site inside the WMG shell: the lazy tutor's guide loads and takes
  focus on its h1, no console errors.
- **Checked 2026-11-11 (later pass):** axe (WCAG 2.0–2.2 A/AA + best practice) reports nothing on the rating
  screen, the end screen, the diagnosis log (including the open re-rating form), the instructor panel, the
  tally and the tutor's guide — run during a full game from a `?seed=` link with Simpler English on. The
  log, tally and guide were printed to PDF with headless Chrome from the built site: A4, tagged, the game
  frame and screen-only controls gone, tables intact. Still not checked: a screen reader.
- **Skill names against the specification (checked 2026-11-11):** "Digital marketing for eCommerce" is a
  syllabus heading, not one of the specification's subject-specific skills (eCommerce, web development,
  conversion optimisation, eCommerce design, operations for eCommerce), so the skill is now
  "eCommerce: digital marketing". The syllabus line keeps the heading. See Marketplace Tycoon's handover
  for the two transferable names that differ from the specification in all four games.
- **Simpler English** on these screens (2026-11-11): the rating screen, the recommendation, "What this
  develops", "Skills you practised" and the diagnosis log's guidance follow the switch. The wording lives
  with the data — `plain` on each `SKILL_STATEMENTS`, `SKILLS` and `LEARNING_OUTCOMES` entry,
  `RATING_LABELS_PLAIN`, `REC_CHECKS_PLAIN` — and components pick with `usePlain()` (the log's `say(rich,
  plain)`). The specification's LO wording always stays; plain mode adds an "In simpler words:" gloss under
  it (the same four glosses as Marketplace Tycoon). Unchanged on purpose: skill names, syllabus headings,
  the CV line, table headings, the run's own debrief cards, the result code, and the staff pages (tally,
  tutor's guide, instructor panel). `cohort.test.js` fails if a statement, skill or outcome has no plain
  wording; the smoke test renders the screens with the switch on.
