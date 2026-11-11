import React, { Suspense, lazy, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_CFG, IMAP, initialState, resolveQuarter, previewSingles, leaks, bottleneckOf, buildRecord, buildDebrief, purchasesFor, gbpK,
} from "../engine/engine.js";
import { T, GLOBAL_CSS } from "./theme.js";
import { PlainModeProvider, Frame, InstructorButton } from "./shared.jsx";
import { useSessionState } from "./session.js";
import { loadProgress, loadSkills, saveSkills, recordRun, summariseRun } from "./progress.js";
import { instructorMode, urlSeed } from "./urlConfig.js";
import InstructorPanel from "./InstructorPanel.jsx";
import { Intro, Diagnose, Allocate, ResultView, EndView, BeforeYouStart } from "./screens.jsx";
import DiagnosisLog from "./DiagnosisLog.jsx";

// Instructor-only pages, loaded when opened.
const InstructorTally = lazy(() => import("./InstructorTally.jsx"));
const TutorGuide = lazy(() => import("./TutorGuide.jsx"));
const PAGES = ["log", "tally", "guide"];
const STAFF_PAGES = ["tally", "guide"];

/* Root: which screen is on show and the state behind it, mirrored to the
   tab's session so a refresh resumes where the student was. A quarter's
   result is never stored — `last` keeps the funnel it started from, the
   basket and the settings it ran under, and the result is recomputed from
   them (the engine is seeded, so it comes back identical). Settings
   changed mid-game apply from the next quarter resolved. `nav` counts
   screen changes, so focus moves to each new screen's heading (not on
   first load). The diagnosis log, the cohort tally and the tutor's guide
   are pages opened over the game: `back` is the screen to return to. A
   refresh never lands a student on an instructor page. */
const VERSION = 1;
const START = { v: VERSION, phase: "intro", state: initialState(DEFAULT_CFG), predLeak: null, predBest: null, chosen: [], last: null, records: [], nav: 0, back: null };
const startCfg = () => { const seed = urlSeed(); return seed ? { ...DEFAULT_CFG, seed } : DEFAULT_CFG; };

export default function App() {
  const [saved, setApp] = useSessionState("app", START);
  const [cfg, setCfg] = useSessionState("cfg", startCfg);
  const [instructor] = useState(() => instructorMode());
  const [showInstructor, setShowInstructor] = useState(false);
  const [progress, setProgress] = useState(loadProgress);
  const restored = saved?.v === VERSION ? saved : START;
  const app = STAFF_PAGES.includes(restored.phase) && !instructor ? { ...restored, phase: restored.back || "intro" } : restored;
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

  const openPage = (page) => { setProgress(loadProgress()); go({ phase: page, back: PAGES.includes(phase) ? app.back : phase }); };
  const closePage = () => { setProgress(loadProgress()); go({ phase: app.back || "intro", back: null }); };
  // the skills self-rating is asked once, before the first game (it can be skipped)
  const start = () => (("before" in loadSkills()) ? begin() : go({ phase: "rate" }));
  const rated = (ratings) => { saveSkills(ratings ? { before: ratings, beforeAt: new Date().toISOString().slice(0, 10) } : { before: null }); begin(); };
  const begin = () => go({ phase: "diagnose", state: initialState(cfg), predLeak: null, predBest: null, chosen: [], last: null, records: [] });
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
      const untouched = purchasesFor(cfg.rates, cfg.sessions) * cfg.aov * cfg.margin * records.length;
      setProgress(recordRun(summariseRun({ seed: cfg.seed, records, profit: state.cumProfit, untouched, cards: buildDebrief(records, cfg) })));
      go({ phase: "end" });
      return;
    }
    go({ phase: "diagnose", predLeak: null, predBest: null, chosen: [] });
  }
  const restart = () => go({ phase: "intro", last: null, records: [], state: initialState(cfg), predLeak: null, predBest: null, chosen: [] });

  const playing = !["intro", "rate", ...PAGES].includes(phase);
  const subtitle = phase === "log" ? "Diagnosis log" : phase === "tally" ? "Instructor · cohort tally" : phase === "guide" ? "Instructor · tutor's guide" : "Chrichton · funnel diagnosis";
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
        <Frame screenKey={`${phase}:${state.quarter}`} autoFocus={nav > 0} subtitle={subtitle} stats={stats}
          actions={instructor && <InstructorButton onClick={() => setShowInstructor(true)} />}>
          {phase === "intro" && <Intro onStart={start} onLog={() => openPage("log")} cfg={cfg} progress={progress} />}
          {phase === "rate" && <BeforeYouStart onSave={rated} onSkip={() => rated(null)} />}
          {phase === "diagnose" && <Diagnose state={state} cfg={cfg} leaksArr={curLeaks} singles={singles} predLeak={predLeak} predBest={predBest}
            setPredLeak={(v) => set({ predLeak: v })} setPredBest={(v) => set({ predBest: v })} onNext={() => go({ phase: "allocate" })} />}
          {phase === "allocate" && <Allocate state={state} cfg={cfg} leaksArr={curLeaks} bottleneck={bottleneckOf(curLeaks)} predLeak={predLeak} chosen={chosen} toggleChoice={toggleChoice} onRun={runQuarter} />}
          {phase === "result" && result && records.length > 0 && <ResultView result={result} cfg={last.cfg} record={records[records.length - 1]} singles={lastSingles} onNext={nextQuarter} lastQuarter={state.quarter > cfg.quarters} />}
          {phase === "end" && <EndView records={records} state={state} cfg={cfg} restart={restart} progress={progress} onLog={() => openPage("log")} />}
          {phase === "log" && <DiagnosisLog progress={progress} onBack={closePage} />}
          {phase === "tally" && instructor && <Suspense fallback={<p role="status">Opening the tally…</p>}><InstructorTally onBack={closePage} /></Suspense>}
          {phase === "guide" && instructor && <Suspense fallback={<p role="status">Opening the tutor's guide…</p>}><TutorGuide cfg={cfg} onBack={closePage} /></Suspense>}
        </Frame>
        {showInstructor && instructor && <InstructorPanel cfg={cfg} setCfg={setCfg} defaults={DEFAULT_CFG} onClose={() => setShowInstructor(false)} onOpenPage={(page) => { setShowInstructor(false); openPage(page); }} />}
      </div>
    </PlainModeProvider>
  );
}
