import { describe, it, expect } from "vitest";
import {
  EXPERIMENTS, QUIZ, QMAG, GLOSSARY, DEFAULT_CFG, effExperiment, runTest, statAt, lessonContext,
  replicate, guardrailAt, powerAt, requiredSampleSize, buildCSV, buildMarkdown,
} from "./engine.js";
import { reviewLayout, layoutToExperiment, CONTROL_LAYOUT, BRIEFS } from "./wireframe.js";

const SEEDS = Array.from({ length: 200 }, (_, i) => "S" + i);
const exp = (id, cfg = DEFAULT_CFG) => effExperiment(EXPERIMENTS.find((e) => e.id === id), cfg);
const runFor = (e, seed, n = e.suggestN) => {
  const result = runTest(e, { nPerArm: n, seed: `${seed}:${e.id}` });
  return { result, s: statAt(result, n), n, plannedN: n, stoppedEarly: false };
};

describe("lessons hold for the run the student saw", () => {
  it("every experiment's lesson renders, with and without a run, under any effect multiplier", () => {
    for (const mult of [0, 0.4, 1, 1.5]) {
      const cfg = { ...DEFAULT_CFG, effectMult: mult };
      for (const base of EXPERIMENTS) {
        const e = effExperiment(base, cfg);
        const none = base.lesson(lessonContext(e, cfg));
        expect(none.general.length, `${base.id} ×${mult}`).toBeGreaterThan(60);
        expect(none.run).toBeNull();
        for (const seed of ["A", "B", "C"]) {
          const l = base.lesson(lessonContext(e, cfg, runFor(e, seed, 1500)));
          expect(l.run, `${base.id} ×${mult} ${seed}`).toMatch(/run/);
          expect(l.general + l.run).not.toMatch(/undefined|NaN|Infinity/);
        }
      }
    }
  });
  it("with every effect switched off, no lesson claims a real effect", () => {
    const cfg = { ...DEFAULT_CFG, effectMult: 0 };
    for (const base of EXPERIMENTS) {
      const g = base.lesson(lessonContext(effExperiment(base, cfg), cfg)).general;
      expect(g, base.id).not.toMatch(/a real, (small|moderate|large)/);
    }
  });
  it("the null experiment's run text names a false positive exactly when the run was significant", () => {
    const e = exp("imgbg");
    for (const seed of SEEDS.slice(0, 60)) {
      const run = runFor(e, seed);
      const l = e.lesson(lessonContext(e, DEFAULT_CFG, run));
      expect(l.run.includes("false positive"), seed).toBe(run.s.significant);
    }
  });
  it("hard-coded thresholds are gone: α follows the settings", () => {
    const cfg = { ...DEFAULT_CFG, alpha: 0.01 };
    const e = effExperiment(EXPERIMENTS.find((x) => x.id === "imgbg"), cfg);
    expect(e.lesson(lessonContext(e, cfg)).general).toContain("α = 0.01");
    expect(e.lesson(lessonContext(e, cfg)).general).not.toContain("0.05");
  });
});

describe("each experiment's designed story holds at its suggested sample size (200 seeds)", () => {
  const share = (id, pred) => { const e = exp(id); return SEEDS.filter((s) => pred(runTest(e, { nPerArm: e.suggestN, seed: `${s}:${id}` }))).length / SEEDS.length; };
  it("the 'method works' and power-sized experiments are detected at about the target power", () => {
    for (const id of ["cta", "social", "shipping"]) {
      const e = exp(id);
      expect(powerAt(e.truth.pA, e.truth.pB, e.suggestN), id).toBeGreaterThan(0.78);
      expect(share(id, (r) => r.significant && r.diff > 0), id).toBeGreaterThan(0.72);
    }
  });
  it("scarcity can't be powered within the lab's traffic cap — that is its lesson", () => {
    const e = exp("scarcity");
    expect(requiredSampleSize(e.truth.pA, e.truth.pB - e.truth.pA)).toBeGreaterThan(DEFAULT_CFG.maxVisitors);
    expect(e.lesson(lessonContext(e)).general).toContain("more than the 20,000 this lab allows");
  });
  it("promo: the total is a significant win and the returning-customer loss shows", () => {
    expect(share("promo", (r) => r.significant && r.diff > 0)).toBeGreaterThanOrEqual(0.8);
    expect(share("promo", (r) => { const ret = r.segments.find((s) => s.id === "returning"); return ret.significant && ret.diff < 0; })).toBeGreaterThanOrEqual(0.7);
    const e = exp("promo");
    expect(e.baselineRate).toBeCloseTo(e.truth.pA, 4);
  });
  it("checkout: the segments disagree while the total is near a tie, and the lesson says it isn't Simpson's paradox", () => {
    const e = exp("checkout");
    expect(Math.abs(e.truth.pB - e.truth.pA)).toBeLessThan(0.003);
    expect(e.concept).not.toMatch(/Simpson/);
    expect(e.lesson(lessonContext(e)).general).toContain("not Simpson's paradox");
  });
});

describe("reruns behind one run's luck", () => {
  it("a null test ends significant on about α of reruns, and 'ever significant' far more often", () => {
    const e = exp("imgbg");
    const r = replicate(e, { nPerArm: e.suggestN, seed: "LAB-2026:imgbg", k: 200 });
    expect(r.endSig / r.k).toBeGreaterThan(0.02);
    expect(r.endSig / r.k).toBeLessThan(0.1);
    expect(r.everSig / r.k).toBeGreaterThan(0.2);
  });
  it("early stops on a real effect overstate it", () => {
    const e = exp("social");
    const r = replicate(e, { nPerArm: e.suggestN, seed: "LAB-2026:social", k: 120 });
    expect(r.meanDiffAtFirstSig).toBeGreaterThan(1.5 * (e.truth.pB - e.truth.pA));
  });
  it("is deterministic for a seed", () => {
    const e = exp("imgbg");
    expect(replicate(e, { nPerArm: 1000, seed: "X", k: 20 })).toEqual(replicate(e, { nPerArm: 1000, seed: "X", k: 20 }));
  });
});

describe("the guardrail is measured, not given", () => {
  it("is noisy, seeded, and leaves the open-rate run unchanged", () => {
    const e = exp("subject");
    const a = runTest(e, { nPerArm: 2500, seed: "G1" });
    const b = runTest(e, { nPerArm: 2500, seed: "G2" });
    expect(a.gA).not.toBe(b.gA);
    expect(runTest(e, { nPerArm: 2500, seed: "G1" }).gA).toBe(a.gA);
    const noGuard = runTest({ ...e, guardrail: undefined }, { nPerArm: 2500, seed: "G1" });
    expect(noGuard.arms).toEqual(a.arms);
    const g = guardrailAt(statAt(a, 2500));
    expect(g.rB).toBeLessThan(g.rA);
    expect(g.pValue).toBeGreaterThanOrEqual(0);
  });
});

describe("quiz: realistic scenarios, not cited tests", () => {
  it("makes no claim to be a documented test and quotes no precise figures", () => {
    for (const q of QUIZ) {
      expect(q.result, q.id).not.toMatch(/\d+(\.\d+)?%|\$\d|£\d|documented|famous/);
      expect(q.mech.options.join(" "), q.id).not.toMatch(/Simpson/);
    }
  });
  it("sizes are relative lifts, said so", () => {
    for (const m of QMAG.filter((m) => ["small", "moderate", "large"].includes(m.id))) expect(m.label).toMatch(/relative/);
  });
});

describe("glossary", () => {
  it("every term the experiments and quiz link to exists", () => {
    for (const e of EXPERIMENTS) expect(GLOSSARY[e.term], e.id).toBeDefined();
    for (const q of QUIZ) if (q.term) expect(GLOSSARY[q.term], q.id).toBeDefined();
  });
});

describe("wireframe: the control page is the baseline", () => {
  it("submitting the current page unchanged is a 0pp design on every brief", () => {
    for (const b of BRIEFS) {
      const r = reviewLayout(CONTROL_LAYOUT, b);
      expect(r.rate).toBeCloseTo(b.base, 10);
      const x = layoutToExperiment(CONTROL_LAYOUT, b, r);
      expect(x.truth.pB - x.truth.pA).toBeCloseTo(0, 10);
    }
  });
});

describe("exports", () => {
  it("record both judgements of the call, and the CI level follows α", () => {
    const rec = { title: "T", concept: "C", predictedWinner: "b", predictionCorrect: true, predictedBand: "B wins", bandCorrect: false,
      plannedN: 1000, actualN: 1000, stoppedEarly: false, obsRateA: 0.04, obsRateB: 0.05, obsDiff: 0.01, ciLow: -0.001, ciHigh: 0.021,
      pValue: 0.07, significant: false, call: "more", soundCall: true, matchedTruth: null, trueDiff: 0.012, businessNote: "" };
    const csv = buildCSV([rec], DEFAULT_CFG);
    expect(csv.split("\n")[0]).toContain("sound_call,matched_truth");
    expect(csv).toContain("no claim");
    const md = buildMarkdown([rec], { ...DEFAULT_CFG, alpha: 0.1 });
    expect(md).toContain("90% CI");
    expect(md).not.toContain("95% CI");
  });
});

describe("the default seed is typical, and tells every experiment's story", () => {
  it("each default run lands within 1.5 standard errors of the truth and shows its lesson", () => {
    const run = (id) => { const e = exp(id); return { e, r: runTest(e, { nPerArm: e.suggestN, seed: `${DEFAULT_CFG.seed}:${id}` }) }; };
    for (const base of EXPERIMENTS) {
      const { e, r } = run(base.id);
      const se = Math.sqrt(r.rA * (1 - r.rA) / e.suggestN + r.rB * (1 - r.rB) / e.suggestN);
      expect(Math.abs((r.diff - (e.truth.pB - e.truth.pA)) / se), base.id).toBeLessThan(1.5);
    }
    expect(run("cta").r.significant).toBe(true);
    expect(run("imgbg").r.significant).toBe(false);
    expect(run("scarcity").r.significant).toBe(false);
    const ck = run("checkout").r;
    expect(ck.significant).toBe(false);
    expect(ck.segments.every((s) => s.significant)).toBe(true);
    const pr = run("promo").r;
    expect(pr.significant && pr.segments.find((s) => s.id === "returning").diff < 0 && pr.segments.find((s) => s.id === "returning").significant).toBe(true);
    const su = run("subject");
    expect(guardrailAt(statAt(su.r, su.e.suggestN)).significant).toBe(true);
  });
});
