import { CASES, variantFor } from "../engine/engine.js";
import { FIELD_CASES_META } from "../engine/fieldcase-meta.js";

/* Every case in play order — by case number — as the inbox and the case
   file list them: the generated cases (CASES) and the field-data cases
   (real 2015 exports, cases 9 and 10). Only the field cases' metadata is
   imported, never their data, so neither screen pulls in the archive.
   App's `caseIndex` is an index into this list; `genIndex` is a generated
   case's index into CASES, `fieldId` a field case's id. */
export const ALL_CASES = [
  ...CASES.map((c, genIndex) => ({ id: c.id, n: c.n, difficulty: c.difficulty, title: c.title, lesson: c.lesson, outcomes: c.outcomes, kind: "generated", genIndex })),
  ...FIELD_CASES_META.map((c) => ({ id: c.id, n: c.n, difficulty: c.difficulty, title: c.title, lesson: c.lesson, outcomes: c.outcomes, kind: "field", fieldId: c.id, ticket: c.ticket })),
].sort((a, b) => a.n - b.n);
export const caseAt = (idx) => ALL_CASES[idx];
export const isFieldAt = (idx) => ALL_CASES[idx]?.kind === "field";

export const DIFFICULTY_COLOR = { Beginner: "#3A9E3A", Intermediate: "#FBB034", Advanced: "#F47920", "Field data": "#8A6D45" };

export const isPlayed = (progress, id) => progress[id]?.first !== undefined;

// Which attempt opening a case starts. A case this browser has already
// played opens on the NEXT variant, so the answer the reveal showed is never
// replayed — even in a new tab, where this session's attempt count is gone.
// The field cases are real data: there is only one version of each.
export function nextAttempt(idx, attempts, progress) {
  const c = ALL_CASES[idx];
  if (c.kind === "field") return 1;
  const at = attempts[idx] || 1;
  return isPlayed(progress, c.id) ? at + 1 : at;
}

// The ticket a student would get on opening a case with these settings.
export function ticketFor(idx, cfg, attempt) {
  const c = ALL_CASES[idx];
  if (c.kind === "field") return c.ticket;
  const def = CASES[c.genIndex];
  return def.variants[variantFor(def.id, cfg.seed, attempt)].ticket;
}
