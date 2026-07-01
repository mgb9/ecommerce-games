# Funnel Fixer — build handover

A diagnostic CRO game for WM956-15, built to [PLAN-funnel-fixer.md](PLAN-funnel-fixer.md).
Third game in the suite — same architecture as Marketplace Tycoon and Conversion Lab
(pure seeded engine + single-file React + Vitest).

## Run it
```bash
npm install
npm run dev      # http://localhost:5174 (port 5174 to sit alongside Conversion Lab on 5173)
npm test         # 14 tests
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
