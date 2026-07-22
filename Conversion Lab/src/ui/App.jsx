import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  EXPERIMENTS, DEFAULT_CFG, GLOSSARY, BANDS, QUIZ, QDIR, QMAG, CRO_STACK, runTest, statAt, effExperiment,
  requiredSampleSize, trueBand, callCorrect, profitPerThousand, guardrailPerThousand,
  buildCSV, buildMarkdown, downloadFile, gbp, pct, pp, clamp,
} from "../engine/engine.js";
import {
  PALETTE, PMAP, NUDGES, BRIEFS, BMAP, LOAD_BUDGET, CONTROL_LAYOUT,
  reviewLayout, layoutToExperiment,
} from "../engine/wireframe.js";

const metricOf = (exp) => exp.metricLabel || "conversion rate";

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');
`;
const T = {
  ink: "#14110D", panel: "#1F1A13", panel2: "#272015", border: "#3A3022",
  text: "#F0E9DC", muted: "#A99E8B", pos: "#7DCB6A", neg: "#E2654E", amber: "#E6B450",
  player: "#F2A93B", instructor: "#C9A06A",
  armA: "#9B8Fb0", armB: "#3FB6A8", sel: "#2A2113", track: "#332a1d", faint: "#8f887d", onAccent: "#1a1206",
  display: "'Bricolage Grotesque', sans-serif", body: "'Hanken Grotesk', sans-serif", mono: "'JetBrains Mono', monospace",
};
const PLAYER = T.player;

/* ---- ESL glossary tooltip (Tycoon pattern) ------------------ */
function Term({ term, children }) {
  const [open, setOpen] = useState(false);
  const def = GLOSSARY[term];
  if (!def) return <span>{children}</span>;
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }} style={{ borderBottom: `1px dotted ${T.muted}`, cursor: "help" }}>{children}</span>
      {open && (
        <span onClick={(e) => e.stopPropagation()} style={{ position: "absolute", bottom: "135%", left: 0, zIndex: 60, width: 230, fontWeight: 400,
          background: "#0F0C08", border: `1px solid ${T.instructor}66`, borderRadius: 8, padding: "9px 11px", fontSize: 11.5, color: T.text, lineHeight: 1.5, boxShadow: "0 10px 28px #000a", fontFamily: T.body }}>{def}</span>
      )}
    </span>
  );
}
function TermsHint() {
  return (
    <div style={{ marginTop: 16, fontSize: 12.5, color: T.muted, display: "flex", alignItems: "center", gap: 7 }}>
      <span style={{ fontSize: 14 }}>💡</span>
      <span>Tip: any word with a <span style={{ borderBottom: `1px dotted ${T.muted}` }}>dotted underline</span> is clickable — tap it for a plain-English definition.</span>
    </div>
  );
}
// Plain-language mode — a "Simpler English" toggle that swaps stylised flavour
// strings for literal ones for the ESL portion of the cohort.
const PlainCtx = React.createContext(false);
function PT({ rich, plain }) { return React.useContext(PlainCtx) ? plain : rich; }
function usePlainMode() {
  const [plain, setPlain] = useState(() => { try { return localStorage.getItem("cl-plain") === "1"; } catch { return false; } });
  const toggle = () => setPlain((v) => { const nv = !v; try { localStorage.setItem("cl-plain", nv ? "1" : "0"); } catch {} return nv; });
  return [plain, toggle];
}
/* ---- LEARNING-OUTCOME BADGES (⑦) ---------------------------- */
const LOS = {
  LO1: { title: "Technology → solution", full: "LO1 — Select appropriate technologies and turn them into a solution for specific e-commerce use-cases." },
  LO2: { title: "Design patterns & implementation", full: "LO2 — Apply design patterns and best practice, and implement the solution." },
  LO3: { title: "Enhance UX & conversion", full: "LO3 — Evaluate functionalities to enhance user experience and conversions." },
  LO4: { title: "Collaborative analysis & build", full: "LO4 — Collaboratively analyse, and build a live e-commerce site." },
};
function LOBadges({ los }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 18 }}>
      <span style={{ fontSize: 11, color: T.muted, fontFamily: T.mono, letterSpacing: 1 }}>🎓 WM956-15</span>
      {los.map((k) => (
        <span key={k} title={LOS[k].full}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 999, padding: "3px 10px 3px 8px", fontSize: 12, cursor: "help", whiteSpace: "nowrap" }}>
          <b style={{ color: T.amber, fontFamily: T.mono, fontWeight: 700 }}>{k}</b>
          <span style={{ color: T.muted }}>{LOS[k].title}</span>
        </span>
      ))}
    </div>
  );
}
function PlainToggle({ plain, toggle }) {
  return (
    <button onClick={toggle} title="Switch to simpler English" style={{ background: plain ? T.instructor : T.panel2, border: `1px solid ${plain ? T.instructor : T.border}`, color: plain ? T.onAccent : T.muted, borderRadius: 9, padding: "7px 10px", cursor: "pointer", fontFamily: T.body, fontWeight: 600, fontSize: 12.5, display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{ fontSize: 14 }}>🗣️</span> Simpler English
    </button>
  );
}

export default function App() {
  const [phase, setPhase] = useState("intro");
  const [cfg, setCfg] = useState(DEFAULT_CFG);
  const [showInstructor, setShowInstructor] = useState(false);
  const [plain, togglePlain] = usePlainMode();
  const [expIdx, setExpIdx] = useState(0);

  // per-experiment working state
  const [predWinner, setPredWinner] = useState(null);   // "a" | "b" | "none"
  const [predBand, setPredBand] = useState(null);        // BANDS id
  const [plannedN, setPlannedN] = useState(2000);
  const [baseAssume, setBaseAssume] = useState(4.5);     // calculator inputs (%, pp)
  const [mdeAssume, setMdeAssume] = useState(1.0);
  const [result, setResult] = useState(null);
  const [animN, setAnimN] = useState(0);                 // visitors revealed so far
  const [decisionN, setDecisionN] = useState(null);
  const [call, setCall] = useState(null);                // "a"|"b"|"none"|"more"
  const [records, setRecords] = useState([]);

  // "Which Test Won?" round
  const [qIdx, setQIdx] = useState(0);
  const [qResults, setQResults] = useState([]);
  const qScore = qResults.reduce((a, r) => a + r.points, 0);

  function startQuiz() { setQIdx(0); setQResults([]); setPhase("quiz"); }
  function quizComplete(result) {
    setQResults((rs) => [...rs, result]);
    if (qIdx + 1 >= QUIZ.length) { setPhase("quizdone"); return; }
    setQIdx((i) => i + 1);
  }

  const exp = useMemo(() => effExperiment(EXPERIMENTS[expIdx], cfg), [expIdx, cfg]);

  function startArc() { setExpIdx(0); setRecords([]); loadExperiment(0); setPhase("bench"); }
  function loadExperiment(i) {
    const base = EXPERIMENTS[i];
    setPredWinner(null); setPredBand(null); setCall(null); setResult(null);
    setAnimN(0); setDecisionN(null);
    setPlannedN(clamp(base.suggestN, 200, cfg.maxVisitors));
    setBaseAssume(+(base.baselineRate * 100).toFixed(1));
    setMdeAssume(1.0);
  }

  function commitTest() {
    const r = runTest(exp, { nPerArm: plannedN, alpha: cfg.alpha, seed: `${cfg.seed}:${exp.id}` });
    setResult(r); setAnimN(0); setDecisionN(null); setCall(null);
    setPhase("running");
  }

  // animate the run over a fixed wall-clock duration. Driving animN from
  // elapsed time (not a fixed per-tick step) means a throttled/backgrounded
  // tab — where setInterval fires rarely — still lands at the right place on
  // the next tick instead of freezing the student mid-test.
  useEffect(() => {
    if (phase !== "running" || !result) return;
    const total = result.series[result.series.length - 1].n;
    const DURATION = 2800;
    const t0 = performance.now();
    const id = setInterval(() => {
      const f = Math.min(1, (performance.now() - t0) / DURATION);
      setAnimN(Math.round(total * f));
      if (f >= 1) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [phase, result]);

  const total = result ? result.series[result.series.length - 1].n : plannedN;
  const animComplete = result && animN >= total;
  const liveStat = result ? statAt(result, animN || result.series[0].n) : null;

  function callTest(decision) {
    const dN = animN || total;
    setDecisionN(dN); setCall(decision);
    const s = statAt(result, dN);
    const base = EXPERIMENTS[expIdx];
    const truthDiff = exp.truth.pB - exp.truth.pA;
    const tBand = trueBand(s.diff); // band judged on what they SAW
    const rec = {
      id: exp.id, title: base.title, concept: base.concept,
      predictedWinner: predWinner, predictedBand: BANDS.find((b) => b.id === predBand)?.label || "—",
      bandCorrect: predBand === trueBand(truthDiff).id,
      plannedN, actualN: s.n,
      obsRateA: s.rA, obsRateB: s.rB, obsDiff: s.diff, ciLow: s.ciLow, ciHigh: s.ciHigh,
      pValue: s.pValue, significant: s.significant,
      call: decision, callCorrect: callCorrect(decision, s, truthDiff),
      trueDiff: truthDiff,
      businessNote: exp.profit ? businessNote(exp, s) : "",
    };
    setRecords((prev) => [...prev.filter((x) => x.id !== exp.id), rec]);
    setPhase("verdict");
  }

  function nextExperiment() {
    if (expIdx + 1 >= EXPERIMENTS.length) { setPhase("summary"); return; }
    const ni = expIdx + 1; setExpIdx(ni); loadExperiment(ni); setPhase("bench");
  }
  function restart() { setRecords([]); setExpIdx(0); setPhase("intro"); }

  return (
   <PlainCtx.Provider value={plain}>
    <div style={{ minHeight: "100vh", background: T.ink, color: T.text, fontFamily: T.body }}>
      <style>{FONT_IMPORT + `
        * { box-sizing: border-box; }
        input[type=range]{ -webkit-appearance:none; appearance:none; height:6px; border-radius:6px; background:${T.track}; outline:none; }
        input[type=range]::-webkit-slider-thumb{ -webkit-appearance:none; appearance:none; width:20px; height:20px; border-radius:50%;
          cursor:pointer; background:var(--accent); border:2px solid #14110D; box-shadow:0 0 0 3px var(--accent-soft); }
        input[type=range]::-moz-range-thumb{ width:18px; height:18px; border-radius:50%; cursor:pointer; background:var(--accent); border:2px solid #14110D; }
        @keyframes rise { from{opacity:0; transform:translateY(10px)} to{opacity:1; transform:none} }
        @keyframes slideIn { from{transform:translateX(100%)} to{transform:none} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.55} }
        .rise{ animation:rise .5s cubic-bezier(.2,.7,.3,1) both; }
        .recharts-cartesian-axis-tick text{ fill:${T.muted}; font-family:${T.mono}; font-size:11px; }
      `}</style>

      <Header phase={phase} expIdx={expIdx} cfg={cfg} qIdx={qIdx} qScore={qScore} plain={plain} togglePlain={togglePlain} onToggleInstructor={() => setShowInstructor((v) => !v)} />

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 20px 64px" }}>
        {phase === "intro" && <Intro onStart={startArc} onQuiz={startQuiz} onWireframe={() => setPhase("wireframe")} cfg={cfg} />}
        {phase === "wireframe" && <WireframeStudio cfg={cfg} onExit={() => setPhase("intro")} />}
        {phase === "quiz" && <QuizRound key={qIdx} item={QUIZ[qIdx]} idx={qIdx} total={QUIZ.length} onComplete={quizComplete} />}
        {phase === "quizdone" && <QuizDone results={qResults} total={QUIZ.length} onReplay={startQuiz} onLab={() => setPhase("intro")} />}
        {phase === "bench" && (
          <Bench exp={exp} base={EXPERIMENTS[expIdx]} cfg={cfg}
            predWinner={predWinner} setPredWinner={setPredWinner} predBand={predBand} setPredBand={setPredBand}
            plannedN={plannedN} setPlannedN={setPlannedN}
            baseAssume={baseAssume} setBaseAssume={setBaseAssume} mdeAssume={mdeAssume} setMdeAssume={setMdeAssume}
            onCommit={commitTest} />
        )}
        {phase === "running" && result && (
          <Running exp={exp} base={EXPERIMENTS[expIdx]} cfg={cfg} result={result} animN={animN} total={total}
            liveStat={liveStat} animComplete={animComplete} plannedN={plannedN} onCall={callTest} />
        )}
        {phase === "verdict" && result && (
          <Verdict exp={exp} base={EXPERIMENTS[expIdx]} cfg={cfg} result={result} decisionN={decisionN}
            record={records.find((r) => r.id === exp.id)} predBand={predBand} call={call}
            onNext={nextExperiment} isLast={expIdx + 1 >= EXPERIMENTS.length} />
        )}
        {phase === "summary" && <Summary records={records} cfg={cfg} restart={restart} />}
      </div>

      {showInstructor && <InstructorPanel cfg={cfg} setCfg={setCfg} defaults={DEFAULT_CFG} onClose={() => setShowInstructor(false)} />}
    </div>
   </PlainCtx.Provider>
  );
}

/* ---- HEADER ------------------------------------------------- */
function Header({ phase, expIdx, cfg, qIdx, qScore, plain, togglePlain, onToggleInstructor }) {
  const isQuiz = phase === "quiz" || phase === "quizdone";
  const isWireframe = phase === "wireframe";
  const isLab = phase !== "intro" && !isQuiz && !isWireframe;
  return (
    <div style={{ borderBottom: `1px solid ${T.border}`, background: "#17130D", position: "sticky", top: 0, zIndex: 30 }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={{ fontFamily: T.display, fontWeight: 800, fontSize: 22, letterSpacing: -0.5 }}>Conversion <span style={{ color: PLAYER }}>Lab</span></span>
          <span style={{ color: T.muted, fontSize: 13, fontFamily: T.mono }}>{isQuiz ? "Which Test Won?" : "Chrichton · A/B testing simulator"}</span>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center", fontFamily: T.mono, fontSize: 13 }}>
          {isQuiz && <Stat label="QUESTION" value={`${Math.min(qIdx + 1, QUIZ.length)}/${QUIZ.length}`} accent={PLAYER} />}
          {isQuiz && <Stat label="SCORE" value={`${qScore}`} accent={T.pos} />}
          {isLab && <Stat label="EXPERIMENT" value={`${expIdx + 1}/${EXPERIMENTS.length}`} accent={PLAYER} />}
          {isLab && <Stat label="α" value={cfg.alpha.toFixed(2)} accent={T.instructor} />}
          {isLab && <Stat label="POWER" value={`${Math.round(cfg.power * 100)}%`} accent={T.instructor} />}
          {isLab && <Stat label="SEED" value={cfg.seed} accent={T.muted} />}
          <PlainToggle plain={plain} toggle={togglePlain} />
          <button onClick={onToggleInstructor} title="Instructor controls" style={{ background: T.panel2, border: `1px solid ${T.border}`, color: T.instructor, borderRadius: 9, padding: "7px 11px", cursor: "pointer", fontFamily: T.body, fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 15 }}>⚙</span> Instructor
          </button>
        </div>
      </div>
    </div>
  );
}
function Stat({ label, value, accent }) {
  return <div style={{ textAlign: "right" }}><div style={{ color: T.muted, fontSize: 10, letterSpacing: 1 }}>{label}</div><div style={{ color: accent || T.text, fontWeight: 700, fontSize: 15 }}>{value}</div></div>;
}

/* ---- INTRO -------------------------------------------------- */
function Intro({ onStart, onQuiz, onWireframe, cfg }) {
  return (
    <div className="rise" style={{ maxWidth: 760, margin: "44px auto 0" }}>
      <h1 style={{ fontFamily: T.display, fontWeight: 800, fontSize: 46, lineHeight: 1.05, letterSpacing: -1, margin: 0 }}>
        <PT rich={<>Two versions of a page.<br /><span style={{ color: PLAYER }}>Only the data decides.</span></>}
            plain={<>Two versions of one web page.<br /><span style={{ color: PLAYER }}>Let the data decide which is better.</span></>} />
      </h1>
      <p style={{ color: T.muted, fontSize: 16, lineHeight: 1.6, marginTop: 18 }}>
        You're running conversion experiments for <b style={{ color: T.text }}>Chrichton</b>, a garden retailer. For each test you'll
        see two variants of a real page, <b style={{ color: T.text }}>predict</b> which converts better and by how much, commit a{" "}
        <Term term="samplesize">sample size</Term>, then watch visitors stream in and the <Term term="significance">significance</Term>{" "}
        verdict resolve with real statistical noise. The lesson lives in the gap between what you <i>predicted</i> and what the data <i>shows</i>.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginTop: 22 }}>
        {[
          ["①", "Predict", "Pick a winner, an effect-size band, and a sample size — before any data."],
          ["②", "Run", "Visitors split 50/50; watch rates wobble and the p-value cross the line."],
          ["③", "Call it", "Winner, no difference, or need more data?"],
          ["④", "Reveal", "The hidden truth, whether you were right, and which bias fooled you."],
        ].map(([n, t, d]) => (
          <div key={t} style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: "13px 14px" }}>
            <div style={{ color: PLAYER, fontFamily: T.mono, fontSize: 13 }}>{n}</div>
            <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 15, margin: "3px 0 4px" }}>{t}</div>
            <div style={{ color: T.muted, fontSize: 12, lineHeight: 1.45 }}>{d}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 24, flexWrap: "wrap" }}>
        <button onClick={onStart} style={btn(PLAYER)}>Enter the lab →</button>
        <button onClick={onWireframe} style={{ ...btn("transparent"), color: T.text, border: `1px solid ${T.border}` }}>🎨 Wireframe studio →</button>
        <button onClick={onQuiz} style={{ ...btn("transparent"), color: T.text, border: `1px solid ${T.border}` }}>Which Test Won? quiz →</button>
        <span style={{ color: T.muted, fontSize: 13 }}>{EXPERIMENTS.length} experiments · seed <b style={{ color: T.text, fontFamily: T.mono }}>{cfg.seed}</b></span>
      </div>
      <LOBadges los={["LO2", "LO3"]} />
      <TermsHint />

      <div style={{ marginTop: 30 }}>
        <div style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: 1.5, color: T.muted, marginBottom: 10 }}>BUILT ON THE CRO STACK</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
          {CRO_STACK.map((s, i) => (
            <div key={s.k} style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                <span style={{ width: 20, height: 20, borderRadius: 20, background: T.instructor, color: T.onAccent, fontFamily: T.mono, fontWeight: 700, fontSize: 11, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                <span style={{ fontFamily: T.display, fontWeight: 700, fontSize: 14 }}>{s.k}</span>
              </div>
              <div style={{ color: T.muted, fontSize: 11.5, lineHeight: 1.4 }}>{s.d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---- WIREFRAME STUDIO (LO2 — context → design → hypothesis → test) ----- */
const ROLE_TAG = {
  essential: { t: "essential", c: T.player }, trust: { t: "trust", c: T.armB },
  social: { t: "social proof", c: T.armB }, urgency: { t: "urgency", c: T.amber },
  info: { t: "info", c: T.muted }, crosssell: { t: "cross-sell", c: T.muted }, media: { t: "media", c: T.muted },
};
const CHECK_ICON = { pass: "✓", partial: "~", fail: "✕" };
const CHECK_COL = { pass: T.pos, partial: T.amber, fail: T.neg };
const GRADE_COL = { A: T.pos, B: T.pos, C: T.amber, D: T.neg, E: T.neg };
// which primary metric each brief really wants (AOV matters for high-value / upsell briefs)
const BRIEF_METRIC = { flash: "conv", b2b: "rev", returning: "rev" };
const METRICS = [
  { id: "conv", label: "Conversion rate", hint: "Share of visitors who buy. Right when order value is uniform." },
  { id: "rev", label: "Revenue per visitor", hint: "Conversion × order value — captures AOV, upsell and mix, not just count." },
];

function WFBlock({ c, onUp, onDown, onRemove, canUp, canDown }) {
  const r = ROLE_TAG[c.role];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 9, padding: "8px 10px" }}>
      <span style={{ fontSize: 18 }}>{c.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{c.label}</div>
        <div style={{ fontSize: 10.5, color: r.c, fontFamily: T.mono, letterSpacing: 0.5 }}>{r.t} · {c.wt}ms</div>
      </div>
      <div style={{ display: "flex", gap: 3 }}>
        <button onClick={onUp} disabled={!canUp} title="Move up" style={arrowBtn(canUp)}>↑</button>
        <button onClick={onDown} disabled={!canDown} title="Move down" style={arrowBtn(canDown)}>↓</button>
        <button onClick={onRemove} title="Remove" style={{ ...arrowBtn(true), color: T.neg }}>✕</button>
      </div>
    </div>
  );
}
const arrowBtn = (on) => ({ background: "transparent", border: `1px solid ${T.border}`, color: on ? T.text : T.faint, borderRadius: 7, width: 26, height: 26, cursor: on ? "pointer" : "default", fontSize: 13, lineHeight: 1, display: "inline-flex", alignItems: "center", justifyContent: "center" });
const loadCol = (ms) => (ms <= LOAD_BUDGET ? T.pos : ms <= LOAD_BUDGET + 800 ? T.amber : T.neg);

// The control the student's design is A/B-tested against — shown so a
// relative effect prediction isn't a blind guess. (Its OWN rate is known;
// only the STUDENT's design rate stays hidden until the test runs.)
function ControlPageRef({ brief, compact }) {
  return (
    <div style={{ background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 11, padding: compact ? "10px 12px" : "12px 14px", marginBottom: compact ? 12 : 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        <span style={{ fontFamily: T.mono, fontSize: 10.5, letterSpacing: 1, color: T.muted }}>THE CURRENT PAGE · your control</span>
        <span style={{ fontSize: 12, color: T.muted }}>converts at <b style={{ color: T.text, fontFamily: T.mono }}>{pct(brief.base)}</b> on this brief</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {CONTROL_LAYOUT.map((id) => (
          <span key={id} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 7, padding: "3px 8px", fontSize: 11.5 }}>
            <span>{PMAP[id].icon}</span><span style={{ color: T.muted }}>{PMAP[id].label}</span>
          </span>
        ))}
      </div>
      {!compact && <div style={{ fontSize: 11.5, color: T.faint, marginTop: 8, lineHeight: 1.4 }}>Your predicted effect is your design vs this page. Its rate is known; only your design's rate is hidden until you test.</div>}
    </div>
  );
}

function WireframeStudio({ cfg, onExit }) {
  const [briefId, setBriefId] = useState(null);
  const [layout, setLayout] = useState(["image", "title", "price", "atc"]);
  const [step, setStep] = useState("brief");        // brief | build | hypothesis | test
  const [hypo, setHypo] = useState({ metric: null, band: null, plannedN: 4000 });
  const [payload, setPayload] = useState(null);      // { res, exp, review, hypo }
  const brief = briefId ? BMAP[briefId] : null;
  const review = useMemo(() => (brief ? reviewLayout(layout, brief) : null), [layout, brief]);
  const inLayout = (id) => layout.includes(id);

  const add = (id) => setLayout((l) => (l.includes(id) ? l : [...l, id]));
  const remove = (id) => setLayout((l) => l.filter((x) => x !== id));
  const swap = (i, j) => setLayout((l) => { if (j < 0 || j >= l.length) return l; const n = [...l]; [n[i], n[j]] = [n[j], n[i]]; return n; });

  function runTheTest() {
    const exp = layoutToExperiment(layout, brief, review);
    const res = runTest(exp, { nPerArm: hypo.plannedN, alpha: cfg.alpha, seed: `${cfg.seed}:wireframe:${brief.id}` });
    setPayload({ res, exp, review, hypo, brief });
    setStep("test");
  }

  const backBtn = <button onClick={onExit} style={{ ...btn("transparent"), color: T.muted, border: `1px solid ${T.border}`, padding: "7px 13px", fontSize: 13 }}>← Back to the lab</button>;

  /* ---- STEP 1: pick the page context ---- */
  if (step === "brief") {
    return (
      <div className="rise" style={{ maxWidth: 900, margin: "26px auto 0" }}>
        {backBtn}
        <h1 style={{ fontFamily: T.display, fontWeight: 800, fontSize: 34, letterSpacing: -0.7, margin: "14px 0 4px" }}>
          <PT rich={<>Design for the <span style={{ color: PLAYER }}>context</span>, not the template.</>}
              plain={<>Design for the <span style={{ color: PLAYER }}>audience</span>, not a fixed template.</>} />
        </h1>
        <p style={{ color: T.muted, fontSize: 14.5, lineHeight: 1.55, margin: "0 0 20px", maxWidth: 720 }}>
          There is no universal “best” product page. Pick the brief you're designing for — the audience, device mix and
          buying mindset change which components help, which hurt, and how much a slow page costs you.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 12 }}>
          {BRIEFS.map((b) => (
            <button key={b.id} onClick={() => { setBriefId(b.id); setStep("build"); }}
              style={{ textAlign: "left", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, cursor: "pointer", color: T.text }}>
              <div style={{ fontSize: 26 }}>{b.icon}</div>
              <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 16, margin: "6px 0 5px" }}>{b.name}</div>
              <p style={{ color: T.muted, fontSize: 12.5, lineHeight: 1.45, margin: 0, minHeight: 54 }}>{b.audience}</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                <MiniTag label={`${Math.round(b.mobileShare * 100)}% mobile`} />
                <MiniTag label={`base ${pct(b.base)}`} />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === "test" && payload) return <WireframeVerdict {...payload} cfg={cfg} onRefine={() => setStep("build")} onNewBrief={() => { setStep("brief"); setBriefId(null); }} onExit={onExit} />;

  /* ---- STEP 3: hypothesis gate ---- */
  if (step === "hypothesis") {
    const reqN = requiredSampleSize(brief.base, 0.01, cfg.alpha, cfg.power);
    const ready = hypo.metric && hypo.band;
    return (
      <div className="rise" style={{ maxWidth: 760, margin: "26px auto 0" }}>
        <button onClick={() => setStep("build")} style={{ ...btn("transparent"), color: T.muted, border: `1px solid ${T.border}`, padding: "7px 13px", fontSize: 13 }}>← Edit the design</button>
        <h1 style={{ fontFamily: T.display, fontWeight: 800, fontSize: 30, letterSpacing: -0.6, margin: "14px 0 4px" }}>Commit your hypothesis</h1>
        <p style={{ color: T.muted, fontSize: 14, lineHeight: 1.55, margin: "0 0 18px" }}>
          A design is a hypothesis. Before you see any data, commit what you're measuring, how big an effect you expect,
          and how much traffic you'll spend — then the test is an honest verdict, not a fishing trip. <b style={{ color: T.text }}>The predicted rate stays hidden until you run it.</b>
        </p>

        <ControlPageRef brief={brief} />

        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: 15, marginBottom: 14 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>1 · Primary metric — what will you judge the winner on?</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {METRICS.map((m) => (
              <button key={m.id} onClick={() => setHypo((h) => ({ ...h, metric: m.id }))} style={{ ...pillBtn(hypo.metric === m.id), textAlign: "left", padding: "10px 12px" }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{m.label}</div>
                <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.35, marginTop: 3 }}>{m.hint}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: 15, marginBottom: 14 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>2 · Predicted effect — where does your design land vs the current page?</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {BANDS.map((b) => (
              <button key={b.id} onClick={() => setHypo((h) => ({ ...h, band: b.id }))} style={{ ...pillBtn(hypo.band === b.id), textAlign: "left", padding: "9px 12px", fontSize: 13 }}>{b.label}</button>
            ))}
          </div>
        </div>

        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: 15, marginBottom: 16 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>3 · Sample size — visitors per arm</div>
          <div style={{ fontSize: 11.5, color: T.muted, marginBottom: 9 }}>
            At this brief's {pct(brief.base)} base, detecting a <b style={{ color: T.text }}>+1pp</b> lift at {Math.round(cfg.power * 100)}% power needs ~<b style={{ color: T.amber }}>{reqN.toLocaleString("en-GB")}</b>/arm. Under-power it and a real win won't reach significance.
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[1000, 3000, 8000, 20000].map((n) => (
              <button key={n} onClick={() => setHypo((h) => ({ ...h, plannedN: n }))} style={{ ...pillBtn(hypo.plannedN === n), padding: "8px 14px", fontFamily: T.mono, fontSize: 13 }}>{n.toLocaleString("en-GB")}</button>
            ))}
          </div>
        </div>

        <button onClick={runTheTest} disabled={!ready} style={{ ...btn(ready ? PLAYER : T.panel2), opacity: ready ? 1 : 0.6, cursor: ready ? "pointer" : "default", color: ready ? T.onAccent : T.muted }}>
          {ready ? "Run the A/B test →" : "Choose a metric and a predicted effect"}
        </button>
      </div>
    );
  }

  /* ---- STEP 2: build ---- */
  return (
    <div className="rise" style={{ maxWidth: 1080, margin: "22px auto 0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <button onClick={() => { setStep("brief"); setBriefId(null); }} style={{ ...btn("transparent"), color: T.muted, border: `1px solid ${T.border}`, padding: "7px 13px", fontSize: 13 }}>← Change brief</button>
        <div style={{ fontSize: 13, color: T.muted }}>Designing: <b style={{ color: T.text }}>{brief.icon} {brief.name}</b> · {Math.round(brief.mobileShare * 100)}% mobile</div>
      </div>
      <p style={{ color: T.muted, fontSize: 13.5, lineHeight: 1.5, margin: "12px 0 16px", maxWidth: 780 }}>
        {brief.audience} Only the first <b style={{ color: T.text }}>{review.fold} blocks</b> are seen before scrolling here, and this
        audience is {brief.speedSens >= 1.4 ? "unforgiving about slow pages" : brief.speedSens <= 1 ? "fairly patient with load time" : "moderately sensitive to load time"}.
      </p>

      <ControlPageRef brief={brief} compact />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(210px,1fr) minmax(230px,1.05fr) minmax(250px,1.25fr)", gap: 16, alignItems: "start" }}>
        {/* PALETTE */}
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 14 }}>
          <div style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: 1.2, color: T.muted, marginBottom: 10 }}>COMPONENTS · weight in ms</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {PALETTE.map((c) => {
              const used = inLayout(c.id);
              return (
                <button key={c.id} onClick={() => (used ? remove(c.id) : add(c.id))} title={c.desc}
                  style={{ display: "flex", alignItems: "center", gap: 9, textAlign: "left", background: used ? T.sel : "transparent", border: `1px solid ${used ? T.player : T.border}`, borderRadius: 9, padding: "8px 10px", cursor: "pointer", color: T.text, opacity: used ? 1 : 0.9 }}>
                  <span style={{ fontSize: 17 }}>{c.icon}</span>
                  <span style={{ flex: 1, fontSize: 12.5, lineHeight: 1.2 }}>{c.label}</span>
                  <span style={{ fontFamily: T.mono, fontSize: 10, color: c.wt >= 200 ? T.amber : T.faint }}>{c.wt}</span>
                  <span style={{ color: used ? T.player : T.muted, fontSize: 15, fontWeight: 700 }}>{used ? "−" : "+"}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* CANVAS */}
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 14 }}>
          <div style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: 1.2, color: T.muted, marginBottom: 10 }}>YOUR PAGE (top → bottom)</div>
          {layout.length === 0 && <div style={{ color: T.muted, fontSize: 13, padding: "20px 4px" }}>Add components from the left to start building.</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {layout.map((id, i) => (
              <React.Fragment key={id}>
                <WFBlock c={PMAP[id]} onUp={() => swap(i, i - 1)} onDown={() => swap(i, i + 1)} onRemove={() => remove(id)} canUp={i > 0} canDown={i < layout.length - 1} />
                {i === review.fold - 1 && i < layout.length - 1 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "1px 0" }}>
                    <div style={{ flex: 1, borderTop: `1px dashed ${T.faint}` }} />
                    <span style={{ fontFamily: T.mono, fontSize: 9.5, color: T.faint, letterSpacing: 1 }}>FOLD</span>
                    <div style={{ flex: 1, borderTop: `1px dashed ${T.faint}` }} />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* DESIGN REVIEW */}
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 14, position: "sticky", top: 78 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: 1.2, color: T.muted }}>DESIGN REVIEW</span>
            <span style={{ width: 30, height: 30, borderRadius: 8, background: GRADE_COL[review.grade], color: T.onAccent, fontFamily: T.display, fontWeight: 800, fontSize: 17, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{review.grade}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 10 }}>
            <span style={{ color: T.muted }}>Est. load time</span>
            <span style={{ fontFamily: T.mono, fontWeight: 700, color: loadCol(review.loadMs) }}>{review.loadMs}ms {review.loadMs > LOAD_BUDGET ? "⚠" : ""}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {review.checks.map((c) => (
              <div key={c.id} style={{ display: "flex", gap: 8 }} title={c.tip}>
                <span style={{ color: CHECK_COL[c.state], fontWeight: 800, fontSize: 13, width: 12, flexShrink: 0 }}>{CHECK_ICON[c.state]}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: c.state === "fail" ? T.text : T.muted }}>{c.label}</div>
                  <div style={{ fontSize: 11, color: T.faint, lineHeight: 1.35 }}>{c.tip}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10.5, color: T.faint, textAlign: "center", margin: "10px 0 6px" }}>Predicted conversion is hidden — you'll commit your own estimate next.</div>
          <button onClick={() => setStep("hypothesis")} disabled={!review.buyable}
            style={{ ...btn(review.buyable ? PLAYER : T.panel2), width: "100%", padding: "12px 0", opacity: review.buyable ? 1 : 0.6, cursor: review.buyable ? "pointer" : "default", color: review.buyable ? T.onAccent : T.muted }}>
            {review.buyable ? "Set your hypothesis →" : "Add the missing essentials first"}
          </button>
        </div>
      </div>
    </div>
  );
}

function WireframeVerdict({ res, exp, review, hypo, brief, cfg, onRefine, onNewBrief, onExit }) {
  const sig = res.significant;
  const better = res.diff > 0;
  const trueDiff = review.rate - brief.base;
  const tBand = trueBand(trueDiff);
  const bandOk = hypo.band === tBand.id;
  const metricOk = hypo.metric === BRIEF_METRIC[brief.id];
  const underpowered = !sig && Math.abs(trueDiff) >= 0.01;   // a real effect the test missed
  const headline = !sig ? "Inconclusive" : better ? "Significant win" : "Significant loss";
  const hCol = !sig ? T.amber : better ? T.pos : T.neg;
  return (
    <div className="rise" style={{ maxWidth: 840, margin: "28px auto 0" }}>
      <div style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: 1.5, color: T.muted, marginBottom: 6 }}>WIREFRAME · {brief.name.toUpperCase()}</div>
      <h1 style={{ fontFamily: T.display, fontWeight: 800, fontSize: 32, letterSpacing: -0.6, margin: "0 0 12px", color: hCol }}>{headline}</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 16 }}>
        <MiniStat label="Current page" value={pct(res.arms.A.rate)} accent={T.armA} />
        <MiniStat label="Your design" value={pct(res.arms.B.rate)} accent={T.armB} />
        <MiniStat label="Observed diff" value={pp(res.diff)} accent={better ? T.pos : T.neg} />
        <MiniStat label={`p (n=${hypo.plannedN.toLocaleString("en-GB")})`} value={res.pValue < 0.001 ? "<0.001" : res.pValue.toFixed(3)} accent={sig ? T.pos : T.amber} />
      </div>

      {/* calibration scorecards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10, marginBottom: 16 }}>
        <WFScore ok={bandOk} title="Effect-size prediction"
          you={BANDS.find((b) => b.id === hypo.band)?.label} truth={tBand.label} />
        <WFScore ok={metricOk} title="Primary metric"
          you={METRICS.find((m) => m.id === hypo.metric)?.label} truth={METRICS.find((m) => m.id === BRIEF_METRIC[brief.id])?.label} />
        <WFScore ok={!underpowered} title="Statistical power" neutral={!underpowered && !sig}
          you={`${hypo.plannedN.toLocaleString("en-GB")}/arm`} truth={underpowered ? "under-powered" : sig ? "adequate" : "no real effect to find"} />
      </div>

      <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 16, fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
        The design's true conversion was <b style={{ color: T.text }}>{pct(review.rate)}</b> ({pp(trueDiff)} vs the {pct(brief.base)} current page) — a{" "}
        <b style={{ color: T.text }}>{tBand.label.toLowerCase()}</b> effect.{" "}
        {metricOk ? `Revenue-per-visitor was the right lens for a ${brief.short || brief.name.toLowerCase()} brief.` : brief.id === "flash" ? "For a low-value impulse sale, conversion rate is the right primary metric — revenue-per-visitor adds noise here." : `For this brief, order value varies enough that revenue per visitor — not raw conversion — is the metric that should decide it.`}{" "}
        {underpowered ? `Your test was under-powered: a real ${tBand.label.toLowerCase()} effect existed but ${hypo.plannedN.toLocaleString("en-GB")}/arm couldn't resolve it from noise. Significance failing is not the same as “no effect”.`
          : sig ? "You committed enough traffic to resolve the effect from noise." : "There was no real effect to find here — the honest verdict is “no difference”, not a hunt for one."}
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button onClick={onRefine} style={btn(PLAYER)}>← Refine the design</button>
        <button onClick={onNewBrief} style={{ ...btn("transparent"), color: T.text, border: `1px solid ${T.border}` }}>Try another brief</button>
        <button onClick={onExit} style={{ ...btn("transparent"), color: T.muted, border: `1px solid ${T.border}` }}>Back to the lab</button>
      </div>
    </div>
  );
}
function WFScore({ ok, neutral, title, you, truth }) {
  const c = neutral ? T.muted : ok ? T.pos : T.neg;
  return (
    <div style={{ background: T.panel, border: `1px solid ${c}55`, borderRadius: 11, padding: "11px 13px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
        <span style={{ color: c, fontWeight: 800 }}>{neutral ? "•" : ok ? "✓" : "✕"}</span>
        <span style={{ fontSize: 12, fontWeight: 700 }}>{title}</span>
      </div>
      <div style={{ fontSize: 11.5, color: T.muted }}>You: <b style={{ color: T.text }}>{you || "—"}</b></div>
      {!ok && !neutral && <div style={{ fontSize: 11.5, color: T.muted }}>Actual: <b style={{ color: T.text }}>{truth}</b></div>}
    </div>
  );
}
function MiniStat({ label, value, accent }) {
  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ color: T.muted, fontSize: 11, letterSpacing: 0.5, marginBottom: 3 }}>{label}</div>
      <div style={{ color: accent, fontFamily: T.mono, fontWeight: 700, fontSize: 22 }}>{value}</div>
    </div>
  );
}
function MiniTag({ label }) {
  return <span style={{ fontFamily: T.mono, fontSize: 10.5, color: T.muted, border: `1px solid ${T.border}`, borderRadius: 6, padding: "2px 7px" }}>{label}</span>;
}

/* ---- MOCK CHRICHTON PAGES ----------------------------------- */
function MockPage({ kind, variant }) {
  const isB = variant === "B";
  const frame = { background: "#FBF7EF", color: "#23201A", borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden", fontFamily: T.body, position: "relative" };
  const priceRow = <div style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "0 14px" }}><span style={{ fontFamily: T.display, fontWeight: 800, fontSize: 20 }}>£24.99</span><span style={{ color: "#8a8270", fontSize: 12, textDecoration: "line-through" }}>£32.00</span></div>;
  const title = <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 15, padding: "10px 14px 4px" }}>Heritage Terracotta Planter</div>;
  const banner = (text, bg) => <div style={{ background: bg, color: "#1c1a14", fontSize: 11.5, fontWeight: 700, textAlign: "center", padding: "6px 0", letterSpacing: 0.2 }}>{text}</div>;

  const heroBox = (label, bg) => <div style={{ height: 120, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>{label}</div>;
  const cta = (color, textColor) => <div style={{ margin: "10px 14px 14px", background: color, color: textColor, textAlign: "center", padding: "11px 0", borderRadius: 9, fontWeight: 700, fontSize: 14 }}>Add to cart</div>;

  let body;
  if (kind === "cta") {
    body = <>{title}{priceRow}{heroBox("🪴", "#EDE6D6")}{isB ? cta("#2E9E5B", "#fff") : cta("#C9C3B4", "#4a463c")}</>;
  } else if (kind === "imgbg") {
    body = <>{title}{priceRow}{heroBox("🪴", isB ? "#F3E7CE" : "#FFFFFF")}<div style={{ color: "#8a8270", fontSize: 10.5, padding: "0 14px 2px", textAlign: "center" }}>{isB ? "warm off-white" : "white"} background</div>{cta("#2E9E5B", "#fff")}</>;
  } else if (kind === "scarcity") {
    body = <>{title}{priceRow}{isB && <div style={{ margin: "8px 14px 0", display: "inline-block", background: "#F3D9CE", color: "#9c3a1c", fontSize: 11.5, fontWeight: 700, padding: "4px 9px", borderRadius: 6 }}>🔥 Only 3 left in stock</div>}{heroBox("🪴", "#EDE6D6")}{cta("#2E9E5B", "#fff")}</>;
  } else if (kind === "social") {
    body = <>{title}{priceRow}{isB && <div style={{ padding: "6px 14px 0", color: "#3a7d4f", fontSize: 12, fontWeight: 600 }}>👥 327 gardeners bought this</div>}{heroBox("🪴", "#EDE6D6")}{cta("#2E9E5B", "#fff")}</>;
  } else if (kind === "shipping") {
    body = <>{isB && banner("🚚 FREE shipping on all orders", "#F6C667")}{title}{priceRow}{heroBox("🪴", "#EDE6D6")}{!isB && <div style={{ color: "#8a8270", fontSize: 11.5, padding: "0 14px" }}>+ £3.50 shipping</div>}{cta("#2E9E5B", "#fff")}</>;
  } else if (kind === "checkout") {
    const steps = isB
      ? <div style={{ padding: "12px 14px", fontSize: 12, color: "#4a463c" }}><b>One-page checkout</b><div style={{ marginTop: 6, display: "grid", gap: 5 }}>{["Email & delivery", "Payment", "Place order"].map((s) => <div key={s} style={{ background: "#EDE6D6", borderRadius: 6, padding: "6px 8px" }}>{s}</div>)}</div></div>
      : <div style={{ padding: "12px 14px", fontSize: 12, color: "#4a463c" }}><b>Step 1 of 3</b><div style={{ marginTop: 6, display: "flex", gap: 5 }}>{[1, 2, 3].map((s) => <div key={s} style={{ flex: 1, background: s === 1 ? "#C9C3B4" : "#EDE6D6", borderRadius: 6, padding: "10px 0", textAlign: "center" }}>{s}</div>)}</div><div style={{ marginTop: 8, background: "#EDE6D6", borderRadius: 6, padding: "8px" }}>Your details</div></div>;
    body = <>{title}{priceRow}{steps}{cta("#2E9E5B", "#fff")}</>;
  } else if (kind === "promo") {
    body = isB
      ? <>{banner("🔥 SPRING SALE — up to 30% OFF", "#F6C667")}<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, padding: "10px 14px" }}>{["🪴", "🌷", "🌿"].map((e, i) => <div key={i} style={{ background: "#EDE6D6", borderRadius: 6, height: 46, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{e}</div>)}</div>{cta("#2E9E5B", "#fff")}</>
      : <>{heroBox("🌿", "#E7EFE0")}<div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 13.5, padding: "10px 14px 0" }}>Heritage plants, grown with care since 1962</div>{cta("#2E9E5B", "#fff")}</>;
  } else if (kind === "subject") {
    const subj = isB ? "You won't believe what's inside… 😱" : "Your spring planting guide + 10% off";
    body = <div style={{ padding: "12px 14px" }}><div style={{ fontSize: 11, color: "#8a8270", marginBottom: 6 }}>Inbox · Chrichton</div><div style={{ background: "#FFFFFF", border: "1px solid #E3DECF", borderRadius: 8, padding: "10px 12px" }}><div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>Chrichton Garden Co.</div><div style={{ fontSize: 12.5, color: "#23201A" }}>{subj}</div><div style={{ fontSize: 11, color: "#8a8270", marginTop: 4 }}>Spring is here — time to plant…</div></div></div>;
  }
  return (
    <div style={frame}>
      <div style={{ background: "#2E5A3E", color: "#EAF3E6", fontSize: 11, fontWeight: 700, padding: "5px 12px", display: "flex", justifyContent: "space-between" }}><span>chrichton</span><span style={{ opacity: 0.7 }}>{kind === "subject" ? "✉️" : "🛒"}</span></div>
      {body}
    </div>
  );
}

/* ---- LAB BENCH ---------------------------------------------- */
function Bench({ exp, base, cfg, predWinner, setPredWinner, predBand, setPredBand, plannedN, setPlannedN, baseAssume, setBaseAssume, mdeAssume, setMdeAssume, onCommit }) {
  const reqN = requiredSampleSize(baseAssume / 100, mdeAssume / 100, cfg.alpha, cfg.power);
  const ready = predWinner != null && predBand != null;
  return (
    <div className="rise" style={{ marginTop: 22 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: T.mono, color: PLAYER, fontSize: 13 }}>EXPERIMENT {base.n}</span>
        <h2 style={{ fontFamily: T.display, fontWeight: 800, fontSize: 28, letterSpacing: -0.5, margin: 0 }}>{base.title}</h2>
        <Chip>{base.principle}</Chip>
      </div>
      <p style={{ color: T.muted, fontSize: 14.5, lineHeight: 1.55, marginTop: 8, maxWidth: 860 }}>{base.context}</p>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 16, marginTop: 12 }}>
        <VariantCard tag="A · Control" color={T.armA} kind={base.mock.kind} variant="A" label={base.control.label} note={base.control.note} />
        <VariantCard tag="B · Challenger" color={T.armB} kind={base.mock.kind} variant="B" label={base.variant.label} note={base.variant.rationale} isHypothesis />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 16, marginTop: 16 }}>
        <div style={card()}>
          <SectionTitle>1 · Form your hypothesis</SectionTitle>
          <div style={{ fontSize: 12.5, color: T.muted, marginBottom: 8 }}>Chrichton's product page currently converts at about <b style={{ color: T.text }}>{pct(base.baselineRate)}</b>. Which version wins, and by how much?</div>
          <div style={{ fontSize: 12.5, fontWeight: 600, margin: "10px 0 7px" }}>Your predicted winner</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[["a", "A wins"], ["none", "No difference"], ["b", "B wins"]].map(([id, lab]) => (
              <button key={id} onClick={() => setPredWinner(id)} style={pillBtn(predWinner === id)}>{lab}</button>
            ))}
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 600, margin: "16px 0 7px" }}>Predicted effect size <Term term="mde">(the band)</Term></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {BANDS.map((b) => (
              <button key={b.id} onClick={() => setPredBand(b.id)} style={{ ...pillBtn(predBand === b.id), textAlign: "left", padding: "9px 12px" }}>{b.label}</button>
            ))}
          </div>
        </div>

        <div style={card()}>
          <SectionTitle>2 · Plan the sample size</SectionTitle>
          <div style={{ fontSize: 12.5, color: T.muted, marginBottom: 12, lineHeight: 1.5 }}>
            How many visitors <i>per arm</i> do you need? Bigger effects are easy to spot; small ones need huge samples. Commit before you peek at any data.
          </div>
          <NumRow label="Assumed baseline rate" value={baseAssume} suffix="%" step={0.1} onChange={setBaseAssume} />
          <NumRow label={<><Term term="mde">Minimum detectable effect</Term></>} value={mdeAssume} suffix="pp" step={0.1} onChange={setMdeAssume} />
          <div style={{ background: T.panel2, borderRadius: 10, padding: "12px 14px", margin: "6px 0 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><div style={{ fontSize: 11, color: T.muted }}>Required per arm (at <Term term="alpha">α</Term>={cfg.alpha}, <Term term="power">power</Term> {Math.round(cfg.power * 100)}%)</div>
              <div style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 22, color: PLAYER }}>{isFinite(reqN) ? reqN.toLocaleString() : "∞"}</div></div>
            <button onClick={() => setPlannedN(clamp(reqN, 200, cfg.maxVisitors))} disabled={!isFinite(reqN)} style={{ ...croBtn(!isFinite(reqN), true) }}>Use this →</button>
          </div>
          <Slider label="Sample size to run (per arm)" accent={PLAYER} value={plannedN} min={200} max={cfg.maxVisitors} step={100} fmt={(v) => v.toLocaleString()} hint={plannedN < reqN && isFinite(reqN) ? `⚠ Below the ${reqN.toLocaleString()} your plan calls for — you may be underpowered.` : "Total visitors simulated = twice this (both arms)."} onChange={setPlannedN} />
          <button onClick={onCommit} disabled={!ready} style={{ ...btn(PLAYER), width: "100%", marginTop: 8, opacity: ready ? 1 : 0.45, cursor: ready ? "pointer" : "not-allowed" }}>{ready ? "Run the test ▸" : "Make a prediction to continue"}</button>
        </div>
      </div>
    </div>
  );
}
function VariantCard({ tag, color, kind, variant, label, note, isHypothesis }) {
  return (
    <div style={{ ...card(), borderColor: color + "66" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontFamily: T.mono, fontSize: 12, color, fontWeight: 700 }}>{tag}</span>
        <span style={{ fontFamily: T.display, fontWeight: 700, fontSize: 14 }}>{label}</span>
      </div>
      <MockPage kind={kind} variant={variant} />
      <div style={{ fontSize: 12, color: T.muted, marginTop: 10, lineHeight: 1.45 }}>{isHypothesis ? <><b style={{ color: T.text }}>Hypothesis:</b> {note}</> : note}</div>
    </div>
  );
}

/* ---- RUNNING ------------------------------------------------ */
function Running({ exp, base, cfg, result, animN, total, liveStat, animComplete, plannedN, onCall }) {
  const chartData = result.series.filter((s) => s.n <= (animN || 1)).map((s) => ({ n: s.n, A: +(s.rA * 100).toFixed(3), B: +(s.rB * 100).toFixed(3), p: +s.pValue.toFixed(4) }));
  const canStop = cfg.peeking && !animComplete && animN > 200;
  const verdict = liveStat.significant ? (liveStat.diff > 0 ? "B" : "A") : "none";
  const chipColor = liveStat.significant ? (liveStat.diff > 0 ? T.armB : T.armA) : T.amber;
  return (
    <div className="rise" style={{ marginTop: 22 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
        <h2 style={{ fontFamily: T.display, fontWeight: 800, fontSize: 24, letterSpacing: -0.5, margin: 0 }}>Running — {base.title}</h2>
        <span style={{ fontFamily: T.mono, color: T.muted, fontSize: 13 }}>{(animN * 2).toLocaleString()} / {(total * 2).toLocaleString()} visitors</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 16, marginTop: 12 }}>
        <ArmCounter tag="A · Control" color={T.armA} stat={liveStat} arm="A" exp={exp} />
        <ArmCounter tag="B · Challenger" color={T.armB} stat={liveStat} arm="B" exp={exp} />
      </div>

      <div style={{ ...card(), marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <SectionTitle>Observed {metricOf(exp)} as data accrues</SectionTitle>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: chipColor + "22", border: `1px solid ${chipColor}`, color: chipColor, borderRadius: 20, padding: "5px 12px", fontWeight: 700, fontSize: 12.5, fontFamily: T.mono }}>
            <span style={{ width: 8, height: 8, borderRadius: 8, background: chipColor, animation: animComplete ? "none" : "pulse 1s infinite" }} />
            {liveStat.significant ? `SIGNIFICANT · ${verdict} leads · p=${liveStat.pValue.toFixed(3)}` : `NOT YET SIGNIFICANT · p=${liveStat.pValue.toFixed(3)}`}
          </span>
        </div>
        <ResponsiveContainer width="100%" height={210}>
          <LineChart data={chartData} margin={{ top: 6, right: 14, bottom: 0, left: -10 }}>
            <CartesianGrid stroke={T.border} strokeDasharray="3 3" />
            <XAxis dataKey="n" tickLine={false} type="number" domain={[0, total]} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
            <YAxis tickLine={false} width={46} tickFormatter={(v) => `${v}%`} domain={["auto", "auto"]} />
            <Tooltip contentStyle={tipStyle} formatter={(v, n) => [`${v}%`, n === "A" ? "Control" : "Variant"]} labelFormatter={(l) => `${l} per arm`} />
            <Line type="monotone" dataKey="A" stroke={T.armA} strokeWidth={2.5} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="B" stroke={T.armB} strokeWidth={2.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ ...card(), marginTop: 16 }}>
        <SectionTitle><Term term="pvalue">p-value</Term> vs visitors — watch it cross (and re-cross) the line</SectionTitle>
        <ResponsiveContainer width="100%" height={170}>
          <LineChart data={chartData} margin={{ top: 6, right: 14, bottom: 0, left: -10 }}>
            <CartesianGrid stroke={T.border} strokeDasharray="3 3" />
            <XAxis dataKey="n" tickLine={false} type="number" domain={[0, total]} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
            <YAxis tickLine={false} width={46} domain={[0, 1]} tickFormatter={(v) => v.toFixed(1)} />
            <Tooltip contentStyle={tipStyle} formatter={(v) => [v, "p-value"]} labelFormatter={(l) => `${l} per arm`} />
            <ReferenceLine y={cfg.alpha} stroke={T.amber} strokeDasharray="5 4" label={{ value: `α=${cfg.alpha}`, fill: T.amber, fontSize: 11, position: "insideTopRight" }} />
            <Line type="monotone" dataKey="p" stroke={PLAYER} strokeWidth={2.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
        {cfg.peeking && <div style={{ marginTop: 8, fontSize: 12, color: T.amber, lineHeight: 1.45 }}>⚠ <Term term="peeking">Peeking</Term> is enabled — you may stop the moment it dips below α. That's exactly the temptation that inflates false positives.</div>}
      </div>

      <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 12 }}>
        {!animComplete && !canStop && <div style={{ textAlign: "center", color: T.muted, fontSize: 13, fontFamily: T.mono }}>collecting data… {Math.round((animN / total) * 100)}%</div>}
        {canStop && (
          <div style={{ background: "#2e2418", border: `1px solid ${T.amber}55`, borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 13, marginBottom: 10 }}>You said you'd run to <b>{plannedN.toLocaleString()}</b> per arm. Stop early at <b>{animN.toLocaleString()}</b>?</div>
            <button onClick={() => onCall(verdict === "none" ? "more" : verdict)} style={{ ...btn(T.amber), padding: "10px 18px" }}>⏹ Stop & call it now</button>
          </div>
        )}
        {animComplete && <CallBar onCall={onCall} />}
      </div>
    </div>
  );
}
function ArmCounter({ tag, color, stat, arm, exp }) {
  const rate = arm === "A" ? stat.rA : stat.rB;
  const conv = arm === "A" ? Math.round(stat.rA * stat.n) : Math.round(stat.rB * stat.n);
  const prof = exp.profit ? profitPerThousand(exp, rate, arm) : null;
  return (
    <div style={{ ...card(), borderColor: color + "55", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: T.mono, fontSize: 12, color, fontWeight: 700 }}>{tag}</span>
        <span style={{ fontFamily: T.mono, fontSize: 11.5, color: T.muted }}>{conv.toLocaleString()} / {stat.n.toLocaleString()}</span>
      </div>
      <div style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 38, color, margin: "6px 0 2px" }}>{pct(rate, 2)}</div>
      {prof != null && <div style={{ fontSize: 11.5, color: T.muted }}>≈ {gbp(prof)} profit / 1,000 visitors{arm === "B" ? " (after free shipping)" : ""}</div>}
    </div>
  );
}
function CallBar({ onCall }) {
  return (
    <div style={{ ...card(), textAlign: "center" }}>
      <SectionTitle>The data's in — what's your call?</SectionTitle>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        {[["b", "B is the winner", T.armB], ["a", "A is the winner", T.armA], ["none", "No real difference", T.muted], ["more", "Need more data", T.amber]].map(([id, lab, c]) => (
          <button key={id} onClick={() => onCall(id)} style={{ background: "transparent", border: `1.5px solid ${c}`, color: c, borderRadius: 11, padding: "12px 18px", fontFamily: T.body, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{lab}</button>
        ))}
      </div>
    </div>
  );
}

/* ---- VERDICT & REVEAL --------------------------------------- */
function Verdict({ exp, base, cfg, result, decisionN, record, predBand, call, onNext, isLast }) {
  const s = statAt(result, decisionN);
  const truthDiff = exp.truth.pB - exp.truth.pA;
  const tBand = trueBand(truthDiff);
  const callOk = record.callCorrect;
  const bandOk = record.bandCorrect;
  const [showStats, setShowStats] = useState(false);
  const callLabels = { a: "A is the winner", b: "B is the winner", none: "No real difference", more: "Need more data" };
  return (
    <div className="rise" style={{ marginTop: 22 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: T.mono, color: PLAYER, fontSize: 13 }}>VERDICT · EXPERIMENT {base.n}</span>
        <h2 style={{ fontFamily: T.display, fontWeight: 800, fontSize: 26, letterSpacing: -0.5, margin: 0 }}>{base.title}</h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 16, marginTop: 14 }}>
        <div style={card()}>
          <SectionTitle>What you observed · {metricOf(exp)} at n={s.n.toLocaleString()}/arm</SectionTitle>
          {/* Headline first — the plain-English read and the two numbers that
              decide the call. The rest of the statistics are one click away, so
              the screen doesn't dump eight metrics at once. */}
          <RevealRow label="Observed difference (B − A)" value={pp(s.diff)} color={s.diff >= 0 ? T.pos : T.neg} />
          <RevealRow label={<Term term="pvalue">p-value</Term>} value={`${s.pValue.toFixed(4)} ${s.significant ? "· significant" : "· not significant"}`} color={s.significant ? T.pos : T.amber} />
          <div style={{ marginTop: 12, background: T.panel2, borderRadius: 10, padding: "11px 13px", fontSize: 12.5, lineHeight: 1.5 }}>
            {plainLanguage(s, cfg)}
          </div>
          <button onClick={() => setShowStats((v) => !v)} style={{ marginTop: 12, background: "transparent", border: `1px solid ${T.border}`, color: T.muted, borderRadius: 8, padding: "7px 11px", cursor: "pointer", fontFamily: T.body, fontSize: 12.5, fontWeight: 600 }}>
            {showStats ? "▲ Hide the full statistics" : "▼ Show the full statistics"}
          </button>
          {showStats && (
            <div className="rise" style={{ marginTop: 10 }}>
              <RevealRow label="Control (A) rate" value={pct(s.rA, 2)} color={T.armA} />
              <RevealRow label="Variant (B) rate" value={pct(s.rB, 2)} color={T.armB} />
              <RevealRow label={<>95% <Term term="ci">confidence interval</Term></>} value={`[${pp(s.ciLow)}, ${pp(s.ciHigh)}]`} color={T.text} />
              <RevealRow label={<Term term="zscore">z-score</Term>} value={s.z.toFixed(2)} color={T.text} />
            </div>
          )}
        </div>

        <div style={card()}>
          <SectionTitle>The hidden truth</SectionTitle>
          <RevealRow label="True control rate" value={pct(exp.truth.pA, 2)} color={T.armA} />
          <RevealRow label="True variant rate" value={pct(exp.truth.pB, 2)} color={T.armB} />
          <RevealRow label="True effect" value={pp(truthDiff)} color={truthDiff > 0.002 ? T.pos : truthDiff < -0.002 ? T.neg : T.muted} />
          <RevealRow label="True band" value={tBand.label} color={T.text} />
          {exp.segments && <SegmentTable result={result} />}
          {exp.profit && <ProfitNote exp={exp} s={s} />}
          {exp.guardrail && <GuardrailNote exp={exp} s={s} />}
        </div>
      </div>

      <div style={{ ...card(), marginTop: 16 }}>
        <SectionTitle>Your scorecard</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
          <ScoreCard ok={bandOk} title="Effect-size prediction" you={BANDS.find((b) => b.id === predBand)?.label} truth={tBand.label} />
          <ScoreCard ok={callOk} title="Your final call" you={callLabels[call]} truth={callTruthHint(s, truthDiff)} />
        </div>
        <div style={{ marginTop: 14, background: tBand.id === "none" && s.significant ? "#3a1f16" : T.panel2, border: `1px solid ${tBand.id === "none" && s.significant ? T.neg + "55" : T.border}`, borderRadius: 11, padding: "14px 16px" }}>
          <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 14, color: PLAYER, marginBottom: 5 }}>🎓 {base.concept}</div>
          <div style={{ fontSize: 13, lineHeight: 1.55 }}>{base.lesson}</div>
          {result.firstSignificantN != null && result.firstSignificantN < result.arms.A.n && !exp.segments && (
            <div style={{ marginTop: 9, fontSize: 12, color: T.amber, lineHeight: 1.45 }}>🔎 This run first read p&lt;α at just <b>{result.firstSignificantN.toLocaleString()}</b> visitors/arm. Had you peeked and stopped there, you'd have called it on thinner evidence — sometimes a false alarm.</div>
          )}
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <button onClick={onNext} style={btn(PLAYER)}>{isLast ? "See your calibration report →" : `Next experiment → ${EXPERIMENTS[base.n] ? EXPERIMENTS[base.n].title : ""}`}</button>
      </div>
    </div>
  );
}
function RevealRow({ label, value, color }) {
  return <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.border}`, fontSize: 13.5 }}><span style={{ color: T.muted }}>{label}</span><span style={{ fontFamily: T.mono, fontWeight: 700, color }}>{value}</span></div>;
}
function ScoreCard({ ok, title, you, truth }) {
  return (
    <div style={{ background: ok ? "#1f2e18" : "#2e2418", border: `1px solid ${ok ? T.pos : T.amber}55`, borderRadius: 11, padding: "13px 15px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 12.5, color: T.muted }}>{title}</span>
        <span style={{ color: ok ? T.pos : T.amber, fontWeight: 700, fontSize: 13 }}>{ok ? "✓ correct" : "✗ off"}</span>
      </div>
      <div style={{ fontSize: 13 }}>You said <b>{you || "—"}</b></div>
      <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{truth}</div>
    </div>
  );
}
function SegmentTable({ result }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 7, color: T.amber }}>↘ Cut by <Term term="simpson">segment</Term> — the aggregate was hiding this:</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {result.segments.map((sg) => (
          <div key={sg.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: T.panel2, borderRadius: 8, padding: "8px 11px", fontSize: 12.5 }}>
            <span style={{ fontWeight: 600 }}>{sg.name}</span>
            <span style={{ fontFamily: T.mono, color: T.muted }}>A {pct(sg.rA, 1)} · B {pct(sg.rB, 1)}</span>
            <span style={{ fontFamily: T.mono, fontWeight: 700, color: sg.diff > 0 ? T.pos : T.neg }}>{pp(sg.diff, 1)} {sg.significant ? "✓" : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
function ProfitNote({ exp, s }) {
  const pa = profitPerThousand(exp, s.rA, "A");
  const pb = profitPerThousand(exp, s.rB, "B");
  const bWorse = pb < pa;
  return (
    <div style={{ marginTop: 12, background: bWorse ? "#3a1f16" : "#1f2e18", border: `1px solid ${bWorse ? T.neg : T.pos}55`, borderRadius: 10, padding: "11px 13px", fontSize: 12.5, lineHeight: 1.5 }}>
      💷 <b>Business impact / 1,000 visitors:</b> A makes <b style={{ color: T.text }}>{gbp(pa)}</b>, B makes <b style={{ color: bWorse ? T.neg : T.pos }}>{gbp(pb)}</b>.
      {bWorse ? " B converts more, but the free shipping makes it LESS profitable — a test that wins on clicks but loses money." : " B wins on both conversion and profit here."}
    </div>
  );
}

function GuardrailNote({ exp, s }) {
  const ga = guardrailPerThousand(exp, s.rA, "A");
  const gb = guardrailPerThousand(exp, s.rB, "B");
  const bWorse = gb < ga;
  return (
    <div style={{ marginTop: 12, background: bWorse ? "#3a1f16" : "#1f2e18", border: `1px solid ${bWorse ? T.neg : T.pos}55`, borderRadius: 10, padding: "11px 13px", fontSize: 12.5, lineHeight: 1.5 }}>
      🚧 <b><Term term="guardrail">Guardrail</Term> — {exp.guardrail.label}:</b> A delivers <b style={{ color: T.text }}>{ga.toFixed(1)}</b>, B delivers <b style={{ color: bWorse ? T.neg : T.pos }}>{gb.toFixed(1)}</b>.
      {bWorse ? ` B won the test metric but the guardrail moved the wrong way (${Math.round((1 - gb / ga) * 100)}% fewer). ` : " B held up on the guardrail too. "}
      <span style={{ color: T.muted }}>{exp.guardrail.note}</span>
    </div>
  );
}

/* ---- WHICH TEST WON? round ---------------------------------- */
const WAGERS = [
  { id: 1, label: "Hunch", note: "right +1 · wrong 0" },
  { id: 2, label: "Confident", note: "right +2 · wrong −1" },
  { id: 3, label: "Certain", note: "right +3 · wrong −2" },
];
const MAX_Q_POINTS = 5;   // wager 3 (direction) + 1 magnitude + 1 mechanism
const dirLabel = (id) => QDIR.find((d) => d.id === id)?.label || "—";
const magLabel = (id) => QMAG.find((m) => m.id === id)?.label || "—";

function QuizRound({ item, idx, total, onComplete }) {
  const [stage, setStage] = useState("predict");   // predict | mech | reveal
  const [dir, setDir] = useState(null);
  const [mag, setMag] = useState(null);
  const [wager, setWager] = useState(null);
  const [mechPick, setMechPick] = useState(null);
  // exclude "reverses" magnitude unless the question is a segment case (keeps the tell subtle only for depends)
  const magOptions = QMAG;

  const dirOk = dir === item.answer;
  const magOk = mag === item.mag;
  const mechOk = mechPick === item.mech.correct;
  const dirPoints = dirOk ? wager : -(wager - 1);
  const points = (stage === "reveal" ? dirPoints + (magOk ? 1 : 0) + (mechOk ? 1 : 0) : 0);

  function finish() { onComplete({ dirOk, magOk, mechOk, wager, points }); }

  return (
    <div className="rise" style={{ marginTop: 22, maxWidth: 980, marginLeft: "auto", marginRight: "auto" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: T.mono, color: PLAYER, fontSize: 13 }}>QUESTION {idx + 1} / {total}</span>
        <h2 style={{ fontFamily: T.display, fontWeight: 800, fontSize: 26, letterSpacing: -0.5, margin: 0 }}>{item.title}</h2>
      </div>
      <p style={{ color: T.muted, fontSize: 15, lineHeight: 1.5, marginTop: 6 }}>{item.question}</p>

      {/* the two variants (illustration) */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 16, marginTop: 12 }}>
        {["a", "b"].map((side) => {
          const isWin = stage === "reveal" && item.answer === side;
          const dim = stage === "reveal" && item.answer !== side && (item.answer === "a" || item.answer === "b");
          return (
            <div key={side} style={{ borderRadius: 16, overflow: "hidden", background: T.panel, border: `2px solid ${isWin ? T.pos : T.border}`, opacity: dim ? 0.5 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px 8px" }}>
                <span style={{ fontFamily: T.mono, fontSize: 12, color: side === "a" ? T.armA : T.armB, fontWeight: 700 }}>{side.toUpperCase()}</span>
                <span style={{ fontFamily: T.display, fontWeight: 700, fontSize: 15 }}>{side === "a" ? item.a : item.b}</span>
              </div>
              <div style={{ padding: "0 16px 16px" }}><QuizMock kind={item.mock} side={side} /></div>
              {stage === "reveal" && <div style={{ background: isWin ? "#1f2e18" : "#241d12", color: isWin ? T.pos : T.muted, fontFamily: T.mono, fontWeight: 700, fontSize: 12, textAlign: "center", padding: "7px 0" }}>{isWin ? "✓ this won" : (item.answer === "none" || item.answer === "depends") ? "—" : ""}</div>}
            </div>
          );
        })}
      </div>

      {/* STAGE 1 — predict direction + magnitude + confidence */}
      {stage === "predict" && (
        <div style={{ ...card(), marginTop: 16 }}>
          <QLabel n="1" text="Which won — and is there even a real winner?" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            {QDIR.map((d) => <button key={d.id} onClick={() => setDir(d.id)} style={{ ...pillBtn(dir === d.id), padding: "10px 12px", fontSize: 13, textAlign: "left" }}>{d.label}</button>)}
          </div>
          <QLabel n="2" text="How big is the effect?" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            {magOptions.map((m) => <button key={m.id} onClick={() => setMag(m.id)} style={{ ...pillBtn(mag === m.id), padding: "8px 12px", fontSize: 12.5 }}>{m.label}</button>)}
          </div>
          <QLabel n="3" text="How sure are you? (you're wagering points)" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
            {WAGERS.map((w) => (
              <button key={w.id} onClick={() => setWager(w.id)} style={{ ...pillBtn(wager === w.id), padding: "9px 8px" }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{w.label}</div>
                <div style={{ fontSize: 10.5, color: T.muted, fontFamily: T.mono, marginTop: 2 }}>{w.note}</div>
              </button>
            ))}
          </div>
          <button onClick={() => setStage("mech")} disabled={!dir || !mag || !wager}
            style={{ ...btn((dir && mag && wager) ? PLAYER : T.panel2), width: "100%", opacity: (dir && mag && wager) ? 1 : 0.6, cursor: (dir && mag && wager) ? "pointer" : "default", color: (dir && mag && wager) ? T.onAccent : T.muted }}>
            Lock it in →
          </button>
        </div>
      )}

      {/* STAGE 2 — mechanism MCQ */}
      {stage === "mech" && (
        <div className="rise" style={{ ...card(), marginTop: 16 }}>
          <QLabel n="4" text="Whatever the result — which principle best explains it?" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {item.mech.options.map((o, i) => <button key={i} onClick={() => setMechPick(i)} style={{ ...pillBtn(mechPick === i), padding: "11px 13px", fontSize: 13, textAlign: "left" }}>{o}</button>)}
          </div>
          <button onClick={() => setStage("reveal")} disabled={mechPick == null}
            style={{ ...btn(mechPick != null ? PLAYER : T.panel2), width: "100%", opacity: mechPick != null ? 1 : 0.6, cursor: mechPick != null ? "pointer" : "default", color: mechPick != null ? T.onAccent : T.muted }}>
            Reveal the result →
          </button>
        </div>
      )}

      {/* STAGE 3 — reveal + scoring */}
      {stage === "reveal" && (
        <div className="rise" style={{ ...card(), marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            <span style={{ fontFamily: T.display, fontWeight: 800, fontSize: 18, color: points > 0 ? T.pos : points < 0 ? T.neg : T.muted }}>{points > 0 ? "+" : ""}{points} {Math.abs(points) === 1 ? "point" : "points"}</span>
            <Chip>{item.stack} · CRO Stack</Chip>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8, marginBottom: 12 }}>
            <WFScore ok={dirOk} title={`Direction (${WAGERS.find((w) => w.id === wager).label.toLowerCase()})`} you={dirLabel(dir)} truth={dirLabel(item.answer)} />
            <WFScore ok={magOk} title="Effect size" you={magLabel(mag)} truth={magLabel(item.mag)} />
            <WFScore ok={mechOk} title="Mechanism" you={`Option ${dir ? "" : ""}${mechPick + 1}`} truth={item.mech.options[item.mech.correct]} />
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, marginBottom: 8 }}>{item.result}</div>
          <div style={{ background: T.panel2, borderRadius: 10, padding: "11px 13px", fontSize: 13, lineHeight: 1.55 }}>
            <b style={{ color: PLAYER }}>Why:</b> {item.term && GLOSSARY[item.term] ? <Term term={item.term}>{item.principle}</Term> : item.principle}
          </div>
          <button onClick={finish} style={{ ...btn(PLAYER), width: "100%", marginTop: 14 }}>{idx + 1 >= total ? "See your calibration →" : "Next question →"}</button>
        </div>
      )}
    </div>
  );
}
function QLabel({ n, text }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
    <span style={{ width: 20, height: 20, borderRadius: 20, background: T.panel2, border: `1px solid ${T.border}`, color: T.muted, fontFamily: T.mono, fontSize: 11, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{n}</span>
    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{text}</span>
  </div>;
}

function QuizDone({ results, total, onReplay, onLab }) {
  const pts = results.reduce((a, r) => a + r.points, 0);
  const maxPts = total * MAX_Q_POINTS;
  const dirHits = results.filter((r) => r.dirOk).length;
  const magHits = results.filter((r) => r.magOk).length;
  const mechHits = results.filter((r) => r.mechOk).length;
  const certain = results.filter((r) => r.wager === 3);
  const certainWrong = certain.filter((r) => !r.dirOk).length;
  const overconfident = certainWrong >= 2;
  const ratio = maxPts ? pts / maxPts : 0;
  const verdict = ratio >= 0.7 ? "Sharp — and well-calibrated. You knew which calls to bet on." :
    ratio >= 0.4 ? "Direction is the easy part; sizing the effect and naming the mechanism is where the marks are." :
    "The data humbles intuition — which is the entire reason we test rather than assert.";
  return (
    <div className="rise" style={{ marginTop: 28, maxWidth: 760, marginLeft: "auto", marginRight: "auto", textAlign: "center" }}>
      <div style={{ color: T.muted, fontFamily: T.mono, fontSize: 12, letterSpacing: 2 }}>WHICH TEST WON?</div>
      <h1 style={{ fontFamily: T.display, fontWeight: 800, fontSize: 40, margin: "8px 0" }}>You scored <span style={{ color: pts >= 0 ? PLAYER : T.neg }}>{pts}</span><span style={{ color: T.muted, fontSize: 24 }}> / {maxPts}</span></h1>
      <p style={{ color: T.muted, fontSize: 15.5, lineHeight: 1.6 }}>{verdict}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 18 }}>
        <MiniStat label="Direction" value={`${dirHits}/${total}`} accent={T.pos} />
        <MiniStat label="Effect size" value={`${magHits}/${total}`} accent={T.amber} />
        <MiniStat label="Mechanism" value={`${mechHits}/${total}`} accent={T.armB} />
      </div>
      <div style={{ ...card(), marginTop: 16, textAlign: "left" }}>
        <SectionTitle>{overconfident ? "You over-bet your certainty" : "Calibration is the real skill"}</SectionTitle>
        <p style={{ fontSize: 13.5, lineHeight: 1.6, color: T.text, margin: 0 }}>
          {overconfident
            ? <>You went <b>“Certain”</b> and were wrong {certainWrong} times — each cost you points. Confidence should track evidence, not conviction. </>
            : <>Notice the drop from getting the <i>direction</i> right to sizing the <i>effect</i> and naming the <i>mechanism</i>. </>}
          Even seasoned marketers call these wrong, sizes surprise everyone, and some tests have no winner or reverse by segment. That's why every change runs through the <Term term="crostack">CRO Stack</Term>: find it in the <b>data</b>, prioritise by <b>strategy</b>, design with <b>psychology</b>, and prove it with a <b>test</b>.
        </p>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20, flexWrap: "wrap" }}>
        <button onClick={onReplay} style={btn(PLAYER)}>Play again ↺</button>
        <button onClick={onLab} style={{ ...btn("transparent"), color: T.text, border: `1px solid ${T.border}` }}>Back to the lab →</button>
      </div>
    </div>
  );
}

/* Compact A/B mocks for the quiz cards. */
function QuizMock({ kind, side }) {
  const isB = side === "b";
  const box = (children, h = 96) => <div style={{ height: h, background: "#FBF7EF", borderRadius: 10, color: "#23201A", fontFamily: T.body, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, overflow: "hidden", padding: 8 }}>{children}</div>;
  const btnBox = (bg, txt, color = "#fff") => <div style={{ background: bg, color, fontWeight: 700, fontSize: 13, padding: "9px 16px", borderRadius: 8 }}>{txt}</div>;
  const bar = (w = "100%") => <div style={{ width: w, height: 9, background: "#E3E8DD", borderRadius: 4 }} />;
  switch (kind) {
    case "guest": return box(isB ? btnBox("#2E9E5B", "Continue as guest") : btnBox("#C9C3B4", "Create an account", "#4a463c"));
    case "fields": return box(<div style={{ display: "flex", flexDirection: "column", gap: 5, width: "70%" }}>{Array.from({ length: isB ? 4 : 8 }).map((_, i) => bar())}</div>, 110);
    case "guarantee": return box(isB ? <div style={{ background: "#E3F0E4", color: "#2E5A3E", fontWeight: 700, padding: "8px 12px", borderRadius: 8, fontSize: 12.5 }}>✅ 30-day money-back</div> : <span style={{ color: "#8a8270", fontSize: 12 }}>no guarantee</span>);
    case "columns": return box(isB
      ? <div style={{ display: "flex", gap: 8, width: "80%" }}>{[0, 1].map((c) => <div key={c} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>{bar()}{bar()}{bar()}</div>)}</div>
      : <div style={{ display: "flex", flexDirection: "column", gap: 5, width: "55%" }}>{bar()}{bar()}{bar()}</div>, 96);
    case "reviews": return box(isB ? <div style={{ textAlign: "center" }}><div style={{ color: "#E8902E", fontSize: 18 }}>★★★★☆</div><div style={{ fontSize: 11, color: "#8a8270" }}>412 reviews</div></div> : <span style={{ color: "#8a8270", fontSize: 12 }}>reviews hidden</span>);
    case "sticky": return box(<div style={{ position: "relative", width: 64, height: 84, background: "#E3E8DD", borderRadius: 8, overflow: "hidden" }}><div style={{ fontSize: 22, textAlign: "center", marginTop: 16 }}>🪴</div>{isB && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#2E9E5B", color: "#fff", fontSize: 8, fontWeight: 700, textAlign: "center", padding: "4px 0" }}>Add to cart</div>}</div>);
    case "video": return box(<div style={{ fontSize: 34 }}>{isB ? "▶️" : "🖼️"}</div>);
    case "popup": return box(isB ? <div style={{ position: "relative", width: "85%", height: 70, background: "#E3E8DD", borderRadius: 8 }}><div style={{ position: "absolute", inset: "14px 18px", background: "#fff", border: "1px solid #C9C3B4", borderRadius: 6, fontSize: 10.5, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 4 }}>✉️ 10% off — before you go!</div></div> : <div style={{ width: "85%", height: 70, background: "#E3E8DD", borderRadius: 8 }} />);
    case "decoy": return box(<div style={{ display: "flex", gap: 5 }}>{Array.from({ length: isB ? 4 : 3 }).map((_, i) => <div key={i} style={{ width: 26, height: 50, background: "#E3E8DD", borderRadius: 5, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 4, fontFamily: T.mono, fontSize: 9, fontWeight: 700 }}>£{[9, 19, 29, 39][i]}</div>)}</div>);
    case "personalise": return box(<div style={{ textAlign: "center" }}><div style={{ fontSize: 11, fontWeight: 700, marginBottom: 5 }}>{isB ? "✨ Recommended for you" : "Bestsellers"}</div><div style={{ display: "flex", gap: 5, justifyContent: "center" }}>{["🪴", "🌷", "🌿"].map((e, i) => <div key={i} style={{ width: 30, height: 34, background: "#E3E8DD", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>{e}</div>)}</div></div>);
    case "microcopy": return box(<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}><div style={{ width: 54, height: 40, background: "#E3E8DD", borderRadius: 6 }} />{btnBox("#2E9E5B", isB ? "Add to basket" : "Add to cart")}</div>);
    case "coupon": return box(<div style={{ width: "74%", display: "flex", flexDirection: "column", gap: 5 }}>{bar()}{bar()}{isB && <div style={{ display: "flex", alignItems: "center", gap: 5, border: "1px dashed #B7AE99", borderRadius: 5, padding: "4px 6px", fontSize: 9.5, color: "#6E6552" }}>🎟️ Got a promo code?</div>}{bar()}<div style={{ background: "#2E9E5B", height: 12, borderRadius: 4, marginTop: 2 }} /></div>);
    default: return box(<span style={{ color: "#8a8270", fontSize: 12 }}>{isB ? "Variant B" : "Variant A"}</span>);
  }
}

/* ---- SUMMARY (calibration) ---------------------------------- */
function Summary({ records, cfg, restart }) {
  const ordered = EXPERIMENTS.map((e) => records.find((r) => r.id === e.id)).filter(Boolean);
  const bandHits = ordered.filter((r) => r.bandCorrect).length;
  const callHits = ordered.filter((r) => r.callCorrect).length;
  return (
    <div className="rise" style={{ marginTop: 24 }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ color: T.muted, fontFamily: T.mono, fontSize: 12, letterSpacing: 2 }}>CHRICHTON · SEED {cfg.seed}</div>
        <h1 style={{ fontFamily: T.display, fontWeight: 800, fontSize: 36, margin: "6px 0", letterSpacing: -0.5 }}>Your calibration report</h1>
        <div style={{ color: T.muted }}>Effect-size band <b style={{ color: PLAYER }}>{bandHits}/{ordered.length}</b> · final call <b style={{ color: PLAYER }}>{callHits}/{ordered.length}</b> correct.</div>
      </div>

      <div style={card()}>
        <SectionTitle>Every experiment, predicted vs actual</SectionTitle>
        <div role="region" aria-label="Experiment results table (scrollable)" tabIndex={0} style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead><tr style={{ color: T.muted, textAlign: "left" }}>{["Experiment", "Concept", "Your band", "Obs diff", "95% CI", "p", "Call", "✓"].map((h) => <th key={h} style={{ padding: "6px 8px", borderBottom: `1px solid ${T.border}`, fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
            <tbody>
              {ordered.map((r) => (
                <tr key={r.id}>
                  <td style={td()}>{r.title}</td>
                  <td style={{ ...td(), color: T.muted }}>{r.concept}</td>
                  <td style={td()}>{r.predictedBand}</td>
                  <td style={{ ...td(), fontFamily: T.mono, color: r.obsDiff >= 0 ? T.pos : T.neg }}>{pp(r.obsDiff)}</td>
                  <td style={{ ...td(), fontFamily: T.mono, color: T.muted }}>[{pp(r.ciLow)}, {pp(r.ciHigh)}]</td>
                  <td style={{ ...td(), fontFamily: T.mono, color: r.significant ? T.pos : T.amber }}>{r.pValue.toFixed(3)}</td>
                  <td style={{ ...td(), fontFamily: T.mono }}>{r.call}</td>
                  <td style={{ ...td(), color: r.callCorrect ? T.pos : T.neg, fontWeight: 700 }}>{r.callCorrect ? "✓" : "✗"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ ...card(), marginTop: 16 }}>
        <SectionTitle>What the lab was teaching</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 12 }}>
          {EXPERIMENTS.map((e) => <div key={e.id} style={{ background: T.panel2, borderRadius: 11, padding: "13px 15px", border: `1px solid ${T.border}` }}><div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 14, color: PLAYER, marginBottom: 5 }}>{e.concept}</div><div style={{ fontSize: 12.5, color: T.text, lineHeight: 1.5 }}>{e.lesson}</div></div>)}
        </div>
      </div>

      <div style={{ ...card(), marginTop: 16 }}>
        <SectionTitle>You just did <Term term="cro">CRO</Term></SectionTitle>
        <p style={{ color: T.muted, fontSize: 13, lineHeight: 1.55, marginTop: -6, marginBottom: 14 }}>Every experiment ran the full <Term term="crostack">CRO Stack</Term> — the same loop you'll use on a real site.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
          {CRO_STACK.map((s, i) => (
            <div key={s.k} style={{ background: T.panel2, borderRadius: 11, padding: "13px 14px", border: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                <span style={{ width: 20, height: 20, borderRadius: 20, background: T.instructor, color: T.onAccent, fontFamily: T.mono, fontWeight: 700, fontSize: 11, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                <span style={{ fontFamily: T.display, fontWeight: 700, fontSize: 14 }}>{s.k}</span>
              </div>
              <div style={{ color: T.muted, fontSize: 11.5, lineHeight: 1.45 }}>{s.d}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...card(), marginTop: 16, textAlign: "center" }}>
        <SectionTitle>Take your experiment log into class</SectionTitle>
        <p style={{ color: T.muted, fontSize: 13, lineHeight: 1.5, maxWidth: 580, margin: "0 auto 16px" }}>Export the full record — hypothesis, planned vs actual sample size, observed diff/CI/p, the call, whether it was correct, and the business impact — as an assessable artifact with reflection prompts.</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => downloadFile(`conversion-lab-${cfg.seed}.csv`, buildCSV(ordered, cfg), "text/csv")} style={btn(T.instructor)}>⬇ Download CSV</button>
          <button onClick={() => downloadFile(`conversion-lab-${cfg.seed}.md`, buildMarkdown(ordered, cfg), "text/markdown")} style={{ ...btn("transparent"), color: T.text, border: `1px solid ${T.border}` }}>⬇ Download Markdown</button>
        </div>
      </div>
      <div style={{ textAlign: "center", marginTop: 22 }}><button onClick={restart} style={btn(PLAYER)}>Run the lab again ↺</button></div>
    </div>
  );
}

/* ---- INSTRUCTOR PANEL --------------------------------------- */
function InstructorPanel({ cfg, setCfg, defaults, onClose }) {
  const set = (patch) => setCfg((c) => ({ ...c, ...patch }));
  const A = T.instructor;
  const preset = (label, patch) => <button key={label} onClick={() => set(patch)} style={presetBtn}>{label}</button>;
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "#0008", zIndex: 40 }} />
      <div style={{ position: "fixed", top: 0, right: 0, height: "100%", width: 350, maxWidth: "92vw", background: "#1A1610", borderLeft: `1px solid ${A}55`, zIndex: 50, overflowY: "auto", animation: "slideIn .25s ease both", boxShadow: "-20px 0 50px #0007" }}>
        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontFamily: T.display, fontWeight: 800, fontSize: 19, color: A }}>⚙ Instructor</span>
            <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
          </div>
          <p style={{ color: T.muted, fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>Changes apply to the <b style={{ color: T.text }}>next test run</b>. A shared seed gives the whole cohort an identical run — so the debrief is about <b style={{ color: T.text }}>decisions</b>, not luck.</p>

          <PanelGroup title="Classroom">
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Run seed</div>
              <div style={{ display: "flex", gap: 6 }}>
                <input value={cfg.seed} onChange={(e) => set({ seed: e.target.value })} style={{ flex: 1, background: T.panel, border: `1px solid ${T.border}`, color: T.text, borderRadius: 8, padding: "8px 10px", fontFamily: T.mono, fontSize: 13, outline: "none" }} />
                <button onClick={() => set({ seed: "LAB-" + Math.random().toString(36).slice(2, 7).toUpperCase() })} style={{ ...presetBtn, padding: "8px 10px" }}>🎲</button>
              </div>
            </div>
            <ToggleRow label="Allow peeking (optional stopping)" on={cfg.peeking} accent={A} onToggle={() => set({ peeking: !cfg.peeking })} />
          </PanelGroup>

          <PanelGroup title="Statistical settings" note="α is the false-positive threshold; power sets the sample-size planner's target.">
            <InstructorSlider label="Significance level α" accent={A} value={cfg.alpha} min={0.01} max={0.2} step={0.01} fmt={(v) => v.toFixed(2)} onChange={(v) => set({ alpha: v })} changed={cfg.alpha !== defaults.alpha} />
            <InstructorSlider label="Target power" accent={A} value={cfg.power} min={0.5} max={0.95} step={0.05} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ power: v })} changed={cfg.power !== defaults.power} />
            <InstructorSlider label="Max visitors / arm" accent={A} value={cfg.maxVisitors} min={2000} max={60000} step={1000} fmt={(v) => `${(v / 1000).toFixed(0)}k`} onChange={(v) => set({ maxVisitors: v })} changed={cfg.maxVisitors !== defaults.maxVisitors} />
          </PanelGroup>

          <PanelGroup title="Effect size" note="Scales every variant's true lift. 1.0 = as designed; 0 = the variant truly does nothing.">
            <InstructorSlider label="Effect multiplier" accent={A} value={cfg.effectMult} min={0} max={2} step={0.1} fmt={(v) => `${v.toFixed(1)}×`} onChange={(v) => set({ effectMult: v })} changed={cfg.effectMult !== defaults.effectMult} />
          </PanelGroup>

          <PanelGroup title="Teaching presets — one tap">
            <div style={{ display: "grid", gap: 8 }}>
              {preset("🫥 Pure noise (kill all effects)", { effectMult: 0 })}
              {preset("🔬 Underpowered (shrink effects ×0.4)", { effectMult: 0.4 })}
              {preset("👀 Peeking enabled", { peeking: true })}
              {preset("📏 Strict α = 0.01", { alpha: 0.01 })}
              {preset("📐 Lenient α = 0.10", { alpha: 0.10 })}
              {preset("💪 Boost effects ×1.5", { effectMult: 1.5 })}
            </div>
          </PanelGroup>

          <button onClick={() => setCfg(defaults)} style={{ width: "100%", marginTop: 12, background: "transparent", color: T.muted, border: `1px solid ${T.border}`, borderRadius: 10, padding: "11px", cursor: "pointer", fontFamily: T.body, fontWeight: 600, fontSize: 13 }}>↺ Reset all to defaults</button>
        </div>
      </div>
    </>
  );
}

/* ---- plain-language + helpers ------------------------------- */
function plainLanguage(s, cfg) {
  if (s.significant) {
    return <>With p = <b>{s.pValue.toFixed(4)}</b> (below α = {cfg.alpha}), the difference is <b style={{ color: T.pos }}>statistically significant</b>. A gap this large is unlikely to be chance. The <Term term="ci">CI</Term> excludes zero, so we can rule out ‘no effect’ at this sample size.</>;
  }
  const crosses = s.ciLow < 0 && s.ciHigh > 0;
  return <>With p = <b>{s.pValue.toFixed(4)}</b> (above α = {cfg.alpha}), the result is <b style={{ color: T.amber }}>not significant</b>. {crosses ? "The confidence interval still includes zero, so you cannot rule out ‘no real difference’." : "Treat this as inconclusive."} The honest call is usually ‘need more data’, not ‘no effect’.</>;
}
function callTruthHint(s, truthDiff) {
  const trulyNull = Math.abs(truthDiff) <= 0.002;
  if (trulyNull) return "Truth: no real effect.";
  if (s.significant) return `Truth: a real ${truthDiff > 0 ? "B" : "A"} effect — and your run detected it.`;
  return `Truth: a real ${truthDiff > 0 ? "B" : "A"} effect your run was too small to confirm.`;
}
function businessNote(exp, s) {
  const pa = profitPerThousand(exp, s.rA, "A");
  const pb = profitPerThousand(exp, s.rB, "B");
  return pb < pa ? `B converts higher but profit/1k £${Math.round(pb)} < £${Math.round(pa)} (A) — net loss` : `B profit/1k £${Math.round(pb)} ≥ £${Math.round(pa)} (A)`;
}

/* ---- atoms -------------------------------------------------- */
function SectionTitle({ children }) { return <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 16.5, marginBottom: 13, letterSpacing: -0.2 }}>{children}</div>; }
function Chip({ children }) { return <span style={{ fontFamily: T.mono, fontSize: 11, color: T.instructor, border: `1px solid ${T.instructor}55`, borderRadius: 6, padding: "2px 8px" }}>{children}</span>; }
function Slider({ label, value, min, max, step, onChange, fmt, hint, accent }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><span style={{ fontSize: 13.5, fontWeight: 600 }}>{label}</span><span style={{ fontFamily: T.mono, fontWeight: 700, color: accent }}>{fmt(value)}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%", margin: "8px 0 5px", "--accent": accent, "--accent-soft": accent + "30" }} />
      {hint && <div style={{ fontSize: 11.5, color: T.muted, lineHeight: 1.4 }}>{hint}</div>}
    </div>
  );
}
function NumRow({ label, value, suffix, step, onChange }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button onClick={() => onChange(Math.max(0, +(value - step).toFixed(2)))} style={stepBtn}>−</button>
        <span style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 14, width: 56, textAlign: "center" }}>{value}{suffix}</span>
        <button onClick={() => onChange(+(value + step).toFixed(2))} style={stepBtn}>+</button>
      </span>
    </div>
  );
}
const stepBtn = { width: 26, height: 26, borderRadius: 7, background: T.panel2, border: `1px solid ${T.border}`, color: T.text, cursor: "pointer", fontSize: 16, fontWeight: 700, lineHeight: 1 };
function ToggleRow({ label, on, onToggle, accent }) {
  return (
    <div onClick={onToggle} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", marginBottom: 13, fontSize: 13, fontWeight: 500 }}>
      <span>{label}</span>
      <span style={{ width: 38, height: 22, borderRadius: 22, background: on ? accent : T.track, position: "relative", transition: "background .15s" }}><span style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 18, height: 18, borderRadius: 18, background: "#14110D", transition: "left .15s" }} /></span>
    </div>
  );
}
function PanelGroup({ title, note, children }) {
  return <div style={{ marginTop: 18 }}><div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 13, letterSpacing: 0.3, textTransform: "uppercase", color: T.muted, marginBottom: 10 }}>{title}</div>{note && <div style={{ fontSize: 11.5, color: T.muted, marginTop: -4, marginBottom: 10, lineHeight: 1.4 }}>{note}</div>}{children}</div>;
}
function InstructorSlider({ label, value, min, max, step, fmt, onChange, accent, changed }) {
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><span style={{ fontSize: 13, fontWeight: 500 }}>{label}{changed && <span style={{ color: accent, marginLeft: 5 }}>•</span>}</span><span style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 13, color: accent }}>{fmt(value)}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%", marginTop: 7, "--accent": accent, "--accent-soft": accent + "30" }} />
    </div>
  );
}
const tipStyle = { background: T.panel, border: `1px solid ${T.border}`, borderRadius: 8, fontFamily: T.mono, fontSize: 12 };
const presetBtn = { textAlign: "left", background: T.panel2, border: `1px solid ${T.border}`, color: T.text, borderRadius: 9, padding: "9px 11px", cursor: "pointer", fontFamily: T.body, fontSize: 12.5, lineHeight: 1.3 };
const card = () => ({ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20 });
const btn = (c) => ({ background: c, color: c === "transparent" ? T.text : T.onAccent, border: "none", borderRadius: 11, padding: "13px 22px", fontFamily: T.body, fontWeight: 700, fontSize: 15, cursor: "pointer", letterSpacing: 0.2 });
const pillBtn = (on) => ({ flex: 1, padding: "10px 8px", borderRadius: 9, cursor: "pointer", fontFamily: T.body, fontWeight: 600, fontSize: 13, border: `1.5px solid ${on ? PLAYER : T.border}`, background: on ? PLAYER : "transparent", color: on ? T.onAccent : T.text });
const croBtn = (disabled, primary) => ({ background: disabled ? "#2a241a" : primary ? PLAYER : "transparent", color: disabled ? T.muted : primary ? T.onAccent : T.text, border: `1px solid ${primary ? (disabled ? T.border : PLAYER) : T.border}`, borderRadius: 8, padding: "8px 12px", fontFamily: T.body, fontWeight: 600, fontSize: 12.5, cursor: disabled ? "not-allowed" : "pointer", whiteSpace: "nowrap" });
const td = () => ({ padding: "7px 8px", borderBottom: `1px solid ${T.border}` });
