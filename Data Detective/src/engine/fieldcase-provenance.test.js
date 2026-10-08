import { describe, it, expect } from "vitest";
import { FIELD_DATA } from "./fieldcase-data.js";

/* Provenance for Case 8's Google Shopping figures. The 'pla-waste' clue and
   FIELD_EXPLANATION quote aggregates over EVERY ?ref=PLA row in the 1,000-row
   Landing Pages export, but FIELD_DATA.landingPages only keeps the top rows.
   gen_fieldcase.py therefore also emits FIELD_DATA.plaSummary, computed from
   the full export; these tests pin the numbers the case text relies on, so
   a regeneration that moved them fails loudly. */
const P = FIELD_DATA.plaSummary;

describe("Google Shopping (?ref=PLA) provenance", () => {
  it("is computed from the truncated export, and says so", () => {
    expect(P).toBeTruthy();
    // GA cut the export at 1,000 named rows; the report total is far larger.
    expect(P.exportedRows).toBe(1000);
    expect(P.exportedSessions).toBe(102363);
    expect(P.reportSessions).toBe(230128);
    expect(P.reportSessions).toBe(FIELD_DATA.channels.total.sessions);
    expect(P.exportedSessions).toBeLessThan(P.reportSessions);
    expect(P.basis).toMatch(/lower bound/);
    // PLA traffic is a subset of the named rows
    expect(P.pages).toBeLessThanOrEqual(P.exportedRows);
    expect(P.sessions).toBeLessThanOrEqual(P.exportedSessions);
  });

  it("'888 Shopping-ad landing pages' (FIELD_EXPLANATION)", () => {
    expect(P.pages).toBe(888);
    expect(P.products).toBe(874); // some products have more than one PLA URL
  });

  it("'~70,600 sessions at an 82% bounce and 0.85% conversion'", () => {
    expect(P.sessions).toBe(70591);
    expect(Math.round(P.sessions / 100) * 100).toBe(70600);
    expect(Math.round(P.bounce * 100)).toBe(82);
    expect(P.conv * 100).toBeCloseTo(0.85, 2);
    // conv is transactions / sessions, consistent with the summed counts
    expect(P.trans).toBe(602);
    expect(P.trans / P.sessions).toBeCloseTo(P.conv, 4);
    expect(P.revenue).toBeCloseTo(247891.04, 1);
  });

  it("'Fourteen products got 200+ paid clicks with zero sales'", () => {
    expect(P.zeroSaleOver200).toBe(14);
    // same answer whether counted per landing page or per product
    expect(P.zeroSaleOver200Products).toBe(14);
    expect(P.zeroSaleOver200Pages).toHaveLength(14);
    for (const r of P.zeroSaleOver200Pages) {
      expect(r.sessions).toBeGreaterThanOrEqual(200);
      expect(r.name.endsWith("?ref=PLA")).toBe(true);
    }
  });

  it("'the Archos smart-home kit burned 509 clicks at a 91% bounce and 11-second visits'", () => {
    const w = P.worst;
    expect(w).toEqual(P.zeroSaleOver200Pages[0]);
    expect(w.name).toMatch(/archos-smart-home/);
    expect(w.sessions).toBe(509);
    expect(Math.round(w.bounce * 100)).toBe(91);
    expect(Math.round(w.dur)).toBe(11);
    // it is the zero-sale page with the most sessions
    const most = Math.max(...P.zeroSaleOver200Pages.map((r) => r.sessions));
    expect(w.sessions).toBe(most);
  });

  it("stays anonymised", () => {
    expect(JSON.stringify(P).toLowerCase().includes("ballicom")).toBe(false);
  });
});
