import { describe, it, expect } from "vitest";
import { SKILL_STATEMENTS, parseResultCode, resultCode, tally } from "./cohort.js";

const progress = {
  "paypal-gateway": { first: 4, outOf: 4, confidence: 90, calls: [true, true, true, true], reply: { written: true, checks: 3 } },
  "mobile-safari-bug": { first: 2, outOf: 4, confidence: 90, calls: [true, false, true, false] },
  "cold-case-2015": { first: 2, outOf: 3, confidence: 70, calls: [true, false, true], reply: { written: false, checks: 0 } },
  "traffic-mix": { first: 3, outOf: 4, confidence: 50 },   // an older record: no calls
};
const skills = { before: { find: 3, judge: 4, alternatives: 2, explain: 5, calibrate: 3, career: 4 }, after: { find: 4, judge: 4, alternatives: 3, explain: 5, calibrate: 4, career: 4 } };

describe("the result code", () => {
  it("round-trips scores, confidence, calls, the reply check and the skills ratings — and nothing else", () => {
    const code = resultCode(progress, skills, "DD-2026");
    expect(code).toBe("DD3|DD-2026|1:4/4@90:1111:r3,2:2/4@90:1010,3:3/4@50:-,9:2/3@70:101:rx|S:342534/443544");
    const r = parseResultCode(code);
    expect(r.error).toBeUndefined();
    expect(r.seed).toBe("DD-2026");
    expect(r.cases.map((c) => c.n)).toEqual([1, 2, 3, 9]);
    expect(r.cases[0]).toMatchObject({ id: "paypal-gateway", first: 4, outOf: 4, confidence: 90, calls: [true, true, true, true], reply: { written: true, checks: 3 } });
    expect(r.cases[2].calls).toBeNull();
    expect(r.cases[3].reply).toEqual({ written: false, checks: 0 });
    expect(r.skills.before.alternatives).toBe(2);
    expect(r.skills.after.calibrate).toBe(4);
    expect(code).not.toMatch(/name|@[a-z]/i);
  });
  it("handles nothing played, no ratings, and rejects junk", () => {
    expect(resultCode({}, {}, "S1")).toBe("DD3|S1||S:-/-");
    const r = parseResultCode("DD3|S1||S:-/-");
    expect(r.cases).toEqual([]); expect(r.skills).toEqual({ before: null, after: null });
    expect(parseResultCode("hello")).toMatchObject({ error: expect.stringMatching(/not a Data Detective/) });
    expect(parseResultCode("DD3|S1|1:4/4@90:1111,zz|S:-/-")).toMatchObject({ error: expect.stringMatching(/zz/) });
    expect(parseResultCode("DD3|S1|99:4/4@90:1111|S:-/-")).toMatchObject({ error: expect.stringMatching(/no case 99/) });
    expect(parseResultCode("   ")).toBeNull();
  });
  it("a seed with the separator in it is made safe", () => {
    expect(parseResultCode(resultCode({}, {}, "a|b,c")).seed).toBe("a_b_c");
  });
});

describe("the tally", () => {
  const codes = [
    resultCode(progress, skills, "DD-2026"),
    resultCode({ "paypal-gateway": { first: 2, outOf: 4, confidence: 90, calls: [true, true, false, false], reply: { written: true, checks: 4 } }, "cold-case-2015": { first: 3, outOf: 3, confidence: 50, calls: [true, true, true] } }, { before: { find: 2 } }, "DD-2026"),
    "garbage",
  ];
  const t = tally(codes.map(parseResultCode));
  it("counts students, flags unreadable lines, and lists the seeds", () => {
    expect(t.students).toBe(2); expect(t.errors).toHaveLength(1); expect(t.seeds).toEqual(["DD-2026"]);
  });
  it("per case: played, mean score, fully right, and the call missed most", () => {
    const c1 = t.cases.find((c) => c.n === 1);
    expect(c1).toMatchObject({ played: 2, meanScore: 3, fullyRight: 1 });
    expect(c1.hardestCall.label).toMatch(/Cause|Start/); expect(c1.hardestCall.missed).toBe(1); expect(c1.hardestCall.of).toBe(2);
    expect(c1.replies).toMatchObject({ written: 2, of: 2, meanChecks: 3.5 });
    const c9 = t.cases.find((c) => c.n === 9);
    expect(c9.calls.map((x) => x.label)).toEqual(["Verdict", "Smoking gun", "First action"]);
    expect(c9.calls[1]).toMatchObject({ missed: 1, of: 2 });
    expect(t.cases.find((c) => c.n === 12).played).toBe(0);
  });
  it("confidence vs results across every attempt, and the skills ratings' means", () => {
    expect(t.confidence.find((c) => c.level === 90)).toEqual({ level: 90, cases: 3, right: 1 });
    expect(t.confidence.find((c) => c.level === 50)).toEqual({ level: 50, cases: 2, right: 1 });
    const find = t.skills.find((s) => s.id === "find");
    expect(find).toMatchObject({ before: 2.5, beforeN: 2, after: 4, afterN: 1 });
    expect(SKILL_STATEMENTS).toHaveLength(6);
  });
});
