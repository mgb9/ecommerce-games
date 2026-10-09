/* ============================================================
   Tutor notes, for the instructor-only tutor's guide: per case, a time
   estimate, questions for the seminar debrief, the wrong turns students
   most often take, and a stretch question for those who finish early.
   Written to hold for every seed and noise level — no numbers, days or
   segment sizes, which change with the seed (the answer sheet has those).
   Keyed by case id; every case in the inbox must have an entry (tested).
   ============================================================ */

export const TUTOR_NOTES = {
  "paypal-gateway": {
    minutes: 15,
    prompts: [
      "The sitewide funnel said 'checkout'. What did splitting by payment method show that the funnel alone could not — and why would 'fix checkout' have sent engineering to the wrong place?",
      "Two events sit near the start of the drop. How did you decide which one mattered? What would you check outside the dashboard to be sure?",
      "The campaign brought in more visits during the same weeks. Why doesn't extra traffic, on its own, count as a cause here?",
    ],
    misconceptions: [
      "Blaming the event closest in time without checking which segment moved — timing narrows the suspects, it doesn't convict one.",
      "Reading a falling sitewide rate as 'the whole checkout is broken' when every route through it but one is fine.",
    ],
    extension: "Design the alert that would have caught this within hours: which metric, split by what, and what threshold — given how much a small payment method's rate wobbles day to day?",
  },
  "mobile-safari-bug": {
    minutes: 20,
    prompts: [
      "Device and browser each looked only 'a bit off' on their own. Why does a fault that lives in one combination look diluted in both single-dimension reports?",
      "Which cross-tab did you build first, and why? How would you choose which pair of dimensions to cross when there are many?",
      "Nobody on the team could reproduce the bug. What does that tell you about how releases are tested, and what would you change?",
    ],
    misconceptions: [
      "Stopping at 'it's Safari' or 'it's mobile' — the fix and the test plan both depend on the intersection.",
      "Treating the competitor's offer as the cause because paid search moved: it changed volume, not the rate of those who stayed.",
    ],
    extension: "A cross-tab of every pair of dimensions would find this every time — and would also throw up false alarms. How many pairs are there, and how would you guard against chasing noise in small cells?",
  },
  "traffic-mix": {
    minutes: 20,
    prompts: [
      "No segment's own conversion rate fell, yet the average did. Explain to a non-analyst how that can happen.",
      "Who owns this problem — engineering or marketing? What should the growth lead hear, and what should they stop measuring the campaign by?",
      "Is a campaign that lowers sitewide conversion a bad campaign? What would you need to know to decide?",
    ],
    misconceptions: [
      "Hunting for a broken page or device because 'conversion fell' — the honest finding is that nothing broke.",
      "Calling it a failure because the rate fell, without asking whether the extra visitors brought extra profit.",
    ],
    extension: "Connect this to Simpson's paradox: construct a two-segment example where every segment improves and the average still falls.",
  },
  "masked-desktop": {
    minutes: 25,
    prompts: [
      "The topline dipped only a little. What was hiding the size of the fault, and why did the team read it as good news?",
      "How would you estimate the real loss? Against what baseline — last week, or what the surge should have delivered?",
      "What habits would stop a calm topline being taken as 'nothing to see'?",
    ],
    misconceptions: [
      "Accepting a small topline dip as noise without segmenting — the fault is large where it lives.",
      "Naming the loyalty email as the cause: it was real, but it was the camouflage, not the fault.",
    ],
    extension: "Write the two-sentence note to the board that explains why last week's flat revenue was actually a loss.",
  },
  "stockout-slow-bleed": {
    minutes: 20,
    prompts: [
      "What did the shape of the decline tell you that its size could not? Contrast a cliff with a slide that keeps getting worse.",
      "Why is 'stock ran out' a better fit here than a site bug, given where the fall sits in the funnel?",
      "Which team acts first, and what change to the ad or catalogue feeds would stop the next stock-out costing as much?",
    ],
    misconceptions: [
      "Expecting a single start date for a gradual cause, and picking the day it became visible instead of the day the slide began.",
      "Blaming the new photography because it went live on the same pages.",
    ],
    extension: "How would you separate 'demand fell' from 'we couldn't sell what people wanted'? What data outside analytics would you ask for?",
  },
  "false-alarm-tracking": {
    minutes: 20,
    prompts: [
      "What number did you check the dashboard against, and why is it the one to trust here?",
      "What would rolling the site back have cost, and what would it have fixed?",
      "Measurement faults hit some browsers and devices harder than others. Why — and how does that make them look like real customer problems?",
    ],
    misconceptions: [
      "Treating analytics as the truth rather than as an instrument that can fail.",
      "Diagnosing a broken checkout from the segment that moved, without asking whether orders actually fell.",
    ],
    extension: "Specify a daily 'coverage' check — analytics purchases as a share of back-office orders — and say what level should page someone.",
  },
  "normal-week": {
    minutes: 15,
    prompts: [
      "How did you decide this dip was not an incident? What would a real incident have looked like in the segment reports?",
      "Small segments swing more from day to day than large ones. How does that change how you read a scary number in a small group?",
      "The ticket came from the CEO's office. How do you say 'nothing is broken' to a senior stakeholder, convincingly?",
    ],
    misconceptions: [
      "Feeling obliged to find a cause because someone asked 'what broke?'.",
      "Pointing at the smallest segment's big percentage swing as the culprit.",
    ],
    extension: "Build a 'normal range' for daily conversion from four weeks of data. How wide is it, and which calendar effects would you add to it?",
  },
  "orders-up-revenue-down": {
    minutes: 20,
    prompts: [
      "Revenue = sessions × conversion × average order value. Which of the three moved, and how did you find out before segmenting?",
      "The segment at fault looked like good news on conversion. Why is that the trap in this case?",
      "Nothing is technically broken. Who decides whether to undo the change, and on what evidence — orders, revenue or margin?",
    ],
    misconceptions: [
      "Assuming a revenue problem must be a conversion problem and segmenting the conversion rate only.",
      "Calling the dashboard wrong because orders and revenue disagree.",
    ],
    extension: "A discount lifts orders and cuts order value. Work out the break-even: how much must conversion rise for a given cut in order value to leave revenue — and then margin — unchanged?",
  },
  "cold-case-2015": {
    minutes: 35,
    prompts: [
      "Before you compared channels, what did you check about the data itself? Which finding changed your mind about the agency's claim?",
      "Why do payment gateways appear as 'referrers', and what does that do to the channel that looks best?",
      "Fixing tracking delays every decision. How do you argue for that delay to a board that wants to move budget now?",
    ],
    misconceptions: [
      "Taking the referral channel's conversion rate at face value and moving budget on it.",
      "Picking a real but secondary problem (Shopping ads, mobile) as the headline when the measurement can't yet be trusted.",
    ],
    extension: "List the analytics configuration a new store should have on day one so this can't happen, and connect it to your own Website Build.",
  },
  "christmas-plan-2015": {
    minutes: 35,
    prompts: [
      "Revenue, units and separate buyers each rank the products differently. Which ranking answers 'what should headline a Christmas campaign', and why?",
      "What kinds of orders sit at the top of the revenue and unit rankings at a reseller, and why do they mislead a consumer plan?",
      "Before targeting on age, what did you check about the age report? What share of users did it actually describe?",
    ],
    misconceptions: [
      "Ranking by revenue because 'that's where the money is' — one trade order or service contract can outweigh many consumer buyers.",
      "Trusting a demographics report without asking how many users it covers.",
    ],
    extension: "Rewrite the agency's three recommendations as you would have sent them, each with the report that supports it.",
  },
  "enterprise-outage": {
    minutes: 25,
    prompts: [
      "At this scale, why does a fault that barely shows in the weekly figure still matter? Size it in money over the days it ran.",
      "The fault had already ended when the ticket arrived. How does that change what you recommend?",
      "Two events coincide with the drop. How did you rule each one in or out — what would each have looked like in the data?",
    ],
    misconceptions: [
      "Recommending a rollback for a fault that has already healed.",
      "Sizing the loss over the whole week instead of the days it ran, or blaming the carrier action that was reported after the drop began.",
    ],
    extension: "Draft the post-mortem's 'what we will change' list: alerting, runbooks and testing — and who owns each.",
  },
  "attribution-shift": {
    minutes: 20,
    prompts: [
      "One channel fell. What did the sitewide total and the order book tell you, and what did that rule out?",
      "Where did the 'lost' credit go? Why does that pattern point to measurement rather than to customers?",
      "Marketing wants to cut the channel's budget. What do you tell them, and what should change in how channels are compared?",
    ],
    misconceptions: [
      "Treating a channel's reported revenue as what it caused, rather than what the attribution model credits it with.",
      "Blaming the most visible change to the channel itself (its template, creative or send day) without checking the total.",
    ],
    extension: "Compare last-click and data-driven attribution for one customer journey. Which channels gain and lose credit, and which model would you use to set budgets?",
  },
};

/* Suggested sequences for the guide: which cases, in which order, and why.
   Total time is summed from the notes above. */
export const SEQUENCES = [
  { title: "One-hour seminar", cases: [1, 2, 3], why: "Segment before you blame; cross-tab when two reports each look a bit off; and the case where nothing broke but the average still fell." },
  { title: "Two-hour workshop", cases: [1, 3, 4, 8, 9], why: "The core method, the mix-shift and masking traps, revenue decomposition, then real 2015 data where the measurement itself is the problem." },
  { title: "Self-study arc", cases: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], why: "Every case in order; students work at their own pace and bring their case file to the seminar." },
];
