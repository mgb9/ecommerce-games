import { CASES, variantFor } from "../engine/engine.js";
import { FIELD_CASE } from "../engine/fieldcase-meta.js";

/* Every case in play order — the generated cases, then the field-data case
   (index CASES.length) — as the inbox and the case file list them. Only the
   field case's metadata is imported, never its data, so neither screen pulls
   in the 2015 archive. */
export const ALL_CASES = [
  ...CASES.map((c) => ({ id: c.id, n: c.n, difficulty: c.difficulty, title: c.title, lesson: c.lesson, outcomes: c.outcomes, field: false })),
  { id: FIELD_CASE.id, n: FIELD_CASE.n, difficulty: FIELD_CASE.difficulty, title: FIELD_CASE.title, lesson: FIELD_CASE.lesson, outcomes: FIELD_CASE.outcomes, field: true },
];
export const caseAt = (idx) => ALL_CASES[idx];

export const DIFFICULTY_COLOR = { Beginner: "#3A9E3A", Intermediate: "#FBB034", Advanced: "#F47920", "Field data": "#8A6D45" };

export const isPlayed = (progress, id) => progress[id]?.first !== undefined;

// Which attempt opening a case starts. A case this browser has already
// played opens on the NEXT variant, so the answer the reveal showed is never
// replayed — even in a new tab, where this session's attempt count is gone.
// The field case is real data: there is only one version of it.
export function nextAttempt(idx, attempts, progress) {
  if (idx >= CASES.length) return 1;
  const at = attempts[idx] || 1;
  return isPlayed(progress, CASES[idx].id) ? at + 1 : at;
}

// The ticket a student would get on opening a case with these settings.
export function ticketFor(idx, cfg, attempt) {
  if (idx >= CASES.length) return FIELD_CASE.ticket;
  const c = CASES[idx];
  return c.variants[variantFor(c.id, cfg.seed, attempt)].ticket;
}
