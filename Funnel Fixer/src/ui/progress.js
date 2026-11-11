/* What this browser has done, across visits (localStorage). The FIRST
   finished run is the honest record — made before the student had seen how
   the funnel responds — so later runs never overwrite it; the best profit
   and the number of runs are kept beside it. Finishing a run sets the hub's
   "played" flag for Funnel Fixer (the hub page reads the same key).
   Storage can be missing or blocked: then nothing is remembered. */
const KEY = "ff-progress";
const HUB_KEY = "wmg-games-progress";

export function loadProgress() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
export function markHubPlayed() {
  try {
    const hub = JSON.parse(localStorage.getItem(HUB_KEY)) || {};
    if (!hub.ff) { hub.ff = true; localStorage.setItem(HUB_KEY, JSON.stringify(hub)); }
  } catch {}
}
export function recordRun({ seed, quarters, profit, leakHits, betHits }) {
  markHubPlayed();
  const all = loadProgress();
  const run = { seed, quarters, profit: Math.round(profit), leakHits, betHits, at: new Date().toISOString().slice(0, 10) };
  const next = { first: all.first || run, best: !all.best || run.profit > all.best.profit ? run : all.best, runs: (all.runs || 0) + 1 };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  return next;
}
