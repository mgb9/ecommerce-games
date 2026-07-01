# Conversion Lab — build handover

An A/B-testing simulator for WM956-15, built to [PLAN-conversion-lab.md](PLAN-conversion-lab.md).
Mirrors the Marketplace Tycoon structure (pure seeded engine + single-file React UI + Vitest).

## Run it
```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 25 tests
npm run build
```
(From the repo root the dev server is also wired in `.claude/launch.json` as `conversion-lab`.)

## Layout
- `src/engine/engine.js` — **pure, dependency-free, seeded.** The teaching maths lives here in the open:
  two-proportion z-test (pooled SE for the test, unpooled SE for the CI), normal CDF (Abramowitz-Stegun erf)
  and inverse CDF (Acklam), `requiredSampleSize`, and `runTest()` — the deterministic per-visitor Bernoulli
  stream with per-checkpoint series for the live charts. The six Chrichton experiments and their hidden
  truths are data here too.
- `src/engine/engine.test.js` — finiteness, determinism, a textbook z-test check, and **the statistical
  calibration test** (over 240 seeds: a true-null run is significant ≈ α; a power-sized effect is detected
  ≈ 80%; peeking inflates the false-positive rate). This is the artifact that proves the sim is honest.
- `src/ui/App.jsx` — phases intro → bench → running → verdict → summary. Mock Chrichton pages, the
  predict-then-reveal loop, animated convergence + p-value charts, instructor ⚙ drawer, CSV/Markdown export.

## The experiment arc (each teaches one thing)
1. CTA button — real large effect (true positive). 2. Hero image — **no effect** (Type I trap).
3. Scarcity badge — tiny real effect (power/sample size). 4. Social proof — moderate effect (peeking).
5. Free shipping — significant but **loses money** (significance ≠ value). 6. Checkout by device —
aggregate near-tie hiding opposite per-segment effects (Simpson's paradox). 7. Homepage promo-vs-brand —
a *winning* aggregate that **hurts returning customers** (segment by new/returning before you ship).
8. Email subject line — wins the tested metric (open rate) but tanks the **guardrail** metric
(vanity-metric trap; uses `metricLabel` + `guardrail`).

## "Which Test Won?" round + CRO Stack (added from the lecture decks)
- `QUIZ` in the engine — 10 documented A/B-test cases. **These are deliberately DIFFERENT from the
  scenarios in `CRO Quiz Master 25_26.pptx`** (which is run live in class) so the game doesn't spoil it —
  there's a test (`does NOT reuse the in-class quiz scenarios`) guarding this. Same principles, fresh
  scenarios (guest checkout, form length, money-back guarantee, single vs two-column, reviews, sticky
  mobile bar, autoplay video, exit-intent popup, decoy pricing, personalised recs). Likewise experiments
  #2/#7/#8 were reframed off the quiz's hero/Halloween cases for the same no-spoiler reason.
- A separate `quiz` → `quizdone` phase pair in the UI: predict the winner, reveal the real result + the
  named psychology principle (linked to the glossary). Reached from a second button on the intro.
- `CRO_STACK` (Data → Strategy → Psychology → Testing) — shown on the intro and as a "You just did CRO"
  panel on the summary, matching the lecture's slide 20 / quiz slide 53.
- The glossary now names the cognitive principles the decks lean on: anchoring, charm pricing, F-pattern,
  Von Restorff, paradox of choice, peak-end, ambiguity aversion, variable reward, vanity/guardrail metrics.
- Source decks: `CRO Nov 25 Original.pptx` (70-slide lecture) and `CRO Quiz Master 25_26.pptx` (the quiz),
  both in this folder.

## Notes for the next person
- Determinism flows entirely through `makeRng(seed)`. A shared seed gives a whole cohort an identical run,
  so the debrief is about decisions, not luck. The UI seeds each test as `${cfg.seed}:${exp.id}`.
- The run animation is **elapsed-time driven** (not a fixed per-tick step) so a backgrounded/throttled tab
  still completes instead of freezing mid-test.
- Instructor presets (pure noise, underpowered, peeking, strict/lenient α, boost effects) all flow through
  `cfg` → `effExperiment()`, which scales each variant's true lift.
- Design tokens match the Tycoon set (Bricolage/Hanken/JetBrains Mono; amber `#F2A93B` = player,
  gold `#C9A06A` = instructor). Arm colours: control `#9B8Fb0`, variant `#3FB6A8`.
- Verified end-to-end in-browser through all six experiments, the calibration report, and CSV export.
