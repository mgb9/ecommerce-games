/* ============================================================
   Tutor notes, for the instructor-only tutor's guide: session plans,
   questions for the seminar debrief, the wrong turns students most often
   take, stretch questions, and what each teaching preset is for. Written
   to hold for every seed and every instructor setting — no figures, which
   change with both (the guide computes those from the current settings).
   ============================================================ */

export const MINUTES = { play: 20, log: 10, debrief: 20 };

export const SESSIONS = [
  { title: "In a seminar (about 50 minutes)", steps: [
    "Share the student link, so everyone plays the same funnel. Ask for the self-rating to be answered honestly — it takes a minute.",
    "Students play one run alone, without discussing the calls (20 minutes). The first run is the one their log records.",
    "They write the recommendation at the end and copy their result code to you (10 minutes).",
    "Paste the codes into the cohort tally and debrief from it (20 minutes): start with the first-quarter leak call.",
  ] },
  { title: "As preparation (flipped)", steps: [
    "Set one run and the written recommendation before the session; collect result codes at the door or by message.",
    "Open on the tally. Use the session for the debrief questions and one stretch question in small groups.",
  ] },
  { title: "A second run, with a preset", steps: [
    "After the debrief, apply a preset (below), share the new link, and ask for a second run with a stated aim — for example “beat doing nothing by more than last time”.",
    "A second run does not change the student's log or result code: those keep the first.",
  ] },
];

export const PROMPTS = [
  "Before the figures appeared, which stage did you call as the biggest leak, and what were you reading — the gap to the benchmark, or the money?",
  "A stage can be furthest below its benchmark and still not be the biggest loss in pounds. What makes the difference?",
  "Which purchase looked poor in the quarter you bought it and good by the end of the plan? What would a one-quarter view have made you do?",
  "Bought traffic is paid for again every quarter; a fix stays. How should that change what you buy first — and what you buy in the last quarter?",
  "When did the biggest leak move, and what moved it?",
  "Free shipping lifted conversion and cut margin. On what figure would you judge it?",
  "Was there a quarter where spending nothing was the right decision? How would you defend that to a manager?",
];

export const MISCONCEPTIONS = [
  "Reading the largest percentage-point gap as the largest loss, without counting how many people reach that stage or what they are worth.",
  "Judging a one-off fix by its return in the quarter it was bought.",
  "Treating bought traffic as an investment that stays, rather than a cost paid again each quarter.",
  "Spending the whole budget because it is there.",
  "Fixing the same stage again after the bottleneck has moved.",
  "Reading a conversion gain from free shipping as a profit gain.",
];

export const EXTENSIONS = [
  "Halve the average order value in your head. Which of your purchases would you no longer make, and why those?",
  "Chrichton can run this plan for eight quarters instead of four. Which purchases change from “don't” to “do”?",
  "Write the one-paragraph case for the purchase you did not make.",
];

// What each one-tap preset in the instructor panel is for.
export const PRESET_NOTES = [
  ["Top-heavy leak", "Moves the loss to the top of the funnel. Students who learned “fix the checkout” on the default funnel have to re-diagnose."],
  ["Abandonment crisis", "The biggest gap IS the biggest leak. Use it to show that sizing in pounds is a method, not a trick that always overturns the obvious answer."],
  ["Tight budget (£8k)", "Forces a single purchase most quarters, so the return over the plan decides everything."],
  ["Cheap-traffic temptation", "A high order value and margin make bought traffic pay. Use it to show the rule is acquisition cost against lifetime value, not “never buy traffic”."],
  ["Low noise", "Outcomes sit close to their expected values. Use it when a cohort is arguing about luck rather than method."],
];
