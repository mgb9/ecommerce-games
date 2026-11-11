import { describe, it, expect } from "vitest";
import {
  resolveRound, initialStores, SCMAP, SCENARIOS, PLATFORMS, PMAP, CMAP, makeRng, botDecide, leaderDecisionOf,
  DEFAULT_CFG, platMods, PLATFORM_RULES,
} from "./engine.js";
import { evaluatePlatforms } from "./platformfit.js";

/* The platform balance the setup screen and the debrief describe: on each
   brief, a well-run store earns most on the platform the fit model rates
   top — by a few per cent, not by a landslide. "Well-run" = the best of a
   grid of sensible policies (two price points × four ad budgets × with or
   without early CRO, stock following last week's demand), averaged over
   twenty markets. If a platform number changes, this says whether the
   wording is still true. */
function play({ scenarioId, fulfilId, platformId, seed, policy }) {
  const cfg = { ...DEFAULT_CFG, scenarioId, seed };
  const sc = SCMAP[scenarioId];
  let stores = initialStores("T", platformId, fulfilId, cfg.startingCash, sc, seed);
  for (let round = 1; round <= cfg.maxRounds; round++) {
    const rng = makeRng(seed + ":" + round);
    stores = stores.map((s) => {
      if (!s.isPlayer) return s;
      const p = policy(s, round, sc);
      let n = { ...s, decision: { ...s.decision, ...p.decision } };
      for (const id of p.deploy) { const t = n.cro[id]; n = { ...n, cro: { ...n.cro, [id]: t + 1 }, croSpendThisWeek: n.croSpendThisWeek + CMAP[id].cost[t] }; }
      return n;
    });
    const stats = { lastTotalDemand: stores.reduce((a, s) => a + (s.last ? s.last.demandUnits : sc.demandBase / 5), 0), leaderDecision: leaderDecisionOf(stores) };
    stores = resolveRound(stores.map((s) => (s.isPlayer ? s : { ...s, decision: botDecide(s, stats, round, cfg, rng, sc) })), round, cfg, rng).stores;
  }
  return stores.find((s) => s.isPlayer).cumProfit;
}
const POLICIES = [];
for (const pf of [0.5, 0.7]) for (const ad of [200, 600, 1200, 2000]) for (const cro of [false, true]) {
  POLICIES.push((s, r, sc) => ({
    decision: { price: Math.round(sc.priceMin + pf * (sc.priceMax - sc.priceMin)), ad, stock: Math.round(s.last ? s.last.demandUnits * 1.1 : sc.demandBase / 5) },
    deploy: cro && r <= 4 ? [["checkout", "trust", "speed", "mobile"][r - 1]] : [],
  }));
}
const SEEDS = ["WMG-2026", ...Array.from({ length: 19 }, (_, i) => "S" + i)];
// average profit of the best policy, per platform
function wellRun(scenarioId, fulfilId) {
  return Object.fromEntries(PLATFORMS.map((p) => [p.id, Math.max(...POLICIES.map((policy) =>
    SEEDS.reduce((a, seed) => a + play({ scenarioId, fulfilId, platformId: p.id, seed, policy }), 0) / SEEDS.length))]));
}

describe("the top-fit platform is the best earner for a well-run store", () => {
  for (const sc of SCENARIOS) for (const fulfilId of sc.digital ? ["inhouse"] : ["inhouse", "3pl"]) {
    it(`${sc.id} × ${fulfilId}`, () => {
      const top = evaluatePlatforms(sc).recommended;
      const profit = wellRun(sc.id, fulfilId);
      const next = Math.max(...PLATFORMS.filter((p) => p.id !== top).map((p) => profit[p.id]));
      expect(profit[top]).toBeGreaterThan(next);
      // "a few per cent": an edge, never a landslide
      expect(profit[top] / next).toBeLessThan(1.15);
    });
  }
  it("recommends a different platform for each brief", () => {
    expect(SCENARIOS.map((sc) => evaluatePlatforms(sc).recommended)).toEqual(["shopify", "wix", "woo", "headless"]);
  });
});

describe("platform attributes act through the brief", () => {
  const flat = () => 0.5;
  it("an organic edge is worth nothing where no buyers search, and its full value where half do", () => {
    expect(platMods(PMAP.woo, 5, flat, SCMAP.fashion).organic).toBe(0);
    expect(platMods(PMAP.woo, 5, flat, SCMAP.b2b).organic).toBe(PMAP.woo.organicBonus);
    const part = platMods(PMAP.woo, 5, flat, SCMAP.digital).organic;
    expect(part).toBeGreaterThan(0);
    expect(part).toBeLessThan(PMAP.woo.organicBonus);
  });
  it("owning the ops only ever costs conversions", () => {
    for (const r of [0, 0.3, 0.999]) expect(platMods(PMAP.woo, 5, () => r, SCMAP.b2b).conv).toBeLessThanOrEqual(PMAP.woo.conv);
    expect(platMods(PMAP.woo, 5, () => 0.999, SCMAP.b2b).conv).toBeGreaterThan(PMAP.woo.conv * (1 - PMAP.woo.variance));
  });
  it("a store still being built works below its finished level, then reaches it", () => {
    const h = PMAP.headless;
    const wk1 = platMods(h, 1, flat, SCMAP.digital);
    expect(wk1.conv).toBeCloseTo(h.conv * (1 - PLATFORM_RULES.launchDrag), 9);
    expect(wk1.adEff).toBeCloseTo(h.adEff * (1 - PLATFORM_RULES.launchDrag), 9);
    let prev = wk1.conv;
    for (let r = 2; r <= h.rampWeeks; r++) { const c = platMods(h, r, flat, SCMAP.digital).conv; expect(c).toBeGreaterThan(prev); prev = c; }
    expect(platMods(h, h.rampWeeks, flat, SCMAP.digital).conv).toBeCloseTo(h.conv, 9);
    expect(platMods(PMAP.shopify, 1, flat, SCMAP.fashion).conv).toBe(PMAP.shopify.conv);
  });
});
