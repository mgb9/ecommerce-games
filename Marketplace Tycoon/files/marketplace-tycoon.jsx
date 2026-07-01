import React, { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from "recharts";

/* ============================================================
   MARKETPLACE TYCOON — an e-commerce teaching simulation (WM956)
   resolveRound() is the pure, seeded "server tick" (PartyKit-ready).
   Layers: client-brief SCENARIOS, storefront platform (build-vs-buy,
   instructor-tunable pricing), decomposed CRO with A/B testing,
   fulfilment & returns operations, retention/LTV, working capital
   & insolvency, seasonal events, deterministic markets,
   predict-then-reveal, ESL glossary, and decision-log export.
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
    brief: "Steady local demand at razor-thin margins. Unsold stock spoils, and running out sends shoppers to a rival for good.",
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
    lesson: "Headless asked you to burn cash and patience for weeks before its ceiling paid off — slow start, then separation. Only worth it if you survive to maturity." },
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
  5: { title: "Viral moment", icon: "🚀", demandMult: 1.8, desc: "The category is trending — demand surges 80%. In stock is a jackpot; stocked out wastes the spotlight." },
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
  newsvendor: "The stocking trade-off: too little and you miss sales; too much and you eat holding (or spoilage) costs.",
  insolvent: "Out of cash to pay your bills — where a profitable-looking store can still fail.",
  cro: "Conversion Rate Optimization — improving the share of visitors who actually buy, via speed, trust, checkout and mobile UX.",
  abtest: "Running a controlled experiment to measure a change's true effect before rolling it out — so you don't bet budget on a redesign that doesn't work.",
  returns: "Goods sent back by buyers. You refund the sale but still paid to ship and handle them — brutal on thin-margin, high-return categories like fashion.",
};

const KEEP_BASE = 0.78, STOCKOUT_KEEP_PEN = 0.30, LOYAL_FRAC_MAX = 0.30;
const PLAYER_COLOR = "#F2A93B";
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const gbp = (n) => "£" + Math.round(n).toLocaleString("en-GB");
const gbp0 = (n) => "£" + Math.round(n).toLocaleString("en-GB");

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
  if (p.variance) conv *= 1 + ((rng ? rng() : Math.random()) - 0.5) * 2 * p.variance;
  return { mat, conv, adEff: lerp(p.adEff), organic: p.organicBonus || 0, fixedCost: p.fixedCost, txnFee: p.txnFee };
}

function botDecide(store, stats, round, cfg, rng, sc) {
  if (store.insolvent) return { price: Math.round((sc.priceMin + sc.priceMax) / 2), ad: 0, stock: Math.round(sc.demandBase / 8) };
  const r = () => (rng ? rng() : Math.random());
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
      maturity: c.mods.maturity != null ? c.mods.maturity : c.mods.mat, mat: c.mods.mat,
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

/* ============================================================ UI ============================================================ */
const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');
`;
const T = {
  ink: "#14110D", panel: "#1F1A13", panel2: "#272015", border: "#3A3022",
  text: "#F0E9DC", muted: "#A99E8B", pos: "#7DCB6A", neg: "#E2654E", platform: "#C9A06A",
  display: "'Bricolage Grotesque', sans-serif", body: "'Hanken Grotesk', sans-serif", mono: "'JetBrains Mono', monospace",
};

function Term({ term, children }) {
  const [open, setOpen] = useState(false);
  const def = GLOSSARY[term];
  if (!def) return <span>{children}</span>;
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }} style={{ borderBottom: `1px dotted ${T.muted}`, cursor: "help" }}>{children}</span>
      {open && (
        <span onClick={(e) => e.stopPropagation()} style={{ position: "absolute", bottom: "135%", left: 0, zIndex: 60, width: 210, fontWeight: 400,
          background: "#0F0C08", border: `1px solid ${T.platform}66`, borderRadius: 8, padding: "8px 10px", fontSize: 11.5, color: T.text, lineHeight: 1.45, boxShadow: "0 10px 28px #000a", fontFamily: T.body }}>{def}</span>
      )}
    </span>
  );
}

export default function App() {
  const [phase, setPhase] = useState("intro");
  const [name, setName] = useState("");
  const [selScenario, setSelScenario] = useState("fashion");
  const [selPlatform, setSelPlatform] = useState("shopify");
  const [selFulfil, setSelFulfil] = useState("inhouse");
  const [cfg, setCfg] = useState(DEFAULT_CFG);
  const [stores, setStores] = useState(() => initialStores("", "shopify", "inhouse", DEFAULT_CFG.startingCash, SCENARIOS[0], DEFAULT_CFG.seed));
  const [round, setRound] = useState(1);
  const [log, setLog] = useState([]);
  const [showInstructor, setShowInstructor] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [predictionLog, setPredictionLog] = useState([]);

  const player = stores.find((s) => s.isPlayer);
  const ranked = [...stores].sort((a, b) => b.cumProfit - a.cumProfit);
  const activeCfg = { ...cfg, scenarioId: selScenario };

  function start() {
    const scen = SCMAP[selScenario];
    setCfg((c) => ({ ...c, scenarioId: selScenario }));
    setStores(initialStores(name, selPlatform, selFulfil, cfg.startingCash, scen, cfg.seed));
    setRound(1); setPredictionLog([]); setPrediction(null); setPhase("play");
  }
  function restart() { setPredictionLog([]); setPrediction(null); setPhase("intro"); }
  function setPlayerDecision(patch) {
    setStores((prev) => prev.map((s) => (s.isPlayer ? { ...s, decision: { ...s.decision, ...patch } } : s)));
  }
  function croDeploy(leverId) {
    setStores((prev) => prev.map((s) => {
      if (!s.isPlayer) return s;
      const tier = s.cro[leverId] || 0; if (tier >= 3) return s;
      const cost = CMAP[leverId].cost[tier];
      if ((s.croSpendThisWeek || 0) + cost > s.cash) return s;
      return { ...s, cro: { ...s.cro, [leverId]: tier + 1 }, croSpendThisWeek: (s.croSpendThisWeek || 0) + cost };
    }));
  }
  function croTest(leverId) {
    setStores((prev) => prev.map((s) => {
      if (!s.isPlayer) return s;
      const tier = s.cro[leverId] || 0; if (tier >= 3) return s;
      const key = leverId + ":" + (tier + 1); if (s.croTested[key]) return s;
      const cost = Math.round(CMAP[leverId].cost[tier] * 0.18);
      if ((s.croSpendThisWeek || 0) + cost > s.cash) return s;
      return { ...s, croTested: { ...s.croTested, [key]: true }, croSpendThisWeek: (s.croSpendThisWeek || 0) + cost };
    }));
  }
  function sellWeek() {
    const rng = makeRng(cfg.seed + ":" + round);
    const sc = SCMAP[selScenario];
    const lastTotalDemand = stores.reduce((a, s) => a + (s.last ? s.last.demandUnits : sc.demandBase / 5), 0);
    const stats = { lastTotalDemand, leaderDecision: leaderDecisionOf(stores) };
    const withBots = stores.map((s) => (s.isPlayer ? s : { ...s, decision: botDecide(s, stats, round, activeCfg, rng, sc) }));
    const { stores: resolved, log: lines } = resolveRound(withBots, round, activeCfg, rng);
    const order = [...resolved].sort((a, b) => b.cumProfit - a.cumProfit);
    const actualRank = order.findIndex((s) => s.isPlayer) + 1;
    setPredictionLog((p) => [...p, { round, predicted: prediction, actual: actualRank, hit: prediction === actualRank }]);
    setStores(resolved); setLog(lines); setPhase("result");
  }
  function nextWeek() {
    setPrediction(null);
    if (round >= cfg.maxRounds) { setPhase("end"); return; }
    setRound((r) => r + 1); setPhase("play");
  }

  return (
    <div style={{ minHeight: "100vh", background: T.ink, color: T.text, fontFamily: T.body }}>
      <style>{FONT_IMPORT + `
        * { box-sizing: border-box; }
        input[type=range]{ -webkit-appearance:none; appearance:none; height:6px; border-radius:6px; background:#332a1d; outline:none; }
        input[type=range]::-webkit-slider-thumb{ -webkit-appearance:none; appearance:none; width:20px; height:20px; border-radius:50%;
          cursor:pointer; background:var(--accent); border:2px solid #14110D; box-shadow:0 0 0 3px var(--accent-soft); }
        input[type=range]::-moz-range-thumb{ width:18px; height:18px; border-radius:50%; cursor:pointer; background:var(--accent); border:2px solid #14110D; }
        @keyframes rise { from{opacity:0; transform:translateY(10px)} to{opacity:1; transform:none} }
        @keyframes slideIn { from{transform:translateX(100%)} to{transform:none} }
        .rise{ animation:rise .5s cubic-bezier(.2,.7,.3,1) both; }
        .recharts-cartesian-axis-tick text{ fill:${T.muted}; font-family:${T.mono}; font-size:11px; }
      `}</style>

      <Header round={round} phase={phase} player={player} cfg={activeCfg} rank={ranked.findIndex((s) => s.isPlayer) + 1} onToggleInstructor={() => setShowInstructor((v) => !v)} />

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 20px 64px" }}>
        {phase === "intro" && <Intro name={name} setName={setName} cfg={activeCfg} onNext={() => setPhase("scenario")} />}
        {phase === "scenario" && <ScenarioSelect selected={selScenario} setSelected={setSelScenario} onNext={() => setPhase("platform")} onBack={() => setPhase("intro")} />}
        {phase === "platform" && <SetupSelect scenario={SCMAP[selScenario]} platform={selPlatform} setPlatform={setSelPlatform} fulfil={selFulfil} setFulfil={setSelFulfil} cfg={activeCfg} onLaunch={start} onBack={() => setPhase("scenario")} />}
        {phase === "play" && <PlayBoard stores={stores} ranked={ranked} round={round} cfg={activeCfg} player={player} setPlayerDecision={setPlayerDecision} croDeploy={croDeploy} croTest={croTest} sellWeek={sellWeek} prediction={prediction} setPrediction={setPrediction} />}
        {phase === "result" && <ResultView stores={stores} ranked={ranked} log={log} round={round} nextWeek={nextWeek} player={player} cfg={activeCfg} predictionLog={predictionLog} />}
        {phase === "end" && <EndView stores={stores} ranked={ranked} restart={restart} player={player} cfg={activeCfg} predictionLog={predictionLog} />}
      </div>

      {showInstructor && <InstructorPanel cfg={cfg} setCfg={setCfg} defaults={DEFAULT_CFG} onClose={() => setShowInstructor(false)} />}
    </div>
  );
}

function Header({ round, phase, player, rank, cfg, onToggleInstructor }) {
  const feeRaised = cfg.commissionRate > DEFAULT_CFG.commissionRate + 1e-6;
  const showStats = phase === "play" || phase === "result" || phase === "end";
  const cashColor = player.insolvent || player.cash < 0 ? T.neg : player.cash < cfg.startingCash * 0.3 ? "#E6B450" : T.pos;
  return (
    <div style={{ borderBottom: `1px solid ${T.border}`, background: "#17130D", position: "sticky", top: 0, zIndex: 30 }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={{ fontFamily: T.display, fontWeight: 800, fontSize: 22, letterSpacing: -0.5 }}>Marketplace <span style={{ color: PLAYER_COLOR }}>Tycoon</span></span>
          <span style={{ color: T.muted, fontSize: 13, fontFamily: T.mono }}>{showStats ? SC(cfg).icon + " " + SC(cfg).short : "e-commerce strategy lab"}</span>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center", fontFamily: T.mono, fontSize: 13 }}>
          {showStats && <>
            <Stat label="WEEK" value={`${round}/${cfg.maxRounds}`} />
            <Stat label="PROFIT" value={gbp(player.cumProfit)} accent={player.cumProfit >= 0 ? T.pos : T.neg} />
            <Stat label="CASH" value={gbp(player.cash)} accent={cashColor} />
            <Stat label="RANK" value={`#${rank}`} accent={PLAYER_COLOR} />
            <Stat label="FEE" value={`${Math.round(cfg.commissionRate * 100)}%`} accent={feeRaised ? T.neg : T.platform} />
          </>}
          <button onClick={onToggleInstructor} title="Instructor controls" style={{ background: T.panel2, border: `1px solid ${T.border}`, color: T.platform, borderRadius: 9, padding: "7px 11px", cursor: "pointer", fontFamily: T.body, fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 15 }}>⚙</span> Instructor
          </button>
        </div>
      </div>
    </div>
  );
}
function Stat({ label, value, accent }) {
  return <div style={{ textAlign: "right" }}><div style={{ color: T.muted, fontSize: 10, letterSpacing: 1 }}>{label}</div><div style={{ color: accent || T.text, fontWeight: 700, fontSize: 15 }}>{value}</div></div>;
}
function PlatformPill({ id }) {
  const p = PMAP[id]; if (!p) return null;
  return <span style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, border: `1px solid ${T.border}`, borderRadius: 6, padding: "1px 6px", whiteSpace: "nowrap" }}>{p.short}</span>;
}

function Intro({ name, setName, onNext, cfg }) {
  return (
    <div className="rise" style={{ maxWidth: 720, margin: "44px auto 0" }}>
      <h1 style={{ fontFamily: T.display, fontWeight: 800, fontSize: 46, lineHeight: 1.05, letterSpacing: -1, margin: 0 }}>
        Pick a client.<br />Build the store.<br /><span style={{ color: PLAYER_COLOR }}>Ten weeks to win.</span>
      </h1>
      <p style={{ color: T.muted, fontSize: 16, lineHeight: 1.6, marginTop: 18 }}>
        Choose a <b style={{ color: T.text }}>client brief</b>, a <b style={{ color: T.text }}>storefront platform</b> and a{" "}
        <b style={{ color: T.text }}>fulfilment model</b>, then run the store: set price, ad spend and stock, and invest in{" "}
        <Term term="cro">conversion optimization</Term> each week. Win loyal regulars, manage cash and returns, survive
        seasonal shocks, and outlast four rivals. The right strategy depends on the brief.
      </p>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 22, flexWrap: "wrap" }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name your store…" style={{ flex: 1, minWidth: 220, background: T.panel, border: `1px solid ${T.border}`, color: T.text, borderRadius: 10, padding: "13px 15px", fontSize: 15, fontFamily: T.body, outline: "none" }} />
        <button onClick={onNext} style={btn(PLAYER_COLOR)}>Choose your client brief →</button>
      </div>
    </div>
  );
}

function ScenarioSelect({ selected, setSelected, onNext, onBack }) {
  const sel = SCMAP[selected];
  return (
    <div className="rise" style={{ maxWidth: 980, margin: "32px auto 0" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ fontFamily: T.display, fontWeight: 800, fontSize: 30, letterSpacing: -0.5, margin: 0 }}>Choose your client brief</h2>
        <button onClick={onBack} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 14 }}>← back</button>
      </div>
      <p style={{ color: T.muted, fontSize: 15, lineHeight: 1.55, marginTop: 8 }}>
        Each industry has a different shape — margins, demand volatility, return rates, how mobile its shoppers are, and
        whether ads or trust win. The same levers reward very different strategies. Your rivals face the same brief.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, marginTop: 18 }}>
        {SCENARIOS.map((s) => {
          const on = s.id === selected;
          return (
            <button key={s.id} onClick={() => setSelected(s.id)} style={{ textAlign: "left", cursor: "pointer", background: on ? "#2A2113" : T.panel, border: `1.5px solid ${on ? PLAYER_COLOR : T.border}`, borderRadius: 16, padding: 18, color: T.text, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: T.display, fontWeight: 700, fontSize: 17 }}>{s.icon} {s.name}</span>
                {on && <span style={{ color: PLAYER_COLOR, fontSize: 18 }}>✓</span>}
              </div>
              <p style={{ color: T.muted, fontSize: 12.5, lineHeight: 1.45, margin: "2px 0 8px" }}>{s.brief}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <SpecRow label="Margin" value={`${gbp(s.priceMin)}–${gbp(s.priceMax)} · COGS ${gbp(s.unitCost)}`} />
                <SpecRow label="Demand / volatility" value={`${s.demandBase.toLocaleString()} · ${s.volatility >= 0.2 ? "high" : s.volatility >= 0.12 ? "med" : "low"}`} />
                <SpecRow label="Return rate" value={`${Math.round(s.returnRate * 100)}%`} />
                <SpecRow label="Mobile traffic" value={`${Math.round(s.mobileShare * 100)}%`} />
              </div>
              <div style={{ fontSize: 11.5, color: T.platform, lineHeight: 1.4, marginTop: 8 }}>{s.teach}</div>
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
        <div style={{ color: T.muted, fontSize: 13.5 }}>Briefing the team on <b style={{ color: T.text }}>{sel.name}</b>.</div>
        <button onClick={onNext} style={btn(PLAYER_COLOR)}>Set up your store →</button>
      </div>
    </div>
  );
}

function SetupSelect({ scenario, platform, setPlatform, fulfil, setFulfil, onLaunch, onBack, cfg }) {
  return (
    <div className="rise" style={{ maxWidth: 980, margin: "32px auto 0" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ fontFamily: T.display, fontWeight: 800, fontSize: 28, letterSpacing: -0.5, margin: 0 }}>Set up your store — {scenario.icon} {scenario.short}</h2>
        <button onClick={onBack} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 14 }}>← back</button>
      </div>

      <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 15, color: T.muted, textTransform: "uppercase", letterSpacing: 0.4, margin: "20px 0 10px" }}>1 · Storefront platform</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 }}>
        {PLATFORMS.map((base) => {
          const p = getPlatform(cfg, base.id); const on = base.id === platform;
          return (
            <button key={base.id} onClick={() => setPlatform(base.id)} style={{ textAlign: "left", cursor: "pointer", background: on ? "#2A2113" : T.panel, border: `1.5px solid ${on ? PLAYER_COLOR : T.border}`, borderRadius: 14, padding: 15, color: T.text }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: T.display, fontWeight: 700, fontSize: 15.5 }}>{base.name}</span>{on && <span style={{ color: PLAYER_COLOR }}>✓</span>}
              </div>
              <p style={{ color: T.muted, fontSize: 12, lineHeight: 1.4, margin: "5px 0 9px" }}>{base.blurb}</p>
              <SpecRow label="Cost / week" value={gbp(p.fixedCost) + (p.txnFee ? ` + ${(p.txnFee * 100).toFixed(p.txnFee * 100 % 1 ? 1 : 0)}%` : "")} />
              <SpecRow label="Time to value" value={base.rampWeeks <= 1 ? "Instant" : `${base.rampWeeks} wks`} />
              <SpecRow label="Ceiling" value={"●".repeat(base.ceiling) + "○".repeat(4 - base.ceiling)} mono />
            </button>
          );
        })}
      </div>

      {!scenario.digital ? (
        <>
          <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 15, color: T.muted, textTransform: "uppercase", letterSpacing: 0.4, margin: "22px 0 10px" }}>2 · Fulfilment model</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 }}>
            {FULFILMENT.map((f) => {
              const on = f.id === fulfil;
              return (
                <button key={f.id} onClick={() => setFulfil(f.id)} style={{ textAlign: "left", cursor: "pointer", background: on ? "#2A2113" : T.panel, border: `1.5px solid ${on ? PLAYER_COLOR : T.border}`, borderRadius: 14, padding: 15, color: T.text }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: T.display, fontWeight: 700, fontSize: 15.5 }}>{f.icon} {f.short}</span>{on && <span style={{ color: PLAYER_COLOR }}>✓</span>}
                  </div>
                  <p style={{ color: T.muted, fontSize: 12, lineHeight: 1.4, margin: "5px 0 9px" }}>{f.blurb}</p>
                  <SpecRow label="Cost / unit" value={f.perUnitCost ? gbp(f.perUnitCost) : (f.marginCut ? `${Math.round(f.marginCut * 100)}% cut` : "£0")} />
                  <SpecRow label="Weekly fee" value={f.fixed ? gbp(f.fixed) : "—"} />
                  <SpecRow label="Stock risk" value={f.infiniteStock ? "none (unlimited)" : f.stockMult > 1 ? "cushioned" : "you carry it"} />
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div style={{ marginTop: 22, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, color: T.muted, fontSize: 13.5 }}>
          ⬇️ <b style={{ color: T.text }}>Digital delivery</b> — this brief ships electronically. No fulfilment choice, no stock limit, no shipping cost. Checkout UX and pricing are everything.
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 22 }}>
        <button onClick={onLaunch} style={btn(PLAYER_COLOR)}>Launch store →</button>
      </div>
    </div>
  );
}
function SpecRow({ label, value, mono }) {
  return <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}><span style={{ color: T.muted }}>{label}</span><span style={{ fontFamily: mono ? T.mono : T.body, fontWeight: 600, color: T.text }}>{value}</span></div>;
}

/* ---- INSTRUCTOR PANEL -------------------------------------- */
function InstructorPanel({ cfg, setCfg, defaults, onClose }) {
  const set = (patch) => setCfg((c) => ({ ...c, ...patch }));
  const setWeight = (k, v) => setCfg((c) => ({ ...c, weights: { ...c.weights, [k]: v } }));
  const setPlatCost = (id, v) => setCfg((c) => ({ ...c, platforms: { ...c.platforms, [id]: { ...c.platforms[id], fixedCost: v } } }));
  const A = T.platform;
  const preset = (label, patch) => <button key={label} onClick={() => set(patch)} style={presetBtn}>{label}</button>;
  const platShock = (label, build) => <button key={label} onClick={() => setCfg((c) => build(c))} style={presetBtn}>{label}</button>;
  const hikeFixed = (c, ids, mult) => { const platforms = { ...c.platforms }; ids.forEach((id) => { platforms[id] = { ...platforms[id], fixedCost: Math.round(PMAP[id].fixedCost * mult) }; }); return { ...c, platforms }; };
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "#0008", zIndex: 40 }} />
      <div style={{ position: "fixed", top: 0, right: 0, height: "100%", width: 350, maxWidth: "92vw", background: "#1A1610", borderLeft: `1px solid ${A}55`, zIndex: 50, overflowY: "auto", animation: "slideIn .25s ease both", boxShadow: "-20px 0 50px #0007" }}>
        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontFamily: T.display, fontWeight: 800, fontSize: 19, color: A }}>⚙ Instructor</span>
            <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
          </div>
          <p style={{ color: T.muted, fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>Changes apply to the <b style={{ color: T.text }}>next week resolved</b>. The brief sets base economics; these tune the market around it.</p>

          <PanelGroup title="Classroom" note="A shared seed gives the whole cohort an identical market — then debrief why results differed.">
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Market seed</div>
              <div style={{ display: "flex", gap: 6 }}>
                <input value={cfg.seed} onChange={(e) => set({ seed: e.target.value })} style={{ flex: 1, background: T.panel, border: `1px solid ${T.border}`, color: T.text, borderRadius: 8, padding: "8px 10px", fontFamily: T.mono, fontSize: 13, outline: "none" }} />
                <button onClick={() => set({ seed: "M" + Math.random().toString(36).slice(2, 7).toUpperCase() })} style={{ ...presetBtn, padding: "8px 10px" }}>🎲</button>
              </div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 5 }}>Set before launch; also controls which CRO bets pay off.</div>
            </div>
            <ToggleRow label="Seasonal events on" on={cfg.eventsOn} accent={A} onToggle={() => set({ eventsOn: !cfg.eventsOn })} />
            <InstructorSlider label="Starting cash (new game)" accent={A} value={cfg.startingCash} min={0} max={12000} step={250} fmt={(v) => gbp(v)} onChange={(v) => set({ startingCash: v })} changed={cfg.startingCash !== defaults.startingCash} />
          </PanelGroup>

          <PanelGroup title="Marketplace economics">
            <InstructorSlider label="Commission (the take)" accent={A} value={cfg.commissionRate} min={0} max={0.4} step={0.01} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ commissionRate: v })} changed={cfg.commissionRate !== defaults.commissionRate} />
            <InstructorSlider label="Demand multiplier" accent={A} value={cfg.demandMult} min={0.3} max={2} step={0.05} fmt={(v) => `${v.toFixed(2)}×`} onChange={(v) => set({ demandMult: v })} changed={cfg.demandMult !== defaults.demandMult} />
            <InstructorSlider label="Holding / spoilage ×" accent={A} value={cfg.holdingMult} min={0.3} max={2.5} step={0.1} fmt={(v) => `${v.toFixed(1)}×`} onChange={(v) => set({ holdingMult: v })} changed={cfg.holdingMult !== defaults.holdingMult} />
          </PanelGroup>

          <PanelGroup title="Platform rent — fixed cost / week" note="Raise mid-game to demonstrate platform pricing power; hits every store on that platform.">
            {PLATFORMS.map((p) => <InstructorSlider key={p.id} label={p.short} accent={A} value={cfg.platforms[p.id].fixedCost} min={0} max={1500} step={10} fmt={(v) => `£${v}/wk`} onChange={(v) => setPlatCost(p.id, v)} changed={cfg.platforms[p.id].fixedCost !== defaults.platforms[p.id].fixedCost} />)}
          </PanelGroup>

          <PanelGroup title="Platform rent — transaction fee">
            <InstructorSlider label="Transaction fee add-on (all)" accent={A} value={cfg.txnAddon} min={0} max={0.06} step={0.005} fmt={(v) => `+${(v * 100).toFixed(1)}%`} onChange={(v) => set({ txnAddon: v })} changed={cfg.txnAddon !== defaults.txnAddon} />
          </PanelGroup>

          <PanelGroup title="Search-ranking weights" note="Relative pull of each factor. They needn't sum to 1.">
            <InstructorSlider label="Price sensitivity" accent={A} value={cfg.weights.price} min={0} max={0.8} step={0.05} fmt={(v) => v.toFixed(2)} onChange={(v) => setWeight("price", v)} changed={cfg.weights.price !== defaults.weights.price} />
            <InstructorSlider label="Review weight" accent={A} value={cfg.weights.review} min={0} max={0.8} step={0.05} fmt={(v) => v.toFixed(2)} onChange={(v) => setWeight("review", v)} changed={cfg.weights.review !== defaults.weights.review} />
            <InstructorSlider label="Ad visibility weight" accent={A} value={cfg.weights.ad} min={0} max={0.8} step={0.05} fmt={(v) => v.toFixed(2)} onChange={(v) => setWeight("ad", v)} changed={cfg.weights.ad !== defaults.weights.ad} />
          </PanelGroup>

          <PanelGroup title="Teaching shocks — one tap">
            <div style={{ display: "grid", gap: 8 }}>
              {platShock("🏢 SaaS price hike — Wix & Shopify +50%", (c) => hikeFixed(c, ["wix", "shopify"], 1.5))}
              {platShock("💳 Transaction fees jump — +3% for everyone", (c) => ({ ...c, txnAddon: 0.03 }))}
              {platShock("🖥 Headless infra spike — +60%", (c) => hikeFixed(c, ["headless"], 1.6))}
              {platShock("🔌 Reset platform pricing only", (c) => ({ ...c, txnAddon: 0, platforms: defaults.platforms }))}
              {preset("📈 Raise the take → 30%", { commissionRate: 0.30 })}
              {preset("💸 Ad-driven market", { weights: { price: 0.25, review: 0.20, ad: 0.55 } })}
              {preset("⭐ Quality-driven market", { weights: { price: 0.25, review: 0.55, ad: 0.20 } })}
              {preset("🩸 Price war", { weights: { price: 0.70, review: 0.15, ad: 0.15 } })}
              {preset("📉 Demand crunch (×0.5)", { demandMult: 0.5 })}
            </div>
          </PanelGroup>

          <button onClick={() => setCfg(defaults)} style={{ width: "100%", marginTop: 8, background: "transparent", color: T.muted, border: `1px solid ${T.border}`, borderRadius: 10, padding: "11px", cursor: "pointer", fontFamily: T.body, fontWeight: 600, fontSize: 13 }}>↺ Reset all to defaults</button>
        </div>
      </div>
    </>
  );
}
const presetBtn = { textAlign: "left", background: T.panel2, border: `1px solid ${T.border}`, color: T.text, borderRadius: 9, padding: "9px 11px", cursor: "pointer", fontFamily: T.body, fontSize: 12.5, lineHeight: 1.3 };
function ToggleRow({ label, on, onToggle, accent }) {
  return (
    <div onClick={onToggle} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", marginBottom: 13, fontSize: 13, fontWeight: 500 }}>
      <span>{label}</span>
      <span style={{ width: 38, height: 22, borderRadius: 22, background: on ? accent : "#332a1d", position: "relative", transition: "background .15s" }}><span style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 18, height: 18, borderRadius: 18, background: "#14110D", transition: "left .15s" }} /></span>
    </div>
  );
}
function PanelGroup({ title, note, children }) {
  return <div style={{ marginTop: 18 }}><div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 13, letterSpacing: 0.3, textTransform: "uppercase", color: T.muted, marginBottom: 10 }}>{title}</div>{note && <div style={{ fontSize: 11.5, color: T.muted, marginTop: -4, marginBottom: 10, lineHeight: 1.4 }}>{note}</div>}{children}</div>;
}
function InstructorSlider({ label, value, min, max, step, fmt, onChange, accent, changed }) {
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><span style={{ fontSize: 13, fontWeight: 500 }}>{label}{changed && <span style={{ color: accent, marginLeft: 5 }}>•</span>}</span><span style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 13, color: accent }}>{fmt(value)}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%", marginTop: 7, "--accent": accent, "--accent-soft": accent + "30" }} />
    </div>
  );
}

/* ---- PLAY BOARD --------------------------------------------- */
function PlayBoard({ stores, ranked, round, setPlayerDecision, croDeploy, croTest, sellWeek, player, cfg, prediction, setPrediction }) {
  const sc = SC(cfg);
  const d = player.decision;
  const platform = getPlatform(cfg, player.platformId);
  const ful = fulfilOf(player, sc);
  const mat = maturityOf(platform, round);
  const ev = eventFor(round, cfg);
  const croConv = croConvOf(player.cro, true, player.croLifts, sc);
  const committed = player.croSpendThisWeek || 0;
  const availCash = player.cash - committed;
  const unitCostTotal = sc.unitCost + ful.perUnitCost;
  const unitMargin = d.price - unitCostTotal - d.price * cfg.commissionRate - d.price * platform.txnFee - d.price * (ful.marginCut || 0);
  const breakEvenUnits = unitMargin > 0 ? (d.ad + committed + platform.fixedCost + (ful.fixed || 0)) / unitMargin : Infinity;
  const hiked = platform.fixedCost !== PMAP[player.platformId].fixedCost || platform.txnFee !== PMAP[player.platformId].txnFee;

  return (
    <div className="rise" style={{ display: "grid", gridTemplateColumns: "minmax(0,1.15fr) minmax(0,1fr)", gap: 18, marginTop: 22 }}>
      <div style={card()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
          <span style={{ fontFamily: T.display, fontWeight: 700, fontSize: 17 }}>Your move — Week {round}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: T.mono, fontSize: 11, color: T.platform }}>{platform.short} · {ful.short}</span>
        </div>
        <div style={{ background: "#211c14", borderRadius: 9, padding: "8px 11px", marginBottom: 14, fontSize: 11.5, color: T.muted, lineHeight: 1.45 }}>
          {sc.icon} <b style={{ color: T.text }}>{sc.name}:</b> {sc.teach}
        </div>

        {ev && <Banner bg="#2a2412" bd={`${T.platform}66`}><b>{ev.icon} This week: {ev.title}</b><div style={{ fontSize: 12, color: T.muted, marginTop: 3, lineHeight: 1.45 }}>{ev.desc}</div></Banner>}
        {player.insolvent && <Banner bg="#3a1f16" bd={T.neg}>💀 You're <Term term="insolvent">insolvent</Term> — out of cash. Keep trading if you like, but this is where real stores die. Cut spend, rebuild margin.</Banner>}
        {mat < 1 && <Banner bg="#241d12" bd={`${T.platform}44`}>🏗 {platform.short} is {Math.round(mat * 100)}% built — paying {gbp(platform.fixedCost)}/wk in full while the edge ramps in (full power by week {platform.rampWeeks}).</Banner>}
        {hiked && <Banner bg="#3a1f16" bd={`${T.neg}66`}>⚡ Platform pricing changed — now {gbp(platform.fixedCost)}/wk{platform.txnFee ? ` + ${(platform.txnFee * 100).toFixed(1)}%` : ""}. You're locked in.</Banner>}

        <Slider label="Price" accent={PLAYER_COLOR} value={d.price} min={sc.priceMin} max={sc.priceMax} step={1} fmt={gbp0} hint="Cheaper wins volume — but every £1 off comes straight out of thin margin." onChange={(v) => setPlayerDecision({ price: v })} />
        <Slider label="Ad spend" accent={PLAYER_COLOR} value={d.ad} min={0} max={2500} step={50} fmt={gbp0} hint={`Buys visibility (an auction). This brief is ${sc.adResponse >= 1.1 ? "ad-responsive" : sc.adResponse <= 0.8 ? "research-led — ads do less" : "moderately ad-responsive"}.`} onChange={(v) => setPlayerDecision({ ad: v })} />
        {ful.infiniteStock ? (
          <div style={{ marginBottom: 16, fontSize: 12.5, color: T.muted, background: T.panel2, borderRadius: 9, padding: "10px 12px" }}>
            ♾ <b style={{ color: T.text }}>Unlimited inventory</b> — {sc.digital ? "digital goods never stock out." : "your dropship supplier holds the stock."} No stocking decision this week.
          </div>
        ) : (
          <Slider label={<>Units stocked <Term term="newsvendor">(stocking)</Term></>} accent={PLAYER_COLOR} value={d.stock} min={0} max={Math.round(sc.demandBase * 1.4)} step={25} fmt={(n) => n.toLocaleString()} hint={sc.holdingPerUnit >= 1.5 ? "Unsold units spoil — overstock is brutal here. Match stock to demand." : "Too few and you stock out; too much and you eat holding costs."} onChange={(v) => setPlayerDecision({ stock: v })} />
        )}

        <CROPanel player={player} sc={sc} croConv={croConv} availCash={availCash} onDeploy={croDeploy} onTest={croTest} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
          <MiniStat label={<Term term="contribution">Contribution / unit</Term>} value={gbp(unitMargin)} sub={<><Term term="cogs">COGS</Term> {gbp(unitCostTotal)} + fees</>} accent={unitMargin > 0 ? T.pos : T.neg} />
          <MiniStat label="Break-even volume" value={isFinite(breakEvenUnits) ? `${Math.ceil(breakEvenUnits)} units` : "—"} sub="covers ad + CRO + platform" accent={T.platform} />
          <MiniStat label={<Term term="regulars">Returning regulars</Term>} value={Math.round(player.loyalBase).toLocaleString()} sub="uncontested recurring demand" accent={PLAYER_COLOR} />
          <MiniStat label={<Term term="workingcapital">Cash available</Term>} value={gbp(availCash)} sub={committed > 0 ? `${gbp(committed)} committed to CRO` : "your runway"} accent={availCash < 0 ? T.neg : availCash < cfg.startingCash * 0.3 ? "#E6B450" : T.pos} />
        </div>

        <div style={{ marginTop: 16, background: T.panel2, borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 9 }}>Before you sell — where will you rank this week?</div>
          <div style={{ display: "flex", gap: 6 }}>
            {[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => setPrediction(n)} style={{ flex: 1, padding: "9px 0", borderRadius: 8, cursor: "pointer", fontFamily: T.mono, fontWeight: 700, fontSize: 13, border: `1px solid ${prediction === n ? PLAYER_COLOR : T.border}`, background: prediction === n ? PLAYER_COLOR : "transparent", color: prediction === n ? "#1a1206" : T.text }}>#{n}</button>)}
          </div>
        </div>

        <button onClick={sellWeek} disabled={prediction == null} style={{ ...btn(PLAYER_COLOR), width: "100%", marginTop: 16, opacity: prediction == null ? 0.45 : 1, cursor: prediction == null ? "not-allowed" : "pointer" }}>{prediction == null ? "Predict your rank to continue" : "Run the week ▸"}</button>
      </div>

      <div style={card()}>
        <SectionTitle>The marketplace</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{ranked.map((s, i) => <StoreRow key={s.id} s={s} pos={i + 1} firstRound={round === 1} sc={sc} round={round} />)}</div>
        <p style={{ color: T.muted, fontSize: 12.5, marginTop: 14, lineHeight: 1.5 }}>Pills show each rival's platform. ★ reviews · ♥ regulars · bar is last week's share of new customers.</p>
      </div>
    </div>
  );
}

function Banner({ bg, bd, children }) {
  return <div style={{ background: bg, border: `1px solid ${bd}`, borderRadius: 10, padding: "10px 12px", marginBottom: 14, fontSize: 12.8, lineHeight: 1.45 }}>{children}</div>;
}

function CROPanel({ player, sc, croConv, availCash, onDeploy, onTest }) {
  return (
    <div style={{ background: T.panel2, borderRadius: 12, padding: "13px 14px", marginBottom: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}><Term term="cro">Conversion optimization</Term></span>
        <span style={{ fontFamily: T.mono, fontSize: 12.5, color: T.pos }}>site conv ×{croConv.toFixed(3)}</span>
      </div>
      <div style={{ fontSize: 11, color: T.muted, marginBottom: 10, lineHeight: 1.4 }}>
        Persistent upgrades. <Term term="abtest">A/B test</Term> to reveal a tier's true lift before you commit the bigger deploy cost.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {CRO_LEVERS.map((l) => {
          const tier = player.cro[l.id] || 0;
          const maxed = tier >= 3;
          const cost = maxed ? 0 : l.cost[tier];
          const testCost = maxed ? 0 : Math.round(cost * 0.18);
          const key = l.id + ":" + (tier + 1);
          const tested = !!player.croTested[key];
          const realized = !maxed && player.croLifts ? player.croLifts[l.id][tier] : 0;
          const shownLift = l.id === "mobile" ? realized * sc.mobileShare : realized;
          const estLo = (l.id === "mobile" ? l.loLift * sc.mobileShare : l.loLift) * 100;
          const estHi = (l.id === "mobile" ? l.hiLift * sc.mobileShare : l.hiLift) * 100;
          return (
            <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
              <span style={{ width: 116, flexShrink: 0 }}>
                <span>{l.icon} {l.name}</span>
                <span style={{ display: "block", marginTop: 2, letterSpacing: 1, color: PLAYER_COLOR, fontSize: 11 }}>{"●".repeat(tier)}<span style={{ color: "#4a3f2d" }}>{"○".repeat(3 - tier)}</span></span>
              </span>
              {maxed ? (
                <span style={{ color: T.muted, fontFamily: T.mono, fontSize: 11 }}>maxed</span>
              ) : (
                <>
                  <span style={{ flex: 1, fontFamily: T.mono, fontSize: 10.5, color: tested ? T.pos : T.muted }}>
                    {tested ? `tested: +${(shownLift * 100).toFixed(1)}%` : `est +${estLo.toFixed(0)}–${estHi.toFixed(0)}%`}
                  </span>
                  {!tested && <button onClick={() => onTest(l.id)} disabled={testCost > availCash} style={croBtn(testCost > availCash, false)}>test {gbp(testCost)}</button>}
                  <button onClick={() => onDeploy(l.id)} disabled={cost > availCash} style={croBtn(cost > availCash, true)}>deploy {gbp(cost)}</button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
const croBtn = (disabled, primary) => ({
  background: disabled ? "#2a241a" : primary ? PLAYER_COLOR : "transparent", color: disabled ? T.muted : primary ? "#1a1206" : T.text,
  border: `1px solid ${primary ? (disabled ? T.border : PLAYER_COLOR) : T.border}`, borderRadius: 7, padding: "5px 8px",
  fontFamily: T.body, fontWeight: 600, fontSize: 11, cursor: disabled ? "not-allowed" : "pointer", whiteSpace: "nowrap",
});

function StoreRow({ s, pos, firstRound, sc, round }) {
  const share = s.last ? s.last.share : 0;
  const cv = croConvOf(s.isPlayer ? s.cro : botCro(s.id, round), s.isPlayer, s.croLifts, sc);
  return (
    <div style={{ background: s.isPlayer ? "#2A2113" : T.panel2, border: `1px solid ${s.isPlayer ? PLAYER_COLOR + "55" : T.border}`, borderRadius: 11, padding: "11px 13px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ fontFamily: T.mono, color: T.muted, fontSize: 12, width: 16 }}>{pos}</span>
          <span style={{ width: 9, height: 9, borderRadius: 9, background: s.color, flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}{s.isPlayer && <span style={{ color: PLAYER_COLOR }}> (you)</span>}</span>
          <PlatformPill id={s.platformId} />
          {s.insolvent && <span style={{ fontSize: 10 }}>💀</span>}
        </div>
        <span style={{ fontFamily: T.mono, fontSize: 13, color: s.cumProfit >= 0 ? T.pos : T.neg, fontWeight: 700 }}>{gbp(s.cumProfit)}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 7 }}>
        <Stars value={s.review} color={s.color} />
        <span style={{ fontFamily: T.mono, fontSize: 11, color: T.muted }}>{s.review.toFixed(1)}</span>
        <span style={{ fontFamily: T.mono, fontSize: 11, color: T.muted }}>♥{Math.round(s.loyalBase)}</span>
        <div style={{ flex: 1, height: 6, background: "#332a1d", borderRadius: 6, overflow: "hidden" }}><div style={{ width: `${firstRound ? 0 : Math.round(share * 100)}%`, height: "100%", background: s.color }} /></div>
        <span style={{ fontFamily: T.mono, fontSize: 11, color: T.muted, width: 30, textAlign: "right" }}>{firstRound ? "—" : `${Math.round(share * 100)}%`}</span>
      </div>
    </div>
  );
}
function Stars({ value, color }) { return <div style={{ display: "flex", gap: 1 }}>{[1, 2, 3, 4, 5].map((i) => <span key={i} style={{ fontSize: 12, color: i <= Math.round(value) ? color : "#4a3f2d" }}>★</span>)}</div>; }

/* ---- RESULT ------------------------------------------------- */
function ResultView({ stores, ranked, log, round, nextWeek, player, cfg, predictionLog }) {
  const r = player.last; const sc = SC(cfg); const platform = PMAP[player.platformId]; const ful = fulfilOf(player, sc);
  const pred = predictionLog.find((p) => p.round === round);
  const rows = [
    ["Units sold (kept)", `${Math.round(r.keptSales)}`, T.text],
    ["Revenue", gbp(r.revenue), T.text],
    ["– COGS (incl. fulfilment)", "-" + gbp(r.cogs), T.muted],
    [`– Marketplace fee (${Math.round(cfg.commissionRate * 100)}%)`, "-" + gbp(r.commission), T.platform],
    [`– Platform · ${platform.short}`, "-" + gbp(r.fixed - (ful.fixed || 0) + r.platformTxn), T.platform],
    [`– Fulfilment · ${ful.short}`, "-" + gbp((ful.fixed || 0) + r.dropshipCut), T.platform],
    [`– Returns (${Math.round(r.returnedUnits)} units)`, "-" + gbp(r.returnHandling), T.neg],
    ["– Ad spend", "-" + gbp(r.ad), T.muted],
    ["– CRO investment", "-" + gbp(r.croCost), T.muted],
    ["– Holding (unsold)", "-" + gbp(r.holding), T.muted],
  ];
  return (
    <div className="rise" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 18, marginTop: 22 }}>
      <div style={card()}>
        <SectionTitle>Week {round} — your P&L</SectionTitle>
        {rows.map(([k, v, c]) => <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.border}`, fontSize: 13.5 }}><span style={{ color: T.muted }}>{k}</span><span style={{ fontFamily: T.mono, color: c }}>{v}</span></div>)}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 2px", fontSize: 16, fontWeight: 700 }}><span>Weekly profit</span><span style={{ fontFamily: T.mono, color: r.profit >= 0 ? T.pos : T.neg }}>{gbp(r.profit)}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13, color: T.muted }}><span>Cash after the week</span><span style={{ fontFamily: T.mono, color: r.cashAfter < 0 ? T.neg : T.muted }}>{gbp(r.cashAfter)}</span></div>

        <div style={{ marginTop: 12, background: T.panel2, borderRadius: 10, padding: "10px 12px", fontSize: 12.5, lineHeight: 1.5 }}>♥ Of {Math.round(r.keptSales)} kept sales, <b style={{ color: PLAYER_COLOR }}>{Math.round(r.returningServed)}</b> were returning regulars. You now hold <b style={{ color: PLAYER_COLOR }}>{Math.round(player.loyalBase)}</b>. Site conversion ran at <b style={{ color: T.pos }}>×{r.croConv.toFixed(3)}</b>.</div>
        {pred && <div style={{ marginTop: 10, background: pred.hit ? "#1f2e18" : "#2e2418", borderRadius: 10, padding: "10px 12px", fontSize: 12.5, border: `1px solid ${pred.hit ? T.pos : T.platform}44` }}>{pred.hit ? "✓" : "✗"} You predicted <b>#{pred.predicted}</b>, finished <b>#{pred.actual}</b> this week.</div>}
        {r.returnedUnits > 8 && <div style={{ marginTop: 10, background: "#2e2418", border: `1px solid ${T.neg}44`, borderRadius: 10, padding: "10px 12px", fontSize: 12.5 }}>↩ <Term term="returns">Returns</Term> cost you {Math.round(r.returnedUnits)} sales plus {gbp(r.returnHandling)} handling. Trust & checkout CRO reduce them.</div>}
        {r.lostSales > 5 && <div style={{ marginTop: 10, background: "#3a1f16", border: `1px solid ${T.neg}55`, borderRadius: 10, padding: "10px 12px", fontSize: 12.5 }}>⚠ Stocked out — <b>{Math.round(r.lostSales)}</b> couldn't buy. Lost sales now, churned regulars later.</div>}
      </div>

      <div style={card()}>
        <SectionTitle>Marketplace report</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 14 }}>
          {ranked.map((s, i) => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13.5, padding: "3px 0" }}>
              <span style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0 }}>
                <span style={{ fontFamily: T.mono, color: T.muted, width: 14 }}>{i + 1}</span>
                <span style={{ width: 8, height: 8, borderRadius: 8, background: s.color }} />
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}{s.isPlayer && <span style={{ color: PLAYER_COLOR }}> (you)</span>}</span>
                <PlatformPill id={s.platformId} />
              </span>
              <span style={{ fontFamily: T.mono, color: T.muted, whiteSpace: "nowrap" }}>{Math.round(s.last.keptSales)} sold · {gbp(s.last.price)}</span>
            </div>
          ))}
        </div>
        <div style={{ background: T.panel2, borderRadius: 10, padding: "12px 14px" }}>{log.map((line, i) => <div key={i} style={{ fontSize: 13, color: T.text, marginBottom: i < log.length - 1 ? 7 : 0, lineHeight: 1.45 }}>▸ {line}</div>)}</div>
        <button onClick={nextWeek} style={{ ...btn(PLAYER_COLOR), width: "100%", marginTop: 16 }}>{round >= cfg.maxRounds ? "See final results →" : `Plan week ${round + 1} →`}</button>
      </div>
    </div>
  );
}

/* ---- END + DEBRIEF ------------------------------------------ */
function EndView({ stores, ranked, restart, player, cfg, predictionLog }) {
  const winner = ranked[0]; const sc = SC(cfg);
  const playerRank = ranked.findIndex((s) => s.isPlayer) + 1;
  const chartData = useMemo(() => {
    const rounds = player.history.length;
    return Array.from({ length: rounds }, (_, i) => { const row = { week: i + 1 }; stores.forEach((s) => { row[s.id] = Math.round(s.history[i] ? s.history[i].cumProfit : 0); }); return row; });
  }, [stores, player]);
  const shareData = ranked.map((s) => ({ name: s.name.split(" ").slice(-1)[0], value: Math.round(s.cumProfit), color: s.color }));
  return (
    <div className="rise" style={{ marginTop: 24 }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ color: T.muted, fontFamily: T.mono, fontSize: 12, letterSpacing: 2 }}>{sc.icon} {sc.name.toUpperCase()} · SEED {cfg.seed}</div>
        <h1 style={{ fontFamily: T.display, fontWeight: 800, fontSize: 38, margin: "6px 0", letterSpacing: -0.5 }}>{winner.isPlayer ? "You won the marketplace 🏆" : `${winner.name} took it`}</h1>
        <div style={{ color: T.muted }}>You finished <b style={{ color: PLAYER_COLOR }}>#{playerRank}</b> on {PMAP[player.platformId].name} with {gbp(player.cumProfit)} profit{player.insolvent ? <span style={{ color: T.neg }}> — but traded insolvent</span> : <> and {gbp(player.cash)} cash</>}.</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr)", gap: 18 }}>
        <div style={card()}>
          <SectionTitle>Cumulative profit over {player.history.length} weeks</SectionTitle>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
              <CartesianGrid stroke={T.border} strokeDasharray="3 3" /><XAxis dataKey="week" tickLine={false} /><YAxis tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`} tickLine={false} width={46} />
              <Tooltip contentStyle={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 8, fontFamily: T.mono, fontSize: 12 }} formatter={(v, n) => [gbp(v), stores.find((s) => s.id === n)?.name]} labelFormatter={(l) => `Week ${l}`} />
              {stores.map((s) => <Line key={s.id} type="monotone" dataKey={s.id} stroke={s.color} strokeWidth={s.isPlayer ? 3.5 : 2} dot={false} />)}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={card()}>
          <SectionTitle>Final profit by store</SectionTitle>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={shareData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
              <CartesianGrid stroke={T.border} strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tickLine={false} /><YAxis tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`} tickLine={false} width={46} />
              <Tooltip cursor={{ fill: "#ffffff08" }} contentStyle={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 8, fontFamily: T.mono, fontSize: 12 }} formatter={(v) => gbp(v)} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>{shareData.map((e, i) => <Cell key={i} fill={e.color} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <Debrief stores={stores} player={player} cfg={cfg} predictionLog={predictionLog} />
      <div style={{ ...card(), marginTop: 18, textAlign: "center" }}>
        <SectionTitle>Take your decision log into class</SectionTitle>
        <p style={{ color: T.muted, fontSize: 13, lineHeight: 1.5, marginTop: -6, maxWidth: 560, margin: "0 auto 16px" }}>Export the full ten-week record — brief, platform, fulfilment, every decision, CRO, returns, cash, rank and predictions — as an assessable artifact with reflection prompts.</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => downloadFile(`tycoon-log-${cfg.seed}.csv`, buildCSV(stores, player, predictionLog), "text/csv")} style={btn(T.platform)}>⬇ Download CSV</button>
          <button onClick={() => downloadFile(`tycoon-log-${cfg.seed}.md`, buildMarkdown(stores, player, predictionLog, cfg), "text/markdown")} style={{ ...btn("transparent"), color: T.text, border: `1px solid ${T.border}` }}>⬇ Download Markdown</button>
        </div>
      </div>
      <div style={{ textAlign: "center", marginTop: 22 }}><button onClick={restart} style={btn(PLAYER_COLOR)}>Play again ↺</button></div>
    </div>
  );
}

function Debrief({ stores, player, cfg, predictionLog }) {
  const sc = SC(cfg); const ful = fulfilOf(player, sc); const platform = PMAP[player.platformId];
  const carl = stores.find((s) => s.id === "carl"); const quinn = stores.find((s) => s.id === "quinn");
  const totalFees = stores.reduce((a, s) => a + s.history.reduce((sum, h) => sum + (h.commission || 0), 0), 0);
  const myCro = player.history.reduce((a, h) => a + (h.croCost || 0), 0);
  const totalReturns = player.history.reduce((a, h) => a + (h.returns || 0), 0);
  const hits = predictionLog.filter((p) => p.hit).length;
  const cards = [
    { t: `Fit to the brief: ${sc.short}`, b: `You ran ${platform.name} + ${ful.name} on a ${sc.name} brief. ${sc.teach} The winning strategy is brief-specific — the same levers that win in one industry lose in another, which is exactly the judgement a real platform recommendation demands.` },
    { t: "CRO is a portfolio of bets", b: `You invested ${gbp(myCro)} in conversion optimization, ending at site conversion ×${croConvOf(player.cro, true, player.croLifts, sc).toFixed(3)}. Some tiers paid off and some didn't — which is why A/B testing the true lift before committing the bigger deploy spend is the discipline, not an optional extra.` },
    { t: "Operations bites the margin", b: totalReturns > 0 ? `${Math.round(totalReturns)} units came back as returns over the game — each one shipped, handled and refunded. On a thin-margin brief, fulfilment choice and returns management are where profit quietly leaks.` : `Your fulfilment model shaped delivery speed, stock risk and returns. On this brief the operations choice was as strategic as the storefront.` },
    { t: "Retention is the cheap moat", b: `You finished holding ${Math.round(player.loyalBase)} regulars — recurring demand you didn't pay to re-acquire. Quality lifts reviews, reviews convert buyers to regulars, and regulars are LTV that survives without ad spend.` },
    { t: "Profit on paper vs cash", b: player.insolvent ? `You went insolvent — the lesson that kills real stores. Cumulative profit can look healthy while you run out of the cash needed to fund next week's stock, ads and CRO.` : `You stayed solvent on ${gbp(player.cash)}. Working capital is the constraint paper profit hides — spend must be funded before revenue lands.` },
    { t: "Stacked platform rent", b: `The marketplace took ${gbp(totalFees)} in commission at ${Math.round(cfg.commissionRate * 100)}% — on top of your storefront's own charges. Sellers pay rent at multiple layers; when any of them raises its price, you're already locked in.` },
    { t: "How calibrated were you?", b: `You called your weekly rank correctly ${hits} of ${predictionLog.length} times. Where predictions missed, your model of the market or rivals was off — and the same seed (${cfg.seed}) gave everyone an identical run, so differences are about decisions, not luck.` },
  ];
  return (
    <div style={{ ...card(), marginTop: 18 }}>
      <SectionTitle>Debrief — what the game was teaching</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 12 }}>
        {cards.map((c) => <div key={c.t} style={{ background: T.panel2, borderRadius: 11, padding: "14px 15px", border: `1px solid ${T.border}` }}><div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 15, marginBottom: 6, color: PLAYER_COLOR }}>{c.t}</div><div style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>{c.b}</div></div>)}
      </div>
    </div>
  );
}

/* ---- atoms -------------------------------------------------- */
function SectionTitle({ children }) { return <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 17, marginBottom: 14, letterSpacing: -0.2 }}>{children}</div>; }
function Slider({ label, value, min, max, step, onChange, fmt, hint, accent }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span><span style={{ fontFamily: T.mono, fontWeight: 700, color: accent }}>{fmt(value)}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%", margin: "8px 0 5px", "--accent": accent, "--accent-soft": accent + "30" }} />
      <div style={{ fontSize: 11.5, color: T.muted, lineHeight: 1.4 }}>{hint}</div>
    </div>
  );
}
function MiniStat({ label, value, sub, accent }) {
  return <div style={{ background: T.panel2, borderRadius: 10, padding: "11px 12px" }}><div style={{ color: T.muted, fontSize: 11 }}>{label}</div><div style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 18, color: accent, margin: "2px 0" }}>{value}</div><div style={{ color: T.muted, fontSize: 10.5, lineHeight: 1.3 }}>{sub}</div></div>;
}
const card = () => ({ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20 });
const btn = (c) => ({ background: c, color: c === "transparent" ? T.text : "#1a1206", border: "none", borderRadius: 11, padding: "13px 22px", fontFamily: T.body, fontWeight: 700, fontSize: 15, cursor: "pointer", letterSpacing: 0.2 });
