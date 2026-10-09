import { EVERY_EXPERIMENT_SKILLS, LEARNING_OUTCOMES, MODULE, OUTCOMES, SKILLS } from "../engine/outcomes.js";
import { EXPERIMENTS } from "../engine/engine.js";

/* Plain models of "what this develops", shared by the bench, the verdict,
   the experiment log and the tutor's guide — so all of them describe an
   experiment's learning outcomes and skills the same way. */
export { MODULE, LEARNING_OUTCOMES, SKILLS, OUTCOMES };

// Everything a student can do in the lab that develops something: the
// eight experiments, then the quiz and the Wireframe Studio.
export const ACTIVITIES = [
  ...EXPERIMENTS.map((e) => ({ id: e.id, label: `Experiment ${e.n} · ${e.title}`, short: `${e.n}` })),
  { id: "quiz", label: "Which Test Won?", short: "quiz" },
  { id: "wireframe", label: "Wireframe Studio", short: "wireframe" },
];

// An activity's outcomes, central first, then the ones it only partly touches.
export const losOf = (o) => [
  ...o.los.map((code) => ({ code, partly: false, ...LEARNING_OUTCOMES[code] })),
  ...o.partly.map((code) => ({ code, partly: true, ...LEARNING_OUTCOMES[code] })),
];
export const losLabel = (o) => [...o.los, ...o.partly.map((c) => `${c} (partly)`)].join(" · ");

// The skills an experiment practises: its own, each with what practising it
// looked like there, then the two every experiment practises.
export function skillsOf(o, { everyExperiment = true } = {}) {
  return [
    ...Object.entries(o.skills).map(([id, did]) => ({ id, ...SKILLS[id], did })),
    ...(everyExperiment ? EVERY_EXPERIMENT_SKILLS.map((id) => ({ id, ...SKILLS[id], did: SKILLS[id].how })) : []),
  ];
}
export const skillNamesOf = (o, every = true) => [...Object.keys(o.skills), ...(every ? EVERY_EXPERIMENT_SKILLS : [])].map((id) => SKILLS[id].name);

// Across the lab: which activities serve each outcome, and practise each skill.
export function suiteCoverage(ids = ACTIVITIES.map((a) => a.id)) {
  const acts = ACTIVITIES.filter((a) => ids.includes(a.id));
  const isExperiment = (a) => a.id !== "quiz" && a.id !== "wireframe";
  const los = Object.keys(LEARNING_OUTCOMES).map((code) => ({
    code, ...LEARNING_OUTCOMES[code],
    in: acts.filter((a) => OUTCOMES[a.id].los.includes(code)),
    partlyIn: acts.filter((a) => OUTCOMES[a.id].partly.includes(code)),
  }));
  const skills = Object.keys(SKILLS).map((id) => ({
    id, ...SKILLS[id],
    in: acts.filter((a) => id in OUTCOMES[a.id].skills || (EVERY_EXPERIMENT_SKILLS.includes(id) && isExperiment(a))),
  }));
  return { los, skills };
}
