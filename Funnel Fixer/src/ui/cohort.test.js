import { describe, it, expect } from "vitest";
import { SKILL_STATEMENTS, resultCode, parseResultCode, tally, CODE_VERSION } from "./cohort.js";
import { summariseRun } from "./progress.js";
import { LEARNING_OUTCOMES, OUTCOMES, SKILLS, BY_DOING, losOf, skillsOf } from "../engine/outcomes.js";
import { DEFAULT_CFG, initialState, resolveQuarter, buildRecord, buildDebrief } from "../engine/engine.js";

const ratings = (n) => Object.fromEntries(SKILL_STATEMENTS.map((s) => [s.id, n]));
const first = { seed: "FNL-2026", quarters: 4, profit: 310400, untouched: 296000, leakBits: [false, true, true, false], betBits: [true, false, true, true] };

describe("result code", () => {
  it("round-trips a first run, a recommendation and both ratings", () => {
    const code = resultCode({ first, recommendation: { text: "Fix the checkout first.", checks: 3 } }, { before: ratings(2), after: ratings(4) });
    expect(code).toBe("FF1|FNL-2026|L:0110|B:1011|P:+14|R:3|S:222222/444444");
    const p = parseResultCode(`  ${code}  `);
    expect(p.leak).toEqual(first.leakBits);
    expect(p.bet).toEqual(first.betBits);
    expect(p.vsUntouchedK).toBe(14);
    expect(p.recommendation).toEqual({ checks: 3 });
    expect(p.skills.before.size).toBe(2);
    expect(p.skills.after.career).toBe(4);
  });
  it("carries a loss, no recommendation, a skipped rating — and never any writing", () => {
    const code = resultCode({ first: { ...first, profit: 280000 }, recommendation: { text: "   ", checks: 2 } }, { before: null });
    expect(code).toBe("FF1|FNL-2026|L:0110|B:1011|P:-16|R:-|S:-/-");
    const p = parseResultCode(code);
    expect(p.vsUntouchedK).toBe(-16);
    expect(p.recommendation).toBeNull();
    expect(p.skills).toEqual({ before: null, after: null });
    expect(resultCode({ first, recommendation: { text: "secret words", checks: 1 } })).not.toContain("secret");
  });
  it("keeps separators out of the seed, and works before any run", () => {
    expect(resultCode({ first: { ...first, seed: "a|b:c,d" } }).split("|")).toHaveLength(7);
    expect(parseResultCode(resultCode({})).leak).toEqual([]);
  });
  it("rejects what it can't read, and ignores blank lines", () => {
    expect(parseResultCode("")).toBeNull();
    expect(parseResultCode("CL1|x|1:1111|Q:-|W:-|S:-/-").error).toMatch(/not a Funnel Fixer/);
    expect(parseResultCode("FF1|x|L:012|B:1|P:+1|R:-|S:-/-").error).toMatch(/can't read/);
  });
  it("matches what a real run saves", () => {
    const cfg = DEFAULT_CFG; let state = initialState(cfg); const records = [];
    for (let q = 0; q < cfg.quarters; q++) { const r = resolveQuarter(state, ["guest"].filter(() => q === 0), cfg); records.push(buildRecord(state, cfg, { predLeak: "purchase", predBest: "guest", chosen: q === 0 ? ["guest"] : [] }, r)); state = r.newState; }
    const run = summariseRun({ seed: cfg.seed, records, profit: state.cumProfit, untouched: 1000, cards: buildDebrief(records, cfg) });
    expect(run.rows).toHaveLength(cfg.quarters);
    expect(run.cards.length).toBeGreaterThan(0);
    expect(JSON.parse(JSON.stringify(run))).toEqual(run);
    const p = parseResultCode(resultCode({ first: run }));
    expect(p.leak).toEqual(records.map((r) => r.leakCorrect));
    expect(p.bet).toEqual(records.map((r) => r.roiCorrect));
  });
});

describe("tally", () => {
  const codes = [
    "FF1|FNL-2026|L:0110|B:1011|P:+14|R:3|S:222222/444444",
    "FF1|FNL-2026|L:1111|B:0011|P:-4|R:-|S:333333/-",
    "FF1|FNL-2026|L:-|B:-|P:-|R:-|S:-/-",
    "nonsense",
  ].map(parseResultCode);
  const t = tally(codes);
  it("counts students, finished runs, unreadable lines and seeds", () => {
    expect(t.students).toBe(3);
    expect(t.played).toBe(2);
    expect(t.errors).toHaveLength(1);
    expect(t.seeds).toEqual(["FNL-2026"]);
  });
  it("scores each quarter's calls across the cohort", () => {
    expect(t.quarters.map((q) => [q.leak, q.bet, q.of])).toEqual([[1, 1, 2], [2, 0, 2], [2, 2, 2], [1, 2, 2]]);
  });
  it("summarises profit, recommendations and ratings", () => {
    expect(t.profit).toMatchObject({ n: 2, meanK: 5, beat: 1, bestK: 14, worstK: -4 });
    expect(t.recommendations).toEqual({ written: 1, meanChecks: 3 });
    expect(t.skills[0]).toMatchObject({ before: 2.5, beforeN: 2, after: 4, afterN: 1 });
  });
  it("is empty-safe", () => { expect(tally([]).quarters).toEqual([]); expect(CODE_VERSION).toBe("FF1"); });
});

describe("outcomes", () => {
  it("claims LO3 only, in the specification's four outcomes", () => {
    expect(Object.keys(LEARNING_OUTCOMES)).toEqual(["LO1", "LO2", "LO3", "LO4"]);
    expect(OUTCOMES.los).toEqual(["LO3"]);
    expect(OUTCOMES.partly).toEqual([]);
    expect(losOf().map((l) => l.code)).toEqual(["LO3"]);
  });
  it("names real skills, the two practised by doing last, and a CV line that says it was simulated", () => {
    for (const id of [...OUTCOMES.skills, ...BY_DOING]) expect(SKILLS[id].how.length).toBeGreaterThan(20);
    expect(skillsOf().slice(-2).map((s) => s.id)).toEqual(BY_DOING);
    expect(OUTCOMES.cv).toMatch(/simulated/);
  });
  it("asks six ratings and never names a survey", () => {
    expect(SKILL_STATEMENTS).toHaveLength(6);
    expect(JSON.stringify([SKILL_STATEMENTS, SKILLS, OUTCOMES])).not.toMatch(/PTES|survey/i);
  });
});
