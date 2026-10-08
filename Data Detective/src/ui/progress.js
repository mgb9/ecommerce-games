/* Which cases this browser has played, for the case picker. Only the FIRST
   attempt at a case is recorded: once the reveal has shown the answer, a
   retry proves nothing — so retries (which also switch to a fresh variant)
   never overwrite it. The student's stated confidence is kept too, for the
   calibration summary. Finishing any case also sets the hub's "played"
   flag for Data Detective (the hub page reads the same key). Storage can be
   missing or blocked: every access is guarded and failure just means no marks. */
const KEY = "dd-progress";
const HUB_KEY = "wmg-games-progress";

export const CONFIDENCE = [
  { id: 50, label: "A hunch", hint: "about 50% sure" },
  { id: 70, label: "Fairly sure", hint: "about 70% sure" },
  { id: 90, label: "Very sure", hint: "about 90% sure" },
];

export function loadProgress() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}

export function recordFirstAttempt(caseId, score, outOf, confidence) {
  try {
    const all = loadProgress();
    if (all[caseId]?.first === undefined) {
      all[caseId] = { first: score, outOf, confidence };
      localStorage.setItem(KEY, JSON.stringify(all));
    }
    const hub = JSON.parse(localStorage.getItem(HUB_KEY)) || {};
    if (!hub.dd) { hub.dd = true; localStorage.setItem(HUB_KEY, JSON.stringify(hub)); }
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
