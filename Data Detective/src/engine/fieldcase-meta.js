/* Case 8's metadata — its number, ticket and period — kept apart from the
   real GA data (fieldcase-data.js, ~1,400 lines) so the case picker can
   name the case without loading the data: the field case is code-split
   and only downloaded when a student opens it. */
export const FIELD_CASE = {
  id: "cold-case-2015", n: 8, difficulty: "Field data",
  ticket: {
    channel: "#cro-team", from: "Priya · Ops",
    subject: "Cold case: audit the 2015 channel decision",
    body: "Training exercise — but a real one. While migrating the data warehouse we found the full analytics exports from autumn 2015, back when Chrichton was a pure IT reseller. That autumn, the agency told the board: “Referral converts at 16% against Paid Search's 1.2% — cut the AdWords budget and invest in referral partnerships.” The decision was never audited. Work the data like a detective: was the recommendation sound? Flag the rows you'd put in front of the board. Fair warning — these are raw, real exports. Nobody has cleaned them for you.",
  },
  period: "25 Aug – 3 Nov 2015 · 71 days · real exported data",
};
