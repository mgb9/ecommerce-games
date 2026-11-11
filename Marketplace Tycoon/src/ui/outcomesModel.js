import { EVERY_BRIEF_SKILLS, LEARNING_OUTCOMES, MODULE, OUTCOMES, SKILLS } from "../engine/outcomes.js";
import { SCENARIOS } from "../engine/engine.js";

/* Plain models of "what this develops", shared by the brief screen, the
   end screen, the decision log and the tutor's guide — so all of them
   describe a brief's learning outcomes and skills the same way. */
export { MODULE, LEARNING_OUTCOMES, SKILLS, OUTCOMES };

// Everything a student can do that develops something: the four client briefs.
export const ACTIVITIES = SCENARIOS.map((s) => ({ id: s.id, label: s.name, short: s.short }));
export const labelOf = (id) => ACTIVITIES.find((a) => a.id === id)?.label || id;

// A brief's outcomes, central first, then any it only partly touches.
export const losOf = (o) => [
  ...o.los.map((code) => ({ code, partly: false, ...LEARNING_OUTCOMES[code] })),
  ...o.partly.map((code) => ({ code, partly: true, ...LEARNING_OUTCOMES[code] })),
];
export const losLabel = (o) => [...o.los, ...o.partly.map((c) => `${c} (partly)`)].join(" · ");

// The skills a brief practises: its own, each with what practising it
// looked like there, then the two every brief practises.
export function skillsOf(o) {
  return [
    ...Object.entries(o.skills).map(([id, did]) => ({ id, ...SKILLS[id], did })),
    ...EVERY_BRIEF_SKILLS.map((id) => ({ id, ...SKILLS[id], did: SKILLS[id].how })),
  ];
}
export const skillNamesOf = (o) => [...Object.keys(o.skills), ...EVERY_BRIEF_SKILLS].map((id) => SKILLS[id].name);

// Across the simulation: which briefs serve each outcome, and practise each skill.
export function suiteCoverage(ids = ACTIVITIES.map((a) => a.id)) {
  const acts = ACTIVITIES.filter((a) => ids.includes(a.id));
  const los = Object.keys(LEARNING_OUTCOMES).map((code) => ({
    code, ...LEARNING_OUTCOMES[code],
    in: acts.filter((a) => OUTCOMES[a.id].los.includes(code)),
    partlyIn: acts.filter((a) => OUTCOMES[a.id].partly.includes(code)),
  }));
  const skills = Object.keys(SKILLS).map((id) => ({
    id, ...SKILLS[id],
    in: acts.filter((a) => id in OUTCOMES[a.id].skills || EVERY_BRIEF_SKILLS.includes(id)),
  }));
  return { los, skills };
}
