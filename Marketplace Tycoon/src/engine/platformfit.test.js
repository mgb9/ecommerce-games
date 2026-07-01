import { describe, it, expect } from "vitest";
import { PLATFORMS, SCENARIOS, SCMAP } from "./engine.js";
import { CRITERIA, evaluatePlatforms, weightsFor, fitOf } from "./platformfit.js";

describe("weightsFor", () => {
  it("returns a normalised weight per criterion (sums to 1)", () => {
    for (const s of SCENARIOS) {
      const w = weightsFor(s);
      expect(Object.keys(w).sort()).toEqual(CRITERIA.map((c) => c.key).sort());
      const sum = Object.values(w).reduce((a, v) => a + v, 0);
      expect(sum).toBeCloseTo(1, 6);
    }
  });
  it("weights organic reach by the scenario's stated organic reliance", () => {
    // B2B has the highest organicReliance, fashion the lowest (0).
    expect(weightsFor(SCMAP.b2b).organic).toBeGreaterThan(weightsFor(SCMAP.fashion).organic);
    expect(weightsFor(SCMAP.fashion).organic).toBe(0);
  });
  it("weights running cost more heavily for a thin-margin brief", () => {
    // Grocer margins are tight; digital margins are huge.
    expect(weightsFor(SCMAP.grocer).cost).toBeGreaterThan(weightsFor(SCMAP.digital).cost);
  });
});

describe("evaluatePlatforms", () => {
  it("scores all four platforms and sorts best-first", () => {
    const { rows } = evaluatePlatforms(SCMAP.fashion);
    expect(rows).toHaveLength(PLATFORMS.length);
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1].fit).toBeGreaterThanOrEqual(rows[i].fit);
    expect(rows.every((r) => r.fit >= 0 && r.fit <= 1)).toBe(true);
  });
  it("accepts a scenario id or object and agrees", () => {
    expect(evaluatePlatforms("b2b").recommended).toBe(evaluatePlatforms(SCMAP.b2b).recommended);
  });
  it("is deterministic", () => {
    expect(evaluatePlatforms("grocer")).toEqual(evaluatePlatforms("grocer"));
  });
  it("gives each row a strength, weakness and verdict", () => {
    const { rows } = evaluatePlatforms(SCMAP.digital);
    for (const r of rows) {
      expect(r.strength.key).toBeTruthy();
      expect(r.weakness.key).toBeTruthy();
      expect(["Strong fit", "Workable", "Poor fit"]).toContain(r.verdict);
    }
  });
  it("recommends the WooCommerce/organic stack for the SEO-reliant B2B brief over the cheap templated Wix", () => {
    const { rows } = evaluatePlatforms(SCMAP.b2b);
    const rank = (id) => rows.findIndex((r) => r.id === id);
    expect(rank("woo")).toBeLessThan(rank("wix"));
  });
});

describe("fitOf — debrief comparison", () => {
  it("flags when the player's pick is the recommended one", () => {
    const rec = evaluatePlatforms("fashion").recommended;
    expect(fitOf("fashion", rec).matchedBest).toBe(true);
    expect(fitOf("fashion", rec).rank).toBe(1);
  });
  it("ranks a non-recommended pick below first and returns its row", () => {
    const { rows, recommended } = evaluatePlatforms("grocer");
    const other = rows.find((r) => r.id !== recommended).id;
    const f = fitOf("grocer", other);
    expect(f.matchedBest).toBe(false);
    expect(f.rank).toBeGreaterThan(1);
    expect(f.row.id).toBe(other);
    expect(f.total).toBe(PLATFORMS.length);
  });
});
