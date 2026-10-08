import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CASES, REPORTS, TOTAL_DAYS, generateCase, scoreDiagnosis } from "../engine/engine.js";
import {
  FIELD_REPORTS, FIELD_VERDICT_TRUTH, FIELD_GUN_TRUTH, FIELD_REMEDY_TRUTH, scoreFieldDiagnosis,
} from "../engine/fieldcase.js";
import { PlainModeProvider } from "./shared.jsx";
import Investigate from "./generated/Investigate.jsx";
import Diagnose from "./generated/Diagnose.jsx";
import Reveal from "./generated/Reveal.jsx";
import FieldInvestigate from "./field/FieldInvestigate.jsx";
import FieldDiagnose from "./field/FieldDiagnose.jsx";
import FieldReveal from "./field/FieldReveal.jsx";

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

describe("field-case screens render", () => {
  const reportKeys = ["overview", ...FIELD_REPORTS.flatMap((g) => g.items.map((it) => it.key))];

  it.each(reportKeys)("investigate → %s", (key) => {
    const out = html(<FieldInvestigate activeReport={key} openReport={noop} viewed={[]} flags={["ch-referral"]} onToggleFlag={noop} onDiagnose={noop} />);
    expect(out).toContain("Present findings");
  });

  // Keyboard access (WCAG 2.1.1 / 4.1.2): sort headers and glossary terms
  // must be real buttons, not click handlers on a <th> or <span>.
  it("sort headers and glossary terms are buttons", () => {
    const report = html(<FieldInvestigate activeReport="sourceMedium" openReport={noop} viewed={[]} flags={[]} onToggleFlag={noop} onDiagnose={noop} />);
    expect(report.match(/<th[^>]*><button type="button"/g)).toHaveLength(10); // every Source/Medium column
    const overview = html(<FieldInvestigate activeReport="overview" openReport={noop} viewed={[]} flags={[]} onToggleFlag={noop} onDiagnose={noop} />);
    expect(overview).toMatch(/<button type="button" aria-expanded="false"[^>]*>AOV<\/button>/);
  });

  it("diagnose and reveal", () => {
    const guess = { verdict: FIELD_VERDICT_TRUTH, gun: FIELD_GUN_TRUTH, remedy: FIELD_REMEDY_TRUTH };
    const flags = ["ch-referral", "sm-sandbox-paypal-com-referral"];
    expect(html(<FieldDiagnose guess={guess} setGuess={noop} flags={flags} onBack={noop} onSubmit={noop} />)).toContain("sandbox.paypal.com");
    const out = html(<FieldReveal guess={guess} result={scoreFieldDiagnosis(guess, flags)} flags={flags} onAgain={noop} onExit={noop} />);
    expect(out).toContain("Download case report");
    expect(out).toContain("3/3 calls");
  });
});
