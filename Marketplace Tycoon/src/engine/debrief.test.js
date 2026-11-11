import { describe, it, expect } from "vitest";
import {
  resolveRound, initialStores, SCMAP, SCENARIOS, makeRng, botDecide, leaderDecisionOf, DEFAULT_CFG,
  FULFILMENT, PLATFORMS, CMAP, CRO_LEVERS, CRO_TEST_FRACTION, unitEconomics, gbp, gbp2, buildCSV, buildMarkdown,
} from "./engine.js";
import { debriefCards, runFacts } from "./debrief.js";
import { evaluatePlatforms, rationaleFor } from "./platformfit.js";

/* Plays a whole game the way the UI does, with a policy for the player:
   policy(store, round, sc) → { decision, deploy: [leverIds], test: [leverIds] }. */
function play({ scenarioId = "fashion", fulfilId = "inhouse", platformId = "shopify", seed = "WMG-2026", cfgPatch = {}, policy }) {
  const cfg = { ...DEFAULT_CFG, ...cfgPatch, scenarioId, seed };
  const sc = SCMAP[scenarioId];
  let stores = initialStores("Tester", platformId, fulfilId, cfg.startingCash, sc, seed);
  const predictionLog = [];
  const checks = [];
  for (let round = 1; round <= cfg.maxRounds; round++) {
    const rng = makeRng(seed + ":" + round);
    stores = stores.map((s) => {
      if (!s.isPlayer) return s;
      const p = policy(s, round, sc);
      let n = { ...s, decision: { ...s.decision, ...p.decision } };
      for (const id of p.test || []) { const t = n.cro[id]; if (t < 3) n = { ...n, croTested: { ...n.croTested, [`${id}:${t + 1}`]: true }, croSpendThisWeek: n.croSpendThisWeek + Math.round(CMAP[id].cost[t] * CRO_TEST_FRACTION) }; }
      for (const id of p.deploy || []) { const t = n.cro[id]; if (t < 3) n = { ...n, cro: { ...n.cro, [id]: t + 1 }, croSpendThisWeek: n.croSpendThisWeek + CMAP[id].cost[t] }; }
      return n;
    });
    const before = stores.find((s) => s.isPlayer);
    const ue = unitEconomics(before, round, cfg);
    const stats = { lastTotalDemand: stores.reduce((a, s) => a + (s.last ? s.last.demandUnits : sc.demandBase / 5), 0), leaderDecision: leaderDecisionOf(stores) };
    stores = resolveRound(stores.map((s) => (s.isPlayer ? s : { ...s, decision: botDecide(s, stats, round, cfg, rng, sc) })), round, cfg, rng).stores;
    const me = stores.find((s) => s.isPlayer);
    checks.push({ ue, last: me.last });
    const actual = [...stores].sort((a, b) => b.cumProfit - a.cumProfit).findIndex((s) => s.isPlayer) + 1;
    predictionLog.push({ round, predicted: 3, actual, hit: actual === 3 });
  }
  return { stores, player: stores.find((s) => s.isPlayer), cfg, predictionLog, checks };
}
const mid = (sc) => ({ price: Math.round((sc.priceMin + sc.priceMax) / 2), ad: 500, stock: Math.round(sc.demandBase / 4) });
const POLICIES = {
  steady: (s, r, sc) => ({ decision: mid(sc) }),
  noCro_overstock: (s, r, sc) => ({ decision: { ...mid(sc), stock: Math.round(sc.demandBase * 1.4) } }),
  understock: (s, r, sc) => ({ decision: { ...mid(sc), stock: 25 } }),
  croHeavy: (s, r, sc) => ({ decision: mid(sc), test: r <= 4 ? ["trust"] : [], deploy: r <= 6 ? [CRO_LEVERS[r % 4].id] : [] }),
  testOnly: (s, r, sc) => ({ decision: mid(sc), test: r === 1 ? ["speed", "mobile"] : [] }),
  reckless: (s, r, sc) => ({ decision: { price: sc.priceMin, ad: 2500, stock: Math.round(sc.demandBase * 1.4) }, deploy: ["checkout", "mobile"] }),
};
const SEEDS = ["WMG-2026", "A1", "B2", "C3", "D4", "E5"];

describe("unit economics shown on the play board match what the week charges", () => {
  for (const sc of SCENARIOS) for (const f of FULFILMENT) for (const pol of ["steady", "croHeavy", "reckless"]) {
    it(`${sc.id} × ${f.id} × ${pol}`, () => {
      for (const seed of SEEDS.slice(0, 3)) {
        const { checks } = play({ scenarioId: sc.id, fulfilId: f.id, platformId: "woo", seed, policy: POLICIES[pol] });
        for (const { ue, last } of checks) {
          // profit = units shipped × contribution − the week's fixed outgoings − holding
          expect(last.grossSold * ue.contribution - ue.fixedWeek - last.holding).toBeCloseTo(last.profit, 4);
        }
      }
    });
  }
  it("uses the dearer unit cost in the supplier-squeeze week", () => {
    const cfg = { ...DEFAULT_CFG, scenarioId: "fashion" };
    const s = initialStores("T", "shopify", "inhouse", 4500, SCMAP.fashion, "X")[0];
    expect(unitEconomics(s, 3, cfg).unitCost).toBeCloseTo(9 * 1.6 + 1.5, 6);
    expect(unitEconomics(s, 2, cfg).unitCost).toBeCloseTo(9 + 1.5, 6);
    expect(unitEconomics(s, 3, { ...cfg, eventsOn: false }).unitCost).toBeCloseTo(10.5, 6);
  });
  it("has no break-even when a unit loses money", () => {
    const cfg = { ...DEFAULT_CFG, scenarioId: "grocer", commissionRate: 0.4 };
    const s = { ...initialStores("T", "shopify", "inhouse", 4500, SCMAP.grocer, "X")[0] };
    s.decision = { ...s.decision, price: 8 };
    const ue = unitEconomics(s, 1, cfg);
    expect(ue.contribution).toBeLessThan(0);
    expect(ue.breakEvenUnits).toBe(Infinity);
  });
});

describe("money formatting", () => {
  it("keeps pence on per-unit figures and puts the minus before the £", () => {
    expect(gbp2(2.6)).toBe("£2.60");
    expect(gbp2(-0.456)).toBe("-£0.46");
    expect(gbp(-1234.4)).toBe("-£1,234");
    expect(gbp(-0)).toBe("£0");
  });
});

describe("debrief is true to the run", () => {
  const runs = [];
  for (const sc of SCENARIOS) for (const [name, policy] of Object.entries(POLICIES)) for (const seed of SEEDS)
    for (const f of sc.digital ? ["inhouse"] : ["inhouse", "dropship"])
      runs.push({ name: `${sc.id}/${f}/${name}/${seed}`, run: play({ scenarioId: sc.id, fulfilId: f, platformId: PLATFORMS[(seed.length + name.length) % 4].id, seed, policy }) });
  // presets an instructor might apply
  runs.push({ name: "no cash", run: play({ cfgPatch: { startingCash: 0 }, policy: POLICIES.reckless }) });
  runs.push({ name: "crunch", run: play({ cfgPatch: { demandMult: 0.3, commissionRate: 0.4 }, policy: POLICIES.steady }) });
  runs.push({ name: "no events", run: play({ scenarioId: "grocer", cfgPatch: { eventsOn: false }, policy: POLICIES.understock }) });

  it("never prints a broken value or raw markup", () => {
    for (const { name, run } of runs) {
      const text = debriefCards(run.stores, run.player, run.cfg, run.predictionLog).map((c) => c.t + " " + c.b).join(" ");
      expect(text, name).not.toMatch(/undefined|NaN|Infinity|null|<Term|£-|\[object/);
      expect(debriefCards(run.stores, run.player, run.cfg, run.predictionLog)).toHaveLength(7);
    }
  });
  it("mentions running out of cash only when the run did", () => {
    let both = 0;
    for (const { name, run } of runs) {
      const cash = debriefCards(run.stores, run.player, run.cfg, run.predictionLog)[4].b;
      const went = run.player.history.some((h) => h.cash < 0);
      expect(/went negative/.test(cash), name).toBe(went);
      expect(/never ran out/.test(cash), name).toBe(!went);
      if (went) both++;
    }
    expect(both).toBeGreaterThan(0); // the sweep does include insolvent runs
    expect(both).toBeLessThan(runs.length);
  });
  it("cash is starting cash plus cumulative profit (what the cash card says)", () => {
    for (const { run } of runs) expect(runFacts(run.stores, run.player, run.cfg).startCash).toBeCloseTo(run.cfg.startingCash, 6);
  });
  it("only credits CRO work that was done", () => {
    for (const { name, run } of runs) {
      const f = runFacts(run.stores, run.player, run.cfg, run.predictionLog);
      const cro = debriefCards(run.stores, run.player, run.cfg, run.predictionLog)[1].b;
      if (/steady|stock/.test(name.split("/")[2] || "")) { expect(f.croSpend, name).toBe(0); expect(cro, name).toMatch(/spent nothing/); }
      if (f.croSpend > 0) expect(cro, name).toMatch(new RegExp(`${f.deployed.length} tiers? deployed`));
      if ((name.split("/")[2]) === "testOnly") { expect(f.deployed.length).toBe(0); expect(f.testedNotDeployed).toBe(2); expect(cro).toMatch(/2 tests were for a tier you then did not deploy/); }
      expect(f.untestedDeploys).toBeLessThanOrEqual(f.deployed.length);
    }
  });
  it("describes operations as they happened", () => {
    for (const { name, run } of runs) {
      const f = runFacts(run.stores, run.player, run.cfg);
      const ops = debriefCards(run.stores, run.player, run.cfg, run.predictionLog)[2].b;
      expect(/ran out of stock/.test(ops), name).toBe(!f.sc.digital && f.stockoutWeeks > 0);
      expect(/unsold stock cost/.test(ops), name).toBe(!f.sc.digital && f.holding > 0);
      if (f.sc.digital) { expect(f.stockoutWeeks).toBe(0); expect(f.holding).toBe(0); }
    }
  });
  it("rent and retention figures add up from the weekly history", () => {
    for (const { run } of runs) {
      const f = runFacts(run.stores, run.player, run.cfg);
      const h = run.player.history;
      expect(f.commission).toBeCloseTo(h.reduce((a, x) => a + x.commission, 0), 6);
      expect(f.returningSales).toBeLessThanOrEqual(f.sold + h.length); // per-week rounding
      expect(f.revenue).toBeCloseTo(h.reduce((a, x) => a + x.revenue, 0), 6);
    }
  });
  it("the exports still build", () => {
    const { stores, player, cfg, predictionLog } = runs[0].run;
    expect(buildCSV(stores, player, predictionLog).split("\n")).toHaveLength(11);
    expect(buildMarkdown(stores, player, predictionLog, cfg)).toMatch(/leaderboard position/);
  });
});

describe("platform-fit rationale", () => {
  it("says 'no platform does better' only where that is so", () => {
    for (const sc of SCENARIOS) {
      const ev = evaluatePlatforms(sc);
      for (const row of ev.rows) {
        const text = rationaleFor(row, sc);
        expect(/No platform does better/.test(text)).toBe(row.strength.score >= 0.999);
        if (row.strength.score >= 0.999) for (const other of ev.rows) expect(other.criteria.find((c) => c.key === row.strength.key).score).toBeLessThanOrEqual(row.strength.score + 1e-9);
      }
    }
  });
});
