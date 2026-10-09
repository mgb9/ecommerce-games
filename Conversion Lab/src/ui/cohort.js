import { EXPERIMENTS, QUIZ } from "../engine/engine.js";

/* The skills self-rating and the result code — pure functions, no React.

   SKILL_STATEMENTS are what a student rates, 1–5, before their first
   experiment and again from the experiment log. They mirror the module's
   skills survey, in the lab's own words (Data Detective asks the same
   six things about diagnosis). */
export const SKILL_STATEMENTS = [
  { id: "plan", text: "Plan an A/B test big enough to detect the change I care about" },
  { id: "judge", text: "Tell whether a difference in a test is real or just chance" },
  { id: "value", text: "Judge a change by what it does for the business, not just the metric tested" },
  { id: "explain", text: "Explain a test result, and how uncertain it is, to someone who isn't an analyst" },
  { id: "calibrate", text: "Predict a result before seeing it, and be about right" },
  { id: "career", text: "Describe this kind of work in a job application or interview" },
];
export const RATING_LABELS = ["Not at all confident", "Slightly", "Moderately", "Very", "Completely confident"];

/* The result code: a short string a student copies from their experiment
   log and gives their tutor, who pastes a batch into the instructor tally.
   Only scores — no name, no free text.

     CL1|<seed>|<n>:<pbsm>[:r<checks>],…|Q:<points>/<max>|W:<brief>:<bmp>|S:<before>/<after>

   Per experiment, four judgements of the FIRST attempt, 1/0: predicted
   winner, effect-size band, sound call, matched the truth (`n` = no
   claim); `:r<checks>` if a recommendation was written (0–4 self-checks).
   Q: the first completed quiz; W: the first wireframe test (band, metric,
   power: 1/0, `n` = no real effect to find). `-` for anything not done.
   Skills ratings are one digit each, in SKILL_STATEMENTS order. */
export const CODE_VERSION = "CL1";
const bit = (v) => (v == null ? "n" : v ? "1" : "0");
const unbit = (c) => (c === "n" ? null : c === "1");

export function resultCode(progress, skills = {}, seed = "") {
  const exps = EXPERIMENTS.filter((e) => progress[e.id]).map((e) => {
    const p = progress[e.id];
    const rec = p.recommendation?.text?.trim() ? `:r${p.recommendation.checks || 0}` : "";
    return `${e.n}:${bit(p.predictionCorrect)}${bit(p.bandCorrect)}${bit(p.soundCall)}${bit(p.matchedTruth)}${rec}`;
  });
  const q = progress.quiz ? `Q:${progress.quiz.points}/${progress.quiz.max}` : "Q:-";
  const w = progress.wireframe ? `W:${progress.wireframe.brief}:${bit(progress.wireframe.bandCorrect)}${bit(progress.wireframe.metricCorrect)}${bit(progress.wireframe.powerOk)}` : "W:-";
  const digits = (r) => (r ? SKILL_STATEMENTS.map((s) => r[s.id] || "-").join("") : "-");
  return [CODE_VERSION, seed.replace(/[|,:]/g, "_"), exps.join(","), q, w, `S:${digits(skills.before)}/${digits(skills.after)}`].join("|");
}

// A parsed code, or {error} when it can't be read. Tolerant of whitespace.
export function parseResultCode(line) {
  const text = String(line || "").trim();
  if (!text) return null;
  const parts = text.split("|");
  if (parts[0] !== CODE_VERSION || parts.length < 6) return { error: "not a Conversion Lab result code", text };
  const [, seed, expPart, qPart, wPart, sPart] = parts;
  const experiments = [];
  for (const chunk of expPart.split(",").filter(Boolean)) {
    const m = chunk.match(/^(\d+):([01n])([01n])([01n])([01n])(?::r(\d))?$/);
    if (!m) return { error: `can't read "${chunk}"`, text };
    const e = EXPERIMENTS.find((x) => x.n === Number(m[1]));
    if (!e) return { error: `no experiment ${m[1]}`, text };
    experiments.push({ id: e.id, n: e.n, predictionCorrect: unbit(m[2]), bandCorrect: unbit(m[3]), soundCall: unbit(m[4]), matchedTruth: unbit(m[5]), recommendation: m[6] === undefined ? null : { checks: Number(m[6]) } });
  }
  const qm = qPart.match(/^Q:(?:-|(-?\d+)\/(\d+))$/);   // quiz points can be negative
  const quiz = qm && qm[1] !== undefined ? { points: Number(qm[1]), max: Number(qm[2]) } : null;
  const wm = wPart.match(/^W:([a-z0-9]+):([01n])([01n])([01n])$/);
  const wireframe = wm ? { brief: wm[1], bandCorrect: unbit(wm[2]), metricCorrect: unbit(wm[3]), powerOk: unbit(wm[4]) } : null;
  const sm = sPart.match(/^S:([1-5-]+)\/([1-5-]+)$/);
  const ratings = (d) => (d === "-" ? null : Object.fromEntries(SKILL_STATEMENTS.map((s, i) => [s.id, d[i] === "-" ? null : Number(d[i])])));
  return { seed, experiments, quiz, wireframe, skills: sm ? { before: ratings(sm[1]), after: ratings(sm[2]) } : { before: null, after: null }, text };
}

/* The tally: a cohort's parsed codes → what a tutor wants in the seminar.
   Per experiment: who played; how often the predicted winner, the band, the
   call (on the evidence) and the truth were right; how many wrote a
   recommendation. Plus the quiz, the wireframe and the skills ratings. */
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const share = (xs, key) => { const known = xs.filter((x) => x[key] != null); return { yes: known.filter((x) => x[key]).length, of: known.length }; };

export function tally(results) {
  const ok = results.filter((r) => r && !r.error);
  const seeds = [...new Set(ok.map((r) => r.seed))];
  const experiments = EXPERIMENTS.map((e) => {
    const played = ok.map((r) => r.experiments.find((x) => x.id === e.id)).filter(Boolean);
    const recs = played.filter((p) => p.recommendation);
    return {
      id: e.id, n: e.n, title: e.title, concept: e.concept, played: played.length,
      prediction: share(played, "predictionCorrect"), band: share(played, "bandCorrect"),
      sound: share(played, "soundCall"), matched: share(played, "matchedTruth"),
      noClaim: played.filter((p) => p.matchedTruth == null).length,
      soundButMissed: played.filter((p) => p.soundCall && p.matchedTruth === false).length,
      luckyUnsound: played.filter((p) => !p.soundCall && p.matchedTruth === true).length,
      recommendations: { written: recs.length, meanChecks: mean(recs.map((p) => p.recommendation.checks)) },
    };
  });
  const quizzes = ok.map((r) => r.quiz).filter(Boolean);
  const wires = ok.map((r) => r.wireframe).filter(Boolean);
  const skills = SKILL_STATEMENTS.map((s) => ({
    ...s,
    before: mean(ok.map((r) => r.skills.before?.[s.id]).filter(Boolean)), beforeN: ok.filter((r) => r.skills.before?.[s.id]).length,
    after: mean(ok.map((r) => r.skills.after?.[s.id]).filter(Boolean)), afterN: ok.filter((r) => r.skills.after?.[s.id]).length,
  }));
  return {
    students: ok.length, errors: results.filter((r) => r?.error), seeds, experiments,
    quiz: { played: quizzes.length, meanPoints: mean(quizzes.map((q) => q.points)), max: quizzes[0]?.max ?? QUIZ.length * 5 },
    wireframe: { played: wires.length, band: share(wires, "bandCorrect"), metric: share(wires, "metricCorrect"), power: share(wires, "powerOk") },
    skills,
  };
}
