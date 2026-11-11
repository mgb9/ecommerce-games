/* ============================================================
   What Funnel Fixer develops, in the module's own terms: the WM956-15
   learning outcomes (2026/27 module specification, verbatim — the same
   wording as Data Detective's and Conversion Lab's outcomes.js) and the
   skills the specification names, so the game can say which outcome it
   serves and which skills it practises, and the diagnosis log can turn
   that into a record a student can use in their assessment and in job
   applications.

   The mapping is deliberately honest (see the LO coverage matrix at the
   repo root): the game is LO3 — judging which improvements to a store
   are worth their cost. It does not choose technologies (LO1), apply
   design patterns (LO2) or build a site (LO4), and claims none of them.
   Pure data and functions: no React, no I/O.
   ============================================================ */

export const MODULE = {
  code: "WM956-15",
  name: "Enterprise eCommerce Solutions",
  url: "https://courses.warwick.ac.uk/modules/2026/WM956-15",
};

// `text` is the specification's wording; `short` is for badges. `plain` is
// a gloss for Simpler English, shown under the wording, never instead of it.
export const LEARNING_OUTCOMES = {
  LO1: { short: "Technologies for a use-case", text: "Demonstrate a comprehensive understanding of the key eCommerce technologies to determine an appropriate solution for given use-cases.", plain: "Show that you understand the main e-commerce technologies well enough to choose a suitable one for a particular business." },
  LO2: { short: "Design patterns & best practice", text: "Develop a comprehensive understanding of design patterns and best practices and their practical implementation.", plain: "Understand the usual, proven ways to design an online store, and how to put them into practice." },
  LO3: { short: "Evaluate functionality for UX & conversion", text: "Critically evaluate advanced eCommerce functionalities to enhance user experience and increase conversions.", plain: "Judge carefully which advanced store features make shopping easier and lead more visitors to buy." },
  LO4: { short: "Analyse requirements & build a site", text: "Collaboratively analyse digital business requirements and practically implement an eCommerce website in a real-world setting.", plain: "Work in a group to find out what a business needs online, and build a working e-commerce website for it." },
};

/* Skills, named as the specification names them. `how` is what practising
   it looks like in this game. Two are practised by doing rather than by
   playing: communication only if the recommendation is written, and
   self-assessment through the calls made before the £ sizing is shown.
   `plain` is `how` in Simpler English. */
export const SKILLS = {
  research: { name: "Research and data analysis", kind: "Transferable", how: "Reading a funnel's rates and volumes, and sizing each stage's loss in pounds from sessions, order value and margin.",
    plain: "You read the rates and visitor numbers in a funnel. You worked out, in pounds, how much each step loses." },
  critical: { name: "Critical thinking", kind: "Transferable", how: "Telling the biggest percentage-point gap from the biggest money leak, and a purchase's return in one quarter from its return over the plan.",
    plain: "You saw that the biggest percentage gap is not always the biggest loss of money. You saw that a purchase can pay back slowly, over the whole plan." },
  problem: { name: "Problem solving", kind: "Transferable", how: "Spending a budget that can't buy everything, and re-diagnosing each quarter as the bottleneck moves.",
    plain: "Your budget could not buy everything, so you had to choose. Each quarter you checked again, because the weakest step changes." },
  organisation: { name: "Organisational awareness", kind: "Transferable", how: "Judging spend by what the business keeps: profit after spend, margin, and acquisition cost against lifetime value.",
    plain: "You judged spending by what the business keeps: profit after spending, margin, and the cost to win a customer compared with what that customer is worth." },
  communication: { name: "Communication", kind: "Transferable", how: "Writing a spending recommendation someone who isn't an analyst can act on: where to spend, what it should return, and over what period.",
    plain: "You wrote advice that a person who does not work with data can use: where to spend, what it should bring back, and by when." },
  selfassessment: { name: "Independent learning: judging your own confidence", kind: "Transferable", how: "Calling the biggest money leak and the best-returning purchase before the figures are shown, then checking each call.",
    plain: "You guessed the biggest loss and the best purchase before you saw the numbers. Then you checked each guess." },
  conversion: { name: "Conversion optimisation", kind: "Subject specific", how: "Choosing checkout, product-page and mobile fixes by the stage they act on and the money that stage is losing.",
    plain: "You chose fixes for the checkout, the product page and mobile by the step each one improves and the money that step loses." },
  marketing: { name: "Digital marketing for eCommerce", kind: "Subject specific", how: "Weighing bought traffic, which is paid for again every quarter, against fixes that stay — using acquisition cost and lifetime value.",
    plain: "You compared paid visitors, which you must pay for again every quarter, with fixes that stay. You used the cost to win a customer and what a customer is worth over time." },
};
export const BY_DOING = ["communication", "selfassessment"];

// The game's outcomes, syllabus topics (the specification's headings),
// skills and a line a student can use on a CV.
export const OUTCOMES = {
  los: ["LO3"], partly: [],
  syllabus: ["Design principles: conversion optimisation", "Digital marketing for eCommerce"],
  skills: ["research", "critical", "problem", "organisation", "conversion", "marketing"],
  cv: "Diagnosed a leaking e-commerce checkout funnel by sizing each stage's loss in pounds, and allocated a quarterly budget across conversion fixes and paid traffic by return over the plan, acquisition cost and lifetime value (simulated e-commerce business).",
};

export const losOf = (o = OUTCOMES) => [
  ...o.los.map((code) => ({ code, partly: false, ...LEARNING_OUTCOMES[code] })),
  ...o.partly.map((code) => ({ code, partly: true, ...LEARNING_OUTCOMES[code] })),
];
export const skillsOf = ({ byDoing = true } = {}) =>
  [...OUTCOMES.skills, ...(byDoing ? BY_DOING : [])].map((id) => ({ id, ...SKILLS[id] }));
