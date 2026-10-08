// Display formatters. The engine owns gbp/pct/pp (its tests use them);
// they're re-exported here so UI modules have one place to import from.
export { gbp, pct, pp } from "../engine/engine.js";

export const num = (v) => Math.round(v).toLocaleString("en-GB");
export const secs = (v) => `${Math.round(v)}s`;
export const minSec = (s) => `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, "0")}s`;
export const pad2 = (n) => String(n).padStart(2, "0");
export const ordinal = (n) => { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
