import { CASES } from "../engine/engine.js";

/* URL parameters let an instructor send a cohort straight to one case with
   a fixed seed and noise level: ?case=3&seed=DD-2026&noise=1.4. Case 9 is
   the field-data case. With no (valid) case the game opens on the case
   inbox; any other missing or invalid value falls back to its default, so
   a bad link still opens the game. */
export const DEFAULT_CFG = { seed: "DD-2026", noise: 1.4 };
const CASE_COUNT = CASES.length + 1;

export function readUrlConfig(search = typeof location === "undefined" ? "" : location.search) {
  const q = new URLSearchParams(search);
  const n = Number.parseInt(q.get("case"), 10);
  const noise = Number.parseFloat(q.get("noise"));
  const seed = (q.get("seed") || "").trim().slice(0, 40);
  return {
    caseIndex: n >= 1 && n <= CASE_COUNT ? n - 1 : null,   // null = the inbox
    cfg: {
      seed: seed || DEFAULT_CFG.seed,
      noise: noise >= 0.2 && noise <= 2 ? Math.round(noise * 10) / 10 : DEFAULT_CFG.noise,
    },
  };
}

export function caseLink({ caseN, seed, noise }, base = typeof location === "undefined" ? "" : location.origin + location.pathname) {
  // no caseN: a link to the inbox with these settings
  return `${base}?${new URLSearchParams({ ...(caseN ? { case: String(caseN) } : {}), seed, noise: noise.toFixed(1) })}`;
}
