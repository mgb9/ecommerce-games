/* ============================================================
   What the lab develops, in the module's own terms: the WM956-15
   learning outcomes (2026/27 module specification, verbatim — the same
   wording as Data Detective's engine/outcomes.js) and the skills the
   specification names, so every experiment can say which outcome it
   serves and which skills it practises, and the experiment log can turn
   that into a record a student can use in their assessment and in job
   applications.

   The mapping is deliberately honest (see the LO coverage matrix at the
   repo root): every experiment is squarely LO3 (evaluating a change to
   enhance UX and conversion); the ones that test a recognised design
   pattern also touch LO2 and say "partly"; the Wireframe Studio is LO2.
   LO1 and LO4 are not claimed — LO4 is assessed through the group
   Website Build.
   ============================================================ */

export const MODULE = {
  code: "WM956-15",
  name: "Enterprise eCommerce Solutions",
  url: "https://courses.warwick.ac.uk/modules/2026/WM956-15",
};

// `text` is the specification's wording; `short` is for badges.
export const LEARNING_OUTCOMES = {
  LO1: { short: "Technologies for a use-case", text: "Demonstrate a comprehensive understanding of the key eCommerce technologies to determine an appropriate solution for given use-cases." },
  LO2: { short: "Design patterns & best practice", text: "Develop a comprehensive understanding of design patterns and best practices and their practical implementation." },
  LO3: { short: "Evaluate functionality for UX & conversion", text: "Critically evaluate advanced eCommerce functionalities to enhance user experience and increase conversions." },
  LO4: { short: "Analyse requirements & build a site", text: "Collaboratively analyse digital business requirements and practically implement an eCommerce website in a real-world setting." },
};

/* Skills, named as the specification names them. `how` says what
   practising it looks like in this lab, in general; each experiment adds
   what it looked like there. Self-assessment (predicting the winner and
   the size before any data) and communication (the recommendation to the
   team) are practised in EVERY experiment, so experiments don't list them. */
export const SKILLS = {
  research: { name: "Research and data analysis", kind: "Transferable", how: "Designing a test: choosing the metric, sizing the sample from a baseline and the smallest effect worth finding, and reading the result with its uncertainty." },
  critical: { name: "Critical thinking", kind: "Transferable", how: "Telling a real effect from noise, and a sound conclusion from a lucky one." },
  problem: { name: "Problem solving", kind: "Transferable", how: "Deciding what is worth testing, and what to do when a test can't give a clear answer." },
  organisation: { name: "Organisational awareness", kind: "Transferable", how: "Judging a change by what matters to the business — profit, loyal customers, sales — and knowing who has to decide." },
  communication: { name: "Communication", kind: "Transferable", how: "Writing a recommendation someone who isn't an analyst can act on: what the test found, how sure we can be, and what to do next." },
  selfassessment: { name: "Independent learning: judging your own confidence", kind: "Transferable", how: "Predicting the winner and the size of the effect before seeing any data, then checking the prediction against the result." },
  conversion: { name: "Conversion optimisation", kind: "Subject specific", how: "Testing changes to pages and messages, and judging them by the conversion they really cause." },
  operations: { name: "Operations for eCommerce", kind: "Subject specific", how: "Counting the operational cost a change moves onto the business, such as delivery." },
};
export const EVERY_EXPERIMENT_SKILLS = ["communication", "selfassessment"];

/* Per experiment (and the quiz and the Wireframe Studio): outcomes,
   syllabus topics (the specification's headings), skills with what
   practising each looked like there, and a line a student can use on a CV. */
export const OUTCOMES = {
  cta: {
    los: ["LO3"], partly: ["LO2"], syllabus: ["Design principles: conversion optimisation", "Design principles: website design best practices"],
    skills: {
      research: "Sizing a test from a baseline rate and the smallest lift worth finding, then running it to plan.",
      critical: "Reading the result through its p-value and confidence interval, not the raw lift.",
      conversion: "Testing a call-to-action design change against the live page.",
    },
    cv: "Planned and ran a properly powered A/B test of a call-to-action design, sizing the sample from a baseline rate and a minimum detectable effect (simulated e-commerce experiment).",
  },
  imgbg: {
    los: ["LO3"], partly: [], syllabus: ["Design principles: conversion optimisation"],
    skills: {
      critical: "Recognising that a “significant” result with no real effect behind it is a false positive, at the rate α allows.",
      research: "Reading a non-significant result as “not shown”, not as “proved equal”.",
    },
    cv: "Evaluated a cosmetic design change with an A/B test and explained false positives and the significance threshold to a non-specialist audience (simulated e-commerce experiment).",
  },
  scarcity: {
    los: ["LO3"], partly: [], syllabus: ["Design principles: conversion optimisation"],
    skills: {
      research: "Working out the sample a small effect needs, and seeing that it exceeds the traffic available.",
      critical: "Not reading “not significant” as “no effect”.",
      problem: "Deciding whether a change is worth testing at all, given the traffic a shop gets.",
    },
    cv: "Used power analysis to show that a popular persuasion tactic's likely effect was too small to confirm at realistic traffic, and recommended against spending the test (simulated e-commerce experiment).",
  },
  social: {
    los: ["LO3"], partly: [], syllabus: ["Design principles: conversion optimisation"],
    skills: {
      critical: "Seeing that a result read the moment it first crossed p < α overstates the effect.",
      research: "Committing to a sample size before the data, and holding to it.",
    },
    cv: "Ran an A/B test of social proof to a pre-committed sample size and showed how stopping early (“peeking”) inflates both false positives and effect sizes (simulated e-commerce experiment).",
  },
  shipping: {
    los: ["LO3"], partly: [], syllabus: ["Design principles: conversion optimisation", "Operations: delivery methods"],
    skills: {
      organisation: "Judging a winning test by profit — the measure the business lives on — rather than conversion alone.",
      operations: "Counting the delivery cost a free-shipping offer moves onto the business.",
      critical: "Separating “statistically significant” from “good for the business”.",
    },
    cv: "Showed that a statistically significant conversion win (free shipping) reduced profit per visitor once delivery costs were counted, and recommended against rolling it out (simulated e-commerce experiment).",
  },
  checkout: {
    los: ["LO3"], partly: ["LO2"], syllabus: ["Design principles: website design best practices"],
    skills: {
      research: "Cutting an overall tie by device to find opposite effects underneath it.",
      critical: "Telling segments that genuinely respond differently from Simpson's paradox.",
      conversion: "Recommending a checkout change for the segment it helps, not for everyone.",
    },
    cv: "Found that a one-page checkout helped mobile shoppers and hurt desktop shoppers while the overall result looked like a tie, and recommended a device-specific rollout (simulated e-commerce experiment).",
  },
  promo: {
    los: ["LO3"], partly: [], syllabus: ["Digital marketing: audience-first marketing"],
    skills: {
      research: "Segmenting a winning result by new and returning customers.",
      organisation: "Weighing a gain with new visitors against a loss with loyal customers — a decision for marketing and the brand, not the test alone.",
      conversion: "Matching a homepage to what each audience came for.",
    },
    cv: "Showed that a homepage change which won overall reduced conversion among returning customers, and framed the trade-off for marketing and brand owners (simulated e-commerce experiment).",
  },
  subject: {
    los: ["LO3"], partly: [], syllabus: ["Digital marketing for eCommerce"],
    skills: {
      critical: "Seeing that the metric optimised (opens) moved against the one that matters (purchases).",
      organisation: "Choosing a guardrail metric the business actually cares about.",
      research: "Testing the guardrail as well as the headline metric.",
    },
    cv: "Showed that an email subject line which raised open rates cut purchases, using a guardrail metric, and recommended judging email tests on sales (simulated e-commerce experiment).",
  },
  quiz: {
    los: ["LO3"], partly: [], syllabus: ["Design principles: conversion optimisation"],
    skills: {
      critical: "Predicting the direction and size of a change's effect, and naming the mechanism behind it.",
      conversion: "Connecting common conversion changes to the behavioural principles that explain them.",
    },
    cv: "Predicted the direction, size and mechanism of common conversion-optimisation changes, with confidence wagers scored for calibration (simulated scenarios).",
  },
  wireframe: {
    los: ["LO2", "LO3"], partly: [], syllabus: ["Design principles: website design best practices", "Design principles: conversion optimisation"],
    skills: {
      problem: "Designing a product page for a specific audience and device mix, trading persuasion against page weight.",
      research: "Committing a hypothesis — metric, expected effect, sample size — before testing the design.",
      conversion: "Testing the design against the current page rather than assuming it is better.",
    },
    cv: "Designed a product-page wireframe for a defined audience and tested it against the live page with a pre-registered hypothesis and sample size (simulated e-commerce experiment).",
  },
};

// The two things every experiment practises, described in general.
export const everyExperimentSkill = (id) => ({ id, ...SKILLS[id] });
