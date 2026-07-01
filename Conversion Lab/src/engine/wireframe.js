/* ============================================================
   WIREFRAME STUDIO — pure design engine (LO2), rigorous edition.
   A student assembles a product page, but there is no universal
   "grade-A" layout: scoring is context-dependent and full of
   trade-offs, so the task rewards judgment, not a checklist.

   Four difficulty mechanisms bake in:
   1. PERFORMANCE BUDGET — every component adds page weight → load
      time; slower load cuts conversion (mobile far more). Adding
      everything backfires (a value-vs-weight knapsack).
   2. BRIEF / DEVICE CONTEXT — a mobile flash-sale, a considered
      B2B purchase and a warm returning-customer page want DIFFERENT
      layouts. Fold size, speed sensitivity and what helps all shift.
   3. INTERACTION EFFECTS & DIMINISHING RETURNS — stacking urgency /
      social proof erodes trust ("protests too much"); duplicate
      trust signals diminish; fake urgency HURTS professional buyers.
   4. HONEST PREDICTED RATE — the review computes the true expected
      conversion (perf + interactions included), but the studio hides
      it until the student has committed a hypothesis, so a good-
      looking page is still only a hypothesis until tested.

   Deterministic: same (layout, brief) → same review, so runTest()
   keeps its seeded reproducibility. No React, no I/O.
   ============================================================ */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
// Diminishing-returns sum: sorted desc, each next contribution halved.
const diminishing = (vals) => vals.filter((v) => v > 0).sort((a, b) => b - a).reduce((s, v, i) => s + v * Math.pow(0.5, i), 0);

/* ---- the component palette ----------------------------------
   role groups the interaction logic; wt is page weight in ms of
   added load (a heavy hero gallery and an autoplay video are the
   expensive ones). */
const PALETTE = [
  { id: "image",    label: "Product image / gallery", icon: "🖼️", role: "essential", wt: 320, desc: "The hero shot. Shoppers buy what they can see — but a big gallery is heavy." },
  { id: "title",    label: "Product title",           icon: "🏷️", role: "essential", wt: 10,  desc: "What the thing is. Orients the visitor instantly." },
  { id: "price",    label: "Price",                    icon: "💷", role: "essential", wt: 10,  desc: "The single fact every buyer looks for first." },
  { id: "atc",      label: "Add-to-cart button",       icon: "🛒", role: "essential", wt: 15,  desc: "The call to action — the one click the whole page exists for." },
  { id: "reviews",  label: "Star reviews",             icon: "⭐", role: "trust",     wt: 180, desc: "Social proof. Strong on cold traffic; a widget, so not free to load." },
  { id: "trust",    label: "Trust & guarantee badges", icon: "🛡️", role: "trust",     wt: 40,  desc: "Secure-checkout & money-back badges — reverses risk cheaply." },
  { id: "social",   label: "Social-proof counter",     icon: "👥", role: "social",    wt: 110, desc: "“327 bought this.” Overlaps with reviews — the two together add little." },
  { id: "scarcity", label: "Scarcity badge",           icon: "⏳", role: "urgency",   wt: 30,  desc: "“Only 3 left.” Nudges impulse buyers; reads as pressure to pros." },
  { id: "countdown",label: "Countdown timer",          icon: "⏱️", role: "urgency",   wt: 60,  desc: "Urgency for a flash sale — but stack it with scarcity and it looks like a scam." },
  { id: "shipping", label: "Delivery & returns info",  icon: "🚚", role: "info",      wt: 15,  desc: "Answers the second-biggest question after price." },
  { id: "desc",     label: "Product description",      icon: "📄", role: "info",      wt: 20,  desc: "Specs and detail — decisive for a considered purchase, ignored on impulse." },
  { id: "related",  label: "Related products",         icon: "🧩", role: "crosssell", wt: 240, desc: "Cross-sell. Gold for returning buyers; heavy noise up top for cold traffic." },
  { id: "video",    label: "Autoplay product video",   icon: "🎬", role: "media",     wt: 900, desc: "Very heavy. Raises time-on-page (vanity) but can wreck mobile load." },
];
const PMAP = Object.fromEntries(PALETTE.map((c) => [c.id, c]));
const ESSENTIALS = PALETTE.filter((c) => c.role === "essential").map((c) => c.id);
const NUDGES = ["scarcity", "countdown", "social", "video", "related"]; // compete for attention

/* ---- the briefs (page context) ------------------------------
   The same components perform differently here. Knobs:
   trustNeed  — how much cold-audience reassurance matters (0..1)
   detailNeed — how much spec/detail the purchase needs (0..1)
   reorderNeed— value of cross-sell / reorder prompts (0..1)
   urgencyFit — sign & scale of scarcity/countdown (+ helps, − hurts)
   speedSens  — multiplier on the load-time penalty
   mobileShare— sets the fold size and network speed              */
const BRIEFS = [
  { id: "flash", name: "Mobile flash-sale landing", icon: "📱", base: 0.050, mobileShare: 0.85,
    audience: "Cold, impulse-driven shoppers arriving on mobile from a paid flash-sale ad.",
    trustNeed: 0.8, detailNeed: 0.2, reorderNeed: 0.0, urgencyFit: +1, speedSens: 1.6 },
  { id: "b2b", name: "High-consideration B2B product", icon: "🏭", base: 0.030, mobileShare: 0.25,
    audience: "Professional buyers researching a considered, high-value purchase on desktop.",
    trustNeed: 0.9, detailNeed: 1.0, reorderNeed: 0.1, urgencyFit: -1, speedSens: 0.9 },
  { id: "returning", name: "Returning-customer product page", icon: "🔁", base: 0.075, mobileShare: 0.55,
    audience: "Warm returning customers who already trust the brand and may reorder.",
    trustNeed: 0.2, detailNeed: 0.4, reorderNeed: 1.0, urgencyFit: 0, speedSens: 1.1 },
];
const BMAP = Object.fromEntries(BRIEFS.map((b) => [b.id, b]));

const CONTROL_LAYOUT = ["image", "title", "price", "desc", "atc", "shipping"];
const BASE_LATENCY = 350;      // ms of server + HTML before components
const LOAD_BUDGET = 1200;      // ms; conversion penalty accrues beyond this
const foldFor = (mobileShare) => (mobileShare > 0.7 ? 3 : mobileShare < 0.35 ? 5 : 4);

/* ---- load time (mechanism 1) -------------------------------- */
function loadTimeMs(layout, brief) {
  const rawWt = layout.reduce((s, id) => s + (PMAP[id]?.wt || 0), 0);
  const network = 1 + brief.mobileShare * 0.6;   // mobile networks are slower
  return Math.round((BASE_LATENCY + rawWt) * network);
}

/* ---- the review: context-aware, trade-off-laden -------------
   Returns qualitative checks for the UI PLUS the honest predicted
   conversion `rate` (kept hidden by the studio until the student
   commits a hypothesis). */
function reviewLayout(ids, brief = BRIEFS[0]) {
  const B = typeof brief === "string" ? (BMAP[brief] || BRIEFS[0]) : brief;
  const layout = ids.filter((id) => PMAP[id]);
  const has = (id) => layout.includes(id);
  const pos = (id) => layout.indexOf(id);
  const FOLD = foldFor(B.mobileShare);
  const aboveFold = (id) => has(id) && pos(id) < FOLD;

  const missingEssentials = ESSENTIALS.filter((id) => !has(id));
  const flowSeq = ["image", "title", "price", "atc"].filter(has).map(pos);
  const flowOk = flowSeq.every((v, i) => i === 0 || v > flowSeq[i - 1]) && flowSeq.length >= 3;

  // --- multipliers on the brief's base rate ---
  const mEssent = missingEssentials.length === 0 ? 1 : Math.pow(0.5, missingEssentials.length);
  const mCta = !has("atc") ? 1 : aboveFold("atc") ? 1.14 : 0.88;
  const mPrice = !has("price") ? 1 : aboveFold("price") ? 1.05 : 0.96;
  const mHero = pos("image") === 0 ? 1.05 : has("image") ? 1 : 1;
  const mFlow = flowOk ? 1.05 : 0.97;

  // trust: reviews strong, badges cheap, social overlaps reviews; scaled by need
  const trustRaw = diminishing([
    has("reviews") ? 0.11 : 0,
    has("trust") ? 0.06 : 0,
    has("social") ? (has("reviews") ? 0.02 : 0.06) : 0,
  ]);
  const trustSignals = ["reviews", "trust", "social"].filter(has).length;
  const mTrust = 1 + trustRaw * (0.4 + B.trustNeed);

  // urgency: context-signed with diminishing / negative stacking
  const urgN = ["scarcity", "countdown"].filter(has).length;
  let mUrg = 1;
  if (urgN > 0) {
    if (B.urgencyFit > 0) mUrg = 1 + (urgN === 1 ? 0.07 : 0.07 - 0.06 * (urgN - 1)); // 2nd dilutes → can turn negative
    else if (B.urgencyFit < 0) mUrg = 1 - 0.06 * urgN;                                // pros distrust fake urgency
    else mUrg = 1 - 0.025 * Math.max(0, urgN - 1);                                    // neutral; stacking still hurts
  }

  // detail: decisive when needed, dead weight when not
  const mDetail = has("desc") ? 1 + 0.06 * B.detailNeed : 1 - 0.07 * B.detailNeed;

  // cross-sell: reorder value for warm buyers; noise (esp. above fold) for cold
  const mReorder = has("related") ? 1 + 0.06 * B.reorderNeed - (aboveFold("related") ? 0.03 : 0) : 1;

  // overload / banner blindness: too many attention-grabbers dilute the CTA
  const nudgeN = layout.filter((id) => NUDGES.includes(id)).length;
  const mOverload = nudgeN <= 2 ? 1 : Math.pow(0.95, nudgeN - 2);

  // performance penalty
  const loadMs = loadTimeMs(layout, B);
  const over = Math.max(0, loadMs - LOAD_BUDGET);
  const mPerf = Math.pow(0.985, (over / 100) * B.speedSens);

  const rate = clamp(
    B.base * mEssent * mCta * mPrice * mHero * mFlow * mTrust * mUrg * mDetail * mReorder * mOverload * mPerf,
    0.008, 0.14,
  );

  // --- qualitative checks for the UI (context-aware) ---
  const st = (good, ok) => (good ? "pass" : ok ? "partial" : "fail");
  const checks = [
    { id: "essentials", label: "The essentials are present", severity: "critical",
      state: missingEssentials.length === 0 ? "pass" : "fail",
      tip: missingEssentials.length === 0 ? "Image, title, price and add-to-cart — the shopper can complete the task."
        : `Missing: ${missingEssentials.map((id) => PMAP[id].label).join(", ")}. A page you can't buy from can't convert.` },
    { id: "fold", label: `Priority above the fold (first ${FOLD} on ${B.mobileShare > 0.6 ? "mobile" : "this mix"})`, severity: "high",
      state: st(aboveFold("atc") && aboveFold("price"), has("atc")),
      tip: aboveFold("atc") && aboveFold("price") ? "Price and add-to-cart are reachable without scrolling."
        : `On a ${Math.round(B.mobileShare * 100)}%-mobile audience only the first ${FOLD} blocks are seen first — get price and the CTA up there.` },
    { id: "perf", label: "Page-load budget", severity: "high",
      state: st(loadMs <= LOAD_BUDGET, loadMs <= LOAD_BUDGET + 700 / B.speedSens),
      tip: loadMs <= LOAD_BUDGET ? `~${loadMs}ms to load — snappy.`
        : `~${loadMs}ms to load. On this ${B.mobileShare > 0.6 ? "mobile-heavy" : ""} audience every extra 100ms bleeds conversion — a big gallery, video or a wall of widgets is expensive.` },
    { id: "trustfit", label: "Trust matched to the audience", severity: "med",
      state: B.trustNeed >= 0.6
        ? st(trustSignals >= 1, false)
        : st(trustSignals <= 1, trustSignals === 2),
      tip: B.trustNeed >= 0.6
        ? (trustSignals >= 1 ? "Cold buyers get the reassurance they need." : "This is cold traffic — add reviews or a guarantee badge to reduce risk.")
        : (trustSignals <= 1 ? "Warm audience — you're not wasting space (or load) on trust they already have."
          : "These are returning customers who already trust you — stacked trust signals add load for little lift.") },
    { id: "urgencyfit", label: "Urgency matched to the audience", severity: "med",
      state: B.urgencyFit > 0 ? st(urgN >= 1 && urgN <= 1, urgN === 0 || urgN === 2)
        : B.urgencyFit < 0 ? st(urgN === 0, false)
        : st(urgN <= 1, false),
      tip: B.urgencyFit > 0
        ? (urgN === 1 ? "One urgency cue suits impulse buyers." : urgN === 0 ? "Impulse flash-sale traffic responds to a scarcity or countdown cue." : "Scarcity AND countdown together reads as a scam and dilutes both.")
        : B.urgencyFit < 0 ? (urgN === 0 ? "No fake urgency — right for professional buyers who research." : "Professional buyers distrust countdowns and “only 3 left” — it erodes credibility here.")
        : (urgN <= 1 ? "Urgency is neutral for this warm audience." : "Stacking urgency cues just adds noise for returning customers.") },
    { id: "detailfit", label: "Detail matched to the purchase", severity: "med",
      state: B.detailNeed >= 0.7 ? st(has("desc"), false) : B.detailNeed <= 0.3 ? "pass" : st(has("desc"), true),
      tip: B.detailNeed >= 0.7 ? (has("desc") ? "The considered buyer gets the specs they need to decide." : "A high-consideration purchase needs a full description/specs — buyers won't commit blind.")
        : "Impulse buyers skim — heavy detail isn't decisive here." },
    { id: "focus", label: "Focused, not overloaded", severity: "med",
      state: st(nudgeN <= 2, nudgeN === 3),
      tip: nudgeN <= 2 ? "A focused page — the add-to-cart isn't fighting a wall of widgets."
        : "Too many attention-grabbers (urgency, social, video, cross-sell) — banner blindness dilutes the one action that matters." },
    { id: "flow", label: "Logical top-to-bottom flow", severity: "low",
      state: flowOk ? "pass" : "partial",
      tip: flowOk ? "Image → title → price → add-to-cart reads as one clear path." : "Order the core blocks image → title → price → add-to-cart." },
  ];

  const w = { critical: 3, high: 2, med: 1, low: 0.5 };
  const val = (c) => (c.state === "pass" ? 1 : c.state === "partial" ? 0.5 : 0);
  const totalW = checks.reduce((a, c) => a + w[c.severity], 0);
  const quality = totalW ? checks.reduce((a, c) => a + w[c.severity] * val(c), 0) / totalW : 0;
  const grade = quality >= 0.9 ? "A" : quality >= 0.75 ? "B" : quality >= 0.6 ? "C" : quality >= 0.45 ? "D" : "E";

  return {
    brief: B, fold: FOLD, loadMs, rate, base: B.base,
    checks, quality, grade,
    buyable: missingEssentials.length === 0, missingEssentials,
    lift: rate - B.base, nudgeN, trustSignals,
  };
}

/* ---- feed Conversion Lab -----------------------------------
   control = the current page for this brief (its base rate),
   variant = the student's design (honest predicted rate). */
function layoutToExperiment(ids, brief = BRIEFS[0], review) {
  const B = typeof brief === "string" ? (BMAP[brief] || BRIEFS[0]) : brief;
  const r = review || reviewLayout(ids, B);
  return {
    id: "wireframe",
    n: 0,
    title: `Your design vs the current ${B.name}`,
    principle: "Design patterns & best practice (LO2)",
    context: `You redesigned the ${B.name.toLowerCase()}. Prove whether it beats the current page — design is a hypothesis until the data agrees.`,
    baselineRate: B.base,
    control: { label: "Current page", note: "The live page for this brief." },
    variant: { label: "Your wireframe", rationale: "A context-fit layout should lift conversion — but only a powered test can confirm it." },
    truth: { pA: B.base, pB: r.rate },
    concept: "Design → hypothesis → evidence",
    suggestN: 3000,
    mock: { kind: "wireframe" },
  };
}

export {
  PALETTE, PMAP, ESSENTIALS, NUDGES, BRIEFS, BMAP, CONTROL_LAYOUT,
  BASE_LATENCY, LOAD_BUDGET, foldFor, loadTimeMs,
  reviewLayout, layoutToExperiment,
};
