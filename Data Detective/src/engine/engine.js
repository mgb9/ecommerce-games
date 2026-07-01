/* ============================================================
   DATA DETECTIVE — pure, seeded root-cause diagnosis engine (no
   React, no I/O). generateCase() builds one deterministic case: a
   daily topline series plus a breakdown by six dimensions (device,
   browser, country, source, payment, page), with one incident
   injected into exactly one segment of one dimension.

   The engine's defining property — and the thing that makes
   diagnosis a real skill rather than a lucky click — is this: every
   session has independent attributes across all six dimensions, so
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

/* ---- the six dimensions every case is sliced by --------------
   Independent of the incident: `share` of sessions and a baseline
   `mult` on conversion (some segments just convert better than
   others, e.g. organic search > paid social). These never change
   over time except where an incident or a session-shift event
   explicitly targets one segment. */
const DIMENSIONS = [
  { key: "device", label: "Device", segments: [
    { id: "desktop", name: "Desktop", share: 0.52, mult: 1.05 },
    { id: "mobile", name: "Mobile", share: 0.40, mult: 0.85 },
    { id: "tablet", name: "Tablet", share: 0.08, mult: 0.95 },
  ]},
  { key: "browser", label: "Browser", segments: [
    { id: "chrome", name: "Chrome", share: 0.55, mult: 1.0 },
    { id: "safari", name: "Safari", share: 0.25, mult: 0.95 },
    { id: "firefox", name: "Firefox", share: 0.10, mult: 1.05 },
    { id: "edge", name: "Edge", share: 0.10, mult: 0.90 },
  ]},
  { key: "country", label: "Country", segments: [
    { id: "uk", name: "UK", share: 0.45, mult: 1.10 },
    { id: "de", name: "Germany", share: 0.20, mult: 0.95 },
    { id: "fr", name: "France", share: 0.15, mult: 0.90 },
    { id: "us", name: "USA", share: 0.12, mult: 1.00 },
    { id: "other", name: "Other", share: 0.08, mult: 0.80 },
  ]},
  { key: "source", label: "Traffic source", segments: [
    { id: "organic", name: "Organic search", share: 0.40, mult: 1.10 },
    { id: "paidsearch", name: "Paid search", share: 0.20, mult: 0.95 },
    { id: "paidsocial", name: "Paid social", share: 0.15, mult: 0.80 },
    { id: "email", name: "Email", share: 0.15, mult: 1.20 },
    { id: "direct", name: "Direct", share: 0.10, mult: 1.00 },
  ]},
  { key: "payment", label: "Payment method", segments: [
    { id: "card", name: "Card", share: 0.55, mult: 1.00 },
    { id: "paypal", name: "PayPal", share: 0.25, mult: 1.05 },
    { id: "applepay", name: "Apple Pay", share: 0.12, mult: 1.10 },
    { id: "bank", name: "Bank transfer", share: 0.08, mult: 0.60 },
  ]},
  { key: "page", label: "Landing page", segments: [
    { id: "home", name: "Homepage", share: 0.30, mult: 1.00 },
    { id: "category", name: "Category page", share: 0.35, mult: 0.90 },
    { id: "product", name: "Product page", share: 0.25, mult: 1.15 },
    { id: "search", name: "Search results", share: 0.10, mult: 0.80 },
  ]},
  { key: "campaign", label: "Campaign", segments: [
    { id: "brand", name: "Brand search", share: 0.30, mult: 1.10 },
    { id: "generic", name: "Generic / non-brand", share: 0.25, mult: 0.85 },
    { id: "retargeting", name: "Retargeting", share: 0.15, mult: 1.20 },
    { id: "none", name: "(not set)", share: 0.30, mult: 1.00 },
  ]},
  { key: "userType", label: "User type", segments: [
    { id: "new", name: "New", share: 0.62, mult: 0.85 },
    { id: "returning", name: "Returning", share: 0.38, mult: 1.45 },
  ]},
  { key: "region", label: "Region", segments: [
    { id: "london", name: "London", share: 0.24, mult: 1.15 },
    { id: "southeast", name: "South East", share: 0.20, mult: 1.05 },
    { id: "north", name: "North", share: 0.22, mult: 0.92 },
    { id: "midlands", name: "Midlands", share: 0.16, mult: 0.95 },
    { id: "scotwales", name: "Scotland & Wales", share: 0.10, mult: 0.90 },
    { id: "regother", name: "Other / unknown", share: 0.08, mult: 0.85 },
  ]},
  { key: "age", label: "Age", segments: [
    { id: "a18", name: "18–24", share: 0.18, mult: 0.85 },
    { id: "a25", name: "25–34", share: 0.27, mult: 1.05 },
    { id: "a35", name: "35–44", share: 0.24, mult: 1.10 },
    { id: "a45", name: "45–54", share: 0.18, mult: 1.05 },
    { id: "a55", name: "55+", share: 0.13, mult: 0.95 },
  ]},
  { key: "gender", label: "Gender", segments: [
    { id: "female", name: "Female", share: 0.52, mult: 1.05 },
    { id: "male", name: "Male", share: 0.43, mult: 0.97 },
    { id: "gunknown", name: "Unknown", share: 0.05, mult: 0.85 },
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

const CAUSE_TYPES = [
  { id: "deploy_bug", label: "A deploy or release broke something" },
  { id: "gateway_failure", label: "A payment gateway/provider failed" },
  { id: "traffic_quality", label: "Low-quality or bot traffic" },
  { id: "tracking_bug", label: "A tracking/analytics bug — not a real drop" },
  { id: "inventory", label: "A stockout or inventory issue" },
  { id: "external_no_issue", label: "Normal seasonality — no real incident" },
];

/* ---- the case file ---------------------------------------------- */
const CASES = [
  {
    id: "paypal-gateway", n: 1, difficulty: "Standard",
    ticket: {
      channel: "#cro-incidents", from: "Priya · Head of CRO",
      subject: "Checkout may be broken — revenue is down",
      body: "Revenue is down about 20% this week compared with last week. Customer service has had a few complaints, but nothing specific. Can you investigate and tell us the cause before the team meeting?",
    },
    // Deliberately moderate, not catastrophic: a glaring near-total
    // wipeout is unmissable from the topline alone and needs no real
    // segmentation. 0.35 still gives a clean, real, findable signal once
    // the right dimension is checked, but the AGGREGATE effect (~15-20%
    // amid day-to-day noise) doesn't scream "incident" on its own — it
    // has to be found, not glanced at.
    incident: { dimension: "payment", segment: "paypal", type: "rate", shape: "cliff", startDay: 18, factor: 0.35, stage: "purchase" },
    sessionShiftEvents: [{ dimension: "source", segment: "email", days: [18, 19, 20], factor: 1.45 }],
    // Event labels are deliberately oblique — a real changelog entry
    // wouldn't pre-name the dimension/segment/cause for you. Three
    // events across two nearby days (one a pure decoy with no data
    // effect at all) so "what happened that week" isn't a shortcut to
    // the answer; only the data can confirm which one, if any, lines up.
    events: [
      { day: 16, label: "Database maintenance window completed", real: false },
      { day: 18, label: "Backend infrastructure patch deployed to production", real: true },
      { day: 18, label: "Spring marketing campaign launched", real: false },
    ],
    truth: {
      dimension: "payment", segment: "paypal", startDay: 18, shape: "cliff", causeType: "gateway_failure",
      explanation: "The 'backend infrastructure patch' was really a PayPal system update. It broke payment for anyone paying with PayPal. Their conversion rate dropped to almost zero, while every other payment method stayed normal. PayPal was a quarter of all checkouts, so this one problem explains the whole revenue drop. The marketing campaign was real, and it did bring in more email visitors. But those visitors converted at the normal rate, so the campaign was not the cause. The database maintenance two days earlier changed nothing in the data.",
    },
  },
  {
    // The hard case: a genuine cross-dimension interaction. Checking
    // Device alone shows Mobile a little soft; checking Browser alone
    // shows Safari a little soft — NEITHER fully explains the drop, and
    // both are easy to write off as noise. Only a Device × Browser
    // cross-tab isolates the truth: it's specifically Mobile Safari,
    // and there it's a real, dramatic collapse. This is the case where
    // "check every report" beats "find the one report with a clean signal".
    id: "mobile-safari-bug", n: 2, difficulty: "Advanced",
    ticket: {
      channel: "#cro-incidents", from: "Priya · Head of CRO",
      subject: "Conversion is slowly falling — we cannot identify the cause",
      body: "Nothing looks badly broken, but conversion has been lower for about two weeks, and revenue is behind target. Marketing says it is just the market. Engineering says nothing important changed. We need a clear answer for the board report.",
    },
    incident: { type: "rate-joint", dimA: "device", segA: "mobile", dimB: "browser", segB: "safari", shape: "cliff", startDay: 16, factor: 0.08, stage: "atc" },
    // The red herring is itself a real, debunkable data point, not just a
    // line in the ticket: paid-search session SHARE genuinely dips for a
    // few days (shoppers searching the competitor's offer instead), but
    // — like case 1's email bump — it's a session-volume effect with no
    // conversion-quality story behind it.
    sessionShiftEvents: [{ dimension: "source", segment: "paidsearch", days: [14, 15, 16], factor: 0.65 }],
    events: [
      { day: 14, label: "Competitor launched a price-match guarantee", real: false },
      { day: 16, label: "Frontend release v4.2 shipped", real: true },
      { day: 16, label: "Q2 brand refresh announced internally", real: false },
    ],
    truth: {
      dimension: "device", segment: "mobile", secondary: "browser", segmentB: "safari", startDay: 16, shape: "cliff", causeType: "deploy_bug",
      explanation: "Release v4.2 changed the checkout layout. This broke the 'Add to cart' button, but only in the Safari browser on mobile phones. This kind of bug is common: it affects mobile Safari only, not Safari on desktop and not Chrome or Firefox. If you check Device on its own, Mobile looks only a little worse. That is because most mobile visitors use Chrome and were not affected. If you check Browser on its own, Safari looks only a little worse, because most Safari visitors are on desktop and were fine. Neither report alone is clear enough. Only the Device × Browser cross-tab isolates Mobile plus Safari, where conversion truly collapsed. The competitor's price-match offer was real and moved some paid-search visitors away. But the visitors who stayed converted normally, so this was a change in volume, not quality. The internal brand-refresh announcement had no effect on customers.",
    },
  },
  {
    // EXPERT — the composition / Simpson's-paradox trap. There is NO rate
    // incident anywhere: every segment's own conversion rate is flat all
    // month. The sitewide rate falls purely because a 3× paid-social push
    // floods the site with low-intent traffic while high-intent organic
    // dips — the MIX degrades. The "incident" the ticket describes is real
    // in the aggregate but there is no broken segment to find. The correct
    // call is "no site fault — traffic quality", and the discipline being
    // tested is refusing to invent a bug: if no segment rate moved, nothing
    // broke. (Implemented with session-shifts only, incident = null.)
    id: "traffic-mix", n: 3, difficulty: "Expert",
    ticket: {
      channel: "#cro-incidents", from: "Dev · Growth Lead",
      subject: "Conversion is down but the site looks fine",
      body: "Sitewide conversion is down about 8% over the last week and revenue is behind, but nobody has touched the checkout and error rates are normal. We did just scale up a new paid-social campaign. Is the site broken, or is something else going on? The board wants a definitive answer, with evidence.",
    },
    incident: null,
    sessionShiftEvents: [
      { dimension: "source", segment: "paidsocial", days: [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27], factor: 2.8 },
      { dimension: "source", segment: "organic", days: [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27], factor: 0.72 },
    ],
    events: [
      { day: 15, label: "Checkout microcopy A/B test started", real: false },
      { day: 17, label: "Paid-social budget increased ~3× (new short-video campaign)", real: true },
      { day: 19, label: "Analytics SDK updated to v9", real: false },
    ],
    truth: {
      dimension: "source", segment: "paidsocial", startDay: 17, shape: "cliff", causeType: "traffic_quality",
      explanation: "Nothing on the site broke. Check any segment's conversion rate — including paid social's own — and it is essentially flat for the whole month. What changed is the MIX of traffic. A 3× paid-social push flooded the site with low-intent visitors, and paid social converts far below organic and email; at the same time organic, your best-converting source, dipped. More visitors, lower-quality average. The sitewide rate fell only because the composition of traffic got worse — not because any page or checkout failed. This is a mix shift (a Simpson's-paradox effect): the aggregate moves even though no underlying group did. The trap is to go hunting for a broken segment; the honest finding is that there is none, and the conversation belongs with marketing about traffic quality and targeting, not with engineering. The checkout A/B test and the analytics SDK update were coincidences with no effect in the data.",
    },
  },
  {
    // EXPERT — a masked localized incident. A real desktop-only checkout bug
    // craters desktop conversion, but a coincident loyalty push lifts
    // returning-user and email share (both high-converting), so the TOPLINE
    // only dips a few percent and looks like noise. The team even reads the
    // returning-user surge as good news. The lesson: a calm aggregate can
    // hide a severe localized incident that a favourable mix-shift is
    // masking — you must segment, and you must not mistake the masking
    // surge for the cause. (Rate incident on device:desktop + benign shifts.)
    id: "masked-desktop", n: 4, difficulty: "Expert",
    ticket: {
      channel: "#cro-incidents", from: "Priya · Head of CRO",
      subject: "Small dip, but revenue feels worse than it should",
      body: "Sitewide conversion is only down a couple of percent — well within what we'd call noise — and returning-customer numbers are actually up after our loyalty push, so most of the team thinks we're fine. But revenue is softer than that small dip suggests, and a few customers mentioned checkout looked odd. Can you confirm there's really nothing wrong?",
    },
    incident: { dimension: "device", segment: "desktop", type: "rate", shape: "cliff", startDay: 18, factor: 0.72, stage: "checkout" },
    sessionShiftEvents: [
      { dimension: "userType", segment: "returning", days: [18, 19, 20, 21, 22, 23, 24, 25, 26, 27], factor: 2.2 },
      { dimension: "source", segment: "email", days: [18, 19, 20, 21, 22, 23, 24, 25, 26, 27], factor: 1.8 },
    ],
    events: [
      { day: 16, label: "Quarterly loyalty email blast sent to existing customers", real: false },
      { day: 18, label: "Checkout layout refactor deployed to production", real: true },
      { day: 20, label: "New homepage hero banner published", real: false },
    ],
    truth: {
      dimension: "device", segment: "desktop", startDay: 18, shape: "cliff", causeType: "deploy_bug",
      explanation: "There is a real, serious incident — it is just hidden. The desktop checkout refactor broke conversion on desktop, where the rate dropped by roughly a quarter from day 18. The sitewide number barely moved because the same week's loyalty email blast pulled in a surge of returning customers and email traffic, both of which convert well above average — that favourable mix shift propped the topline up and masked the desktop collapse. The team read the returning-user surge as good news; it was actually camouflage. Segment by device and desktop's drop is obvious and severe, while mobile and tablet are flat. The loyalty blast and the returning-user surge were real but were NOT the cause — they were masking it. The homepage banner had no effect. The lesson: a calm aggregate does not mean nothing is wrong, and a favourable trend can hide a costly localized fault.",
    },
  },
];
const CASEMAP = Object.fromEntries(CASES.map((c) => [c.id, c]));

/* ---- incident & session-shift shaping ------------------------
   Built for the full eight-case arc even though case 1 only uses
   'cliff': a sudden break holds at `factor`; 'gradual' ramps in over
   10 days (a slow bleed); 'spike-revert' is a short-lived blip that
   then heals on its own. */
function incidentFactorAt(day, incident) {
  if (!incident || day < incident.startDay) return 1;
  const { shape, factor, startDay } = incident;
  if (shape === "gradual") { const t = clamp((day - startDay) / 10, 0, 1); return 1 + (factor - 1) * t; }
  if (shape === "spike-revert") return day < startDay + 5 ? factor : 1;
  return factor; // cliff
}
function sessionShiftFactorAt(day, dimKey, segId, shiftEvents) {
  let f = 1;
  for (const s of shiftEvents || []) if (s.dimension === dimKey && s.segment === segId && s.days.includes(day)) f *= s.factor;
  return f;
}
// Apply any active session-shift to one dimension's shares for a day,
// renormalised back to summing to 1.
function effectiveShares(dim, day, shiftEvents) {
  const raw = dim.segments.map((s) => s.share * sessionShiftFactorAt(day, dim.key, s.id, shiftEvents));
  const total = raw.reduce((a, b) => a + b, 0);
  return dim.segments.map((s, i) => ({ ...s, share: raw[i] / total }));
}
function effectiveMult(dim, seg, day, incident) {
  if (incident && incident.type === "rate" && incident.dimension === dim.key && incident.segment === seg.id) return seg.mult * incidentFactorAt(day, incident);
  return seg.mult;
}
function weightedAvgMult(dim, day, incident, shiftEvents) {
  return effectiveShares(dim, day, shiftEvents).reduce((a, s) => a + s.share * effectiveMult(dim, s, day, incident), 0);
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
//   topline(t)        = baseline(t) · [Wa(t)·Wb(t) + pJoint·(jf(t)-1)] · Π(other 4 dims)
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
// isolated to exactly one cell. Finding it requires cross-referencing
// both single-dimension reports, not just checking one.
function generateCase(caseId, seed, opts = {}) {
  const def = CASEMAP[caseId];
  if (!def) throw new Error("unknown case: " + caseId);
  const noiseScale = opts.noise ?? 1;
  const rngSess = makeRng(seed + ":" + caseId + ":sessions");
  const rngConv = makeRng(seed + ":" + caseId + ":conv");
  const incident = def.incident;
  const isJoint = incident && incident.type === "rate-joint";
  const dimAKey = isJoint ? incident.dimA : null, dimBKey = isJoint ? incident.dimB : null;
  const segADef = isJoint ? DMAP[dimAKey].segments.find((s) => s.id === incident.segA) : null;
  const segBDef = isJoint ? DMAP[dimBKey].segments.find((s) => s.id === incident.segB) : null;
  const pJointRaw = isJoint ? segADef.share * segADef.mult * segBDef.share * segBDef.mult : 0;

  // Calibration constant: BASE_CONVERSION is the topline rate with no
  // incident/shift active (day 0, forced clean) — solved once so the
  // pre-incident baseline always reads as the configured rate. A joint
  // incident hasn't started at day 0 either, so the plain product is
  // still the correct calibration reference (jf(0)=1 collapses the
  // joint formula back to the plain Wa·Wb product).
  let baselineProduct = 1;
  for (const dim of DIMENSIONS) baselineProduct *= weightedAvgMult(dim, 0, null, null);
  const K = BASE_CONVERSION / baselineProduct;

  // engagement-metric RNG streams + per-dimension average characters (so a
  // segment's engagement reconciles to the topline the same way conversion does)
  const rngEng = makeRng(seed + ":" + caseId + ":eng");
  const rngTime = makeRng(seed + ":" + caseId + ":time");
  const rngEv = makeRng(seed + ":" + caseId + ":ev");
  const rngNew = makeRng(seed + ":" + caseId + ":new");
  const avgEng = {}, avgEv = {};
  for (const dim of DIMENSIONS) {
    avgEng[dim.key] = dim.segments.reduce((a, s) => a + s.share * engMultOf(s.id), 0);
    avgEv[dim.key] = dim.segments.reduce((a, s) => a + s.share * evMultOf(s.id), 0);
  }

  const topline = [];
  const series = {}; // dimKey -> segId -> rows
  for (const dim of DIMENSIONS) { series[dim.key] = {}; for (const s of dim.segments) series[dim.key][s.id] = []; }

  for (let day = 0; day < TOTAL_DAYS; day++) {
    const sessNoise = (rngSess() * 2 - 1) * 0.05 * noiseScale;
    const convNoise = (rngConv() * 2 - 1) * 0.04 * noiseScale;
    const sessions = BASE_SESSIONS * SEASONALITY[day % 7] * (1 + sessNoise);
    const engRate0 = clamp(BASE_ENG_RATE * (1 + (rngEng() * 2 - 1) * 0.04 * noiseScale), 0.1, 0.95);
    const engTime0 = BASE_ENG_TIME * (1 + (rngTime() * 2 - 1) * 0.06 * noiseScale);
    const evPer0 = BASE_EVENTS * (1 + (rngEv() * 2 - 1) * 0.05 * noiseScale);
    const newUsers = sessions * NEW_SHARE * (1 + (rngNew() * 2 - 1) * 0.05 * noiseScale);

    // a "rate-joint" incident has no `.dimension` field, so the ordinary
    // per-dimension helpers naturally treat it as a no-op — dimW below
    // is always the PLAIN marginal weighted average for every dimension.
    const dimW = {};
    for (const dim of DIMENSIONS) dimW[dim.key] = weightedAvgMult(dim, day, incident, def.sessionShiftEvents);
    let convMultProduct = Object.values(dimW).reduce((a, b) => a * b, 1);

    let jf = 1, jointDenom = null;
    if (isJoint) {
      jf = incidentFactorAt(day, incident);
      const plainPair = dimW[dimAKey] * dimW[dimBKey];
      jointDenom = plainPair + pJointRaw * (jf - 1);
      convMultProduct = (convMultProduct / plainPair) * jointDenom;
    }
    const conversionRate = clamp(K * convMultProduct * (1 + convNoise), 0.001, 0.95);
    const purchases = sessions * conversionRate;
    topline.push({ day, sessions, conversionRate, purchases, revenue: purchases * AOV, engagementRate: engRate0, engagedSessions: sessions * engRate0, avgEngagementTime: engTime0, events: sessions * evPer0, newUsers });

    for (const dim of DIMENSIONS) {
      for (const s of effectiveShares(dim, day, def.sessionShiftEvents)) {
        const segSessions = sessions * s.share;
        let segRate;
        if (isJoint && dim.key === dimAKey) {
          const otherFactor = s.id === segADef.id ? dimW[dimBKey] + segBDef.share * segBDef.mult * (jf - 1) : dimW[dimBKey];
          segRate = clamp((conversionRate * s.mult * otherFactor) / jointDenom, 0.0005, 0.98);
        } else if (isJoint && dim.key === dimBKey) {
          const otherFactor = s.id === segBDef.id ? dimW[dimAKey] + segADef.share * segADef.mult * (jf - 1) : dimW[dimAKey];
          segRate = clamp((conversionRate * s.mult * otherFactor) / jointDenom, 0.0005, 0.98);
        } else {
          segRate = clamp((conversionRate * effectiveMult(dim, s, day, incident)) / dimW[dim.key], 0.0005, 0.98);
        }
        const segPurchases = segSessions * segRate;
        const segEngRate = clamp((engRate0 * engMultOf(s.id)) / avgEng[dim.key], 0.05, 0.98);
        const segEngTime = (engTime0 * engMultOf(s.id)) / avgEng[dim.key];
        const segEvents = (segSessions * evPer0 * evMultOf(s.id)) / avgEv[dim.key];
        series[dim.key][s.id].push({ day, sessions: segSessions, conversionRate: segRate, purchases: segPurchases, revenue: segPurchases * AOV, engagementRate: segEngRate, engagedSessions: segSessions * segEngRate, avgEngagementTime: segEngTime, events: segEvents });
      }
    }
  }

  const breakdowns = DIMENSIONS.map((d) => ({ key: d.key, label: d.label, segments: d.segments, series: series[d.key] }));

  // The compound/cross-tab view is no longer pre-baked as a giveaway "report"
  // — `buildCrossTab` computes any pair on demand when the analyst adds a
  // secondary dimension. We expose the incident + shift model so it can.
  return { id: def.id, n: def.n, ticket: def.ticket, topline, events: def.events, truth: def.truth, breakdowns, incident, shiftEvents: def.sessionShiftEvents || [] };
}

/* ---- buildCrossTab: pivot ANY report by a secondary dimension ----
   The GA "secondary dimension" power-move, computed on demand. A session's
   conversion rate, conditioned on being in segment a of dim A AND segment b
   of dim B, is the topline rate that day scaled by how far that cell's true
   multiplier sits from the population mean:
       rate(a,b,t) = r0(t) · M(a,b,t) / convMultProduct(t)
   where M(a,b) = effMultA(a)·effMultB(b)·jointFactor(a,b)·Π(other dims' W).
   This is exact for both incident types and reconciles to the topline (shown
   in tests). It means: cross-tabbing the two dims a joint incident lives in
   isolates the true cell; cross-tabbing anything else just spreads a
   single-dim incident evenly — so the analyst has to pick the RIGHT pivot. */
function buildCrossTab(caseData, aKey, bKey) {
  const A = DMAP[aKey], B = DMAP[bKey];
  const incident = caseData.incident, shiftEvents = caseData.shiftEvents || [];
  const isJoint = incident && incident.type === "rate-joint";
  const jointPair = isJoint && ((incident.dimA === aKey && incident.dimB === bKey) || (incident.dimA === bKey && incident.dimB === aKey));
  const segADef = isJoint ? DMAP[incident.dimA].segments.find((s) => s.id === incident.segA) : null;
  const segBDef = isJoint ? DMAP[incident.dimB].segments.find((s) => s.id === incident.segB) : null;
  const pJoint = isJoint ? segADef.share * segADef.mult * segBDef.share * segBDef.mult : 0;

  const cells = [];
  for (const sa of A.segments) for (const sb of B.segments) cells.push({ id: `${sa.id}__${sb.id}`, name: `${sa.name} / ${sb.name}`, aId: sa.id, bId: sb.id, sa, sb });
  const out = { key: `${aKey}__${bKey}`, label: `${A.label} × ${B.label}`, segments: cells.map((c) => ({ id: c.id, name: c.name })), series: {}, isCrossTab: true, primary: aKey, secondary: bKey };
  cells.forEach((c) => (out.series[c.id] = []));
  const avgEngA = A.segments.reduce((a, s) => a + s.share * engMultOf(s.id), 0), avgEngB = B.segments.reduce((a, s) => a + s.share * engMultOf(s.id), 0);
  const avgEvA = A.segments.reduce((a, s) => a + s.share * evMultOf(s.id), 0), avgEvB = B.segments.reduce((a, s) => a + s.share * evMultOf(s.id), 0);

  for (let day = 0; day < TOTAL_DAYS; day++) {
    const r0 = caseData.topline[day].conversionRate;
    const sess = caseData.topline[day].sessions;
    const dimW = {};
    for (const dim of DIMENSIONS) dimW[dim.key] = weightedAvgMult(dim, day, incident, shiftEvents);
    let convMultProduct = Object.values(dimW).reduce((a, b) => a * b, 1);
    let jf = 1;
    if (isJoint) { jf = incidentFactorAt(day, incident); const plainPair = dimW[incident.dimA] * dimW[incident.dimB]; convMultProduct = (convMultProduct / plainPair) * (plainPair + pJoint * (jf - 1)); }
    const otherProd = DIMENSIONS.filter((d) => d.key !== aKey && d.key !== bKey).reduce((p, d) => p * dimW[d.key], 1);
    const shareA = Object.fromEntries(effectiveShares(A, day, shiftEvents).map((s) => [s.id, s.share]));
    const shareB = Object.fromEntries(effectiveShares(B, day, shiftEvents).map((s) => [s.id, s.share]));
    for (const c of cells) {
      const mA = effectiveMult(A, c.sa, day, incident);
      const mB = effectiveMult(B, c.sb, day, incident);
      const isIncidentCell = jointPair && ((c.aId === incident.segA && c.bId === incident.segB) || (c.aId === incident.segB && c.bId === incident.segA));
      const cellMult = mA * mB * (isIncidentCell ? jf : 1) * otherProd;
      const rate = clamp((r0 * cellMult) / convMultProduct, 0.0005, 0.98);
      const cellSessions = sess * shareA[c.aId] * shareB[c.bId];
      const top = caseData.topline[day];
      const engFactor = (engMultOf(c.aId) / avgEngA) * (engMultOf(c.bId) / avgEngB);
      const cellEng = clamp(top.engagementRate * engFactor, 0.05, 0.98);
      const cellEvents = cellSessions * (top.events / top.sessions) * (evMultOf(c.aId) / avgEvA) * (evMultOf(c.bId) / avgEvB);
      out.series[c.id].push({ day, sessions: cellSessions, conversionRate: rate, purchases: cellSessions * rate, revenue: cellSessions * rate * AOV, engagementRate: cellEng, engagedSessions: cellSessions * cellEng, avgEngagementTime: top.avgEngagementTime * engFactor, events: cellEvents });
    }
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
  if (incident.type === "rate") return fset.has(`${incident.dimension}:${incident.segment}`);
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

// The "investigation tool" summary: each segment's week-1 vs week-4
// conversion rate, sorted by the size of the move — plus the GA-style
// report detail (share of sessions, purchases, revenue, AOV) for the
// data table. Uses fixed calendar windows rather than the true incident
// date, so it doesn't hand the answer to a student who hasn't found the
// date yet. Share is computed against this dimension's own late-window
// session total, which — by the engine's reconciliation invariant —
// exactly equals the topline's, so no separate reference is needed.
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
  return {
    sessions: stat("sessions", true),
    newUsers: stat("newUsers", true),
    engagedSessions: stat("engagedSessions", true),
    engagementRate: stat("engagementRate", false),
    avgEngagementTime: stat("avgEngagementTime", false),
    events: stat("events", true),
    conversionRate: stat("conversionRate", false),
    purchases: stat("purchases", true),
    revenue: stat("revenue", true),
  };
}

// A flavour-only Realtime snapshot (GA's "users in last 30 minutes"). Pure
// atmosphere — deterministic from the seed, unrelated to the incident.
function realtimeSnapshot(caseData, seed = "rt") {
  const rng = makeRng(seed + ":" + caseData.id + ":realtime");
  const perMinute = Array.from({ length: 30 }, () => Math.round(120 + rng() * 90));
  const active = perMinute.reduce((a, b) => a + b, 0);
  const countries = DMAP.country.segments.map((s) => ({ name: s.name, users: Math.max(1, Math.round(active * s.share * (0.7 + rng() * 0.6))) })).sort((a, b) => b.users - a.users);
  const pages = DMAP.page.segments.map((s) => ({ name: s.name, users: Math.max(1, Math.round(active * s.share * (0.7 + rng() * 0.6))) })).sort((a, b) => b.users - a.users);
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
function scoreDiagnosis(guess, truth) {
  const truthPairs = [[truth.dimension, truth.segment], [truth.secondary || null, truth.segmentB || null]];
  const guessPairs = [[guess.dimension, guess.segment], [guess.secondary || null, guess.segmentB || null]];
  const dimensionCorrect = dimSet(truthPairs) === dimSet(guessPairs);
  const segmentCorrect = dimensionCorrect && segSig(truthPairs) === segSig(guessPairs);
  const causeTypeCorrect = guess.causeType === truth.causeType;
  const dateCorrect = Math.abs((guess.startDay ?? -999) - truth.startDay) <= 2;
  const fieldsCorrect = [dimensionCorrect, segmentCorrect, causeTypeCorrect, dateCorrect].filter(Boolean).length;
  return { dimensionCorrect, segmentCorrect, causeTypeCorrect, dateCorrect, fieldsCorrect, allCorrect: fieldsCorrect === 4 };
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
};

export {
  clamp, gbp, pct, pp, makeRng,
  TOTAL_DAYS, BASE_SESSIONS, BASE_CONVERSION, AOV, EARLY_WINDOW, LATE_WINDOW, dayShort, dayLong,
  DIMENSIONS, DMAP, REPORTS, CAUSE_TYPES, CASES, CASEMAP, FUNNEL_STAGES,
  incidentFactorAt, generateCase, buildCrossTab, buildFunnel, realtimeSnapshot, precedingPeriod,
  avgRange, sumRange, summariseSegments, summariseTopline, scoreDiagnosis, GLOSSARY,
};
