/* The field cases' metadata — number, ticket, period, principle, what they
   develop — kept apart from the real GA data (fieldcase-data.js, ~1,400
   lines) and the questions asked of it (fieldcase.js), so the inbox and the
   case file can name a case without loading the archive: the field cases
   are code-split and only downloaded when a student opens one. */
const PERIOD = "25 Aug – 3 Nov 2015 · 71 days · real exported data";

export const FIELD_CASE = {
  id: "cold-case-2015", n: 9, difficulty: "Field data", title: "The 2015 cold case",
  lesson: "Before you trust a number, ask whether the measurement can be believed. Self-referrals, test orders and unfiltered internal traffic can make a channel look miraculous — fix the tracking, then re-measure, then decide.",
  words: ["selfreferral", "exclusionlist", "testtraffic", "aov", "pla"],   // glossary terms for the case report
  // what this case develops (see outcomes.js): LO1 partly — the first action is
  // choosing the right analytics configuration for this business
  outcomes: {
    los: ["LO3"], partly: ["LO1"], syllabus: ["Digital marketing for eCommerce"],
    skills: {
      research: "Auditing real, uncleaned exports for self-referrals, test orders and internal traffic before trusting them.",
      critical: "Questioning a channel that looked miraculous instead of acting on it.",
      organisation: "Recommending that the measurement be fixed before any budget moved.",
    },
    cv: "Audited real Google Analytics exports from a 2015 UK retailer and showed that a recommended budget shift rested on broken measurement (payment-gateway self-referrals and test orders).",
  },
  ticket: {
    channel: "#cro-team", from: "Priya · Ops",
    subject: "Cold case: audit the 2015 channel decision",
    body: "Training exercise — but a real one. While migrating the data warehouse we found the full analytics exports from autumn 2015, back when Chrichton was a pure IT reseller. That autumn, the agency told the board: “Referral converts at 16% against Paid Search's 1.2% — cut the AdWords budget and invest in referral partnerships.” The decision was never audited. Work the data like a detective: was the recommendation sound? Flag the rows you'd put in front of the board. Fair warning — these are raw, real exports. Nobody has cleaned them for you.",
  },
  period: PERIOD,
};

// Case 10: the same archive, a different question — marketing's product plan.
export const CHRISTMAS_CASE = {
  id: "christmas-plan-2015", n: 10, difficulty: "Field data", title: "The Christmas plan",
  words: ["aov", "coverage", "pla", "testtraffic"],
  lesson: "Rank products by how many people buy them, not by revenue or units: at a reseller, a handful of trade orders and service contracts can out-earn every consumer line. Audience-first means finding who actually buys and how they arrive — from reports you have checked for coverage and contamination.",
  outcomes: {
    los: ["LO3"], partly: [], syllabus: ["Digital marketing: audience-first marketing", "Digital marketing: content marketing"],
    skills: {
      research: "Reading a product report by the right column — separate buyers, not units or revenue — and checking a demographics report's coverage before targeting on it.",
      critical: "Seeing that 'top by revenue' at an IT reseller means service contracts and trade orders, not Christmas gifts.",
      organisation: "Sending the plan back to marketing with a ranking the business can act on, rather than the agency's.",
    },
    cv: "Audited an agency's Christmas merchandising plan against real analytics exports, showed its product rankings were driven by trade orders and service contracts, and re-ranked by separate buyers and verified audience data (real 2015 data).",
  },
  ticket: {
    channel: "#cro-team", from: "Dev · Growth Lead",
    subject: "Christmas plan: are these the right products?",
    body: "Same 2015 archive, different question. That autumn the agency's Christmas plan said: lead the homepage and emails with our top ten products by revenue; put the Shopping-ads budget behind the product pages that already pull the most traffic; and target 35–44s, “our best-converting age group”. Audit it against the reports. Which products should have headlined, and does the targeting hold up? Read the Product report slowly — and remember what Case 09 found in this data.",
  },
  period: PERIOD,
};
export const FIELD_CASES_META = [FIELD_CASE, CHRISTMAS_CASE];
