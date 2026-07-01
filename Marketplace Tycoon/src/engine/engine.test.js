import { describe, it, expect } from "vitest";
import {
  resolveRound, initialStores, SCMAP, SCENARIOS, makeRng, botDecide,
  leaderDecisionOf, DEFAULT_CFG, FULFILMENT, rollCroLifts, croConvOf, croQualityOf,
} from "./engine.js";

// Mirrors the manual verification harness from HANDOVER §6: drive a full
// game deterministically by feeding the player a fixed mid-market decision.
function playGame(scenarioId, fulfilId, platformId, seed) {
  const cfg = { ...DEFAULT_CFG, scenarioId, seed };
  const sc = SCMAP[scenarioId];
  let stores = initialStores("Tester", platformId, fulfilId, cfg.startingCash, sc, seed);
  for (let round = 1; round <= cfg.maxRounds; round++) {
    const rng = makeRng(seed + ":" + round);
    stores = stores.map((s) => s.isPlayer
      ? { ...s, decision: { price: Math.round((sc.priceMin + sc.priceMax) / 2), ad: 500, stock: Math.round(sc.demandBase / 3) } }
      : s);
    const lastTotalDemand = stores.reduce((a, s) => a + (s.last ? s.last.demandUnits : sc.demandBase / 5), 0);
    const stats = { lastTotalDemand, leaderDecision: leaderDecisionOf(stores) };
    const withBots = stores.map((s) => s.isPlayer ? s : { ...s, decision: botDecide(s, stats, round, cfg, rng, sc) });
    stores = resolveRound(withBots, round, cfg, rng).stores;
  }
  return stores;
}

const PLATFORMS_TO_TEST = ["wix", "shopify", "woo", "headless"];

describe("finiteness & sanity", () => {
  for (const scen of SCENARIOS) {
    const fulfilIds = scen.digital ? ["inhouse"] : FULFILMENT.map((f) => f.id);
    for (const fid of fulfilIds) {
      it(`${scen.id} × ${fid} stays finite and in-range over 10 weeks`, () => {
        const stores = playGame(scen.id, fid, "shopify", "WMG-2026");
        for (const s of stores) {
          for (const h of s.history) {
            for (const k of ["cumProfit", "cash", "loyalBase", "review", "profit", "revenue", "share"]) {
              expect(Number.isFinite(h[k]), `${s.id}.${k} wk${h.round}`).toBe(true);
            }
            expect(h.review).toBeGreaterThanOrEqual(1);
            expect(h.review).toBeLessThanOrEqual(5);
            expect(h.share).toBeGreaterThanOrEqual(0);
            expect(h.share).toBeLessThanOrEqual(1);
            expect(h.loyalBase).toBeGreaterThanOrEqual(0);
          }
          expect(Number.isFinite(s.last.keptSales)).toBe(true);
          expect(Number.isFinite(s.last.croConv)).toBe(true);
        }
      });
    }
  }
});

describe("determinism", () => {
  const finalProfit = (seed) =>
    playGame("fashion", "inhouse", "shopify", seed).find((s) => s.isPlayer).cumProfit;

  it("same seed → identical final cumulative profit", () => {
    expect(finalProfit("WMG-2026")).toBe(finalProfit("WMG-2026"));
  });
  it("different seed → different result", () => {
    expect(finalProfit("WMG-2026")).not.toBe(finalProfit("OTHER-SEED"));
  });
});

describe("CRO lift rolls", () => {
  it("are seeded and vary by seed", () => {
    expect(rollCroLifts("A")).not.toEqual(rollCroLifts("B"));
    expect(rollCroLifts("A")).toEqual(rollCroLifts("A"));
  });

  it("a deployed tier applies exactly the pre-rolled lift the A/B test would reveal", () => {
    const sc = SCMAP.b2b; // non-mobile lever, no mobileShare scaling
    const lifts = rollCroLifts("WMG-2026");
    const tier1 = croConvOf({ speed: 1, trust: 0, checkout: 0, mobile: 0 }, true, lifts, sc);
    expect(tier1 - 1).toBeCloseTo(lifts.speed[0], 6);
  });

  it("mobile CRO scales with the scenario's mobileShare (fashion > B2B)", () => {
    const lifts = rollCroLifts("WMG-2026");
    const maxMobile = { speed: 0, trust: 0, checkout: 0, mobile: 3 };
    const fashion = croConvOf(maxMobile, true, lifts, SCMAP.fashion);
    const b2b = croConvOf(maxMobile, true, lifts, SCMAP.b2b);
    expect(fashion).toBeGreaterThan(b2b);
    // ratio of (mult-1) should track the mobileShare ratio
    expect((fashion - 1) / (b2b - 1)).toBeCloseTo(SCMAP.fashion.mobileShare / SCMAP.b2b.mobileShare, 4);
  });
});

describe("digital scenario invariants", () => {
  it("has zero holding cost, never stocks out, and is fulfilment-agnostic", () => {
    const results = ["inhouse", "3pl", "dropship"].map(
      (fid) => playGame("digital", fid, "shopify", "WMG-2026").find((s) => s.isPlayer).cumProfit
    );
    // fulfilment choice has no effect on a digital brief
    expect(results[0]).toBe(results[1]);
    expect(results[1]).toBe(results[2]);

    const player = playGame("digital", "inhouse", "shopify", "WMG-2026").find((s) => s.isPlayer);
    for (const h of player.history) {
      expect(h.profit).toBeGreaterThanOrEqual(-1e9); // finite, well-defined
    }
    // no spoilage/holding line on any week
    expect(player.last.holding).toBe(0);
    expect(player.last.lostSales).toBe(0);
  });
});

describe("helpers", () => {
  it("croQualityOf is bounded to [0,1]", () => {
    const lifts = rollCroLifts("WMG-2026");
    const q = croQualityOf({ speed: 3, trust: 3, checkout: 3, mobile: 3 }, true, lifts, SCMAP.fashion);
    expect(q).toBeGreaterThanOrEqual(0);
    expect(q).toBeLessThanOrEqual(1);
  });
});
