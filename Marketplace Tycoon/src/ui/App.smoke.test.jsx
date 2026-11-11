import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import App, { ScenarioSelect, SetupSelect, PlayBoard, ResultView, EndView, RateFirst, Intro } from "./App.jsx";
import DecisionLog from "./DecisionLog.jsx";
import InstructorTally from "./InstructorTally.jsx";
import TutorGuide from "./TutorGuide.jsx";
import InstructorPanel from "./InstructorPanel.jsx";
import { runRecord, resultCode, SKILL_STATEMENTS } from "./cohort.js";
import { PlainModeProvider } from "./shared.jsx";
import { DEFAULT_CFG, SCMAP, SCENARIOS, initialStores, makeRng, botDecide, leaderDecisionOf, resolveRound } from "../engine/engine.js";

// The build can't catch an engine symbol the UI references but forgot to
// import — that's a runtime ReferenceError. Rendering each screen from
// props exercises the wiring end-to-end.
const html = (el) => renderToStaticMarkup(<PlainModeProvider>{el}</PlainModeProvider>);
function game(scenarioId, weeks, fulfilId = "inhouse") {
  const cfg = { ...DEFAULT_CFG, scenarioId }; const sc = SCMAP[scenarioId];
  let stores = initialStores("", "woo", fulfilId, cfg.startingCash, sc, cfg.seed);
  const predictionLog = []; let log = [];
  for (let round = 1; round <= weeks; round++) {
    const rng = makeRng(cfg.seed + ":" + round);
    const stats = { lastTotalDemand: stores.reduce((a, s) => a + (s.last ? s.last.demandUnits : sc.demandBase / 5), 0), leaderDecision: leaderDecisionOf(stores) };
    const r = resolveRound(stores.map((s) => (s.isPlayer ? s : { ...s, decision: botDecide(s, stats, round, cfg, rng, sc) })), round, cfg, rng);
    stores = r.stores; log = r.log;
    predictionLog.push({ round, predicted: 2, actual: 3, hit: false });
  }
  const ranked = [...stores].sort((a, b) => b.cumProfit - a.cumProfit);
  return { cfg, stores, ranked, player: stores.find((s) => s.isPlayer), predictionLog, log };
}
const noop = () => {};

describe("screens render", () => {
  it("intro: one h1, honest outcomes, no instructor button for students", () => {
    const out = renderToStaticMarkup(<App />);
    expect(out).toContain("Ten weeks to win");
    expect(out.match(/<h1/g)).toHaveLength(1);
    expect(out).toContain("LO1");
    expect(out).not.toContain("LO4");
    expect(out).not.toContain("Instructor");
  });
  it("brief and setup screens, for every brief", () => {
    expect(html(<ScenarioSelect selected="b2b" setSelected={noop} onNext={noop} onBack={noop} />)).toContain('aria-pressed="true"');
    for (const sc of SCENARIOS) {
      const out = html(<SetupSelect scenario={sc} platform="wix" setPlatform={noop} fulfil="3pl" setFulfil={noop} cfg={{ ...DEFAULT_CFG, scenarioId: sc.id }} onLaunch={noop} onBack={noop} />);
      expect(out).toContain("TOP FIT");
      expect(out).not.toMatch(/undefined|NaN/);
      if (!sc.digital) expect(out).toContain("£2.60"); // 3PL's per-unit cost, not rounded to £3
    }
  });
  it("play, result and end screens, for every brief", () => {
    for (const sc of SCENARIOS) for (const ful of ["inhouse", "dropship"]) {
      const g = game(sc.id, 10, ful);
      const play = html(<PlayBoard stores={g.stores} ranked={g.ranked} round={3} cfg={g.cfg} player={g.player} setPlayerDecision={noop} croDeploy={noop} croTest={noop} sellWeek={noop} prediction={2} setPrediction={noop} />);
      const result = html(<ResultView ranked={g.ranked} log={g.log} round={10} nextWeek={noop} player={g.player} cfg={g.cfg} predictionLog={g.predictionLog} />);
      const end = html(<EndView stores={g.stores} ranked={g.ranked} restart={noop} player={g.player} cfg={g.cfg} predictionLog={g.predictionLog} />);
      for (const out of [play, result, end]) {
        expect(out.match(/<h1/g), sc.id).toHaveLength(1);
        expect(out, sc.id).not.toMatch(/undefined|NaN|Infinity|&lt;Term|£-/);
      }
      expect(play).toContain("Supplier squeeze");
      expect(end).toContain('role="img"');
    }
  });

  it("brief screen says what the brief develops; end screen asks for the recommendation and names the skills", () => {
    for (const sc of SCENARIOS) {
      const brief = html(<ScenarioSelect selected={sc.id} setSelected={noop} onNext={noop} onBack={noop} />);
      expect(brief).toContain(`What the ${sc.short} brief develops`);
      expect(brief).toContain("Demonstrate a comprehensive understanding of the key eCommerce technologies");
      expect(brief).not.toContain("LO4");
      const g = game(sc.id, 10);
      const end = html(<EndView stores={g.stores} ranked={g.ranked} restart={noop} player={g.player} cfg={g.cfg} predictionLog={g.predictionLog} onLog={noop} />);
      expect(end).toContain("Your recommendation to the ");
      expect(end).toContain("Skills you practised");
      expect(end).toContain("Open your decision log");
      expect(end.match(/<h1/g)).toHaveLength(1);
    }
  });
  it("the self-rating screen: one h1, six labelled statements, skippable", () => {
    const out = html(<RateFirst onSave={noop} onSkip={noop} onBack={noop} />);
    expect(out.match(/<h1/g)).toHaveLength(1);
    expect(out.match(/<fieldset/g)).toHaveLength(SKILL_STATEMENTS.length);
    expect(out).toContain("Skip for now");
    expect(out).not.toMatch(/PTES|survey/i);
  });
  it("intro offers the decision log and says what has been played", () => {
    const g = game("b2b", 10);
    const out = html(<Intro name="" setName={noop} onNext={noop} onLog={noop} progress={{ b2b: runRecord(g.stores, g.player, g.cfg, g.predictionLog) }} />);
    expect(out).toContain("Open your decision log");
    expect(out).toContain("1 of 4 client briefs: B2B");
  });
});

describe("decision log, tally and tutor's guide render", () => {
  const progress = {};
  for (const sc of SCENARIOS) { const g = game(sc.id, 10, "dropship"); progress[sc.id] = { ...runRecord(g.stores, g.player, g.cfg, g.predictionLog), seed: g.cfg.seed, at: "2026-11-11" }; }
  progress.fashion.recommendation = { text: "Move to Shopify with in-house fulfilment.", checks: 3 };

  it("an empty log explains itself", () => {
    const out = html(<DecisionLog progress={{}} cfg={DEFAULT_CFG} onBack={noop} />);
    expect(out.match(/<h1/g)).toHaveLength(1);
    expect(out).toContain("Nothing here yet");
    expect(out).toContain("MT1|WMG-2026||S:-/-");
  });
  it("a full log: record, judgement, recommendation, skills, CV lines, outcomes, result code", () => {
    const out = html(<DecisionLog progress={progress} cfg={DEFAULT_CFG} onBack={noop} />);
    expect(out.match(/<h1/g)).toHaveLength(1);
    expect(out).not.toMatch(/undefined|NaN|Infinity|£-/);
    expect(out).toContain("4 of 4 client briefs");
    expect(out).toContain("Move to Shopify with in-house fulfilment.");
    expect(out).toContain("Self-check: 3 of 4 points ticked.");
    expect(out).toContain("Communication");
    expect(out).toContain("(simulated e-commerce marketplace).");
    expect(out).toContain("Not covered by this simulation.");                         // LO2
    expect(out).toContain("Assessed through the group Website Build, not this simulation."); // LO4
    expect(out).toContain("Business Report (70%)");
    expect(out).toContain(resultCode(progress, {}, "WMG-2026").replace(/&/g, "&amp;"));
    expect(out).toContain('scope="col"');
    expect(out).not.toMatch(/PTES|survey/i);
  });
  it("communication is on the skills record only where a recommendation was written", () => {
    const one = html(<DecisionLog progress={{ grocer: progress.grocer }} cfg={DEFAULT_CFG} onBack={noop} />);
    expect(one).not.toContain("your recommendation to");
    expect(one).toContain("you predicted your leaderboard place");
  });
  it("the tally and the tutor's guide", () => {
    const tallyOut = html(<InstructorTally onBack={noop} />);
    expect(tallyOut.match(/<h1/g)).toHaveLength(1);
    expect(tallyOut).toContain("Nothing to tally yet");
    const guide = html(<TutorGuide cfg={DEFAULT_CFG} onBack={noop} />);
    expect(guide.match(/<h1/g)).toHaveLength(1);
    expect(guide).not.toMatch(/undefined|NaN|Infinity/);
    for (const sc of SCENARIOS) expect(guide).toContain(sc.name);
    expect(guide).toContain("Debrief questions");
    expect(guide).toContain("?instructor");
    expect(guide).not.toContain("Your settings differ from the defaults");
    expect(html(<TutorGuide cfg={{ ...DEFAULT_CFG, commissionRate: 0.3 }} onBack={noop} />)).toContain("Your settings differ from the defaults");
  });
  it("the instructor panel links to both staff pages", () => {
    const out = html(<InstructorPanel cfg={DEFAULT_CFG} setCfg={noop} defaults={DEFAULT_CFG} onClose={noop} onOpenPage={noop} />);
    expect(out).toContain("Cohort tally");
    expect(out).toContain("Tutor&#x27;s guide");
  });
  it("Simpler English reaches the rating screen, the end screen and the log", () => {
    const store = { "mt-plain": "1" };
    const real = globalThis.localStorage;
    globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
    try {
      const rate = html(<RateFirst onSave={noop} onSkip={noop} onBack={noop} />);
      expect(rate).toContain("How sure are you that you can…");
      for (const s of SKILL_STATEMENTS) { expect(rate).toContain(s.plain.replace(/'/g, "&#x27;")); expect(rate).not.toContain(s.text.replace(/'/g, "&#x27;")); }
      expect(rate).toContain("Fully confident");
      const g = game("grocer", 10);
      const end = html(<EndView stores={g.stores} ranked={g.ranked} restart={noop} player={g.player} cfg={g.cfg} predictionLog={g.predictionLog} />);
      expect(end).toContain("It uses simple words");
      expect(end).toContain("Unsold goods go bad");
      const log = html(<DecisionLog progress={{ grocer: { ...runRecord(g.stores, g.player, g.cfg, g.predictionLog), seed: g.cfg.seed, at: "2026-11-11" } }} cfg={g.cfg} onBack={noop} />);
      expect(log).toContain("In simpler words:");
      expect(log).toContain("Demonstrate a comprehensive understanding"); // the specification's wording stays
      expect(log).not.toMatch(/undefined|NaN/);
    } finally { globalThis.localStorage = real; }
    expect(html(<RateFirst onSave={noop} onSkip={noop} onBack={noop} />)).toContain("How confident are you that you can…");
  });
});
