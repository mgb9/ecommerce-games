/* Case 9's metadata — its number, ticket, period and principle — kept
   apart from the real GA data (fieldcase-data.js, ~1,400 lines) so the
   inbox and the case file can name the case without loading the data: the
   field case is code-split and only downloaded when a student opens it. */
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
  period: "25 Aug – 3 Nov 2015 · 71 days · real exported data",
};
