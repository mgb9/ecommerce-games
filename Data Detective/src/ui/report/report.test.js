import { describe, it, expect } from "vitest";
import { CASES, generateCase, scoreDiagnosis } from "../../engine/engine.js";
import { FIELD_VERDICT_TRUTH, FIELD_GUN_TRUTH, fieldCaseById, scoreFieldDiagnosis } from "../../engine/fieldcase.js";
import { generatedReport } from "./generatedReport.js";
import { fieldReport } from "../field/fieldReport.js";

const cfg = { seed: "DD-2026", noise: 1.4 };

describe("case report (cases 1–7)", () => {
  const caseData = generateCase(CASES[1].id, "DD-2026", { variant: 0 });   // Mobile × Safari
  const t = caseData.truth;

  it("a half-right, overconfident attempt: score, calls, coaching and trail", () => {
    const diagnosis = { dimension: "browser", segment: "safari", secondary: null, segmentB: null, causeType: "deploy_bug", startDay: 16, confidence: 90 };
    const m = generatedReport({ caseData, cfg, diagnosis, result: scoreDiagnosis(diagnosis, t), viewed: ["device", "browser"], pivots: [] });
    expect(m.title).toBe(`Case 02: ${caseData.ticket.subject}`);
    expect(m.fileTitle).toBe("Data Detective – Case 02 report");
    expect(m.score).toEqual({ got: 2, outOf: 4 });
    expect(m.calls.map((c) => [c.label, c.ok])).toEqual([["Dimension", false], ["Segment", false], ["Cause", true], ["Started", true]]);
    expect(m.calls[0]).toMatchObject({ you: "Browser", truth: "Device × Browser" });
    expect(m.principle).toBe(t.lesson);
    // coaching follows what they did: never built the cross-tab, skipped the funnel; the
    // overconfidence verdict lives in its own box, not repeated in the lists
    expect(m.workOn.join(" ")).toMatch(/cross-tab them/);
    expect(m.workOn.join(" ")).toMatch(/Funnel exploration/);
    expect(m.confidence.verdict.text).toMatch(/Overconfident/);
    expect(m.workOn.join(" ")).not.toMatch(/Overconfident/);
    expect(m.wentWell.join(" ")).toMatch(/right cause/);
    expect(m.trail[0].items).toEqual(["Device category", "Browser"]);
    expect(m.trail[1].items).toEqual([]);
    expect(m.reflection).toHaveLength(4);
    expect(m.words.map((w) => w.term)).toContain("Cross-tab");
  });

  it("a perfect, well-calibrated attempt is praised, not lectured", () => {
    const diagnosis = { ...t, confidence: 90 };
    const m = generatedReport({ caseData, cfg, diagnosis, result: scoreDiagnosis(diagnosis, t), viewed: ["device", "funnel"], pivots: ["device×browser"] });
    expect(m.score.got).toBe(4);
    expect(m.workOn).toEqual([]);
    expect(m.confidence.verdict.text).toMatch(/Well calibrated/);
    expect(m.wentWell.join(" ")).toMatch(/your 1st cross-tab/);
  });

  it("opening the right view but misreading it is called out, not praised", () => {
    const diagnosis = { dimension: "browser", segment: "safari", secondary: null, segmentB: null, causeType: "deploy_bug", startDay: 16, confidence: 70 };
    const m = generatedReport({ caseData, cfg, diagnosis, result: scoreDiagnosis(diagnosis, t), viewed: ["device"], pivots: ["device×browser"] });
    expect(m.wentWell.join(" ")).not.toMatch(/You found where the signal was/);
    expect(m.workOn.join(" ")).toMatch(/but your answer didn't match it.*combination/);
  });

  it("'nothing is broken' cases ask about variation, not red herrings, and show no start date", () => {
    const calm = generateCase("normal-week", "DD-2026", { variant: 0 });
    const guess = { dimension: "none", segment: null, causeType: "external_no_issue", startDay: null, confidence: 70 };
    const m = generatedReport({ caseData: calm, cfg, diagnosis: guess, result: scoreDiagnosis(guess, calm.truth), viewed: ["device", "browser", "payment"], pivots: [] });
    expect(m.score.got).toBe(4);
    expect(m.calls.find((c) => c.label === "Started")).toMatchObject({ you: "—", truth: "—", ok: true });
    expect(m.reflection[1]).toMatch(/ordinary variation/);
    expect(m.words.map((w) => w.term)).toContain("Noise");
  });

  it("every case's report lists real glossary words", () => {
    for (const c of CASES) {
      const cd = generateCase(c.id, "DD-2026");
      const d = { ...cd.truth, confidence: 50 };
      const m = generatedReport({ caseData: cd, cfg, diagnosis: d, result: scoreDiagnosis(d, cd.truth), viewed: [], pivots: [] });
      expect(m.words.length, c.id).toBeGreaterThanOrEqual(3);
      for (const w of m.words) expect(w.def.length, `${c.id} ${w.term}`).toBeGreaterThan(40);
    }
  });
});

describe("case report (case 9)", () => {
  it("case 10 builds its own report: its calls, its clue chain, its reflection", () => {
    const xmas = fieldCaseById("christmas-plan-2015");
    const guess = { verdict: "top-revenue", gun: xmas.gunTruth, remedy: xmas.remedyTruth, confidence: 50 };
    const m = fieldReport({ def: xmas, guess, result: scoreFieldDiagnosis(guess, ["pr-21", "pr-14"], xmas), flags: ["pr-21", "pr-14"], viewed: ["products"] });
    expect(m.title).toMatch(/^Case 10:/);
    expect(m.calls[0]).toMatchObject({ label: "Verdict", ok: false });
    expect(m.calls[0].truth).toMatch(/^Rank by how many separate customers/);
    expect(m.happened.clues).toHaveLength(9);
    expect(m.happened.sections.map((s) => s.label)).toEqual(["What happened", "What the data showed", "What wasn't the cause", "What should happen next"]);
    expect(m.trail[1].items[0]).toMatch(/HP Care Pack/);
    expect(m.reflection[0]).toMatch(/Which column/);
    expect(m.workOn.join(" ")).toMatch(/trade baskets at the top of the unit ranking/);
  });
  it("wrong calls show the truth; flagged rows by name; the clue chain; missed core clues to work on", () => {
    const guess = { verdict: "agency-right", gun: FIELD_GUN_TRUTH, remedy: "rem-mobile", confidence: 90 };
    const flags = ["ch-referral"];
    const m = fieldReport({ guess, result: scoreFieldDiagnosis(guess, flags), flags, viewed: ["channels", "sourceMedium"] });
    expect(m.score).toMatchObject({ got: 1, outOf: 3 });
    expect(m.calls[0]).toMatchObject({ label: "Verdict", ok: false });
    expect(m.calls[0].truth).toMatch(/^No budget decision is safe/);
    expect(m.trail[0].items).toEqual(["Channels", "Source / Medium"]);
    expect(m.trail[1].items).toEqual(["Referral"]);
    expect(m.happened.clues).toHaveLength(7);
    expect(m.workOn.join(" ")).toMatch(/you missed: payment-gateway self-referrals; test orders in the live data/);
    expect(m.confidence.verdict.text).toMatch(/Overconfident/);
  });
  it("all three calls right", () => {
    const guess = { verdict: FIELD_VERDICT_TRUTH, gun: FIELD_GUN_TRUTH, remedy: "rem-exclusions", confidence: 70 };
    const m = fieldReport({ guess, result: scoreFieldDiagnosis(guess, []), flags: [] });
    expect(m.score.got).toBe(3);
    expect(m.wentWell.join(" ")).toMatch(/measurement itself was broken/);
  });
});
