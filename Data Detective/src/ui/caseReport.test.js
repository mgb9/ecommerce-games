import { describe, it, expect } from "vitest";
import { CASES, generateCase, scoreDiagnosis, reviewTrail } from "../engine/engine.js";
import { FIELD_VERDICT_TRUTH, FIELD_GUN_TRUTH, scoreFieldDiagnosis } from "../engine/fieldcase.js";
import { generatedCaseReport } from "./caseReport.js";
import { fieldCaseReport } from "./field/fieldReport.js";

describe("downloadable case report", () => {
  it("generated case: calls vs truth, the trail in order, the lesson and reflection prompts", () => {
    const caseData = generateCase(CASES[1].id, "DD-2026", { variant: 0 });   // Mobile × Safari
    const diagnosis = { dimension: "browser", segment: "safari", secondary: null, segmentB: null, causeType: "deploy_bug", startDay: 16 };
    const viewed = ["device", "funnel", "browser"], pivots = ["browser×device"];
    const md = generatedCaseReport({ caseData, cfg: { seed: "DD-2026", noise: 1.4 }, diagnosis, result: scoreDiagnosis(diagnosis, caseData.truth), viewed, pivots, review: reviewTrail(caseData, viewed, pivots) });
    expect(md).toContain("# Data Detective — Case 02:");
    expect(md).toContain("| Dimension | Browser | Device × Browser | ✗ |");
    expect(md).toContain("1. Device category\n2. Funnel exploration\n3. Browser");
    expect(md).toContain("1. Browser × Device");
    expect(md).toContain("you built it (1st cross-tab)");
    expect(md).toContain("Add to cart step");
    expect(md).toContain(caseData.truth.lesson);
    expect(md).toContain("## Reflection");
  });
  it("field case: wrong calls show the truth; flagged rows by name; every clue listed", () => {
    const guess = { verdict: "agency-right", gun: FIELD_GUN_TRUTH, remedy: "rem-mobile" };
    const flags = ["ch-referral"];
    const md = fieldCaseReport({ guess, result: scoreFieldDiagnosis(guess, flags), flags });
    expect(md).toContain("## Your calls — 1/3 correct");
    expect(md).toMatch(/\*\*Verdict\*\* ✗[^\n]*\n  - Truth: No budget decision is safe/);
    expect(md).toContain("1. Referral");
    expect(md.match(/^- \*\*(Flagged|Missed)/gm)).toHaveLength(7);
    expect(FIELD_VERDICT_TRUTH).toBe("measurement-broken");
  });
});
