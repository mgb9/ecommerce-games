import { EVERY_CASE_SKILLS, LEARNING_OUTCOMES, MODULE, SKILLS } from "../engine/outcomes.js";
import { ALL_CASES } from "./caseList.js";
import { calibrationShort, confidenceText } from "./report/labels.js";

/* Plain models of "what this develops", shared by the case intro, the
   reveal, the case report and the case file — so all four describe a
   case's learning outcomes and skills the same way. */
export { MODULE, LEARNING_OUTCOMES, SKILLS };

// A case's outcomes, central first, then the ones it only partly touches.
export const losOf = (o) => [
  ...o.los.map((code) => ({ code, partly: false, ...LEARNING_OUTCOMES[code] })),
  ...o.partly.map((code) => ({ code, partly: true, ...LEARNING_OUTCOMES[code] })),
];
export const losLabel = (o) => [...o.los, ...o.partly.map((c) => `${c} (partly)`)].join(" · ");

// The skills a case practises: its own, each with what practising it looked
// like in this case, then the two every case practises. `reply` and
// `confidence` personalise those two once the student has played.
export function skillsOf(o, { replyTo, confidence } = {}) {
  return [
    ...Object.entries(o.skills).map(([id, did]) => ({ id, ...SKILLS[id], did })),
    { id: "communication", ...SKILLS.communication, did: replyTo ? `Your reply to ${replyTo}, in the case report: what happened, how sure you are and what should happen next — in plain English, for someone who isn't an analyst.` : SKILLS.communication.how },
    { id: "selfassessment", ...SKILLS.selfassessment, did: confidence || SKILLS.selfassessment.how },
  ];
}
export const skillNamesOf = (o) => [...Object.keys(o.skills), ...EVERY_CASE_SKILLS].map((id) => SKILLS[id].name);

// "Priya · Ops" → "Priya": who the student's written reply goes to.
export const replyName = (from) => from.split(" · ")[0];
// What the student's confidence looked like against their result, in words.
export function confidenceLine(confidence, score, outOf) {
  const v = calibrationShort(confidence, score === outOf);
  return v ? `You said ${confidenceText(confidence).toLowerCase()} before seeing the answer, and got ${score} of ${outOf}: ${v.text.toLowerCase()}.` : null;
}

// Across the whole game: which cases serve each outcome, and practise each skill.
export function suiteCoverage(cases = ALL_CASES) {
  const los = Object.keys(LEARNING_OUTCOMES).map((code) => ({
    code, ...LEARNING_OUTCOMES[code],
    cases: cases.filter((c) => c.outcomes.los.includes(code)),
    partlyIn: cases.filter((c) => c.outcomes.partly.includes(code)),
  }));
  const skills = Object.keys(SKILLS).map((id) => ({
    id, ...SKILLS[id],
    cases: EVERY_CASE_SKILLS.includes(id) ? cases : cases.filter((c) => id in c.outcomes.skills),
  }));
  return { los, skills };
}

// What the case developed (learning outcomes, skills, a CV line) and the
// reply the student writes to the ticket's sender — for the case report.
export function developed(outcomes, ticket, confidence) {
  const name = replyName(ticket.from);
  return {
    develops: { los: losOf(outcomes), syllabus: outcomes.syllabus, skills: skillsOf(outcomes, { replyTo: name, confidence }), cv: outcomes.cv },
    reply: { name, from: ticket.from, subject: ticket.subject },
  };
}
