/* What this browser has done, across visits (localStorage). The FIRST
   completed game on each client brief is the honest record — played before
   the student had seen how that brief turns out — so replays never
   overwrite it: the setup, the result and the judgements made along the
   way (see runRecord in cohort.js), for the decision log, the intro and
   the result code. The recommendation the student writes on the end screen
   is kept with it, and a replay's end screen updates it too, since the
   writing is the point, not the score.
   Finishing a game sets the hub's "played" flag for Marketplace Tycoon
   (the hub page reads the same key). Storage can be missing or blocked:
   then nothing is remembered. */
const KEY = "mt-progress";
const HUB_KEY = "wmg-games-progress";
const SKILLS_KEY = "mt-skills";

export function loadProgress() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function save(all) { try { localStorage.setItem(KEY, JSON.stringify(all)); } catch {} }
const today = () => new Date().toISOString().slice(0, 10);

export function markHubPlayed() {
  try {
    const hub = JSON.parse(localStorage.getItem(HUB_KEY)) || {};
    if (!hub.mt) { hub.mt = true; localStorage.setItem(HUB_KEY, JSON.stringify(hub)); }
  } catch {}
}

// Keeps the first completed game on a brief; later games don't overwrite it.
export function recordGame(rec, seed) {
  markHubPlayed();
  const all = loadProgress();
  if (!all[rec.brief]) {
    all[rec.brief] = { ...rec, seed, at: today() };
    save(all);
  }
  return all;
}
// The recommendation to the client: its text and how many of the four
// self-checks were ticked. Text stays in this browser; the result code
// carries only whether it was written and the number of checks.
export function recordRecommendation(brief, { text, checks, ticks }) {
  const all = loadProgress();
  if (!all[brief]) return;
  // `ticks` (which boxes) is only so the form comes back as it was left
  all[brief].recommendation = { text: String(text || ""), checks: Number(checks) || 0, ...(Array.isArray(ticks) ? { ticks: ticks.map(Boolean) } : {}) };
  save(all);
}

/* The student's own rating of six skills, 1–5, before their first game and
   again later (the decision log asks). {before, beforeAt, after, afterAt};
   `before: null` means they chose to skip it. */
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
