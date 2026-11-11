import React, { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_CFG, IMAP, initialState, resolveQuarter, previewSingles, leaks, bottleneckOf, buildRecord, gbpK,
} from "../engine/engine.js";
import { T, GLOBAL_CSS } from "./theme.js";
import { PlainModeProvider, Frame, InstructorButton } from "./shared.jsx";
import { useSessionState } from "./session.js";
import { loadProgress, recordRun } from "./progress.js";
import { instructorMode, urlSeed } from "./urlConfig.js";
import InstructorPanel from "./InstructorPanel.jsx";
import { Intro, Diagnose, Allocate, ResultView, EndView } from "./screens.jsx";

/* Root: which screen is on show and the state behind it, mirrored to the
   tab's session so a refresh resumes where the student was. A quarter's
   result is never stored — `last` keeps the funnel it started from, the
   basket and the settings it ran under, and the result is recomputed from
   them (the engine is seeded, so it comes back identical). Settings
   changed mid-game apply from the next quarter resolved. `nav` counts
   screen changes, so focus moves to each new screen's heading (not on
   first load). */
const VERSION = 1;
const START = { v: VERSION, phase: "intro", state: initialState(DEFAULT_CFG), predLeak: null, predBest: null, chosen: [], last: null, records: [], nav: 0 };
const startCfg = () => { const seed = urlSeed(); return seed ? { ...DEFAULT_CFG, seed } : DEFAULT_CFG; };

export default function App() {
  const [saved, setApp] = useSessionState("app", START);
  const [cfg, setCfg] = useSessionState("cfg", startCfg);
  const [instructor] = useState(() => instructorMode());
  const [showInstructor, setShowInstructor] = useState(false);
  const [progress, setProgress] = useState(loadProgress);
  const app = saved?.v === VERSION ? saved : START;
  const { phase, state, predLeak, predBest, chosen, last, records, nav } = app;
  const go = (patch) => setApp((a) => { const cur = a?.v === VERSION ? a : START; return { ...cur, ...patch, nav: (cur.nav || 0) + 1 }; });
  const set = (patch) => setApp((a) => ({ ...(a?.v === VERSION ? a : START), ...patch }));

  // a cohort link (?seed=NAME) sets the seed whenever no game is under way
  useEffect(() => {
    const seed = urlSeed();
    if (seed && phase === "intro" && cfg.seed !== seed) setCfg((c) => ({ ...c, seed }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const curLeaks = useMemo(() => leaks(state.rates, cfg.sessions, cfg, state.marginCut), [state, cfg]);
  const singles = useMemo(() => previewSingles(state, cfg), [state, cfg]);
  // the quarter just resolved, rebuilt from what it started with
  const result = useMemo(() => (last ? resolveQuarter(last.state, last.chosen, last.cfg) : null), [last]);
  const lastSingles = useMemo(() => (last ? previewSingles(last.state, last.cfg) : []), [last]);

  const start = () => go({ phase: "diagnose", state: initialState(cfg), predLeak: null, predBest: null, chosen: [], last: null, records: [] });
  // works from the latest basket, so two quick presses can't overwrite each other
  const toggleChoice = (id) => setApp((a) => {
    const c = a.chosen;
    if (c.includes(id)) return { ...a, chosen: c.filter((x) => x !== id) };
    const spent = c.reduce((sum, x) => sum + IMAP[x].cost, 0);
    return spent + IMAP[id].cost > cfg.budget ? a : { ...a, chosen: [...c, id] };
  });
  function runQuarter() {
    const r = resolveQuarter(state, chosen, cfg);
    const rec = buildRecord(state, cfg, { predLeak, predBest, chosen }, r);
    go({ phase: "result", last: { state, chosen, cfg }, state: r.newState, records: [...records, rec] });
  }
  function nextQuarter() {
    if (state.quarter > cfg.quarters) {
      setProgress(recordRun({ seed: cfg.seed, quarters: records.length, profit: state.cumProfit, leakHits: records.filter((r) => r.leakCorrect).length, betHits: records.filter((r) => r.roiCorrect).length }));
      go({ phase: "end" });
      return;
    }
    go({ phase: "diagnose", predLeak: null, predBest: null, chosen: [] });
  }
  const restart = () => go({ phase: "intro", last: null, records: [], state: initialState(cfg), predLeak: null, predBest: null, chosen: [] });

  const playing = phase !== "intro";
  const spent = records.reduce((a, r) => a + r.spend, 0);
  const stats = playing ? [
    ["QUARTER", `${Math.min(phase === "result" || phase === "end" ? state.quarter - 1 : state.quarter, cfg.quarters)}/${cfg.quarters}`, T.hdrPlayer],
    ["PROFIT SO FAR", gbpK(state.cumProfit), state.cumProfit >= 0 ? T.hdrPos : T.hdrPlayer],
    ["SPENT", gbpK(spent), T.hdrInstructor],
    ["SEED", cfg.seed, T.hdrMuted],
  ] : [];

  return (
    <PlainModeProvider>
      <div style={{ minHeight: "100vh", background: T.ink, color: T.text, fontFamily: T.body }}>
        <style>{GLOBAL_CSS}</style>
        <Frame screenKey={`${phase}:${state.quarter}`} autoFocus={nav > 0} subtitle="Chrichton · funnel diagnosis" stats={stats}
          actions={instructor && <InstructorButton onClick={() => setShowInstructor(true)} />}>
          {phase === "intro" && <Intro onStart={start} cfg={cfg} progress={progress} />}
          {phase === "diagnose" && <Diagnose state={state} cfg={cfg} leaksArr={curLeaks} singles={singles} predLeak={predLeak} predBest={predBest}
            setPredLeak={(v) => set({ predLeak: v })} setPredBest={(v) => set({ predBest: v })} onNext={() => go({ phase: "allocate" })} />}
          {phase === "allocate" && <Allocate state={state} cfg={cfg} leaksArr={curLeaks} bottleneck={bottleneckOf(curLeaks)} predLeak={predLeak} chosen={chosen} toggleChoice={toggleChoice} onRun={runQuarter} />}
          {phase === "result" && result && records.length > 0 && <ResultView result={result} cfg={last.cfg} record={records[records.length - 1]} singles={lastSingles} onNext={nextQuarter} lastQuarter={state.quarter > cfg.quarters} />}
          {phase === "end" && <EndView records={records} state={state} cfg={cfg} restart={restart} progress={progress} />}
        </Frame>
        {showInstructor && instructor && <InstructorPanel cfg={cfg} setCfg={setCfg} defaults={DEFAULT_CFG} onClose={() => setShowInstructor(false)} />}
      </div>
    </PlainModeProvider>
  );
}
