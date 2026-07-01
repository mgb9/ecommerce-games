/* ============================================================
   PLATFORM FIT — pure technology-selection engine (LO1).
   "Technologies → a solution for use-cases": given a client brief
   (scenario), evaluate how well each storefront platform matches
   what THAT use-case actually needs, and recommend a stack with a
   defensible rationale. Turns Marketplace Tycoon's platform pick
   from a blind choice into a real evaluation exercise.

   The evaluation is a transparent, deterministic weighted model:
   platform attributes are normalised across the four options, the
   scenario's fields set how much each criterion matters, and fit =
   Σ weight·score. It's a decision aid, not a spoiler — it argues
   from the same attributes the simulation actually uses.
   No React, no I/O. Depends only on the engine's data tables.
   ============================================================ */

import { PLATFORMS, SCENARIOS, SCMAP } from "./engine.js";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const avgPrice = (s) => (s.priceMin + s.priceMax) / 2;
const marginPct = (s) => clamp((avgPrice(s) - s.unitCost) / avgPrice(s), 0, 1);

// Min-max normalise an attribute across the platforms (→ 0..1).
function normaliser(pick) {
  const vals = PLATFORMS.map(pick);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  return (p) => (hi === lo ? 0.5 : (pick(p) - lo) / (hi - lo));
}
const nCost   = normaliser((p) => p.fixedCost);
const nCeil   = normaliser((p) => p.ceiling);
const nConv   = normaliser((p) => p.conv * p.adEff);
const nOrg    = normaliser((p) => p.organicBonus);
const nRamp   = normaliser((p) => p.rampWeeks);
const nVar    = normaliser((p) => p.variance);

/* Each criterion scores a platform 0..1 (higher = better for a
   store that cares about it). Cost, ramp and variance invert —
   cheaper / faster / steadier is better. */
const CRITERIA = [
  { key: "cost",      label: "Running cost",         score: (p) => 1 - nCost(p) },
  { key: "ceiling",   label: "Performance & ceiling", score: (p) => 0.5 * nCeil(p) + 0.5 * nConv(p) },
  { key: "organic",   label: "Organic / SEO reach",  score: (p) => nOrg(p) },
  { key: "speed",     label: "Speed to launch",      score: (p) => 1 - nRamp(p) },
  { key: "stability", label: "Operational stability", score: (p) => 1 - nVar(p) },
];
const CMAP = Object.fromEntries(CRITERIA.map((c) => [c.key, c]));

/* How much each criterion matters for a given brief. Encoded per
   scenario to match its stated `teach` line — the priorities ARE
   the LO1 lesson, so they're set deliberately rather than fitted:
   - fashion: thin margins + trend volatility → conversion ceiling
     and speed-to-launch beat everything; classic hosted-SaaS case.
   - grocer:  razor margins + spoilage → lowest running cost and
     rock-solid reliability win; needs are simple, so cheapest fits.
   - b2b:     research-led buyers → organic/SEO reach dominates;
     low volume means the performance ceiling barely matters.
   - digital: near-zero unit cost + huge margins → the performance
     ceiling and acquisition are everything; cost is almost free.  */
const WEIGHT_PROFILES = {
  fashion: { cost: 0.25, ceiling: 0.35, organic: 0.00, speed: 0.25, stability: 0.15 },
  grocer:  { cost: 0.40, ceiling: 0.10, organic: 0.05, speed: 0.20, stability: 0.25 },
  b2b:     { cost: 0.15, ceiling: 0.10, organic: 0.50, speed: 0.10, stability: 0.15 },
  digital: { cost: 0.05, ceiling: 0.55, organic: 0.10, speed: 0.10, stability: 0.20 },
};
// Fallback for any unregistered scenario: derive from its fields.
function derivedWeights(s) {
  return {
    cost: 1 - marginPct(s),
    ceiling: clamp(s.adResponse * marginPct(s), 0, 1),
    organic: s.organicReliance,
    speed: s.volatility * 3,
    stability: clamp((s.holdingPerUnit / avgPrice(s)) * 4, 0, 1),
  };
}
function weightsFor(s) {
  const raw = WEIGHT_PROFILES[s.id] || derivedWeights(s);
  const total = Object.values(raw).reduce((a, v) => a + v, 0) || 1;
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v / total]));
}

const VERDICT = (fit) => (fit >= 0.62 ? "Strong fit" : fit >= 0.45 ? "Workable" : "Poor fit");

/* Evaluate every platform against one scenario. Returns the list
   sorted best-first, each with its criterion breakdown and a
   rationale naming its most decision-relevant strength & weakness
   (weight × score), plus the recommended platform id. */
function evaluatePlatforms(scenario) {
  const s = typeof scenario === "string" ? SCMAP[scenario] : scenario;
  const w = weightsFor(s);

  const rows = PLATFORMS.map((p) => {
    const criteria = CRITERIA.map((c) => ({ key: c.key, label: c.label, weight: w[c.key], score: c.score(p) }));
    const fit = criteria.reduce((a, c) => a + c.weight * c.score, 0);
    // most / least decision-relevant criterion for this brief (distinct)
    const strength = [...criteria].sort((a, b) => b.weight * b.score - a.weight * a.score)[0];
    const weakness = [...criteria]
      .filter((c) => c.key !== strength.key)
      .sort((a, b) => b.weight * (1 - b.score) - a.weight * (1 - a.score))[0];
    return { id: p.id, name: p.name, short: p.short, tag: p.tag, fit, verdict: VERDICT(fit), criteria, strength, weakness };
  }).sort((a, b) => b.fit - a.fit);

  const recommended = rows[0].id;
  return { scenarioId: s.id, weights: w, rows, recommended };
}

// One-line justification for a platform under a brief (for the UI).
function rationaleFor(row, s) {
  const need = (k) => CMAP[k].label.toLowerCase();
  return `Best on ${need(row.strength.key)} — which ${s.short} depends on. Weakest on ${need(row.weakness.key)}.`;
}

// Compare the player's actual pick to the recommendation (debrief).
function fitOf(scenario, platformId) {
  const evalr = evaluatePlatforms(scenario);
  const row = evalr.rows.find((r) => r.id === platformId);
  const rank = evalr.rows.findIndex((r) => r.id === platformId) + 1;
  return { row, rank, recommended: evalr.recommended, total: evalr.rows.length, matchedBest: platformId === evalr.recommended };
}

export { CRITERIA, evaluatePlatforms, weightsFor, rationaleFor, fitOf };
