import { describe, it, expect } from "vitest";
import {
  DEFAULT_CFG, INTERVENTIONS, IMAP, initialState, resolveQuarter, previewSingles,
  leaks, bottleneckOf, applyRates, purchasesFor, volumes, STAGE_KEYS,
} from "./engine.js";

const cfg = DEFAULT_CFG;

/* ---- the Chrichton baseline ---------------------------------- */
describe("baseline funnel", () => {
  it("produces ≈ 950 purchases / quarter", () => {
    const p = purchasesFor(cfg.rates, cfg.sessions);
    expect(p).toBeGreaterThan(900);
    expect(p).toBeLessThan(1000);
  });
  it("the biggest MONEY leak is add-to-cart, not the biggest %-gap stage", () => {
    const l = leaks(cfg.rates, cfg.sessions, cfg);
    const bottleneck = bottleneckOf(l);
    expect(bottleneck.stage).toBe("atc");
    // purchase has the largest percentage gap (15pp) yet a smaller £ leak,
    // which is the whole "size it in money" lesson.
    const atc = l.find((x) => x.stage === "atc");
    const purchase = l.find((x) => x.stage === "purchase");
    expect(purchase.gap).toBeGreaterThan(atc.gap); // bigger % gap...
    expect(purchase.leak).toBeLessThan(atc.leak);   // ...smaller £ leak
  });
});

/* ---- determinism --------------------------------------------- */
describe("determinism", () => {
  const run = () => resolveQuarter(initialState(cfg), ["imagery", "trust"], cfg).grossProfit;
  it("same seed → identical profit", () => expect(run()).toBe(run()));
  it("a different seed → a different result", () => {
    const other = { ...cfg, seed: "OTHER" };
    const a = resolveQuarter(initialState(cfg), ["imagery"], cfg).grossProfit;
    const b = resolveQuarter(initialState(other), ["imagery"], other).grossProfit;
    expect(a).not.toBe(b);
  });
});

/* ---- finiteness & in-range ----------------------------------- */
describe("resolveQuarter stays finite and sane", () => {
  it("every combination of a few interventions resolves cleanly", () => {
    const combos = [[], ["speed"], ["imagery", "guest"], ["mobile"], ["shipping", "payments"], ["paid", "trust"], ["retarget"]];
    for (const combo of combos) {
      const r = resolveQuarter(initialState(cfg), combo, cfg);
      for (const k of ["purchases", "revenue", "grossProfit", "cac", "ltv"]) expect(Number.isFinite(r[k]), `${combo}:${k}`).toBe(true);
      for (const s of STAGE_KEYS) {
        expect(r.afterRates[s]).toBeGreaterThanOrEqual(cfg.rates[s] - 1e-9); // never makes a stage worse
        expect(r.afterRates[s]).toBeLessThanOrEqual(cfg.ceilings[s] + 1e-9); // never exceeds the ceiling
      }
    }
  });
});

/* ---- THE sanity test: ceilings & the true bottleneck --------- */
describe("ROI tracks the bottleneck, and ceilings kill ROI", () => {
  it("fixing the true bottleneck (add-to-cart) beats fixing a smaller leak", () => {
    const previews = previewSingles(initialState(cfg), cfg);
    const imagery = previews.find((p) => p.id === "imagery"); // targets atc (the bottleneck)
    const payments = previews.find((p) => p.id === "payments"); // targets purchase (smaller leak)
    expect(imagery.incrProfit).toBeGreaterThan(payments.incrProfit);
  });
  it("spending on a near-ceiling stage yields ≈ zero extra purchases", () => {
    // craft a state where add-to-cart is already at its ceiling
    const maxed = { ...initialState(cfg), rates: { ...cfg.rates, atc: cfg.ceilings.atc } };
    const r = resolveQuarter(maxed, ["imagery"], cfg); // imagery only targets atc
    expect(r.purchases - r.purchasesBefore).toBeLessThan(1); // essentially no gain
    expect(r.perInterventionROI[0].roi).toBeLessThan(0.05);  // money wasted
  });
  it("a healthy fix on the real bottleneck earns a strong positive ROI", () => {
    const r = resolveQuarter(initialState(cfg), ["imagery"], cfg);
    expect(r.perInterventionROI[0].roi).toBeGreaterThan(0.8);
  });
});

/* ---- the moving bottleneck (Theory of Constraints) ----------- */
describe("the bottleneck moves after you fix it", () => {
  it("fixing add-to-cart hands the bottleneck to another stage", () => {
    const q1 = resolveQuarter(initialState(cfg), ["imagery"], cfg);
    expect(q1.before.atc).toBeLessThan(q1.afterRates.atc);    // atc improved
    expect(q1.bottleneck.stage).not.toBe("atc");              // ...so it's no longer the worst leak
  });
});

/* ---- the leaky bucket & the margin trap ---------------------- */
describe("growth-spend traps", () => {
  it("paid traffic into an unfixed funnel earns a poor ROI and a high CAC", () => {
    const paid = resolveQuarter(initialState(cfg), ["paid"], cfg);
    expect(paid.cac).toBeGreaterThan(0);
    expect(paid.ltvCac).toBeLessThan(3); // unhealthy — the bucket is still leaking
    expect(paid.perInterventionROI[0].roi).toBeLessThan(1); // didn't pay for itself
  });
  it("free shipping can lift conversion while cutting profit (the margin trap)", () => {
    const withShip = resolveQuarter(initialState(cfg), ["shipping"], cfg);
    expect(withShip.afterRates.purchase).toBeGreaterThan(cfg.rates.purchase); // conversion up
    expect(withShip.effMargin).toBeLessThan(cfg.margin);                       // margin down
    // its margin cut persists into the next quarter's state
    expect(withShip.newState.marginCut).toBeGreaterThan(0);
  });
});

/* ---- diminishing returns ------------------------------------- */
describe("diminishing returns on a stacked stage", () => {
  it("guest + payments together lift purchase less than the sum of each alone", () => {
    const seed = cfg.seed + ":q1";
    const base = cfg.rates.purchase;
    const guestOnly = applyRates(cfg.rates, [IMAP.guest], cfg, seed).purchase - base;
    const payOnly = applyRates(cfg.rates, [IMAP.payments], cfg, seed).purchase - base;
    const both = applyRates(cfg.rates, [IMAP.guest, IMAP.payments], cfg, seed).purchase - base;
    expect(both).toBeLessThan(guestOnly + payOnly);
    expect(both).toBeGreaterThan(guestOnly); // but still better than guest alone
  });
});

/* ---- volumes for the funnel viz ------------------------------ */
describe("volumes", () => {
  it("narrow monotonically down the funnel", () => {
    const v = volumes(cfg.rates, cfg.sessions);
    for (let i = 1; i < v.length; i++) expect(v[i].count).toBeLessThan(v[i - 1].count);
    expect(v[0].count).toBe(cfg.sessions);
  });
});
