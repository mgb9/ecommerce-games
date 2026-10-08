/* ============================================================
   DATA DETECTIVE — the field cases: Case 9 "The Cold Case" and
   Case 10 "The Christmas plan", two questions asked of ONE archive.

   Unlike the generated cases, nothing here is generated: the six
   reports are REAL Google Analytics exports from a UK electronics
   retailer, 25 Aug – 3 Nov 2015 (merchant anonymised to Chrichton,
   the suite's fictional company). The mechanic is the same for
   both: flag rows as evidence, then make three calls — a verdict,
   the smoking gun, the first action — scored with the clue groups
   flagged. Each question has its own calls, clues and explanation
   (FIELD_QUESTIONS); the dataset, reports and columns are shared.

   Case 9's pedagogy inverts the generated cases: there the data is
   clean and one segment breaks; here the business is fine and the
   MEASUREMENT is broken. The surface story ("Referral converts at
   16% — shift the paid budget into it") is a trap built from three
   compounding measurement faults that were endemic in real 2015 GA
   properties:

     1. payment-gateway self-referrals (paypal.com, sagepay) steal
        conversion credit from the channels that earned it;
     2. sandbox.paypal.com test orders post £387k of FAKE revenue
        into the live property (11.8% of the total);
     3. internal/staging/localhost traffic is unfiltered.

   Plus two real-but-secondary findings (Shopping-ad waste, the
   mobile gap) that make plausible half-truth distractors.

   Case 10 asks a marketing question of the same rows: which
   products should headline the Christmas campaign? Ranked by
   revenue, the top of the Product report is HP service contracts
   at £57k each; by units, trade baskets (343 SSDs in four orders);
   the real consumer sellers — the Samsung TVs, bought one at a
   time — are buried. And the age report says 65+ converts best,
   not the 35–44s the agency named, on 58% coverage.
   Pure module: no React, no I/O.
   ============================================================ */
import { FIELD_DATA } from "./fieldcase-data.js";
import { FIELD_CASE, CHRISTMAS_CASE, FIELD_CASES_META } from "./fieldcase-meta.js";


/* ---- the three picks --------------------------------------------- */
const FIELD_VERDICTS = [
  { id: "agency-right", label: "The agency was right — Referral converts at 16% vs Paid Search's 1.2%. Cut AdWords, invest in referral partnerships." },
  { id: "cut-pla", label: "The real problem is Google Shopping — hundreds of ad landing pages bounce at 80%+ and barely convert. Pause the PLAs and reinvest in SEO." },
  { id: "measurement-broken", label: "No budget decision is safe: the measurement itself is broken. Referral's 16% is mostly the site's own payment gateways plus test orders, and the revenue total includes fake transactions." },
  { id: "mobile-first", label: "The channel debate misses the point — mobile converts at half of desktop's rate. A mobile-first rebuild comes before any budget shuffle." },
];
const FIELD_VERDICT_TRUTH = "measurement-broken";

const FIELD_GUNS = [
  { id: "gun-referral-row", label: "Channels → Referral: 15,167 sessions converting at 16.0%" },
  { id: "gun-paypal", label: "Source/Medium → paypal.com / referral: 1,919 transactions at 52.9% “conversion”" },
  { id: "gun-sandbox", label: "Source/Medium → sandbox.paypal.com / referral: 76 transactions, £386,975 revenue from 97 sessions" },
  { id: "gun-internal", label: "Source/Medium → 192.168.1.100:7777 / referral: 34 sessions from a private IP address" },
];
const FIELD_GUN_TRUTH = "gun-sandbox";

const FIELD_REMEDIES = [
  { id: "rem-pause-pla", label: "Pause every Google Shopping campaign until the product feed is rebuilt" },
  { id: "rem-exclusions", label: "Fix the tracking: add the payment gateways to the referral exclusion list, filter internal/staging traffic, keep test orders out of the live property — then re-measure" },
  { id: "rem-mobile", label: "Commission a responsive, mobile-first redesign of the whole site" },
  { id: "rem-experiment", label: "Move half the paid-search budget into referral partnerships for one quarter and compare the results" },
];
const FIELD_REMEDY_TRUTH = "rem-exclusions";

/* ---- the clue chain ----------------------------------------------
   Seven groups of evidence. A group counts as "found" if the student
   flagged ANY of its rows before diagnosing. The first three are the
   core of the correct verdict; the rest corroborate or contextualise. */
const FIELD_CLUES = [
  {
    id: "referral-anomaly", label: "The too-good-to-be-true channel", core: true,
    rows: ["ch-referral"],
    detail: "Channels: Referral converts at 16.0% — 13× Paid Search. A number that good is either a goldmine or a measurement fault. Detectives check before celebrating.",
  },
  {
    id: "gateway-selfref", label: "Payment-gateway self-referrals", core: true,
    rows: ["sm-paypal-com-referral", "sm-live-sagepay-com-referral"],
    detail: "Source/Medium: paypal.com “refers” 1,919 transactions (£533k) at 52.9%, sagepay 4 more. Customers left the checkout to pay and were counted as a NEW referred session on return — the gateway is credited with sales that Paid Search, Organic and Direct actually earned. Strip the gateways and real referral is ~424 transactions.",
  },
  {
    id: "sandbox", label: "Test orders in the live data", core: true,
    rows: ["sm-sandbox-paypal-com-referral"],
    detail: "sandbox.paypal.com is PayPal's TEST environment: 97 sessions, 76 “transactions”, £386,975 — 11.8% of all reported revenue, at an impossible £5,092 average order. This revenue never existed. Every total in every report is contaminated.",
  },
  {
    id: "internal", label: "Unfiltered internal & staging traffic",
    rows: ["sm-192-168-1-100-7777-referral", "sm-2staging-chrichton-co-uk-referral", "sm-workshop-chrichton-co-uk-referral"],
    detail: "A private IP (192.168.1.100:7777), staging and workshop subdomains all appear as “referrals”. Small in volume, but proof there are no view filters — consistent with test orders reaching the live property.",
  },
  {
    id: "pla-waste", label: "Shopping ads that never convert",
    rows: ["lp-21", "lp-18", "lp-15", "lp-10", "lp-7", "lp-3", "lp-2"],
    detail: "Across all the exported landing pages, those tagged ?ref=PLA (Google Shopping) took ~70,600 sessions at an 82% bounce and 0.85% conversion. Fourteen Shopping ads drove 200+ visits each without producing a single order — the Archos smart-home kit's ad landed 509 visitors, 91% of whom bounced, in visits averaging 11 seconds. Paid Search has a real targeting problem, just a smaller one than the headline suggests.",
  },
  {
    id: "bulk-orders", label: "Impossible basket sizes",
    rows: ["pr-0", "pr-1", "pr-2", "pr-3", "pr-4", "pr-8", "pr-9", "pr-10", "pr-11", "pr-12", "pr-13", "pr-15", "pr-b10", "pr-b11"],
    detail: "Product performance corroborates the contamination: 343 SSDs across 4 orders, 200 patch cables in 1, 77 Cisco access points in 1, 60 iPad Airs in 1. Compare a real consumer line — the Samsung UE48H6400 TV: 98 units, 96 separate purchases. The bulk rows are test baskets and unsegmented trade orders distorting product economics.",
  },
  {
    id: "mobile-gap", label: "The mobile conversion gap",
    rows: ["dev-mobile"],
    detail: "Mobile is already 15% of sessions but converts at 1.21% vs desktop's 2.52%, with 48-second visits and an 81% bounce — a 2015 site that isn't mobile-ready. Real, worth fixing, but not the cause of the channel numbers.",
  },
];

/* ---- scoring (either question) ------------------------------------ */
function scoreFieldDiagnosis(guess, flaggedIds, q = COLD_CASE_Q) {
  const flags = new Set(flaggedIds || []);
  const verdictCorrect = guess.verdict === q.verdictTruth;
  const gunCorrect = guess.gun === q.gunTruth;
  const remedyCorrect = guess.remedy === q.remedyTruth;
  const clueDetail = q.clues.map((c) => ({ id: c.id, label: c.label, core: !!c.core, detail: c.detail, found: c.rows.some((r) => flags.has(r)) }));
  const cluesFound = clueDetail.filter((c) => c.found).length;
  const coreFound = clueDetail.filter((c) => c.core && c.found).length;
  const fieldsCorrect = [verdictCorrect, gunCorrect, remedyCorrect].filter(Boolean).length;
  return { verdictCorrect, gunCorrect, remedyCorrect, fieldsCorrect, clueDetail, cluesFound, clueTotal: q.clues.length, coreFound, coreTotal: q.clues.filter((c) => c.core).length, allCorrect: fieldsCorrect === 3 };
}

// Case 9's explanation, in the same four parts as the generated cases'.
const COLD_CASE_EXPLANATION = {
  what: "The agency read the dashboard, not the data. Referral's 16% was three faults stacked up. First, payment-gateway self-referrals: customers left the site to pay at PayPal or SagePay, and Google Analytics counted their return as a new session “referred” by the gateway — so the gateways got the credit for 1,923 sales that Paid Search, Organic and Direct actually earned. (Today this is fixed with a referral exclusion list; in 2015 you had to know to do it.) Second, and worse: sandbox.paypal.com — PayPal's test environment — posted 76 fake transactions worth £386,975 into the live property. That is 11.8% of ALL reported revenue, at a £5,092 average order. Third, staging servers and a private IP appear as traffic — there were no filters at all.",
  data: "The Product report corroborates it: 343 SSDs in 4 orders, 200 cables in one, 60 iPads in one. Strip out the gateways and the test orders and Referral is a normal little channel of about 424 transactions — those big enough to appear by name are mostly price-comparison and voucher sites.",
  herrings: "Paid Search DOES have a genuine problem — 888 exported Shopping-ad landing pages bouncing at 82% and converting at 0.85% — and mobile genuinely underperforms. But you cannot size either problem, or move a single pound of budget, until the tracking is fixed and the data re-measured.",
  next: "The correct advice to the board was: fix the measurement first. Everything else is a guess wearing a percentage.",
  plain: {
    what: "The agency read the dashboard, not the data. Referral's 16% came from three faults together. First, self-referrals from payment gateways: customers left the site to pay at PayPal or SagePay. Google Analytics counted their return as a new visit “referred” by the gateway. So the gateways got the credit for 1,923 sales that Paid Search, Organic and Direct really earned. (Today a referral exclusion list fixes this. In 2015 you had to know to set it up.) Second, and worse: sandbox.paypal.com is PayPal's test system. It posted 76 fake transactions worth £386,975 into the live data. That is 11.8% of ALL reported revenue, at £5,092 per order. Third, staging servers and a private IP address appear as traffic. There were no filters at all.",
    data: "The Product report agrees: 343 SSDs in 4 orders, 200 cables in one order, 60 iPads in one order. Remove the gateways and the test orders, and Referral is a normal small channel of about 424 transactions. The ones big enough to appear by name are mostly price-comparison and voucher sites.",
    herrings: "Paid Search DOES have a real problem: 888 exported Shopping-ad landing pages with an 82% bounce rate and 0.85% conversion. Mobile really does perform badly. But you cannot measure either problem, or move any budget, until the tracking is fixed and the data is measured again.",
    next: "The right advice to the board was: fix the measurement first. Everything else is a guess dressed up as a percentage.",
  },
};
const joined = (e) => [e.what, e.data, e.herrings, e.next].join(" ");
const FIELD_EXPLANATION = joined(COLD_CASE_EXPLANATION);

const COLD_CASE_Q = {
  claim: "Referral converts at 16% against Paid Search's 1.2% — cut the AdWords budget and invest in referral partnerships.",
  verdictTitle: "1 · Your verdict to the board",
  gunTitle: "2 · The smoking gun — the one row that proves the revenue figure cannot be trusted",
  verdicts: FIELD_VERDICTS, verdictTruth: FIELD_VERDICT_TRUTH, guns: FIELD_GUNS, gunTruth: FIELD_GUN_TRUTH,
  remedies: FIELD_REMEDIES, remedyTruth: FIELD_REMEDY_TRUTH, clues: FIELD_CLUES, explanation: COLD_CASE_EXPLANATION,
  wentWell: { verdict: "You saw that the measurement itself was broken — the call the whole case turns on.", gun: "You picked the smoking gun: test orders posting fake revenue into the live data.", remedy: "You chose to fix the measurement first, before moving any budget." },
  workOn: { verdict: "Before trusting any channel's numbers, ask whether the tracking can be believed: who is being counted, and is any of it fake?", remedy: "Fix the data before acting on it: no budget decision is safer than the numbers it rests on." },
};

/* ---- Case 10: the Christmas plan --------------------------------- */
const CHRISTMAS_Q = {
  claim: "Lead with our top ten products by revenue, put the Shopping budget behind the product pages that already pull the most traffic, and target 35–44s — our best-converting age group.",
  verdictTitle: "1 · Your verdict on the plan",
  gunTitle: "2 · The smoking gun — the one row that proves “top by revenue” would headline the wrong products",
  verdicts: [
    { id: "top-revenue", label: "Go with the plan — lead with the top ten products by revenue. The HP support contracts and the big SSD and RAM lines are where the money is." },
    { id: "top-units", label: "Lead with the volume sellers instead — SSDs, keyboards, cables and RAM moved hundreds of units each." },
    { id: "consumer-purchases", label: "Rank by how many separate customers bought each product, consumer lines only: the Samsung TVs — the 48\" (96 buyers), 40\" (62), 55\" (52) and 32\" (39) — and the TomTom Runner (27), each bought one at a time. The revenue and unit rankings are trade orders and service contracts." },
    { id: "pla-products", label: "Lead with the products behind the busiest Shopping-ad landing pages — they already have the traffic." },
  ],
  verdictTruth: "consumer-purchases",
  guns: [
    { id: "gun-carepack", label: "Products → Electronic HP Care Pack 4-hour 24x7: £229,451 from 4 purchases — £57,363 each" },
    { id: "gun-ssd", label: "Products → Kingston SSDNow V300 120 GB: 343 units in 4 purchases" },
    { id: "gun-shipping", label: "Products → Custom Shipping Charge: 104 purchases — the most “bought” line in the report" },
    { id: "gun-tv", label: "Products → Samsung UE48H6400 TV: 98 units, 96 purchases" },
  ],
  gunTruth: "gun-carepack",
  remedies: [
    { id: "rem-rerank", label: "Re-rank the catalogue by unique purchases, with trade orders, service contracts and test orders separated from consumer sales — then pick the headline products, and check the age report's coverage before targeting on it" },
    { id: "rem-double-pla", label: "Double the Shopping-ads budget behind the top product pages" },
    { id: "rem-target-35", label: "Target 35–44s only, since they convert best" },
    { id: "rem-run", label: "Run the plan as proposed — the report totals are what they are" },
  ],
  remedyTruth: "rem-rerank",
  clues: [
    {
      id: "bulk-baskets", label: "Trade baskets at the top of the unit ranking", core: true,
      rows: ["pr-0", "pr-1", "pr-2", "pr-3", "pr-4", "pr-6", "pr-8", "pr-9", "pr-10", "pr-11", "pr-12", "pr-13", "pr-15", "pr-b10", "pr-b11"],
      detail: "Product performance, sorted by quantity: 343 SSDs in 4 purchases, 282 keyboard sets in 4, 200 patch cables in 1, 200 RAM modules in 2, 77 Cisco access points in 1, 60 iPad Airs in 1. Those are trade orders — or test baskets — not Christmas shoppers. “Qty / purchase” is the tell: a consumer buys one.",
    },
    {
      id: "service-contracts", label: "Service contracts at the top of the revenue ranking", core: true,
      rows: ["pr-19", "pr-20", "pr-21", "pr-22", "pr-23"],
      detail: "Sorted by revenue, the top of the report is HP support contracts: £229,451 from 4 purchases at £57,363 each, £147,195 from 3, £62,401 from 5. The five biggest contract lines alone are about £504,000 — around 15% of the site's revenue — from 26 purchases. Nobody puts a datacentre support contract in a Christmas email.",
    },
    {
      id: "consumer-sellers", label: "The products real shoppers buy", core: true,
      rows: ["pr-14", "pr-16", "pr-17", "pr-b0", "pr-b1", "pr-b2", "pr-b4", "pr-b5", "pr-b9"],
      detail: "Sorted by unique purchases: the Samsung UE48H6400 (96 buyers, 98 units — one each), the UE40JU6400K (62), the UE55JU6400K (52) and the UE32J5500AK (39), then a second 32\" Samsung (28) and the TomTom Runner (27). Rank by buyers and these are the headline products; by revenue or units they are buried. (Next by buyers come the APC UPS (23), two more Samsung TVs and the DrayTek router (19) — the UPS and the router are business kit. The Sony 75\", high-value at £1,599, had only 15 buyers.)",
    },
    {
      id: "fee-line", label: "A fee line in the product report",
      rows: ["pr-7"],
      detail: "“Custom Shipping Charge” has 104 purchases — more than any product. It is a delivery fee that reaches the product report as a line item. Any ranking that doesn't read the row names will promote it.",
    },
    {
      id: "duplicate-rows", label: "One product, two rows",
      rows: ["pr-12", "pr-13"],
      detail: "The Kingston mS200 60 GB appears twice with slightly different names (SATA 6Gb/s and SATA-600) — the same product under two catalogue entries. Per-product totals need the rows added together, and the feed needs cleaning before it drives a campaign.",
    },
    {
      id: "age-coverage", label: "The best converters aren't who the agency said",
      rows: ["age-65plus", "age-45-54", "age-35-44", "age-total"],
      detail: "The agency said 35–44s convert best. They have the most sessions and revenue — but 65+ converts at 2.76% and 45–54 at 2.60%, against 35–44's 2.44%. And age is known for only 133,539 of 230,128 sessions (58%): a targeting decision built on this report rests on a bit over half the traffic.",
    },
    {
      id: "pla-landings", label: "The busy pages are the pages that lose people",
      rows: ["lp-2", "lp-21", "lp-18", "lp-10"],
      detail: "The busiest TV page's Shopping-ad landing (?ref=PLA) took 2,502 sessions, bounced 71% of them and produced 22 orders — under 1% — while the TV sold 96 times in total. Across the export, Shopping-ad landings bounce at 82% and convert at 0.85%. “The pages that already pull the most traffic” are the pages that lose it.",
    },
    {
      id: "where-buyers-start", label: "Where buyers actually arrive",
      rows: ["lp-0", "lp-4"],
      detail: "The homepage landed 14,758 sessions and converted 4.03% of them (595 orders); the basket page 18.6%. Buyers of the TVs mostly did not land on a TV page from an ad — they came in through the front door. Audience-first means starting from how buyers actually arrive.",
    },
    {
      id: "test-orders", label: "Test orders, somewhere in these rows",
      rows: ["sm-sandbox-paypal-com-referral"],
      detail: "Remember Case 09: 76 of the period's transactions were PayPal sandbox tests at a £5,092 average. Some of the rows at the top of the product report may be those — this report can't tell you which. Separate test orders before trusting any product ranking.",
    },
  ],
  explanation: {
    what: "The plan would have headlined the wrong products and targeted the wrong people, because it read the product report by the wrong column. At an IT reseller, “top by revenue” means service contracts — the five biggest HP support lines alone took about £504,000 from 26 purchases, £57,363 for a single one — and “top by units” means trade baskets: 343 SSDs in four purchases, 200 cables in one, 60 iPad Airs in one. None of them is a Christmas gift.",
    data: "Rank by unique purchases, consumer lines only, and the headline products are plain: the Samsung 48\" TV (96 separate buyers), the 40\" (62), the 55\" (52) and the 32\" (39), then a second 32\" (28) and the TomTom Runner (27). The age report doesn't say what the agency said either: 65+ converts best (2.76%), then 45–54 (2.60%), with 35–44 (2.44%) third — they simply have the most sessions — and age is known for only 58% of sessions. The Shopping-ad landing pages “with the most traffic” bounce at 82% and convert at 0.85%; the TV's own ad landing turned 2,502 clicks into 22 orders, while the homepage turned 14,758 visits into 595.",
    herrings: "“Custom Shipping Charge” is the most-purchased line in the report — it is a delivery fee. The Kingston mS200 appears twice under two names. And 76 of the period's transactions were PayPal sandbox tests, somewhere in these rows.",
    next: "Separate trade orders, service contracts and test orders from consumer sales; re-rank by unique purchases; take the targeting from a report whose coverage you know; and put the Shopping budget behind pages that convert, not pages that are busy.",
    plain: {
      what: "The plan would have used the wrong products and the wrong audience, because it read the product report by the wrong column. At an IT reseller, “top by revenue” means service contracts. The five biggest HP support lines alone made about £504,000 from 26 purchases — £57,363 for a single one. “Top by units” means trade orders: 343 SSDs in four purchases, 200 cables in one, 60 iPad Airs in one. None of them is a Christmas gift.",
      data: "Rank by the number of separate buyers, consumer products only, and the headline products are clear: the Samsung 48\" TV (96 separate buyers), the 40\" (62), the 55\" (52) and the 32\" (39), then a second 32\" (28) and the TomTom Runner (27). The age report does not say what the agency said. 65+ converts best (2.76%), then 45–54 (2.60%). 35–44 (2.44%) is third — they simply have the most visits. And age is known for only 58% of visits. The Shopping-ad landing pages “with the most traffic” have an 82% bounce rate and convert at 0.85%. The TV's own ad page turned 2,502 clicks into 22 orders. The homepage turned 14,758 visits into 595.",
      herrings: "“Custom Shipping Charge” is the most-purchased line in the report. It is a delivery fee. The Kingston mS200 appears twice under two names. And 76 of the period's transactions were PayPal test orders, somewhere in these rows.",
      next: "Separate trade orders, service contracts and test orders from consumer sales. Rank by separate buyers. Take the audience from a report whose coverage you know. Put the Shopping budget behind pages that convert, not pages that are busy.",
    },
  },
  wentWell: { verdict: "You ranked by buyers, not by revenue or units — the call the whole plan turns on.", gun: "You picked the smoking gun: a £57,000 service contract at the top of the revenue ranking.", remedy: "You chose to separate trade, contract and test orders before picking a single product." },
  workOn: { verdict: "At a reseller, revenue and units rank trade orders and contracts first. Rank consumer products by how many separate people bought them.", remedy: "Clean the ranking before you act on it: separate trade orders, service contracts and test orders, then re-rank by buyers." },
};

const FIELD_QUESTIONS = { [FIELD_CASE.id]: COLD_CASE_Q, [CHRISTMAS_CASE.id]: CHRISTMAS_Q };
// The field cases, complete: metadata (fieldcase-meta.js) plus their questions.
const FIELD_CASES = FIELD_CASES_META.map((m) => ({ ...m, ...FIELD_QUESTIONS[m.id] }));
const fieldCaseById = (id) => FIELD_CASES.find((c) => c.id === id);

/* ---- report catalogue for the UI ---------------------------------- */
const FIELD_REPORTS = [
  { group: "Acquisition", items: [
    { key: "channels", label: "Channels" },
    { key: "sourceMedium", label: "Source / Medium" },
  ]},
  { group: "Audience", items: [
    { key: "device", label: "Mobile overview" },
    { key: "age", label: "Demographics: Age" },
  ]},
  { group: "Behaviour", items: [{ key: "landingPages", label: "Landing pages" }] },
  { group: "Conversions", items: [{ key: "products", label: "Product performance" }] },
];

// Each report's table rows as shown: the named rows, then its total row
// if the export has one. Plus a lookup of any flaggable row's name by id
// (ids are unique across reports — the evidence list relies on it).
const FIELD_REPORT_ROWS = Object.fromEntries(FIELD_REPORTS.flatMap((g) => g.items).map(({ key }) => {
  const d = FIELD_DATA[key];
  return [key, d.total ? [...d.rows, d.total] : d.rows];
}));
const FIELD_ROW_NAMES = Object.fromEntries(Object.values(FIELD_REPORT_ROWS).flat().map((r) => [r.id, r.name]));

// Column sets. `std` fits every session-metric report; products differ.
const FIELD_COLS_STD = [
  { key: "sessions", label: "Sessions", type: "int" },
  { key: "share", label: "Share", type: "share" },        // computed vs table total
  { key: "pctNew", label: "% New", type: "pct0" },
  { key: "bounce", label: "Bounce", type: "pct1" },
  { key: "pages", label: "Pages/Sess", type: "num2" },
  { key: "dur", label: "Avg dur", type: "secs" },
  { key: "conv", label: "Conv rate", type: "pct2" },
  { key: "trans", label: "Trans", type: "int" },
  { key: "revenue", label: "Revenue", type: "gbp" },
  { key: "aov", label: "AOV", type: "gbpAov" },           // computed revenue/trans
];
const FIELD_COLS_PRODUCTS = [
  { key: "qty", label: "Quantity", type: "int" },
  { key: "purchases", label: "Unique purchases", type: "int" },
  { key: "avgQty", label: "Qty / purchase", type: "num2" },
  { key: "revenue", label: "Product revenue", type: "gbp" },
  { key: "avgPrice", label: "Avg price", type: "gbp2" },
];

// Per-report notes shown under the table — real caveats of these exports,
// which are ALSO gentle nudges about where to look.
const FIELD_REPORT_META = {
  channels: { title: "All Traffic → Channels", cols: FIELD_COLS_STD, note: "Default channel grouping, as exported. One of these rows is doing something no marketing channel can really do." },
  sourceMedium: { title: "All Traffic → Source / Medium", cols: FIELD_COLS_STD, note: "Top sources shown; the long tail is aggregated into one row. Read the source names themselves, not just the numbers." },
  device: { title: "Audience → Mobile → Overview", cols: FIELD_COLS_STD, note: "Device category for all 230k sessions." },
  age: { title: "Audience → Demographics → Age", cols: FIELD_COLS_STD, note: "Age is only known for 133,539 of 230,128 sessions (58%) — Google's demographics coverage, normal for 2015. Totals here won't match other reports." },
  landingPages: { title: "Behaviour → Landing Pages", cols: FIELD_COLS_STD, note: "Top pages of ~1,000 exported. ?ref=PLA marks a Google Shopping ad click; ?ref=ID marks a price-comparison site. Compare their bounce rates with the homepage's." },
  products: { title: "Conversions → E-commerce → Product Performance", cols: FIELD_COLS_PRODUCTS, note: "Rows from 2,500 products: the biggest by quantity, by revenue and by number of buyers, and a few other large orders. “Qty / purchase” is quantity ÷ unique purchases — think about what a normal consumer basket looks like." },
};

export {
  FIELD_DATA, FIELD_CASE, CHRISTMAS_CASE, FIELD_CASES, FIELD_QUESTIONS, fieldCaseById, joined as joinedExplanation,
  FIELD_VERDICTS, FIELD_VERDICT_TRUTH, FIELD_GUNS, FIELD_GUN_TRUTH,
  FIELD_REMEDIES, FIELD_REMEDY_TRUTH, FIELD_CLUES, FIELD_EXPLANATION, FIELD_REPORTS,
  FIELD_REPORT_ROWS, FIELD_ROW_NAMES, FIELD_REPORT_META, FIELD_COLS_STD, FIELD_COLS_PRODUCTS, scoreFieldDiagnosis,
};
