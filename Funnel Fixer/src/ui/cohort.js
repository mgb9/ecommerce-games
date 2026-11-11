/* The skills self-rating and the result code — pure functions, no React.

   SKILL_STATEMENTS are what a student rates, 1–5, before their first game
   and again from the diagnosis log. They mirror the module's skills survey
   in the game's own words (Data Detective and Conversion Lab ask the same
   six things about their own subject). `plain` is the same statement in
   Simpler English; the tally and the result code use neither wording. */
export const SKILL_STATEMENTS = [
  { id: "size", text: "Work out which stage of a sales funnel is losing the most money", plain: "Find the step in a sales funnel that loses the most money" },
  { id: "value", text: "Judge an improvement by the profit it returns over time, not by the size of the gap it closes", plain: "Judge an improvement by the profit it brings back over time, not by how big the gap is" },
  { id: "acquire", text: "Tell when buying more traffic is worth its cost, using acquisition cost and lifetime value", plain: "Decide when it is worth paying for more visitors, using the cost to win a customer and what a customer is worth over time" },
  { id: "explain", text: "Explain a spending recommendation, with its figures, to someone who isn't an analyst", plain: "Explain where to spend money, with the numbers, to a person who does not work with data" },
  { id: "calibrate", text: "Predict where the money is before seeing the figures, and be about right", plain: "Guess where the money is lost before you see the numbers, and be close" },
  { id: "career", text: "Describe this kind of work in a job application or interview", plain: "Describe this kind of work when you apply for a job" },
];
export const RATING_LABELS = ["Not at all confident", "Slightly", "Moderately", "Very", "Completely confident"];
export const RATING_LABELS_PLAIN = ["Not confident", "A little", "Fairly", "Very", "Fully confident"];

/* The result code: a short string a student copies from their diagnosis
   log and gives their tutor, who pastes a batch into the instructor tally.
   Only scores — no name, no free text. It describes the FIRST finished
   game (the honest record).

     FF1|<seed>|L:<bits>|B:<bits>|P:<±£k>|R:<checks or ->|S:<before>/<after>

   L and B: one digit per quarter, 1/0 — the biggest money leak and the
   best-returning purchase called correctly. P: profit after spend against
   an untouched funnel, in whole £ thousands, signed. R: the number of
   self-checks ticked on a written recommendation, `-` if none was written.
   Skills ratings are one digit each, in SKILL_STATEMENTS order. */
export const CODE_VERSION = "FF1";
const bits = (xs) => (xs && xs.length ? xs.map((v) => (v ? "1" : "0")).join("") : "-");
const unbits = (s) => (s === "-" ? [] : [...s].map((c) => c === "1"));

export function resultCode(progress = {}, skills = {}) {
  const f = progress.first;
  const rec = progress.recommendation;
  const digits = (r) => (r ? SKILL_STATEMENTS.map((s) => r[s.id] || "-").join("") : "-");
  const k = f && f.untouched != null ? Math.round((f.profit - f.untouched) / 1000) : null;
  return [
    CODE_VERSION, String(f?.seed || "").replace(/[|,:]/g, "_"),
    `L:${bits(f?.leakBits)}`, `B:${bits(f?.betBits)}`,
    `P:${k == null ? "-" : (k < 0 ? "-" : "+") + Math.abs(k)}`,
    `R:${rec?.text?.trim() ? rec.checks || 0 : "-"}`,
    `S:${digits(skills.before)}/${digits(skills.after)}`,
  ].join("|");
}

// A parsed code, or {error} when it can't be read. Tolerant of whitespace.
export function parseResultCode(line) {
  const text = String(line || "").trim();
  if (!text) return null;
  const parts = text.split("|");
  if (parts[0] !== CODE_VERSION || parts.length < 7) return { error: "not a Funnel Fixer result code", text };
  const [, seed, l, b, p, r, s] = parts;
  const lm = l.match(/^L:(-|[01]+)$/), bm = b.match(/^B:(-|[01]+)$/), pm = p.match(/^P:(-|[+-]\d+)$/), rm = r.match(/^R:(-|[0-4])$/);
  if (!lm || !bm || !pm || !rm) return { error: `can't read "${[l, b, p, r].find((x, i) => ![lm, bm, pm, rm][i])}"`, text };
  const sm = s.match(/^S:([1-5-]+)\/([1-5-]+)$/);
  const ratings = (d) => (d === "-" ? null : Object.fromEntries(SKILL_STATEMENTS.map((st, i) => [st.id, !d[i] || d[i] === "-" ? null : Number(d[i])])));
  return {
    seed, leak: unbits(lm[1]), bet: unbits(bm[1]),
    vsUntouchedK: pm[1] === "-" ? null : Number(pm[1]),
    recommendation: rm[1] === "-" ? null : { checks: Number(rm[1]) },
    skills: sm ? { before: ratings(sm[1]), after: ratings(sm[2]) } : { before: null, after: null },
    text,
  };
}

/* The tally: a cohort's parsed codes → what a tutor wants in the seminar.
   Quarter by quarter, how often each call was right; how the cohort's
   profit compared with an untouched funnel; who wrote a recommendation;
   the skills ratings before and after. */
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function tally(results) {
  const ok = results.filter((r) => r && !r.error);
  const played = ok.filter((r) => r.leak.length);
  const nQ = Math.max(0, ...played.map((r) => r.leak.length));
  const quarters = Array.from({ length: nQ }, (_, i) => {
    const at = played.filter((r) => r.leak.length > i);
    return { quarter: i + 1, of: at.length, leak: at.filter((r) => r.leak[i]).length, bet: at.filter((r) => r.bet[i]).length };
  });
  const vs = played.map((r) => r.vsUntouchedK).filter((v) => v != null);
  const recs = ok.filter((r) => r.recommendation);
  return {
    students: ok.length, played: played.length, errors: results.filter((r) => r?.error),
    seeds: [...new Set(played.map((r) => r.seed))], quarters,
    profit: { n: vs.length, meanK: mean(vs), beat: vs.filter((v) => v > 0).length, bestK: vs.length ? Math.max(...vs) : null, worstK: vs.length ? Math.min(...vs) : null },
    recommendations: { written: recs.length, meanChecks: mean(recs.map((r) => r.recommendation.checks)) },
    skills: SKILL_STATEMENTS.map((s) => {
      const b = ok.map((r) => r.skills.before?.[s.id]).filter(Boolean), a = ok.map((r) => r.skills.after?.[s.id]).filter(Boolean);
      return { ...s, before: mean(b), beforeN: b.length, after: mean(a), afterN: a.length };
    }),
  };
}
