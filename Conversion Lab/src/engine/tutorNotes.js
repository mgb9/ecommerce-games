/* ============================================================
   Tutor notes, for the instructor-only tutor's guide: per experiment (and
   the quiz and the Wireframe Studio), a time estimate, questions for the
   seminar debrief, the wrong turns students most often take, and a
   stretch question. Written to hold for every seed and every instructor
   setting — no figures, which change with both (the guide computes those).
   Keyed by id; every experiment must have an entry (tested).
   ============================================================ */

export const TUTOR_NOTES = {
  cta: {
    minutes: 10,
    prompts: [
      "Before running, what sample size did you plan, and from what assumptions? What would have happened with half of it?",
      "The lift you observed and the true lift differ. Which belongs in a report — and with what range around it?",
      "Your call was judged on the evidence and against the truth separately. Why would a manager care more about the first?",
    ],
    misconceptions: [
      "Reading the observed lift as the true effect, without its confidence interval.",
      "Choosing the sample size after looking at the data.",
    ],
    extension: "Halve the minimum detectable effect in the planner. How does the required sample change, and why by that factor?",
  },
  imgbg: {
    minutes: 10,
    prompts: [
      "Most of you found nothing. Was “no real difference” the right call, or “need more data”? What decides it?",
      "If some of the class “found a winner” here, what does that tell you about α — and what would peeking have done?",
      "Look at the reruns: why does stopping at the first p below α call so many more winners than running to plan?",
    ],
    misconceptions: [
      "Reading “not significant” as proof that the two versions are identical.",
      "Believing a significant result means the effect is real and worth having.",
    ],
    extension: "A team runs twenty cosmetic tests a year, none with any real effect. How many “winners” should they expect at their α, and what would you change about how they test?",
  },
  scarcity: {
    minutes: 10,
    prompts: [
      "How many visitors would this test need? Is that realistic for Chrichton — and if not, what should the team do instead?",
      "Some of you saw “significant”. Why would the lift you observed overstate the real one?",
      "When is the right recommendation not to run a test at all?",
    ],
    misconceptions: [
      "Concluding “scarcity doesn't work” from a small test that wasn't significant.",
      "Treating a lucky significant result as a reliable estimate of a small effect.",
    ],
    extension: "Find the smallest effect this lab's traffic cap could detect at the usual power. What does that say about which ideas are worth testing at a shop this size?",
  },
  social: {
    minutes: 15,
    prompts: [
      "When did your run first look significant, and how big was the lift then compared with the end?",
      "Why do early stops overstate a real effect — not just risk a false one?",
      "Your manager wants results by Friday. How would you plan a test that can stop early without fooling the team?",
    ],
    misconceptions: [
      "Thinking peeking only matters when there is no real effect.",
      "Believing that checking more often gives a more accurate answer.",
    ],
    extension: "Look up sequential testing or alpha spending. How do they let a team look early without inflating false positives?",
  },
  shipping: {
    minutes: 10,
    prompts: [
      "The test was significant. Should Chrichton roll it out? Which number decides it?",
      "Who in the business needs to see this result, and what do they need to hear?",
      "Is there a version of free shipping that might pay — a minimum order, say? How would you test it?",
    ],
    misconceptions: [
      "Treating “statistically significant” as “good for the business”.",
      "Ignoring a cost that the variant moves onto the business.",
    ],
    extension: "Work out the break-even: how much would conversion have to rise for free shipping to pay for itself at this margin?",
  },
  checkout: {
    minutes: 15,
    prompts: [
      "The overall result looked like a tie. What did splitting by device show?",
      "Is this Simpson's paradox? What is the difference between that and segments that genuinely respond differently?",
      "What would you ship, to whom — and how would you check afterwards that it was the right call?",
    ],
    misconceptions: [
      "Calling any disagreement between segments “Simpson's paradox”.",
      "Shipping, or binning, a change on the overall number alone.",
    ],
    extension: "Slice a result into enough segments and some will look significant by chance. How would you protect a team against that?",
  },
  promo: {
    minutes: 15,
    prompts: [
      "The promotion-led homepage won overall. Who lost — and why might they matter more than the headline suggests?",
      "Whose decision is this: the analyst's, marketing's or the brand's? What should each of them hear?",
      "Could each audience get its own homepage? What would you need to test it properly?",
    ],
    misconceptions: [
      "Rolling out an overall winner without checking whether it hurts a valuable segment.",
      "Assuming every visitor wants the same thing.",
    ],
    extension: "Returning customers are usually worth more over time. How would you weigh a conversion loss among them against a gain with new visitors?",
  },
  subject: {
    minutes: 10,
    prompts: [
      "The clickbait line won the metric the team reports every week. Why might that be the wrong metric?",
      "What guardrail would you set for every email test, and who should own it?",
      "How would you persuade a team to stop celebrating open rates?",
    ],
    misconceptions: [
      "Optimising the metric that is easy to measure instead of the one that matters.",
      "Treating more engagement as more value.",
    ],
    extension: "Design the test plan for the next newsletter: the primary metric, the guardrail, and the sample size each needs — and why the guardrail needs more.",
  },
  quiz: {
    minutes: 20,
    prompts: [
      "Which scenarios did you bet “Certain” on and get wrong? What made you so sure?",
      "Direction is the easy part; size and mechanism are hard. Why does the size of an effect matter when deciding what to test?",
      "The coupon-field scenario reverses by traffic source. Which lab experiment showed the same pattern?",
    ],
    misconceptions: [
      "Treating best-practice lists as guaranteed wins.",
      "Confusing confidence with evidence.",
    ],
    extension: "Pick one scenario and write the test plan that would settle it for Chrichton: metric, guardrail, sample size, and the result that would change your mind.",
  },
  wireframe: {
    minutes: 25,
    prompts: [
      "Did your design beat the current page — and was your sample size big enough to tell?",
      "Which component did you add or cut because of the brief, and what was the trade-off?",
      "Why is the right primary metric different for the flash sale and the B2B brief?",
    ],
    misconceptions: [
      "Adding every persuasive component on the assumption that more is better.",
      "Assuming a design that looks good will test well.",
    ],
    extension: "Take your group Website Build's product page: which brief is it closest to, and what would you test first?",
  },
};

/* Suggested sequences for the guide: which activities, in which order,
   and why. Titles name no duration: the guide sums the time from the
   notes above, and debriefs come on top. */
export const SEQUENCES = [
  { title: "A first seminar", ids: ["cta", "imgbg", "social"], why: "The method working, a false positive, and what stopping early does — the core of honest testing." },
  { title: "The full arc", ids: ["cta", "imgbg", "scarcity", "social", "shipping", "checkout", "promo", "subject"], why: "The full arc: power, false positives, peeking, business value, segments and guardrails." },
  { title: "Design session (LO2)", ids: ["quiz", "wireframe", "checkout"], why: "Warm up on realistic scenarios, design a page for a brief and test it, then see a design that helps one segment and hurts another." },
];
