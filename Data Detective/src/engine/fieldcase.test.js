import { describe, it, expect } from "vitest";
import {
  FIELD_DATA, FIELD_CASE, FIELD_VERDICTS, FIELD_VERDICT_TRUTH, FIELD_GUNS, FIELD_GUN_TRUTH,
  FIELD_REMEDIES, FIELD_REMEDY_TRUTH, FIELD_CLUES, FIELD_REPORTS, FIELD_REPORT_META,
  FIELD_EXPLANATION,
  scoreFieldDiagnosis,
} from "./fieldcase.js";

/* The data module is generated from real GA exports — these tests pin the
   headline facts the case's story depends on, so a regeneration that
   silently changed them would fail loudly. */
describe("field data integrity", () => {
  it("has the six reports plus the daily series", () => {
    for (const k of ["channels", "sourceMedium", "device", "age", "landingPages", "products", "daily"]) {
      expect(FIELD_DATA[k]).toBeTruthy();
    }
    expect(FIELD_DATA.daily.length).toBe(71); // 25 Aug – 3 Nov 2015
  });

  it("channel totals match the real export", () => {
    const t = FIELD_DATA.channels.total;
    expect(t.sessions).toBe(230128);
    expect(t.trans).toBe(5203);
    expect(t.revenue).toBeCloseTo(3286996.67, 1);
    // channel rows sum back to the total
    const sum = (k) => FIELD_DATA.channels.rows.reduce((a, r) => a + r[k], 0);
    expect(sum("sessions")).toBe(t.sessions);
    expect(sum("trans")).toBe(t.trans);
    expect(sum("revenue")).toBeCloseTo(t.revenue, 1);
  });

  it("daily sessions sum to the total", () => {
    const s = FIELD_DATA.daily.reduce((a, d) => a + d.sessions, 0);
    expect(s).toBe(230128);
  });

  it("the referral trap is present: 16% channel conv, gateway + sandbox rows", () => {
    const ref = FIELD_DATA.channels.rows.find((r) => r.id === "ch-referral");
    expect(ref.conv).toBeGreaterThan(0.15);
    const sm = FIELD_DATA.sourceMedium.rows;
    const paypal = sm.find((r) => r.id === "sm-paypal-com-referral");
    expect(paypal.trans).toBe(1919);
    expect(paypal.conv).toBeGreaterThan(0.5);
    const sandbox = sm.find((r) => r.id === "sm-sandbox-paypal-com-referral");
    expect(sandbox.revenue).toBeCloseTo(386975.06, 1);
    expect(sandbox.trans).toBe(76);
    // gateway + sandbox account for the bulk of the referral channel's transactions
    const sagepay = sm.find((r) => r.id === "sm-live-sagepay-com-referral");
    expect(paypal.trans + sandbox.trans + sagepay.trans).toBe(1999);
    expect(ref.trans).toBe(2423);
  });

  it("merchant is anonymised — no real name survives", () => {
    const blob = JSON.stringify(FIELD_DATA).toLowerCase();
    expect(blob.includes("ballicom")).toBe(false);
    expect(blob.includes("chrichton")).toBe(true); // staging rows renamed, still present
  });

  it("source/medium rows reconcile to the channel totals", () => {
    const sm = FIELD_DATA.sourceMedium.rows;
    const t = FIELD_DATA.channels.total;
    expect(sm.reduce((a, r) => a + r.sessions, 0)).toBe(t.sessions);
    expect(sm.reduce((a, r) => a + r.trans, 0)).toBe(t.trans);
    expect(sm.reduce((a, r) => a + r.revenue, 0)).toBeCloseTo(t.revenue, 0);
  });

  it("supporting clue rows exist: internal traffic, bulk orders, PLA waste, mobile", () => {
    const ids = new Set([
      ...FIELD_DATA.sourceMedium.rows.map((r) => r.id),
      ...FIELD_DATA.landingPages.rows.map((r) => r.id),
      ...FIELD_DATA.products.rows.map((r) => r.id),
      ...FIELD_DATA.device.rows.map((r) => r.id),
      ...FIELD_DATA.channels.rows.map((r) => r.id),
      ...FIELD_DATA.age.rows.map((r) => r.id),
    ]);
    for (const clue of FIELD_CLUES) for (const row of clue.rows) {
      expect(ids.has(row), `clue row ${row} missing from data`).toBe(true);
    }
    // and the specific facts behind them
    const mobile = FIELD_DATA.device.rows.find((r) => r.id === "dev-mobile");
    const desktop = FIELD_DATA.device.rows.find((r) => r.id === "dev-desktop");
    expect(mobile.conv).toBeLessThan(desktop.conv / 1.8);
    const archos = FIELD_DATA.landingPages.rows.find((r) => r.id === "lp-21");
    expect(archos.trans).toBe(0);
    expect(archos.bounce).toBeGreaterThan(0.9);
    const ssd = FIELD_DATA.products.rows.find((r) => r.id === "pr-0");
    expect(ssd.qty).toBe(343);
    expect(ssd.purchases).toBe(4);
  });

  it("every report key in FIELD_REPORTS has data and column metadata", () => {
    for (const g of FIELD_REPORTS) for (const it_ of g.items) {
      expect(FIELD_DATA[it_.key]).toBeTruthy();
      expect(FIELD_REPORT_META[it_.key]).toBeTruthy();
      expect(FIELD_REPORT_META[it_.key].cols.length).toBeGreaterThan(3);
    }
  });
});

describe("scoring", () => {
  const perfect = { verdict: FIELD_VERDICT_TRUTH, gun: FIELD_GUN_TRUTH, remedy: FIELD_REMEDY_TRUTH };
  const allFlags = FIELD_CLUES.flatMap((c) => c.rows);

  it("truth ids exist among the offered options", () => {
    expect(FIELD_VERDICTS.some((v) => v.id === FIELD_VERDICT_TRUTH)).toBe(true);
    expect(FIELD_GUNS.some((v) => v.id === FIELD_GUN_TRUTH)).toBe(true);
    expect(FIELD_REMEDIES.some((v) => v.id === FIELD_REMEDY_TRUTH)).toBe(true);
  });

  it("perfect run scores 3/3 with all clues found", () => {
    const s = scoreFieldDiagnosis(perfect, allFlags);
    expect(s.allCorrect).toBe(true);
    expect(s.fieldsCorrect).toBe(3);
    expect(s.cluesFound).toBe(s.clueTotal);
    expect(s.coreFound).toBe(s.coreTotal);
  });

  it("the trap verdict scores 0 on the verdict but flags still count", () => {
    const s = scoreFieldDiagnosis({ verdict: "agency-right", gun: FIELD_GUN_TRUTH, remedy: FIELD_REMEDY_TRUTH }, ["sm-sandbox-paypal-com-referral"]);
    expect(s.verdictCorrect).toBe(false);
    expect(s.fieldsCorrect).toBe(2);
    expect(s.cluesFound).toBe(1);
    expect(s.clueDetail.find((c) => c.id === "sandbox").found).toBe(true);
  });

  it("a clue group counts as found from ANY of its rows", () => {
    const s1 = scoreFieldDiagnosis(perfect, ["sm-192-168-1-100-7777-referral"]);
    const s2 = scoreFieldDiagnosis(perfect, ["sm-2staging-chrichton-co-uk-referral"]);
    expect(s1.clueDetail.find((c) => c.id === "internal").found).toBe(true);
    expect(s2.clueDetail.find((c) => c.id === "internal").found).toBe(true);
  });

  it("no flags → zero clues, and scoring tolerates undefined flags", () => {
    expect(scoreFieldDiagnosis(perfect, []).cluesFound).toBe(0);
    expect(scoreFieldDiagnosis(perfect, undefined).cluesFound).toBe(0);
  });

  it("flagging aggregate/non-clue rows earns nothing", () => {
    const s = scoreFieldDiagnosis(perfect, ["sm-other", "lp-other", "pr-other", "ch-paidsearch"]);
    expect(s.cluesFound).toBe(0);
  });
});

/* The PLA clue and the explanation quote figures that only exist in the
   full export; plaSummary (pinned in fieldcase-provenance.test.js) carries
   them, and this ties the words on screen to those numbers. */
describe("case 8 text quotes the verified Shopping-ad figures", () => {
  const pla = FIELD_DATA.plaSummary;
  const clue = FIELD_CLUES.find((c) => c.id === "pla-waste").detail;
  const fmt = (n) => n.toLocaleString("en-GB");
  it("sessions, bounce and conversion in the clue match plaSummary", () => {
    expect(clue).toContain(`~${fmt(Math.round(pla.sessions / 100) * 100)} sessions`);
    expect(clue).toContain(`${Math.round(pla.bounce * 100)}% bounce`);
    expect(clue).toContain(`${(pla.conv * 100).toFixed(2)}% conversion`);
  });
  it("the zero-order count and the worst page match", () => {
    expect(pla.zeroSaleOver200).toBe(14);   // the clue spells it out: "Fourteen Shopping ads…"
    expect(clue).toContain("Fourteen Shopping ads drove 200+ visits");
    expect(clue).toContain(`landed ${pla.worst.sessions} visitors, ${Math.round(pla.worst.bounce * 100)}% of whom bounced`);
    expect(FIELD_EXPLANATION).toContain(`${pla.pages} exported Shopping-ad landing pages`);
  });
});
