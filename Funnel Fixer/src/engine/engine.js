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
function leaks(rates, sessions, cfg, marginCut = 0) {
  const mpo = cfg.aov * (cfg.margin - marginCut); // what an order is worth now
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
// The biggest money leak — or null when no stage is below its benchmark
// (a "bottleneck" worth £0 is not one).
const bottleneckOf = (leakArr) => {
  const top = leakArr.reduce((a, b) => (b.leak > a.leak ? b : a), leakArr[0]);
  return top && top.leak >= 1 ? top : null;
};
// The stage furthest below its benchmark in percentage points (null if none).
const biggestGapOf = (leakArr) => {
  const top = leakArr.reduce((a, b) => (b.gap > a.gap ? b : a), leakArr[0]);
  return top && top.gap > 1e-9 ? top : null;
};
// Quarters a one-off fix bought now will be in place for, this one included.
const quartersLeft = (state, cfg) => Math.max(1, cfg.quarters - state.quarter + 1);

/* What a fix acts on, in words the student can reason with before the
   numbers are revealed: the stage and a strength band for the share of the
   remaining headroom (rate → best-in-class) it closes. */
const strengthOf = (p) => (p >= 0.4 ? "strong" : p >= 0.2 ? "moderate" : "light");
function actsOn(intv, cfg) {
  if (intv.type === "acq") return [{ stage: "sessions", label: "Sessions", strength: `+${Math.round(intv.sessionBoost * 100)}% while funded` }];
  return STAGES.map((s) => ({ stage: s.key, label: s.label, p: powerOf(intv, s.key, cfg) }))
    .filter((x) => x.p > 0).map((x) => ({ stage: x.stage, label: x.label, strength: strengthOf(x.p) }));
}

/* Return over the rest of the plan. A rate fix is paid for once and stays
   (so does free shipping's margin cut): it earns this quarter's gain, then
   the gain at the base level of traffic in every later quarter — holding
   everything else as it is now. Bought traffic lasts only the quarter it is
   funded. Judging both on one quarter marks durable fixes as wasted money
   and makes re-bought traffic look better than it is. */
function planValue(intv, incrNow, incrBase, qLeft) {
  const planProfit = intv.type === "rate" ? incrNow + (qLeft - 1) * incrBase : incrNow;
  return { planProfit, planRoi: intv.cost > 0 ? planProfit / intv.cost : 0 };
}

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
  const beforeLeaks = leaks(before, cfg.sessions, cfg, state.marginCut);
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
  const ltvCac = cac > 0 ? ltv / cac : null; // null = no customers were bought

  // marginal ROI per chosen intervention = how much profit it added,
  // holding the others fixed.
  const fullProfit = profitExclSpend(afterRates, sessions, marginCut, cfg);
  const fullBase = profitExclSpend(afterRates, cfg.sessions, marginCut, cfg);
  const qLeft = quartersLeft(state, cfg);
  const perInterventionROI = chosen.map((intv) => {
    let r2 = afterRates, s2 = sessions, mc2 = marginCut;
    if (intv.type === "rate") r2 = applyRates(state.rates, rateIntvs.filter((x) => x.id !== intv.id), cfg, seed);
    else s2 = sessionsFor(cfg, acqIntvs.filter((x) => x.id !== intv.id), seed);
    if (intv.marginCut) mc2 = state.marginCut; // remove this quarter's cut
    const incrProfit = fullProfit - profitExclSpend(r2, s2, mc2, cfg);
    const incrBase = fullBase - profitExclSpend(r2, cfg.sessions, mc2, cfg);
    return { id: intv.id, name: intv.name, icon: intv.icon, type: intv.type, cost: intv.cost, incrProfit, roi: intv.cost > 0 ? incrProfit / intv.cost : 0,
      ...planValue(intv, incrProfit, incrBase, qLeft) };
  });

  const afterLeaks = leaks(afterRates, sessions, cfg, marginCut);
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
    quartersLeft: qLeft, marginCut, shippingNow: shippingNow && state.marginCut === 0,
    newState,
  };
}

// Predict-then-reveal aid: what each available fix would return if it
// alone were bought this quarter — in the quarter, and over the rest of
// the plan (see planValue). Sorted by return per £ over the plan: that is
// the "best bet" the student is asked to predict.
function previewSingles(state, cfg) {
  const seed = cfg.seed + ":q" + state.quarter;
  const baseProfit = profitExclSpend(state.rates, cfg.sessions, state.marginCut, cfg);
  const qLeft = quartersLeft(state, cfg);
  return INTERVENTIONS
    .filter((i) => !(i.type === "rate" && state.deployed.includes(i.id)))
    .map((intv) => {
      let rates = state.rates, sessions = cfg.sessions, mc = state.marginCut;
      if (intv.type === "rate") rates = applyRates(state.rates, [intv], cfg, seed);
      else sessions = sessionsFor(cfg, [intv], seed);
      if (intv.marginCut) mc = Math.max(state.marginCut, cfg.shippingMarginCut);
      const incrProfit = profitExclSpend(rates, sessions, mc, cfg) - baseProfit;
      const incrBase = intv.type === "rate" ? incrProfit : 0;
      return { id: intv.id, name: intv.name, icon: intv.icon, type: intv.type, cost: intv.cost, incrProfit, roi: incrProfit / intv.cost,
        ...planValue(intv, incrProfit, incrBase, qLeft) };
    })
    .sort((a, b) => b.planRoi - a.planRoi);
}

/* ---- scoring the two predictions -----------------------------
   Biggest money leak: the stage, or "none" when no stage is below its
   benchmark. Best bet: the fix with the highest return per £ over the rest
   of the plan — any fix within 5% of the top counts (the outcome noise
   makes closer calls unknowable) — or "none" when not even the best one
   earns back its cost. */
const NONE = "none";
const BET_TOLERANCE = 0.05;
function leakAnswer(leakArr) { const b = bottleneckOf(leakArr); return b ? b.stage : NONE; }
function bestBets(singles) {
  const top = singles[0];
  if (!top || top.planRoi < 1) return [NONE];
  return singles.filter((s) => s.planRoi >= top.planRoi * (1 - BET_TOLERANCE)).map((s) => s.id);
}
const stageLabel = (key) => (key === NONE ? "None below benchmark" : STAGES.find((s) => s.key === key)?.label || "—");
const fixLabel = (id) => (id === NONE ? "None pays back" : IMAP[id]?.name || "—");

/* One quarter's record: the predictions and how they scored, what was
   bought and what it returned. Plain JSON (it is saved and exported). */
function buildRecord(state, cfg, { predLeak, predBest, chosen }, r) {
  const before = leaks(state.rates, cfg.sessions, cfg, state.marginCut);
  const singles = previewSingles(state, cfg);
  const bott = bottleneckOf(before), gap = biggestGapOf(before);
  const bets = bestBets(singles);
  const notPaidBack = r.perInterventionROI.filter((x) => x.planRoi < 1);
  return {
    quarter: state.quarter, quartersLeft: r.quartersLeft,
    predLeak, actualLeak: leakAnswer(before), leakCorrect: predLeak === leakAnswer(before),
    leakValue: bott ? bott.leak : 0,
    gapStage: gap ? gap.stage : NONE, gapPp: gap ? gap.gap : 0, gapStageLeak: gap ? gap.leak : 0,
    predBest, bestActual: bets[0], bestBets: bets, roiCorrect: bets.includes(predBest),
    bestPlanRoi: singles[0] ? singles[0].planRoi : 0,
    chosen: [...chosen], allocations: chosen.map((id) => IMAP[id].name),
    fixes: r.perInterventionROI.map((x) => ({ id: x.id, name: x.name, type: x.type, cost: x.cost, incrProfit: x.incrProfit, roi: x.roi, planProfit: x.planProfit, planRoi: x.planRoi })),
    spend: r.spend, acqSpend: r.acqSpend, purchases: r.purchases, revenue: r.revenue, grossProfit: r.grossProfit,
    cac: r.cac, ltv: r.ltv, ltvCac: r.ltvCac, effMargin: r.effMargin, shippingNow: r.shippingNow,
    purchaseRateBefore: r.before.purchase, purchaseRateAfter: r.afterRates.purchase,
    notPaidBack: notPaidBack.reduce((a, x) => a + x.cost, 0),
    nextLeak: r.bottleneck ? r.bottleneck.stage : NONE,
    ratesAfter: { ...r.afterRates }, marginCutAfter: r.marginCut,
  };
}

/* ---- the debrief: written from the run, not about it --------
   Every sentence is built from what the records hold, so it stays true
   for any seed, any instructor setting and any way of playing — including
   buying nothing, never buying traffic, or a funnel where the biggest gap
   IS the biggest leak. Where the student didn't try something, the card
   says so and gives the figure it would have produced. */
function paidAt(rates, marginCut, cfg) {
  const paid = IMAP.paid;
  const conv = rates.view * rates.atc * rates.checkout * rates.purchase;
  const cac = paid.cost / (cfg.sessions * paid.sessionBoost * conv);
  const ltv = cfg.aov * (cfg.margin - marginCut) * (1 + cfg.repeat);
  return { cac, ltv, ratio: ltv / cac };
}
const x1 = (n) => n.toFixed(1) + "×";
const plural = (n, one, many) => (n === 1 ? one : many);
function buildDebrief(records, cfg) {
  if (!records.length) return [];
  const N = records.length, last = records[N - 1];
  const cards = [];

  // 1 · size it in money
  const leakHits = records.filter((r) => r.leakCorrect).length;
  const split = records.find((r) => r.actualLeak !== NONE && r.gapStage !== NONE && r.gapStage !== r.actualLeak);
  cards.push({ id: "sizing", title: "Size it in money, not points",
    body: `You called the biggest money leak in ${leakHits} of ${N} ${plural(N, "quarter", "quarters")}. ` + (split
      ? `In quarter ${split.quarter} the stage furthest below its benchmark was ${stageLabel(split.gapStage)} (${(split.gapPp * 100).toFixed(0)} points, a ${gbpK(split.gapStageLeak)} leak), but the biggest money leak was ${stageLabel(split.actualLeak)} at ${gbpK(split.leakValue)} a quarter. Volume and what happens downstream decide what a gap is worth, not its size in points.`
      : `In this run the stage furthest below its benchmark was also the biggest money leak every time there was one. That is not a rule: a small gap on a high-volume stage can outweigh a large gap further down, so size it each time.`) });

  // 2 · the bottleneck moves
  const seq = [...records.map((r) => r.actualLeak), last.nextLeak].filter((k, i, a) => i === 0 || k !== a[i - 1]);
  const first = seq[0];
  let moving;
  if (seq.length > 1) {
    moving = `The biggest leak went ${seq.map(stageLabel).join(" → ")}. Each fix changes which stage is worth most, so one quarter's diagnosis does not carry over to the next.`;
    if (seq[seq.length - 1] === NONE) moving += ` By the end no stage was below its benchmark: what remains is headroom to best-in-class, not a leak.`;
  } else if (first === NONE) {
    moving = `No stage was below its benchmark at any point in this run, so there was no leak to move. What was left to win was headroom to best-in-class.`;
  } else {
    const acted = records.some((r) => r.chosen.some((id) => IMAP[id].powers && IMAP[id].powers[first]));
    moving = `The biggest leak stayed at ${stageLabel(first)} for the whole run — ` + (acted ? `what you bought narrowed it without closing it.` : `nothing you bought acted on that stage.`) + ` When a fix does close a leak, the next-largest takes its place, so the diagnosis has to be redone each quarter.`;
  }
  cards.push({ id: "moving", title: "The bottleneck moves", body: moving });

  // 3 · buying traffic
  const bought = records.filter((r) => r.acqSpend > 0 && r.ltvCac != null);
  let traffic;
  if (bought.length) {
    traffic = `You bought traffic in ${bought.length} ${plural(bought.length, "quarter", "quarters")}: ` +
      bought.map((r) => `quarter ${r.quarter}, ${gbp(r.cac)} per bought customer against a lifetime value of ${gbp(r.ltv)} (${x1(r.ltvCac)})`).join("; ") + `. `;
    const under1 = bought.filter((r) => r.ltvCac < 1).length, over3 = bought.filter((r) => r.ltvCac >= 3).length;
    if (under1) traffic += `Below 1× a bought customer costs more than they will ever return${under1 < bought.length ? ` — that was ${under1} of the ${bought.length}` : ""}. `;
    else if (over3 === bought.length) traffic += `Each cleared the 3× rule of thumb. `;
    else traffic += `Above 1× the customer pays back in the end, but short of the 3× rule of thumb there is little left for overheads and risk. `;
    traffic += `The spend buys the same sessions every time; what changes the cost per customer is how many of them the funnel converts.`;
  } else {
    const a = paidAt(cfg.rates, 0, cfg), b = paidAt(last.ratesAfter, last.marginCutAfter, cfg);
    traffic = `You bought no traffic. Through the funnel you started with, Paid traffic boost would have cost about ${gbp(a.cac)} per customer against a lifetime value of ${gbp(a.ltv)} (${x1(a.ratio)}); through the funnel you finished with, about ${gbp(b.cac)} against ${gbp(b.ltv)} (${x1(b.ratio)}). The same spend buys the same sessions — the funnel decides what a customer costs.`;
  }
  cards.push({ id: "traffic", title: "Buying traffic", body: traffic });

  // 4 · free shipping and margin
  const pc = (v) => pct(v, 0);
  const shipQ = records.find((r) => r.shippingNow);
  let ship;
  if (shipQ) {
    const f = shipQ.fixes.find((x) => x.id === "shipping");
    ship = `You offered free shipping in quarter ${shipQ.quarter}. It helped lift the purchase rate (${pct(shipQ.purchaseRateBefore)} → ${pct(shipQ.purchaseRateAfter)} with everything bought that quarter) and cut the margin from ${pc(cfg.margin)} to ${pc(shipQ.effMargin)} on every order from then on. Net of both, it ${f.planProfit >= 0 ? "added" : "cost"} about ${gbpK(Math.abs(f.planProfit))} over the rest of the plan${f.planProfit >= f.cost ? "" : f.planProfit >= 0 ? `, less than its ${gbp(f.cost)} price` : ""}.`;
  } else {
    const s = previewSingles(initialState(cfg), cfg).find((x) => x.id === "shipping");
    ship = `You did not offer free shipping. Bought on its own in quarter 1 it would have lifted the purchase rate and cut the margin from ${pc(cfg.margin)} to ${pc(cfg.margin - cfg.shippingMarginCut)} on every order: a net ${s.planProfit >= 0 ? "gain" : "loss"} of about ${gbpK(Math.abs(s.planProfit))} over the plan, for ${gbp(s.cost)}.`;
  }
  ship += ` More orders is not the test; profit after the margin given away is.`;
  cards.push({ id: "margin", title: "Conversion bought with margin", body: ship });

  // 5 · payback
  const spend = records.reduce((a, r) => a + r.spend, 0);
  const lost = records.flatMap((r) => r.fixes.filter((f) => f.planRoi < 1).map((f) => `${f.name} (quarter ${r.quarter}, ${x1(f.planRoi)})`));
  const lostSpend = records.reduce((a, r) => a + r.notPaidBack, 0);
  const idle = records.filter((r) => r.spend === 0).map((r) => r.quarter);
  let pay;
  if (spend === 0) pay = `You spent nothing in this run, so the funnel stayed as it started.`;
  else if (!lost.length) pay = `You spent ${gbp(spend)}, and every purchase had earned back its cost by the end of the plan.`;
  else pay = `You spent ${gbp(spend)}; ${gbp(lostSpend)} of it went on purchases that had not earned back their cost by the end of the plan: ${lost.join(", ")}.`;
  if (spend > 0) pay += ` A one-off fix earns in every quarter it is in place, so the same fix is worth less the later it is bought; bought traffic earns only in the quarter it is paid for.`;
  if (idle.length && spend > 0) pay += ` You held the budget back in quarter ${idle.join(" and ")} — the right call whenever nothing on the menu pays back.`;
  cards.push({ id: "payback", title: "Payback depends on the time left", body: pay });

  return cards;
}

/* ---- export (assessable artifact) --------------------------- */
function buildCSV(records, cfg) {
  const head = ["quarter", "predicted_leak", "actual_biggest_leak", "leak_correct", "predicted_best_bet", "best_bet_actual", "best_bet_correct",
    "allocations", "spend", "purchases", "revenue", "profit_after_spend", "cac", "ltv_cac", "spend_not_paid_back_by_plan_end"];
  const q = (v) => JSON.stringify(String(v));
  const rows = records.map((r) => [
    r.quarter, q(stageLabel(r.predLeak)), q(stageLabel(r.actualLeak)), r.leakCorrect, q(fixLabel(r.predBest)), q(fixLabel(r.bestActual)), r.roiCorrect,
    q(r.allocations.join("; ")), r.spend, Math.round(r.purchases), Math.round(r.revenue), Math.round(r.grossProfit),
    r.cac ? r.cac.toFixed(2) : "n/a", r.ltvCac != null ? r.ltvCac.toFixed(2) : "n/a", Math.round(r.notPaidBack),
  ]);
  return [head.join(","), ...rows.map((row) => row.join(","))].join("\n") + `\n# seed,${cfg.seed},budget,${cfg.budget},quarters,${cfg.quarters}`;
}
function buildMarkdown(records, cfg, cumProfit) {
  const leakHits = records.filter((r) => r.leakCorrect).length;
  const roiHits = records.filter((r) => r.roiCorrect).length;
  let md = `# Funnel Fixer — Diagnosis Log (Chrichton)\n\n`;
  md += `**Seed:** \`${cfg.seed}\`  ·  **Budget/quarter:** ${gbp(cfg.budget)}  ·  **Quarters:** ${records.length}\n\n`;
  md += `**Total profit after spend:** ${gbp(cumProfit)}.  **Predictions:** biggest money leak ${leakHits}/${records.length}; best bet ${roiHits}/${records.length}.\n\n`;
  md += `| Q | Predicted leak | Actual | Right? | Bought | Spend | Purchases | Profit after spend | CAC | LTV/CAC | Spend not paid back by plan end |\n`;
  md += `|---|---|---|---|---|---|---|---|---|---|---|\n`;
  records.forEach((r) => {
    md += `| ${r.quarter} | ${stageLabel(r.predLeak)} | ${stageLabel(r.actualLeak)} | ${r.leakCorrect ? "yes" : "no"} | ${r.allocations.join(", ") || "nothing"} | ${gbp(r.spend)} | ${Math.round(r.purchases)} | ${gbp(r.grossProfit)} | ${r.cac ? gbp(r.cac) : "—"} | ${r.ltvCac != null ? r.ltvCac.toFixed(1) : "—"} | ${gbp(r.notPaidBack)} |\n`;
  });
  md += `\n## What the run showed\n\n`;
  buildDebrief(records, cfg).forEach((c) => { md += `**${c.title}.** ${c.body}\n\n`; });
  md += `## Reflection prompts\n\n`;
  md += `1. Did you size each stage's leak in money before spending — and where did your read differ from the sizing?\n`;
  md += `2. Which purchase returned most and least per £ over the plan, and why (headroom left at that stage, volume, a margin cut, how many quarters it had to earn)?\n`;
  md += `3. If you bought traffic: what did each bought customer cost against their lifetime value, and how did that change as the funnel improved?\n`;
  md += `4. After each fix, where did the biggest leak move to — and did your next quarter's spending follow it?\n`;
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
  bottleneck: "The stage losing the most money against its benchmark right now. It is not always the stage with the biggest percentage-point gap.",
  theoryofconstraints: "Fix the tightest bottleneck and the next stage becomes the new bottleneck. So your second round of fixes should target a different stage than the first.",
  leakybucket: "Buying more traffic before you fix conversion just sends more visitors through the same leaks. Cost per customer (CAC) rises and ROI falls.",
  cac: "Customer acquisition cost — acquisition spend ÷ customers acquired. Only worth it if LTV clears it.",
  ltv: "Lifetime value — the gross profit a customer brings over time: AOV × margin × (1 + repeat factor).",
  ltvcac: "LTV ÷ CAC. A rough rule of thumb is healthy ≥ 3: every £1 of acquisition returns £3 of lifetime value.",
  ceiling: "Best-in-class: the realistic maximum for a stage's rate. A fix closes part of the headroom between today's rate and this maximum, so a stage near it has little left to gain.",
  payback: "How long a purchase takes to earn back its cost. A one-off fix keeps earning every quarter it is in place; bought traffic earns only in the quarter you pay for it.",
  planreturn: "Return over the plan — the extra profit a purchase earns from now to the last quarter, divided by its cost, holding everything else as it is. Above 1× it has paid for itself by the end.",
  diminishing: "Stacking interventions on one stage returns less each time — each new fix closes a fraction of the shrinking remaining gap.",
  aov: "Average order value — the average revenue per purchase.",
  grossmargin: "The share of revenue left after the cost of goods. Free-shipping and discounts cut it.",
  repeatfactor: "How much extra value a customer brings from repeat purchases, on top of their first order.",
  roi: "Return on investment — the extra profit a purchase produced ÷ what it cost. Always ask over what period: here it is shown for the quarter and over the rest of the plan.",
  cro: "Conversion rate optimisation (CRO) — increasing the share of visitors who complete the goal, by finding and fixing what stops them.",
  pp: "Percentage points — the plain difference between two percentages. Going from 8% to 6% is 2 percentage points (2pp), even though it is a 25% relative fall.",
  benchmark: "The rate a typical well-run store of this type achieves at a stage — the target you diagnose against. Best-in-class stores do better still.",
};

export {
  clamp, gbp, gbpK, pct, pp, mulberry32, makeRng, noiseFactor,
  STAGES, STAGE_KEYS, DEFAULT_CFG, INTERVENTIONS, IMAP, initialState,
  purchasesFor, marginPerOrder, applyRates, sessionsFor, leaks, bottleneckOf, biggestGapOf, volumes,
  quartersLeft, actsOn, NONE, leakAnswer, bestBets, stageLabel, fixLabel, buildRecord, buildDebrief,
  profitExclSpend, resolveQuarter, previewSingles, GLOSSARY,
  buildCSV, buildMarkdown, downloadFile,
};
