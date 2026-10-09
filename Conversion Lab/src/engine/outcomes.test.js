import { describe, it, expect } from "vitest";
import { OUTCOMES, SKILLS, LEARNING_OUTCOMES, EVERY_EXPERIMENT_SKILLS } from "./outcomes.js";
import { EXPERIMENTS } from "./engine.js";
import { TUTOR_NOTES, SEQUENCES } from "./tutorNotes.js";

const ACTIVITY_IDS = [...EXPERIMENTS.map((e) => e.id), "quiz", "wireframe"];

describe("what the lab develops", () => {
  it("every experiment, the quiz and the studio have outcomes, syllabus, skills and a CV line", () => {
    for (const id of ACTIVITY_IDS) {
      const o = OUTCOMES[id];
      expect(o, id).toBeDefined();
      expect(o.los.length + o.partly.length, id).toBeGreaterThan(0);
      for (const code of [...o.los, ...o.partly]) expect(LEARNING_OUTCOMES[code], `${id} ${code}`).toBeDefined();
      expect(o.syllabus.length, id).toBeGreaterThan(0);
      expect(Object.keys(o.skills).length, id).toBeGreaterThanOrEqual(2);
      for (const s of Object.keys(o.skills)) {
        expect(SKILLS[s], `${id} ${s}`).toBeDefined();
        expect(EVERY_EXPERIMENT_SKILLS, `${id} lists an every-experiment skill`).not.toContain(s);
      }
      expect(o.cv, id).toMatch(/simulated/);
    }
    expect(Object.keys(OUTCOMES).sort()).toEqual([...ACTIVITY_IDS].sort());
  });
  it("is honest: every experiment is LO3; the studio is LO2; nothing claims LO1 or LO4", () => {
    for (const e of EXPERIMENTS) expect(OUTCOMES[e.id].los, e.id).toContain("LO3");
    expect(OUTCOMES.wireframe.los).toContain("LO2");
    for (const id of ACTIVITY_IDS) for (const code of ["LO1", "LO4"]) {
      expect(OUTCOMES[id].los, id).not.toContain(code);
      expect(OUTCOMES[id].partly, id).not.toContain(code);
    }
  });
  it("uses the specification's wording, as Data Detective does", () => {
    expect(LEARNING_OUTCOMES.LO3.text).toBe("Critically evaluate advanced eCommerce functionalities to enhance user experience and increase conversions.");
  });
});

describe("tutor notes", () => {
  it("every activity has notes: minutes, two or more debrief questions, a wrong turn and a stretch", () => {
    for (const id of ACTIVITY_IDS) {
      const n = TUTOR_NOTES[id];
      expect(n, id).toBeDefined();
      expect(n.minutes).toBeGreaterThanOrEqual(5);
      expect(n.prompts.length).toBeGreaterThanOrEqual(2);
      expect(n.misconceptions.length).toBeGreaterThanOrEqual(1);
      expect(n.extension.length).toBeGreaterThan(20);
    }
  });
  it("hold for every seed and setting: no percentages, pp, sample sizes or money", () => {
    const text = Object.values(TUTOR_NOTES).flatMap((n) => [...n.prompts, ...n.misconceptions, n.extension]).join(" ");
    expect(text).not.toMatch(/\d+(\.\d+)?\s?(%|pp)|£\d|\d,\d{3}/);
  });
  it("suggested sequences name real activities", () => {
    for (const s of SEQUENCES) for (const id of s.ids) expect(ACTIVITY_IDS, s.title).toContain(id);
  });
});
