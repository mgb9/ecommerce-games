import { SCENARIOS, SCMAP, PLATFORMS, PMAP, SC, fulfilOf } from "../engine/engine.js";
import { fitOf } from "../engine/platformfit.js";
import { runFacts } from "../engine/debrief.js";

/* The record of a finished game, the skills self-rating and the result
   code — pure functions, no React.

   SKILL_STATEMENTS are what a student rates, 1–5, before their first game
   and again from the decision log. They ask the same six things as Data
   Detective's and Conversion Lab's, in this simulation's words. `plain`
   is the Simpler English wording a student sees with that switch on; the
   tally (staff) and the result code always use `text` and the ids. */
export const SKILL_STATEMENTS = [
  { id: "choose", text: "Choose an e-commerce platform for a client's needs, and justify the trade-offs", plain: "Choose an e-commerce platform that fits what a client needs, and give reasons for what you gain and what you give up" },
  { id: "economics", text: "Work out whether a store makes money on each sale, after returns and fees", plain: "Work out if a store makes money on each sale, after you take away returns and fees" },
  { id: "value", text: "Judge whether a conversion, fulfilment or retention investment is worth its cost", plain: "Decide if spending on conversion, fulfilment or keeping customers brings back more money than it costs" },
  { id: "explain", text: "Explain a platform and strategy recommendation to a client who isn't a technologist", plain: "Explain your advice on platform and strategy to a client who is not a technology expert" },
  { id: "calibrate", text: "Predict how a decision will turn out before seeing the result, and be about right", plain: "Say what a decision will do before you see the result, and be close" },
  { id: "career", text: "Describe this kind of work in a job application or interview", plain: "Describe this kind of work when you apply for a job or in an interview" },
];
export const RATING_LABELS = ["Not at all confident", "Slightly", "Moderately", "Very", "Completely confident"];
// Simpler English: the same five points in more common words.
export const RATING_LABELS_PLAIN = ["Not confident", "A little", "Quite", "Very", "Fully confident"];

/* What a finished game leaves behind for the decision log: the setup, how
   it ended, and the judgements made along the way. Built from the same
   run facts as the debrief. */
export function runRecord(stores, player, cfg, predictionLog = []) {
  const sc = SC(cfg);
  const f = runFacts(stores, player, cfg, predictionLog);
  const pf = fitOf(sc, player.platformId);
  const rank = [...stores].sort((a, b) => b.cumProfit - a.cumProfit).findIndex((s) => s.isPlayer) + 1;
  return {
    brief: sc.id, platformId: player.platformId, fitRank: pf.rank, fitTotal: pf.total, topFit: pf.recommended,
    fulfilId: fulfilOf(player, sc).id, profit: Math.round(player.cumProfit), cash: Math.round(player.cash),
    rank, of: stores.length, insolvent: !!player.insolvent, shortWeek: f.firstNegative ? f.firstNegative.round : null,
    predHits: f.hits, weeks: f.predictions, meanAbsError: +f.meanAbsError.toFixed(2), bias: +f.bias.toFixed(2),
    croDeployed: f.deployed.length, croUntested: f.untestedDeploys, croTests: f.tests,
    stockoutWeeks: f.stockoutWeeks, regulars: Math.round(player.loyalBase),
  };
}

/* The result code: a short string a student copies from their decision
   log and gives their tutor, who pastes a batch into the instructor tally.
   Only scores — no name, no free text.

     MT1|<seed>|<brief>:<platform>:<fit rank>:<final rank>:<hits>/<weeks>:<i|s>[:r<checks>],…|S:<before>/<after>

   Per brief, the FIRST completed game: the platform chosen and where the
   fit model ranks it for that brief (1 = top fit), the final leaderboard
   place, how many weekly place predictions were right, whether the store
   ever ran out of cash (i) or stayed solvent (s), and `:r<checks>` if a
   recommendation was written (0–4 self-checks). Skills ratings are one
   digit each, in SKILL_STATEMENTS order; `-` for anything not done. */
export const CODE_VERSION = "MT1";

export function resultCode(progress = {}, skills = {}, seed = "") {
  const games = SCENARIOS.filter((s) => progress[s.id]).map((s) => {
    const p = progress[s.id];
    const rec = p.recommendation?.text?.trim() ? `:r${p.recommendation.checks || 0}` : "";
    return `${s.id}:${p.platformId}:${p.fitRank}:${p.rank}:${p.predHits}/${p.weeks}:${p.insolvent ? "i" : "s"}${rec}`;
  });
  const digits = (r) => (r ? SKILL_STATEMENTS.map((s) => r[s.id] || "-").join("") : "-");
  return [CODE_VERSION, String(seed).replace(/[|,:]/g, "_"), games.join(","), `S:${digits(skills.before)}/${digits(skills.after)}`].join("|");
}

// A parsed code, or {error} when it can't be read. Tolerant of whitespace.
export function parseResultCode(line) {
  const text = String(line || "").trim();
  if (!text) return null;
  const parts = text.split("|").map((p) => p.trim());
  if (parts[0] !== CODE_VERSION || parts.length < 4) return { error: "not a Marketplace Tycoon result code", text };
  const [, seed, gamePart, sPart] = parts;
  const games = [];
  for (const chunk of gamePart.split(",").map((c) => c.trim()).filter(Boolean)) {
    const m = chunk.match(/^([a-z0-9]+):([a-z0-9]+):(\d):(\d):(\d+)\/(\d+):([is])(?::r(\d))?$/);
    if (!m) return { error: `can't read "${chunk}"`, text };
    if (!SCMAP[m[1]]) return { error: `no brief "${m[1]}"`, text };
    if (!PMAP[m[2]]) return { error: `no platform "${m[2]}"`, text };
    games.push({ brief: m[1], platformId: m[2], fitRank: Number(m[3]), rank: Number(m[4]), predHits: Number(m[5]), weeks: Number(m[6]), insolvent: m[7] === "i", recommendation: m[8] === undefined ? null : { checks: Number(m[8]) } });
  }
  const sm = sPart.match(/^S:([1-5-]+)\/([1-5-]+)$/);
  const ratings = (d) => (d === "-" ? null : Object.fromEntries(SKILL_STATEMENTS.map((s, i) => [s.id, !d[i] || d[i] === "-" ? null : Number(d[i])])));
  return { seed, games, skills: sm ? { before: ratings(sm[1]), after: ratings(sm[2]) } : { before: null, after: null }, text };
}

/* The tally: a cohort's parsed codes → what a tutor wants in the seminar.
   Per brief: who played; which platforms they chose and how many chose
   the top fit; the mean final place; how many ran out of cash; how often
   the weekly place prediction was right; how many wrote a recommendation.
   Plus the skills ratings. */
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function tally(results) {
  const ok = results.filter((r) => r && !r.error);
  const seeds = [...new Set(ok.map((r) => r.seed))];
  const briefs = SCENARIOS.map((s) => {
    const played = ok.map((r) => r.games.find((g) => g.brief === s.id)).filter(Boolean);
    const recs = played.filter((p) => p.recommendation);
    return {
      id: s.id, name: s.name, short: s.short, played: played.length,
      picks: PLATFORMS.map((p) => ({ id: p.id, short: p.short, n: played.filter((g) => g.platformId === p.id).length })),
      topFit: played.filter((g) => g.fitRank === 1).length,
      meanRank: mean(played.map((g) => g.rank)),
      insolvent: played.filter((g) => g.insolvent).length,
      predictions: { yes: played.reduce((a, g) => a + g.predHits, 0), of: played.reduce((a, g) => a + g.weeks, 0) },
      recommendations: { written: recs.length, meanChecks: mean(recs.map((p) => p.recommendation.checks)) },
    };
  });
  const skills = SKILL_STATEMENTS.map((s) => ({
    ...s,
    before: mean(ok.map((r) => r.skills.before?.[s.id]).filter(Boolean)), beforeN: ok.filter((r) => r.skills.before?.[s.id]).length,
    after: mean(ok.map((r) => r.skills.after?.[s.id]).filter(Boolean)), afterN: ok.filter((r) => r.skills.after?.[s.id]).length,
  }));
  return { students: ok.length, errors: results.filter((r) => r?.error), seeds, briefs, skills };
}
