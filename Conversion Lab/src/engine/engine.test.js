import { describe, it, expect } from "vitest";
import {
  runTest, EXPERIMENTS, effExperiment, requiredSampleSize, twoPropTest,
  normalCdf, normalQuantile, trueBand, callCorrect, statAt, aggregateTruth,
  QUIZ, CRO_STACK, guardrailPerThousand,
} from "./engine.js";

/* ---- the normal distribution maths -------------------------- */
describe("normal distribution", () => {
  it("CDF hits known landmarks", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
    expect(normalCdf(1.959964)).toBeCloseTo(0.975, 4);
    expect(normalCdf(-1.959964)).toBeCloseTo(0.025, 4);
  });
  it("quantile is the inverse of the CDF", () => {
    for (const p of [0.025, 0.1, 0.5, 0.8, 0.975]) {
      expect(normalCdf(normalQuantile(p))).toBeCloseTo(p, 4);
    }
    expect(normalQuantile(0.975)).toBeCloseTo(1.959964, 3);
    expect(normalQuantile(0.8)).toBeCloseTo(0.841621, 3);
  });
});

/* ---- the z-test against a hand-worked example --------------- */
describe("two-proportion z-test", () => {
  it("matches a textbook calculation", () => {
    // A: 40/1000 = 4.0%, B: 55/1000 = 5.5%
    const t = twoPropTest(1000, 40, 1000, 55, 0.05);
    expect(t.rA).toBeCloseTo(0.04, 6);
    expect(t.rB).toBeCloseTo(0.055, 6);
    expect(t.diff).toBeCloseTo(0.015, 6);
    // pooled p = 95/2000 = 0.0475, SE = sqrt(.0475*.9525*(2/1000)) ≈ 0.009515
    expect(t.z).toBeCloseTo(0.015 / 0.0095154, 2);
    expect(t.pValue).toBeGreaterThan(0); expect(t.pValue).toBeLessThan(1);
  });
  it("identical arms give z=0, p=1, not significant", () => {
    const t = twoPropTest(5000, 250, 5000, 250, 0.05);
    expect(t.z).toBe(0);
    expect(t.pValue).toBeCloseTo(1, 6);
    expect(t.significant).toBe(false);
  });
  it("CI on the difference brackets the point estimate", () => {
    const t = twoPropTest(2000, 80, 2000, 120, 0.05);
    expect(t.ciLow).toBeLessThan(t.diff);
    expect(t.ciHigh).toBeGreaterThan(t.diff);
  });
});

/* ---- sample-size planner ------------------------------------ */
describe("requiredSampleSize", () => {
  it("matches the standard formula for a 4%→6% lift", () => {
    // n ≈ (1.96+0.8416)^2 (.04*.96 + .06*.94) / .02^2
    const n = requiredSampleSize(0.04, 0.02, 0.05, 0.8);
    expect(n).toBeGreaterThan(1500);
    expect(n).toBeLessThan(2200);
  });
  it("smaller effects need (much) larger samples", () => {
    const big = requiredSampleSize(0.045, 0.012, 0.05, 0.8);
    const tiny = requiredSampleSize(0.045, 0.003, 0.05, 0.8);
    expect(tiny).toBeGreaterThan(big * 5);
  });
  it("returns Infinity for a zero MDE", () => {
    expect(requiredSampleSize(0.045, 0, 0.05, 0.8)).toBe(Infinity);
  });
});

/* ---- determinism -------------------------------------------- */
describe("determinism", () => {
  const run = (seed) => runTest(effExperiment(EXPERIMENTS[0]), { nPerArm: 1500, seed });
  it("same seed → byte-identical result", () => {
    expect(run("LAB-2026")).toEqual(run("LAB-2026"));
  });
  it("different seed → different conversions", () => {
    expect(run("LAB-2026").arms.B.conv).not.toBe(run("OTHER").arms.B.conv);
  });
});

/* ---- finiteness & in-range over the whole arc --------------- */
describe("every experiment runs finite and in-range", () => {
  for (const exp of EXPERIMENTS) {
    it(`${exp.id} produces well-formed stats`, () => {
      const r = runTest(effExperiment(exp), { nPerArm: 2000, seed: "LAB-2026" });
      for (const k of ["diff", "z", "pValue", "ciLow", "ciHigh"]) {
        expect(Number.isFinite(r[k]), `${exp.id}.${k}`).toBe(true);
      }
      expect(r.pValue).toBeGreaterThanOrEqual(0);
      expect(r.pValue).toBeLessThanOrEqual(1);
      expect(r.arms.A.rate).toBeGreaterThanOrEqual(0);
      expect(r.arms.B.rate).toBeLessThanOrEqual(1);
      expect(r.series.length).toBeGreaterThan(0);
      expect(r.series[r.series.length - 1].n).toBe(2000);
    });
  }
});

/* ---- the segmentation / Simpson's case ---------------------- */
describe("segmented checkout experiment", () => {
  const exp = EXPERIMENTS.find((e) => e.id === "checkout");
  it("aggregate hides opposite per-segment effects", () => {
    const agg = aggregateTruth(exp.segments);
    const mobile = exp.segments.find((s) => s.id === "mobile");
    const desktop = exp.segments.find((s) => s.id === "desktop");
    // aggregate is close to a tie...
    expect(Math.abs(agg.pB - agg.pA)).toBeLessThan(0.005);
    // ...while the segments pull hard in opposite directions
    expect(mobile.pB - mobile.pA).toBeGreaterThan(0.01);
    expect(desktop.pB - desktop.pA).toBeLessThan(-0.01);
  });
  it("runTest returns a per-segment breakdown that recovers the directions", () => {
    const r = runTest(effExperiment(exp), { nPerArm: 12000, seed: "LAB-2026" });
    const m = r.segments.find((s) => s.id === "mobile");
    const d = r.segments.find((s) => s.id === "desktop");
    expect(m.diff).toBeGreaterThan(0); // one-page wins on mobile
    expect(d.diff).toBeLessThan(0);    // one-page loses on desktop
  });
});

/* ---- THE statistical sanity check (the class artifact) ------
   The whole game rests on the engine behaving like a real test:
   over many seeds, a true-null experiment must false-positive at
   ≈ α, and a properly-powered real effect must be detected at
   ≈ the target power. */
describe("statistical calibration over many seeds", () => {
  const SEEDS = 240;
  const ALPHA = 0.05;

  it(`a true-null experiment is significant on ≈ α of seeds`, () => {
    const nullExp = { id: "null", truth: { pA: 0.05, pB: 0.05 } };
    let sig = 0;
    for (let s = 0; s < SEEDS; s++) {
      const r = runTest(nullExp, { nPerArm: 3000, alpha: ALPHA, seed: "null-" + s, checkpoints: 1 });
      if (r.significant) sig++;
    }
    const fpr = sig / SEEDS;
    expect(fpr).toBeGreaterThan(0.02);
    expect(fpr).toBeLessThan(0.10);
  });

  it(`a power-sized real effect is detected on ≈ 80% of seeds`, () => {
    const pA = 0.05, pB = 0.08, power = 0.8;
    const n = requiredSampleSize(pA, pB - pA, ALPHA, power);
    const realExp = { id: "real", truth: { pA, pB } };
    let sig = 0;
    for (let s = 0; s < SEEDS; s++) {
      const r = runTest(realExp, { nPerArm: n, alpha: ALPHA, seed: "real-" + s, checkpoints: 1 });
      if (r.significant) sig++;
    }
    const empiricalPower = sig / SEEDS;
    expect(empiricalPower).toBeGreaterThan(0.70);
    expect(empiricalPower).toBeLessThan(0.90);
  });

  it("peeking inflates the false-positive rate above α", () => {
    // Same true-null experiment, but call it significant if it EVER
    // crossed the line at any checkpoint (optional stopping).
    const nullExp = { id: "null", truth: { pA: 0.05, pB: 0.05 } };
    let peeked = 0;
    for (let s = 0; s < SEEDS; s++) {
      const r = runTest(nullExp, { nPerArm: 3000, alpha: ALPHA, seed: "peek-" + s, checkpoints: 40 });
      if (r.firstSignificantN != null) peeked++;
    }
    expect(peeked / SEEDS).toBeGreaterThan(0.05); // demonstrably worse than honest α
  });
});

/* ---- new experiments: promo-segmentation & vanity metric ---- */
describe("homepage promo — a winning aggregate that hurts a segment", () => {
  const exp = EXPERIMENTS.find((e) => e.id === "promo");
  it("aggregate favours B while returning customers are harmed", () => {
    const agg = aggregateTruth(exp.segments);
    expect(agg.pB).toBeGreaterThan(agg.pA); // overall, B wins
    const returning = exp.segments.find((s) => s.id === "returning");
    expect(returning.pB).toBeLessThan(returning.pA); // but loyal customers lose
  });
  it("runTest recovers new-up / returning-down", () => {
    const r = runTest(effExperiment(exp), { nPerArm: 12000, seed: "LAB-2026" });
    expect(r.segments.find((s) => s.id === "new").diff).toBeGreaterThan(0);
    expect(r.segments.find((s) => s.id === "returning").diff).toBeLessThan(0);
  });
});

describe("vanity-metric experiment guardrail", () => {
  const exp = EXPERIMENTS.find((e) => e.id === "subject");
  it("B wins the tested metric but loses on the guardrail", () => {
    expect(exp.truth.pB).toBeGreaterThan(exp.truth.pA); // higher CTR
    const ga = guardrailPerThousand(exp, exp.truth.pA, "A");
    const gb = guardrailPerThousand(exp, exp.truth.pB, "B");
    expect(gb).toBeLessThan(ga); // fewer real leads
    expect(guardrailPerThousand({}, 0.1, "A")).toBeNull(); // no guardrail → null
  });
});

/* ---- Which Test Won? quiz data integrity -------------------- */
describe("quiz data", () => {
  it("has well-formed cases", () => {
    expect(QUIZ.length).toBeGreaterThanOrEqual(10);
    const stacks = new Set(CRO_STACK.map((s) => s.k));
    const dirs = ["a", "b", "none", "depends"];
    const mags = ["none", "small", "moderate", "large", "reverses"];
    for (const q of QUIZ) {
      expect(dirs).toContain(q.answer);
      expect(mags).toContain(q.mag);
      expect(q.a && q.b && q.result && q.principle && q.mock).toBeTruthy();
      // mechanism MCQ: 4 options with a valid correct index
      expect(Array.isArray(q.mech.options) && q.mech.options.length === 4).toBe(true);
      expect(q.mech.correct).toBeGreaterThanOrEqual(0);
      expect(q.mech.correct).toBeLessThan(4);
      expect(stacks.has(q.stack)).toBe(true);
    }
    expect(new Set(QUIZ.map((q) => q.id)).size).toBe(QUIZ.length); // unique ids
    // at least one null-result and one segment-reversal case (richer answer set)
    expect(QUIZ.some((q) => q.answer === "none")).toBe(true);
    expect(QUIZ.some((q) => q.answer === "depends")).toBe(true);
  });
  it("does NOT reuse the in-class quiz scenarios (no spoilers)", () => {
    // The class "CRO Quiz" uses these exact A/B cases — the in-game round must
    // teach with DIFFERENT scenarios so playing it doesn't spoil the lesson.
    const classMocks = ["hero", "form", "price", "email", "cta", "colour", "icon", "halloween", "order", "choice"];
    for (const q of QUIZ) expect(classMocks).not.toContain(q.mock);
  });
});

/* ---- prediction scoring ------------------------------------- */
describe("scoring helpers", () => {
  it("trueBand classifies the difference", () => {
    expect(trueBand(0).id).toBe("none");
    expect(trueBand(0.0005).id).toBe("none");
    expect(trueBand(0.012).id).toBe("bmod");
    expect(trueBand(0.05).id).toBe("blarge");
    expect(trueBand(-0.01).id).toBe("a");
  });
  it("callCorrect rewards naming the winner only when significant", () => {
    const sig = { significant: true, diff: 0.012 };
    expect(callCorrect("b", sig, 0.012)).toBe(true);
    expect(callCorrect("a", sig, 0.012)).toBe(false);
    const ns = { significant: false, diff: 0.004 };
    expect(callCorrect("more", ns, 0.012)).toBe(true); // real effect, underpowered → honest call is "more data"
    expect(callCorrect("b", ns, 0.012)).toBe(false);
    expect(callCorrect("none", ns, 0.0)).toBe(true);   // truly null → "no difference" is fair
  });
  it("statAt finds the checkpoint at the stopping point", () => {
    const r = runTest(effExperiment(EXPERIMENTS[0]), { nPerArm: 2000, seed: "LAB-2026" });
    const early = statAt(r, 500);
    expect(early.n).toBeLessThanOrEqual(500);
    expect(early.n).toBeGreaterThan(0);
  });
});
