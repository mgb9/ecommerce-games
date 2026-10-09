import { describe, it, expect } from "vitest";
import { resultCode, parseResultCode, tally, SKILL_STATEMENTS, CODE_VERSION } from "./cohort.js";

const progress = {
  cta: { predictionCorrect: true, bandCorrect: true, soundCall: true, matchedTruth: true, recommendation: { text: "Ship it.", checks: 3 } },
  imgbg: { predictionCorrect: true, bandCorrect: false, soundCall: true, matchedTruth: null },
  social: { predictionCorrect: false, bandCorrect: false, soundCall: false, matchedTruth: true, recommendation: { text: "   ", checks: 0 } },
  quiz: { points: -4, max: 55 },
  wireframe: { brief: "b2b", bandCorrect: false, metricCorrect: true, powerOk: null },
};
const skills = { before: Object.fromEntries(SKILL_STATEMENTS.map((s, i) => [s.id, (i % 5) + 1])), after: null };

describe("result code", () => {
  it("round-trips: judgements, no-claim, recommendations, quiz (even negative), wireframe, ratings", () => {
    const code = resultCode(progress, skills, "LAB|2026,24");
    expect(code.startsWith(`${CODE_VERSION}|LAB_2026_24|1:1111:r3,2:101n,4:0001|Q:-4/55|W:b2b:01n|S:123451/-`)).toBe(true);
    const r = parseResultCode(code);
    expect(r.error).toBeUndefined();
    expect(r.experiments.map((e) => e.id)).toEqual(["cta", "imgbg", "social"]);
    expect(r.experiments[1].matchedTruth).toBeNull();
    expect(r.experiments[0].recommendation).toEqual({ checks: 3 });
    expect(r.experiments[2].recommendation).toBeNull();   // blank text is not a recommendation
    expect(r.quiz).toEqual({ points: -4, max: 55 });
    expect(r.wireframe).toEqual({ brief: "b2b", bandCorrect: false, metricCorrect: true, powerOk: null });
    expect(r.skills.before.plan).toBe(1);
    expect(r.skills.after).toBeNull();
  });
  it("an empty browser gives a readable, empty code", () => {
    const r = parseResultCode(resultCode({}, {}, "S"));
    expect(r.experiments).toEqual([]);
    expect(r.quiz).toBeNull();
    expect(r.wireframe).toBeNull();
  });
  it("rejects other games' codes and garbled lines", () => {
    expect(parseResultCode("DD3|DD-2026|1:4/4@90:1111|S:-/-").error).toMatch(/not a Conversion Lab/);
    expect(parseResultCode("CL1|S|1:1x11|Q:-|W:-|S:-/-").error).toMatch(/can't read/);
    expect(parseResultCode("   ")).toBeNull();
  });
});

describe("tally", () => {
  it("counts each judgement per experiment and separates sound-but-wrong from lucky", () => {
    const a = parseResultCode(resultCode(progress, skills, "S"));
    const b = parseResultCode(resultCode({ cta: { predictionCorrect: false, bandCorrect: true, soundCall: true, matchedTruth: false } }, { before: skills.before, after: skills.before }, "S"));
    const t = tally([a, b, parseResultCode("nonsense")]);
    expect(t.students).toBe(2);
    expect(t.errors).toHaveLength(1);
    const cta = t.experiments.find((e) => e.id === "cta");
    expect(cta.played).toBe(2);
    expect(cta.prediction).toEqual({ yes: 1, of: 2 });
    expect(cta.sound).toEqual({ yes: 2, of: 2 });
    expect(cta.soundButMissed).toBe(1);
    expect(cta.recommendations.written).toBe(1);
    const social = t.experiments.find((e) => e.id === "social");
    expect(social.luckyUnsound).toBe(1);
    expect(t.experiments.find((e) => e.id === "imgbg").noClaim).toBe(1);
    expect(t.quiz).toMatchObject({ played: 1, meanPoints: -4 });
    expect(t.skills[0].beforeN).toBe(2);
    expect(t.skills[0].afterN).toBe(1);
  });
});
