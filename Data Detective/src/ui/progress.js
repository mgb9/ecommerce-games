/* Which cases this browser has played, for the inbox and the case file.
   Only the FIRST attempt at a case is recorded: once the reveal has shown
   the answer, a retry proves nothing — so retries (which also switch to a
   fresh variant) never overwrite it. The record keeps the score, the
   student's stated confidence (for calibration), which calls were right
   (`calls`, so a cohort tally can say which call is missed most) and,
   later, whether the reply to the ticket was written and self-checked.
   Finishing any case also sets the hub's "played" flag for Data Detective
   (the hub page reads the same key). Storage can be missing or blocked:
   every access is guarded and failure just means no marks. */
const KEY = "dd-progress";
const HUB_KEY = "wmg-games-progress";
const SKILLS_KEY = "dd-skills";

export const CONFIDENCE = [
  { id: 50, label: "A hunch", hint: "about 50% sure" },
  { id: 70, label: "Fairly sure", hint: "about 70% sure" },
  { id: 90, label: "Very sure", hint: "about 90% sure" },
];

export function loadProgress() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function save(all) { try { localStorage.setItem(KEY, JSON.stringify(all)); } catch {} }

export function recordFirstAttempt(caseId, score, outOf, confidence, { calls } = {}) {
  try {
    const all = loadProgress();
    if (all[caseId]?.first === undefined) {
      all[caseId] = { first: score, outOf, confidence, ...(calls ? { calls: calls.map(Boolean) } : {}), at: new Date().toISOString().slice(0, 10) };
      save(all);
    }
    const hub = JSON.parse(localStorage.getItem(HUB_KEY)) || {};
    if (!hub.dd) { hub.dd = true; localStorage.setItem(HUB_KEY, JSON.stringify(hub)); }
  } catch {}
}

// The reply to the ticket's sender (in the case report): whether one was
// written, and how many of the four self-check boxes were ticked. Kept on
// the case's first-attempt record; a retry's report updates it too, since
// the writing is the point, not the score.
export function recordReply(caseId, { written, checks }) {
  try {
    const all = loadProgress();
    if (!all[caseId]) return;
    all[caseId].reply = { written: !!written, checks: Number(checks) || 0 };
    save(all);
  } catch {}
}

// For each confidence level the student has used on a first attempt: how
// many cases, and how many they got fully right.
export function calibration(progress) {
  return CONFIDENCE.map((c) => {
    const at = Object.values(progress).filter((p) => p.confidence === c.id);
    return { ...c, cases: at.length, right: at.filter((p) => p.first === p.outOf).length };
  }).filter((c) => c.cases > 0);
}

/* The student's own rating of six skills, 1–5, before their first case
   and again later (the case file asks). {before, beforeAt, after, afterAt};
   `before: null` means they chose to skip it. */
export function loadSkills() {
  try { return JSON.parse(localStorage.getItem(SKILLS_KEY)) || {}; } catch { return {}; }
}
export function saveSkills(patch) {
  try {
    const cur = loadSkills();
    const next = { ...cur, ...patch };
    localStorage.setItem(SKILLS_KEY, JSON.stringify(next));
    return next;
  } catch { return { ...loadSkills(), ...patch }; }
}
