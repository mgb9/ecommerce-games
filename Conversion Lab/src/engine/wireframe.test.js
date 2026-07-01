import { describe, it, expect } from "vitest";
import {
  PALETTE, ESSENTIALS, BRIEFS, BMAP, CONTROL_LAYOUT, LOAD_BUDGET,
  loadTimeMs, reviewLayout, layoutToExperiment,
} from "./wireframe.js";
import { runTest } from "./engine.js";

const CORE = ["image", "title", "price", "atc"];
const chk = (r, id) => r.checks.find((c) => c.id === id);
const rate = (ids, brief) => reviewLayout(ids, brief).rate;

describe("palette & briefs", () => {
  it("has the four essentials and every item carries a weight", () => {
    expect(ESSENTIALS.sort()).toEqual(["atc", "image", "price", "title"]);
    expect(PALETTE.every((c) => typeof c.wt === "number" && c.role)).toBe(true);
  });
  it("has three distinct-context briefs", () => {
    expect(BRIEFS.map((b) => b.id).sort()).toEqual(["b2b", "flash", "returning"]);
  });
});

describe("essentials gate", () => {
  it("missing essentials mark the page unbuyable and crush the rate", () => {
    const r = reviewLayout(["image", "title"], "flash");
    expect(r.buyable).toBe(false);
    expect(r.missingEssentials.sort()).toEqual(["atc", "price"]);
    expect(r.rate).toBeLessThan(BMAP.flash.base);
  });
  it("a complete page is buyable", () => {
    expect(reviewLayout(CORE, "flash").buyable).toBe(true);
  });
});

describe("mechanism 1 — performance budget", () => {
  it("adding a heavy autoplay video increases load time and cuts the rate", () => {
    const base = [...CORE, "reviews"];
    const withVideo = [...base, "video"];
    expect(loadTimeMs(withVideo.map((x) => x), BMAP.flash)).toBeGreaterThan(loadTimeMs(base, BMAP.flash));
    expect(rate(withVideo, "flash")).toBeLessThan(rate(base, "flash"));
  });
  it("the same heavy page is punished harder on mobile-flash than desktop-B2B", () => {
    const heavy = [...CORE, "video", "related", "reviews"];
    const flashDrop = BMAP.flash.base && (rate(CORE, "flash") - rate(heavy, "flash"));
    const b2bDrop = rate(CORE, "b2b") - rate(heavy, "b2b");
    // compare as fractions of each brief's base to normalise
    expect((rate(CORE, "flash") - rate(heavy, "flash")) / BMAP.flash.base)
      .toBeGreaterThan((rate(CORE, "b2b") - rate(heavy, "b2b")) / BMAP.b2b.base);
  });
  it("flags the load budget when the page is heavy", () => {
    const heavy = [...CORE, "video", "related", "reviews", "social"];
    expect(reviewLayout(heavy, "flash").loadMs).toBeGreaterThan(LOAD_BUDGET);
    expect(chk(reviewLayout(heavy, "flash"), "perf").state).not.toBe("pass");
  });
});

describe("mechanism 2 — brief/device context", () => {
  it("the optimal layout is NOT the same across briefs", () => {
    // A page tuned for the flash sale (urgency, light) vs one tuned for B2B (detail, trust, no urgency)
    const flashPage = ["image", "title", "price", "atc", "scarcity", "trust"];
    const b2bPage = ["image", "title", "price", "atc", "desc", "reviews", "trust"];
    // each page should score better on the brief it was designed for
    expect(rate(flashPage, "flash")).toBeGreaterThan(rate(b2bPage, "flash"));
    expect(rate(b2bPage, "b2b")).toBeGreaterThan(rate(flashPage, "b2b"));
  });
  it("the fold is shorter for the mobile-heavy brief", () => {
    expect(reviewLayout(CORE, "flash").fold).toBeLessThan(reviewLayout(CORE, "b2b").fold);
  });
  it("a full description is decisive for B2B, near-irrelevant for the flash sale", () => {
    const withoutDesc = CORE;
    const withDesc = [...CORE, "desc"];
    const b2bGain = rate(withDesc, "b2b") - rate(withoutDesc, "b2b");
    const flashGain = rate(withDesc, "flash") - rate(withoutDesc, "flash");
    expect(b2bGain).toBeGreaterThan(flashGain);
  });
  it("trust signals lift a cold audience proportionally more than a warm one", () => {
    // proportional lift isolates the trust multiplier from base/fold differences
    const liftFlash = rate([...CORE, "reviews"], "flash") / rate(CORE, "flash");
    const liftReturning = rate([...CORE, "reviews"], "returning") / rate(CORE, "returning");
    expect(liftFlash).toBeGreaterThan(liftReturning);
  });
});

describe("mechanism 3 — interaction effects & diminishing returns", () => {
  it("fake urgency HELPS the flash sale but HURTS B2B", () => {
    expect(rate([...CORE, "scarcity"], "flash")).toBeGreaterThan(rate(CORE, "flash"));
    expect(rate([...CORE, "scarcity"], "b2b")).toBeLessThan(rate(CORE, "b2b"));
  });
  it("stacking scarcity + countdown is worse than one alone (protests too much)", () => {
    const one = [...CORE, "scarcity"];
    const two = [...CORE, "scarcity", "countdown"];
    expect(rate(two, "flash")).toBeLessThan(rate(one, "flash"));
  });
  it("piling on nudges triggers an overload penalty", () => {
    const focused = [...CORE, "reviews"];
    const overloaded = [...CORE, "reviews", "scarcity", "countdown", "social", "related"];
    expect(chk(reviewLayout(overloaded, "flash"), "focus").state).not.toBe("pass");
    expect(rate(overloaded, "flash")).toBeLessThan(rate(focused, "flash"));
  });
  it("a second social-proof signal adds little on top of reviews", () => {
    const reviewsOnly = rate([...CORE, "reviews"], "flash") - rate(CORE, "flash");
    const bothStack = rate([...CORE, "reviews", "social"], "flash") - rate([...CORE, "reviews"], "flash");
    expect(bothStack).toBeLessThan(reviewsOnly);
  });
});

describe("mechanism 4 — honest predicted rate feeds a real test", () => {
  it("returns an honest predicted rate and lift on the brief base", () => {
    const r = reviewLayout([...CORE, "reviews", "trust", "desc"], "b2b");
    expect(r.base).toBe(BMAP.b2b.base);
    expect(r.lift).toBeCloseTo(r.rate - r.base, 9);
  });
  it("builds a runnable experiment (control = brief base, variant = design)", () => {
    const brief = "b2b";
    const r = reviewLayout([...CORE, "reviews", "trust", "desc"], brief);
    const exp = layoutToExperiment([...CORE, "reviews", "trust", "desc"], brief, r);
    expect(exp.truth.pA).toBe(BMAP.b2b.base);
    expect(exp.truth.pB).toBe(r.rate);
    const res = runTest(exp, { nPerArm: 4000, seed: "WF" });
    expect(res.arms.A.n).toBe(4000);
  });
  it("same (layout, brief, seed) → identical run", () => {
    const exp = layoutToExperiment([...CORE, "reviews"], "flash");
    const a = runTest(exp, { nPerArm: 1500, seed: "S" });
    const b = runTest(exp, { nPerArm: 1500, seed: "S" });
    expect(a.arms).toEqual(b.arms);
  });
});

describe("determinism & grading", () => {
  it("is deterministic for a given (layout, brief)", () => {
    expect(reviewLayout([...CORE, "reviews"], "flash")).toEqual(reviewLayout([...CORE, "reviews"], "flash"));
  });
  it("an empty layout grades E", () => {
    expect(reviewLayout([], "flash").grade).toBe("E");
  });
});
