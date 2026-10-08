/* ============================================================
   DATA DETECTIVE — Case 9 "The Cold Case" (field data).

   Unlike cases 1–8, nothing here is generated: the six reports are
   REAL Google Analytics exports from a UK electronics retailer,
   25 Aug – 3 Nov 2015 (merchant anonymised to Chrichton, the
   suite's fictional company). The pedagogy inverts the other
   cases: there the data is clean and one segment breaks; here the
   business is fine and the MEASUREMENT is broken. The surface
   story ("Referral converts at 16% — shift the paid budget into
   it") is a trap built from three compounding measurement faults
   that were endemic in real 2015 GA properties:

     1. payment-gateway self-referrals (paypal.com, sagepay) steal
        conversion credit from the channels that earned it;
     2. sandbox.paypal.com test orders post £387k of FAKE revenue
        into the live property (11.8% of the total);
     3. internal/staging/localhost traffic is unfiltered.

   Plus two real-but-secondary findings (Shopping-ad waste, the
   mobile gap) that make plausible half-truth distractors. Scoring:
   three picks (verdict / smoking gun / first action) plus how many
   of the seven clue groups the student flagged as evidence while
   investigating. Pure module: no React, no I/O.
   ============================================================ */
import { FIELD_DATA } from "./fieldcase-data.js";
import { FIELD_CASE } from "./fieldcase-meta.js";


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
    rows: ["pr-0", "pr-1", "pr-2", "pr-3", "pr-4", "pr-8", "pr-9", "pr-10", "pr-11", "pr-12", "pr-13", "pr-15"],
    detail: "Product performance corroborates the contamination: 343 SSDs across 4 orders, 200 patch cables in 1, 77 Cisco access points in 1, 60 iPads in 1. Compare a real consumer line — the Samsung UE48H6400 TV: 98 units, 96 separate purchases. The bulk rows are test baskets and unsegmented trade orders distorting product economics.",
  },
  {
    id: "mobile-gap", label: "The mobile conversion gap",
    rows: ["dev-mobile"],
    detail: "Mobile is already 15% of sessions but converts at 1.21% vs desktop's 2.52%, with 48-second visits and an 81% bounce — a 2015 site that isn't mobile-ready. Real, worth fixing, but not the cause of the channel numbers.",
  },
];

/* ---- scoring ------------------------------------------------------ */
function scoreFieldDiagnosis(guess, flaggedIds) {
  const flags = new Set(flaggedIds || []);
  const verdictCorrect = guess.verdict === FIELD_VERDICT_TRUTH;
  const gunCorrect = guess.gun === FIELD_GUN_TRUTH;
  const remedyCorrect = guess.remedy === FIELD_REMEDY_TRUTH;
  const clueDetail = FIELD_CLUES.map((c) => ({ id: c.id, label: c.label, core: !!c.core, detail: c.detail, found: c.rows.some((r) => flags.has(r)) }));
  const cluesFound = clueDetail.filter((c) => c.found).length;
  const coreFound = clueDetail.filter((c) => c.core && c.found).length;
  const fieldsCorrect = [verdictCorrect, gunCorrect, remedyCorrect].filter(Boolean).length;
  return { verdictCorrect, gunCorrect, remedyCorrect, fieldsCorrect, clueDetail, cluesFound, clueTotal: FIELD_CLUES.length, coreFound, coreTotal: FIELD_CLUES.filter((c) => c.core).length, allCorrect: fieldsCorrect === 3 };
}

const FIELD_EXPLANATION = "The agency read the dashboard, not the data. Referral's 16% was three faults stacked up. First, payment-gateway self-referrals: customers left the site to pay at PayPal or SagePay, and Google Analytics counted their return as a new session “referred” by the gateway — so the gateways got the credit for 1,923 sales that Paid Search, Organic and Direct actually earned. (Today this is fixed with a referral exclusion list; in 2015 you had to know to do it.) Second, and worse: sandbox.paypal.com — PayPal's test environment — posted 76 fake transactions worth £386,975 into the live property. That is 11.8% of ALL reported revenue, at a £5,092 average order. The Product report corroborates it: 343 SSDs in 4 orders, 200 cables in one, 60 iPads in one. Third, staging servers and a private IP appear as traffic — there were no filters at all. Strip the contamination and Referral is a normal little channel (~424 real transactions, mostly price-comparison sites). Paid Search DOES have a genuine problem — 888 exported Shopping-ad landing pages bouncing at 82% and converting at 0.85% — and mobile genuinely underperforms. But you cannot size either problem, or move a single pound of budget, until the tracking is fixed and the data re-measured. The correct advice to the board was: fix the measurement first. Everything else is a guess wearing a percentage.";

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
  products: { title: "Conversions → E-commerce → Product Performance", cols: FIELD_COLS_PRODUCTS, note: "Top rows of 2,500 products by quantity and revenue. “Qty / purchase” is quantity ÷ unique purchases — think about what a normal consumer basket looks like." },
};

export {
  FIELD_DATA, FIELD_CASE, FIELD_VERDICTS, FIELD_VERDICT_TRUTH, FIELD_GUNS, FIELD_GUN_TRUTH,
  FIELD_REMEDIES, FIELD_REMEDY_TRUTH, FIELD_CLUES, FIELD_EXPLANATION, FIELD_REPORTS,
  FIELD_REPORT_ROWS, FIELD_ROW_NAMES, FIELD_REPORT_META, FIELD_COLS_STD, FIELD_COLS_PRODUCTS, scoreFieldDiagnosis,
};
