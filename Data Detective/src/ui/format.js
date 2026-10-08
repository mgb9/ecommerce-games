// Display formatters. The engine owns gbp/pct/pp (its tests use them);
// they're re-exported here so UI modules have one place to import from.
export { gbp, pct, pp } from "../engine/engine.js";

export const num = (v) => Math.round(v).toLocaleString("en-GB");
// Pence matter for an average order value: £42 → £41.60 must not read as "no change".
export const gbp2 = (v) => "£" + v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// A RELATIVE change (late − early) / early, e.g. "−66%". Not percentage points:
// for a rate, pair it with pp(late − early) — the absolute difference.
export const rel = (d, dp = 0) => `${d >= 0 ? "+" : "\u2212"}${Math.abs(d * 100).toFixed(dp)}%`;
export const secs = (v) => `${Math.round(v)}s`;
export const minSec = (s) => `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, "0")}s`;
export const pad2 = (n) => String(n).padStart(2, "0");
export const ordinal = (n) => { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
