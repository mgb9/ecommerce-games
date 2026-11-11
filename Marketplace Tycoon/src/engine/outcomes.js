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

// `text` is the specification's wording, always shown word for word;
// `short` is for badges; `plain` is a gloss shown as well, never instead,
// when Simpler English is on ("In simpler words: …").
export const LEARNING_OUTCOMES = {
  LO1: { short: "Technologies for a use-case", text: "Demonstrate a comprehensive understanding of the key eCommerce technologies to determine an appropriate solution for given use-cases.", plain: "Show that you understand the main e-commerce technologies well enough to choose a suitable one for a particular business." },
  LO2: { short: "Design patterns & best practice", text: "Develop a comprehensive understanding of design patterns and best practices and their practical implementation.", plain: "Understand the usual, proven ways to design an online store, and how to put them into practice." },
  LO3: { short: "Evaluate functionality for UX & conversion", text: "Critically evaluate advanced eCommerce functionalities to enhance user experience and increase conversions.", plain: "Judge carefully which advanced store features make shopping easier and lead more visitors to buy." },
  LO4: { short: "Analyse requirements & build a site", text: "Collaboratively analyse digital business requirements and practically implement an eCommerce website in a real-world setting.", plain: "Work in a group to find out what a business needs online, and build a working e-commerce website for it." },
};

/* Skills. `how` says what practising it looks like in this simulation, in
   general; each brief adds what it looked like there. Self-assessment
   (predicting your leaderboard place every week) and communication (the
   recommendation to the client) are practised on EVERY brief, so briefs
   don't list them. `plain` (and each brief's `skillsPlain`) is the same
   thing in Simpler English; names, syllabus headings and CV lines are
   never simplified — they are the words a student will use elsewhere. */
export const SKILLS = {
  research: { name: "Research and data analysis", kind: "Transferable", how: "Reading a weekly profit and loss account, unit economics and a leaderboard to decide what to change next.", plain: "You read the weekly profit and loss, the money made on each unit, and the leaderboard. Then you decided what to change." },
  critical: { name: "Critical thinking", kind: "Transferable", how: "Separating a requirements argument from a forecast, and an estimate from a tested result.", plain: "You told the difference between what a client needs and a guess about profit, and between an estimate and a result you tested." },
  problem: { name: "Problem solving", kind: "Transferable", how: "Balancing price, advertising, stock and investment under a cash limit, and adjusting when the market shifts.", plain: "You balanced price, advertising, stock and investment with limited cash, and changed your plan when the market changed." },
  organisation: { name: "Organisational awareness", kind: "Transferable", how: "Running a store as a business: fees, cash, returns and what a client can afford to commit to.", plain: "You ran a store as a business. You watched fees, cash and returns, and what a client can afford to pay every week." },
  communication: { name: "Communication", kind: "Transferable", how: "Writing a platform and strategy recommendation a client who isn't a technologist can act on.", plain: "You wrote advice on platform and strategy that a client who is not a technology expert can use." },
  selfassessment: { name: "Independent learning: judging your own confidence", kind: "Transferable", how: "Predicting your leaderboard place before each week resolves, then checking the prediction against the result.", plain: "Each week you said which place you would finish before you saw the result. Then you compared the two." },
  technology: { name: "eCommerce technology selection", kind: "Subject specific", how: "Weighing storefront platforms — cost, performance ceiling, organic reach, time to launch and stability — against what a client needs.", plain: "You compared storefront platforms on cost, the best performance they can reach, organic reach, time to launch and stability. You set these against what a client needs." },
  conversion: { name: "Conversion optimisation", kind: "Subject specific", how: "Deciding which speed, trust, checkout and mobile improvements to test and which to deploy.", plain: "You decided which speed, trust, checkout and mobile improvements to test first and which to deploy." },
  operations: { name: "Operations for eCommerce", kind: "Subject specific", how: "Choosing a fulfilment model and managing stock, returns and delivery cost.", plain: "You chose a fulfilment model and managed stock, returns and delivery cost." },
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
    skillsPlain: {
      technology: "You chose a platform for a retailer that sells a lot and follows trends. For this client, a fast launch and good conversion matter more than organic reach.",
      operations: "You bought stock when demand changed a lot from week to week, and counted how much a high return rate costs on each unit shipped.",
      conversion: "You decided how much mobile, checkout and trust work was worth paying for when three in four shoppers use a phone.",
      problem: "You kept a small margin when the supplier raised prices and when demand rose suddenly.",
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
    skillsPlain: {
      technology: "You chose the cheapest reliable platform for a business with margins too small to pay a high weekly cost.",
      operations: "You matched stock to demand. Unsold goods go bad, and an empty shelf loses regular customers.",
      organisation: "You kept a low-margin business able to pay its bills, using contribution per unit, break-even volume and cash.",
      research: "You used last week's demand and the break-even figure to set this week's stock and price.",
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
    skillsPlain: {
      technology: "You chose a platform for buyers who research before they buy. For them, organic reach is worth more than paid advertising.",
      critical: "You saw that advertising does less for buyers who research before they buy, and you spent less on it.",
      conversion: "You built trust signals and reviews for a small number of high-value orders.",
      organisation: "You set prices for high-value orders, allowing for marketplace fees and a small number of buyers.",
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
    skillsPlain: {
      technology: "You decided if a platform with a very high performance limit is worth its high weekly cost and its slow build.",
      conversion: "You put checkout and page-speed work first, because there is no stock or delivery to manage.",
      research: "You read contribution per unit and market share to set price and advertising for a product that costs almost nothing to make.",
      critical: "You tested a conversion upgrade before you paid for it. You did not just trust the estimate.",
    },
    cv: "Evaluated whether a high-cost composable platform would repay its build time for a digital-downloads business, and prioritised checkout and acquisition investment on high margins (simulated e-commerce marketplace).",
  },
};
