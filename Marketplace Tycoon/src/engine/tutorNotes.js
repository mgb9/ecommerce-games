/* ============================================================
   Tutor notes, for the instructor-only tutor's guide: per client brief, a
   time estimate, questions for the seminar debrief, the wrong turns
   students most often take, and a stretch question. Written to hold for
   every seed and every instructor setting — no figures, which change with
   both (the guide computes those from the engine).
   Keyed by brief id; every brief must have an entry (tested).
   ============================================================ */

export const TUTOR_NOTES = {
  fashion: {
    minutes: 30,
    prompts: [
      "Which platform did you choose, and which of the brief's needs were you buying with it? What did you give up?",
      "Look at your contribution per unit shipped. How much of the price was left after returns and fees — and did that change how you priced?",
      "The viral week rewarded stores with stock. How did you decide how much to hold, given what unsold stock costs?",
      "Three in four of these shoppers are on a phone. Which conversion work did you buy first, and did you test it?",
    ],
    misconceptions: [
      "Reading revenue as profit: a high-volume week with a high return rate can lose money.",
      "Choosing the platform with the highest ceiling without counting the weeks it takes to build.",
      "Cutting price to win share when the margin is already thin.",
    ],
    extension: "A fashion client says returns are “just a cost of doing business”. Using your run, estimate what one point off the return rate was worth, and name two site changes that would earn it.",
  },
  grocer: {
    minutes: 30,
    prompts: [
      "What was your break-even volume in a typical week, and how close to it did you trade?",
      "When did you overstock or stock out, and which cost you more? Why is that different from the fashion brief?",
      "Why does the cheapest platform fit this client when it would hold another client back?",
      "Did you spend on conversion work at all? On these margins, what would it have had to deliver to pay for itself?",
    ],
    misconceptions: [
      "Treating the platform as a status choice rather than a cost the margin has to carry.",
      "Stocking for the best possible week rather than the expected one.",
      "Spending on advertising in a market that responds weakly to it.",
    ],
    extension: "The grocer is offered a third-party logistics partner. Using the fulfilment figures on the setup screen, when would it pay — and what would have to be true about demand?",
  },
  b2b: {
    minutes: 30,
    prompts: [
      "These buyers research before they buy. What did that do to the value of advertising, and of organic reach?",
      "The top-fit platform asks you to run the site yourself. What does that cost in the simulation, and what would it cost a real business?",
      "Orders are few and valuable. How did you set price against the marketplace's fee?",
      "Reviews and regulars build slowly. When did they start to pay, and what would have destroyed them?",
    ],
    misconceptions: [
      "Carrying a consumer playbook (heavy advertising, low price) into a research-led market.",
      "Assuming an organic-reach advantage is worth the same to every business.",
      "Ignoring the weeks a self-hosted site loses to its own upkeep.",
    ],
    extension: "Write the content plan that would earn this client its organic reach: three pieces a professional buyer would search for, and how you would know they were working.",
  },
  digital: {
    minutes: 30,
    prompts: [
      "With almost no unit cost, where did the money go? What was the largest cost line in your profit and loss account?",
      "If you chose the composable platform: in which week did it overtake what a hosted platform would have earned? If you did not: what would have had to be true for it to pay?",
      "There is no stock or delivery here. Which decisions were left, and which mattered most?",
      "How much did you spend on advertising, and how did you decide it was enough?",
    ],
    misconceptions: [
      "Assuming the most capable platform is the right one whatever the spending plan.",
      "Under-pricing because the unit cost is close to zero.",
      "Deploying conversion upgrades on the estimate without paying for the test.",
    ],
    extension: "The founder has ten weeks of cash. Make the case for and against the composable platform in three sentences each, using only figures from your own run.",
  },
};

/* Suggested sessions for the guide: which briefs, in which order, and why.
   Titles name no duration: the guide sums the time from the notes above
   (or, for `parallel` sessions where groups work side by side, takes the
   longest), and debriefs come on top. */
export const SESSIONS = [
  { title: "One seminar, one brief", ids: ["fashion"], why: "Everyone runs the same brief on the same seed, so the debrief compares decisions, not luck. Fashion has the most going on: returns, volatile demand and a mobile audience." },
  { title: "Same store, two clients", ids: ["grocer", "digital"], why: "The thinnest margins against the widest. The platform that fits one is the worst choice for the other — the clearest way to show that technology selection starts from the use-case." },
  { title: "Split the room", ids: ["fashion", "grocer", "b2b", "digital"], parallel: true, why: "Each group takes one brief, then presents its platform recommendation to the others as the client. The tally shows which platforms each brief drew." },
];
