/* What this browser has done, across visits (localStorage). The FIRST
   finished run is the honest record — made before the student had seen how
   the funnel responds — so later runs never overwrite it: its quarter-by-
   quarter calls and purchases, and the debrief written from it, feed the
   diagnosis log and the result code. The best profit and the number of
   runs are kept beside it. The recommendation the student writes (on the
   debrief) is kept too, and any run's debrief can update it — the writing
   is the point, not the score. Finishing a run sets the hub's "played"
   flag for Funnel Fixer (the hub page reads the same key).
   Storage can be missing or blocked: then nothing is remembered. */
const KEY = "ff-progress";
const HUB_KEY = "wmg-games-progress";
const SKILLS_KEY = "ff-skills";

export function loadProgress() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function save(all) { try { localStorage.setItem(KEY, JSON.stringify(all)); } catch {} }
const today = () => new Date().toISOString().slice(0, 10);

export function markHubPlayed() {
  try {
    const hub = JSON.parse(localStorage.getItem(HUB_KEY)) || {};
    if (!hub.ff) { hub.ff = true; localStorage.setItem(HUB_KEY, JSON.stringify(hub)); }
  } catch {}
}

// One quarter of a run, as the log prints it.
const ROW = ["quarter", "predLeak", "actualLeak", "leakCorrect", "gapStage", "predBest", "bestBets", "roiCorrect", "allocations", "spend", "grossProfit", "notPaidBack"];
export function summariseRun({ seed, records, profit, untouched, cards = [] }) {
  return {
    seed, quarters: records.length, profit: Math.round(profit), untouched: Math.round(untouched),
    leakHits: records.filter((r) => r.leakCorrect).length, betHits: records.filter((r) => r.roiCorrect).length,
    leakBits: records.map((r) => !!r.leakCorrect), betBits: records.map((r) => !!r.roiCorrect),
    rows: records.map((r) => Object.fromEntries(ROW.map((k) => [k, r[k]]))),
    cards: cards.map((c) => ({ title: c.title, body: c.body })),
    at: today(),
  };
}
export function recordRun(run) {
  markHubPlayed();
  const all = loadProgress();
  const next = { ...all, first: all.first || run, best: !all.best || run.profit > all.best.profit ? { seed: run.seed, quarters: run.quarters, profit: run.profit, at: run.at } : all.best, runs: (all.runs || 0) + 1 };
  save(next);
  return next;
}
// The recommendation: its text and how many of the four self-checks were
// ticked. The text stays in this browser; the result code carries only
// whether it was written and the number of checks.
export function recordRecommendation({ text, checks, ticks }) {
  const all = loadProgress();
  // `ticks` (which boxes) is only so the form comes back as it was left
  all.recommendation = { text: String(text || ""), checks: Number(checks) || 0, ...(Array.isArray(ticks) ? { ticks: ticks.map(Boolean) } : {}) };
  save(all);
  return all;
}

/* The student's own rating of six skills, 1–5, before their first game and
   again later (the diagnosis log asks). {before, beforeAt, after, afterAt};
   `before: null` means they chose to skip it. */
export function loadSkills() {
  try { return JSON.parse(localStorage.getItem(SKILLS_KEY)) || {}; } catch { return {}; }
}
export function saveSkills(patch) {
  const next = { ...loadSkills(), ...patch };
  try { localStorage.setItem(SKILLS_KEY, JSON.stringify(next)); } catch {}
  return next;
}
