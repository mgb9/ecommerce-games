/* ============================================================
   CONVERSION LAB — pure A/B-testing engine (no React, no I/O).
   runTest() is the deterministic, seeded "experiment run": every
   simulated visitor's conversion flows through `makeRng(seed)`,
   so the same seed + same plan always produce the identical run.
   Dependency-free on purpose — the two-proportion z-test, the
   confidence interval, the sample-size formula and the normal
   CDF/quantile are the teaching content, so they are implemented
   here in the open rather than pulled from a stats library.
   Mirrors the Marketplace Tycoon engine pattern so it ports to
   the same repo/test harness.
   ============================================================ */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const gbp = (n) => "£" + Math.round(n).toLocaleString("en-GB");
const pct = (p, dp = 1) => (p * 100).toFixed(dp) + "%";
const pp = (d, dp = 2) => (d >= 0 ? "+" : "") + (d * 100).toFixed(dp) + "pp";

/* ---- seeded RNG (mulberry32 + string hash), as in Tycoon ---- */
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

/* ---- the normal distribution (no library) -------------------
   normalCdf via Abramowitz-Stegun 7.1.26 erf; normalQuantile
   (inverse CDF) via Acklam's rational approximation. Accurate to
   ~1e-9 in the body — ample for teaching p-values and z-scores. */
function erf(x) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}
function normalCdf(z) { return 0.5 * (1 + erf(z / Math.SQRT2)); }
function normalQuantile(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  const plow = 0.02425, phigh = 1 - plow;
  let q, r;
  if (p < plow) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p <= phigh) { q = p - 0.5; r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
  q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}

/* ---- the two-proportion z-test (the heart of the lesson) ---- */
// Pooled SE for the test statistic; UNPOOLED SE for the CI on the
// difference — the textbook-correct pairing.
function twoPropTest(nA, cA, nB, cB, alpha) {
  const rA = nA ? cA / nA : 0;
  const rB = nB ? cB / nB : 0;
  const diff = rB - rA;
  const pPool = (nA + nB) ? (cA + cB) / (nA + nB) : 0;
  const sePool = nA && nB ? Math.sqrt(pPool * (1 - pPool) * (1 / nA + 1 / nB)) : 0;
  const z = sePool > 0 ? diff / sePool : 0;
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));
  const zCrit = normalQuantile(1 - alpha / 2);
  const seUn = nA && nB ? Math.sqrt(rA * (1 - rA) / nA + rB * (1 - rB) / nB) : 0;
  return {
    nA, nB, cA, cB, rA, rB, diff,
    z, pValue, zCrit,
    ciLow: diff - zCrit * seUn,
    ciHigh: diff + zCrit * seUn,
    significant: sePool > 0 && pValue < alpha,
  };
}

// Required sample size PER ARM for a target power. Planning aid the
// student commits to *before* running — uses their assumed baseline
// and minimum detectable effect, not the hidden truth.
function requiredSampleSize(pA, mde, alpha = 0.05, power = 0.8) {
  if (!(mde > 0) || pA <= 0 || pA >= 1) return Infinity;
  const pB = clamp(pA + mde, 0, 1);
  const zA = normalQuantile(1 - alpha / 2);
  const zB = normalQuantile(power);
  const n = Math.pow(zA + zB, 2) * (pA * (1 - pA) + pB * (1 - pB)) / Math.pow(mde, 2);
  return Math.ceil(n);
}

/* ---- experiments: a graded arc of Chrichton CRO cases -------
   Each hides a "true" effect chosen to teach one thing. `mock`
   describes the rendered variant pages for the UI to draw. Rates
   are real conversion proportions; the difference is what the test
   has to recover from noise. Segmented cases carry per-segment
   truths whose aggregate is computed in effExperiment(). */
const EXPERIMENTS = [
  {
    id: "cta", n: 1, title: "The “Add to cart” button",
    principle: "Visual hierarchy / contrast",
    context: "Chrichton's product pages use a muted grey ‘Add to cart’ button. The design team want to trial a high-contrast green one.",
    baselineRate: 0.040,
    control: { label: "Muted grey button", note: "Current Chrichton page." },
    variant: { label: "High-contrast green button", rationale: "A clearer visual call-to-action should pull more clicks straight into the cart." },
    truth: { pA: 0.040, pB: 0.052 },
    lesson: "A real, large effect — an easy, clean win that proves the method works before the traps arrive.",
    concept: "True positive",
    suggestN: 2000,
    mock: { kind: "cta" },
  },
  {
    id: "imgbg", n: 2, title: "Product photo background",
    principle: "Cosmetic design change",
    context: "The design team want to swap the product photo's plain white background for a warmer off-white. Purely cosmetic — but will it change the result?",
    baselineRate: 0.045,
    control: { label: "White background", note: "Current product cut-out." },
    variant: { label: "Warm off-white background", rationale: "A softer, ‘more premium’ backdrop should nudge conversion up." },
    truth: { pA: 0.045, pB: 0.045 },
    lesson: "There is NO real effect here. With enough noise you'll be tempted to crown a winner from pure chance — that's a Type I error (a false positive). Most cosmetic tweaks do nothing; only a test tells you which.",
    concept: "Type I error (false positive)",
    suggestN: 4000,
    mock: { kind: "imgbg" },
  },
  {
    id: "scarcity", n: 3, title: "“Only 3 left” scarcity badge",
    principle: "Scarcity (Cialdini)",
    context: "Add a stock-scarcity badge to product pages to nudge hesitant buyers.",
    baselineRate: 0.045,
    control: { label: "No badge", note: "Standard page." },
    variant: { label: "“Only 3 left in stock”", rationale: "Scarcity is a classic persuasion lever — surely it lifts conversion noticeably." },
    truth: { pA: 0.045, pB: 0.048 },
    lesson: "The effect is real but tiny. Detecting +0.3pp reliably needs a very large sample — intuition badly overrates scarcity, and an underpowered test will miss it.",
    concept: "Statistical power & sample size",
    suggestN: 6000,
    mock: { kind: "scarcity" },
  },
  {
    id: "social", n: 4, title: "Social proof: “327 gardeners bought this”",
    principle: "Social proof (Cialdini)",
    context: "Show a live ‘327 gardeners bought this’ counter under the price.",
    baselineRate: 0.045,
    control: { label: "No social proof", note: "Standard page." },
    variant: { label: "Live purchase counter", rationale: "Social proof reassures buyers they're making a popular, safe choice." },
    truth: { pA: 0.045, pB: 0.053 },
    lesson: "A real, moderate effect — but watch the significance verdict as data accrues. Stopping the moment it first reads p<0.05 (peeking) inflates your false-positive rate well above α.",
    concept: "Optional stopping / the peeking problem",
    suggestN: 3000,
    mock: { kind: "social" },
  },
  {
    id: "shipping", n: 5, title: "Free-shipping banner",
    principle: "Cost framing",
    context: "Run a site-wide ‘Free shipping on all orders’ banner. It will lift conversion — but Chrichton pays the £3.50 shipping cost on every order.",
    baselineRate: 0.045,
    control: { label: "Standard shipping", note: "Customer pays for shipping." },
    variant: { label: "Free shipping banner", rationale: "Removing shipping friction is one of the most reliable conversion lifts there is." },
    truth: { pA: 0.045, pB: 0.058 },
    // contribution per converting order (after item cost), before carriage
    profit: { marginA: 9.0, shippingCostB: 3.5 },
    lesson: "Statistically significant ≠ good for business. The banner genuinely lifts conversion, yet the free shipping it gives away can leave profit-per-visitor LOWER than the control. Judge the result by money, not just conversion rate.",
    concept: "Significance ≠ business value",
    suggestN: 3000,
    mock: { kind: "shipping" },
  },
  {
    id: "checkout", n: 6, title: "Checkout: multi-step vs one-page",
    principle: "Friction reduction",
    context: "Replace the three-step checkout with a single-page checkout. But Chrichton's traffic is a mix of mobile and desktop shoppers, who behave very differently.",
    baselineRate: 0.048,
    control: { label: "Multi-step checkout", note: "Three pages: details, delivery, pay." },
    variant: { label: "One-page checkout", rationale: "Fewer steps means fewer drop-offs — one-page checkout should win across the board." },
    segments: [
      { id: "mobile", name: "Mobile", share: 0.55, pA: 0.030, pB: 0.048 },
      { id: "desktop", name: "Desktop", share: 0.45, pA: 0.070, pB: 0.052 },
    ],
    lesson: "The aggregate looks like a near-tie, hiding the truth: one-page is a big win on mobile and a real loss on desktop (a segmentation / Simpson's-paradox trap). Always cut the result by segment before you ship.",
    concept: "Segmentation & Simpson's paradox",
    suggestN: 5000,
    mock: { kind: "checkout" },
  },
  {
    id: "promo", n: 7, title: "Homepage focus — promotions vs brand",
    principle: "Relevance by audience",
    context: "Chrichton's homepage could lead with loud seasonal PROMOTIONS, or with its curated BRAND story. The promo version looks like a clear winner overall — but new and returning visitors don't want the same thing.",
    baselineRate: 0.054,
    control: { label: "Brand-led homepage", note: "Curated story, no sale banner." },
    variant: { label: "Promotion-led homepage", rationale: "Loud deals grab attention and should lift conversion across the board." },
    segments: [
      { id: "new", name: "New visitors", share: 0.60, pA: 0.040, pB: 0.052 },
      { id: "returning", name: "Returning customers", share: 0.40, pA: 0.075, pB: 0.066 },
    ],
    lesson: "Overall the promo homepage wins — driven by new visitors. But it quietly cuts conversion for your returning, higher-value customers, who came for the brand, not a sale. A winning aggregate can still harm your best segment. Segment before you roll out.",
    concept: "A winning test that hurts a segment",
    suggestN: 5000,
    mock: { kind: "promo" },
  },
  {
    id: "subject", n: 8, title: "Email subject line — clickbait vs clear",
    principle: "Message match / curiosity gap",
    context: "Chrichton's newsletter: a curiosity-gap ‘clickbait’ subject line, or a clear, descriptive one. You're optimising the email OPEN RATE — the number the team report each week.",
    baselineRate: 0.18,
    metricLabel: "open rate",
    control: { label: "Clear subject line", note: "“Your spring planting guide + 10% off”." },
    variant: { label: "Clickbait subject line", rationale: "A curiosity gap is irresistible — it should lift opens." },
    truth: { pA: 0.18, pB: 0.22 },
    // secondary "guardrail" metric: of those who opened, the fraction that
    // went on to purchase. Deterministic at reveal, like profit.
    guardrail: { label: "Purchases / 1,000 recipients", rateA: 0.06, rateB: 0.02, lowerWorse: true,
      note: "The clickbait opens came from curiosity, not buying intent — the gap between the promise and the content killed follow-through." },
    lesson: "The clickbait line genuinely wins the metric you tested — open rate — but drives far FEWER purchases. Open rate is a vanity metric. Pair every test metric with a guardrail (orders or revenue) that reflects real value.",
    concept: "Vanity metric vs guardrail metric",
    suggestN: 2500,
    mock: { kind: "subject" },
  },
];
const EXMAP = Object.fromEntries(EXPERIMENTS.map((e) => [e.id, e]));

/* ---- "Which Test Won?" round --------------------------------
   Real, documented e-commerce A/B tests. For an experienced
   audience, guessing the DIRECTION is easy — so each case now also
   asks for the EFFECT SIZE and the MECHANISM, and the student wagers
   confidence (calibration is scored, overconfidence punished). Some
   cases have no real winner, and some REVERSE by segment — so "B
   wins" is not always available as a safe default.
   `answer` ∈ a|b|none|depends. `mag` ∈ QMAG id. `mech` is a 4-option
   MCQ on the principle. `stack` is the CRO-Stack lens. */
const QDIR = [
  { id: "a", label: "A wins" }, { id: "b", label: "B wins" },
  { id: "none", label: "No real difference" }, { id: "depends", label: "It depends (reverses by segment)" },
];
const QMAG = [
  { id: "none", label: "≈ no real effect" }, { id: "small", label: "Small (<5%)" },
  { id: "moderate", label: "Moderate (5–20%)" }, { id: "large", label: "Large (>20%)" },
  { id: "reverses", label: "Reverses by segment" },
];
const QUIZ = [
  { id: "q1", title: "Guest checkout", question: "Force shoppers to create an account first, or let them check out as a guest?",
    a: "Create an account", b: "Continue as guest", answer: "b", mag: "large", mock: "guest",
    result: "Adding a guest-checkout option lifted completed orders ~20–45% — the famous “$300m button.”",
    mech: { options: ["Friction reduction — every forced step before the goal costs buyers", "Social proof — others reassure the hesitant", "Scarcity — fear of missing out", "Anchoring — the first number framing the rest"], correct: 0 },
    principle: "Friction reduction: every forced step before the goal quietly costs you buyers.", stack: "Psychology", term: "friction" },
  { id: "q2", title: "Form length", question: "An 11-field sign-up form, or a trimmed 4-field one?",
    a: "11 fields", b: "4 fields", answer: "b", mag: "large", mock: "fields",
    result: "Cutting the form to 4 fields raised completed sign-ups ~120% — a very large effect.",
    mech: { options: ["Reciprocity — give before you ask", "Cognitive load / friction — every extra field costs completion", "Authority — a trusted source persuades", "Decoy effect — a worse option flatters another"], correct: 1 },
    principle: "Cognitive load: every extra field is friction, and friction kills completion.", stack: "Psychology", term: "friction" },
  { id: "q3", title: "Money-back guarantee", question: "Show a 30-day money-back guarantee badge, or leave it off?",
    a: "No badge", b: "Guarantee badge", answer: "b", mag: "large", mock: "guarantee",
    result: "A visible 30-day money-back guarantee lifted conversions ~32%.",
    mech: { options: ["Scarcity — limited availability", "Hick's law — fewer choices", "Risk reversal — removing the fear of a bad outcome", "Social proof — popularity signals safety"], correct: 2 },
    principle: "Risk reversal: removing the fear of a bad outcome lowers the barrier to buy.", stack: "Psychology", term: "riskreversal" },
  { id: "q4", title: "Form layout", question: "Lay the checkout form out as one column, or two side-by-side columns?",
    a: "Single column", b: "Two columns", answer: "a", mag: "moderate", mock: "columns",
    result: "The single column won by a moderate margin — a clear top-to-bottom path is completed faster and with fewer errors.",
    mech: { options: ["Clear linear path — no ambiguity about what to fill next", "Loss aversion — fear of losing out", "Anchoring — first field sets expectations", "Social proof — others completed it"], correct: 0 },
    principle: "Cognitive ease: two columns create ambiguity about what to fill in next.", stack: "Psychology", term: "hickslaw" },
  { id: "q5", title: "Button microcopy", question: "Change the button label from ‘Add to cart’ to ‘Add to basket’ to match UK shoppers. What happens?",
    a: "“Add to cart”", b: "“Add to basket”", answer: "none", mag: "none", mock: "microcopy",
    result: "No reliable difference. A one-word label tweak on an already-clear CTA doesn't move behaviour — both are unambiguous. Most such “best-practice” micro-copy tweaks are noise you shouldn't spend traffic testing.",
    mech: { options: ["Von Restorff effect — the odd one out is remembered", "No real mechanism — a null result; most micro-tweaks do nothing", "Priming — ‘basket’ evokes shopping", "Anchoring — the label frames the price"], correct: 1 },
    principle: "Not every change matters. Micro-copy tweaks on a clear CTA usually return nothing — spend your traffic on changes big enough to move behaviour.", stack: "Testing", term: null },
  { id: "q6", title: "Mobile buy bar", question: "On mobile, keep a sticky ‘Add to cart’ bar fixed on screen, or let it scroll away?",
    a: "Scrolls with page", b: "Sticky bar", answer: "b", mag: "moderate", mock: "sticky",
    result: "The fixed buy bar lifted mobile add-to-cart by about 12% — a moderate effect.",
    mech: { options: ["Fitts's law — keep the action always in reach", "Reciprocity — a gift earns a purchase", "Scarcity — limited stock", "Authority — expert endorsement"], correct: 0 },
    principle: "Keep the action always within reach (Fitts's Law) — don't make users hunt for the button.", stack: "Testing", term: null },
  { id: "q7", title: "Autoplay video", question: "Autoplay a product video on the page, or show a static image?",
    a: "Static image", b: "Autoplay video", answer: "a", mag: "small", mock: "video",
    result: "Static won by a small margin. The video raised time-on-page — but lowered add-to-cart and hurt mobile users on slow connections.",
    mech: { options: ["Social proof — video shows others using it", "Engagement ≠ conversion — time-on-page is a vanity metric, and the video added friction", "Reciprocity — free content earns a sale", "Scarcity — the offer feels limited"], correct: 1 },
    principle: "Time-on-page is a vanity metric: what looks like ‘engagement’ can actually be friction.", stack: "Strategy", term: "vanity" },
  { id: "q8", title: "Exit-intent popup", question: "Fire a discount popup when a visitor moves to leave, judged on overall SALES?",
    a: "No popup", b: "Exit-intent popup", answer: "a", mag: "small", mock: "popup",
    result: "On sales, no-popup won (small margin). The popup captured more emails — a vanity win — but interrupted buyers and cut overall conversion.",
    mech: { options: ["Define the success metric first — winning emails while losing sales is a vanity win", "Scarcity — the discount is time-limited", "Reciprocity — the discount is a gift", "Social proof — others took the offer"], correct: 0 },
    principle: "Define your success metric first: winning email sign-ups while losing sales is a vanity win.", stack: "Strategy", term: "vanity" },
  { id: "q9", title: "Pricing tiers", question: "Show three pricing plans, or add a fourth, deliberately worse-value ‘decoy’ plan?",
    a: "Three plans", b: "Four plans (with a decoy)", answer: "b", mag: "moderate", mock: "decoy",
    result: "The decoy won by a moderate margin — a clearly worse option makes the plan beside it look like obvious value.",
    mech: { options: ["Decoy effect (asymmetric dominance) — we judge value by comparison", "Risk reversal — removing downside", "Fitts's law — reachable target", "Cognitive load — fewer options"], correct: 0 },
    principle: "The decoy effect (asymmetric dominance): we judge value by comparison, not in isolation.", stack: "Psychology", term: "decoy" },
  { id: "q10", title: "Coupon code field", question: "Show a visible “Got a promo code?” field at checkout across all your traffic — which wins?",
    a: "Hide the code field", b: "Show the code field", answer: "depends", mag: "reverses", mock: "coupon",
    result: "It reverses by traffic source. For deal/affiliate visitors who arrived with a code it helps; but for full-price organic buyers it sends them off-site hunting for a code they never had — and many don't come back. The blended average hides both effects.",
    mech: { options: ["Segmentation / Simpson's paradox — a winning aggregate can hide opposite segment effects", "Anchoring — the code frames the price", "Reciprocity — a discount is a gift", "Scarcity — limited-time code"], correct: 0 },
    principle: "Segment before you ship: an aggregate ‘tie’ can hide a big win in one segment (deal-seekers) and a real loss in another (full-price buyers).", stack: "Data", term: "simpson" },
  { id: "q11", title: "Recommendations", question: "Show a personalised ‘Recommended for you’ row, or a generic ‘Bestsellers’ row?",
    a: "Generic bestsellers", b: "Personalised picks", answer: "b", mag: "moderate", mock: "personalise",
    result: "Personalised recommendations lifted click-through and revenue by a moderate margin (the Amazon playbook).",
    mech: { options: ["Relevance — a tailored set feels made-for-me and cuts search effort", "Scarcity — limited picks", "Authority — an expert chose them", "Loss aversion — fear of missing out"], correct: 0 },
    principle: "Relevance: a tailored set feels made-for-me and cuts the effort of finding something to buy.", stack: "Psychology", term: null },
];

/* The CRO Stack (lecture slide 20 / quiz slide 53): the spine the
   whole lab is built on. Every experiment exercises all four layers. */
const CRO_STACK = [
  { k: "Data", d: "Find the problem — analytics, recordings, surveys, funnel reports." },
  { k: "Strategy", d: "Prioritise — you can't test everything (ICE / PIE / PXL)." },
  { k: "Psychology", d: "Generate solutions — Cialdini's principles & cognitive biases." },
  { k: "Testing", d: "Validate — an A/B test turns opinion into evidence." },
];

// Aggregate true rate from segments (traffic-weighted).
function aggregateTruth(segments) {
  const pA = segments.reduce((a, s) => a + s.share * s.pA, 0);
  const pB = segments.reduce((a, s) => a + s.share * s.pB, 0);
  return { pA, pB };
}

// Resolve an experiment's hidden truth under instructor config:
// effectMult scales the B-vs-A gap (1 = as designed, 0 = pure noise),
// applied to the aggregate and to every segment.
function effExperiment(exp, cfg = {}) {
  const m = cfg.effectMult == null ? 1 : cfg.effectMult;
  if (exp.segments) {
    const segments = exp.segments.map((s) => ({ ...s, pB: clamp(s.pA + (s.pB - s.pA) * m, 0, 1) }));
    return { ...exp, segments, truth: aggregateTruth(segments) };
  }
  const truth = { pA: exp.truth.pA, pB: clamp(exp.truth.pA + (exp.truth.pB - exp.truth.pA) * m, 0, 1) };
  return { ...exp, truth };
}

/* ---- THE EXPERIMENT RUN (seeded, pure) ----------------------
   nPerArm visitors per arm, each converting via an independent
   seeded Bernoulli draw at that arm's (possibly per-segment) true
   rate. Recomputes the verdict at `checkpoints` points along the
   way so the live chart can show the p-value crossing — and
   re-crossing — the α line. */
function runTest(exp, { nPerArm, alpha = 0.05, seed = "LAB-2026", checkpoints = 60 } = {}) {
  const e = exp.truth ? exp : effExperiment(exp, {});
  const segs = e.segments || null;
  const rngA = makeRng(seed + ":A");
  const rngB = makeRng(seed + ":B");
  const rngSegA = segs ? makeRng(seed + ":segA") : null;
  const rngSegB = segs ? makeRng(seed + ":segB") : null;

  const pickSeg = (rngVal) => {
    let acc = 0;
    for (const s of segs) { acc += s.share; if (rngVal <= acc) return s; }
    return segs[segs.length - 1];
  };
  const segStat = segs ? segs.map((s) => ({ id: s.id, name: s.name, nA: 0, cA: 0, nB: 0, cB: 0 })) : null;
  const segIdx = segs ? Object.fromEntries(segs.map((s, i) => [s.id, i])) : null;

  const series = [];
  let cA = 0, cB = 0;
  const cpEvery = Math.max(1, Math.floor(nPerArm / checkpoints));
  let firstSignificantN = null;

  for (let i = 1; i <= nPerArm; i++) {
    // arm A visitor
    const sA = segs ? pickSeg(rngSegA()) : null;
    const rateA = sA ? sA.pA : e.truth.pA;
    const convA = rngA() < rateA;
    if (convA) cA++;
    if (sA) { const st = segStat[segIdx[sA.id]]; st.nA++; if (convA) st.cA++; }
    // arm B visitor
    const sB = segs ? pickSeg(rngSegB()) : null;
    const rateB = sB ? sB.pB : e.truth.pB;
    const convB = rngB() < rateB;
    if (convB) cB++;
    if (sB) { const st = segStat[segIdx[sB.id]]; st.nB++; if (convB) st.cB++; }

    if (i % cpEvery === 0 || i === nPerArm) {
      const t = twoPropTest(i, cA, i, cB, alpha);
      series.push({ n: i, rA: t.rA, rB: t.rB, diff: t.diff, z: t.z, pValue: t.pValue, ciLow: t.ciLow, ciHigh: t.ciHigh, significant: t.significant });
      if (firstSignificantN == null && t.significant) firstSignificantN = i;
    }
  }

  const final = twoPropTest(nPerArm, cA, nPerArm, cB, alpha);
  const segResults = segStat ? segStat.map((s) => ({ ...s, ...twoPropTest(s.nA, s.cA, s.nB, s.cB, alpha) })) : null;
  return {
    arms: { A: { n: nPerArm, conv: cA, rate: final.rA }, B: { n: nPerArm, conv: cB, rate: final.rB } },
    ...final, series, firstSignificantN, segments: segResults, truth: e.truth,
  };
}

// Stat at the visitor count where the student actually called the
// test (peeking stops early; otherwise the planned full run).
function statAt(result, decisionN) {
  if (!result.series.length) return result;
  let best = result.series[0];
  for (const cp of result.series) { if (cp.n <= decisionN) best = cp; }
  return best;
}

/* ---- business impact (case 5) ------------------------------- */
// Profit per 1,000 visitors for each arm: only the free-shipping
// arm pays carriage. Lets the verdict expose "won the test, lost
// money".
function profitPerThousand(exp, rate, arm) {
  if (!exp.profit) return null;
  const { marginA, shippingCostB } = exp.profit;
  const perOrder = arm === "B" ? marginA - shippingCostB : marginA;
  return rate * 1000 * perOrder;
}

// Secondary "guardrail" metric (case 8): of the visitors who converted on the
// tested metric (e.g. clicked), how many reach the real goal per 1,000.
function guardrailPerThousand(exp, rate, arm) {
  if (!exp.guardrail) return null;
  const g = arm === "B" ? exp.guardrail.rateB : exp.guardrail.rateA;
  return rate * g * 1000;
}

/* ---- prediction scoring ------------------------------------- */
const BANDS = [
  { id: "a", label: "A wins", lo: -1, hi: -0.002 },
  { id: "none", label: "No real difference", lo: -0.002, hi: 0.002 },
  { id: "bsmall", label: "B wins — small (≤+1pp)", lo: 0.002, hi: 0.01 },
  { id: "bmod", label: "B wins — moderate (+1–3pp)", lo: 0.01, hi: 0.03 },
  { id: "blarge", label: "B wins — large (>+3pp)", lo: 0.03, hi: 1 },
];
function trueBand(diff) {
  return BANDS.find((b) => diff > b.lo && diff <= b.hi) || BANDS[BANDS.length - 1];
}
// Was the student's CALL the honest one given BOTH the truth and
// what their run could actually show?
function callCorrect(call, result, truthDiff) {
  const trulyNull = Math.abs(truthDiff) <= 0.002;
  if (result.significant) {
    const winner = result.diff > 0 ? "b" : "a";
    return call === winner; // a significant result licenses naming the observed winner
  }
  // not significant: the honest calls are "need more data", or "no
  // difference" when there genuinely is none
  if (call === "more") return true;
  if (call === "none" && trulyNull) return true;
  return false;
}

const GLOSSARY = {
  abtest: "A controlled experiment: split traffic between a control (A) and a variant (B), measure each one's conversion, and test whether the difference is real or just noise.",
  conversion: "The share of visitors who complete the goal action (here, a purchase). Conversion rate = conversions ÷ visitors.",
  cro: "Conversion rate optimisation (CRO) — improving the share of visitors who take a wanted action (like buying), by testing changes rather than guessing.",
  pp: "Percentage points — the plain difference between two percentages. Going from 4% to 6% is 2 percentage points (2pp), even though it is a 50% relative rise. Writing 'pp' keeps the two ideas separate.",
  significance: "Whether an observed difference is large enough, given the sample size, to be unlikely from chance alone. Judged against α (usually 0.05).",
  pvalue: "The probability of seeing a difference at least this large if the variant truly had NO effect. Small p (< α) = unlikely to be chance. It is NOT the probability that B is better.",
  alpha: "The significance threshold and your accepted false-positive rate. α = 0.05 means a 5% chance of wrongly declaring a winner when there is really no difference.",
  ci: "Confidence interval — a likely range for the true difference. If this range includes zero, you cannot rule out ‘no effect’.",
  zscore: "How many standard errors the observed difference sits from zero. Bigger |z| ⇒ smaller p-value.",
  power: "The chance your test detects a real effect of a given size. Convention is 80%. Low power ⇒ you miss true wins (a Type II error).",
  samplesize: "How many visitors per arm you need to reliably detect an effect of a given size. Smaller true effects need much larger samples.",
  mde: "Minimum detectable effect — the smallest lift you care about catching. You size the test around it before running.",
  typeI: "A false positive: declaring a winner when there is no real difference. Its rate is α.",
  typeII: "A false negative: missing a real effect because the test was underpowered.",
  peeking: "Repeatedly checking significance and stopping as soon as p<0.05. Each extra check is another chance to see a false positive by luck, so it pushes the false-positive rate far above α.",
  simpson: "Simpson's paradox — a trend in the combined data that reverses or vanishes once you split it by segment (e.g. device).",
  scarcity: "Cialdini's scarcity principle — limited availability makes things feel more desirable. Persuasive in theory; its real conversion lift is often tiny.",
  socialproof: "Cialdini's social-proof principle — people copy others' choices, so ‘others bought this’ can reassure hesitant buyers.",
  segment: "Splitting results by a meaningful group (device, new vs returning, country). An aggregate win can hide a segment you're harming — always cut the data.",
  vanity: "A metric that looks impressive but doesn't reflect real value (e.g. clicks or CTR). Optimising it can hurt the business — pair it with a guardrail metric.",
  guardrail: "A secondary metric that protects against winning the test but losing the business — e.g. qualified leads or revenue, watched alongside the metric you're optimising.",
  anchoring: "We lean too heavily on the first number we see. Showing the most expensive option first ‘anchors’ everything that follows.",
  charmpricing: "Charm pricing / the left-digit effect: £19.99 feels much cheaper than £20, and a clean £29 reads as more fluent (and so better value) than £29.00.",
  fpattern: "Users scan pages in an F-shaped pattern before they consciously read. Layouts that fight this instinctive path add cognitive load.",
  vonrestorff: "The isolation effect: a visually distinctive item is noticed and acted on. A button wins by contrast with its surroundings, not by its colour itself.",
  paradox: "The paradox of choice: more options mean more cognitive load and decision paralysis. Fewer, clearer choices often convert better.",
  hickslaw: "Hick's Law — the time to decide grows with the number of options. More choices = slower (or abandoned) decisions.",
  peakend: "The peak-end rule (Kahneman): people judge an experience by its most intense moment and its ending. Align the emotional peak with the conversion moment.",
  ambiguity: "Ambiguity aversion (the Ellsberg paradox): people prefer known outcomes to uncertain ones. A specific, low-commitment CTA beats a vague one.",
  variablereward: "Variable-ratio reinforcement (Skinner): uncertain rewards (a ‘spin to win’) trigger anticipation and drive engagement — the same hook as slot machines.",
  friction: "Anything that slows or complicates the path to the goal — extra steps, fields, or choices. Removing friction is one of the most reliable ways to lift conversion.",
  riskreversal: "Removing the buyer's perceived risk — money-back guarantees, free returns, free trials — so the decision feels safe to make.",
  decoy: "The decoy effect (asymmetric dominance): adding a clearly worse option makes a nearby option look like obvious value, nudging the choice toward it.",
  crostack: "Data → Strategy → Psychology → Testing. Find the problem, prioritise it, design a solution from psychology, then prove it with a test.",
};

/* ---- export (assessable artifact) --------------------------- */
function buildCSV(records, cfg) {
  const head = ["experiment", "concept", "predicted_winner", "predicted_band", "band_correct",
    "planned_n_per_arm", "actual_n_per_arm", "obs_rate_A", "obs_rate_B", "obs_diff_pp",
    "ci_low_pp", "ci_high_pp", "p_value", "significant", "call", "call_correct",
    "true_diff_pp", "business_note"];
  const rows = records.map((r) => [
    JSON.stringify(r.title), JSON.stringify(r.concept), r.predictedWinner, JSON.stringify(r.predictedBand), r.bandCorrect,
    r.plannedN, r.actualN, (r.obsRateA * 100).toFixed(2), (r.obsRateB * 100).toFixed(2), (r.obsDiff * 100).toFixed(2),
    (r.ciLow * 100).toFixed(2), (r.ciHigh * 100).toFixed(2), r.pValue.toFixed(4), r.significant, r.call, r.callCorrect,
    (r.trueDiff * 100).toFixed(2), JSON.stringify(r.businessNote || ""),
  ]);
  return [head.join(","), ...rows.map((row) => row.join(","))].join("\n") + `\n# seed,${cfg.seed},alpha,${cfg.alpha},power,${cfg.power}`;
}
function buildMarkdown(records, cfg) {
  const bandHits = records.filter((r) => r.bandCorrect).length;
  const callHits = records.filter((r) => r.callCorrect).length;
  let md = `# Conversion Lab — Experiment Log (Chrichton)\n\n`;
  md += `**Seed:** \`${cfg.seed}\`  ·  **α:** ${cfg.alpha}  ·  **Power target:** ${Math.round(cfg.power * 100)}%\n\n`;
  md += `**Calibration:** effect-size band ${bandHits}/${records.length} correct  ·  final call ${callHits}/${records.length} correct.\n\n`;
  md += `| # | Experiment | Concept | Predicted | Planned n | Actual n | Obs diff | 95% CI | p | Sig? | Call | ✓ |\n`;
  md += `|---|------------|---------|-----------|-----------|----------|----------|--------|---|------|------|---|\n`;
  records.forEach((r, i) => {
    md += `| ${i + 1} | ${r.title} | ${r.concept} | ${r.predictedBand} | ${r.plannedN} | ${r.actualN} | ${pp(r.obsDiff)} | [${pp(r.ciLow)}, ${pp(r.ciHigh)}] | ${r.pValue.toFixed(3)} | ${r.significant ? "yes" : "no"} | ${r.call} | ${r.callCorrect ? "✓" : "✗"} |\n`;
  });
  md += `\n## Reflection prompts\n\n`;
  md += `1. Where did your intuition disagree with the data, and which bias was at work (scarcity? social proof? a lifestyle photo that just *felt* better)?\n`;
  md += `2. Which experiments were underpowered? Using the planner, what sample size would you have needed to detect the true effect at 80% power?\n`;
  md += `3. For the free-shipping test, did the ‘winning’ variant actually make Chrichton money once the shipping cost is counted?\n`;
  md += `4. For the checkout test, what did the segmented (mobile vs desktop) result reveal that the aggregate hid — and what would you ship?\n`;
  return md;
}
function downloadFile(filename, text, mime) {
  try {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  } catch (e) { console.error("download failed", e); }
}

const DEFAULT_CFG = {
  seed: "LAB-2026", alpha: 0.05, power: 0.8,
  maxVisitors: 20000, effectMult: 1, peeking: false, revealTruth: false,
};

export {
  clamp, gbp, pct, pp, mulberry32, makeRng, erf, normalCdf, normalQuantile,
  twoPropTest, requiredSampleSize, EXPERIMENTS, EXMAP, aggregateTruth, effExperiment,
  runTest, statAt, profitPerThousand, guardrailPerThousand, BANDS, trueBand, callCorrect, GLOSSARY,
  QUIZ, QDIR, QMAG, CRO_STACK, buildCSV, buildMarkdown, downloadFile, DEFAULT_CFG,
};
