/* What this browser has done, across visits (localStorage). Each lab
   experiment's FIRST attempt is the honest record — before the student has
   seen the answer — so retries never overwrite it: the prediction, the call
   and both judgements of it, the plan and what the run showed, for the
   experiment log, the intro and the result code. The recommendation the
   student writes (on the verdict) is kept with it, and a retry's verdict
   updates it too, since the writing is the point, not the score. The first
   completed quiz and first wireframe test are kept the same way.
   Finishing anything sets the hub's "played" flag for Conversion Lab (the
   hub page reads the same key). Storage can be missing or blocked: then
   nothing is remembered. */
const KEY = "cl-progress";
const HUB_KEY = "wmg-games-progress";
const SKILLS_KEY = "cl-skills";

export function loadProgress() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function save(all) { try { localStorage.setItem(KEY, JSON.stringify(all)); } catch {} }
const today = () => new Date().toISOString().slice(0, 10);

export function markHubPlayed() {
  try {
    const hub = JSON.parse(localStorage.getItem(HUB_KEY)) || {};
    if (!hub.cl) { hub.cl = true; localStorage.setItem(HUB_KEY, JSON.stringify(hub)); }
  } catch {}
}

const KEEP = ["title", "concept", "predictedWinner", "predictionCorrect", "predictedBand", "bandCorrect", "plannedN", "actualN", "stoppedEarly",
  "obsDiff", "ciLow", "ciHigh", "pValue", "significant", "call", "soundCall", "matchedTruth", "trueDiff"];
// Keeps the first attempt only; later attempts don't overwrite it.
export function recordFirstAttempt(id, rec, seed) {
  markHubPlayed();
  const all = loadProgress();
  if (!all[id]) {
    all[id] = { ...Object.fromEntries(KEEP.map((k) => [k, rec[k]])), seed, at: today() };
    save(all);
  }
  return all[id];
}
// The recommendation to the team: its text and how many of the four
// self-checks were ticked. Text stays in this browser; the result code
// carries only whether it was written and the number of checks.
export function recordRecommendation(id, { text, checks }) {
  const all = loadProgress();
  if (!all[id]) return;
  all[id].recommendation = { text: String(text || ""), checks: Number(checks) || 0 };
  save(all);
}
export function recordQuiz({ points, max }) {
  markHubPlayed();
  const all = loadProgress();
  if (!all.quiz) { all.quiz = { points, max, at: today() }; save(all); }
}
export function recordWireframe({ brief, bandCorrect, metricCorrect, powerOk }) {
  markHubPlayed();
  const all = loadProgress();
  if (!all.wireframe) { all.wireframe = { brief, bandCorrect, metricCorrect, powerOk, at: today() }; save(all); }
}

/* The student's own rating of six skills, 1–5, before their first
   experiment and again later (the experiment log asks). {before, beforeAt,
   after, afterAt}; `before: null` means they chose to skip it. */
export function loadSkills() {
  try { return JSON.parse(localStorage.getItem(SKILLS_KEY)) || {}; } catch { return {}; }
}
export function saveSkills(patch) {
  try {
    const next = { ...loadSkills(), ...patch };
    localStorage.setItem(SKILLS_KEY, JSON.stringify(next));
    return next;
  } catch { return { ...loadSkills(), ...patch }; }
}
