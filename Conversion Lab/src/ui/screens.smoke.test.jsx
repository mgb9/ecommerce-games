import { describe, it, expect, afterEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EXPERIMENTS, QUIZ, DEFAULT_CFG, BANDS, effExperiment, runTest, statAt, soundCall, matchesTruth, truthWinner, trueBand } from "../engine/engine.js";
import { PlainModeProvider } from "./shared.jsx";
import Intro from "./Intro.jsx";
import Bench from "./lab/Bench.jsx";
import Running from "./lab/Running.jsx";
import Verdict from "./lab/Verdict.jsx";
import Summary from "./lab/Summary.jsx";
import QuizRound from "./quiz/QuizRound.jsx";
import QuizDone from "./quiz/QuizDone.jsx";
import WireframeStudio from "./wireframe/WireframeStudio.jsx";
import InstructorPanel from "./InstructorPanel.jsx";
import App from "./App.jsx";
import ExperimentLog from "./ExperimentLog.jsx";
import InstructorTally from "./InstructorTally.jsx";
import TutorGuide from "./TutorGuide.jsx";
import SkillsRating from "./SkillsRating.jsx";
import Recommendation from "./lab/Recommendation.jsx";
import { resultCode } from "./cohort.js";

// A build won't catch a symbol a screen forgot to import (a runtime
// ReferenceError) — these render every screen directly from props, so it
// fails here instead of in class.
const html = (el) => renderToStaticMarkup(<PlainModeProvider>{el}</PlainModeProvider>);
const noop = () => {};
const cfg = DEFAULT_CFG;

function recordFor(base, call = "b", { n = 3000, stoppedEarly = false } = {}) {
  const exp = effExperiment(base, cfg);
  const result = runTest(exp, { nPerArm: n, seed: `${cfg.seed}:${exp.id}` });
  const s = statAt(result, n);
  const d = exp.truth.pB - exp.truth.pA;
  return { exp, result, record: {
    id: exp.id, title: base.title, concept: base.concept, predictedWinner: "b", predictionCorrect: truthWinner(d) === "b",
    predictedBand: BANDS[3].label, bandCorrect: trueBand(d).id === "bmod", plannedN: n, actualN: s.n, stoppedEarly, mde: 0.01,
    obsRateA: s.rA, obsRateB: s.rB, obsDiff: s.diff, ciLow: s.ciLow, ciHigh: s.ciHigh, pValue: s.pValue, significant: s.significant,
    call, soundCall: soundCall(call, s, { stoppedEarly, mde: 0.01 }), matchedTruth: matchesTruth(call, d), trueDiff: d, businessNote: "",
  } };
}

describe("lab screens render", () => {
  it("the intro: three modes, eight experiments, the outcomes as visible text, no 'real, documented' claim", () => {
    const out = html(<Intro onStart={noop} onQuiz={noop} onWireframe={noop} cfg={cfg} progress={{ cta: { soundCall: true, matchedTruth: null } }} />);
    expect(out).toContain("Prove it with data");
    expect(out.match(/<li/g).length).toBeGreaterThanOrEqual(2 + EXPERIMENTS.length);
    expect(out).toContain("Critically evaluate advanced eCommerce functionalities");
    expect(out).toContain("1 of 8 done");
    expect(out).toContain("matched the truth");
    expect(out).not.toMatch(/Real e-commerce|documented/);
  });
  it("the bench: labelled groups of toggle buttons, a labelled slider and steppers", () => {
    const base = EXPERIMENTS[0];
    const bench = { predWinner: "b", predBand: null, plannedN: 5000, baseAssume: 4, mdeAssume: 1 };
    const out = html(<Bench exp={effExperiment(base, cfg)} base={base} cfg={cfg} bench={bench} setBench={noop} onCommit={noop} />);
    expect(out.match(/role="group"/g).length).toBeGreaterThanOrEqual(4);
    expect(out).toContain('aria-pressed="true"');
    expect(out).toContain('aria-valuetext="5,000 visitors per arm"');
    expect(out).toContain("Decrease minimum detectable effect");
    expect(out).toMatch(/<h1[^>]*>The “Add to cart” button<\/h1>/);
  });
  it("the run: charts are described images, the legend is visible, the stop button appears only with peeking", () => {
    const base = EXPERIMENTS[3];
    const { exp, result } = recordFor(base);
    const live = statAt(result, 1500);
    const props = { exp, base, result, animN: 1500, total: 3000, liveStat: live, animComplete: false, plannedN: 3000, onCall: noop };
    const plain = html(<Running {...props} cfg={cfg} />);
    expect(plain.match(/role="img"/g)).toHaveLength(2);
    expect(plain).toContain("A · Control");
    expect(plain).not.toContain("Stop and call it now");
    expect(html(<Running {...props} cfg={{ ...cfg, peeking: true }} />)).toContain("Stop and call it now");
    expect(html(<Running {...props} animN={3000} liveStat={statAt(result, 3000)} animComplete cfg={cfg} />)).toContain("Need more data");
  });
  for (const base of EXPERIMENTS) {
    it(`the verdict renders for ${base.id}: four scorecards and a lesson for this run`, () => {
      const { exp, result, record } = recordFor(base, "more");
      const out = html(<Verdict exp={exp} base={base} cfg={cfg} result={result} record={record} onNext={noop} isLast={false} />);
      for (const t of ["Predicted winner", "Effect-size band", "Sound call — on the evidence", "Matched the truth"]) expect(out).toContain(t);
      expect(out).toContain("not scored");   // "need more data" makes no claim
      expect(out).toMatch(/[Yy]our run/);
      expect(out).not.toMatch(/undefined|NaN/);
      if (base.replicate) expect(out).toContain("If 200 teams ran this exact test");
      if (base.guardrail) expect(out).toMatch(/Guardrail.*\(your run\)/);
      if (base.segments) expect(out).toContain('scope="row"');
    });
  }
  it("an early stop that names a winner is scored not sound", () => {
    const base = EXPERIMENTS[1];
    const { exp, result, record } = recordFor(base, "b", { stoppedEarly: true });
    expect(record.soundCall).toBe(false);
    expect(html(<Verdict exp={exp} base={base} cfg={cfg} result={result} record={record} onNext={noop} />)).toContain("You stopped before your planned sample");
  });
  it("the summary: both judgements per experiment, the CI level follows α", () => {
    const records = EXPERIMENTS.map((b) => recordFor(b, "b").record);
    const out = html(<Summary records={records} cfg={{ ...cfg, alpha: 0.1 }} restart={noop} />);
    expect(out).toContain("90% CI");
    expect(out).toContain("Matched truth?");
    expect(out.match(/scope="row"/g)).toHaveLength(EXPERIMENTS.length);
  });
});

describe("quiz screens render", () => {
  it("a scenario asks for direction, size and confidence as labelled groups", () => {
    const out = html(<QuizRound item={QUIZ[0]} idx={0} total={QUIZ.length} onComplete={noop} />);
    expect(out).toContain("SCENARIO 1 / 11");
    expect(out.match(/role="group"/g)).toHaveLength(3);
    expect(out).toContain("relative");
  });
  it("the round's end screen says what the scenarios are", () => {
    const results = QUIZ.map(() => ({ dirOk: true, magOk: false, mechOk: true, wager: 2, points: 3 }));
    expect(html(<QuizDone results={results} total={QUIZ.length} onReplay={noop} onLab={noop} />)).toContain("not reports of particular tests");
  });
});

describe("wireframe and instructor render", () => {
  afterEach(() => { delete globalThis.sessionStorage; });
  const withSession = (wf) => {
    const store = { "cl-session:wireframe": JSON.stringify(wf) };
    globalThis.sessionStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  };
  const steps = { brief: "Design for the", build: "Build the page", hypothesis: "Commit your hypothesis", test: "Your scorecard" };
  for (const [step, text] of Object.entries(steps)) {
    it(`the studio's ${step} step renders (restored from the session)`, () => {
      withSession({ briefId: "b2b", layout: ["image", "title", "price", "desc", "atc", "shipping"], step, hypo: { metric: "rev", band: "none", plannedN: 3000 } });
      const out = html(<WireframeStudio cfg={cfg} onExit={noop} />);
      expect(out).toContain(text);
      if (step === "test") expect(out).toMatch(/\+0\.00pp against the current page/);   // the control, unchanged, is a 0pp design
    });
  }
  it("the instructor panel is a labelled modal dialog with a keyboard-operable peeking switch", () => {
    const out = html(<InstructorPanel cfg={cfg} setCfg={noop} defaults={cfg} onClose={noop} />);
    expect(out).toContain('role="dialog"');
    expect(out).toContain('aria-modal="true"');
    expect(out).toContain('role="switch"');
    expect(out).toContain('aria-checked="false"');
    expect(out).toContain('aria-label="Close"');
  });
});

describe("the app: saved progress and instructor gating", () => {
  const store = {};
  const install = () => {
    for (const k of Object.keys(store)) delete store[k];
    const mk = () => ({ getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } });
    globalThis.sessionStorage = mk();
    globalThis.localStorage = mk();
  };
  afterEach(() => { delete globalThis.sessionStorage; delete globalThis.localStorage; delete globalThis.location; });
  it("students get no instructor button; ?instructor shows it and is remembered", () => {
    install();
    globalThis.location = { search: "" };
    expect(renderToStaticMarkup(<App />)).not.toContain("Instructor controls");
    globalThis.location = { search: "?instructor" };
    expect(renderToStaticMarkup(<App />)).toContain("Instructor controls");
    globalThis.location = { search: "" };
    expect(renderToStaticMarkup(<App />)).toContain("Instructor controls");
    globalThis.location = { search: "?instructor=off" };
    expect(renderToStaticMarkup(<App />)).not.toContain("Instructor controls");
  });
  it("a refresh mid-run resumes on the completed run, at the call bar", () => {
    install();
    store["cl-session:app"] = JSON.stringify({ v: 1, phase: "running", expIdx: 2, bench: { predWinner: "b", predBand: "bsmall", plannedN: 6000, baseAssume: 4.5, mdeAssume: 1 }, run: { n: 6000, cfg: DEFAULT_CFG }, records: [], qIdx: 0, qResults: [], nav: 3 });
    const out = renderToStaticMarkup(<App />);
    expect(out).toContain("Running — “Only 3 left” scarcity badge");
    expect(out).toContain("12,000 / 12,000 visitors");
    expect(out).toContain("Need more data");
  });
  it("a refresh on the bench keeps the student's predictions", () => {
    install();
    store["cl-session:app"] = JSON.stringify({ v: 1, phase: "bench", expIdx: 0, bench: { predWinner: "a", predBand: "bmod", plannedN: 4200, baseAssume: 4, mdeAssume: 1.2 }, run: null, records: [], qIdx: 0, qResults: [], nav: 1 });
    const out = renderToStaticMarkup(<App />);
    expect(out).toContain('aria-valuetext="4,200 visitors per arm"');
    expect(out).toContain("1.2pp");
  });
  it("an old saved record is ignored", () => {
    install();
    store["cl-session:app"] = JSON.stringify({ phase: "verdict", expIdx: 5 });
    expect(renderToStaticMarkup(<App />)).toContain("Prove it with data");
  });
});

describe("skills, the experiment log and the instructor pages render", () => {
  const prog = {
    cta: { title: "The “Add to cart” button", predictedWinner: "b", predictionCorrect: true, predictedBand: "B wins — moderate (+1–3pp)", bandCorrect: true, plannedN: 5000, actualN: 5000, obsDiff: 0.012, call: "b", soundCall: true, matchedTruth: true, seed: "LAB-2026-24", recommendation: { text: "Ship the green button: it lifted conversion.", checks: 3 } },
    imgbg: { predictedWinner: "none", predictionCorrect: true, predictedBand: "No real difference", bandCorrect: true, plannedN: 4000, actualN: 4000, obsDiff: 0.001, call: "more", soundCall: true, matchedTruth: null, seed: "LAB-2026-24" },
    quiz: { points: 18, max: 55 },
  };
  it("the log: first attempts, judgement summary, recommendations, skills record, CV lines, outcomes, result code", () => {
    const out = html(<ExperimentLog progress={prog} cfg={cfg} onBack={noop} />);
    for (const t of ["Your experiment log", "Experiment by experiment", "How your judgement held up", "Your recommendations", "Ship the green button", "Skills record", "For your CV or an interview", "Learning outcomes", "Using this in your assessment", "How you rate yourself", "Your result code", "Which Test Won?"]) expect(out, t).toContain(t);
    expect(out).toContain('class="cl-report"');
    expect(out).toContain("CL1|LAB-2026-24|1:1111:r3,2:111n|Q:18/55");
    expect(out.match(/scope="row"/g).length).toBe(2);
    expect(out).toContain("Assessed through the group Website Build");
  });
  it("an empty log says what will fill it", () => {
    expect(html(<ExperimentLog progress={{}} cfg={cfg} onBack={noop} />)).toContain("Nothing here yet");
  });
  it("the tally renders empty, and the self-rating has six labelled groups of five", () => {
    expect(html(<InstructorTally onBack={noop} />)).toContain("Nothing to tally yet");
    const form = html(<SkillsRating title="Rate" intro="x" onSave={noop} onSkip={noop} />);
    expect(form.match(/<fieldset/g)).toHaveLength(6);
    expect(form.match(/type="radio"/g)).toHaveLength(30);
  });
  it("the tutor's guide covers every experiment, the quiz answers and the studio, for the current seed", () => {
    const out = html(<TutorGuide cfg={cfg} onBack={noop} />);
    expect(out).toContain("Running Conversion Lab with a cohort");
    expect(out.match(/Debrief questions/g)).toHaveLength(EXPERIMENTS.length + 2);
    expect(out).toContain(`On seed ${cfg.seed} at the suggested size`);
    expect(out).toContain("Which Test Won? · the answers");
    expect(out).toContain("A first seminar");
    expect(out).not.toMatch(/undefined|NaN/);
  });
  it("the recommendation task: a labelled box and four labelled checks", () => {
    const out = html(<Recommendation expId="cta" teamName="the design team" />);
    expect(out).toContain("Your recommendation to the design team");
    expect(out.match(/type="checkbox"/g)).toHaveLength(4);
    expect(out).toContain("<legend");
  });
});

describe("the app: skills rating, the log and instructor pages", () => {
  const store = {};
  const install = () => {
    for (const k of Object.keys(store)) delete store[k];
    const mk = () => ({ getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } });
    globalThis.sessionStorage = mk(); globalThis.localStorage = mk();
  };
  afterEach(() => { delete globalThis.sessionStorage; delete globalThis.localStorage; delete globalThis.location; });
  it("a first visit asks for the before-rating; once answered (or skipped) it doesn't", () => {
    install(); globalThis.location = { search: "" };
    expect(renderToStaticMarkup(<App />)).toContain("Before you start: how do you rate yourself?");
    store["cl-skills"] = JSON.stringify({ before: null });
    expect(renderToStaticMarkup(<App />)).not.toContain("Before you start");
  });
  it("students are sent back from a saved instructor page; the log is theirs", () => {
    install(); globalThis.location = { search: "" };
    store["cl-session:app"] = JSON.stringify({ v: 1, phase: "guide", back: "intro", expIdx: 0, bench: { predWinner: null, predBand: null, plannedN: 5000, baseAssume: 4, mdeAssume: 1 }, run: null, records: [], qIdx: 0, qResults: [], nav: 2 });
    const out = renderToStaticMarkup(<App />);
    expect(out).toContain("Prove it with data");
    expect(out).not.toContain("Tutor's guide");
    store["cl-session:app"] = JSON.stringify({ v: 1, phase: "log", back: "intro", expIdx: 0, bench: { predWinner: null, predBand: null, plannedN: 5000, baseAssume: 4, mdeAssume: 1 }, run: null, records: [], qIdx: 0, qResults: [], nav: 2 });
    expect(renderToStaticMarkup(<App />)).toContain("Your experiment log");
  });
});
