# Funnel Fixer — Build Plan

**A diagnostic CRO game for WM956-15.** Students get a leaky e-commerce funnel dashboard (traffic → product view → add-to-cart → checkout → purchase) and a fixed budget. They diagnose where the funnel leaks, spend on interventions (faster load, trust badges, guest checkout, retargeting…), and watch which actually move the needle. Teaches funnel economics, CAC/LTV, and prioritisation under constraint.

**Theme:** the funnel belongs to **Chrichton** (garden retail) — interventions are framed as real CRO projects pitched to the client.

---

## 1. Why it exists (WM956 mapping)

- **LO3 — conversion enhancement** and **LO1 — solution selection:** choosing *where* to intervene under a budget is the prioritisation skill the module is built around.
- **Digital Marketing:** CAC, LTV, retargeting, the unit economics of growth.
- **Operations:** checkout, payments and delivery touchpoints appear as funnel stages.
- **Fundamentals:** funnel maths, opportunity sizing, Theory of Constraints.

It complements Conversion Lab: that game proves *whether* a change works; this one decides *which* change is worth making first. Both feed the report's "where should Chrichton invest, and why" analysis with numbers.

## 2. The core insight it teaches

The thing students get wrong: they fix the **biggest percentage gap**, not the **biggest absolute leak**. A 2pp lift at a high-volume early stage can dwarf a 20pp lift at a starved late stage. And you can't fix everything — the budget forces a call. Layered on top:

- **Opportunity sizing** — the value of a lift = (extra users retained at that stage) × (downstream conversion) × (margin per order). Diagnose with money, not percentages.
- **The moving bottleneck (Theory of Constraints)** — fix one stage and the binding constraint jumps to the next. Round two should not look like round one.
- **The leaky bucket** — buying traffic before fixing conversion just pours more water through the holes; CAC climbs, ROI falls.
- **CAC vs LTV** — acquisition spend only pays if LTV clears CAC; the dashboard makes that ratio visible.

## 3. The engine (pure, seeded, testable)

Same architecture as Marketplace Tycoon / Conversion Lab — one deterministic tick:

```js
resolveFunnel(state, allocations, { seed }) -> {
  stages,            // volume + rate at each step, before/after
  purchases, revenue, grossProfit,
  cac, ltv, ltvCacRatio,
  perInterventionROI,   // incremental profit ÷ spend, per chosen intervention
  bottleneck            // the stage now losing the most absolute value
}
```

**Funnel maths:**

- Sessions `V` flow through four step-rates: `view`, `view→ATC`, `ATC→checkout`, `checkout→purchase`. `purchases = V · r_view · r_atc · r_checkout · r_purchase`.
- `revenue = purchases · AOV`; `grossProfit = revenue · margin − spend` (some interventions also cut margin, e.g. free shipping).
- `CAC = acquisitionSpend / purchases`; `LTV = AOV · margin · (1 + repeatFactor)`; surface `LTV/CAC` (healthy ≥ ~3).
- **Absolute leak per stage** = `(usersEntering · (benchmarkRate − actualRate)) · downstreamConversion · marginPerOrder` — this is the diagnosis target, and what `bottleneck` returns.

**Intervention model:**

- Each intervention targets a stage and applies a **multiplicative lift** to its rate, with two realities that punish naïve spending: a **ceiling** (rates can't exceed a realistic max — fixing a near-optimal stage barely helps) and **diminishing returns** (stacking interventions on one stage yields less each time). Lifts carry seeded noise so repeated quarters aren't identical.
- Acquisition-type interventions add `sessions` instead of lifting a rate — and raise CAC.
- Resolve order: apply rate lifts (capped), then recompute volumes, CAC/LTV, profit and the new bottleneck.

Keep it dependency-free; `recharts`/SVG for the funnel viz.

## 4. Starting funnel (Chrichton baseline)

| Stage | Chrichton actual | Benchmark | Read |
|---|---|---|---|
| Sessions / quarter | 80,000 | — | top of funnel |
| → Product view | 55% | 60% | minor leak |
| → Add to cart | **8%** | 12% | **major leak (high volume)** |
| → Checkout started | 45% | 50% | minor leak |
| → Purchase | **60%** | 75% | **major leak (abandonment)** |

`AOV £42 · gross margin 45% · repeat factor 0.4`. Baseline ≈ **950 purchases / quarter**. The two big absolute leaks are view→ATC (early, high volume) and checkout→purchase (late, high value) — a deliberate tension so the "size it in money" lesson bites.

## 5. Interventions (the budget menu)

| Intervention | Targets | Cost | Effect | Teaching nuance |
|---|---|---|---|---|
| Faster page load (Core Web Vitals) | view rate + view→ATC | ££ | broad moderate lift | helps the top where volume is highest |
| Product imagery & video | view→ATC | ££ | large lift on the early leak | often the best £-for-£ here |
| Reviews & trust badges | ATC→checkout, checkout→purchase | £ | cheap, broad trust lift | high ICE score |
| Guest checkout | checkout→purchase | ££ | large lift on abandonment | fixes the late leak |
| More payment options | checkout→purchase | £ | small–moderate | diminishing if stacked with guest checkout |
| Mobile UX overhaul | all stages, weighted by mobile share | £££ | moderate, broad | expensive; pays off only if mobile-heavy |
| Free-shipping threshold | checkout→purchase | £ + **margin cut** | moderate lift, lower margin | the profit trap — conversion up, profit maybe down |
| Retargeting / email | re-adds lapsed sessions | ££ (ongoing) | +sessions | raises CAC; watch LTV/CAC |
| Paid traffic boost | sessions only | £££ (ongoing) | +sessions only | **leaky bucket** if conversion unfixed |

## 6. Game loop

Multi-round (e.g. four "quarters") so the bottleneck can move:

1. **Diagnose** — read the funnel + benchmarks; **predict** which stage is the biggest *money* leak and which single intervention has the best ROI (predict-then-reveal). Optionally have students enter their own opportunity-sizing estimate.
2. **Allocate** the quarter's budget across interventions (a constraint slider/basket; can't overspend).
3. **Run the quarter** → `resolveFunnel` resolves with noise → animated funnel updates; show purchases, revenue, profit, CAC, LTV/CAC and per-intervention ROI.
4. **Debrief the quarter** — did they fix the real bottleneck? Which spend earned its keep, which was wasted (a near-ceiling stage, or traffic into a leak)? Where did the bottleneck move to?
5. Repeat; **win = cumulative incremental profit / ROI** over all quarters (or hit a profit target).

## 7. Screens

1. **Funnel dashboard** — the hero: an animated funnel with volume and rate at each step, benchmark deltas, and the £-sized leak per stage (the diagnostic view). CAC/LTV gauges alongside.
2. **Diagnose & predict** — pick the biggest leak and best-ROI bet before spending.
3. **Allocate budget** — the intervention basket with costs, ICE hints, and a running budget meter.
4. **Quarter result** — before/after funnel, P&L delta, per-intervention ROI bars, the new bottleneck called out.
5. **Debrief / end** — cumulative profit and LTV/CAC trajectory, "what this taught" cards (opportunity sizing, moving bottleneck, leaky bucket, profit trap), calibration tally.

## 8. Instructor controls (host panel)

Re-use the Tycoon ⚙ drawer. Tunable: starting rates and benchmarks, sessions, AOV/margin/repeat, per-intervention cost/lift/noise/ceiling, budget per quarter, number of quarters, and seed (identical cohort run → debrief is about decisions). Presets: *"Top-heavy leak"*, *"Abandonment crisis"* (crush checkout→purchase), *"Tight budget"*, *"Cheap-traffic temptation"* (make paid traffic look attractive to spring the leaky-bucket trap), *"Margin trap on"*.

## 9. Export (assessable artifact)

CSV + Markdown: per quarter — diagnosis & prediction, allocations, before/after rates, purchases/revenue/profit, CAC, LTV/CAC, per-intervention ROI, and which spend was wasted. Plus calibration and reflection prompts:

- Did you size the opportunity in money before spending — and were you right about the biggest leak?
- Which intervention had the best and worst ROI, and why (ceiling? wrong stage? margin cut?)?
- Track CAC vs LTV across quarters: did any growth spend fail to pay for itself?
- After fixing the first bottleneck, where did the constraint move?

## 10. Build phasing

1. **Engine + tests.** `resolveFunnel`, the opportunity-sizing maths, CAC/LTV, ceilings/diminishing returns, the bottleneck finder. Port the Tycoon test pattern: finiteness, determinism, and a sanity test that spending on a near-ceiling stage yields ~zero ROI while fixing the true bottleneck yields the most.
2. **Single quarter playable** against the Chrichton baseline.
3. **Multi-round + moving bottleneck + predict-then-reveal + debrief.**
4. **Instructor panel + export.**
5. **Design pass** — the animated funnel is the signature visual; hand to Claude Design against the shared tokens.

## 11. House conventions (shared with the suite)

Warm-dark aesthetic and the Marketplace Tycoon token set (Bricolage Grotesque / Hanken Grotesk / JetBrains Mono; amber `#F2A93B` = act, gold `#C9A06A` = instructor; green/red = outcome). Pure dependency-free seeded engine, `recharts`/SVG viz, ESL glossary tooltips, UK English, £. Single-file React artifact first; structured for extraction into the same Vite repo as Tycoon and Conversion Lab.
