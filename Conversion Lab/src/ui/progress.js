/* What this browser has done, across visits (localStorage): each lab
   experiment's FIRST attempt — the honest record, before the student has
   seen the answer — so the intro can show which experiments are done.
   Finishing any experiment, quiz or wireframe test also sets the hub's
   "played" flag for Conversion Lab (the hub page reads the same key).
   Storage can be missing or blocked: then nothing is remembered. */
const KEY = "cl-progress";
const HUB_KEY = "wmg-games-progress";

export function loadProgress() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
export function markHubPlayed() {
  try {
    const hub = JSON.parse(localStorage.getItem(HUB_KEY)) || {};
    if (!hub.cl) { hub.cl = true; localStorage.setItem(HUB_KEY, JSON.stringify(hub)); }
  } catch {}
}
// Keeps the first attempt only; later attempts don't overwrite it.
export function recordFirstAttempt(id, { soundCall, matchedTruth, predictionCorrect, bandCorrect, seed }) {
  markHubPlayed();
  try {
    const p = loadProgress();
    if (p[id]) return p[id];
    p[id] = { soundCall, matchedTruth, predictionCorrect, bandCorrect, seed, at: new Date().toISOString().slice(0, 10) };
    localStorage.setItem(KEY, JSON.stringify(p));
    return p[id];
  } catch { return null; }
}
