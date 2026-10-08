/* ============================================================
   What the game develops, in the module's own terms: the WM956-15
   learning outcomes (2026/27 module specification, verbatim) and the
   skills the specification lists — so every case can say which outcome
   it serves and which skills it practises, and the case report and case
   file can turn that into a record a student can use in their assessment
   and in job applications. Each case's own mapping lives with the case
   (cases.js, fieldcase-meta.js); this file is the shared vocabulary.

   The mapping is deliberately honest (see the LO coverage matrix at the
   repo root): every case is squarely LO3; cases whose fault sits in a
   technology (a payment gateway, a browser, an analytics tag, an
   analytics configuration) also touch LO1, and say "partly"; LO2 and LO4
   are not claimed — LO4 is assessed through the group Website Build.
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

/* Skills, named as the specification names them (its "transferable" and
   "subject specific" skills). `how` says what practising it looks like in
   this game, in general; each case adds what it looked like there.
   Communication and self-assessment are practised in EVERY case — the
   reply to the ticket's sender (in the case report) and the confidence
   question before submitting — so cases don't list them. */
export const SKILLS = {
  research: { name: "Research and data analysis", kind: "Transferable", how: "Gathering evidence from data: choosing which report, cross-tab or ground-truth number would confirm or rule out an explanation." },
  critical: { name: "Critical thinking", kind: "Transferable", how: "Weighing evidence: telling a real signal from noise, and a cause from something that merely happened at the same time." },
  problem: { name: "Problem solving", kind: "Transferable", how: "Turning a vague complaint into a specific diagnosis: where, what, and since when." },
  organisation: { name: "Organisational awareness", kind: "Transferable", how: "Knowing which team owns the fix — engineering, marketing, operations or finance — and what each needs to hear." },
  communication: { name: "Communication", kind: "Transferable", how: "Explaining a finding to someone who isn't an analyst: what happened, how sure you are, and what should happen next." },
  selfassessment: { name: "Independent learning: judging your own confidence", kind: "Transferable", how: "Saying how sure you are before you see the answer, then checking whether that confidence was earned." },
  conversion: { name: "Conversion optimisation", kind: "Subject specific", how: "Finding where and why conversion — or the value of each order — changed." },
  operations: { name: "Operations for eCommerce", kind: "Subject specific", how: "Recognising payment, stock, pricing and order-system problems in the data." },
};
export const EVERY_CASE_SKILLS = ["communication", "selfassessment"];
