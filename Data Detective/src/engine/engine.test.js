import { describe, it, expect } from "vitest";
import {
  generateCase, buildCrossTab, buildFunnel, realtimeSnapshot, precedingPeriod, scoreDiagnosis, summariseSegments, summariseTopline, incidentFactorAt,
  DIMENSIONS, REPORTS, CASES, CAUSE_TYPES, FUNNEL_STAGES, TOTAL_DAYS,
  avgRange, EARLY_WINDOW, LATE_WINDOW,
} from "./engine.js";

const CASE_ID = "paypal-gateway";
const CASE2_ID = "mobile-safari-bug";
const CASE3_ID = "traffic-mix";
const CASE4_ID = "masked-desktop";

/* ---- basics ----------------------------------------------------- */
describe("generateCase basics", () => {
  it("produces TOTAL_DAYS of finite, in-range topline data", () => {
    const c = generateCase(CASE_ID, "SEED-A");
    expect(c.topline.length).toBe(TOTAL_DAYS);
    for (const row of c.topline) {
      for (const k of ["sessions", "conversionRate", "purchases", "revenue"]) expect(Number.isFinite(row[k]), k).toBe(true);
      expect(row.sessions).toBeGreaterThan(0);
      expect(row.conversionRate).toBeGreaterThan(0);
      expect(row.conversionRate).toBeLessThan(1);
    }
  });
  it("every dimension's every segment covers every day, finite", () => {
    const c = generateCase(CASE_ID, "SEED-A");
    expect(c.breakdowns.length).toBe(DIMENSIONS.length);
    for (const dim of c.breakdowns) {
      for (const seg of dim.segments) {
        const rows = dim.series[seg.id];
        expect(rows.length).toBe(TOTAL_DAYS);
        for (const r of rows) expect(Number.isFinite(r.conversionRate)).toBe(true);
      }
    }
  });
});

/* ---- determinism -------------------------------------------------- */
describe("determinism", () => {
  it("same seed → byte-identical case", () => {
    expect(generateCase(CASE_ID, "SEED-A")).toEqual(generateCase(CASE_ID, "SEED-A"));
  });
  it("different seed → different topline", () => {
    const a = generateCase(CASE_ID, "SEED-A").topline.map((r) => r.conversionRate);
    const b = generateCase(CASE_ID, "SEED-B").topline.map((r) => r.conversionRate);
    expect(a).not.toEqual(b);
  });
});

/* ---- the core invariant: breakdowns reconcile with the topline --- */
describe("internal consistency", () => {
  const c = generateCase(CASE_ID, "SEED-A");
  it("every dimension's segment purchases sum to topline purchases, every day", () => {
    for (const dim of c.breakdowns) for (let day = 0; day < TOTAL_DAYS; day++) {
      const sum = dim.segments.reduce((a, s) => a + dim.series[s.id][day].purchases, 0);
      expect(sum).toBeCloseTo(c.topline[day].purchases, 2);
    }
  });
  it("every dimension's segment sessions sum to topline sessions, every day", () => {
    for (const dim of c.breakdowns) for (let day = 0; day < TOTAL_DAYS; day++) {
      const sum = dim.segments.reduce((a, s) => a + dim.series[s.id][day].sessions, 0);
      expect(sum).toBeCloseTo(c.topline[day].sessions, 2);
    }
  });
});

/* ---- THE sanity test: the signal is isolated to the true dimension */
describe("the incident is isolated to its true dimension", () => {
  const c = generateCase(CASE_ID, "SEED-A");
  const { truth } = c;
  const avg = (rows) => rows.reduce((a, r) => a + r.conversionRate, 0) / rows.length;
  const before = (rows) => avg(rows.filter((r) => r.day < truth.startDay));
  const after = (rows) => avg(rows.filter((r) => r.day >= truth.startDay));

  it("the true segment's rate craters after the incident", () => {
    const dim = c.breakdowns.find((d) => d.key === truth.dimension);
    const ratio = after(dim.series[truth.segment]) / before(dim.series[truth.segment]);
    expect(ratio).toBeLessThan(0.5); // a real, clear drop — deliberately not a near-total wipeout
  });
  it("other segments in the SAME dimension stay roughly flat", () => {
    const dim = c.breakdowns.find((d) => d.key === truth.dimension);
    for (const seg of dim.segments) {
      if (seg.id === truth.segment) continue;
      const ratio = after(dim.series[seg.id]) / before(dim.series[seg.id]);
      expect(ratio).toBeGreaterThan(0.8);
      expect(ratio).toBeLessThan(1.2);
    }
  });
  it("EVERY segment in a non-incident dimension moves with the topline, not differentially", () => {
    const toplineRatio = after(c.topline) / before(c.topline);
    for (const dim of c.breakdowns) {
      if (dim.key === truth.dimension) continue;
      for (const seg of dim.segments) {
        const ratio = after(dim.series[seg.id]) / before(dim.series[seg.id]);
        expect(Math.abs(ratio - toplineRatio)).toBeLessThan(0.08);
      }
    }
  });
});

/* ---- the red herring is genuinely debunkable by the data --------- */
describe("the red herring", () => {
  const c = generateCase(CASE_ID, "SEED-A");
  const before = (rows) => rows.filter((r) => r.day < 18);
  const shift = (rows) => rows.filter((r) => r.day >= 18 && r.day <= 20);
  const avg = (rows, key) => rows.reduce((a, r) => a + r[key], 0) / rows.length;

  it("email sessions visibly rise during the shift window", () => {
    const rows = c.breakdowns.find((d) => d.key === "source").series.email;
    expect(avg(shift(rows), "sessions")).toBeGreaterThan(avg(before(rows), "sessions") * 1.2);
  });
  it("but email's conversion just rides the topline — no extra signal of its own", () => {
    // Both the real incident and the red-herring's session bump start on day
    // 18, so email's RAW rate also dips then (the sitewide PayPal effect).
    // The debunking test isn't "stayed flat" — it's "moved no differently
    // than the topline did", i.e. the session bump didn't itself move the
    // needle on quality.
    const rows = c.breakdowns.find((d) => d.key === "source").series.email;
    const emailRatio = avg(shift(rows), "conversionRate") / avg(before(rows), "conversionRate");
    const toplineRatio = avg(shift(c.topline), "conversionRate") / avg(before(c.topline), "conversionRate");
    expect(Math.abs(emailRatio - toplineRatio)).toBeLessThan(0.08);
  });
});

/* ---- summariseSegments: the investigation-workspace tool --------- */
describe("summariseSegments", () => {
  const c = generateCase(CASE_ID, "SEED-A");
  it("computes a large, correct drop for the true segment — but doesn't rank it first by default", () => {
    // Difficulty matters here: the default order is by SHARE (like a real
    // analytics table), not by size-of-anomaly. Handing the answer to row
    // 1 for free would make "find the segment" trivial. Ranking by impact
    // is something the UI's sortable Δ column requires an active click for.
    const dim = c.breakdowns.find((d) => d.key === c.truth.dimension);
    const summary = summariseSegments(dim);
    const trueRow = summary.find((r) => r.id === c.truth.segment);
    expect(trueRow.pctChange).toBeLessThan(-0.3);

    const byImpact = [...summary].sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange));
    expect(byImpact[0].id).toBe(c.truth.segment); // findable once you sort for it...
    const byShare = [...summary].sort((a, b) => b.shareLate - a.shareLate);
    expect(summary.map((r) => r.id)).toEqual(byShare.map((r) => r.id)); // ...but not handed to you by default
  });
  it("shows small, comparable swings for a non-incident dimension (no false lead)", () => {
    const dim = c.breakdowns.find((d) => d.key === "device");
    for (const row of summariseSegments(dim)) expect(Math.abs(row.pctChange)).toBeLessThan(0.4);
  });
  it("shares within a dimension sum to ~1, for the GA-style table's proportion bars", () => {
    const dim = c.breakdowns.find((d) => d.key === "payment");
    const total = summariseSegments(dim).reduce((a, r) => a + r.shareLate, 0);
    expect(total).toBeCloseTo(1, 5);
  });
  it("revenue/purchases/AOV are well-formed for every segment", () => {
    for (const dim of c.breakdowns) for (const row of summariseSegments(dim)) {
      expect(row.sessionsLate).toBeGreaterThan(0);
      expect(row.purchasesLate).toBeGreaterThan(0);
      expect(row.revenueLate).toBeGreaterThan(0);
      expect(row.aovLate).toBeGreaterThan(0);
    }
  });
});

/* ---- summariseTopline: the GA-style KPI cards --------------------- */
describe("summariseTopline", () => {
  const c = generateCase(CASE_ID, "SEED-A");
  it("conversion rate and revenue both reflect the incident's drop", () => {
    const s = summariseTopline(c.topline);
    expect(s.conversionRate.pctChange).toBeLessThan(-0.15);
    expect(s.revenue.pctChange).toBeLessThan(-0.15);
  });
  it("sessions and revenue are SUMMED over the window, not averaged", () => {
    const s = summariseTopline(c.topline);
    const oneDay = c.topline[0].sessions;
    expect(s.sessions.late).toBeGreaterThan(oneDay * 5); // ~7 days summed, not 1 day's value
    expect(s.sessions.late).toBeLessThan(oneDay * 9);
  });
  it("conversion rate is averaged, not summed — stays a plausible rate", () => {
    const s = summariseTopline(c.topline);
    expect(s.conversionRate.late).toBeGreaterThan(0);
    expect(s.conversionRate.late).toBeLessThan(0.2);
  });
});

/* ====================================================================
   CASE 2 — the compound/interaction segment ("Mobile Safari"). This is
   the "very hard, multiple reports" case: the true cause is the
   INTERSECTION of two dimensions. Neither Device nor Browser alone
   should fully isolate it; only the Device × Browser cross-tab does.
   ==================================================================== */
describe("case 2: the topline is real but deliberately subtle", () => {
  const c = generateCase(CASE2_ID, "SEED-A", { noise: 1.4 });
  it("conversion and revenue are down, but nowhere near case 1's scale", () => {
    const s = summariseTopline(c.topline);
    expect(s.conversionRate.pctChange).toBeLessThan(-0.03);
    expect(s.conversionRate.pctChange).toBeGreaterThan(-0.20); // genuinely soft, not a cliff
    expect(s.revenue.pctChange).toBeLessThan(0);
  });
});

describe("case 2: Device alone and Browser alone are each inconclusive", () => {
  const c = generateCase(CASE2_ID, "SEED-A", { noise: 1.4 });
  it("Mobile (device) shows a real but partial dip — diluted, not the full story", () => {
    const row = summariseSegments(c.breakdowns.find((d) => d.key === "device")).find((r) => r.id === "mobile");
    expect(row.pctChange).toBeLessThan(-0.05);  // real signal...
    expect(row.pctChange).toBeGreaterThan(-0.5); // ...but far short of the true joint cell's collapse
  });
  it("Safari (browser) shows a real but partial dip — diluted, not the full story", () => {
    const row = summariseSegments(c.breakdowns.find((d) => d.key === "browser")).find((r) => r.id === "safari");
    expect(row.pctChange).toBeLessThan(-0.05);
    expect(row.pctChange).toBeGreaterThan(-0.5);
  });
  it("every OTHER segment in Device/Browser stays essentially flat — not even tracking the topline", () => {
    // Unlike a fully-uninvolved dimension (which tracks the topline
    // proportionally), a segment that is simply NOT the targeted half of
    // the joint pair is mathematically insulated from the incident
    // entirely — conditioning on (say) device=desktop makes the joint
    // factor deterministically 1, regardless of what's happening to mobile.
    for (const key of ["device", "browser"]) {
      const targeted = key === "device" ? "mobile" : "safari";
      for (const row of summariseSegments(c.breakdowns.find((d) => d.key === key))) {
        if (row.id === targeted) continue;
        expect(Math.abs(row.pctChange)).toBeLessThan(0.05);
      }
    }
  });
});

describe("case 2: a Device × Browser cross-tab (built on demand) isolates the true cause", () => {
  const c = generateCase(CASE2_ID, "SEED-A", { noise: 1.4 });
  const joint = buildCrossTab(c, "device", "browser");
  const id = (a, b) => `${a}__${b}`;
  it("there is NO pre-baked compound report — the analyst must pivot to build it", () => {
    expect(c.breakdowns.find((d) => d.key.includes("device") && d.key.includes("browser"))).toBeUndefined();
    expect(joint.segments.length).toBe(3 * 4);
    expect(joint.isCrossTab).toBe(true);
  });
  it("Mobile Safari collapses dramatically — the clean, undiluted signal", () => {
    const trueRow = summariseSegments(joint).find((r) => r.id === id("mobile", "safari"));
    expect(trueRow.pctChange).toBeLessThan(-0.7); // far beyond what either marginal view showed
  });
  it("every OTHER cell stays flat — no other cell is secretly affected", () => {
    for (const row of summariseSegments(joint)) {
      if (row.id === id("mobile", "safari")) continue;
      expect(Math.abs(row.pctChange)).toBeLessThan(0.05);
    }
  });
  it("the pivot is commutative — Browser × Device gives the same isolated cell", () => {
    const flipped = buildCrossTab(c, "browser", "device");
    const a = summariseSegments(joint).find((r) => r.id === id("mobile", "safari"));
    const b = summariseSegments(flipped).find((r) => r.id === id("safari", "mobile"));
    expect(a.pctChange).toBeCloseTo(b.pctChange, 4);
  });
  it("cell shares sum to ~1 and reconcile with the independent device/browser marginals", () => {
    const summary = summariseSegments(joint);
    expect(summary.reduce((a, r) => a + r.shareLate, 0)).toBeCloseTo(1, 4);
    const mobileSafari = summary.find((r) => r.id === id("mobile", "safari"));
    const deviceMobile = summariseSegments(c.breakdowns.find((d) => d.key === "device")).find((r) => r.id === "mobile");
    const browserSafari = summariseSegments(c.breakdowns.find((d) => d.key === "browser")).find((r) => r.id === "safari");
    expect(mobileSafari.shareLate).toBeCloseTo(deviceMobile.shareLate * browserSafari.shareLate, 2);
  });
  it("cell purchases/sessions still sum exactly to the topline, every day (cross-tab reconciliation holds)", () => {
    for (let day = 0; day < TOTAL_DAYS; day++) {
      const sumP = joint.segments.reduce((a, s) => a + joint.series[s.id][day].purchases, 0);
      expect(sumP).toBeCloseTo(c.topline[day].purchases, 1);
      const sumS = joint.segments.reduce((a, s) => a + joint.series[s.id][day].sessions, 0);
      expect(sumS).toBeCloseTo(c.topline[day].sessions, 1);
    }
  });
  it("the WRONG pivot is a dead end — Device × Country just spreads the dilution, isolating nothing", () => {
    const wrong = buildCrossTab(c, "device", "country");
    const drops = summariseSegments(wrong).filter((r) => r.pctChange < -0.5);
    expect(drops.length).toBe(0); // no single cell collapses; mobile's softness is smeared across countries
  });
});

describe("buildCrossTab reconciles for case 1's single-dimension incident too", () => {
  const c = generateCase("paypal-gateway", "SEED-A", { noise: 1.4 });
  it("cross-tabbing payment × device spreads the PayPal collapse evenly across devices", () => {
    const ct = buildCrossTab(c, "payment", "device");
    const summary = summariseSegments(ct);
    // every paypal cell drops hard regardless of device; no device-specificity
    const paypalCells = summary.filter((r) => r.id.startsWith("paypal__"));
    for (const cell of paypalCells) expect(cell.pctChange).toBeLessThan(-0.4);
    const nonPaypal = summary.filter((r) => !r.id.startsWith("paypal__"));
    for (const cell of nonPaypal) expect(Math.abs(cell.pctChange)).toBeLessThan(0.1);
  });
  it("reconciles to the topline every day", () => {
    const ct = buildCrossTab(c, "payment", "device");
    for (let day = 0; day < TOTAL_DAYS; day++) {
      const sumP = ct.segments.reduce((a, s) => a + ct.series[s.id][day].purchases, 0);
      expect(sumP).toBeCloseTo(c.topline[day].purchases, 1);
    }
  });
});

describe("case 2: every uninvolved dimension is a clean dead end", () => {
  const c = generateCase(CASE2_ID, "SEED-A", { noise: 1.4 });
  it("country/source/payment/page all move uniformly with the topline — no differential signal", () => {
    const toplineSummary = summariseTopline(c.topline);
    for (const key of ["country", "source", "payment", "page"]) {
      for (const row of summariseSegments(c.breakdowns.find((d) => d.key === key))) {
        expect(Math.abs(row.pctChange - toplineSummary.conversionRate.pctChange)).toBeLessThan(0.04);
      }
    }
  });
});

describe("case 2: the red herring is real but debunkable", () => {
  const c = generateCase(CASE2_ID, "SEED-A", { noise: 1.4 });
  const before = (rows) => rows.filter((r) => r.day < 14);
  const dip = (rows) => rows.filter((r) => r.day >= 14 && r.day <= 16);
  const avg = (rows, key) => rows.reduce((a, r) => a + r[key], 0) / rows.length;
  it("paid-search sessions genuinely dip during the competitor event window", () => {
    const rows = c.breakdowns.find((d) => d.key === "source").series.paidsearch;
    expect(avg(dip(rows), "sessions")).toBeLessThan(avg(before(rows), "sessions") * 0.85);
  });
  it("but conversion on that traffic stays normal — a volume story, not a quality one", () => {
    const rows = c.breakdowns.find((d) => d.key === "source").series.paidsearch;
    expect(Math.abs(avg(dip(rows), "conversionRate") / avg(before(rows), "conversionRate") - 1)).toBeLessThan(0.1);
  });
});

describe("case 2: scoring works for a compound (primary + secondary) answer", () => {
  const { truth } = generateCase(CASE2_ID, "SEED-A");
  it("the correct compound answer scores 4/4", () => {
    const s = scoreDiagnosis({ dimension: truth.dimension, segment: truth.segment, secondary: truth.secondary, segmentB: truth.segmentB, causeType: truth.causeType, startDay: truth.startDay }, truth);
    expect(s.allCorrect).toBe(true);
  });
  it("the answer is commutative — naming browser/safari as primary and device/mobile as secondary also scores 4/4", () => {
    const s = scoreDiagnosis({ dimension: "browser", segment: "safari", secondary: "device", segmentB: "mobile", causeType: truth.causeType, startDay: truth.startDay }, truth);
    expect(s.allCorrect).toBe(true);
  });
  it("guessing just 'device = mobile' (the diluted half, no secondary) is marked wrong", () => {
    const s = scoreDiagnosis({ dimension: "device", segment: "mobile", causeType: truth.causeType, startDay: truth.startDay }, truth);
    expect(s.dimensionCorrect).toBe(false);
    expect(s.segmentCorrect).toBe(false);
  });
  it("right pair of dimensions but wrong cell (mobile + chrome) fails the segment but not the dimension", () => {
    const s = scoreDiagnosis({ dimension: "device", segment: "mobile", secondary: "browser", segmentB: "chrome", causeType: truth.causeType, startDay: truth.startDay }, truth);
    expect(s.dimensionCorrect).toBe(true);
    expect(s.segmentCorrect).toBe(false);
  });
});

describe("REPORTS nav metadata is well-formed", () => {
  it("every report references a real dimension", () => {
    for (const group of REPORTS) for (const item of group.items) {
      expect(DIMENSIONS.some((d) => d.key === item.dim), item.dim).toBe(true);
    }
  });
});

/* ---- the extra GA4 engagement metrics (more data + decoys) -------- */
describe("engagement metrics", () => {
  const c = generateCase(CASE_ID, "SEED-A", { noise: 1.4 });
  it("topline and every segment carry engagement rate, time and events, all finite & in range", () => {
    for (const row of c.topline) {
      expect(row.engagementRate).toBeGreaterThan(0.1); expect(row.engagementRate).toBeLessThan(0.95);
      expect(row.avgEngagementTime).toBeGreaterThan(30); expect(row.events).toBeGreaterThan(0); expect(row.newUsers).toBeGreaterThan(0);
    }
    for (const dim of c.breakdowns) for (const seg of dim.segments) for (const row of dim.series[seg.id]) {
      for (const k of ["engagementRate", "avgEngagementTime", "events", "engagedSessions"]) expect(Number.isFinite(row[k]), `${dim.key}.${seg.id}.${k}`).toBe(true);
    }
  });
  it("engagement is a DECOY — it stays flat in the very segment whose conversion collapses", () => {
    // PayPal's conversion craters; its engagement must NOT, or it would be a
    // second giveaway signal. (Engagement is independent of the incident.)
    const paypal = c.breakdowns.find((d) => d.key === "payment").series.paypal;
    const before = paypal.filter((r) => r.day < c.truth.startDay), after = paypal.filter((r) => r.day >= c.truth.startDay);
    const avg = (rows, key) => rows.reduce((a, r) => a + r[key], 0) / rows.length;
    expect(avg(after, "conversionRate") / avg(before, "conversionRate")).toBeLessThan(0.5); // conversion broke
    expect(Math.abs(avg(after, "engagementRate") / avg(before, "engagementRate") - 1)).toBeLessThan(0.08); // engagement didn't
  });
  it("segment engagement reconciles to the topline (sessions-weighted) on a given day", () => {
    const dim = c.breakdowns.find((d) => d.key === "device");
    const day = 5;
    const totalSess = dim.segments.reduce((a, s) => a + dim.series[s.id][day].sessions, 0);
    const weighted = dim.segments.reduce((a, s) => a + dim.series[s.id][day].engagementRate * dim.series[s.id][day].sessions, 0) / totalSess;
    expect(weighted).toBeCloseTo(c.topline[day].engagementRate, 2);
  });
  it("summariseTopline surfaces the new metrics for the KPI cards", () => {
    const s = summariseTopline(c.topline);
    for (const k of ["newUsers", "engagedSessions", "engagementRate", "avgEngagementTime", "events"]) {
      expect(Number.isFinite(s[k].late), k).toBe(true);
    }
  });
});

describe("more dimensions", () => {
  it("region, age and gender exist as full reports", () => {
    const c = generateCase(CASE_ID, "SEED-A");
    for (const key of ["region", "age", "gender"]) {
      const dim = c.breakdowns.find((d) => d.key === key);
      expect(dim, key).toBeTruthy();
      expect(dim.segments.length).toBeGreaterThan(2);
    }
  });
});

/* ---- the multi-stage funnel -------------------------------------- */
describe("buildFunnel", () => {
  const c1 = generateCase(CASE_ID, "SEED-A", { noise: 1.4 });        // PayPal, breaks 'purchase'
  const c2 = generateCase("mobile-safari-bug", "SEED-A", { noise: 1.4 }); // Mobile Safari, breaks 'atc'
  const dropStage = (summary) => Object.entries(summary).filter(([k]) => k !== "overall").sort((a, b) => a[1].pctChange - b[1].pctChange)[0][0];

  it("the four step-rates multiply to the overall conversion rate, every day", () => {
    const f = buildFunnel(c1, [{ dim: "payment", seg: "paypal" }]);
    for (const d of f.days) {
      const product = FUNNEL_STAGES.reduce((p, s) => p * d[s.key], 1);
      expect(product).toBeCloseTo(d.overall, 4);
    }
  });
  it("filtered to the incident segment, the break is pinned to the RIGHT step (PayPal → purchase)", () => {
    const f = buildFunnel(c1, [{ dim: "payment", seg: "paypal" }]);
    expect(f.attributedStage).toBe("purchase");
    expect(dropStage(f.summary)).toBe("purchase");
    expect(f.summary.purchase.pctChange).toBeLessThan(-0.4);
    // the other steps barely move
    for (const k of ["view", "atc", "checkout"]) expect(Math.abs(f.summary[k].pctChange)).toBeLessThan(0.1);
  });
  it("filtered to the joint cell, the break pins to add-to-cart (Mobile Safari → atc)", () => {
    const f = buildFunnel(c2, [{ dim: "device", seg: "mobile" }, { dim: "browser", seg: "safari" }]);
    expect(f.attributedStage).toBe("atc");
    expect(dropStage(f.summary)).toBe("atc");
    expect(f.summary.atc.pctChange).toBeLessThan(-0.6);
  });
  it("at the WHOLE-SITE level the dip smears across steps — no single step is pinned", () => {
    const f = buildFunnel(c1, []); // no filter
    expect(f.attributedStage).toBe(null);
    const changes = FUNNEL_STAGES.map((s) => f.summary[s.key].pctChange);
    const spread = Math.max(...changes) - Math.min(...changes);
    expect(spread).toBeLessThan(0.05); // all steps move by ~the same small amount
  });
  it("filtering to only HALF a joint cause (mobile, any browser) also fails to pin the step", () => {
    const f = buildFunnel(c2, [{ dim: "device", seg: "mobile" }]);
    expect(f.attributedStage).toBe(null); // partial match → no attribution
  });
});

describe("precedingPeriod", () => {
  it("returns the equal-length window immediately before, clamped at 0", () => {
    expect(precedingPeriod([21, 27])).toEqual([14, 20]);
    expect(precedingPeriod([7, 13])).toEqual([0, 6]);
    expect(precedingPeriod([0, 6])).toEqual([0, 0]); // clamped
  });
  it("summaries accept an arbitrary current/comparison window", () => {
    const c = generateCase(CASE_ID, "SEED-A", { noise: 1.4 });
    // a window placed entirely BEFORE the incident should show ~no conversion drop
    const clean = summariseTopline(c.topline, [0, 6], [7, 13]);
    expect(Math.abs(clean.conversionRate.pctChange)).toBeLessThan(0.1);
    // the default late-vs-early window shows the real drop
    const real = summariseTopline(c.topline);
    expect(real.conversionRate.pctChange).toBeLessThan(-0.1);
  });
  it("count-metric % change is per-day normalised, so unequal window lengths don't read as a fake jump", () => {
    const c = generateCase(CASE_ID, "SEED-A", { noise: 1.4 });
    // comparing a 21-day window to the clean first week: sessions/day are
    // roughly flat, so the delta must be small — NOT ~+200% from summing 3× the days
    const s = summariseTopline(c.topline, [0, 6], [7, 27]);
    expect(Math.abs(s.sessions.pctChange)).toBeLessThan(0.15);
    expect(s.sessions.late).toBeGreaterThan(s.sessions.early * 2); // the raw total is still ~3× (headline number)
  });
});

describe("realtimeSnapshot (flavour only)", () => {
  it("is deterministic per seed and returns active users + a 30-bucket trend", () => {
    const c = generateCase(CASE_ID, "SEED-A");
    const a = realtimeSnapshot(c, "SEED-A"), b = realtimeSnapshot(c, "SEED-A");
    expect(a).toEqual(b);
    expect(a.perMinute.length).toBe(30);
    expect(a.active).toBeGreaterThan(0);
    expect(a.countries[0].users).toBeGreaterThanOrEqual(a.countries[a.countries.length - 1].users);
  });
});

/* ---- incident shapes (built for the future case file) ------------ */
describe("incident shapes", () => {
  it("cliff is instant and holds", () => {
    const incident = { shape: "cliff", startDay: 10, factor: 0.2 };
    expect(incidentFactorAt(9, incident)).toBe(1);
    expect(incidentFactorAt(10, incident)).toBe(0.2);
    expect(incidentFactorAt(20, incident)).toBe(0.2);
  });
  it("gradual ramps smoothly from 1 to factor", () => {
    const incident = { shape: "gradual", startDay: 10, factor: 0.2 };
    expect(incidentFactorAt(5, incident)).toBe(1);
    const mid = incidentFactorAt(15, incident);
    expect(mid).toBeGreaterThan(0.2); expect(mid).toBeLessThan(1);
    expect(incidentFactorAt(25, incident)).toBeCloseTo(0.2, 5);
  });
  it("spike-revert returns to baseline after its window", () => {
    const incident = { shape: "spike-revert", startDay: 10, factor: 0.3 };
    expect(incidentFactorAt(9, incident)).toBe(1);
    expect(incidentFactorAt(11, incident)).toBe(0.3);
    expect(incidentFactorAt(20, incident)).toBe(1);
  });
});

/* ---- scoring -------------------------------------------------------- */
describe("scoreDiagnosis", () => {
  const { truth } = generateCase(CASE_ID, "SEED-A");
  it("a fully correct guess scores 4/4", () => {
    const s = scoreDiagnosis({ dimension: truth.dimension, segment: truth.segment, causeType: truth.causeType, startDay: truth.startDay }, truth);
    expect(s.allCorrect).toBe(true);
    expect(s.fieldsCorrect).toBe(4);
  });
  it("a wrong dimension fails both dimension and segment, even if the segment id coincides", () => {
    const s = scoreDiagnosis({ dimension: "device", segment: truth.segment, causeType: truth.causeType, startDay: truth.startDay }, truth);
    expect(s.dimensionCorrect).toBe(false);
    expect(s.segmentCorrect).toBe(false);
  });
  it("a date within the ±2 day tolerance still counts", () => {
    const s = scoreDiagnosis({ ...truth, startDay: truth.startDay + 2 }, truth);
    expect(s.dateCorrect).toBe(true);
  });
  it("a date outside the tolerance does not", () => {
    const s = scoreDiagnosis({ ...truth, startDay: truth.startDay + 5 }, truth);
    expect(s.dateCorrect).toBe(false);
  });
});

/* ---- case file integrity ------------------------------------------- */
describe("case file", () => {
  // Look up dimensions via the GENERATED case (generateCase's own
  // `breakdowns`), not the static DIMENSIONS list — a case can target a
  // compound/cross-tab dimension (e.g. "device_browser") that only
  // exists once generated, not as one of the six base dimensions.
  it("every case's truth references a real dimension, segment and cause type", () => {
    for (const c of CASES) {
      const generated = generateCase(c.id, "SEED-A");
      const dim = generated.breakdowns.find((d) => d.key === c.truth.dimension);
      expect(dim, c.id).toBeTruthy();
      expect(dim.segments.some((s) => s.id === c.truth.segment), c.id).toBe(true);
      expect(CAUSE_TYPES.some((t) => t.id === c.truth.causeType), c.id).toBe(true);
    }
  });
  it("ticket-time event labels don't name the true dimension/segment — that's for the data to reveal", () => {
    // A real changelog entry wouldn't pre-announce the diagnosis. If a
    // segment's own name (or a dead giveaway like the cause-type's words)
    // appears in an event label, the puzzle can be solved from the ticket
    // text alone, without ever touching the dashboard.
    for (const c of CASES) {
      const generated = generateCase(c.id, "SEED-A");
      const dim = generated.breakdowns.find((d) => d.key === c.truth.dimension);
      const giveaways = [...dim.label.split(" × "), ...dim.segments.map((s) => s.name).flatMap((n) => n.split(" + ")), "gateway"];
      for (const e of c.events) for (const word of giveaways) {
        expect(e.label.toLowerCase(), `"${e.label}" contains "${word}"`).not.toContain(word.toLowerCase());
      }
    }
  });
});

/* ---- every case reconciles (incl. the two Expert cases) --------- */
describe("all cases reconcile to the topline", () => {
  for (const def of CASES) {
    it(`${def.id}: segment purchases sum to topline every day`, () => {
      const c = generateCase(def.id, "SEED-A");
      for (const dim of c.breakdowns) for (let day = 0; day < TOTAL_DAYS; day++) {
        const sum = dim.segments.reduce((a, s) => a + dim.series[s.id][day].purchases, 0);
        expect(Math.abs(sum - c.topline[day].purchases)).toBeLessThan(1e-6);
      }
    });
  }
});

const rat = (rows, key = "conversionRate") => avgRange(rows, LATE_WINDOW, key) / avgRange(rows, EARLY_WINDOW, key);

/* ---- EXPERT case 3: composition / mix-shift trap ---------------- */
describe("composition trap (traffic-mix)", () => {
  const c = generateCase(CASE3_ID, "SEED-A");
  const src = c.breakdowns.find((d) => d.key === "source").series;
  it("has no rate incident at all", () => { expect(c.incident).toBeNull(); });
  it("the sitewide conversion rate falls", () => {
    expect(rat(c.topline)).toBeLessThan(0.94);
  });
  it("yet NO segment craters faster than the topline (nothing is 'broken')", () => {
    const tl = rat(c.topline);
    for (const dim of c.breakdowns) for (const seg of dim.segments) {
      // every segment's own rate holds at or above the topline's drop — no localized collapse
      expect(rat(dim.series[seg.id]), `${dim.key}:${seg.id}`).toBeGreaterThan(tl * 0.9);
    }
  });
  it("paid social's own rate stays flat while its SESSION share surges", () => {
    expect(rat(src.paidsocial)).toBeGreaterThan(0.9);                       // rate flat
    expect(rat(src.paidsocial, "sessions")).toBeGreaterThan(1.5);           // volume surges
    expect(rat(src.organic, "sessions")).toBeLessThan(0.9);                 // organic dips
  });
});

/* ---- EXPERT case 4: masked localized incident ------------------- */
describe("masked incident (masked-desktop)", () => {
  const c = generateCase(CASE4_ID, "SEED-A");
  const dev = c.breakdowns.find((d) => d.key === "device").series;
  const ut = c.breakdowns.find((d) => d.key === "userType").series;
  it("the topline barely moves (the incident is masked)", () => {
    expect(rat(c.topline)).toBeGreaterThan(0.88);
  });
  it("but desktop conversion collapses — far worse than the topline suggests", () => {
    expect(rat(dev.desktop)).toBeLessThan(0.82);
    expect(rat(dev.desktop)).toBeLessThan(rat(c.topline) - 0.1);
  });
  it("mobile is essentially unaffected (the fault is localized to desktop)", () => {
    expect(rat(dev.mobile)).toBeGreaterThan(0.9);
  });
  it("returning-user sessions surge — the masking red herring", () => {
    expect(rat(ut.returning, "sessions")).toBeGreaterThan(1.4);
  });
});
