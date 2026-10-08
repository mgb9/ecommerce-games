import { ALL_CASES } from "./caseList.js";

/* The skills self-rating and the result code — pure functions, no React.

   SKILL_STATEMENTS are what a student rates, 1–5, before their first case
   and again from the case file. They are the six things the module's
   skills survey asks about, in the game's own words. */
export const SKILL_STATEMENTS = [
  { id: "find", text: "Find out why a business number changed, using data" },
  { id: "judge", text: "Tell whether a pattern in data is real or just chance" },
  { id: "alternatives", text: "Think of more than one explanation and find a way to test between them" },
  { id: "explain", text: "Explain a data finding to someone who isn't an analyst" },
  { id: "calibrate", text: "Say how sure I am, and be about that right" },
  { id: "career", text: "Describe this kind of work in a job application or interview" },
];
export const RATING_LABELS = ["Not at all confident", "Slightly", "Moderately", "Very", "Completely confident"];

/* The result code: a short string a student copies from their case file
   and gives their tutor, who pastes a batch into the instructor tally. It
   carries only scores, stated confidence, which calls were right, the
   reply self-check and the skills ratings — no name, no free text.

     DD3|<seed>|<case>:<first>/<outOf>@<conf>:<calls>[:r<checks>],…|S:<before>/<after>

   e.g. DD3|DD-2026|1:4/4@90:1111:r3,9:2/3@70:101|S:34253/44354
   calls are 1/0 per call in order; `-` where unknown. Skills ratings are
   one digit each, in SKILL_STATEMENTS order; `-` for none. */
export const CODE_VERSION = "DD3";
const byId = Object.fromEntries(ALL_CASES.map((c) => [c.id, c]));

export function resultCode(progress, skills = {}, seed = "") {
  const cases = ALL_CASES.filter((c) => progress[c.id]?.first !== undefined).map((c) => {
    const p = progress[c.id];
    const calls = p.calls ? p.calls.map((b) => (b ? "1" : "0")).join("") : "-";
    const reply = p.reply ? `:r${p.reply.written ? p.reply.checks : "x"}` : "";
    return `${c.n}:${p.first}/${p.outOf}@${p.confidence || "-"}:${calls}${reply}`;
  });
  const digits = (r) => (r ? SKILL_STATEMENTS.map((s) => r[s.id] || "-").join("") : "-");
  return [CODE_VERSION, seed.replace(/[|,]/g, "_"), cases.join(","), `S:${digits(skills.before)}/${digits(skills.after)}`].join("|");
}

// A parsed code, or {error} when it can't be read. Tolerant of whitespace.
export function parseResultCode(line) {
  const text = String(line || "").trim();
  if (!text) return null;
  const parts = text.split("|");
  if (parts[0] !== CODE_VERSION || parts.length < 4) return { error: "not a Data Detective result code", text };
  const [, seed, casesPart, skillsPart] = parts;
  const cases = [];
  for (const chunk of casesPart.split(",").filter(Boolean)) {
    const m = chunk.match(/^(\d+):(\d+)\/(\d+)@(\d+|-):([01]+|-)(?::r(\d+|x))?$/);
    if (!m) return { error: `can't read "${chunk}"`, text };
    const c = ALL_CASES.find((x) => x.n === Number(m[1]));
    if (!c) return { error: `no case ${m[1]}`, text };
    cases.push({
      id: c.id, n: c.n, first: Number(m[2]), outOf: Number(m[3]), confidence: m[4] === "-" ? null : Number(m[4]),
      calls: m[5] === "-" ? null : [...m[5]].map((b) => b === "1"),
      reply: m[6] === undefined ? null : m[6] === "x" ? { written: false, checks: 0 } : { written: true, checks: Number(m[6]) },
    });
  }
  const sm = skillsPart.match(/^S:([1-5-]+)\/([1-5-]+)$/);
  const ratings = (d) => (d === "-" ? null : Object.fromEntries(SKILL_STATEMENTS.map((s, i) => [s.id, d[i] === "-" ? null : Number(d[i])])));
  return { seed, cases, skills: sm ? { before: ratings(sm[1]), after: ratings(sm[2]) } : { before: null, after: null }, text };
}

/* The tally: a cohort's parsed codes → what a tutor wants to see in the
   seminar. Per case: who played, mean score, fully-right share, which call
   was missed most; stated confidence vs results; the skills ratings before
   and after; the reply self-check. */
export const CALL_LABELS = { generated: ["Dimension", "Segment", "Cause", "Start"], field: ["Verdict", "Smoking gun", "First action"] };
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function tally(results) {
  const ok = results.filter((r) => r && !r.error);
  const seeds = [...new Set(ok.map((r) => r.seed))];
  const cases = ALL_CASES.map((c) => {
    const played = ok.map((r) => r.cases.find((x) => x.id === c.id)).filter(Boolean);
    const labels = CALL_LABELS[c.kind];
    const calls = labels.map((label, i) => {
      const known = played.filter((p) => p.calls && p.calls.length > i);
      return { label, missed: known.filter((p) => !p.calls[i]).length, of: known.length };
    });
    const replies = played.filter((p) => p.reply);
    return {
      id: c.id, n: c.n, title: c.title, outOf: played[0]?.outOf ?? (c.kind === "field" ? 3 : 4),
      played: played.length, meanScore: mean(played.map((p) => p.first)), fullyRight: played.filter((p) => p.first === p.outOf).length,
      calls, hardestCall: calls.filter((x) => x.of).sort((a, b) => b.missed / b.of - a.missed / a.of)[0] || null,
      replies: { written: replies.filter((p) => p.reply.written).length, of: replies.length, meanChecks: mean(replies.filter((p) => p.reply.written).map((p) => p.reply.checks)) },
    };
  });
  const attempts = ok.flatMap((r) => r.cases);
  const confidence = [50, 70, 90].map((level) => {
    const at = attempts.filter((a) => a.confidence === level);
    return { level, cases: at.length, right: at.filter((a) => a.first === a.outOf).length };
  });
  const skills = SKILL_STATEMENTS.map((s) => ({
    ...s,
    before: mean(ok.map((r) => r.skills.before?.[s.id]).filter(Boolean)), beforeN: ok.filter((r) => r.skills.before?.[s.id]).length,
    after: mean(ok.map((r) => r.skills.after?.[s.id]).filter(Boolean)), afterN: ok.filter((r) => r.skills.after?.[s.id]).length,
  }));
  return { students: ok.length, errors: results.filter((r) => r?.error), seeds, cases, confidence, skills };
}
