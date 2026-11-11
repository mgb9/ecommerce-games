import { describe, it, expect } from "vitest";
import {
  DEFAULT_CFG, INTERVENTIONS, IMAP, STAGE_KEYS, NONE, initialState, resolveQuarter, previewSingles, leaks, bottleneckOf,
  leakAnswer, bestBets, buildRecord, buildDebrief, buildCSV, buildMarkdown, makeRng, quartersLeft, actsOn,
} from "./engine.js";

const cfg = DEFAULT_CFG;
const PRESETS = {
  default: {},
  topHeavy: { rates: { ...cfg.rates, view: 0.42, atc: 0.06 } },
  abandonment: { rates: { ...cfg.rates, checkout: 0.36, purchase: 0.42 } },
  tight: { budget: 8000 },
  cheapTraffic: { aov: 70, margin: 0.58 },
  atBenchmark: { rates: { ...cfg.benchmarks } },
  long: { quarters: 8, budget: 40000 },
  short: { quarters: 2 },
};
// policies: how a student might play
const greedy = (st, c, singles) => { let b = c.budget; const out = []; for (const s of singles) if (s.planRoi >= 1 && s.cost <= b) { out.push(s.id); b -= s.cost; } return out; };
const nothing = () => [];
const trafficOnly = () => ["paid"];
const shippingFirst = (st) => (st.deployed.includes("shipping") ? ["retarget"] : ["shipping", "paid"]);
const random = (st, c, singles, rng) => { let b = c.budget; const out = []; for (const s of singles) if (rng() < 0.5 && s.cost <= b) { out.push(s.id); b -= s.cost; } return out; };
const POLICIES = { greedy, nothing, trafficOnly, shippingFirst, random };

function play(c, policy, rng = makeRng("policy")) {
  let st = initialState(c); const records = [];
  while (st.quarter <= c.quarters) {
    const singles = previewSingles(st, c);
    const chosen = policy(st, c, singles, rng);
    const r = resolveQuarter(st, chosen, c);
    records.push(buildRecord(st, c, { predLeak: leakAnswer(leaks(st.rates, c.sessions, c, st.marginCut)), predBest: "imagery", chosen }, r));
    st = r.newState;
  }
  return { records, state: st };
}

describe("the bottleneck is a real leak or nothing", () => {
  it("no stage below benchmark → no bottleneck, and the right call is 'none'", () => {
    const c = { ...cfg, ...PRESETS.atBenchmark };
    const l = leaks(c.rates, c.sessions, c);
    expect(bottleneckOf(l)).toBeNull();
    expect(leakAnswer(l)).toBe(NONE);
    const r = resolveQuarter(initialState(c), ["imagery"], c);
    expect(r.bottleneck).toBeNull();
  });
  it("a leak is valued at the margin in force (after a free-shipping cut it is worth less)", () => {
    const a = leaks(cfg.rates, cfg.sessions, cfg)[1].leak;
    const b = leaks(cfg.rates, cfg.sessions, cfg, cfg.shippingMarginCut)[1].leak;
    expect(b).toBeCloseTo(a * (cfg.margin - cfg.shippingMarginCut) / cfg.margin, 6);
  });
});

describe("return over the plan", () => {
  it("a one-off fix earns in every quarter left; bought traffic only in its own", () => {
    const s = previewSingles(initialState(cfg), cfg);
    const imagery = s.find((x) => x.id === "imagery"), paid = s.find((x) => x.id === "paid");
    expect(imagery.planProfit).toBeCloseTo(imagery.incrProfit * cfg.quarters, 6);
    expect(paid.planProfit).toBe(paid.incrProfit);
    const lastQ = { ...initialState(cfg), quarter: cfg.quarters };
    expect(quartersLeft(lastQ, cfg)).toBe(1);
    for (const x of previewSingles(lastQ, cfg)) expect(x.planRoi).toBeCloseTo(x.roi, 9);
  });
  it("a durable fix that falls short in its first quarter is not counted as money lost", () => {
    const r = resolveQuarter(initialState(cfg), ["payments"], cfg);
    const f = r.perInterventionROI[0];
    expect(f.roi).toBeLessThan(1);       // doesn't pay back within the quarter…
    expect(f.planRoi).toBeGreaterThan(1); // …but does by the end of the plan
    const rec = buildRecord(initialState(cfg), cfg, { predLeak: "atc", predBest: "imagery", chosen: ["payments"] }, r);
    expect(rec.notPaidBack).toBe(0);
  });
  it("what the reveal says a lone purchase returns is what buying it alone returns", () => {
    for (const seed of ["A", "B", "FUNNEL-2026"]) {
      const c = { ...cfg, seed };
      for (const p of previewSingles(initialState(c), c)) {
        const got = resolveQuarter(initialState(c), [p.id], c).perInterventionROI[0];
        expect(got.planProfit).toBeCloseTo(p.planProfit, 6);
        expect(got.incrProfit).toBeCloseTo(p.incrProfit, 6);
      }
    }
  });
  it("the best bet is 'none' exactly when nothing earns back its cost", () => {
    const c = { ...cfg, rates: { ...cfg.ceilings }, quarters: 1, aov: 15, margin: 0.15 };
    const s = previewSingles(initialState(c), c);
    expect(s[0].planRoi).toBeLessThan(1);
    expect(bestBets(s)).toEqual([NONE]);
    expect(bestBets(previewSingles(initialState(cfg), cfg))).toEqual(["imagery"]);
  });
  it("in the default game the first quarter's best bet is the imagery fix, for any seed", () => {
    for (let i = 0; i < 200; i++) { const c = { ...cfg, seed: "S" + i }; expect(bestBets(previewSingles(initialState(c), c))[0]).toBe("imagery"); }
  });
});

describe("what a fix acts on", () => {
  it("names a stage and strength for every fix; mobile scales with the mobile share", () => {
    for (const i of INTERVENTIONS) expect(actsOn(i, cfg).length).toBeGreaterThan(0);
    expect(actsOn(IMAP.imagery, cfg)).toEqual([{ stage: "atc", label: "Add to cart", strength: "strong" }]);
    expect(actsOn(IMAP.mobile, cfg).every((a) => a.strength === "light")).toBe(true);
    expect(actsOn(IMAP.mobile, { ...cfg, mobileShare: 0.9 }).every((a) => a.strength === "moderate")).toBe(true);
  });
});

describe("the debrief is true to the run — every preset, policy and seed", () => {
  const runs = [];
  for (const [pn, patch] of Object.entries(PRESETS)) for (const [pol, fn] of Object.entries(POLICIES)) for (let i = 0; i < 12; i++) {
    const c = { ...cfg, ...patch, seed: `D${i}` };
    runs.push({ name: `${pn}/${pol}/${i}`, c, ...play(c, fn, makeRng(`${pn}${pol}${i}`)) });
  }
  it("renders five cards with no broken numbers", () => {
    for (const run of runs) {
      const cards = buildDebrief(run.records, run.c);
      expect(cards.map((x) => x.id), run.name).toEqual(["sizing", "moving", "traffic", "margin", "payback"]);
      for (const card of cards) expect(card.body, run.name).not.toMatch(/NaN|Infinity|undefined|null|£-/);
      expect(buildMarkdown(run.records, run.c, run.state.cumProfit)).not.toMatch(/NaN|Infinity|undefined/);
      expect(buildCSV(run.records, run.c)).not.toMatch(/NaN|Infinity|undefined|null/);
    }
  });
  it("only says the biggest gap and the biggest leak differed when they did", () => {
    for (const run of runs) {
      const body = buildDebrief(run.records, run.c)[0].body;
      const differed = run.records.some((r) => r.actualLeak !== NONE && r.gapStage !== NONE && r.gapStage !== r.actualLeak);
      expect(/but the biggest money leak was/.test(body), run.name).toBe(differed);
    }
    // the abandonment preset is the counter-example the old fixed text got wrong
    const c = { ...cfg, ...PRESETS.abandonment };
    expect(buildDebrief(play(c, nothing).records, c)[0].body).toMatch(/was also the biggest money leak/);
  });
  it("only says the bottleneck moved when it did", () => {
    for (const run of runs) {
      const body = buildDebrief(run.records, run.c)[1].body;
      const seq = [...run.records.map((r) => r.actualLeak), run.records.at(-1).nextLeak];
      const moved = seq.some((k) => k !== seq[0]);
      expect(/^The biggest leak went /.test(body), run.name).toBe(moved);
    }
  });
  it("talks about bought traffic only if traffic was bought, and judges it by its own ratio", () => {
    for (const run of runs) {
      const body = buildDebrief(run.records, run.c)[2].body;
      const bought = run.records.filter((r) => r.acqSpend > 0);
      expect(/^You bought no traffic/.test(body), run.name).toBe(bought.length === 0);
      expect(/costs more than they will ever return/.test(body), run.name).toBe(bought.some((r) => r.ltvCac < 1));
      if (/Each cleared the 3× rule/.test(body)) expect(bought.every((r) => r.ltvCac >= 3), run.name).toBe(true);
    }
  });
  it("says free shipping added or cost money according to what it did", () => {
    for (const run of runs) {
      const body = buildDebrief(run.records, run.c)[3].body;
      const q = run.records.find((r) => r.shippingNow);
      expect(/^You offered free shipping/.test(body), run.name).toBe(!!q);
      if (q) expect(/it added about/.test(body), run.name).toBe(q.fixes.find((f) => f.id === "shipping").planProfit >= 0);
    }
  });
  it("counts as not paid back exactly the purchases under 1× over the plan", () => {
    for (const run of runs) {
      const body = buildDebrief(run.records, run.c)[4].body;
      const lost = run.records.flatMap((r) => r.fixes.filter((f) => f.planRoi < 1));
      const spend = run.records.reduce((a, r) => a + r.spend, 0);
      if (spend > 0) expect(/every purchase had earned back its cost/.test(body), run.name).toBe(lost.length === 0);
      else expect(body).toMatch(/You spent nothing/);
    }
  });
});

describe("records", () => {
  it("survive JSON (they are saved to the session and exported)", () => {
    const { records } = play(cfg, greedy);
    expect(JSON.parse(JSON.stringify(records))).toEqual(records);
  });
  it("a quarter with nothing bought resolves, with profit equal to the untouched funnel", () => {
    const r = resolveQuarter(initialState(cfg), [], cfg);
    expect(r.spend).toBe(0);
    expect(r.ltvCac).toBeNull();
    for (const k of STAGE_KEYS) expect(r.afterRates[k]).toBe(cfg.rates[k]);
  });
});
