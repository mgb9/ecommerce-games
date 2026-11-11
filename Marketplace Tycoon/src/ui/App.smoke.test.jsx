import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import App, { ScenarioSelect, SetupSelect, PlayBoard, ResultView, EndView } from "./App.jsx";
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
});
