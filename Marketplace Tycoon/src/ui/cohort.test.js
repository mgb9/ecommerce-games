import { describe, it, expect } from "vitest";
import { DEFAULT_CFG, SCMAP, SCENARIOS, initialStores, makeRng, botDecide, leaderDecisionOf, resolveRound } from "../engine/engine.js";
import { evaluatePlatforms } from "../engine/platformfit.js";
import { REC_CHECKS, REC_CHECKS_PLAIN } from "./Recommendation.jsx";
import { RATING_LABELS, RATING_LABELS_PLAIN, SKILL_STATEMENTS, CODE_VERSION, runRecord, resultCode, parseResultCode, tally } from "./cohort.js";

function game(scenarioId, platformId = "woo", fulfilId = "inhouse", hitEvery = 2) {
  const cfg = { ...DEFAULT_CFG, scenarioId }; const sc = SCMAP[scenarioId];
  let stores = initialStores("", platformId, fulfilId, cfg.startingCash, sc, cfg.seed);
  const predictionLog = [];
  for (let round = 1; round <= cfg.maxRounds; round++) {
    const rng = makeRng(cfg.seed + ":" + round);
    const stats = { lastTotalDemand: stores.reduce((a, s) => a + (s.last ? s.last.demandUnits : sc.demandBase / 5), 0), leaderDecision: leaderDecisionOf(stores) };
    stores = resolveRound(stores.map((s) => (s.isPlayer ? s : { ...s, decision: botDecide(s, stats, round, cfg, rng, sc) })), round, cfg, rng).stores;
    const actual = [...stores].sort((a, b) => b.cumProfit - a.cumProfit).findIndex((s) => s.isPlayer) + 1;
    const predicted = round % hitEvery === 0 ? actual : (actual % 5) + 1;
    predictionLog.push({ round, predicted, actual, hit: predicted === actual });
  }
  return { cfg, stores, player: stores.find((s) => s.isPlayer), predictionLog };
}
const record = (...a) => { const g = game(...a); return runRecord(g.stores, g.player, g.cfg, g.predictionLog); };

describe("runRecord", () => {
  it("records the setup, the result and the judgements of a finished game", () => {
    for (const sc of SCENARIOS) {
      const g = game(sc.id, "shopify", "3pl");
      const r = runRecord(g.stores, g.player, g.cfg, g.predictionLog);
      expect(r.brief).toBe(sc.id);
      expect(r.platformId).toBe("shopify");
      expect(r.fulfilId).toBe(sc.digital ? "digital" : "3pl");
      expect(r.fitRank).toBe(evaluatePlatforms(sc).rows.findIndex((x) => x.id === "shopify") + 1);
      expect(r.topFit).toBe(evaluatePlatforms(sc).recommended);
      expect(r.profit).toBe(Math.round(g.player.cumProfit));
      expect(r.rank).toBeGreaterThanOrEqual(1); expect(r.rank).toBeLessThanOrEqual(r.of);
      expect(r.weeks).toBe(10); expect(r.predHits).toBe(5);
      expect(r.insolvent).toBe(g.player.history.some((h) => h.cash < 0));
      expect(JSON.parse(JSON.stringify(r))).toEqual(r); // storable
    }
  });
});

describe("result code", () => {
  const ratings = (n) => Object.fromEntries(SKILL_STATEMENTS.map((s, i) => [s.id, ((i + n) % 5) + 1]));
  const progress = {
    fashion: { ...record("fashion", "shopify"), recommendation: { text: "Use Shopify.", checks: 3 } },
    grocer: { ...record("grocer", "headless"), recommendation: { text: "   ", checks: 2 } },
    digital: record("digital", "headless"),
  };
  const skills = { before: ratings(0), after: ratings(2) };

  it("round-trips through the parser", () => {
    const code = resultCode(progress, skills, "WMG-2026");
    expect(code.startsWith(`${CODE_VERSION}|WMG-2026|fashion:shopify:1:`)).toBe(true);
    const back = parseResultCode(`  ${code}  `);
    expect(back.error).toBeUndefined();
    expect(back.seed).toBe("WMG-2026");
    expect(back.games.map((g) => g.brief)).toEqual(["fashion", "grocer", "digital"]);
    for (const g of back.games) {
      const p = progress[g.brief];
      expect(g).toMatchObject({ platformId: p.platformId, fitRank: p.fitRank, rank: p.rank, predHits: p.predHits, weeks: p.weeks, insolvent: p.insolvent });
    }
    expect(back.games[0].recommendation).toEqual({ checks: 3 });
    expect(back.games[1].recommendation).toBeNull(); // blank text is not a recommendation
    expect(back.games[2].recommendation).toBeNull();
    expect(back.skills).toEqual(skills);
  });
  it("carries no name and none of the writing", () => {
    expect(resultCode(progress, skills, "WMG-2026")).not.toContain("Use Shopify");
  });
  it("copes with nothing played, a skipped rating and awkward seeds", () => {
    const code = resultCode({}, { before: null }, "a|b,c:d");
    expect(code).toBe("MT1|a_b_c_d||S:-/-");
    expect(parseResultCode(code)).toMatchObject({ seed: "a_b_c_d", games: [], skills: { before: null, after: null } });
  });
  it("rejects what it can't read, and ignores blank lines", () => {
    expect(parseResultCode("")).toBeNull();
    expect(parseResultCode("CL1|x|1:1111|Q:-|W:-|S:-/-").error).toMatch(/not a Marketplace Tycoon/);
    expect(parseResultCode("MT1|s|fashion:shopify:1:2:4|S:-/-").error).toMatch(/can't read/);
    expect(parseResultCode("MT1|s|toys:shopify:1:2:4/10:s|S:-/-").error).toMatch(/no brief/);
    expect(parseResultCode("MT1|s|fashion:magento:1:2:4/10:s|S:-/-").error).toMatch(/no platform/);
  });
});

describe("tally", () => {
  it("summarises a cohort per brief", () => {
    const codes = [
      "MT1|WMG-2026|fashion:shopify:1:2:4/10:s:r3,grocer:woo:3:4:2/10:i|S:222222/444444",
      "MT1|WMG-2026|fashion:woo:3:4:6/10:i|S:333333/-",
      "MT1|OTHER|fashion:shopify:1:1:10/10:s:r4|S:-/-",
      "nonsense",
    ].map(parseResultCode);
    const t = tally(codes);
    expect(t.students).toBe(3);
    expect(t.errors).toHaveLength(1);
    expect(t.seeds).toEqual(["WMG-2026", "OTHER"]);
    const f = t.briefs.find((b) => b.id === "fashion");
    expect(f.played).toBe(3);
    expect(f.picks.filter((p) => p.n).map((p) => [p.id, p.n])).toEqual([["shopify", 2], ["woo", 1]]);
    expect(f.topFit).toBe(2);
    expect(f.meanRank).toBeCloseTo(7 / 3, 9);
    expect(f.insolvent).toBe(1);
    expect(f.predictions).toEqual({ yes: 20, of: 30 });
    expect(f.recommendations).toEqual({ written: 2, meanChecks: 3.5 });
    const d = t.briefs.find((b) => b.id === "digital");
    expect(d).toMatchObject({ played: 0, meanRank: null, topFit: 0 });
    expect(t.skills[0]).toMatchObject({ before: 2.5, beforeN: 2, after: 4, afterN: 1 });
  });
  it("is empty for no codes", () => {
    const t = tally([]);
    expect(t.students).toBe(0);
    expect(t.briefs.every((b) => b.played === 0)).toBe(true);
  });
});

describe("Simpler English wording", () => {
  it("every skill statement has a plain wording, different from the original", () => {
    for (const s of SKILL_STATEMENTS) { expect(s.plain, s.id).toBeTruthy(); expect(s.plain).not.toBe(s.text); }
    expect(JSON.stringify(SKILL_STATEMENTS)).not.toMatch(/PTES|survey/i);
  });
  it("the plain scale and self-checks line up with the originals", () => {
    expect(RATING_LABELS_PLAIN).toHaveLength(RATING_LABELS.length);
    expect(REC_CHECKS_PLAIN).toHaveLength(REC_CHECKS.length);
    REC_CHECKS_PLAIN.forEach((c, i) => expect(c).not.toBe(REC_CHECKS[i]));
  });
});
