import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CASES, LENSES, REPORTS, TOTAL_DAYS, buildCrossTab, generateCase, scoreDiagnosis, summariseSegments } from "../engine/engine.js";
import {
  FIELD_CASES, FIELD_REPORTS, FIELD_VERDICT_TRUTH, FIELD_GUN_TRUTH, FIELD_REMEDY_TRUTH, fieldCaseById, scoreFieldDiagnosis,
} from "../engine/fieldcase.js";
import { PlainModeProvider } from "./shared.jsx";
import Investigate from "./generated/Investigate.jsx";
import Diagnose from "./generated/Diagnose.jsx";
import Reveal from "./generated/Reveal.jsx";
import FieldInvestigate from "./field/FieldInvestigate.jsx";
import FieldDiagnose from "./field/FieldDiagnose.jsx";
import FieldReveal from "./field/FieldReveal.jsx";
import ReportView from "./report/ReportView.jsx";
import ReportPanel, { LENS_DEFS } from "./generated/ReportPanel.jsx";
import SmallMultiples from "./generated/SmallMultiples.jsx";
import Inbox from "./Inbox.jsx";
import CaseFile from "./CaseFile.jsx";
import AnswerSheet from "./AnswerSheet.jsx";
import InstructorTally from "./InstructorTally.jsx";
import SkillsRating from "./SkillsRating.jsx";
import { generatedReport } from "./report/generatedReport.js";
import { fieldReport } from "./field/fieldReport.js";

// App.smoke only reaches the intro. These render every later screen
// directly from props, so a symbol a screen forgot to import (a runtime
// ReferenceError the build won't catch) fails here instead of in class.
const html = (el) => renderToStaticMarkup(<PlainModeProvider>{el}</PlainModeProvider>);
const noop = () => {};
const range = { cur: [TOTAL_DAYS - 7, TOTAL_DAYS - 1], setCur: noop, cmp: [0, 6], cmpMode: "first", setCmpMode: noop, cmpName: "Wk1" };

describe("generated-case screens render", () => {
  const caseData = generateCase(CASES[1].id, "DD-2026", { variant: 0 });   // Mobile × Safari
  const truth = caseData.truth;
  const reportKeys = ["home", "realtime", "funnel", "orders", ...REPORTS.flatMap((g) => g.items.map((it) => it.dim))];

  it.each(reportKeys)("investigate → %s", (key) => {
    const out = html(<Investigate caseData={caseData} metric="conversionRate" setMetric={noop} activeReport={key} openReport={noop}
      onPivot={noop} viewed={[]} pivots={[]} range={range} onDiagnose={noop} />);
    expect(out).toContain("Submit diagnosis");
  });

  it("diagnose and reveal", () => {
    const diagnosis = truth; // case 2's truth is a cross-tab pair, the richest form
    expect(html(<Diagnose diagnosis={diagnosis} setDiagnosis={noop} onBack={noop} onSubmit={noop} />)).toContain("Submit your diagnosis");
    const result = scoreDiagnosis(diagnosis, truth);
    const out = html(<Reveal caseData={caseData} cfg={{ seed: "DD-2026", noise: 1.4 }} diagnosis={{ ...diagnosis, confidence: 90 }} result={result} viewed={["device"]} pivots={["device×browser"]} onRetry={noop} />);
    expect(out).toContain("4/4 correct");
    expect(out).toContain("RED HERRING");
    expect(out).toContain("How you investigated");
    expect(out).toContain("your 1st cross-tab");
    expect(out).toContain(truth.lesson);
    expect(out).toContain("Well calibrated");
    expect(out).toContain("Try a fresh variant");
  });

  it("'nothing is broken' — the diagnosis form and the reveal", () => {
    const calm = generateCase("normal-week", "DD-2026", { variant: 0 });
    const guess = { dimension: "none", segment: null, secondary: null, segmentB: null, causeType: "external_no_issue", startDay: null, confidence: 70 };
    const form = html(<Diagnose diagnosis={guess} setDiagnosis={noop} onBack={noop} onSubmit={noop} />);
    expect(form).toContain("No start date");
    expect(form).toContain("Nothing to pick");
    const out = html(<Reveal caseData={calm} cfg={{ seed: "DD-2026", noise: 1.4 }} diagnosis={guess} result={scoreDiagnosis(guess, calm.truth)} viewed={["device", "browser", "payment"]} pivots={[]} onRetry={noop} />);
    expect(out).toContain("4/4 correct");
    expect(out).toContain("no broken segment to find");
  });

  it("a tracking false alarm's reveal points at the back office", () => {
    const fake = generateCase("false-alarm-tracking", "DD-2026", { variant: 0 });
    const guess = { dimension: "browser", segment: "safari", secondary: null, segmentB: null, causeType: "gateway_failure", startDay: 19, confidence: 90 };
    const out = html(<Reveal caseData={fake} cfg={{ seed: "DD-2026", noise: 1.4 }} diagnosis={guess} result={scoreDiagnosis(guess, fake.truth)} viewed={["browser"]} pivots={[]} onRetry={noop} />);
    expect(out).toContain("Back-office orders");
    expect(out).toContain("Overconfident");
  });
});

describe("report lenses and small multiples", () => {
  const cd = generateCase("orders-up-revenue-down", "DD-2026", { variant: 0 });
  const country = cd.breakdowns.find((d) => d.key === "country");
  it.each(LENSES)("the Country report viewed by %s", (lens) => {
    const out = html(<ReportPanel caseData={cd} reportDim={country} onPivot={noop} range={range} lens={lens} onLens={noop} />);
    expect(out).toContain(`Country — ${LENS_DEFS[lens].label.toLowerCase()}`);
    expect(out).toContain(`aria-pressed="true" style`);
    expect(out).toContain(`>${LENS_DEFS[lens].group}</th>`);   // the Was / Now / Δ group follows the lens
    expect(out).toContain("Germany");
  });
  it("a 30-cell cross-tab draws one small panel per cell, on a shared scale", () => {
    const ct = buildCrossTab(cd, "region", "age");
    const out = html(<SmallMultiples breakdown={ct} summary={summariseSegments(ct, range.cmp, range.cur)} lens="aov" lensDef={LENS_DEFS.aov} range={range} unit="combination" />);
    expect(out.match(/<polyline/g)).toHaveLength(30);
    expect(out).toContain("all on one scale");
    expect(out).toContain('role="img"');
  });
  it("the AOV case's reveal coaches the lens", () => {
    const guess = { ...cd.truth, confidence: 70 };
    const out = html(<Reveal caseData={cd} diagnosis={guess} result={scoreDiagnosis(guess, cd.truth)} viewed={["country"]} pivots={[]} lenses={["country:conversionRate"]} onRetry={noop} onInbox={noop} />);
    expect(out).toContain("You never viewed");
    expect(out).toContain("Back to the case inbox");
  });
});

describe("instructor views and the self-rating render", () => {
  it("the answer sheet lists every generated case's variants and the field cases' calls", () => {
    const out = html(<AnswerSheet cfg={{ seed: "DD-2026", noise: 1.4 }} onBack={noop} />);
    expect(out).toContain("Instructor answer sheet");
    expect(out.match(/Variant A/g)).toHaveLength(CASES.length);
    expect(out).toContain("first attempt for this seed");
    expect(out).toContain("Case 09 · The 2015 cold case (real data");
    expect(out).toContain("Case 12 · The channel that collapsed on paper");
    expect(out).toContain("the sitewide total and back-office orders are flat");
    expect(out).toContain("ends after 5 days");
  });
  it("the tally renders empty, and the rating form has six labelled groups", () => {
    expect(html(<InstructorTally onBack={noop} />)).toContain("Nothing to tally yet");
    const form = html(<SkillsRating title="Rate yourself" intro="x" onSave={noop} onSkip={noop} />);
    expect(form.match(/<fieldset/g)).toHaveLength(6);
    expect(form.match(/type="radio"/g)).toHaveLength(30);
    expect(form).toContain("Skip for now");
  });
});

describe("inbox and case file render", () => {
  const cfg = { seed: "DD-2026", noise: 1.4 };
  it("the inbox lists every case with an Open button", () => {
    const out = html(<Inbox cfg={cfg} attempts={{}} current={null} onOpen={noop} onReturn={noop} onCaseFile={noop} />);
    expect(out).toContain("Case <span");
    for (const n of ["01", "08", "09"]) expect(out).toContain(`Open case ${n}`);
    expect(out.match(/>Open case \d\d →</g)).toHaveLength(12);
    expect(out).toContain("What these cases develop");
    expect(out).toContain("Partly, in cases 01, 02, 06, 09, 11, 12.");
    expect(out).toMatch(/Germany had its worst week|France fell off a cliff/);   // case 11's ticket for this seed
    expect(FIELD_CASES.map((c) => c.n)).toEqual([9, 10]);
    expect(out).toContain("Assessed through the group Website Build, not this game.");
    expect(out).toContain("LO3 · LO1 (partly)");
    expect(out).toContain("Next up");
    expect(out).toContain("Before you start: rate yourself");   // no rating saved yet (no localStorage in tests)
    expect(out).toMatch(/Orders up, revenue down|More orders, less money/);   // case 8's ticket for this seed's variant
  });
  it("the case file, with cases played: skills record, CV lines, learning outcomes", () => {
    const store = { "dd-progress": JSON.stringify({ "paypal-gateway": { first: 4, outOf: 4, confidence: 90 }, "cold-case-2015": { first: 2, outOf: 3, confidence: 90 } }) };
    globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; }, removeItem: (k) => { delete store[k]; } };
    try {
      const out = html(<CaseFile cfg={{ seed: "DD-2026" }} onBack={noop} />);
      for (const s of ["Skills record", "Research and data analysis", "For your CV or an interview", CASES[0].outcomes.cv, "Learning outcomes", "played 2 of 12", "Using this in your assessment", "Well calibrated", "Overconfident",
        "How you rate yourself", "Share your results with your tutor", "DD3|DD-2026|1:4/4@90:-,9:2/3@90:-|S:-/-"]) expect(out, s).toContain(s);
    } finally { delete globalThis.localStorage; }
  });
  it("the case file with nothing played says so, and prints as a report", () => {
    const out = html(<CaseFile onBack={noop} />);
    expect(out).toContain("Your case file");
    expect(out).toContain("Nothing here yet");
    expect(out).toContain('<article class="dd-report"');
  });
});

describe("field-case screens render", () => {
  const reportKeys = ["overview", ...FIELD_REPORTS.flatMap((g) => g.items.map((it) => it.key))];
  const cold = fieldCaseById("cold-case-2015"), xmas = fieldCaseById("christmas-plan-2015");

  it.each(reportKeys)("investigate → %s", (key) => {
    const out = html(<FieldInvestigate def={cold} activeReport={key} openReport={noop} viewed={[]} flags={["ch-referral"]} onToggleFlag={noop} onDiagnose={noop} />);
    expect(out).toContain("Present findings");
  });
  it("case 10 frames its own claim on the overview, and its own calls", () => {
    expect(html(<FieldInvestigate def={xmas} activeReport="overview" openReport={noop} viewed={[]} flags={[]} onToggleFlag={noop} onDiagnose={noop} />)).toContain("top ten products by revenue");
    const guess = { verdict: xmas.verdictTruth, gun: xmas.gunTruth, remedy: xmas.remedyTruth, confidence: 70 };
    expect(html(<FieldDiagnose def={xmas} guess={guess} setGuess={noop} flags={[]} onBack={noop} onSubmit={noop} />)).toContain("HP Care Pack");
    const out = html(<FieldReveal def={xmas} guess={guess} result={scoreFieldDiagnosis(guess, ["pr-21"], xmas)} onAgain={noop} onExit={noop} />);
    expect(out).toContain("CASE 10 — CLOSED");
    expect(out).toContain("What should happen next");
    expect(out).toContain("Service contracts at the top of the revenue ranking");
  });

  // Keyboard access (WCAG 2.1.1 / 4.1.2): sort headers and glossary terms
  // must be real buttons, not click handlers on a <th> or <span>.
  it("sort headers and glossary terms are buttons", () => {
    const report = html(<FieldInvestigate def={cold} activeReport="sourceMedium" openReport={noop} viewed={[]} flags={[]} onToggleFlag={noop} onDiagnose={noop} />);
    expect(report.match(/<th[^>]*><button type="button"/g)).toHaveLength(10); // every Source/Medium column
    const overview = html(<FieldInvestigate def={cold} activeReport="overview" openReport={noop} viewed={[]} flags={[]} onToggleFlag={noop} onDiagnose={noop} />);
    expect(overview).toMatch(/<button type="button" aria-expanded="false"[^>]*>AOV<\/button>/);
  });

  it("diagnose and reveal", () => {
    const guess = { verdict: FIELD_VERDICT_TRUTH, gun: FIELD_GUN_TRUTH, remedy: FIELD_REMEDY_TRUTH };
    const flags = ["ch-referral", "sm-sandbox-paypal-com-referral"];
    expect(html(<FieldDiagnose def={cold} guess={guess} setGuess={noop} flags={flags} onBack={noop} onSubmit={noop} />)).toContain("sandbox.paypal.com");
    const out = html(<FieldReveal def={cold} guess={guess} result={scoreFieldDiagnosis(guess, flags)} flags={flags} onAgain={noop} onExit={noop} />);
    expect(out).toContain("Open your case report (PDF)");
    expect(out).toContain("3/3 calls");
  });
});

describe("the case report renders, ready to save as a PDF", () => {
  it("cases 1–8: title, score, feedback, trail, reflection boxes with printable lines, glossary", () => {
    const cd = generateCase(CASES[0].id, "DD-2026", { variant: 0 });
    const d = { dimension: "device", segment: "mobile", secondary: null, segmentB: null, causeType: "deploy_bug", startDay: 18, confidence: 90 };
    const out = html(<ReportView model={generatedReport({ caseData: cd, cfg: { seed: "DD-2026", noise: 1.4 }, diagnosis: d, result: scoreDiagnosis(d, cd.truth), viewed: ["device"], pivots: [] })} sessionKey="t" onBack={noop} />);
    for (const s of ["Save as PDF", "Case 01:", "At a glance", "The principle to remember", "What to work on next time", "How you investigated", "Reflection", "Words to know", "Not quite",
      "WM956-15 · LO3 · LO1 (partly)", "What this case developed", "Critically evaluate advanced eCommerce functionalities", "For your CV or an interview", "Your reply to Priya", "courses.warwick.ac.uk/modules/2026/WM956-15"]) expect(out, s).toContain(s);
    expect(out.match(/<textarea/g)).toHaveLength(5);   // the reply + four reflection answers
    expect(out.match(/class="dd-print-only"/g).length).toBe(10);   // the name line, the reply, its four check boxes, four answers
    expect(out).toContain("Check your reply");
    expect(out).toContain("What should happen next");
    expect(out).toContain('<article class="dd-report"');
  });
  it("case 9: the clue chain and flagged rows", () => {
    const guess = { verdict: FIELD_VERDICT_TRUTH, gun: FIELD_GUN_TRUTH, remedy: FIELD_REMEDY_TRUTH, confidence: 70 };
    const flags = ["ch-referral"];
    const out = html(<ReportView model={fieldReport({ guess, result: scoreFieldDiagnosis(guess, flags), flags })} sessionKey="t" onBack={noop} />);
    for (const s of ["Case 09:", "The clue chain", "Rows you flagged as evidence (1)", "Referral", "Self-referral"]) expect(out, s).toContain(s);
  });
});
