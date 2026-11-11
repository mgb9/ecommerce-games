import { describe, it, expect } from "vitest";
import { SCENARIOS } from "./engine.js";
import { LEARNING_OUTCOMES, SKILLS, OUTCOMES, EVERY_BRIEF_SKILLS } from "./outcomes.js";
import { TUTOR_NOTES, SESSIONS } from "./tutorNotes.js";

describe("outcomes", () => {
  it("has an entry for every client brief, and no others", () => {
    expect(Object.keys(OUTCOMES).sort()).toEqual(SCENARIOS.map((s) => s.id).sort());
  });
  it("claims LO1 and LO3 only — never LO2 or LO4", () => {
    expect(Object.keys(LEARNING_OUTCOMES)).toEqual(["LO1", "LO2", "LO3", "LO4"]);
    for (const o of Object.values(OUTCOMES)) {
      expect(o.los).toEqual(["LO1", "LO3"]);
      expect(o.partly).toEqual([]);
    }
  });
  it("names only known skills, says what each looked like, and leaves the every-brief skills to the catalogue", () => {
    for (const o of Object.values(OUTCOMES)) {
      const ids = Object.keys(o.skills);
      expect(ids.length).toBeGreaterThanOrEqual(3);
      for (const id of ids) {
        expect(SKILLS[id], id).toBeTruthy();
        expect(EVERY_BRIEF_SKILLS).not.toContain(id);
        expect(o.skills[id]).toMatch(/\.$/);
      }
      expect(o.skills.technology).toBeTruthy(); // every brief is a platform choice (LO1)
      expect(o.syllabus.length).toBeGreaterThan(0);
      expect(o.client).toMatch(/^the /);
      expect(o.cv).toMatch(/\(simulated e-commerce [a-z ]+\)\.$/);
    }
    for (const id of EVERY_BRIEF_SKILLS) expect(SKILLS[id]).toBeTruthy();
  });
  it("never mentions the skills survey to students", () => {
    expect(JSON.stringify({ SKILLS, OUTCOMES, LEARNING_OUTCOMES })).not.toMatch(/PTES|survey/i);
  });
  it("has a Simpler English wording for every outcome, skill and brief line, different from the original", () => {
    for (const lo of Object.values(LEARNING_OUTCOMES)) { expect(lo.plain).toBeTruthy(); expect(lo.plain).not.toBe(lo.text); }
    for (const s of Object.values(SKILLS)) { expect(s.plain).toBeTruthy(); expect(s.plain).not.toBe(s.how); expect(s.plain).toMatch(/\.$/); }
    for (const o of Object.values(OUTCOMES)) {
      expect(Object.keys(o.skillsPlain)).toEqual(Object.keys(o.skills));
      for (const id of Object.keys(o.skills)) { expect(o.skillsPlain[id]).toBeTruthy(); expect(o.skillsPlain[id]).not.toBe(o.skills[id]); }
    }
  });
});

describe("tutor notes", () => {
  it("has notes for every brief, with no figures that a seed or setting could change", () => {
    expect(Object.keys(TUTOR_NOTES).sort()).toEqual(SCENARIOS.map((s) => s.id).sort());
    for (const n of Object.values(TUTOR_NOTES)) {
      expect(n.minutes).toBeGreaterThan(0);
      expect(n.prompts.length).toBeGreaterThanOrEqual(3);
      expect(n.misconceptions.length).toBeGreaterThanOrEqual(2);
      expect(n.extension).toBeTruthy();
      expect(JSON.stringify([n.prompts, n.misconceptions, n.extension])).not.toMatch(/£|\d%/);
    }
  });
  it("suggests sessions made of real briefs", () => {
    for (const s of SESSIONS) for (const id of s.ids) expect(TUTOR_NOTES[id], id).toBeTruthy();
  });
});
