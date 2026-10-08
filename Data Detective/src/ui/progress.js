/* Which cases this browser has finished, and the best score on each — for
   the ✓ marks in the case picker. Finishing any case also sets the hub's
   "played" flag for Data Detective (the hub page reads the same key). Storage
   can be missing or blocked (private windows, strict settings): every
   access is guarded, and failure just means no marks. */
const KEY = "dd-progress";
const HUB_KEY = "wmg-games-progress";

export function loadProgress() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}

export function recordResult(caseId, score, outOf) {
  try {
    const all = loadProgress();
    all[caseId] = { best: Math.max(score, all[caseId]?.best ?? 0), outOf };
    localStorage.setItem(KEY, JSON.stringify(all));
    const hub = JSON.parse(localStorage.getItem(HUB_KEY)) || {};
    if (!hub.dd) { hub.dd = true; localStorage.setItem(HUB_KEY, JSON.stringify(hub)); }
  } catch {}
}
