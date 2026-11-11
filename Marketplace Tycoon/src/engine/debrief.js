/* ============================================================
   DEBRIEF — what the student's own run showed (pure, no React).
   Every sentence is built from the run's history, so nothing here
   claims something the student did not do: no CRO spend → no "your
   bets paid off"; never short of cash → no insolvency lecture.
   The general principle comes second, worded as the simulation
   actually models it.
   ============================================================ */
import {
  SC, PMAP, CRO_LEVERS, fulfilOf, croConvOf, botCro, gbp, COMPETITORS, CRO_TEST_FRACTION,
} from "./engine.js";
import { fitOf } from "./platformfit.js";

const sum = (arr, f) => arr.reduce((a, x) => a + (f(x) || 0), 0);
const n0 = (v) => Math.round(v).toLocaleString("en-GB");
const plural = (n, one, many) => `${n0(n)} ${n === 1 ? one : many}`;

/* The facts of the run, in one place (also used by tests). */
function runFacts(stores, player, cfg, predictionLog = []) {
  const sc = SC(cfg);
  const h = player.history;
  const weeks = h.length;
  const revenue = sum(h, (x) => x.revenue);
  const sold = sum(h, (x) => x.sold);
  const returningSales = sum(h, (x) => x.returning);
  const startCash = player.cash - player.cumProfit; // cash = starting cash + every week's profit
  const minCashWeek = h.reduce((a, x) => (a == null || x.cash < a.cash ? x : a), null);
  const firstNegative = h.find((x) => x.cash < 0) || null;

  // CRO: tiers deployed, tests bought, and how the deployed tiers' true lifts compare with their estimate range
  const deployed = [];
  CRO_LEVERS.forEach((l) => {
    for (let t = 1; t <= (player.cro[l.id] || 0); t++) {
      const lift = player.croLifts ? player.croLifts[l.id][t - 1] : 0;
      deployed.push({ lever: l.id, tier: t, lift, lowerHalf: lift < (l.loLift + l.hiLift) / 2, tested: !!(player.croTested || {})[`${l.id}:${t}`] });
    }
  });
  const testedKeys = Object.keys(player.croTested || {});
  const testedNotDeployed = testedKeys.filter((k) => { const [lever, tier] = k.split(":"); return Number(tier) > (player.cro[lever] || 0); }).length;
  const bestRivalConv = Math.max(...COMPETITORS.map((c) => croConvOf(botCro(c.id, Math.max(1, weeks)), false, null, sc)));

  const errors = predictionLog.filter((p) => p.predicted != null).map((p) => p.predicted - p.actual);
  return {
    sc, weeks, revenue, sold, returningSales, startCash, minCashWeek, firstNegative,
    croSpend: sum(h, (x) => x.croCost), deployed, tests: testedKeys.length, testedNotDeployed,
    untestedDeploys: deployed.filter((d) => !d.tested).length, lowerHalf: deployed.filter((d) => d.lowerHalf).length,
    conv: croConvOf(player.cro, true, player.croLifts, sc), bestRivalConv,
    returns: sum(h, (x) => x.returns), returnHandling: sum(h, (x) => x.returnHandling),
    stockoutWeeks: h.filter((x) => x.lostSales > 0).length, lostSales: sum(h, (x) => x.lostSales), holding: sum(h, (x) => x.holding),
    commission: sum(h, (x) => x.commission), platformCost: sum(h, (x) => x.platformCost),
    hits: predictionLog.filter((p) => p.hit).length, predictions: predictionLog.length,
    meanAbsError: errors.length ? sum(errors, Math.abs) / errors.length : 0,
    bias: errors.length ? sum(errors, (e) => e) / errors.length : 0, // < 0: predicted a better place than achieved
    finalReview: weeks ? h[weeks - 1].review : player.review,
  };
}

function debriefCards(stores, player, cfg, predictionLog = []) {
  const f = runFacts(stores, player, cfg, predictionLog);
  const { sc } = f;
  const ful = fulfilOf(player, sc);
  const platform = PMAP[player.platformId];
  const pf = fitOf(sc, player.platformId);
  const cards = [];

  // 1 — technology selection (LO1)
  const pfLine = pf.matchedBest
    ? `Against this brief's requirements it was rated the strongest fit of the four (${pf.row.verdict}).`
    : `Against this brief's requirements it was rated “${pf.row.verdict}”, ${pf.rank} of ${pf.total}; ${PMAP[pf.recommended].name} was rated the strongest fit.`;
  cards.push({ t: `Fit to the brief: ${sc.short}`,
    b: `You ran ${platform.name}${sc.digital ? "" : ` with ${ful.name}`} on the ${sc.name} brief. ${pfLine} ${sc.teach} The fit rating is a structured argument about requirements, not a forecast of profit. In this simulation a well-run store tends to earn a few per cent more on the strongest-fit platform; price, stock, advertising and conversion work move the result far more. A real platform recommendation needs both: the requirements case and the numbers.` });

  // 2 — CRO
  let cro;
  if (f.croSpend === 0) {
    cro = `You spent nothing on conversion optimisation, so your site converted at ×1.000 all game. By week ${f.weeks} the most optimised rival was converting at ×${f.bestRivalConv.toFixed(3)} — every visitor you both reached was worth more to them than to you.`;
  } else {
    cro = `You spent ${gbp(f.croSpend)} on conversion optimisation — ${plural(f.tests, "A/B test", "A/B tests")} and ${plural(f.deployed.length, "tier", "tiers")} deployed — and finished converting at ×${f.conv.toFixed(3)}.`;
    if (f.deployed.length === 1) cro += ` The tier you deployed had a true lift in the ${f.lowerHalf ? "lower" : "upper"} half of its estimated range.`;
    else if (f.deployed.length) cro += ` ${f.lowerHalf} of the ${f.deployed.length} you deployed had a true lift in the lower half of the estimated range.`;
    if (f.untestedDeploys) cro += ` You deployed ${f.untestedDeploys} without testing first.`;
    if (f.testedNotDeployed) cro += ` ${plural(f.testedNotDeployed, "test was", "tests were")} for a tier you then did not deploy.`;
  }
  cards.push({ t: "CRO is a portfolio of bets",
    b: `${cro} Each tier's lift is uncertain until measured: a test costs ${Math.round(CRO_TEST_FRACTION * 100)}% of the deploy price and shows the true lift before you commit the rest.` });

  // 3 — operations
  let ops;
  if (sc.digital) {
    ops = `This brief delivers electronically: no stock to hold, nothing to ship and no stockouts. ${f.returns > 0 ? `${n0(f.returns)} sales were still refunded (${gbp(f.returnHandling)} to process). ` : ""}With operations out of the picture, price, reach and checkout decide the result.`;
  } else {
    const bits = [];
    if (f.returns > 0) bits.push(`${n0(f.returns)} units came back as returns — each shipped, then refunded, with ${gbp(f.returnHandling)} of handling on top`);
    if (f.stockoutWeeks > 0) bits.push(`you ran out of stock in ${plural(f.stockoutWeeks, "week", "weeks")}, turning away about ${n0(f.lostSales)} buyers`);
    if (f.holding > 0) bits.push(`unsold stock cost ${gbp(f.holding)} to hold`);
    if (ful.infiniteStock) bits.push(`dropshipping meant no stock risk, in exchange for the supplier's ${Math.round((ful.marginCut || 0) * 100)}% cut of sales`);
    ops = bits.length ? `Over ${f.weeks} weeks ${bits.join("; ")}.` : `You had no returns, stockouts or holding cost over ${f.weeks} weeks.`;
    ops += ` On a physical brief, fulfilment and stock decisions move profit as much as the storefront does.`;
  }
  cards.push({ t: "Operations affect the margin", b: ops });

  // 4 — retention
  const share = f.sold > 0 ? Math.round((f.returningSales / f.sold) * 100) : 0;
  const ret = f.returningSales > 0
    ? `${n0(f.returningSales)} of your ${n0(f.sold)} kept sales (${share}%) went to returning regulars — demand you did not pay to win a second time. You finished with ${plural(Math.round(player.loyalBase), "regular", "regulars")} and a ${f.finalReview.toFixed(1)}★ rating.`
    : `None of your ${n0(f.sold)} kept sales went to returning regulars; you finished with a ${f.finalReview.toFixed(1)}★ rating.`;
  cards.push({ t: "Retention is the cheap moat",
    b: `${ret} In this market the rating rises with conversion quality and falls with stockouts and returns; buyers only become regulars above 2.5★, and a stockout loses some of the regulars you have.` });

  // 5 — cash
  let cash;
  if (f.firstNegative) {
    cash = `Your cash went negative in week ${f.firstNegative.round} (lowest: ${gbp(f.minCashWeek.cash)} in week ${f.minCashWeek.round}): your losses to that point were larger than your ${gbp(f.startCash)} starting cash.`;
    cash += player.cash >= 0 ? ` You traded back to ${gbp(player.cash)} by the end — the game let you carry on; a real supplier or bank might not have.` : ` You finished ${gbp(-player.cash)} overdrawn.`;
  } else if (f.minCashWeek) {
    cash = `Your cash never ran out: its lowest point was ${gbp(f.minCashWeek.cash)} in week ${f.minCashWeek.round}, from ${gbp(f.startCash)} at the start.`;
  } else {
    cash = `You started with ${gbp(f.startCash)}.`;
  }
  cards.push({ t: "Cash is the constraint",
    b: `${cash} In this simulation stock is paid for as it sells, so cash moves in step with profit. Real stores pay suppliers before customers pay them, so they can run out of cash while still profitable on paper — the cash-flow forecast matters as much as the P&L.` });

  // 6 — rent
  const rent = f.commission + f.platformCost;
  cards.push({ t: "Stacked platform rent",
    b: f.revenue > 0
      ? `You paid ${gbp(f.commission)} in marketplace commission and ${gbp(f.platformCost)} in storefront${sc.digital ? "" : " and fulfilment-partner"} fees: ${Math.round((rent / f.revenue) * 100)}% of your ${gbp(f.revenue)} revenue, before goods, advertising or CRO. Sellers pay rent at several layers, and each layer can raise its price after you are committed.`
      : `You made no sales, but still owed ${gbp(f.platformCost)} in storefront${sc.digital ? "" : " and fulfilment-partner"} fees. Fixed platform rent is due whether or not you sell.` });

  // 7 — calibration
  let cal;
  if (!f.predictions) cal = "No predictions were recorded for this game.";
  else {
    cal = `You called your leaderboard position (by cumulative profit) correctly in ${f.hits} of ${f.predictions} weeks; on average you were ${f.meanAbsError.toFixed(1)} places out.`;
    if (f.bias <= -0.5) cal += " You usually expected to place higher than you did.";
    else if (f.bias >= 0.5) cal += " You usually expected to place lower than you did.";
  }
  cards.push({ t: "How calibrated were you?",
    b: `${cal} Everyone on seed ${cfg.seed} met the same demand, the same events and the same four rival strategies, so a different result from a classmate's comes from decisions — compare logs.` });

  return cards;
}

export { runFacts, debriefCards };
