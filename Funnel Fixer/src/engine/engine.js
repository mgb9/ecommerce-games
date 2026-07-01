/* ============================================================
   FUNNEL FIXER — pure, seeded funnel-diagnosis engine (no React,
   no I/O). resolveQuarter() is one deterministic tick: apply the
   chosen interventions (capped lifts + diminishing returns), then
   recompute volumes, profit, CAC/LTV, per-intervention ROI and the
   new bottleneck. Same architecture as Marketplace Tycoon /
   Conversion Lab so it ports to the shared repo and test harness.

   The teaching maths lives here in the open: the value of fixing a
   stage is sized in MONEY, not percentage points —
     leak = usersEntering · (benchmark − actual) · downstreamConv · marginPerOrder
   so the biggest %-gap is rarely the biggest £-leak.
   ============================================================ */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const gbp = (n) => "£" + Math.round(n).toLocaleString("en-GB");
const gbpK = (n) => Math.abs(n) >= 1000 ? "£" + (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "k" : gbp(n);
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
// Stable per-intervention noise: depends only on (seed, id), so a
// counterfactual that removes a different intervention doesn't shift it.
function noiseFactor(seed, id, noise) {
  return 1 + (makeRng(seed + ":" + id)() * 2 - 1) * noise;
}

const STAGES = [
  { key: "view", label: "Product view", from: "Sessions" },
  { key: "atc", label: "Add to cart", from: "Product view" },
  { key: "checkout", label: "Checkout started", from: "Add to cart" },
  { key: "purchase", label: "Purchase", from: "Checkout" },
];
const STAGE_KEYS = STAGES.map((s) => s.key);

/* ---- Chrichton baseline + tunable config ------------------- */
const DEFAULT_CFG = {
  seed: "FUNNEL-2026",
  sessions: 80000,
  rates: { view: 0.55, atc: 0.08, checkout: 0.45, purchase: 0.60 },
  benchmarks: { view: 0.60, atc: 0.12, checkout: 0.50, purchase: 0.75 },
  ceilings: { view: 0.72, atc: 0.18, checkout: 0.62, purchase: 0.88 },
  aov: 42, margin: 0.45, repeat: 0.4, mobileShare: 0.55,
  shippingMarginCut: 0.06,
  budget: 15000, quarters: 4, noise: 0.08,
};

/* ---- the intervention menu (the budget basket) -------------
   `powers` = the fraction of the gap-to-ceiling an intervention
   closes on each stage. Gap-closing gives two realities for free:
   a CEILING (a near-optimal stage has a tiny gap, so the same spend
   barely moves it) and DIMINISHING RETURNS (stacking on one stage
   closes ever-less of the shrinking gap). Acquisition interventions
   add sessions instead and raise CAC. */
const INTERVENTIONS = [
  { id: "speed", name: "Faster page load", icon: "⚡", type: "rate", cost: 6000,
    powers: { view: 0.28, atc: 0.14 }, blurb: "Core Web Vitals — broad lift where volume is highest.",
    teach: "Helps the top of the funnel; a small % lift on huge volume is real money." },
  { id: "imagery", name: "Product imagery & video", icon: "📸", type: "rate", cost: 7000,
    powers: { atc: 0.50 }, blurb: "Richer product pages to lift add-to-cart.",
    teach: "Targets the high-volume early leak — often the best £-for-£ fix here." },
  { id: "trust", name: "Reviews & trust badges", icon: "⭐", type: "rate", cost: 3000,
    powers: { checkout: 0.22, purchase: 0.16 }, blurb: "Cheap, broad trust signals.",
    teach: "High ICE: low cost, broad reassurance across the back half of the funnel." },
  { id: "guest", name: "Guest checkout", icon: "🚪", type: "rate", cost: 6000,
    powers: { purchase: 0.48 }, blurb: "Remove the forced-account wall at checkout.",
    teach: "A large lift on the late abandonment leak." },
  { id: "payments", name: "More payment options", icon: "💳", type: "rate", cost: 3000,
    powers: { purchase: 0.20 }, blurb: "Apple Pay, PayPal, BNPL at checkout.",
    teach: "Helps abandonment, but diminishes fast if stacked with guest checkout." },
  { id: "mobile", name: "Mobile UX overhaul", icon: "📱", type: "rate", cost: 12000,
    powers: { view: 0.30, atc: 0.30, checkout: 0.30, purchase: 0.30 }, mobileWeighted: true,
    blurb: "Rebuild the mobile experience across every stage.",
    teach: "Broad but expensive — only pays off if your traffic is mobile-heavy." },
  { id: "shipping", name: "Free-shipping threshold", icon: "🚚", type: "rate", cost: 2000,
    powers: { purchase: 0.30 }, marginCut: true, blurb: "‘Free shipping over £40’ at checkout.",
    teach: "The profit trap: lifts conversion but cuts margin on every order — and you can't undo it." },
  { id: "retarget", name: "Retargeting / email", icon: "🎯", type: "acq", cost: 5000, sessionBoost: 0.10,
    blurb: "Re-engage lapsed visitors (ongoing spend).", teach: "Adds sessions and raises CAC — only worth it if LTV clears CAC." },
  { id: "paid", name: "Paid traffic boost", icon: "📣", type: "acq", cost: 10000, sessionBoost: 0.28,
    blurb: "Buy more sessions (ongoing spend).", teach: "The leaky bucket: pouring traffic through an unfixed funnel just burns CAC." },
];
const IMAP = Object.fromEntries(INTERVENTIONS.map((i) => [i.id, i]));

function initialState(cfg) {
  return { quarter: 1, rates: { ...cfg.rates }, deployed: [], marginCut: 0, cumProfit: 0, cumSpend: 0 };
}

const purchasesFor = (rates, sessions) => sessions * rates.view * rates.atc * rates.checkout * rates.purchase;
const marginPerOrder = (cfg) => cfg.aov * cfg.margin;

function powerOf(intv, stage, cfg) {
  let p = intv.powers ? intv.powers[stage] : 0;
  if (!p) return 0;
  if (intv.mobileWeighted) p *= cfg.mobileShare;
  return p;
}

// Apply a set of rate-interventions to a starting rate set. For each stage
// we close gap-to-ceiling sequentially (strongest first), so each extra
// intervention on the same stage adds less — diminishing returns, and a
// near-ceiling stage barely moves.
function applyRates(start, rateIntvs, cfg, seed) {
  const rates = { ...start };
  for (const s of STAGE_KEYS) {
    const ceil = cfg.ceilings[s];
    const list = rateIntvs
      .map((i) => ({ p: powerOf(i, s, cfg) * noiseFactor(seed, i.id, cfg.noise) }))
      .filter((x) => x.p > 0)
      .sort((a, b) => b.p - a.p);
    let r = rates[s];
    for (const { p } of list) r += Math.max(0, ceil - r) * clamp(p, 0, 1);
    rates[s] = Math.min(ceil, r);
  }
  return rates;
}

function sessionsFor(cfg, acqIntvs, seed) {
  const boost = acqIntvs.reduce((a, i) => a + i.sessionBoost * noiseFactor(seed, i.id, cfg.noise), 0);
  return Math.round(cfg.sessions * (1 + boost));
}

// Opportunity sizing: the £ value of closing each stage's gap to its
// benchmark, accounting for downstream conversion and margin. This is the
// diagnosis target — the biggest entry is the bottleneck.
function leaks(rates, sessions, cfg) {
  const mpo = marginPerOrder(cfg);
  let entering = sessions;
  const out = [];
  for (let i = 0; i < STAGE_KEYS.length; i++) {
    const k = STAGE_KEYS[i];
    const gap = Math.max(0, cfg.benchmarks[k] - rates[k]);
    let downstream = 1;
    for (let j = i + 1; j < STAGE_KEYS.length; j++) downstream *= rates[STAGE_KEYS[j]];
    out.push({ stage: k, label: STAGES[i].label, entering, rate: rates[k], bench: cfg.benchmarks[k], gap, downstream, leak: entering * gap * downstream * mpo });
    entering *= rates[k];
  }
  return out;
}
const bottleneckOf = (leakArr) => leakArr.reduce((a, b) => (b.leak > a.leak ? b : a), leakArr[0]);

// Volumes entering/leaving each stage, for the funnel viz.
function volumes(rates, sessions) {
  const out = [{ key: "sessions", label: "Sessions", count: sessions }];
  let v = sessions;
  for (const s of STAGES) { v = v * rates[s.key]; out.push({ key: s.key, label: s.label, count: v, rate: rates[s.key] }); }
  return out;
}

const profitExclSpend = (rates, sessions, marginCut, cfg) => purchasesFor(rates, sessions) * cfg.aov * (cfg.margin - marginCut);

/* ---- THE TICK: resolve one quarter -------------------------
   Rate fixes are one-time and PERSIST (they live in state.rates, so
   next quarter starts improved and the bottleneck can move).
   Acquisition spend is ongoing — its session boost lasts only the
   quarter it's funded. A deployed free-shipping margin cut persists
   (you can't un-offer it), which is what makes it a compounding trap. */
function resolveQuarter(state, chosenIds, cfg) {
  const seed = cfg.seed + ":q" + state.quarter;
  const chosen = chosenIds.map((id) => IMAP[id]).filter(Boolean);
  const rateIntvs = chosen.filter((i) => i.type === "rate");
  const acqIntvs = chosen.filter((i) => i.type === "acq");

  const before = { ...state.rates };
  const beforeLeaks = leaks(before, cfg.sessions, cfg);
  const afterRates = applyRates(state.rates, rateIntvs, cfg, seed);
  const sessions = sessionsFor(cfg, acqIntvs, seed);

  const shippingNow = chosen.some((i) => i.marginCut);
  const marginCut = Math.max(state.marginCut, shippingNow ? cfg.shippingMarginCut : 0);
  const effMargin = cfg.margin - marginCut;

  const spend = chosen.reduce((a, i) => a + i.cost, 0);
  const purchases = purchasesFor(afterRates, sessions);
  const revenue = purchases * cfg.aov;
  const grossProfit = revenue * effMargin - spend;

  // CAC is the cost per *acquired* customer — i.e. per the INCREMENTAL
  // purchases the added sessions bought, not blended across organic
  // purchases (which would flatter a leaky funnel). This is what makes the
  // leaky-bucket trap bite: into an unfixed funnel, few of the bought
  // sessions convert, so each acquired customer is expensive.
  const acqSpend = acqIntvs.reduce((a, i) => a + i.cost, 0);
  const incrementalAcqPurchases = purchases - purchasesFor(afterRates, cfg.sessions);
  const cac = acqSpend > 0 && incrementalAcqPurchases > 0 ? acqSpend / incrementalAcqPurchases : 0;
  const ltv = cfg.aov * effMargin * (1 + cfg.repeat);
  const ltvCac = cac > 0 ? ltv / cac : Infinity;

  // marginal ROI per chosen intervention = how much profit it added,
  // holding the others fixed.
  const fullProfit = profitExclSpend(afterRates, sessions, marginCut, cfg);
  const perInterventionROI = chosen.map((intv) => {
    let r2 = afterRates, s2 = sessions, mc2 = marginCut;
    if (intv.type === "rate") r2 = applyRates(state.rates, rateIntvs.filter((x) => x.id !== intv.id), cfg, seed);
    else s2 = sessionsFor(cfg, acqIntvs.filter((x) => x.id !== intv.id), seed);
    if (intv.marginCut) mc2 = state.marginCut; // remove this quarter's cut
    const without = profitExclSpend(r2, s2, mc2, cfg);
    const incrProfit = fullProfit - without;
    return { id: intv.id, name: intv.name, icon: intv.icon, cost: intv.cost, incrProfit, roi: intv.cost > 0 ? incrProfit / intv.cost : 0 };
  });

  const afterLeaks = leaks(afterRates, sessions, cfg);
  const bottleneck = bottleneckOf(afterLeaks);

  const newState = {
    quarter: state.quarter + 1, rates: afterRates,
    deployed: [...new Set([...state.deployed, ...chosen.map((i) => i.id)])],
    marginCut, cumProfit: state.cumProfit + grossProfit, cumSpend: state.cumSpend + spend,
  };

  return {
    before, afterRates, beforeLeaks, leaks: afterLeaks, bottleneck,
    sessions, purchases, revenue, grossProfit, spend, effMargin,
    cac, ltv, ltvCac, acqSpend, perInterventionROI,
    purchasesBefore: purchasesFor(before, cfg.sessions),
    newState,
  };
}

// Predict-then-reveal aid: the projected ROI of each available
// intervention if it alone were run this quarter. Used to score the
// student's "best-ROI bet" prediction and to reveal the truth.
function previewSingles(state, cfg) {
  const seed = cfg.seed + ":q" + state.quarter;
  const baseProfit = profitExclSpend(state.rates, cfg.sessions, state.marginCut, cfg);
  return INTERVENTIONS
    .filter((i) => !(i.type === "rate" && state.deployed.includes(i.id)))
    .map((intv) => {
      let rates = state.rates, sessions = cfg.sessions, mc = state.marginCut;
      if (intv.type === "rate") rates = applyRates(state.rates, [intv], cfg, seed);
      else sessions = sessionsFor(cfg, [intv], seed);
      if (intv.marginCut) mc = state.marginCut + cfg.shippingMarginCut;
      const incrProfit = profitExclSpend(rates, sessions, mc, cfg) - baseProfit;
      return { id: intv.id, name: intv.name, icon: intv.icon, cost: intv.cost, incrProfit, roi: incrProfit / intv.cost };
    })
    .sort((a, b) => b.roi - a.roi);
}

/* ---- export (assessable artifact) --------------------------- */
function buildCSV(records, cfg) {
  const head = ["quarter", "predicted_leak", "actual_bottleneck", "leak_correct", "predicted_best_roi", "best_roi_actual", "roi_correct",
    "allocations", "spend", "purchases", "revenue", "gross_profit", "cac", "ltv_cac", "wasted_spend"];
  const rows = records.map((r) => [
    r.quarter, r.predLeak, r.actualLeak, r.leakCorrect, r.predBest, r.bestActual, r.roiCorrect,
    JSON.stringify(r.allocations.join("; ")), r.spend, Math.round(r.purchases), Math.round(r.revenue), Math.round(r.grossProfit),
    r.cac.toFixed(2), isFinite(r.ltvCac) ? r.ltvCac.toFixed(2) : "n/a", Math.round(r.wasted),
  ]);
  return [head.join(","), ...rows.map((row) => row.join(","))].join("\n") + `\n# seed,${cfg.seed},budget,${cfg.budget},quarters,${cfg.quarters}`;
}
function buildMarkdown(records, cfg, cumProfit) {
  const leakHits = records.filter((r) => r.leakCorrect).length;
  const roiHits = records.filter((r) => r.roiCorrect).length;
  let md = `# Funnel Fixer — Diagnosis Log (Chrichton)\n\n`;
  md += `**Seed:** \`${cfg.seed}\`  ·  **Budget/quarter:** ${gbp(cfg.budget)}  ·  **Quarters:** ${records.length}\n\n`;
  md += `**Cumulative gross profit:** ${gbp(cumProfit)}.  **Calibration:** biggest-leak called ${leakHits}/${records.length}; best-ROI bet ${roiHits}/${records.length}.\n\n`;
  md += `| Q | Predicted leak | Actual | ✓ | Allocations | Spend | Purchases | Profit | CAC | LTV/CAC | Wasted |\n`;
  md += `|---|---------------|--------|---|-------------|-------|-----------|--------|-----|---------|--------|\n`;
  records.forEach((r) => {
    md += `| ${r.quarter} | ${r.predLeak} | ${r.actualLeak} | ${r.leakCorrect ? "✓" : "✗"} | ${r.allocations.join(", ") || "—"} | ${gbp(r.spend)} | ${Math.round(r.purchases)} | ${gbp(r.grossProfit)} | ${r.cac ? gbp(r.cac) : "—"} | ${isFinite(r.ltvCac) ? r.ltvCac.toFixed(1) : "—"} | ${gbp(r.wasted)} |\n`;
  });
  md += `\n## Reflection prompts\n\n`;
  md += `1. Did you size the opportunity in money before spending — and were you right about the biggest leak (not just the biggest % gap)?\n`;
  md += `2. Which intervention had the best and worst ROI, and why (a near-ceiling stage? the wrong stage? a margin cut)?\n`;
  md += `3. Track CAC vs LTV across quarters — did any growth spend fail to pay for itself (the leaky bucket)?\n`;
  md += `4. After you fixed the first bottleneck, where did the binding constraint move to?\n`;
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

const GLOSSARY = {
  funnel: "The sequence of steps a visitor passes through to buy — sessions → product view → add to cart → checkout → purchase. Each step loses some people.",
  conversionrate: "The share of users at one step who make it to the next. The whole-funnel rate is the product of every step's rate.",
  opportunitysizing: "Valuing a fix in money before you build it: (extra users retained) × (downstream conversion) × (margin per order). Diagnose with £, not percentage points.",
  bottleneck: "The stage losing the most money right now — the one fix that frees the most value. It is not always the stage with the biggest percentage gap.",
  theoryofconstraints: "Fix the tightest bottleneck and the next stage becomes the new bottleneck. So your second round of fixes should target a different stage than the first.",
  leakybucket: "Buying more traffic before you fix conversion just sends more visitors through the same leaks. Cost per customer (CAC) rises and ROI falls.",
  cac: "Customer acquisition cost — acquisition spend ÷ customers acquired. Only worth it if LTV clears it.",
  ltv: "Lifetime value — the gross profit a customer brings over time: AOV × margin × (1 + repeat factor).",
  ltvcac: "LTV ÷ CAC. A rough rule of thumb is healthy ≥ 3: every £1 of acquisition returns £3 of lifetime value.",
  ceiling: "A realistic maximum for a stage's rate. A stage near its ceiling has little gap left, so spending on it barely helps.",
  diminishing: "Stacking interventions on one stage returns less each time — each new fix closes a fraction of the shrinking remaining gap.",
  aov: "Average order value — the average revenue per purchase.",
  grossmargin: "The share of revenue left after the cost of goods. Free-shipping and discounts cut it.",
  repeatfactor: "How much extra value a customer brings from repeat purchases, on top of their first order.",
  roi: "Return on investment — here, the extra gross profit a fix produced ÷ what it cost.",
  cro: "Conversion rate optimisation (CRO) — increasing the share of visitors who complete the goal, by finding and fixing what stops them.",
  pp: "Percentage points — the plain difference between two percentages. Going from 8% to 6% is 2 percentage points (2pp), even though it is a 25% relative fall.",
  benchmark: "The rate a well-run store of this type achieves at a stage — the realistic target you're diagnosing against.",
};

export {
  clamp, gbp, gbpK, pct, pp, mulberry32, makeRng, noiseFactor,
  STAGES, STAGE_KEYS, DEFAULT_CFG, INTERVENTIONS, IMAP, initialState,
  purchasesFor, marginPerOrder, applyRates, sessionsFor, leaks, bottleneckOf, volumes,
  profitExclSpend, resolveQuarter, previewSingles, GLOSSARY,
  buildCSV, buildMarkdown, downloadFile,
};
