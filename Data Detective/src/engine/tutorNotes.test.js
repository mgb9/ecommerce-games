import { describe, it, expect } from "vitest";
import { SEQUENCES, TUTOR_NOTES } from "./tutorNotes.js";
import { ALL_CASES } from "../ui/caseList.js";

describe("tutor notes", () => {
  it("every case in the inbox has notes: minutes, two or more debrief questions, a wrong turn and a stretch", () => {
    for (const c of ALL_CASES) {
      const n = TUTOR_NOTES[c.id];
      expect(n, c.id).toBeDefined();
      expect(n.minutes).toBeGreaterThanOrEqual(10);
      expect(n.prompts.length).toBeGreaterThanOrEqual(2);
      expect(n.misconceptions.length).toBeGreaterThanOrEqual(1);
      expect(n.extension.length).toBeGreaterThan(20);
    }
    expect(Object.keys(TUTOR_NOTES).sort()).toEqual(ALL_CASES.map((c) => c.id).sort());
  });
  it("notes hold for every seed: no days, percentages or sums of money", () => {
    const text = Object.values(TUTOR_NOTES).flatMap((n) => [...n.prompts, ...n.misconceptions, n.extension]).join(" ");
    expect(text).not.toMatch(/\bW\d (Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b|\d+(\.\d+)?%|£\d/);
  });
  it("suggested sequences name real cases", () => {
    const ns = new Set(ALL_CASES.map((c) => c.n));
    for (const s of SEQUENCES) for (const n of s.cases) expect(ns.has(n), `${s.title}: ${n}`).toBe(true);
  });
});
