import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  EXPERIMENTS, DEFAULT_CFG, BANDS, QUIZ, runTest, statAt, effExperiment, trueBand, truthWinner,
  soundCall, matchesTruth, profitPerThousand, clamp,
} from "../engine/engine.js";
import { T, GLOBAL_CSS } from "./theme.js";
import { PlainModeProvider, Frame, InstructorButton, useShellBarOffset, useReducedMotion } from "./shared.jsx";
import { useSessionState, readSession } from "./session.js";
import { loadProgress, recordFirstAttempt, markHubPlayed } from "./progress.js";
import { instructorMode } from "./urlConfig.js";
import InstructorPanel from "./InstructorPanel.jsx";
import Intro from "./Intro.jsx";
import Bench from "./lab/Bench.jsx";
import Running from "./lab/Running.jsx";
import Verdict from "./lab/Verdict.jsx";
import Summary from "./lab/Summary.jsx";
import QuizRound from "./quiz/QuizRound.jsx";
import QuizDone from "./quiz/QuizDone.jsx";
import WireframeStudio from "./wireframe/WireframeStudio.jsx";

/* Root: which screen is on show and the state behind it, mirrored to the
   tab's session so a refresh resumes where the student was. A run is
   never stored — `run` keeps the plan and the settings it was committed
   under, and the run itself is recomputed from them (it is seeded, so
   it comes back identical). Settings changed mid-experiment apply to the
   next run, not to one already under way. `nav` counts screen changes,
   so focus moves to each new screen's heading (not on first load). */
const VERSION = 1;
const freshBench = (i, cfg) => ({
  predWinner: null, predBand: null,
  plannedN: clamp(EXPERIMENTS[i].suggestN, 200, cfg.maxVisitors),
  baseAssume: +(EXPERIMENTS[i].baselineRate * 100).toFixed(1), mdeAssume: 1.0,
});
const START = { v: VERSION, phase: "intro", expIdx: 0, bench: freshBench(0, DEFAULT_CFG), run: null, records: [], qIdx: 0, qResults: [], nav: 0 };
const LAB = ["bench", "running", "verdict", "summary"];
const ANIM_MS = 2800;

export default function App() {
  const [saved, setApp] = useSessionState("app", START);
  const app = saved?.v === VERSION ? saved : START;
  const [cfg, setCfg] = useSessionState("cfg", DEFAULT_CFG);
  const [instructor] = useState(() => instructorMode());
  const [showInstructor, setShowInstructor] = useState(false);
  const [progress, setProgress] = useState(loadProgress);
  const [wfStep, setWfStep] = useState(() => readSession("wireframe")?.step || "brief");
  const reduced = useReducedMotion();
  useShellBarOffset();
  const { phase, expIdx, bench, run, records, qIdx, qResults, nav } = app;
  const go = (patch) => setApp((a) => ({ ...(a?.v === VERSION ? a : START), ...patch, nav: ((a?.v === VERSION ? a : START).nav || 0) + 1 }));
  const setBench = (fn) => setApp((a) => ({ ...a, bench: fn(a.bench) }));

  const base = EXPERIMENTS[expIdx];
  const runCfg = run?.cfg || cfg;
  const exp = useMemo(() => effExperiment(base, runCfg), [base, runCfg]);
  const result = useMemo(() => (run ? runTest(exp, { nPerArm: run.n, alpha: runCfg.alpha, seed: `${runCfg.seed}:${exp.id}` }) : null), [exp, run, runCfg]);
  const total = result ? result.series[result.series.length - 1].n : bench.plannedN;

  // The run plays out over ANIM_MS — driven by elapsed time, so a throttled
  // background tab still lands in the right place. Arriving on a run that
  // was already under way (a refresh) or preferring reduced motion: it is
  // shown complete, at the call bar.
  const [animN, setAnimN] = useState(() => (phase === "running" && run ? Infinity : 0));
  const animKey = useRef(null);
  useEffect(() => {
    if (phase !== "running" || !result) return;
    const key = `${expIdx}:${run.n}:${nav}`;
    if (animKey.current === key) return;
    animKey.current = key;
    if (reduced || animN === Infinity) { setAnimN(total); return; }
    setAnimN(0);
    const t0 = performance.now();
    const id = setInterval(() => {
      const f = Math.min(1, (performance.now() - t0) / ANIM_MS);
      setAnimN(Math.round(total * f));
      if (f >= 1) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [phase, result]); // eslint-disable-line react-hooks/exhaustive-deps
  const shownN = Math.min(animN, total);
  const animComplete = !!result && shownN >= total;
  const liveStat = result ? statAt(result, shownN || result.series[0].n) : null;

  function startArc(i = 0) { go({ phase: "bench", expIdx: i, bench: freshBench(i, cfg), run: null, records: i === 0 ? [] : records }); }
  function commitTest() { animKey.current = null; setAnimN(0); go({ phase: "running", run: { n: bench.plannedN, cfg } }); }
  function callTest(call, { stoppedEarly = false } = {}) {
    const s = statAt(result, stoppedEarly ? shownN : total);
    const early = stoppedEarly && s.n < run.n;
    const truthDiff = exp.truth.pB - exp.truth.pA;
    const mde = bench.mdeAssume / 100;
    const rec = {
      id: exp.id, title: base.title, concept: base.concept,
      predictedWinner: bench.predWinner, predictionCorrect: bench.predWinner === truthWinner(truthDiff),
      predictedBand: BANDS.find((b) => b.id === bench.predBand)?.label || "—", bandCorrect: bench.predBand === trueBand(truthDiff).id,
      plannedN: run.n, actualN: s.n, stoppedEarly: early, mde,
      obsRateA: s.rA, obsRateB: s.rB, obsDiff: s.diff, ciLow: s.ciLow, ciHigh: s.ciHigh,
      pValue: s.pValue, significant: s.significant,
      call, soundCall: soundCall(call, s, { stoppedEarly: early, mde }), matchedTruth: matchesTruth(call, truthDiff),
      trueDiff: truthDiff,
      businessNote: exp.profit ? businessNote(exp, s) : "",
    };
    recordFirstAttempt(exp.id, { ...rec, seed: runCfg.seed });
    setProgress(loadProgress());
    go({ phase: "verdict", records: [...records.filter((x) => x.id !== exp.id), rec] });
  }
  function nextExperiment() {
    if (expIdx + 1 >= EXPERIMENTS.length) { go({ phase: "summary" }); return; }
    go({ phase: "bench", expIdx: expIdx + 1, bench: freshBench(expIdx + 1, cfg), run: null });
  }
  const restart = () => go({ phase: "intro", expIdx: 0, run: null, records: [] });
  const startQuiz = () => go({ phase: "quiz", qIdx: 0, qResults: [] });
  function quizComplete(r) {
    const rs = [...qResults, r];
    if (qIdx + 1 >= QUIZ.length) { markHubPlayed(); go({ phase: "quizdone", qResults: rs }); return; }
    go({ qIdx: qIdx + 1, qResults: rs });
  }

  const isQuiz = phase === "quiz" || phase === "quizdone";
  const isLab = LAB.includes(phase);
  const qScore = qResults.reduce((a, r) => a + r.points, 0);
  const stats = isQuiz
    ? [["SCENARIO", `${Math.min(qIdx + 1, QUIZ.length)}/${QUIZ.length}`, T.hdrPlayer], ["SCORE", `${qScore}`, T.hdrPos]]
    : isLab ? [["EXPERIMENT", `${expIdx + 1}/${EXPERIMENTS.length}`, T.hdrPlayer], ["α", runCfg.alpha.toFixed(2), T.hdrInstructor], ["POWER", `${Math.round(runCfg.power * 100)}%`, T.hdrInstructor], ["SEED", runCfg.seed, T.hdrMuted]]
    : [];
  const subtitle = isQuiz ? "Which Test Won?" : phase === "wireframe" ? "Wireframe Studio" : "Chrichton · A/B testing";
  const record = records.find((r) => r.id === exp.id);

  return (
    <PlainModeProvider>
      <div style={{ minHeight: "100vh", background: T.ink, color: T.text, fontFamily: T.body }}>
        <style>{GLOBAL_CSS}</style>
        <Frame screenKey={`${phase}:${expIdx}:${qIdx}:${phase === "wireframe" ? wfStep : ""}`} autoFocus={nav > 0} subtitle={subtitle} stats={stats}
          actions={instructor && <InstructorButton onClick={() => setShowInstructor(true)} />}>
          {phase === "intro" && <Intro onStart={startArc} onQuiz={startQuiz} onWireframe={() => go({ phase: "wireframe" })} cfg={cfg} progress={progress} />}
          {phase === "wireframe" && <WireframeStudio cfg={cfg} onExit={() => go({ phase: "intro" })} onScreen={setWfStep} />}
          {phase === "quiz" && <QuizRound key={qIdx} item={QUIZ[qIdx]} idx={qIdx} total={QUIZ.length} onComplete={quizComplete} />}
          {phase === "quizdone" && <QuizDone results={qResults} total={QUIZ.length} onReplay={startQuiz} onLab={() => go({ phase: "intro" })} />}
          {phase === "bench" && <Bench exp={exp} base={base} cfg={cfg} bench={bench} setBench={setBench} onCommit={commitTest} />}
          {phase === "running" && result && (
            <Running exp={exp} base={base} cfg={runCfg} result={result} animN={shownN} total={total} liveStat={liveStat} animComplete={animComplete} plannedN={run.n} onCall={callTest} />
          )}
          {phase === "verdict" && result && record && (
            <Verdict exp={exp} base={base} cfg={runCfg} result={result} record={record} onNext={nextExperiment} isLast={expIdx + 1 >= EXPERIMENTS.length} />
          )}
          {phase === "summary" && <Summary records={records} cfg={cfg} restart={restart} />}
        </Frame>
        {showInstructor && instructor && <InstructorPanel cfg={cfg} setCfg={setCfg} defaults={DEFAULT_CFG} onClose={() => setShowInstructor(false)} />}
      </div>
    </PlainModeProvider>
  );
}

function businessNote(exp, s) {
  const pa = profitPerThousand(exp, s.rA, "A");
  const pb = profitPerThousand(exp, s.rB, "B");
  return pb < pa ? `B converts higher but profit/1k £${Math.round(pb)} < £${Math.round(pa)} (A) — net loss` : `B profit/1k £${Math.round(pb)} ≥ £${Math.round(pa)} (A)`;
}
