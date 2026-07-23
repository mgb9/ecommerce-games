/* ============================================================
   MARKETPLACE TYCOON — pure game engine (no React, no I/O).
   resolveRound() is the deterministic, seeded "server tick":
   all randomness flows through `rng` (mulberry32 + makeRng),
   so the same seed + same decisions always produce the same
   result. Kept dependency-free and isomorphic so it runs
   identically in the browser (single-player) and, later, on a
   PartyKit server (multiplayer).
   ============================================================ */
const COMPETITORS = [
  { id: "carl",   name: "Cut-Throat Carl",  color: "#E8657F", blurb: "Wins on price, bleeds on margin." },
  { id: "aisha",  name: "Adwave Aisha",     color: "#9B7BD4", blurb: "Buys visibility at the auction." },
  { id: "quinn",  name: "Quality Quinn",    color: "#3FB6A8", blurb: "Builds a review moat, charges for it." },
  { id: "bailey", name: "Balanced Bailey",  color: "#A8C24A", blurb: "Copies whoever's winning." },
];

/* ---- CLIENT-BRIEF SCENARIOS (the module's framing) ---------- */
const SCENARIOS = [
  { id: "fashion", name: "Fast-Fashion Retailer", short: "Fashion", icon: "👗", product: "garments",
    brief: "High-volume trend retail. Demand spikes and crashes with the trends, margins are thin, and a lot of what you sell comes back.",
    unitCost: 9, priceMin: 14, priceMax: 45, demandBase: 1300, growth: 1.03, volatility: 0.22,
    holdingPerUnit: 0.7, returnRate: 0.28, returnHandling: 3.5, mobileShare: 0.75, adResponse: 1.25, organicReliance: 0.0, digital: false,
    teach: "Returns and trend volatility punish overstock; mobile UX and fast fulfilment matter most." },
  { id: "grocer", name: "Perishable Grocer", short: "Grocer", icon: "🥬", product: "fresh produce",
    brief: "Steady local demand with very small profit margins. Unsold stock spoils, and running out sends shoppers to a rival permanently.",
    unitCost: 6, priceMin: 8, priceMax: 18, demandBase: 1500, growth: 1.01, volatility: 0.08,
    holdingPerUnit: 2.4, returnRate: 0.02, returnHandling: 1, mobileShare: 0.5, adResponse: 0.9, organicReliance: 0.2, digital: false,
    teach: "Spoilage makes overstock brutal and stockouts costly — reliability and tight inventory win." },
  { id: "b2b", name: "B2B Industrial Parts", short: "B2B", icon: "⚙️", product: "industrial components",
    brief: "Low-volume, high-value orders to professional buyers who research before they buy. Trust and findability beat flashy ads.",
    unitCost: 55, priceMin: 80, priceMax: 200, demandBase: 280, growth: 1.02, volatility: 0.07,
    holdingPerUnit: 0.4, returnRate: 0.05, returnHandling: 8, mobileShare: 0.3, adResponse: 0.7, organicReliance: 0.5, digital: false,
    teach: "Reviews, trust signals and organic/SEO matter more than paid reach; AOV is high, volume low." },
  { id: "digital", name: "Digital Downloads", short: "Digital", icon: "💾", product: "software licences",
    brief: "Software and media with near-zero unit cost and unlimited inventory — but price-sensitive buyers and no second chance at a clunky checkout.",
    unitCost: 1, priceMin: 9, priceMax: 60, demandBase: 950, growth: 1.04, volatility: 0.16,
    holdingPerUnit: 0, returnRate: 0.04, returnHandling: 0.5, mobileShare: 0.6, adResponse: 1.1, organicReliance: 0.3, digital: true,
    teach: "No stock or fulfilment constraint — checkout UX and pricing dominate; margins are huge, so acquisition is everything." },
];
const SCMAP = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]));
function SC(cfg) { return SCMAP[cfg.scenarioId] || SCENARIOS[0]; }

/* ---- FULFILMENT (operations) -------------------------------- */
const FULFILMENT = [
  { id: "inhouse", name: "In-house fulfilment", short: "In-house", icon: "🏠",
    perUnitCost: 1.5, holdingMult: 1.0, stockMult: 1.0, deliveryConv: 1.0, returnMod: 1.0, marginCut: 0, fixed: 0,
    blurb: "You pick, pack and ship. Full control and moderate cost, but no scale cushion when demand spikes." },
  { id: "3pl", name: "3PL (outsourced logistics)", short: "3PL", icon: "🏭",
    perUnitCost: 2.6, holdingMult: 0.7, stockMult: 1.15, deliveryConv: 1.04, returnMod: 0.95, marginCut: 0, fixed: 150,
    blurb: "A logistics partner ships for you — faster and scalable, at a higher per-unit cost plus a weekly fee." },
  { id: "dropship", name: "Dropshipping", short: "Dropship", icon: "📦",
    perUnitCost: 0, holdingMult: 0, stockMult: 99, deliveryConv: 0.9, returnMod: 1.25, marginCut: 0.18, fixed: 0, infiniteStock: true,
    blurb: "Supplier ships direct — no stock risk and unlimited inventory, but slower delivery, more returns, and the supplier takes a margin cut." },
];
const FMAP = Object.fromEntries(FULFILMENT.map((f) => [f.id, f]));
const DIGITAL_FULFIL = { id: "digital", name: "Digital delivery", short: "Digital", icon: "⬇️",
  perUnitCost: 0, holdingMult: 0, stockMult: 99, deliveryConv: 1.0, returnMod: 1.0, marginCut: 0, fixed: 0, infiniteStock: true,
  blurb: "Instant electronic delivery — no logistics, no stock, no shipping." };
function fulfilOf(store, sc) { return sc.digital ? DIGITAL_FULFIL : (FMAP[store.fulfilId] || FMAP.inhouse); }

/* ---- CRO LEVERS (decomposed conversion) --------------------- */
const CRO_LEVERS = [
  { id: "speed", name: "Page speed", icon: "⚡", desc: "Faster load = fewer drop-offs on every device.",
    loLift: 0.010, hiLift: 0.050, cost: [450, 650, 900] },
  { id: "trust", name: "Trust signals", icon: "🛡️", desc: "Reviews, badges, social proof (Cialdini) — lifts conversion and trims returns.",
    loLift: 0.015, hiLift: 0.060, cost: [550, 800, 1100] },
  { id: "checkout", name: "Checkout flow", icon: "🛒", desc: "Guest checkout, fewer steps, more payment options — cuts cart abandonment.",
    loLift: 0.020, hiLift: 0.070, cost: [600, 850, 1150] },
  { id: "mobile", name: "Mobile UX", icon: "📱", desc: "Mobile-optimized — matters more the more mobile your traffic.",
    loLift: 0.020, hiLift: 0.080, cost: [500, 750, 1000] },
];
const CMAP = Object.fromEntries(CRO_LEVERS.map((l) => [l.id, l]));
const BOT_TIER_LIFT = 0.03;
const BOT_CRO_PLAN = {
  quinn: { order: ["trust", "speed", "mobile", "checkout"], rate: 1.4 },
  aisha: { order: ["checkout", "speed", "trust", "mobile"], rate: 2.2 },
  carl: { order: ["checkout"], rate: 4 },
  bailey: { order: ["speed", "checkout", "trust", "mobile"], rate: 2.0 },
};
function botCro(id, round) {
  const plan = BOT_CRO_PLAN[id] || { order: [], rate: 3 };
  let gained = Math.floor((round - 1) / plan.rate);
  const lv = { speed: 0, trust: 0, checkout: 0, mobile: 0 };
  let i = 0;
  while (gained > 0 && plan.order.length && i < 60) {
    const lever = plan.order[i % plan.order.length];
    if (lv[lever] < 3) { lv[lever]++; gained--; }
    i++;
  }
  return lv;
}
function botCroCost(id, round) {
  const lv = botCro(id, round);
  return (lv.speed + lv.trust + lv.checkout + lv.mobile) * 50;
}
function rollCroLifts(seed) {
  const rng = makeRng(seed + ":cro");
  const out = {};
  CRO_LEVERS.forEach((l) => { out[l.id] = [0, 1, 2].map(() => +(l.loLift + rng() * (l.hiLift - l.loLift)).toFixed(4)); });
  return out;
}
function croConvOf(levels, isPlayer, lifts, sc) {
  let mult = 1;
  CRO_LEVERS.forEach((l) => {
    const tier = levels[l.id] || 0;
    for (let t = 1; t <= tier; t++) {
      let lift = isPlayer && lifts ? lifts[l.id][t - 1] : BOT_TIER_LIFT;
      if (l.id === "mobile") lift *= sc.mobileShare;
      mult += lift;
    }
  });
  return mult;
}
function croQualityOf(levels, isPlayer, lifts, sc) {
  return clamp((croConvOf(levels, isPlayer, lifts, sc) - 1) / 0.28, 0, 1);
}

const PLATFORMS = [
  { id: "wix", name: "Wix / Squarespace", short: "Wix", tag: "Entry SaaS", ceiling: 1,
    fixedCost: 120, txnFee: 0.02, conv: 0.96, adEff: 0.88, rampWeeks: 1, variance: 0, organicBonus: 0,
    blurb: "Cheapest and instant — but templated, so your spend hits a low ceiling.",
    pros: ["Instant launch", "Lowest weekly cost"], cons: ["Low ceiling on spend", "Hard to differentiate"],
    lesson: "Wix got you live instantly at rock-bottom cost, but its low ceiling capped how far your spend could go. Fine to validate; a constraint at scale." },
  { id: "shopify", name: "Shopify", short: "Shopify", tag: "Hosted SaaS", ceiling: 2,
    fixedCost: 320, txnFee: 0.02, conv: 1.05, adEff: 1.0, rampWeeks: 1, variance: 0, organicBonus: 0,
    blurb: "Reliable and high-converting from day one. You rent that convenience via monthly + transaction fees.",
    pros: ["Fast launch", "Strong out-of-box conversion"], cons: ["Monthly + transaction fees", "Moderate ceiling"],
    lesson: "Shopify gave reliable conversion from week one with no build risk — paid for in fees. The pragmatic default, rarely cheapest at scale." },
  { id: "woo", name: "WooCommerce", short: "WooCommerce", tag: "Self-hosted · WordPress", ceiling: 3,
    fixedCost: 160, txnFee: 0, conv: 0.99, adEff: 1.05, rampWeeks: 2, variance: 0.05, organicBonus: 300,
    blurb: "Cheap, flexible and strong on organic reach — but you own the ops, and a bit of variance comes with that.",
    pros: ["Low cost & flexible", "Content / SEO organic edge"], cons: ["You own the ops (variance)", "Short setup ramp"],
    lesson: "WooCommerce kept costs low with an organic-reach edge, at the price of owning the ops. Build-vs-buy tilted toward build." },
  { id: "headless", name: "Headless / Composable", short: "Headless", tag: "Custom · API-first", ceiling: 4,
    fixedCost: 650, txnFee: 0, conv: 1.12, adEff: 1.18, rampWeeks: 5, variance: 0, organicBonus: 0,
    blurb: "The highest ceiling — spend works hardest here. But expensive, and slow to build before it pays off.",
    pros: ["Highest performance ceiling", "Spend compounds at scale"], cons: ["Expensive every week", "Slow to mature"],
    lesson: "Headless cost you money and time for weeks before its higher limit paid off: a slow start, then it pulls ahead. Only worth it if you survive long enough to reach that point." },
];
const PMAP = Object.fromEntries(PLATFORMS.map((p) => [p.id, p]));

const DEFAULT_CFG = {
  commissionRate: 0.15, organicReach: 250, maxRounds: 10,
  weights: { price: 0.45, review: 0.30, ad: 0.25 }, reviewInertia: 0.35,
  platforms: Object.fromEntries(PLATFORMS.map((p) => [p.id, { fixedCost: p.fixedCost }])),
  txnAddon: 0, seed: "WMG-2026", eventsOn: true, startingCash: 4500,
  scenarioId: "fashion", demandMult: 1, holdingMult: 1,
};

const EVENT_CALENDAR = {
  3: { title: "Supplier squeeze", icon: "📦", unitCostMult: 1.6, desc: "Unit cost jumps 60% this week. Reprice to protect margin, or absorb the hit." },
  5: { title: "Viral moment", icon: "🚀", demandMult: 1.8, desc: "This product type is suddenly popular — demand rises 80%. Having stock is a big win; running out wastes the opportunity." },
  7: { title: "Bargain season", icon: "🏷️", weights: { price: 0.65, review: 0.20, ad: 0.15 }, desc: "Shoppers turn deal-hungry — price dominates the ranking this week." },
  9: { title: "Trust wave", icon: "🛡️", weights: { price: 0.30, review: 0.50, ad: 0.20 }, desc: "A scam scandal makes buyers cautious — reviews dominate this week." },
};
function eventFor(round, cfg) { return cfg.eventsOn ? (EVENT_CALENDAR[round] || null) : null; }

const GLOSSARY = {
  contribution: "What's left from each sale after item cost and platform fees — the money that covers ads, CRO and platform costs, then becomes profit.",
  cogs: "Cost of Goods Sold — what each unit costs you (product + fulfilment) before any sale.",
  commission: "The marketplace's cut of every sale: rent for access to its customers.",
  regulars: "Returning customers who come back without you paying again to win them. Their lifetime value (LTV) makes retention far cheaper than constant acquisition.",
  workingcapital: "The cash on hand to fund spending before revenue arrives. Run out and you're insolvent — even while profitable on paper.",
  newsvendor: "The stocking trade-off: too little stock and you miss sales; too much and you pay storage (or spoilage) costs.",
  insolvent: "Out of cash to pay your bills — where a profitable-looking store can still fail.",
  cro: "Conversion Rate Optimization — improving the share of visitors who actually buy, via speed, trust, checkout and mobile UX.",
  ltv: "Lifetime value (LTV) — the total profit a customer brings over time, not just from their first order. Loyal regulars keep buying without new ad spend.",
  abtest: "Running a controlled experiment to measure a change's true effect before rolling it out — so you don't bet budget on a redesign that doesn't work.",
  returns: "Goods sent back by buyers. You refund the sale but still paid to ship and handle them — brutal on thin-margin, high-return categories like fashion.",
};

const KEEP_BASE = 0.78, STOCKOUT_KEEP_PEN = 0.30, LOYAL_FRAC_MAX = 0.30;
const PLAYER_COLOR = "#009DDC";
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const gbp = (n) => "£" + Math.round(n).toLocaleString("en-GB");

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeRng(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return mulberry32(h >>> 0);
}
function getPlatform(cfg, id) {
  const base = PMAP[id];
  if (!base) return base;
  const liveFixed = cfg && cfg.platforms && cfg.platforms[id] ? cfg.platforms[id].fixedCost : undefined;
  return { ...base, fixedCost: liveFixed != null ? liveFixed : base.fixedCost, txnFee: base.txnFee + (cfg && cfg.txnAddon ? cfg.txnAddon : 0) };
}

function makeStore(id, name, color, isPlayer, platformId, fulfilId, startingCash, scenario, croLifts, decision) {
  return { id, name, color, isPlayer, platformId, fulfilId,
    review: 3.0, cumProfit: 0, cash: startingCash, loyalBase: 0, insolvent: false,
    cro: { speed: 0, trust: 0, checkout: 0, mobile: 0 }, croLifts: croLifts || null, croSpendThisWeek: 0, croTested: {},
    decision: decision || { price: Math.round((scenario.priceMin + scenario.priceMax) / 2), ad: 400, stock: Math.round(scenario.demandBase / 3) },
    last: null, history: [] };
}
function initialStores(playerName, playerPlatformId, playerFulfilId, startingCash, scenario, seed) {
  const lifts = rollCroLifts(seed);
  const player = makeStore("you", playerName || "Your Store", PLAYER_COLOR, true, playerPlatformId, playerFulfilId, startingCash, scenario, lifts);
  const botPlatform = { carl: "woo", aisha: "shopify", quinn: "headless", bailey: "wix" };
  const botFulfil = { carl: scenario.id === "grocer" ? "inhouse" : "dropship", aisha: "3pl", quinn: "inhouse", bailey: "3pl" };
  const bots = COMPETITORS.map((c) => makeStore(c.id, c.name, c.color, false, botPlatform[c.id], botFulfil[c.id], startingCash, scenario, null));
  return [player, ...bots];
}

function maturityOf(p, round) { return !p || p.rampWeeks <= 1 ? 1 : clamp((round - 1) / (p.rampWeeks - 1), 0, 1); }
function platMods(p, round, rng) {
  const mat = maturityOf(p, round);
  const lerp = (b) => 1 + (b - 1) * mat;
  let conv = lerp(p.conv);
  if (p.variance) conv *= 1 + (rng() - 0.5) * 2 * p.variance;
  return { mat, conv, adEff: lerp(p.adEff), organic: p.organicBonus || 0, fixedCost: p.fixedCost, txnFee: p.txnFee };
}

function botDecide(store, stats, round, cfg, rng, sc) {
  if (store.insolvent) return { price: Math.round((sc.priceMin + sc.priceMax) / 2), ad: 0, stock: Math.round(sc.demandBase / 8) };
  const r = rng;
  const jitter = (x, pct) => x * (1 + (r() - 0.5) * 2 * pct);
  const lo = sc.priceMin, hi = sc.priceMax, span = hi - lo;
  const ownForecast = store.last ? store.last.demandUnits : stats.lastTotalDemand / 5;
  const stockFor = clamp(Math.round(jitter(ownForecast * 1.08, 0.1)), 20, sc.digital ? 99999 : Math.round(sc.demandBase * 1.2));
  switch (store.id) {
    case "carl":
      return { price: clamp(Math.round(jitter(lo + span * 0.15, 0.08)), lo, lo + span * 0.4), ad: clamp(Math.round(jitter(220, 0.3)), 0, 600), stock: stockFor };
    case "aisha":
      return { price: clamp(Math.round(jitter(lo + span * 0.45, 0.06)), lo, hi), ad: clamp(Math.round(jitter(1750, 0.18)), 800, 2500), stock: stockFor };
    case "quinn":
      return { price: clamp(Math.round(jitter(lo + span * 0.75, 0.06)), lo + span * 0.45, hi), ad: clamp(Math.round(jitter(280, 0.3)), 0, 600), stock: stockFor };
    case "bailey": {
      const L = stats.leaderDecision || { price: lo + span * 0.5, ad: 600 };
      return { price: clamp(Math.round(jitter(L.price, 0.08)), lo, hi), ad: clamp(Math.round(jitter(L.ad, 0.2)), 0, 2500), stock: stockFor };
    }
    default: return store.decision;
  }
}

// ---- THE SERVER TICK (seeded, pure) -------------------------
function resolveRound(stores, round, cfg, rng) {
  const sc = SC(cfg);
  const ev = eventFor(round, cfg);
  const weights = ev && ev.weights ? ev.weights : cfg.weights;
  const unitCostBase = sc.unitCost * (ev && ev.unitCostMult ? ev.unitCostMult : 1);
  const demandMult = (ev && ev.demandMult ? ev.demandMult : 1) * cfg.demandMult;
  const volWobble = 1 + (rng() - 0.5) * 2 * sc.volatility;
  const totalNewPool = sc.demandBase * Math.pow(sc.growth, round - 1) * demandMult * volWobble;
  const holdingUnit = sc.holdingPerUnit * cfg.holdingMult;

  const ctx = stores.map((s) => {
    const plat = getPlatform(cfg, s.platformId);
    const ful = fulfilOf(s, sc);
    const mods = platMods(plat, round, rng);
    const croLevels = s.isPlayer ? s.cro : botCro(s.id, round);
    const croConv = croConvOf(croLevels, s.isPlayer, s.croLifts, sc);
    const croQual = croQualityOf(croLevels, s.isPlayer, s.croLifts, sc);
    return { plat, ful, mods, croLevels, croConv, croQual };
  });

  const reach = stores.map((s, i) => s.decision.ad * ctx[i].mods.adEff + cfg.organicReach + ctx[i].mods.organic + sc.organicReliance * 400);
  const avgReach = reach.reduce((a, b) => a + b, 0) / reach.length;

  const scores = stores.map((s, i) => {
    const d = s.decision; const c = ctx[i];
    const priceComp = clamp((sc.priceMax - d.price) / (sc.priceMax - sc.priceMin), 0, 1);
    const reviewNorm = s.review / 5;
    const adTerm = (reach[i] / avgReach) * sc.adResponse;
    const convMult = c.mods.conv * c.croConv * c.ful.deliveryConv;
    const raw = (weights.price * priceComp + weights.review * reviewNorm + weights.ad * adTerm) * convMult;
    return Math.max(0.02, raw);
  });
  const scoreSum = scores.reduce((a, b) => a + b, 0);

  const next = stores.map((s, i) => {
    const d = s.decision; const c = ctx[i]; const ful = c.ful;
    const share = scores[i] / scoreSum;
    const newCustomers = share * totalNewPool;
    const returning = s.loyalBase;
    const demandUnits = returning + newCustomers;
    const effStock = ful.infiniteStock ? Infinity : d.stock * ful.stockMult;
    const grossSold = Math.min(demandUnits, effStock);
    const lostSales = Math.max(0, demandUnits - effStock);
    const unsold = ful.infiniteStock ? 0 : Math.max(0, effStock - grossSold);
    const returningServed = Math.min(returning, grossSold);

    // returns (trust + checkout CRO reduce them)
    const croReturnCut = (c.croLevels.trust / 3) * 0.06 + (c.croLevels.checkout / 3) * 0.04;
    const effReturnRate = clamp(sc.returnRate * ful.returnMod - croReturnCut, 0, 0.6);
    const returnedUnits = grossSold * effReturnRate;
    const keptSales = grossSold - returnedUnits;

    const unitCostTotal = unitCostBase + ful.perUnitCost;
    const revenue = keptSales * d.price;
    const cogs = grossSold * unitCostTotal;
    const returnHandling = returnedUnits * sc.returnHandling;
    const commission = revenue * cfg.commissionRate;
    const platformTxn = revenue * c.mods.txnFee;
    const dropshipCut = revenue * (ful.marginCut || 0);
    const fixed = c.mods.fixedCost + (ful.fixed || 0);
    const holding = unsold * holdingUnit;
    const croCost = s.isPlayer ? (s.croSpendThisWeek || 0) : botCroCost(s.id, round);
    const profit = revenue - cogs - returnHandling - commission - platformTxn - dropshipCut - fixed - holding - d.ad - croCost;

    const cashAfter = s.cash + profit;
    const insolvent = s.insolvent || cashAfter < 0;

    let target = 2.5 + c.croQual * 2.5;
    const stockoutSeverity = demandUnits > 0 ? lostSales / demandUnits : 0;
    target -= stockoutSeverity * 1.2 + effReturnRate * 1.5;
    target = clamp(target, 1, 5);
    const review = clamp(s.review + cfg.reviewInertia * (target - s.review), 1, 5);

    const loyalFrac = clamp((review - 2.5) / 2.5, 0, 1) * LOYAL_FRAC_MAX;
    const newLoyal = keptSales * loyalFrac;
    const keep = clamp(KEEP_BASE - stockoutSeverity * STOCKOUT_KEEP_PEN, 0.4, 0.9);
    const loyalBase = clamp(s.loyalBase * keep + newLoyal, 0, 1e7);

    const result = { round, share, demandUnits, newCustomers, returning, returningServed,
      grossSold, keptSales, returnedUnits, lostSales, unsold, revenue, cogs, returnHandling,
      commission, platformTxn, dropshipCut, fixed, holding, croCost, profit, cashAfter,
      maturity: c.mods.mat,
      price: d.price, ad: d.ad, stock: d.stock, croConv: c.croConv, event: ev ? ev.title : null };

    return { ...s, review, cumProfit: s.cumProfit + profit, cash: cashAfter, insolvent, loyalBase,
      croSpendThisWeek: s.isPlayer ? 0 : s.croSpendThisWeek,
      last: result,
      history: [...s.history, { round, event: ev ? ev.title : "", price: d.price, ad: d.ad, stock: d.stock,
        croConv: +c.croConv.toFixed(3), sold: Math.round(keptSales), returns: Math.round(returnedUnits),
        returning: Math.round(returningServed), revenue, commission, platformCost: fixed + platformTxn + dropshipCut,
        croCost, profit, cumProfit: s.cumProfit + profit, cash: cashAfter, review: +review.toFixed(2),
        loyalBase: Math.round(loyalBase), share }] };
  });

  return { stores: next, log: commentary(next, round, cfg) };
}

function commentary(stores, round, cfg) {
  const ev = eventFor(round, cfg);
  const platformTake = stores.reduce((a, s) => a + s.last.commission, 0);
  const totalReturns = stores.reduce((a, s) => a + s.last.returnedUnits, 0);
  const stockedOut = stores.filter((s) => s.last.lostSales > 5);
  const cheapest = [...stores].sort((a, b) => a.last.price - b.last.price)[0];
  const topSeller = [...stores].sort((a, b) => b.last.keptSales - a.last.keptSales)[0];
  const broke = stores.filter((s) => s.insolvent);
  const sc = SC(cfg);
  const lines = [];
  if (ev) lines.push(`${ev.icon} ${ev.title}: ${ev.desc}`);
  lines.push(`The marketplace took ${gbp(platformTake)} in commission. ${Math.round(topSeller.last.keptSales)} ${sc.product} sold most by ${topSeller.name}.`);
  if (totalReturns > 10) lines.push(`${Math.round(totalReturns)} units came back as returns across the market — refunded, but already shipped and handled.`);
  if (cheapest.last.price <= sc.priceMin + (sc.priceMax - sc.priceMin) * 0.15) lines.push(`${cheapest.name} is racing prices to the floor at ${gbp(cheapest.last.price)}.`);
  if (stockedOut.length) lines.push(`${stockedOut.map((s) => s.name.split(" ").slice(-1)).join(", ")} stocked out — losing sales and churning regulars.`);
  if (broke.length) lines.push(`${broke.map((s) => s.name.split(" ").slice(-1)).join(", ")} ran out of cash and are trading insolvent.`);
  return lines;
}
function leaderDecisionOf(stores) {
  const led = [...stores].sort((a, b) => b.cumProfit - a.cumProfit)[0];
  return led ? led.decision : null;
}

// ---- export -------------------------------------------------
function rankAtWeek(stores, i) {
  return stores.map((s) => ({ id: s.id, c: s.history[i] ? s.history[i].cumProfit : 0 })).sort((a, b) => b.c - a.c);
}
function buildCSV(stores, player, predictionLog) {
  const head = ["week", "event", "price", "ad_spend", "cro_conv_mult", "stock", "units_sold", "returns",
    "returning", "revenue", "marketplace_fee", "platform_cost", "cro_spend", "weekly_profit",
    "cumulative_profit", "cash", "review", "regulars", "rank", "predicted_rank"];
  const rows = player.history.map((h, i) => {
    const rank = rankAtWeek(stores, i).findIndex((o) => o.id === "you") + 1;
    const pred = predictionLog.find((p) => p.round === h.round);
    return [h.round, h.event || "", h.price, h.ad, h.croConv, h.stock, h.sold, h.returns, h.returning,
      Math.round(h.revenue), Math.round(h.commission), Math.round(h.platformCost), Math.round(h.croCost),
      Math.round(h.profit), Math.round(h.cumProfit), Math.round(h.cash), h.review, h.loyalBase, rank, pred ? pred.predicted : ""];
  });
  return [head.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
function buildMarkdown(stores, player, predictionLog, cfg) {
  const plat = PMAP[player.platformId]; const sc = SC(cfg); const ful = fulfilOf(player, sc);
  const hits = predictionLog.filter((p) => p.hit).length;
  let md = `# Marketplace Tycoon — Decision Log\n\n`;
  md += `**Brief:** ${sc.name}  ·  **Store:** ${player.name}\n\n`;
  md += `**Platform:** ${plat.name}  ·  **Fulfilment:** ${ful.name}  ·  **Market seed:** ${cfg.seed}\n\n`;
  md += `**Final cumulative profit:** ${gbp(player.cumProfit)}  ·  **Final cash:** ${gbp(player.cash)}`;
  md += player.insolvent ? `  ·  ⚠️ *traded insolvent*\n\n` : `\n\n`;
  md += `**Prediction calibration:** ${hits}/${predictionLog.length} weekly ranks called correctly.\n\n`;
  md += `| Wk | Event | Price | Ad | CRO× | Stock | Sold | Ret | Profit | Cum | Cash | ★ |\n`;
  md += `|----|-------|-------|----|------|-------|------|-----|--------|-----|------|---|\n`;
  player.history.forEach((h) => {
    md += `| ${h.round} | ${h.event || "—"} | ${gbp(h.price)} | ${gbp(h.ad)} | ${h.croConv} | ${h.stock} | ${h.sold} | ${h.returns} | ${gbp(h.profit)} | ${gbp(h.cumProfit)} | ${gbp(h.cash)} | ${h.review} |\n`;
  });
  md += `\n## Reflection prompts\n\n`;
  md += `1. How well did your platform, fulfilment and CRO choices fit the **${sc.name}** brief? What would a better-fitted strategy have looked like?\n`;
  md += `2. Which CRO investments paid off, and which didn't? Where did A/B testing change your decision?\n`;
  md += `3. Look at your returns and regulars over time — did retention or paid acquisition drive more profit, and which cost more?\n`;
  md += `4. Where did your rank predictions miss, and what did that reveal about your model of the market or competitors?\n`;
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

export {
  COMPETITORS, SCENARIOS, SCMAP, SC, FULFILMENT, FMAP, DIGITAL_FULFIL, fulfilOf,
  CRO_LEVERS, CMAP, BOT_TIER_LIFT, BOT_CRO_PLAN, botCro, botCroCost, rollCroLifts,
  croConvOf, croQualityOf, PLATFORMS, PMAP, DEFAULT_CFG, EVENT_CALENDAR, eventFor,
  GLOSSARY, KEEP_BASE, STOCKOUT_KEEP_PEN, LOYAL_FRAC_MAX, PLAYER_COLOR, clamp, gbp,
  mulberry32, makeRng, getPlatform, makeStore, initialStores, maturityOf, platMods,
  botDecide, resolveRound, commentary, leaderDecisionOf, rankAtWeek,
  buildCSV, buildMarkdown, downloadFile,
};
