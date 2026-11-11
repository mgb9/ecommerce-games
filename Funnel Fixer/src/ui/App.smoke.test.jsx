import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_CFG, initialState, resolveQuarter, previewSingles, leaks, bottleneckOf, buildRecord, NONE } from "../engine/engine.js";
import { PlainModeProvider } from "./shared.jsx";
import App from "./App.jsx";
import InstructorPanel from "./InstructorPanel.jsx";
import { Intro, Diagnose, Allocate, ResultView, EndView } from "./screens.jsx";

// A build won't catch a symbol a screen forgot to import (a runtime
// ReferenceError) — these render every screen directly from props, so it
// fails here instead of in class.
const html = (el) => renderToStaticMarkup(<PlainModeProvider>{el}</PlainModeProvider>);
const noop = () => {};
const cfg = DEFAULT_CFG;
const st0 = initialState(cfg);
const leaks0 = leaks(cfg.rates, cfg.sessions, cfg);

function quarter(state, chosen, pred = { predLeak: "purchase", predBest: "guest" }) {
  const r = resolveQuarter(state, chosen, cfg);
  return { r, rec: buildRecord(state, cfg, { ...pred, chosen }, r), singles: previewSingles(state, cfg) };
}

describe("screens render", () => {
  it("the app mounts on the intro, with no instructor button for students", () => {
    const out = renderToStaticMarkup(<App />);
    expect(out).toContain("Where do you spend");
    expect(out).toContain("Critically evaluate advanced eCommerce functionalities");
    expect(out).not.toContain("Instructor");
  });
  it("the intro shows a first run when there is one", () => {
    const out = html(<Intro onStart={noop} cfg={cfg} progress={{ first: { profit: 120000, leakHits: 2, betHits: 1, quarters: 4 }, best: { profit: 150000 }, runs: 3 }} />);
    expect(out).toContain("£120,000");
    expect(out).toContain("Best of 3 runs");
  });
  it("diagnose: two labelled groups of toggle buttons, a 'none' option in each, the £ leak hidden", () => {
    const out = html(<Diagnose state={st0} cfg={cfg} leaksArr={leaks0} singles={previewSingles(st0, cfg)} predLeak="atc" predBest={null} setPredLeak={noop} setPredBest={noop} onNext={noop} />);
    expect(out.match(/role="group"/g).length).toBe(2);
    expect(out.match(/aria-pressed="true"/g).length).toBe(1);
    expect(out).toContain("None — every stage is at or above its benchmark");
    expect(out).toContain("None — not one of them would earn back its cost");
    expect(out).toContain("Add to cart · strong");
    expect(out).not.toMatch(/leak\/qtr|Money leak £/);
    expect(out).toContain('aria-disabled="true"');
  });
  it("allocate: scores the leak call in words and lets the student spend nothing", () => {
    const out = html(<Allocate state={st0} cfg={cfg} leaksArr={leaks0} bottleneck={bottleneckOf(leaks0)} predLeak="purchase" chosen={[]} toggleChoice={noop} onRun={noop} />);
    expect(out).toContain("Not this time.");
    expect(out).toContain("The stage furthest below benchmark in points is Purchase");
    expect(out).toContain("Spend nothing and run quarter 1");
    expect(out).toContain("Money leak £9.0k a quarter");
  });
  it("allocate with nothing below benchmark says so", () => {
    const c = { ...cfg, rates: { ...cfg.benchmarks } };
    const l = leaks(c.rates, c.sessions, c);
    const out = html(<Allocate state={initialState(c)} cfg={c} leaksArr={l} bottleneck={bottleneckOf(l)} predLeak={NONE} chosen={[]} toggleChoice={noop} onRun={noop} />);
    expect(out).toContain("Right.");
    expect(out).toContain("No stage is below its benchmark");
  });
  it("result: both calls scored in words, each purchase's return in the quarter and over the plan", () => {
    const { r, rec, singles } = quarter(st0, ["payments", "paid"]);
    const out = html(<ResultView result={r} cfg={cfg} record={rec} singles={singles} onNext={noop} lastQuarter={false} />);
    expect(out).toContain("Best alone: Product imagery &amp; video");
    expect(out).toContain("pays back");
    expect(out).toContain("does not pay back");
    expect(out).toContain("each bought customer costs more than they return");
    expect(out).not.toMatch(/NaN|Infinity|undefined/);
  });
  it("result for a quarter with nothing bought", () => {
    const { r, rec, singles } = quarter(st0, []);
    const out = html(<ResultView result={r} cfg={cfg} record={rec} singles={singles} onNext={noop} lastQuarter={true} />);
    expect(out).toContain("You spent nothing this quarter");
    expect(out).toContain("See the debrief");
  });
  it("the debrief: profit against an untouched funnel, charts with text alternatives, the run's own lessons", () => {
    let st = st0; const records = [];
    for (const chosen of [["imagery", "trust"], ["paid"], [], ["shipping"]]) { const q = quarter(st, chosen); records.push(q.rec); st = q.r.newState; }
    const out = html(<EndView records={records} state={st} cfg={cfg} restart={noop} progress={{}} />);
    expect(out).toContain("an untouched funnel would have made");
    expect(out.match(/role="img"/g).length).toBe(2);
    expect(out).toContain("You offered free shipping in quarter 4");
    expect(out).toContain("You held the budget back in quarter 3");
    expect(out).not.toMatch(/NaN|Infinity|undefined/);
  });
  it("the instructor dialog is a labelled modal with labelled sliders", () => {
    const out = html(<InstructorPanel cfg={cfg} setCfg={noop} defaults={cfg} onClose={noop} />);
    expect(out).toContain('role="dialog"');
    expect(out).toContain('aria-valuetext="£15,000"');
  });
});
