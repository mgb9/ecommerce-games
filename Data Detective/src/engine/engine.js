/* ============================================================
   DATA DETECTIVE — pure, seeded root-cause diagnosis engine (no
   React, no I/O). generateCase() builds one deterministic case: a
   daily topline series plus a breakdown by every dimension in
   DIMENSIONS (device, browser, country, source, payment, page,
   campaign, user type, region, age, gender), with at most one
   incident — in one segment, or one two-dimension cell.

   The engine's defining property — and the thing that makes
   diagnosis a real skill rather than a lucky click — is this: every
   session has independent attributes across all the dimensions, so
   a segment's rate is the topline rate scaled by how far that
   segment's own multiplier sits from its dimension's weighted
   average:

     rate(segment in dim D, day t) = topline(t) · mult(segment, t) / W_D(t)
     where W_D(t) = Σ_segments share(t) · mult(t)   (a per-day weighted average)

   Consequence: in the dimension that actually contains the
   incident, the affected segment's mult — and so its rate — moves
   on its own while every other segment in that dimension barely
   shifts. In every OTHER dimension, no segment's own mult changes,
   so EVERY segment there just rides the topline up and down
   together, in lockstep — there is no differential signal to find.
   Checking the wrong dimension looks like "everything dropped";
   checking the right one isolates exactly one line. That is the
   game. The formula also guarantees segment purchases/sessions sum
   back to the topline exactly, for every dimension, every day —
   asserted as an explicit invariant in the tests.

   Same architecture as the rest of the suite: dependency-free,
   seeded via makeRng(seed), recharts for the charts.
   ============================================================ */

import { CASES } from "./cases.js";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const gbp = (n) => "£" + Math.round(n).toLocaleString("en-GB");
const pct = (p, dp = 1) => (p * 100).toFixed(dp) + "%";
const pp = (d, dp = 1) => (d >= 0 ? "+" : "") + (d * 100).toFixed(dp) + "pp";

/* ---- seeded RNG (mulberry32 + string hash), as in the suite ---- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeRng(str) {
  let h = 1779033703 ^ String(str).length;
  for (let i = 0; i < String(str).length; i++) { h = Math.imul(h ^ String(str).charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return mulberry32(h >>> 0);
}

const TOTAL_DAYS = 28;
const BASE_SESSIONS = 2800;
const BASE_CONVERSION = 0.038;
const AOV = 42;
// Extra GA4-style engagement metrics. These ride alongside conversion as
// realistic detail AND as decoys — they're independent of any incident, so a
// student who chases "engagement dropped" finds nothing; only conversion
// actually breaks. More data, more ways to go wrong.
const BASE_ENG_RATE = 0.56;       // engaged sessions / sessions
const BASE_ENG_TIME = 94;         // average engagement time, seconds
const BASE_EVENTS = 5.4;          // events per session
const NEW_SHARE = 0.62;           // share of sessions from new users
// Stable per-segment character (not seed-dependent): some segments are simply
// more engaged than others. Hash the id so we don't hand-author it everywhere.
const engMultOf = (id) => 0.86 + makeRng("eng:" + id)() * 0.28;   // [0.86, 1.14]
const evMultOf = (id) => 0.80 + makeRng("ev:" + id)() * 0.45;     // [0.80, 1.25]
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SEASONALITY = [1.00, 1.02, 1.03, 1.02, 1.05, 0.88, 0.85]; // Mon..Sun, a quieter weekend
const EARLY_WINDOW = [0, 6];                    // week 1 — the "before" reference
const LATE_WINDOW = [TOTAL_DAYS - 7, TOTAL_DAYS - 1]; // week 4 — the "now" reference
const dayShort = (day) => `W${Math.floor(day / 7) + 1} ${WEEKDAYS[day % 7]}`;
const dayLong = (day) => `Week ${Math.floor(day / 7) + 1}, ${WEEKDAYS[day % 7]} — day ${day + 1} of ${TOTAL_DAYS}`;

/* ---- the dimensions every case is sliced by -------------------
   Independent of the incident: `share` of sessions, a baseline
   `mult` on conversion (some segments just convert better than
   others, e.g. organic search > paid social) and an `aov` multiplier
   on average order value (45–54s spend more per order than 18–24s).
   These never change over time except where an incident or a
   session-shift event explicitly targets one segment.

   AOV spread is deliberately wide only where no case shifts the mix
   (country, region, age, gender) and close to 1.0 elsewhere — so a
   case's revenue story isn't quietly changed by its traffic shifts.
   Bank transfer's big baskets are the one exception, and a small one. */
const DIMENSIONS = [
  { key: "device", label: "Device", segments: [
    { id: "desktop", name: "Desktop", share: 0.52, mult: 1.05, aov: 1.04 },
    { id: "mobile", name: "Mobile", share: 0.40, mult: 0.85, aov: 0.96 },
    { id: "tablet", name: "Tablet", share: 0.08, mult: 0.95, aov: 1.0 },
  ]},
  { key: "browser", label: "Browser", segments: [
    { id: "chrome", name: "Chrome", share: 0.55, mult: 1.0, aov: 1.0 },
    { id: "safari", name: "Safari", share: 0.25, mult: 0.95, aov: 1.03 },
    { id: "firefox", name: "Firefox", share: 0.10, mult: 1.05, aov: 0.98 },
    { id: "edge", name: "Edge", share: 0.10, mult: 0.90, aov: 0.97 },
  ]},
  { key: "country", label: "Country", segments: [
    { id: "uk", name: "UK", share: 0.45, mult: 1.10, aov: 1.0 },
    { id: "de", name: "Germany", share: 0.20, mult: 0.95, aov: 1.1 },
    { id: "fr", name: "France", share: 0.15, mult: 0.90, aov: 1.05 },
    { id: "us", name: "USA", share: 0.12, mult: 1.00, aov: 1.2 },
    { id: "other", name: "Other", share: 0.08, mult: 0.80, aov: 0.85 },
  ]},
  { key: "source", label: "Traffic source", segments: [
    { id: "organic", name: "Organic search", share: 0.40, mult: 1.10, aov: 1.0 },
    { id: "paidsearch", name: "Paid search", share: 0.20, mult: 0.95, aov: 1.03 },
    { id: "paidsocial", name: "Paid social", share: 0.15, mult: 0.80, aov: 0.95 },
    { id: "email", name: "Email", share: 0.15, mult: 1.20, aov: 1.02 },
    { id: "direct", name: "Direct", share: 0.10, mult: 1.00, aov: 1.04 },
  ]},
  { key: "payment", label: "Payment method", segments: [
    { id: "card", name: "Card", share: 0.55, mult: 1.00, aov: 1.0 },
    { id: "paypal", name: "PayPal", share: 0.25, mult: 1.05, aov: 1.0 },
    { id: "applepay", name: "Apple Pay", share: 0.12, mult: 1.10, aov: 1.0 },
    { id: "bank", name: "Bank transfer", share: 0.08, mult: 0.60, aov: 1.6 },
  ]},
  { key: "page", label: "Landing page", segments: [
    { id: "home", name: "Homepage", share: 0.30, mult: 1.00, aov: 1.0 },
    { id: "category", name: "Category page", share: 0.35, mult: 0.90, aov: 1.03 },
    { id: "product", name: "Product page", share: 0.25, mult: 1.15, aov: 0.97 },
    { id: "search", name: "Search results", share: 0.10, mult: 0.80, aov: 1.0 },
  ]},
  { key: "campaign", label: "Campaign", segments: [
    { id: "brand", name: "Brand search", share: 0.30, mult: 1.10, aov: 1.02 },
    { id: "generic", name: "Generic / non-brand", share: 0.25, mult: 0.85, aov: 0.97 },
    { id: "retargeting", name: "Retargeting", share: 0.15, mult: 1.20, aov: 1.04 },
    { id: "none", name: "(not set)", share: 0.30, mult: 1.00, aov: 1.0 },
  ]},
  { key: "userType", label: "User type", segments: [
    { id: "new", name: "New", share: 0.62, mult: 0.85, aov: 1.0 },
    { id: "returning", name: "Returning", share: 0.38, mult: 1.45, aov: 1.0 },
  ]},
  { key: "region", label: "Region", segments: [
    { id: "london", name: "London", share: 0.24, mult: 1.15, aov: 1.15 },
    { id: "southeast", name: "South East", share: 0.20, mult: 1.05, aov: 1.06 },
    { id: "north", name: "North", share: 0.22, mult: 0.92, aov: 0.92 },
    { id: "midlands", name: "Midlands", share: 0.16, mult: 0.95, aov: 0.95 },
    { id: "scotwales", name: "Scotland & Wales", share: 0.10, mult: 0.90, aov: 0.94 },
    { id: "regother", name: "Other / unknown", share: 0.08, mult: 0.85, aov: 0.9 },
  ]},
  { key: "age", label: "Age", segments: [
    { id: "a18", name: "18–24", share: 0.18, mult: 0.85, aov: 0.72 },
    { id: "a25", name: "25–34", share: 0.27, mult: 1.05, aov: 0.93 },
    { id: "a35", name: "35–44", share: 0.24, mult: 1.10, aov: 1.08 },
    { id: "a45", name: "45–54", share: 0.18, mult: 1.05, aov: 1.15 },
    { id: "a55", name: "55+", share: 0.13, mult: 0.95, aov: 1.05 },
  ]},
  { key: "gender", label: "Gender", segments: [
    { id: "female", name: "Female", share: 0.52, mult: 1.05, aov: 1.02 },
    { id: "male", name: "Male", share: 0.43, mult: 0.97, aov: 1.0 },
    { id: "gunknown", name: "Unknown", share: 0.05, mult: 0.85, aov: 0.9 },
  ]},
];
const DMAP = Object.fromEntries(DIMENSIONS.map((d) => [d.key, d]));

// GA-style left-nav grouping. Report `label` (what the nav shows) can differ
// from the dimension's own `label` (the table's column header). Every report
// is just one of the dimensions above — the depth comes from there being many
// of them, plus the secondary-dimension pivot available on each.
const REPORTS = [
  { group: "Acquisition", items: [{ dim: "source", label: "Traffic acquisition" }, { dim: "campaign", label: "Campaigns" }] },
  { group: "Engagement", items: [{ dim: "page", label: "Landing pages" }] },
  { group: "Monetisation", items: [{ dim: "payment", label: "Checkout by payment" }] },
  { group: "Demographics", items: [{ dim: "country", label: "Country" }, { dim: "region", label: "Region" }, { dim: "age", label: "Age" }, { dim: "gender", label: "Gender" }, { dim: "userType", label: "New vs returning" }] },
  { group: "Tech", items: [{ dim: "device", label: "Device category" }, { dim: "browser", label: "Browser" }] },
];

// Each label names WHERE the fault is, so that exactly one fits each case:
// a release that broke a payment provider is a payment failure, a warehouse
// upgrade that broke delivery slots is a fulfilment failure, and lost
// campaign tags move the credit without losing a single recorded sale.
const CAUSE_TYPES = [
  { id: "deploy_bug", label: "A website release broke part of the site" },
  { id: "gateway_failure", label: "Payment with one provider or method stopped working" },
  { id: "traffic_quality", label: "The traffic mix changed — more low-intent visitors" },
  { id: "tracking_bug", label: "Analytics stopped recording some sales — the drop isn't real" },
  { id: "inventory", label: "Stock ran out" },
  { id: "pricing_promo", label: "A pricing or promotion change" },
  { id: "fulfilment", label: "Delivery, warehouse or fulfilment systems failed" },
  { id: "attribution_change", label: "Analytics now credits sales to different channels — the total is unchanged" },
  { id: "external_no_issue", label: "Nothing is broken — normal variation or a calendar effect" },
];

const CASEMAP = Object.fromEntries(CASES.map((c) => [c.id, c]));

/* ---- incident & session-shift shaping ------------------------
   A sudden break ('cliff') holds at `factor`; 'gradual' ramps in over
   10 days (a slow bleed); 'spike-revert' is a short-lived blip — `days`
   long, 5 by default — that then heals on its own. */
function incidentFactorAt(day, incident) {
  if (!incident || day < incident.startDay) return 1;
  const { shape, factor, startDay } = incident;
  if (shape === "gradual") { const t = clamp((day - startDay) / 10, 0, 1); return 1 + (factor - 1) * t; }
  if (shape === "spike-revert") return day < startDay + (incident.days ?? 5) ? factor : 1;
  return factor; // cliff
}
function sessionShiftFactorAt(day, dimKey, segId, shiftEvents) {
  let f = 1;
  for (const s of shiftEvents || []) if (s.dimension === dimKey && s.segment === segId && s.days.includes(day)) f *= s.factor;
  return f;
}
// Apply any active session-shift to one dimension's shares for a day,
// renormalised back to summing to 1. An attribution incident that moves
// SESSIONS (lost campaign tags) hands `segment`'s lost share straight to
// `to` — the other segments don't change.
function effectiveShares(dim, day, shiftEvents, incident = null) {
  const raw = dim.segments.map((s) => s.share * sessionShiftFactorAt(day, dim.key, s.id, shiftEvents));
  if (incident?.type === "attribution" && incident.moves === "sessions" && incident.dimension === dim.key) {
    const f = incidentFactorAt(day, incident);
    const from = dim.segments.findIndex((s) => s.id === incident.segment), to = dim.segments.findIndex((s) => s.id === incident.to);
    const moved = raw[from] * (1 - f);
    raw[from] -= moved; raw[to] += moved;
  }
  const total = raw.reduce((a, b) => a + b, 0);
  return dim.segments.map((s, i) => ({ ...s, share: raw[i] / total }));
}
// A "tracking" incident (analytics stops recording some purchases) distorts
// the MEASURED data exactly like a real rate incident; only back-office
// orders tell them apart (see the topline's `orders`).
const isSegmentIncident = (incident) => incident && (incident.type === "rate" || incident.type === "tracking");
// An "aov" incident (a leaked discount code, a changed delivery threshold)
// cuts one segment's average order value by `factor` and may also nudge its
// conversion by `rateFactor` — cheaper baskets convert a little better. It is
// NOT a segment incident above: the funnel has no step to pin it to.
const hits = (incident, dim, seg) => incident.dimension === dim.key && incident.segment === seg.id;
const rateFactorOf = (incident) => ({ ...incident, factor: incident.rateFactor ?? 1 });
// An "attribution" incident moves what analytics ATTRIBUTES between two
// segments of one dimension, from day `startDay`; customers don't change,
// so the dimension's weighted average — and the topline, and the order
// book — are unchanged to the last decimal.
//   moves: "credit"   — an attribution-model change: `segment` keeps its
//                       sessions but its conversions are scaled by `factor`
//                       and the credit goes to `to`.
//   moves: "sessions" — lost campaign tags: `segment`'s sessions (and their
//                       conversions) are counted as `to`, so its own rate
//                       holds while `to` becomes a blend of the two.
function attributionMult(dim, seg, day, incident, shiftEvents) {
  if (incident?.type !== "attribution" || incident.dimension !== dim.key) return null;
  const f = incidentFactorAt(day, incident);
  if (f === 1) return null;
  const base = effectiveShares(dim, day, shiftEvents);   // shares before the move
  const from = base.find((s) => s.id === incident.segment), to = base.find((s) => s.id === incident.to);
  if (incident.moves === "sessions") {
    if (seg.id !== incident.to) return null;
    const moved = from.share * (1 - f);
    return (to.share * to.mult + moved * from.mult) / (to.share + moved);
  }
  if (seg.id === incident.segment) return seg.mult * f;
  if (seg.id === incident.to) return seg.mult + (from.share * from.mult * (1 - f)) / to.share;
  return null;
}
function effectiveMult(dim, seg, day, incident, shiftEvents) {
  if (isSegmentIncident(incident) && hits(incident, dim, seg)) return seg.mult * incidentFactorAt(day, incident);
  if (incident?.type === "aov" && hits(incident, dim, seg)) return seg.mult * incidentFactorAt(day, rateFactorOf(incident));
  return attributionMult(dim, seg, day, incident, shiftEvents) ?? seg.mult;
}
function effectiveAov(dim, seg, day, incident) {
  return incident?.type === "aov" && hits(incident, dim, seg) ? seg.aov * incidentFactorAt(day, incident) : seg.aov;
}
function weightedAvgMult(dim, day, incident, shiftEvents) {
  return effectiveShares(dim, day, shiftEvents, incident).reduce((a, s) => a + s.share * effectiveMult(dim, s, day, incident, shiftEvents), 0);
}
// Σ share·mult·aov — divided by the dimension's W it is the PURCHASE-weighted
// average order-value multiplier (buyers, not visitors, set the basket size).
function weightedAovNum(dim, day, incident, shiftEvents) {
  return effectiveShares(dim, day, shiftEvents, incident).reduce((a, s) => a + s.share * effectiveMult(dim, s, day, incident, shiftEvents) * effectiveAov(dim, s, day, incident), 0);
}
// Share-weighted average of a per-segment character (engagement, events).
const avgCharOf = (dim, charOf) => dim.segments.reduce((a, s) => a + s.share * charOf(s.id), 0);

// A "rate-joint" incident's two target segments and their joint baseline
// weight pJoint = shareA·multA·shareB·multB; null for any other incident.
function jointOf(incident) {
  if (!incident || incident.type !== "rate-joint") return null;
  const segA = DMAP[incident.dimA].segments.find((s) => s.id === incident.segA);
  const segB = DMAP[incident.dimB].segments.find((s) => s.id === incident.segB);
  return { dimA: incident.dimA, dimB: incident.dimB, segA, segB, pJoint: segA.share * segA.mult * segB.share * segB.mult, aovJoint: segA.aov * segB.aov };
}
// One day's per-dimension weighted multipliers W_D(t) and their product —
// the topline's conversion multiplier — with a joint incident's
// correction applied (see the algebra above generateCase). A "rate-joint"
// incident has no `.dimension`, so the ordinary per-dimension helpers
// treat it as a no-op and dimW is always the PLAIN marginal average.
//
// The same algebra gives the topline's order-value multiplier: per
// dimension, the purchase-weighted mean aov = num_D / W_D, multiplied
// across dimensions. Under a joint incident the pair's buyers are re-mixed,
// so its two factors become (numA·numB + pJoint·aovA·aovB·(jf−1)) / jointDenom.
function dayWeights(day, incident, shiftEvents, joint) {
  const dimW = {}, aovNum = {};
  for (const dim of DIMENSIONS) { dimW[dim.key] = weightedAvgMult(dim, day, incident, shiftEvents); aovNum[dim.key] = weightedAovNum(dim, day, incident, shiftEvents); }
  let convMultProduct = Object.values(dimW).reduce((a, b) => a * b, 1);
  let aovProduct = DIMENSIONS.reduce((p, d) => p * (aovNum[d.key] / dimW[d.key]), 1);
  let jf = 1, jointDenom = null;
  if (joint) {
    jf = incidentFactorAt(day, incident);
    const plainPair = dimW[joint.dimA] * dimW[joint.dimB];
    jointDenom = plainPair + joint.pJoint * (jf - 1);
    convMultProduct = (convMultProduct / plainPair) * jointDenom;
    const plainAovPair = (aovNum[joint.dimA] / dimW[joint.dimA]) * (aovNum[joint.dimB] / dimW[joint.dimB]);
    aovProduct = (aovProduct / plainAovPair) * ((aovNum[joint.dimA] * aovNum[joint.dimB] + joint.pJoint * joint.aovJoint * (jf - 1)) / jointDenom);
  }
  return { dimW, convMultProduct, aovProduct, jf, jointDenom };
}

/* ---- segment sampling noise ------------------------------------------
   Real segments wobble like samples of their size: a big segment barely
   moves from day to day, a small one (Tablet, Bank transfer, most cross-tab
   cells) is noisy. Without this, every unaffected segment moved in exact
   lockstep with the topline, so sorting a report by Δ handed over the
   answer with no judgement about what counts as noise. Each dimension's
   segments are rescaled afterwards to sum exactly to the topline, so the
   reconciliation invariant still holds. Everything scales with the case's
   noise level. */
const SEG_RATE_NOISE = 0.5;   // σ of a segment's daily purchases ≈ this × noise / √(expected purchases)
const TRACKING_COVERAGE = 0.96; // analytics normally records ~96% of back-office orders (ad blockers, consent)
const jitter = (rng, sigma) => clamp(1 + (rng() * 2 - 1) * sigma * Math.sqrt(3), 0.05, 3); // uniform, sd = sigma
const binomialSigma = (p, n) => Math.sqrt(Math.max(1 - p, 0) / Math.max(n * p, 1e-9));     // relative sd of a share/rate
const rescaleTo = (values, total) => { const sum = values.reduce((a, b) => a + b, 0); return sum > 0 ? values.map((v) => (v * total) / sum) : values; };
const purchaseSigma = (noise, expected) => (noise * SEG_RATE_NOISE) / Math.sqrt(Math.max(expected, 0.25));
// Order values vary a lot one order to the next, so a segment's AOV is a
// sample mean: its relative sd ≈ (spread of order values) / √orders. Capped
// so a cell with one order a day stays a plausible (if wild) number.
const AOV_SPREAD = 0.45;
const aovSigma = (noise, purchases) => Math.min(0.5, (noise * AOV_SPREAD) / Math.sqrt(Math.max(purchases, 0.25)));

// Calendar effects (a bank holiday, a cup final on TV) move the whole site.
function calendarAt(day, calendarEvents) {
  const e = (calendarEvents || []).find((c) => c.day === day);
  return { sessions: e?.sessions ?? 1, conversion: e?.conversion ?? 1 };
}
// The seed picks the variant, so a shared seed gives a cohort the same case.
function pickVariant(def, seed) {
  return Math.floor(makeRng(seed + ":" + def.id + ":variant")() * def.variants.length);
}
// Which variant attempt n at a case uses: the seed picks the first, and each
// retry moves on to the next, so "try a fresh variant" never replays the
// answer the reveal has just shown.
function variantFor(caseId, seed, attempt = 1) {
  const def = CASEMAP[caseId];
  return (pickVariant(def, seed) + attempt - 1) % def.variants.length;
}

/* ---- THE GENERATOR -------------------------------------------- */
//
// "rate-joint" incidents — a compound/interaction segment, e.g. "Mobile
// Safari" specifically, not Mobile or Safari alone. Device and browser
// stay independently sampled (no new correlation is introduced — that
// would change what every OTHER case looks like); instead the incident
// targets the INTERSECTION of two segments directly. Two sessions can
// both be "mobile" or both be "safari" and only the ones that are BOTH
// are hit. The expected-value algebra (verified against the engine's
// exact-reconciliation invariant in tests):
//
//   topline(t)        = baseline(t) · [Wa(t)·Wb(t) + pJoint·(jf(t)-1)] · Π(other dims)
//   rate(segA, dimA)  = topline(t) · multA · [Wb(t) + shareB·multB·(jf(t)-1)] / jointDenom(t)
//   rate(d≠segA,dimA) = topline(t) · mult_d · Wb(t) / jointDenom(t)
//   (symmetric for dimB)
//
// where Wa/Wb are the PLAIN marginal weighted averages (unaffected,
// since neither dimension has its own ordinary incident), pJoint =
// shareA·multA·shareB·multB, and jointDenom(t) = Wa(t)·Wb(t) +
// pJoint·(jf(t)-1). The consequence — and the whole point — is that
// dimA and dimB ALONE each show only a diluted fraction of the true
// effect (scaled by the other dimension's share), while a dedicated
// "dimA × dimB" cross-tab breakdown shows the full, undiluted drop
// isolated to exactly one cell. Segment sampling noise is layered on
// top of these expected values (see above).
/* ---- generateCase: a draw that tells the case's story --------------
   A seed's noise is random, so on an unlucky draw a blip somewhere else
   can outshine the real fault, or the ticket's premise ("orders are up")
   can fail. A teaching case has to be fair: the data must support the
   stated answer. So generateCase draws, checks the story holds
   (storyHolds, below), and if not draws again from a derived noise key —
   deterministically, so a seed always gives the same case. Draw 0 uses
   the seed itself: a seed whose first draw is fine is unchanged. The
   variant is picked from the seed, never from the draw. Then every
   number the ticket and explanation quote is filled in from that data
   (fillText), so the text always matches what the student sees. */
const MAX_DRAWS = 16;
function generateCase(caseId, seed, opts = {}) {
  const def = CASEMAP[caseId];
  if (!def) throw new Error("unknown case: " + caseId);
  const variantIndex = opts.variant ?? pickVariant(def, seed);
  const v = def.variants[variantIndex];
  const noiseScale = opts.noise ?? 1;
  let cd, draw = 0;
  for (; draw < MAX_DRAWS; draw++) {
    cd = drawCase(def, String(seed), variantIndex, noiseScale, draw);
    if (noiseScale === 0 || storyHolds(cd, v)) break;
  }
  cd.draw = Math.min(draw, MAX_DRAWS - 1);
  const facts = { ...(v.facts ? v.facts(factHelpers(cd)) : {}) };
  cd.facts = facts;
  cd.ticket = { ...v.ticket, body: fillText(v.ticket.body, facts) };
  cd.truth = { ...cd.truth, explanation: fillExplanation(v.truth.explanation, facts) };
  return cd;
}

function drawCase(def, seed, variantIndex, noiseScale, draw) {
  const caseId = def.id;
  const v = def.variants[variantIndex];
  const noiseKey = draw ? `${seed}~${draw}` : seed;
  const rngSess = makeRng(noiseKey + ":" + caseId + ":sessions");
  const rngConv = makeRng(noiseKey + ":" + caseId + ":conv");
  const rngSeg = makeRng(noiseKey + ":" + caseId + ":segments");
  const rngOrders = makeRng(noiseKey + ":" + caseId + ":orders");
  const incident = v.incident;
  const shifts = v.sessionShiftEvents || [];
  const joint = jointOf(incident);
  // Enterprise-scale cases multiply the site's traffic and basket size;
  // every other number flows from those, and the noise shrinks with √n.
  const scale = { sessions: 1, aov: 1, ...(def.scale || {}) };

  // Calibration constant: BASE_CONVERSION is the topline rate with no
  // incident/shift active (day 0, forced clean) — solved once so the
  // pre-incident baseline always reads as the configured rate. A joint
  // incident hasn't started at day 0 either, so the plain product is
  // still the correct calibration reference (jf(0)=1 collapses the
  // joint formula back to the plain Wa·Wb product).
  let baselineProduct = 1;
  for (const dim of DIMENSIONS) baselineProduct *= weightedAvgMult(dim, 0, null, null);
  const K = BASE_CONVERSION / baselineProduct;
  // …and likewise for order value: a clean day's AOV is exactly AOV (£42).
  const K_AOV = (AOV * scale.aov) / dayWeights(0, null, null, null).aovProduct;
  // Order values have their own streams, so adding them changed no other
  // number in the case: sessions, conversion and purchases are as they were.
  const rngAov = makeRng(noiseKey + ":" + caseId + ":aov");

  // engagement-metric RNG streams + per-dimension average characters (so a
  // segment's engagement reconciles to the topline the same way conversion does)
  const rngEng = makeRng(noiseKey + ":" + caseId + ":eng");
  const rngTime = makeRng(noiseKey + ":" + caseId + ":time");
  const rngEv = makeRng(noiseKey + ":" + caseId + ":ev");
  const rngNew = makeRng(noiseKey + ":" + caseId + ":new");
  const avgEng = {}, avgEv = {};
  for (const dim of DIMENSIONS) { avgEng[dim.key] = avgCharOf(dim, engMultOf); avgEv[dim.key] = avgCharOf(dim, evMultOf); }
  // For a joint incident, each of its two dimensions sees the other's
  // target segment: [own target, other dim key, other target].
  const jointSide = joint && {
    [joint.dimA]: [joint.segA, joint.dimB, joint.segB],
    [joint.dimB]: [joint.segB, joint.dimA, joint.segA],
  };

  const topline = [];
  const series = {}; // dimKey -> segId -> rows
  for (const dim of DIMENSIONS) { series[dim.key] = {}; for (const s of dim.segments) series[dim.key][s.id] = []; }

  for (let day = 0; day < TOTAL_DAYS; day++) {
    const cal = calendarAt(day, v.calendarEvents);
    const sessNoise = (rngSess() * 2 - 1) * 0.05 * noiseScale;
    const convNoise = (rngConv() * 2 - 1) * 0.04 * noiseScale;
    const sessions = BASE_SESSIONS * scale.sessions * SEASONALITY[day % 7] * cal.sessions * (1 + sessNoise);
    const engRate0 = clamp(BASE_ENG_RATE * (1 + (rngEng() * 2 - 1) * 0.04 * noiseScale), 0.1, 0.95);
    const engTime0 = BASE_ENG_TIME * (1 + (rngTime() * 2 - 1) * 0.06 * noiseScale);
    const evPer0 = BASE_EVENTS * (1 + (rngEv() * 2 - 1) * 0.05 * noiseScale);
    const newUsers = sessions * NEW_SHARE * (1 + (rngNew() * 2 - 1) * 0.05 * noiseScale);

    const { dimW, convMultProduct, aovProduct, jf, jointDenom } = dayWeights(day, incident, shifts, joint);
    const conversionRate = clamp(K * convMultProduct * cal.conversion * (1 + convNoise), 0.001, 0.95);
    const purchases = sessions * conversionRate;
    const aovNoise = 1 + (rngAov() * 2 - 1) * 0.03 * noiseScale;
    const aov = K_AOV * aovProduct * aovNoise;
    const revenue = purchases * aov;
    // Back-office orders come from the order database, not analytics. A
    // tracking incident leaves them untouched; any real incident hits both.
    // (Analytics' AOV can shift under a tracking fault — the orders it loses
    // change the measured mix — but the order book's doesn't.)
    const clean = incident?.type === "tracking" ? dayWeights(day, null, shifts, null) : null;
    const trueRate = clean ? clamp(K * clean.convMultProduct * cal.conversion * (1 + convNoise), 0.001, 0.95) : conversionRate;
    const trueAov = clean ? K_AOV * clean.aovProduct * aovNoise : aov;
    const orders = ((sessions * trueRate) / TRACKING_COVERAGE) * (1 + (rngOrders() * 2 - 1) * 0.01 * noiseScale);
    topline.push({ day, sessions, conversionRate, purchases, revenue, aov, orders, boRevenue: orders * trueAov, engagementRate: engRate0, engagedSessions: sessions * engRate0, avgEngagementTime: engTime0, events: sessions * evPer0, newUsers });

    for (const dim of DIMENSIONS) {
      const side = jointSide && jointSide[dim.key];
      const segs = effectiveShares(dim, day, shifts, incident);
      const expectedRate = (s) => {
        if (side) {
          const [ownTarget, otherDim, otherTarget] = side;
          const otherFactor = s.id === ownTarget.id ? dimW[otherDim] + otherTarget.share * otherTarget.mult * (jf - 1) : dimW[otherDim];
          return clamp((conversionRate * s.mult * otherFactor) / jointDenom, 0.0005, 0.98);
        }
        return clamp((conversionRate * effectiveMult(dim, s, day, incident, shifts)) / dimW[dim.key], 0.0005, 0.98);
      };
      // each segment's share wobbles like a binomial sample of the day's sessions
      const segSessions = rescaleTo(segs.map((s) => sessions * s.share * jitter(rngSeg, noiseScale * binomialSigma(s.share, sessions))), sessions);
      const segPurchases = rescaleTo(segs.map((s, i) => { const e = segSessions[i] * expectedRate(s); return e * jitter(rngSeg, purchaseSigma(noiseScale, e)); }), purchases);
      // engagement decoys get the same treatment, rescaled to the topline totals
      const segEngaged = rescaleTo(segs.map((s, i) => {
        const rate = clamp((engRate0 * engMultOf(s.id)) / avgEng[dim.key], 0.05, 0.98);
        return segSessions[i] * rate * jitter(rngSeg, noiseScale * binomialSigma(rate, segSessions[i]));
      }), sessions * engRate0);
      const segTimeTotal = rescaleTo(segs.map((s, i) => segSessions[i] * ((engTime0 * engMultOf(s.id)) / avgEng[dim.key]) * jitter(rngSeg, (noiseScale * 0.8) / Math.sqrt(Math.max(segSessions[i], 1)))), sessions * engTime0);
      const segEvents = rescaleTo(segs.map((s, i) => ((segSessions[i] * evPer0 * evMultOf(s.id)) / avgEv[dim.key]) * jitter(rngSeg, noiseScale / Math.sqrt(Math.max(segSessions[i] * evPer0, 1)))), sessions * evPer0);
      // each segment's revenue: its orders × its own order value, sampled, then
      // rescaled so every dimension's revenue sums exactly to the topline's
      const segRevenue = rescaleTo(segs.map((s, i) => segPurchases[i] * effectiveAov(dim, s, day, incident) * jitter(rngAov, aovSigma(noiseScale, segPurchases[i]))), revenue);
      segs.forEach((s, i) => series[dim.key][s.id].push({
        day, sessions: segSessions[i], conversionRate: segPurchases[i] / segSessions[i], purchases: segPurchases[i], revenue: segRevenue[i], aov: segRevenue[i] / segPurchases[i],
        engagementRate: segEngaged[i] / segSessions[i], engagedSessions: segEngaged[i], avgEngagementTime: segTimeTotal[i] / segSessions[i], events: segEvents[i],
      }));
    }
  }

  const breakdowns = DIMENSIONS.map((d) => ({ key: d.key, label: d.label, segments: d.segments, series: series[d.key] }));

  // The compound/cross-tab view is not pre-baked as a giveaway "report" —
  // `buildCrossTab` computes any pair on demand when the analyst adds a
  // secondary dimension. We expose the incident + shift model (and the seed
  // and noise level, for its sampling noise) so it can.
  return {
    id: def.id, n: def.n, seed: String(seed), noiseKey, noise: noiseScale, variant: variantIndex, scale,
    ticket: v.ticket, topline, events: v.events, truth: { ...v.truth, lesson: def.lesson },
    breakdowns, incident, shiftEvents: shifts,
  };
}

/* ---- buildCrossTab: pivot ANY report by a secondary dimension ----
   The GA "secondary dimension" power-move, computed on demand. A session's
   expected conversion rate, conditioned on being in segment a of dim A AND
   segment b of dim B, is the topline rate that day scaled by how far that
   cell's true multiplier sits from the population mean:
       rate(a,b,t) = r0(t) · M(a,b,t) / convMultProduct(t)
   where M(a,b) = effMultA(a)·effMultB(b)·jointFactor(a,b)·Π(other dims' W).
   Cross-tabbing the two dims a joint incident lives in isolates the true
   cell; cross-tabbing anything else just spreads a single-dim incident
   evenly — so the analyst has to pick the RIGHT pivot.

   Cells get the same sampling noise as segments, and are then raked
   (iterative proportional fitting) so every row and column sums exactly to
   the marginal reports the student has already seen — the cross-tab never
   contradicts the single-dimension reports. Cell sessions are the product
   of the two marginals' (noisy) shares, so they reconcile by construction.
   The grid is built in a canonical orientation, so A × B and B × A give
   identical numbers. */
// Iterative proportional fitting: scale `key` until every row sums to its
// dim-A total and every column to its dim-B total.
function rake(cells, A, B, key, rowTotal, colTotal) {
  for (let it = 0; it < 40; it++) {
    for (const sa of A.segments) { const row = cells.filter((c) => c.sa === sa), sum = row.reduce((a, c) => a + c[key], 0); row.forEach((c) => (c[key] *= rowTotal(sa) / sum)); }
    for (const sb of B.segments) { const col = cells.filter((c) => c.sb === sb), sum = col.reduce((a, c) => a + c[key], 0); col.forEach((c) => (c[key] *= colTotal(sb) / sum)); }
  }
}
function crossTabGrid(caseData, k1, k2) {
  const A = DMAP[k1], B = DMAP[k2];
  const incident = caseData.incident, shiftEvents = caseData.shiftEvents || [];
  const joint = jointOf(incident);
  const jointPair = joint && ((joint.dimA === k1 && joint.dimB === k2) || (joint.dimA === k2 && joint.dimB === k1));
  const seriesOf = (key) => caseData.breakdowns.find((d) => d.key === key).series;
  const serA = seriesOf(k1), serB = seriesOf(k2);
  const noise = caseData.noise ?? 1;
  const key = caseData.noiseKey ?? caseData.seed;   // the draw's noise key (see generateCase)
  const rng = makeRng(`${key}:${caseData.id}:x:${k1}:${k2}`);
  const rngAov = makeRng(`${key}:${caseData.id}:xa:${k1}:${k2}`);   // its own stream: see generateCase
  const avgEngA = avgCharOf(A, engMultOf), avgEngB = avgCharOf(B, engMultOf);
  const avgEvA = avgCharOf(A, evMultOf), avgEvB = avgCharOf(B, evMultOf);
  const grid = {};
  for (const sa of A.segments) for (const sb of B.segments) grid[`${sa.id}__${sb.id}`] = [];

  for (let day = 0; day < TOTAL_DAYS; day++) {
    const top = caseData.topline[day];
    const { dimW, convMultProduct, jf } = dayWeights(day, incident, shiftEvents, joint);
    const otherProd = DIMENSIONS.filter((d) => d.key !== k1 && d.key !== k2).reduce((p, d) => p * dimW[d.key], 1);
    // expected purchases per cell, with sampling noise
    const cells = [];
    for (const sa of A.segments) for (const sb of B.segments) {
      const isIncidentCell = jointPair && ((sa.id === incident.segA && sb.id === incident.segB) || (sa.id === incident.segB && sb.id === incident.segA));
      const cellMult = effectiveMult(A, sa, day, incident, shiftEvents) * effectiveMult(B, sb, day, incident, shiftEvents) * (isIncidentCell ? jf : 1) * otherProd;
      const rate = clamp((top.conversionRate * cellMult) / convMultProduct, 0.0005, 0.98);
      const sessions = (serA[sa.id][day].sessions * serB[sb.id][day].sessions) / top.sessions;
      const expected = sessions * rate;
      cells.push({ sa, sb, sessions, purchases: expected * jitter(rng, purchaseSigma(noise, expected)) });
    }
    // rake to the marginal reports: rows to dim A's purchases, columns to dim B's
    rake(cells, A, B, "purchases", (sa) => serA[sa.id][day].purchases, (sb) => serB[sb.id][day].purchases);
    // revenue: each cell's orders × its order value, sampled, raked the same way
    for (const c of cells) c.revenue = c.purchases * effectiveAov(A, c.sa, day, incident) * effectiveAov(B, c.sb, day, incident) * jitter(rngAov, aovSigma(noise, c.purchases));
    rake(cells, A, B, "revenue", (sa) => serA[sa.id][day].revenue, (sb) => serB[sb.id][day].revenue);
    for (const c of cells) {
      const engFactor = (engMultOf(c.sa.id) / avgEngA) * (engMultOf(c.sb.id) / avgEngB);
      const engRate = clamp(top.engagementRate * engFactor * jitter(rng, noise * binomialSigma(top.engagementRate * engFactor, c.sessions)), 0.05, 0.98);
      const events = c.sessions * (top.events / top.sessions) * (evMultOf(c.sa.id) / avgEvA) * (evMultOf(c.sb.id) / avgEvB) * jitter(rng, noise / Math.sqrt(Math.max(c.sessions * 5, 1)));
      grid[`${c.sa.id}__${c.sb.id}`].push({
        day, sessions: c.sessions, conversionRate: c.purchases / c.sessions, purchases: c.purchases, revenue: c.revenue, aov: c.revenue / c.purchases,
        engagementRate: engRate, engagedSessions: c.sessions * engRate,
        avgEngagementTime: top.avgEngagementTime * engFactor * jitter(rng, (noise * 0.8) / Math.sqrt(Math.max(c.sessions, 1))), events,
      });
    }
  }
  return grid;
}
function buildCrossTab(caseData, aKey, bKey) {
  const A = DMAP[aKey], B = DMAP[bKey];
  const flipped = aKey > bKey;
  const grid = flipped ? crossTabGrid(caseData, bKey, aKey) : crossTabGrid(caseData, aKey, bKey);
  const out = { key: `${aKey}__${bKey}`, label: `${A.label} × ${B.label}`, segments: [], series: {}, isCrossTab: true, primary: aKey, secondary: bKey };
  for (const sa of A.segments) for (const sb of B.segments) {
    const id = `${sa.id}__${sb.id}`;
    out.segments.push({ id, name: `${sa.name} / ${sb.name}` });
    out.series[id] = grid[flipped ? `${sb.id}__${sa.id}` : id];
  }
  return out;
}

function avgRange(rows, [lo, hi], key = "conversionRate") {
  const slice = rows.filter((r) => r.day >= lo && r.day <= hi);
  return slice.reduce((a, r) => a + r[key], 0) / slice.length;
}
function sumRange(rows, [lo, hi], key) {
  return rows.filter((r) => r.day >= lo && r.day <= hi).reduce((a, r) => a + r[key], 0);
}
// The comparison window GA defaults to: the equal-length period immediately
// before the current one. Clamped to the start of the data.
function precedingPeriod([lo, hi]) {
  const len = hi - lo + 1;
  return [Math.max(0, lo - len), Math.max(0, lo - 1)];
}

/* ---- buildFunnel: the multi-stage conversion funnel ---------------
   Real e-commerce funnel — sessions → product view → add-to-cart →
   checkout → purchase — for the whole site OR for a filtered segment /
   cross-tab cell. The four step-rates multiply to the overall conversion
   rate, so this is a *decomposition* of the number you already see, not a
   second source of truth. An incident carries a `stage`: when (and only
   when) you've filtered to its exact target segment/cell, the drop is
   attributed to that one step (the rest stay flat) — so the funnel tells
   you WHICH step broke, which points straight at the cause. Filter to the
   wrong place (or the whole site) and the dip just smears evenly across
   the steps, revealing nothing. */
const FUNNEL_STAGES = [
  { key: "view", from: "Sessions", label: "Product view" },
  { key: "atc", label: "Add to cart" },
  { key: "checkout", label: "Checkout" },
  { key: "purchase", label: "Purchase" },
];
const FUNNEL_BASE = { view: 0.62, atc: 0.28, checkout: 0.55, purchase: 0.38 };
// product of the four ≈ BASE_CONVERSION; calibrate `purchase` so it's exact.
FUNNEL_BASE.purchase = BASE_CONVERSION / (FUNNEL_BASE.view * FUNNEL_BASE.atc * FUNNEL_BASE.checkout);
const FUNNEL_BASE_PRODUCT = FUNNEL_STAGES.reduce((p, s) => p * FUNNEL_BASE[s.key], 1);

function filterMatchesIncident(incident, filters) {
  if (!incident) return false;
  const fset = new Set(filters.map((f) => `${f.dim}:${f.seg}`));
  if (incident.type === "rate-joint") return fset.has(`${incident.dimA}:${incident.segA}`) && fset.has(`${incident.dimB}:${incident.segB}`);
  if (isSegmentIncident(incident)) return fset.has(`${incident.dimension}:${incident.segment}`);
  return false;
}
// Resolve the conversionRate series for 0/1/2 segment filters.
function filteredSeries(caseData, filters) {
  if (filters.length === 0) return caseData.topline;
  if (filters.length === 1) return caseData.breakdowns.find((d) => d.key === filters[0].dim).series[filters[0].seg];
  const ct = buildCrossTab(caseData, filters[0].dim, filters[1].dim);
  return ct.series[`${filters[0].seg}__${filters[1].seg}`];
}
function buildFunnel(caseData, filters = [], curWindow = LATE_WINDOW, cmpWindow = EARLY_WINDOW) {
  const incident = caseData.incident;
  const attribute = filterMatchesIncident(incident, filters); // can we pin a stage?
  const rows = filteredSeries(caseData, filters);
  const days = rows.map((row) => {
    const f = attribute ? incidentFactorAt(row.day, incident) : 1;
    const cleanR = row.conversionRate / f;
    const ratio = Math.pow(Math.max(cleanR, 1e-6) / BASE_CONVERSION, 0.25); // spread evenly across 4 steps
    const stages = {};
    for (const s of FUNNEL_STAGES) stages[s.key] = clamp(FUNNEL_BASE[s.key] * ratio * (attribute && incident.stage === s.key ? f : 1), 0.002, 0.99);
    return { day: row.day, ...stages, overall: row.conversionRate };
  });
  const stat = (key) => { const early = avgRange(days, cmpWindow, key), late = avgRange(days, curWindow, key); return { early, late, pctChange: early > 0 ? (late - early) / early : 0 }; };
  const summary = {};
  for (const s of FUNNEL_STAGES) summary[s.key] = stat(s.key);
  summary.overall = stat("overall");
  return { days, summary, attributedStage: attribute ? incident.stage : null, filters };
}

// Average order value over a window: total revenue ÷ total orders (a ratio
// of sums — averaging each day's AOV would let a one-order day count as
// much as a busy one).
function aovRange(rows, win) {
  const purchases = sumRange(rows, win, "purchases");
  return purchases > 0 ? sumRange(rows, win, "revenue") / purchases : 0;
}
const change = (was, now) => ({ was, now, delta: was > 0 ? (now - was) / was : 0 });
// The metrics a report can be viewed by ("lenses"): each one's comparison
// period vs current value. Counts are per day, so windows of different
// lengths compare fairly; conversion is the daily average, as on Home.
const LENSES = ["conversionRate", "sessions", "revenue", "aov"];
function lensStats(rows, earlyWindow, lateWindow) {
  return {
    conversionRate: change(avgRange(rows, earlyWindow), avgRange(rows, lateWindow)),
    sessions: change(avgRange(rows, earlyWindow, "sessions"), avgRange(rows, lateWindow, "sessions")),
    revenue: change(avgRange(rows, earlyWindow, "revenue"), avgRange(rows, lateWindow, "revenue")),
    aov: change(aovRange(rows, earlyWindow), aovRange(rows, lateWindow)),
  };
}

// The "investigation tool" summary: each segment's week-1 vs week-4
// conversion rate, sorted by the size of the move — plus the GA-style
// report detail (share of sessions, purchases, revenue, AOV) for the
// data table, and `lens` (the same comparison for every metric a report
// can be viewed by). Uses fixed calendar windows rather than the true
// incident date, so it doesn't hand the answer to a student who hasn't
// found the date yet. Share is computed against this dimension's own
// late-window session total, which — by the engine's reconciliation
// invariant — exactly equals the topline's, so no separate reference is needed.
function summariseSegments(dim, earlyWindow = EARLY_WINDOW, lateWindow = LATE_WINDOW) {
  const totalSessionsLate = dim.segments.reduce((a, s) => a + sumRange(dim.series[s.id], lateWindow, "sessions"), 0);
  return dim.segments.map((seg) => {
    const rows = dim.series[seg.id];
    const early = avgRange(rows, earlyWindow), late = avgRange(rows, lateWindow);
    const sessionsLate = sumRange(rows, lateWindow, "sessions");
    const purchasesLate = sumRange(rows, lateWindow, "purchases");
    const revenueLate = sumRange(rows, lateWindow, "revenue");
    return {
      id: seg.id, name: seg.name,
      avgEarly: early, avgLate: late, pctChange: early > 0 ? (late - early) / early : 0,
      lens: lensStats(rows, earlyWindow, lateWindow),
      shareLate: totalSessionsLate > 0 ? sessionsLate / totalSessionsLate : 0,
      sessionsLate, purchasesLate, revenueLate,
      aovLate: purchasesLate > 0 ? revenueLate / purchasesLate : 0,
      engRateLate: avgRange(rows, lateWindow, "engagementRate"),
      engTimeLate: avgRange(rows, lateWindow, "avgEngagementTime"),
      eventsLate: sumRange(rows, lateWindow, "events"),
    };
    // Default order is by SHARE — like a real analytics table defaults to
    // sorting by volume, not by "how much trouble this row is in". Ranking
    // by the size of the move (the UI's sortable Δ column) is something
    // the student has to choose to do, not a freebie from this function.
  }).sort((a, b) => b.shareLate - a.shareLate);
}

// The same week-1-vs-week-4 comparison for the topline KPI cards.
// Sessions/purchases/revenue are SUMMED over the window (a weekly
// total, like a GA4 overview card); conversion rate is AVERAGED (a rate
// can't be summed).
function summariseTopline(topline, earlyWindow = EARLY_WINDOW, lateWindow = LATE_WINDOW) {
  const lenE = earlyWindow[1] - earlyWindow[0] + 1, lenL = lateWindow[1] - lateWindow[0] + 1;
  // `late` is the window total (for the headline number), but the % change is
  // computed on a PER-DAY basis so comparing windows of different lengths is
  // apples-to-apples (a 21-day total isn't "+200%" vs a 7-day one).
  const stat = (key, isSum) => {
    const agg = isSum ? sumRange : avgRange;
    const early = agg(topline, earlyWindow, key), late = agg(topline, lateWindow, key);
    const eNorm = isSum ? early / lenE : early, lNorm = isSum ? late / lenL : late;
    return { early, late, pctChange: eNorm > 0 ? (lNorm - eNorm) / eNorm : 0 };
  };
  const aovEarly = aovRange(topline, earlyWindow), aovLate = aovRange(topline, lateWindow);
  return {
    aov: { early: aovEarly, late: aovLate, pctChange: aovEarly > 0 ? (aovLate - aovEarly) / aovEarly : 0 },   // ratio of sums, not a mean of days
    sessions: stat("sessions", true),
    newUsers: stat("newUsers", true),
    engagedSessions: stat("engagedSessions", true),
    engagementRate: stat("engagementRate", false),
    avgEngagementTime: stat("avgEngagementTime", false),
    events: stat("events", true),
    conversionRate: stat("conversionRate", false),
    purchases: stat("purchases", true),
    revenue: stat("revenue", true),
    orders: stat("orders", true),
    boRevenue: stat("boRevenue", true),
  };
}

/* ---- does this draw tell the story? -----------------------------------
   A segment's "differential" is its change minus the share-weighted change
   of the rest of its dimension: how far it moved on its own. A fair case
   needs the true answer to be the clearest same-direction anomaly a
   student could find — at least CLEAR_MARGIN times any rival among the
   big segments (share ≥ 10%) of every other dimension, and of its own.
   Rivals the case's design makes move (a compound cause's two single
   dimensions, a masking case's own dimension, an attribution's receiving
   segment) are left out. When nothing broke, no big segment may look like
   an incident: none may move further than CALM_Z standard deviations of the
   wobble its size and the noise level make normal. Then the variant's own
   `requires` (the ticket's premise). */
const CLEAR_MARGIN = 1.3, CALM_Z = 2.5, CALM_SHARE = 0.1;
function differentials(dim, m, minShare) {
  const rows = summariseSegments(dim);
  return rows.filter((r) => r.shareLate >= minShare).map((r) => {
    const rest = rows.filter((x) => x.id !== r.id), w = rest.reduce((a, x) => a + x.shareLate, 0);
    return { id: r.id, d: r.lens[m].delta - rest.reduce((a, x) => a + x.shareLate * x.lens[m].delta, 0) / w, perDay: r.purchasesLate / 7, restPerDay: rest.reduce((a, x) => a + x.purchasesLate, 0) / 7 };
  });
}
// The sd of a segment's differential that sampling noise alone produces
// (see purchaseSigma): daily sd ÷ √7 per week, × √2 for two weeks — for the
// segment and for the rest of its dimension, which wobbles too.
// Checked over 4,000 noise-only differentials: the estimate is
// conservative (their z has sd ≈ 0.8), so CALM_Z = 2.5 is about 3 real sd.
const wobbleSd = (noise, perDay, restPerDay) => Math.SQRT2 * noise * SEG_RATE_NOISE * Math.sqrt(1 / (7 * Math.max(perDay, 0.25)) + 1 / (7 * Math.max(restPerDay, 0.25)));
function storyHolds(cd, v) {
  const inc = cd.incident, t = cd.truth;
  const others = (skip, m) => cd.breakdowns.filter((d) => !skip.includes(d.key)).flatMap((d) => differentials(d, m, 0.1));
  const clear = (target, rivals) => {
    const same = rivals.filter((r) => Math.sign(r.d) === Math.sign(target.d)).map((r) => Math.abs(r.d));
    return Math.abs(target.d) >= CLEAR_MARGIN * Math.max(0, ...same);
  };
  let ok = true;
  if (!inc) {
    ok = cd.breakdowns.every((d) => differentials(d, "conversionRate", CALM_SHARE).every((r) => Math.abs(r.d) <= CALM_Z * wobbleSd(cd.noise, r.perDay, r.restPerDay)));
  } else if (inc.type === "rate-joint") {
    const ct = buildCrossTab(cd, t.dimension, t.secondary);
    const cells = differentials(ct, "conversionRate", 0.02);
    const target = cells.find((c) => c.id === `${t.segment}__${t.segmentB}`);
    ok = clear(target, [...cells.filter((c) => c !== target), ...others([t.dimension, t.secondary], "conversionRate")]);
  } else {
    const m = inc.type === "aov" ? "aov" : inc.type === "attribution" && inc.moves === "sessions" ? "sessions" : "conversionRate";
    const own = differentials(cd.breakdowns.find((d) => d.key === t.dimension), m, 0);
    const target = own.find((x) => x.id === t.segment);
    const ownRivals = v.masked ? [] : own.filter((x) => x !== target && x.id !== inc.to);
    ok = clear(target, [...ownRivals, ...others([t.dimension], m)]);
  }
  return ok && (!v.requires || v.requires(factHelpers(cd)));
}

/* ---- facts: the numbers a case's text quotes, from its own data -------
   A variant's `facts(h)` returns { name: "text" }; its ticket and
   explanation say {{name}} where the number goes, and {{day:N}} for a day
   in the dashboard's own labels ("W3 Fri"). `h` is these helpers. */
function factHelpers(cd) {
  const dim = (k) => cd.breakdowns.find((d) => d.key === k);
  const seg = (k, id) => summariseSegments(dim(k)).find((r) => r.id === id);
  const top = summariseTopline(cd.topline);
  const share = (k, id, win = EARLY_WINDOW) => { const d = dim(k); const tot = d.segments.reduce((a, s) => a + sumRange(d.series[s.id], win, "purchases"), 0); return sumRange(d.series[id], win, "purchases") / tot; };
  return {
    cd, top, dim, seg,
    rows: (k) => summariseSegments(dim(k)),
    cell: (a, b, id) => summariseSegments(buildCrossTab(cd, a, b)).find((r) => r.id === id),
    // a segment's differential: its change minus the rest of its dimension's
    diff: (k, id, m = "conversionRate") => differentials(dim(k), m, 0).find((r) => r.id === id).d,
    // …and in units of the wobble its size and the noise level make normal
    z: (k, id) => { const r = differentials(dim(k), "conversionRate", 0).find((x) => x.id === id); return cd.noise ? r.d / wobbleSd(cd.noise, r.perDay, r.restPerDay) : 0; },
    // a window's average daily conversion against another's, as a change
    windowCh: (k, id, win, base) => avgRange(dim(k).series[id], win) / avgRange(dim(k).series[id], base) - 1,
    gbpM: (x) => `£${(x / 1e6).toFixed(1)}m`,
    cells: (a, b) => summariseSegments(buildCrossTab(cd, a, b)),
    share,
    sum: (k, id, win, key) => sumRange(dim(k).series[id], win, key),
    avg: (k, id, win, key = "conversionRate") => avgRange(dim(k).series[id], win, key),
    coverage: (lo, hi) => { const r = cd.topline.filter((x) => x.day >= lo && x.day <= hi); return r.reduce((a, x) => a + x.purchases, 0) / r.reduce((a, x) => a + x.orders, 0); },
    // formatting: a size of change, a signed change, a rate, money
    pc: (x) => `${Math.round(Math.abs(x) * 100)}%`,
    ch: (x) => { const r = Math.round(x * 100); return r === 0 ? "0%" : `${r > 0 ? "+" : "\u2212"}${Math.abs(r)}%`; },
    rate: (x, dp = 1) => `${(x * 100).toFixed(dp)}%`,
    gbp: (x, to = 1) => "£" + (Math.round(x / to) * to).toLocaleString("en-GB"),
    gbp2: (x) => "£" + x.toFixed(2),
  };
}
const fillText = (text, facts) => text.replace(/\{\{(day:)?([\w-]+)\}\}/g, (m, isDay, key) => {
  if (isDay) return dayShort(Number(key));
  if (!(key in facts)) throw new Error(`no fact "${key}" for text: ${text.slice(0, 60)}`);
  return facts[key];
});
const fillExplanation = (ex, facts) => {
  const fill = (o) => Object.fromEntries(Object.entries(o).map(([k, val]) => [k, typeof val === "string" ? fillText(val, facts) : fill(val)]));
  return fill(ex);
};

// A flavour-only Realtime snapshot (GA's "users in last 30 minutes"). Pure
// atmosphere — deterministic from the seed, unrelated to the incident.
function realtimeSnapshot(caseData, seed = "rt") {
  const rng = makeRng(seed + ":" + caseData.id + ":realtime");
  const perMinute = Array.from({ length: 30 }, () => Math.round(120 + rng() * 90));
  const active = perMinute.reduce((a, b) => a + b, 0);
  const top = (dim) => dim.segments.map((s) => ({ name: s.name, users: Math.max(1, Math.round(active * s.share * (0.7 + rng() * 0.6))) })).sort((a, b) => b.users - a.users);
  const countries = top(DMAP.country); // order matters: both draw from the same rng
  const pages = top(DMAP.page);
  return { active: Math.round(active / 8), perMinute, countries, pages };
}

/* ---- scoring --------------------------------------------------- */
// A diagnosis can now name a single dimension OR a cross-tab (a primary +
// secondary dimension). We compare unordered {dim:segment} pairs, so
// "device=mobile × browser=safari" matches "browser=safari × device=mobile",
// and naming only one half of a compound cause is correctly marked wrong.
function pairKey(dim, seg) { return dim ? `${dim}:${seg}` : null; }
function dimSet(pairs) { return pairs.map((p) => p[0]).filter(Boolean).sort().join("|"); }
function segSig(pairs) { return pairs.map((p) => pairKey(p[0], p[1])).filter(Boolean).sort().join("|"); }
// When nothing broke (truth.dimension is null), the right call names no
// segment (the "none" option) and so no start date; the cause is scored as
// usual. A slow bleed's onset is fuzzy, so its truth may widen the date window.
function scoreDiagnosis(guess, truth) {
  if (!truth.dimension) {
    const none = guess.dimension === "none";
    const causeTypeCorrect = guess.causeType === truth.causeType;
    const fieldsCorrect = [none, none, causeTypeCorrect, none].filter(Boolean).length;
    return { dimensionCorrect: none, segmentCorrect: none, causeTypeCorrect, dateCorrect: none, fieldsCorrect, allCorrect: fieldsCorrect === 4 };
  }
  const truthPairs = [[truth.dimension, truth.segment], [truth.secondary || null, truth.segmentB || null]];
  const guessPairs = [[guess.dimension, guess.segment], [guess.secondary || null, guess.segmentB || null]];
  const dimensionCorrect = dimSet(truthPairs) === dimSet(guessPairs);
  const segmentCorrect = dimensionCorrect && segSig(truthPairs) === segSig(guessPairs);
  const causeTypeCorrect = guess.causeType === truth.causeType;
  const dateCorrect = Math.abs((guess.startDay ?? -999) - truth.startDay) <= (truth.dateTolerance ?? 2);
  const fieldsCorrect = [dimensionCorrect, segmentCorrect, causeTypeCorrect, dateCorrect].filter(Boolean).length;
  return { dimensionCorrect, segmentCorrect, causeTypeCorrect, dateCorrect, fieldsCorrect, allCorrect: fieldsCorrect === 4 };
}

/* ---- reviewing the investigation trail -------------------------------
   Process, not just the answer: did the student open the view where the
   signal actually lives? For a single-segment cause that's the report for
   its dimension; for a compound cause it's the cross-tab of its two
   dimensions (either way round). Everything else they opened is a dead end
   — reported, not penalised: exploring is how analysts rule things out.
   viewed = report keys in the order opened ("realtime"/"funnel" or a
   dimension key); pivots = "primary×secondary" keys in the order built;
   lenses = "report:metric" pairs — which reports were viewed by which
   metric. When money moved without conversion (truth.lens === "aov"), the
   useful habit is viewing the right report by order value or revenue. */
function reviewTrail(caseData, viewed = [], pivots = [], lenses = []) {
  const t = caseData.truth;
  const reports = viewed.filter((k) => DMAP[k]);
  const usedBackOffice = viewed.includes("orders"), needsBackOffice = t.causeType === "tracking_bug";
  const lens = t.lens || null;
  const usedLens = !!lens && lenses.some((l) => l === `${t.dimension}:aov` || l === `${t.dimension}:revenue`);
  // When credit moved rather than customers, the evidence is that the
  // total didn't: Home's conversions card, or the order book.
  const needsTotal = t.causeType === "attribution_change";
  const usedTotal = viewed.includes("orders") || lenses.some((l) => l === `${t.dimension}:sessions` || l === `${t.dimension}:revenue`);
  if (!t.dimension) {
    // Nothing broke: the evidence is that every report moves together, so the
    // useful habit is checking several dimensions before calling it.
    return {
      noIncident: true, decisive: "no single report — the dip is the same in every segment", found: reports.length >= 3, foundAt: 0, compound: false,
      reportsOpened: reports.length, pivotsBuilt: pivots.length, deadEnds: 0, usedFunnel: viewed.includes("funnel"), funnelStage: null, usedBackOffice, needsBackOffice, lens, usedLens, needsTotal, usedTotal,
    };
  }
  let foundAt = 0, decisive;
  if (t.secondary) {
    decisive = `the ${DMAP[t.dimension].label} \u00d7 ${DMAP[t.secondary].label} cross-tab`;
    foundAt = pivots.findIndex((p) => p === `${t.dimension}\u00d7${t.secondary}` || p === `${t.secondary}\u00d7${t.dimension}`) + 1;
  } else {
    decisive = `the ${DMAP[t.dimension].label} report`;
    foundAt = reports.indexOf(t.dimension) + 1;
  }
  const stage = caseData.incident?.stage ? FUNNEL_STAGES.find((s) => s.key === caseData.incident.stage).label : null;
  return {
    decisive, found: foundAt > 0, foundAt, compound: !!t.secondary,
    reportsOpened: reports.length, pivotsBuilt: pivots.length,
    deadEnds: reports.filter((k) => k !== t.dimension && k !== t.secondary).length,
    usedFunnel: viewed.includes("funnel"), funnelStage: stage, usedBackOffice, needsBackOffice, lens, usedLens, needsTotal, usedTotal,
  };
}

const GLOSSARY = {
  segmentation: "Splitting the data by a dimension (device, country, payment method, and so on) to see whether a problem is limited to one group or spread evenly across all of them.",
  correlation: "Two things changing at the same time. This alone does not prove that one caused the other. An unrelated event can happen at the same moment as a real problem, purely by chance.",
  redherring: "An event that really happened near the same time as a problem, but is not the cause. It can lead to a wrong diagnosis unless you check the data that would confirm or rule it out.",
  baseline: "The normal day-to-day pattern before a problem started. It is your reference point for deciding whether a later change is real or just normal variation.",
  anomaly: "A change in the data that is large enough, and limited enough to one group, to be a real signal and not just ordinary day-to-day variation.",
  gateway: "The outside service (such as PayPal, Stripe, or a bank) that processes a payment. If it fails, checkout can break for one payment method while everything else keeps working.",
  pp: "Percentage points — the simple difference between two percentages. A drop from 8% to 6% is 2 percentage points (2pp), even though it is a 25% relative fall. 'pp' avoids that confusion.",
  crosstab: "A table that splits the data by two dimensions at once (for example Device × Browser), so you can find a problem that only appears in one combination, such as mobile phones using Safari.",
  funnelstep: "One stage of the path to purchase: view → add to cart → checkout → purchase. Comparing the step rates shows which stage lost people.",
  conversion: "When a visitor completes the goal — here, making a purchase. Conversion rate = purchases ÷ sessions.",
  cro: "Conversion rate optimisation (CRO) — the practice of increasing the share of visitors who complete the goal, by testing and improving the site.",
  mixshift: "When the sitewide rate changes only because the MIX of traffic changed — more low-converting or fewer high-converting visitors — even though no single group's own rate moved. A Simpson's-paradox effect: check whether any segment's rate actually fell before blaming the site.",
  masking: "When a favourable change in one place (for example a surge of high-converting returning customers) hides a real problem elsewhere, so the sitewide number looks calm while a segment is badly broken. A flat topline does not prove nothing is wrong.",
  selfreferral: "When your own checkout's payment provider (PayPal, SagePay, a bank) appears as a traffic source. The customer left the site to pay, and their return was counted as a NEW session 'referred' by the gateway — so the gateway steals conversion credit from the channel that really earned the sale.",
  exclusionlist: "The referral exclusion list tells Analytics which domains must never count as referrers — above all your own payment gateways. Without it, every checkout round-trip restarts the session and distorts attribution. In older Analytics you had to configure this by hand.",
  testtraffic: "Sessions and orders created by developers or test systems — sandbox payment environments, staging servers, office IP addresses — that were never real customers. They must be filtered out of the live data; if they are not, revenue and conversion figures include transactions that never happened.",
  aov: "Average order value (AOV) — revenue ÷ orders. It moves revenue as surely as conversion does: a discount or a lost cross-sell can cut revenue while orders hold or even rise. It is also a sanity check: a 'channel' with an AOV of £5,000 at a consumer retailer is probably not real customers.",
  revenuetree: "Revenue = sessions × conversion rate × average order value. When revenue moves, first ask which of the three moved — each points to a different kind of cause and a different team.",
  groundtruth: "A figure from the system of record \u2014 here, orders in the order database \u2014 rather than from analytics. If analytics and the ground truth disagree, trust the ground truth and suspect the tracking.",
  calibration: "How well your confidence matches how often you are right. If you say \u2018very sure\u2019 ten times, you should be right about nine of them.",
  noise: "Ordinary random variation. A small segment has few orders, so its figures swing a lot from week to week by chance. A real problem is bigger than that swing, confined to one group, and still there the next day.",
  coverage: "Data coverage — the share of visits a report actually knows the answer for. In 2015 Google knew the age of only 58% of this site's visitors; a report built on part of the traffic can still be used, but not as if it were the whole.",
  attribution: "Which marketing touch gets the credit for a sale. 'Last click' gives it all to the final visit; 'data-driven' shares it across the journey. Change the model and every channel's conversions change — without a single customer doing anything different.",
  pla: "Product Listing Ads — Google Shopping image ads that link straight to a product page. In this data a landing-page URL ending ?ref=PLA marks a Shopping ad click.",
};

export {
  clamp, gbp, pct, pp, makeRng,
  TOTAL_DAYS, BASE_SESSIONS, BASE_CONVERSION, AOV, EARLY_WINDOW, LATE_WINDOW, dayShort, dayLong,
  DIMENSIONS, DMAP, REPORTS, CAUSE_TYPES, CASES, CASEMAP, FUNNEL_STAGES, LENSES,
  incidentFactorAt, generateCase, variantFor, fillText, storyHolds, factHelpers, MAX_DRAWS, buildCrossTab, buildFunnel, realtimeSnapshot, precedingPeriod,
  avgRange, sumRange, aovRange, summariseSegments, summariseTopline, scoreDiagnosis, reviewTrail, GLOSSARY,
};
