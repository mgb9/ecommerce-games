/* ============================================================
   What the simulation develops, in the module's own terms: the WM956-15
   learning outcomes (2026/27 module specification, verbatim — the same
   wording as Data Detective's and Conversion Lab's engine/outcomes.js)
   and the skills the module names, so every client brief can say which
   outcome it serves and which skills it practises, and the decision log
   can turn that into a record a student can use in their assessment and
   in job applications.

   The mapping is deliberately honest (see the LO coverage matrix at the
   repo root): every brief is LO1 (choosing and justifying a platform for
   a use-case) and LO3 (judging which conversion, fulfilment and retention
   work is worth its cost). LO2 and LO4 are not claimed — LO4 is assessed
   through the group Website Build. No React, no I/O.
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

/* Skills. `how` says what practising it looks like in this simulation, in
   general; each brief adds what it looked like there. Self-assessment
   (predicting your leaderboard place every week) and communication (the
   recommendation to the client) are practised on EVERY brief, so briefs
   don't list them. */
export const SKILLS = {
  research: { name: "Research and data analysis", kind: "Transferable", how: "Reading a weekly profit and loss account, unit economics and a leaderboard to decide what to change next." },
  critical: { name: "Critical thinking", kind: "Transferable", how: "Separating a requirements argument from a forecast, and an estimate from a tested result." },
  problem: { name: "Problem solving", kind: "Transferable", how: "Balancing price, advertising, stock and investment under a cash limit, and adjusting when the market shifts." },
  organisation: { name: "Organisational awareness", kind: "Transferable", how: "Running a store as a business: fees, cash, returns and what a client can afford to commit to." },
  communication: { name: "Communication", kind: "Transferable", how: "Writing a platform and strategy recommendation a client who isn't a technologist can act on." },
  selfassessment: { name: "Independent learning: judging your own confidence", kind: "Transferable", how: "Predicting your leaderboard place before each week resolves, then checking the prediction against the result." },
  technology: { name: "eCommerce technology selection", kind: "Subject specific", how: "Weighing storefront platforms — cost, performance ceiling, organic reach, time to launch and stability — against what a client needs." },
  conversion: { name: "Conversion optimisation", kind: "Subject specific", how: "Deciding which speed, trust, checkout and mobile improvements to test and which to deploy." },
  operations: { name: "Operations for eCommerce", kind: "Subject specific", how: "Choosing a fulfilment model and managing stock, returns and delivery cost." },
};
export const EVERY_BRIEF_SKILLS = ["communication", "selfassessment"];

/* Per client brief: outcomes, syllabus topics (the module's outline
   headings), skills with what practising each looked like there, who the
   recommendation is written for, and a line a student can use on a CV. */
export const OUTCOMES = {
  fashion: {
    los: ["LO1", "LO3"], partly: [], client: "the retailer's head of e-commerce",
    syllabus: ["eCommerce technology: hosting and platforms", "Operations: delivery methods", "Design principles: conversion optimisation"],
    skills: {
      technology: "Choosing a platform for a high-volume, trend-led retailer, where time to launch and conversion matter more than organic reach.",
      operations: "Stocking for volatile demand and counting what a high return rate does to each unit shipped.",
      conversion: "Deciding how much mobile, checkout and trust work is worth it when three in four shoppers are on a phone.",
      problem: "Holding a thin margin through a supplier price rise and a demand spike.",
    },
    cv: "Selected and justified a storefront platform and fulfilment model for a fast-fashion retailer, then ran the store for ten weeks, managing returns, stock and conversion investment against four competitors (simulated e-commerce marketplace).",
  },
  grocer: {
    los: ["LO1", "LO3"], partly: [], client: "the grocer's owner",
    syllabus: ["eCommerce technology: hosting and platforms", "Operations: delivery methods"],
    skills: {
      technology: "Choosing the cheapest reliable platform for a business whose margins cannot carry a heavy weekly cost.",
      operations: "Matching stock to demand when unsold goods spoil and a stock-out loses regular customers.",
      organisation: "Keeping a low-margin business solvent: contribution per unit, break-even volume and cash.",
      research: "Using last week's demand and the break-even figure to set this week's stock and price.",
    },
    cv: "Selected a low-cost platform for a perishable grocer and managed stock, spoilage and cash on very thin margins over ten simulated weeks, using unit economics and break-even volume (simulated e-commerce marketplace).",
  },
  b2b: {
    los: ["LO1", "LO3"], partly: [], client: "the parts supplier's sales director",
    syllabus: ["eCommerce technology: hosting and platforms", "Digital marketing for eCommerce", "Design principles: conversion optimisation"],
    skills: {
      technology: "Choosing a platform for research-led buyers, where organic reach is worth more than paid visibility.",
      critical: "Recognising that advertising does less for buyers who research before they buy, and spending accordingly.",
      conversion: "Building trust signals and reviews for high-value, low-volume orders.",
      organisation: "Pricing high-value orders against marketplace fees and a small number of buyers.",
    },
    cv: "Selected and justified a content-led platform for a B2B industrial supplier and built a trust- and retention-led strategy for high-value, low-volume orders (simulated e-commerce marketplace).",
  },
  digital: {
    los: ["LO1", "LO3"], partly: [], client: "the software company's founder",
    syllabus: ["eCommerce technology: hosting and platforms", "Design principles: conversion optimisation", "Digital marketing for eCommerce"],
    skills: {
      technology: "Deciding whether a high performance ceiling repays a high weekly cost and a slow build.",
      conversion: "Putting checkout and page-speed work first when there is no stock or delivery to manage.",
      research: "Reading contribution per unit and market share to set price and advertising for a product with almost no unit cost.",
      critical: "Testing a conversion upgrade before paying for it, rather than trusting the estimate.",
    },
    cv: "Evaluated whether a high-cost composable platform would repay its build time for a digital-downloads business, and prioritised checkout and acquisition investment on high margins (simulated e-commerce marketplace).",
  },
};
