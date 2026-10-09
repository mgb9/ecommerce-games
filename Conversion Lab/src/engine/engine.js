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

// Power of a two-sided test of pA vs pB with n visitors per arm — the
// chance a run of this size reaches significance when the effect is real.
function powerAt(pA, pB, n, alpha = 0.05) {
  const d = Math.abs(pB - pA);
  if (!(n > 0) || d === 0) return alpha;
  const se = Math.sqrt(pA * (1 - pA) / n + pB * (1 - pB) / n);
  const z = normalQuantile(1 - alpha / 2);
  return normalCdf(d / se - z) + normalCdf(-d / se - z);
}

/* ---- how the lessons talk about a result ---------------------
   Every lesson is written from the truth in force (the instructor's
   effect multiplier can change it) and from the run the student saw,
   so its claims hold for every seed and setting. */
const NULL_ZONE = 0.002;   // a true difference within ±0.2pp counts as "no real effect"
const truthWinner = (d) => (d > NULL_ZONE ? "b" : d < -NULL_ZONE ? "a" : "none");
const fmtN = (n) => Math.round(n).toLocaleString("en-GB");
const aboutN = (n) => fmtN(n >= 10000 ? Math.round(n / 1000) * 1000 : Math.round(n / 100) * 100);
const pctN = (p) => `${Math.round(p * 100)}%`;
const pText = (p) => (p < 0.001 ? "< 0.001" : p.toFixed(3));
const pEq = (p) => (p < 0.001 ? "p < 0.001" : `p = ${p.toFixed(3)}`);
const ciLevel = (alpha) => `${+((1 - alpha) * 100).toFixed(1)}%`;
function sizeWord(d) {
  const b = trueBand(Math.abs(d));
  return b.id === "bsmall" ? "small" : b.id === "bmod" ? "moderate" : "large";
}
// "a real, moderate effect (+1.2pp: 4.0% → 5.2%, about 30% relative)"
function effectPhrase(d, pA) {
  if (Math.abs(d) <= NULL_ZONE) return "no real effect";
  return `a real, ${sizeWord(d)} ${d > 0 ? "lift" : "fall"} (${pp(d, 1)}: ${pct(pA)} → ${pct(pA + d)}, about ${Math.round((Math.abs(d) / pA) * 100)}% relative)`;
}
// What a run of this size could and did show, against the truth.
function runSentence(c, metric = "conversion") {
  const { s, n, plannedN, stoppedEarly } = c.run;
  const w = truthWinner(c.d);
  const obs = s.diff > 0 ? "b" : "a";
  const at = `${fmtN(n)} per arm`;
  const early = stoppedEarly ? ` You stopped at ${at}, before the ${fmtN(plannedN)} you planned.` : "";
  if (s.significant) {
    if (w === "none") return `Your run came out significant (${pEq(s.pValue)}) although there is no real effect: a false positive.${early}`;
    if (obs === w) return `Your run detected it at ${at} (${pEq(s.pValue)}), observing ${pp(s.diff)} against a true ${pp(c.d)}.${early}`;
    return `Your run came out significant in the wrong direction (${pEq(s.pValue)}) — rare, but chance allows it.${early}`;
  }
  if (w === "none") return `Your run found no significant difference in ${metric} at ${at} (${pEq(s.pValue)}).${early}`;
  return `At ${at} your run had about ${pctN(powerAt(c.pA, c.pB, n, c.alpha))} power for this effect and did not reach significance (${pEq(s.pValue)}): the effect is real; the test was too small to confirm it.${early}`;
}
const noEffect = (what) => `With the current settings ${what} has no real effect — any “winner” is chance.`;
const needSentence = (c) => `Detecting it at ${pctN(c.power)} power needs about ${aboutN(c.need)} visitors per arm${c.need > c.maxN ? ` — more than the ${fmtN(c.maxN)} this lab allows` : ""}.`;
const segRun = (result) => result.segments.map((sg) => `${sg.name} ${pp(sg.diff, 1)} (${pEq(sg.pValue)})`).join("; ");

/* ---- experiments: a graded arc of Chrichton CRO cases -------
   Each hides a "true" effect chosen to teach one thing. `mock`
   describes the rendered variant pages for the UI to draw. Rates
   are real conversion proportions; the difference is what the test
   has to recover from noise. Segmented cases carry per-segment
   truths whose aggregate is computed in effExperiment(). `lesson(c)`
   takes lessonContext(): `general` holds for the truth in force,
   `run` describes the student's own run (null before a run).
   suggestN is sized so the planned run has about 80% power for the
   designed effect (except where the lesson is that it can't). */
const EXPERIMENTS = [
  {
    id: "cta", n: 1, title: "The “Add to cart” button",
    principle: "Visual hierarchy / contrast",
    context: "Chrichton's product pages use a muted grey ‘Add to cart’ button. The design team want to trial a high-contrast green one.",
    baselineRate: 0.040,
    control: { label: "Muted grey button", note: "Current Chrichton page." },
    variant: { label: "High-contrast green button", rationale: "A clearer visual call-to-action should pull more clicks straight into the cart." },
    truth: { pA: 0.040, pB: 0.052 },
    lesson: (c) => ({
      general: Math.abs(c.d) <= NULL_ZONE ? noEffect("the green button")
        : `The green button has ${effectPhrase(c.d, c.pA)}. ${needSentence(c)} Plan that many and the test usually finds it; plan fewer and a real win often stays “not significant” — a failure of the plan, not of the design.`,
      run: c.run && runSentence(c),
    }),
    concept: "A real effect, properly powered", term: "power",
    suggestN: 5000,
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
    lesson: (c) => ({
      general: `There is no real effect: the two backgrounds convert identically. At α = ${c.alpha}, about ${pctN(c.alpha)} of tests like this still come out “significant” by chance — the false-positive rate you chose. Checking again and again, and stopping at the first p < α, pushes it far higher.`,
      run: c.run && (c.run.s.significant
        ? `Your run came out significant (${pEq(c.run.s.pValue)}): this is that false positive. Shipping the “winner” would change nothing.`
        : `Your run found nothing (${pEq(c.run.s.pValue)}) — correctly. “No real difference” is a fair reading only when the confidence interval is narrow enough to rule out effects you would care about; otherwise the call is “need more data”.`),
    }),
    concept: "Type I error (false positive)", term: "typeI", replicate: true,
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
    lesson: (c) => ({
      general: Math.abs(c.d) <= NULL_ZONE ? noEffect("the badge")
        : `The badge has ${effectPhrase(c.d, c.pA)}. ${needSentence(c)} Intuition overrates scarcity: at realistic traffic a change this small can't be confirmed, so the honest calls are “need more data” — or that it isn't worth a test.`,
      run: c.run && runSentence(c),
    }),
    concept: "Statistical power & sample size", term: "typeII",
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
    lesson: (c) => ({
      general: (Math.abs(c.d) <= NULL_ZONE ? `${noEffect("the counter")} ` : `The counter has ${effectPhrase(c.d, c.pA)}. ${needSentence(c)} `)
        + `Stopping at the first p < α does two kinds of damage. With no real effect it manufactures false positives (Experiment 2). With a real one, the runs that cross the line early are the ones where chance inflated the lift — so an early stop overstates the effect.`,
      run: c.run && (() => {
        const { result, n } = c.run;
        const first = result.firstSignificantN;
        const early = first != null && first < n
          ? ` It first read p < α at ${fmtN(first)} per arm, when it showed ${pp(result.series.find((cp) => cp.n === first).diff)}; by ${fmtN(n)} it showed ${pp(c.run.s.diff)}.`
          : ` It never read p < α before ${fmtN(n)} per arm.`;
        return runSentence(c) + early;
      })(),
    }),
    concept: "Optional stopping: early wins are exaggerated", term: "peeking", replicate: true,
    suggestN: 12000,
    mock: { kind: "social" },
  },
  {
    id: "shipping", n: 5, title: "Free-shipping banner",
    principle: "Cost framing",
    context: "Run a site-wide ‘Free shipping on all orders’ banner. The team expect it to lift conversion — but Chrichton pays the £3.50 shipping cost on every order.",
    baselineRate: 0.045,
    control: { label: "Standard shipping", note: "Customer pays for shipping." },
    variant: { label: "Free shipping banner", rationale: "Removing shipping friction is one of the most reliable conversion lifts there is." },
    truth: { pA: 0.045, pB: 0.058 },
    // contribution per converting order (after item cost), before carriage
    profit: { marginA: 9.0, shippingCostB: 3.5 },
    lesson: (c) => {
      const pa = profitPerThousand(c.exp, c.pA, "A"), pb = profitPerThousand(c.exp, c.pB, "B");
      return {
        general: `${Math.abs(c.d) <= NULL_ZONE ? noEffect("the banner") : `The banner has ${effectPhrase(c.d, c.pA)}.`} But Chrichton pays £3.50 carriage on every order in B: at the true rates B earns ${gbp(pb)} per 1,000 visitors against A's ${gbp(pa)}${pb < pa ? " — it can win the test and still lose money" : ""}. Judge a result by what it earns, not by conversion alone.`,
        run: c.run && `${runSentence(c)} In your run: A ${gbp(profitPerThousand(c.exp, c.run.s.rA, "A"))} and B ${gbp(profitPerThousand(c.exp, c.run.s.rB, "B"))} per 1,000 visitors.`,
      };
    },
    concept: "Significance ≠ business value", term: "significance",
    suggestN: 4500,
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
    lesson: (c) => {
      const [mob, desk] = c.exp.segments;
      const dm = mob.pB - mob.pA, dd = desk.pB - desk.pA;
      const opposite = truthWinner(dm) !== "none" && truthWinner(dd) !== "none" && Math.sign(dm) !== Math.sign(dd);
      return {
        general: !opposite
          ? (Math.abs(dm) <= NULL_ZONE && Math.abs(dd) <= NULL_ZONE ? noEffect("one-page checkout") : `One-page checkout moves mobile by ${pp(dm, 1)} and desktop by ${pp(dd, 1)} (${pp(c.d)} overall). Cut the result by segment before you ship.`)
          : `One-page checkout is ${effectPhrase(dm, mob.pA)} on mobile and ${effectPhrase(dd, desk.pA)} on desktop. Together they nearly cancel (${pp(c.d)} overall), so the total looks like a tie. This is not Simpson's paradox — there, every segment moves one way and the total the other because the mix of segments differs. Here the segments genuinely respond differently (a heterogeneous treatment effect). Cut the result by segment before you ship: here, ship it to ${dm > 0 ? "mobile" : "desktop"} only.`,
        run: c.run && `In your run: ${segRun(c.run.result)}; overall ${pp(c.run.s.diff, 1)} (${pEq(c.run.s.pValue)}).`,
      };
    },
    concept: "Segment effects that cancel out", term: "hte",
    suggestN: 5000,
    mock: { kind: "checkout" },
  },
  {
    id: "promo", n: 7, title: "Homepage focus — promotions vs brand",
    principle: "Relevance by audience",
    context: "Chrichton's homepage could lead with loud seasonal PROMOTIONS, or with its curated BRAND story. New and returning visitors don't come for the same thing.",
    baselineRate: 0.0505,
    control: { label: "Brand-led homepage", note: "Curated story, no sale banner." },
    variant: { label: "Promotion-led homepage", rationale: "Loud deals grab attention and should lift conversion across the board." },
    segments: [
      { id: "new", name: "New visitors", share: 0.70, pA: 0.040, pB: 0.062 },
      { id: "returning", name: "Returning customers", share: 0.30, pA: 0.075, pB: 0.057 },
    ],
    lesson: (c) => {
      const [nw, ret] = c.exp.segments;
      const dn = nw.pB - nw.pA, dr = ret.pB - ret.pA;
      const story = c.d > NULL_ZONE && dn > NULL_ZONE && dr < -NULL_ZONE;
      return {
        general: story
          ? `The promotion-led homepage wins overall (${pp(c.d)}), driven by new visitors (${pp(dn, 1)}), but it cuts conversion for returning customers (${pp(dr, 1)}) — the people who came for the brand. A winning total can still harm a valuable segment: segment before you roll out, and weigh what each segment is worth.`
          : Math.abs(c.d) <= NULL_ZONE && Math.abs(dn) <= NULL_ZONE && Math.abs(dr) <= NULL_ZONE ? noEffect("the promotion-led homepage")
          : `The promotion-led homepage moves new visitors by ${pp(dn, 1)} and returning customers by ${pp(dr, 1)} (${pp(c.d)} overall). Segment before you roll out.`,
        run: c.run && (() => {
          const r = c.run.result.segments.find((sg) => sg.id === "returning");
          return `In your run: overall ${pp(c.run.s.diff)} (${pEq(c.run.s.pValue)}); ${segRun(c.run.result)}.${dr < -NULL_ZONE && !(r.significant && r.diff < 0) ? " The returning-customer loss didn't reach significance here: the segment is smaller, so confirming it takes more traffic." : ""}`;
        })(),
      };
    },
    concept: "A winning test that hurts a segment", term: "segment",
    suggestN: 12000,
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
    // secondary "guardrail" metric: of those who opened, the fraction that went
    // on to buy — simulated per recipient on its own seeded stream in runTest.
    guardrail: { label: "Purchases / 1,000 recipients", rateA: 0.06, rateB: 0.02, lowerWorse: true,
      note: "The clickbait opens came from curiosity, not buying intent — the gap between the promise and the content killed follow-through." },
    lesson: (c) => {
      const ga = guardrailPerThousand(c.exp, c.pA, "A"), gb = guardrailPerThousand(c.exp, c.pB, "B");
      return {
        general: `${Math.abs(c.d) <= NULL_ZONE ? noEffect("the clickbait line") : `The clickbait line has ${effectPhrase(c.d, c.pA)} on opens.`} But curiosity isn't buying intent: at the true rates it brings ${gb.toFixed(1)} purchases per 1,000 recipients against ${ga.toFixed(1)} for the clear line. Open rate is a vanity metric here — pair every test metric with a guardrail (orders or revenue) that reflects real value.`,
        run: c.run && (() => {
          const g = guardrailAt(c.run.s);
          return `${runSentence(c, "open rate")} On the guardrail your run saw ${(g.rA * 1000).toFixed(1)} purchases per 1,000 recipients from A and ${(g.rB * 1000).toFixed(1)} from B (${pEq(g.pValue)}).`;
        })(),
      };
    },
    concept: "Vanity metric vs guardrail metric", term: "guardrail",
    suggestN: 5000,   // sized for the guardrail (purchases are rare: ~97% power), not just the open rate
    mock: { kind: "subject" },
  },
];
const EXMAP = Object.fromEntries(EXPERIMENTS.map((e) => [e.id, e]));

/* ---- "Which Test Won?" round --------------------------------
   Realistic scenarios, written to reflect typical published findings
   — not reports of particular tests, so the results give a direction
   and a size band, never a precise figure. They deliberately don't
   reuse the in-class quiz's tests (no spoilers). For an experienced
   audience, guessing the DIRECTION is easy — so each case also asks
   for the EFFECT SIZE (as a relative lift) and the MECHANISM, and the
   student wagers confidence (overconfidence is punished). Some cases
   have no real winner, and one reverses by segment — so "B wins" is
   not a safe default.
   `answer` ∈ a|b|none|depends. `mag` ∈ QMAG id. `mech` is a 4-option
   MCQ on the principle. `stack` is the CRO-Stack lens. */
const QDIR = [
  { id: "a", label: "A wins" }, { id: "b", label: "B wins" },
  { id: "none", label: "No real difference" }, { id: "depends", label: "It depends (reverses by segment)" },
];
const QMAG = [
  { id: "none", label: "≈ no real effect" }, { id: "small", label: "Small (under 5% relative)" },
  { id: "moderate", label: "Moderate (5–20% relative)" }, { id: "large", label: "Large (over 20% relative)" },
  { id: "reverses", label: "Reverses by segment" },
];
const QUIZ = [
  { id: "q1", title: "Guest checkout", question: "Force shoppers to create an account first, or let them check out as a guest?",
    a: "Create an account", b: "Continue as guest", answer: "b", mag: "large", mock: "guest",
    result: "Guest checkout won by a large margin. Being made to register before paying is one of the reasons shoppers most often give for abandoning a checkout.",
    mech: { options: ["Friction reduction — every forced step before the goal costs buyers", "Social proof — others reassure the hesitant", "Scarcity — fear of missing out", "Anchoring — the first number framing the rest"], correct: 0 },
    principle: "Friction reduction: every forced step before the goal quietly costs you buyers.", stack: "Psychology", term: "friction" },
  { id: "q2", title: "Form length", question: "An 11-field sign-up form, or a trimmed 4-field one?",
    a: "11 fields", b: "4 fields", answer: "b", mag: "large", mock: "fields",
    result: "The 4-field form won by a large margin: far more people finished it.",
    mech: { options: ["Reciprocity — give before you ask", "Cognitive load / friction — every extra field costs completion", "Authority — a trusted source persuades", "Decoy effect — a worse option flatters another"], correct: 1 },
    principle: "Cognitive load: every extra field is friction, and friction kills completion.", stack: "Psychology", term: "friction" },
  { id: "q3", title: "Money-back guarantee", question: "Show a 30-day money-back guarantee badge, or leave it off?",
    a: "No badge", b: "Guarantee badge", answer: "b", mag: "large", mock: "guarantee",
    result: "The guarantee badge won by a large margin, on a site where first-time buyers were unsure about ordering.",
    mech: { options: ["Scarcity — limited availability", "Hick's law — fewer choices", "Risk reversal — removing the fear of a bad outcome", "Social proof — popularity signals safety"], correct: 2 },
    principle: "Risk reversal: removing the fear of a bad outcome lowers the barrier to buy.", stack: "Psychology", term: "riskreversal" },
  { id: "q4", title: "Form layout", question: "Lay the checkout form out as one column, or two side-by-side columns?",
    a: "Single column", b: "Two columns", answer: "a", mag: "moderate", mock: "columns",
    result: "The single column won by a moderate margin — a clear top-to-bottom path is completed faster and with fewer errors.",
    mech: { options: ["Clear linear path — no ambiguity about what to fill next", "Loss aversion — fear of losing out", "Anchoring — first field sets expectations", "Social proof — others completed it"], correct: 0 },
    principle: "Cognitive ease: two columns create ambiguity about what to fill in next.", stack: "Psychology", term: "friction" },
  { id: "q5", title: "Button microcopy", question: "Change the button label from ‘Add to cart’ to ‘Add to basket’ to match UK shoppers. What happens?",
    a: "“Add to cart”", b: "“Add to basket”", answer: "none", mag: "none", mock: "microcopy",
    result: "No reliable difference. A one-word label tweak on an already-clear CTA doesn't move behaviour — both are unambiguous. Most such “best-practice” micro-copy tweaks are noise you shouldn't spend traffic testing.",
    mech: { options: ["Von Restorff effect — the odd one out is remembered", "No real mechanism — a null result; most micro-tweaks do nothing", "Priming — ‘basket’ evokes shopping", "Anchoring — the label frames the price"], correct: 1 },
    principle: "Not every change matters. Micro-copy tweaks on a clear CTA usually return nothing — spend your traffic on changes big enough to move behaviour.", stack: "Testing", term: null },
  { id: "q6", title: "Mobile buy bar", question: "On mobile, keep a sticky ‘Add to cart’ bar fixed on screen, or let it scroll away?",
    a: "Scrolls with page", b: "Sticky bar", answer: "b", mag: "moderate", mock: "sticky",
    result: "The fixed buy bar lifted mobile add-to-cart by a moderate margin.",
    mech: { options: ["Fitts's law — keep the action always in reach", "Reciprocity — a gift earns a purchase", "Scarcity — limited stock", "Authority — expert endorsement"], correct: 0 },
    principle: "Keep the action always within reach (Fitts's Law) — don't make users hunt for the button.", stack: "Testing", term: null },
  { id: "q7", title: "Autoplay video", question: "Autoplay a product video on the page, or show a static image?",
    a: "Static image", b: "Autoplay video", answer: "a", mag: "small", mock: "video",
    result: "Static won by a small margin. The video raised time-on-page — but lowered add-to-cart and hurt mobile users on slow connections.",
    mech: { options: ["Social proof — video shows others using it", "Engagement ≠ conversion — time-on-page is a vanity metric, and the video added friction", "Reciprocity — free content earns a sale", "Scarcity — the offer feels limited"], correct: 1 },
    principle: "Time-on-page is a vanity metric: what looks like ‘engagement’ can actually be friction.", stack: "Strategy", term: "vanity" },
  { id: "q8", title: "Exit-intent popup", question: "Fire a discount popup when a visitor moves to leave, judged on overall SALES?",
    a: "No popup", b: "Exit-intent popup", answer: "a", mag: "small", mock: "popup",
    result: "On sales, no-popup won by a small margin. The popup captured more emails — a vanity win — but interrupted buyers and cut overall conversion.",
    mech: { options: ["Define the success metric first — winning emails while losing sales is a vanity win", "Scarcity — the discount is time-limited", "Reciprocity — the discount is a gift", "Social proof — others took the offer"], correct: 0 },
    principle: "Define your success metric first: winning email sign-ups while losing sales is a vanity win.", stack: "Strategy", term: "vanity" },
  { id: "q9", title: "Pricing tiers", question: "Show three pricing plans, or add a fourth, deliberately worse-value ‘decoy’ plan?",
    a: "Three plans", b: "Four plans (with a decoy)", answer: "b", mag: "moderate", mock: "decoy",
    result: "The decoy won by a moderate margin — a clearly worse option makes the plan beside it look like obvious value.",
    mech: { options: ["Decoy effect (asymmetric dominance) — we judge value by comparison", "Risk reversal — removing downside", "Fitts's law — reachable target", "Cognitive load — fewer options"], correct: 0 },
    principle: "The decoy effect (asymmetric dominance): we judge value by comparison, not in isolation.", stack: "Psychology", term: "decoy" },
  { id: "q10", title: "Coupon code field", question: "Show a visible “Got a promo code?” field at checkout across all your traffic — which wins?",
    a: "Hide the code field", b: "Show the code field", answer: "depends", mag: "reverses", mock: "coupon",
    result: "It reverses by traffic source. For deal and affiliate visitors who arrived with a code it helps; for full-price organic buyers it sends them off-site hunting for a code they never had — and many don't come back. The blended average hides both effects.",
    mech: { options: ["Segmentation — one average can hide opposite effects in different segments", "Anchoring — the code frames the price", "Reciprocity — a discount is a gift", "Scarcity — limited-time code"], correct: 0 },
    principle: "Segment before you ship: an aggregate ‘tie’ can hide a big win in one segment (deal-seekers) and a real loss in another (full-price buyers).", stack: "Data", term: "hte" },
  { id: "q11", title: "Recommendations", question: "Show a personalised ‘Recommended for you’ row, or a generic ‘Bestsellers’ row?",
    a: "Generic bestsellers", b: "Personalised picks", answer: "b", mag: "moderate", mock: "personalise",
    result: "Personalised recommendations lifted click-through and revenue by a moderate margin.",
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
   re-crossing — the α line. A guardrail metric (case 8) is drawn
   per converting visitor on its own streams, so adding it changed
   no other number. */
function runTest(exp, { nPerArm, alpha = 0.05, seed = "LAB-2026", checkpoints = 60 } = {}) {
  const e = exp.truth ? exp : effExperiment(exp, {});
  const segs = e.segments || null;
  const g = e.guardrail || null;
  const rngA = makeRng(seed + ":A");
  const rngB = makeRng(seed + ":B");
  const rngSegA = segs ? makeRng(seed + ":segA") : null;
  const rngSegB = segs ? makeRng(seed + ":segB") : null;
  const rngGA = g ? makeRng(seed + ":guardA") : null;
  const rngGB = g ? makeRng(seed + ":guardB") : null;

  const pickSeg = (rngVal) => {
    let acc = 0;
    for (const s of segs) { acc += s.share; if (rngVal <= acc) return s; }
    return segs[segs.length - 1];
  };
  const segStat = segs ? segs.map((s) => ({ id: s.id, name: s.name, nA: 0, cA: 0, nB: 0, cB: 0 })) : null;
  const segIdx = segs ? Object.fromEntries(segs.map((s, i) => [s.id, i])) : null;

  const series = [];
  let cA = 0, cB = 0, gA = 0, gB = 0;
  const cpEvery = Math.max(1, Math.floor(nPerArm / checkpoints));
  let firstSignificantN = null;

  for (let i = 1; i <= nPerArm; i++) {
    // arm A visitor
    const sA = segs ? pickSeg(rngSegA()) : null;
    const rateA = sA ? sA.pA : e.truth.pA;
    const convA = rngA() < rateA;
    if (convA) { cA++; if (g && rngGA() < g.rateA) gA++; }
    if (sA) { const st = segStat[segIdx[sA.id]]; st.nA++; if (convA) st.cA++; }
    // arm B visitor
    const sB = segs ? pickSeg(rngSegB()) : null;
    const rateB = sB ? sB.pB : e.truth.pB;
    const convB = rngB() < rateB;
    if (convB) { cB++; if (g && rngGB() < g.rateB) gB++; }
    if (sB) { const st = segStat[segIdx[sB.id]]; st.nB++; if (convB) st.cB++; }

    if (i % cpEvery === 0 || i === nPerArm) {
      const t = twoPropTest(i, cA, i, cB, alpha);
      series.push({ n: i, rA: t.rA, rB: t.rB, diff: t.diff, z: t.z, pValue: t.pValue, ciLow: t.ciLow, ciHigh: t.ciHigh, significant: t.significant, ...(g ? { gA, gB, alpha } : {}) });
      if (firstSignificantN == null && t.significant) firstSignificantN = i;
    }
  }

  const final = twoPropTest(nPerArm, cA, nPerArm, cB, alpha);
  const segResults = segStat ? segStat.map((s) => ({ ...s, ...twoPropTest(s.nA, s.cA, s.nB, s.cB, alpha) })) : null;
  return {
    arms: { A: { n: nPerArm, conv: cA, rate: final.rA }, B: { n: nPerArm, conv: cB, rate: final.rB } },
    ...final, series, firstSignificantN, segments: segResults, truth: e.truth,
    ...(g ? { gA, gB } : {}),
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

// The guardrail test at a checkpoint: purchases per recipient, A vs B.
function guardrailAt(cp) {
  return twoPropTest(cp.n, cp.gA, cp.n, cp.gB, cp.alpha ?? 0.05);
}

/* Rerun the same test k times on fresh seeds (deterministic for a
   seed): how often it ends significant, how often it is significant
   at SOME checkpoint (what stopping at the first p < α would call a
   win), and the average lift those early stops claimed. Shows the
   long-run behaviour behind one run's luck (cases 2 and 4). */
function replicate(exp, { nPerArm, alpha = 0.05, seed = "LAB-2026", k = 200 } = {}) {
  let endSig = 0, everSig = 0, sumFirst = 0, sumEnd = 0;
  for (let i = 0; i < k; i++) {
    const r = runTest(exp, { nPerArm, alpha, seed: `${seed}:rep${i}` });
    if (r.significant) endSig++;
    if (r.firstSignificantN != null) { everSig++; sumFirst += r.series.find((cp) => cp.n === r.firstSignificantN).diff; }
    sumEnd += r.diff;
  }
  return { k, endSig, everSig, meanDiffAtFirstSig: everSig ? sumFirst / everSig : null, meanFinalDiff: sumEnd / k };
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

// Guardrail (case 8) at the TRUE rates: of every 1,000 recipients, how
// many reach the real goal (opened, then bought).
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

/* Two separate judgements of the student's call:
   - soundCall: was it the right reading of the EVIDENCE they had? It
     never looks at the truth. An early stop that names a winner is not
     sound (the plan said n, and early leads are inflated). A
     significant result at the planned n licenses naming the observed
     winner. A non-significant one licenses "need more data" — and "no
     real difference" only when the confidence interval sits inside ±
     the smallest effect the student said they cared about (their MDE).
   - matchesTruth: did the call name the true winner? "Need more data"
     makes no claim: null. */
function soundCall(call, s, { stoppedEarly = false, mde = null } = {}) {
  if (stoppedEarly) return call === "more";
  if (s.significant) return call === (s.diff > 0 ? "b" : "a");
  if (call === "more") return true;
  if (call === "none") return mde != null && mde > 0 && s.ciLow > -mde && s.ciHigh < mde;
  return false;
}
function matchesTruth(call, truthDiff) {
  if (call === "more") return null;
  return call === truthWinner(truthDiff);
}
// Why the call was (un)sound, in words — for the scorecard.
function soundReason(call, s, { stoppedEarly = false, mde = null, alpha = 0.05 } = {}) {
  if (stoppedEarly) return call === "more" ? "You stopped early but made no claim." : "You stopped before your planned sample and named a winner: early leads are inflated, so the call isn't supported.";
  if (s.significant) return call === (s.diff > 0 ? "b" : "a") ? `Significant at your planned sample (${pEq(s.pValue)}, below α = ${alpha}): naming the observed winner is supported.` : `The result was significant (${pEq(s.pValue)}, below α = ${alpha}) in favour of ${s.diff > 0 ? "B" : "A"}: naming ${s.diff > 0 ? "B" : "A"} is the call the evidence supports.`;
  if (call === "more") return `Not significant (${pEq(s.pValue)}, not below α = ${alpha}): “need more data” is the honest reading.`;
  if (call === "none") return mde > 0 && s.ciLow > -mde && s.ciHigh < mde
    ? `Not significant, and the confidence interval [${pp(s.ciLow)}, ${pp(s.ciHigh)}] rules out effects as big as your ${pp(mde, 1)} minimum: “no real difference” is supported.`
    : `Not significant — but the confidence interval [${pp(s.ciLow)}, ${pp(s.ciHigh)}] still allows effects as big as your ${pp(mde || 0, 1)} minimum, so it can't show “no difference”. The supported call was “need more data”.`;
  return `Not significant (${pEq(s.pValue)}, not below α = ${alpha}): the evidence doesn't support naming a winner.`;
}

/* Everything a lesson needs: the truth in force, the settings, the
   sample size the true effect needs, and (optionally) the run. */
function lessonContext(exp, cfg = DEFAULT_CFG, run = null) {
  const { pA, pB } = exp.truth;
  const d = pB - pA;
  return {
    exp, d, pA, pB, alpha: cfg.alpha, power: cfg.power, maxN: cfg.maxVisitors,
    need: Math.abs(d) > 1e-9 ? requiredSampleSize(pA, Math.abs(d), cfg.alpha, cfg.power) : Infinity,
    run,
  };
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
  mde: "Minimum detectable effect — the smallest lift you care about catching. You size the test around it before running, and it tells you when ‘no difference’ is a fair reading: only if the confidence interval rules out effects that big.",
  typeI: "A false positive: declaring a winner when there is no real difference. Its rate is α.",
  typeII: "A false negative: missing a real effect because the test was underpowered.",
  peeking: "Repeatedly checking significance and stopping as soon as p < α. Each extra check is another chance to see a false positive by luck, so it pushes the false-positive rate far above α — and when the effect is real, the early stops overstate it.",
  simpson: "Simpson's paradox — a trend that holds within every segment reverses (or vanishes) when the segments are combined, because the groups being compared have a different mix of segments. In a randomised A/B test both arms get the same mix, so segments that disagree are usually a heterogeneous effect instead.",
  hte: "A heterogeneous treatment effect — the change genuinely works differently for different segments (better on mobile, worse on desktop). The overall average can then look like a tie while one segment wins and another loses.",
  scarcity: "Cialdini's scarcity principle — limited availability makes things feel more desirable. Persuasive in theory; its real conversion lift is often tiny.",
  socialproof: "Cialdini's social-proof principle — people copy others' choices, so ‘others bought this’ can reassure hesitant buyers.",
  segment: "Splitting results by a meaningful group (device, new vs returning, country). An aggregate win can hide a segment you're harming — always cut the data.",
  vanity: "A metric that looks impressive but doesn't reflect real value (e.g. clicks or opens). Optimising it can hurt the business — pair it with a guardrail metric.",
  guardrail: "A secondary metric that protects against winning the test but losing the business — e.g. orders or revenue, watched alongside the metric you're optimising.",
  friction: "Anything that slows or complicates the path to the goal — extra steps, fields, or choices. Removing friction is one of the most reliable ways to lift conversion.",
  riskreversal: "Removing the buyer's perceived risk — money-back guarantees, free returns, free trials — so the decision feels safe to make.",
  decoy: "The decoy effect (asymmetric dominance): adding a clearly worse option makes a nearby option look like obvious value, nudging the choice toward it.",
  crostack: "Data → Strategy → Psychology → Testing. Find the problem, prioritise it, design a solution from psychology, then prove it with a test.",
};

/* ---- export (assessable artifact) --------------------------- */
const yesNo = (v) => (v == null ? "no claim" : v ? "yes" : "no");
function buildCSV(records, cfg) {
  const head = ["experiment", "concept", "predicted_winner", "prediction_correct", "predicted_band", "band_correct",
    "planned_n_per_arm", "actual_n_per_arm", "stopped_early", "obs_rate_A", "obs_rate_B", "obs_diff_pp",
    "ci_low_pp", "ci_high_pp", "p_value", "significant", "call", "sound_call", "matched_truth",
    "true_diff_pp", "business_note"];
  const rows = records.map((r) => [
    JSON.stringify(r.title), JSON.stringify(r.concept), r.predictedWinner, r.predictionCorrect, JSON.stringify(r.predictedBand), r.bandCorrect,
    r.plannedN, r.actualN, r.stoppedEarly, (r.obsRateA * 100).toFixed(2), (r.obsRateB * 100).toFixed(2), (r.obsDiff * 100).toFixed(2),
    (r.ciLow * 100).toFixed(2), (r.ciHigh * 100).toFixed(2), r.pValue.toFixed(4), r.significant, r.call, r.soundCall, yesNo(r.matchedTruth),
    (r.trueDiff * 100).toFixed(2), JSON.stringify(r.businessNote || ""),
  ]);
  return [head.join(","), ...rows.map((row) => row.join(","))].join("\n") + `\n# seed,${cfg.seed},alpha,${cfg.alpha},power,${cfg.power}`;
}
const CALL_WORDS = { a: "A wins", b: "B wins", none: "no difference", more: "need more data" };
function buildMarkdown(records, cfg) {
  const hits = (k) => records.filter((r) => r[k]).length;
  const claims = records.filter((r) => r.matchedTruth != null);
  let md = `# Conversion Lab — Experiment Log (Chrichton)\n\n`;
  md += `**Seed:** \`${cfg.seed}\`  ·  **α:** ${cfg.alpha}  ·  **Power target:** ${Math.round(cfg.power * 100)}%\n\n`;
  md += `**Calibration:** predicted winner ${hits("predictionCorrect")}/${records.length}  ·  effect-size band ${hits("bandCorrect")}/${records.length}  ·  sound call ${hits("soundCall")}/${records.length}  ·  matched the truth ${claims.filter((r) => r.matchedTruth).length}/${claims.length} (of the calls that named an outcome).\n\n`;
  md += `| # | Experiment | Concept | Predicted | Planned n | Actual n | Obs diff | ${ciLevel(cfg.alpha)} CI | p | Sig? | Call | Sound? | Matched truth? |\n`;
  md += `|---|------------|---------|-----------|-----------|----------|----------|--------|---|------|------|--------|----------------|\n`;
  records.forEach((r, i) => {
    md += `| ${i + 1} | ${r.title} | ${r.concept} | ${r.predictedBand} | ${r.plannedN} | ${r.actualN}${r.stoppedEarly ? " (stopped early)" : ""} | ${pp(r.obsDiff)} | [${pp(r.ciLow)}, ${pp(r.ciHigh)}] | ${r.pValue.toFixed(3)} | ${r.significant ? "yes" : "no"} | ${CALL_WORDS[r.call] || r.call} | ${r.soundCall ? "✓" : "✗"} | ${r.matchedTruth == null ? "no claim" : r.matchedTruth ? "✓" : "✗"} |\n`;
  });
  md += `\n## Reflection prompts\n\n`;
  md += `1. Where did your intuition disagree with the data, and which bias was at work (scarcity? social proof? a warmer background that just *felt* more premium)?\n`;
  md += `2. Which experiments were underpowered? Using the planner, what sample size would you have needed to detect the true effect at ${Math.round(cfg.power * 100)}% power?\n`;
  md += `3. Where was your call sound but wrong about the truth (or right by luck)? What does that tell you about judging decisions by their outcomes?\n`;
  md += `4. For the free-shipping test, did the ‘winning’ variant actually make Chrichton money once the shipping cost is counted?\n`;
  md += `5. For the checkout test, what did the segmented (mobile vs desktop) result reveal that the aggregate hid — and what would you ship?\n`;
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
  clamp, gbp, pct, pp, pText, pEq, fmtN, ciLevel, mulberry32, makeRng, erf, normalCdf, normalQuantile,
  twoPropTest, requiredSampleSize, powerAt, EXPERIMENTS, EXMAP, aggregateTruth, effExperiment,
  runTest, statAt, guardrailAt, replicate, profitPerThousand, guardrailPerThousand, BANDS, trueBand,
  NULL_ZONE, truthWinner, soundCall, matchesTruth, soundReason, lessonContext, effectPhrase, GLOSSARY,
  QUIZ, QDIR, QMAG, CRO_STACK, buildCSV, buildMarkdown, downloadFile, DEFAULT_CFG,
};
