import React, { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import {
  DEFAULT_CFG, INTERVENTIONS, IMAP, STAGES, STAGE_KEYS, GLOSSARY, initialState, resolveQuarter,
  previewSingles, leaks, bottleneckOf, volumes, gbp, gbpK, pct, pp, clamp,
  buildCSV, buildMarkdown, downloadFile,
} from "../engine/engine.js";

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');
`;
const T = {
  ink: "#14110D", panel: "#1F1A13", panel2: "#272015", border: "#3A3022",
  text: "#F0E9DC", muted: "#A99E8B", pos: "#7DCB6A", neg: "#E2654E", amber: "#E6B450",
  player: "#F2A93B", instructor: "#C9A06A", sel: "#2A2113", track: "#332a1d", faint: "#4a3f2d", onAccent: "#1a1206",
  display: "'Bricolage Grotesque', sans-serif", body: "'Hanken Grotesk', sans-serif", mono: "'JetBrains Mono', monospace",
};
const PLAYER = T.player;

function Term({ term, children }) {
  const [open, setOpen] = useState(false);
  const def = GLOSSARY[term];
  if (!def) return <span>{children}</span>;
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }} style={{ borderBottom: `1px dotted ${T.muted}`, cursor: "help" }}>{children}</span>
      {open && <span onClick={(e) => e.stopPropagation()} style={{ position: "absolute", bottom: "135%", left: 0, zIndex: 60, width: 240, fontWeight: 400, background: "#0F0C08", border: `1px solid ${T.instructor}66`, borderRadius: 8, padding: "9px 11px", fontSize: 11.5, color: T.text, lineHeight: 1.5, boxShadow: "0 10px 28px #000a", fontFamily: T.body }}>{def}</span>}
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
// Plain-language mode — a "Simpler English" toggle for the ESL cohort.
const PlainCtx = React.createContext(false);
function PT({ rich, plain }) { return React.useContext(PlainCtx) ? plain : rich; }
function usePlainMode() {
  const [plain, setPlain] = useState(() => { try { return localStorage.getItem("ff-plain") === "1"; } catch { return false; } });
  const toggle = () => setPlain((v) => { const nv = !v; try { localStorage.setItem("ff-plain", nv ? "1" : "0"); } catch {} return nv; });
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
  const [state, setState] = useState(() => initialState(DEFAULT_CFG));
  const [predLeak, setPredLeak] = useState(null);
  const [predBest, setPredBest] = useState(null);
  const [chosen, setChosen] = useState([]);
  const [result, setResult] = useState(null);
  const [records, setRecords] = useState([]);
  const [showInstructor, setShowInstructor] = useState(false);
  const [plain, togglePlain] = usePlainMode();

  const curLeaks = useMemo(() => leaks(state.rates, cfg.sessions, cfg), [state, cfg]);
  const curBottleneck = useMemo(() => bottleneckOf(curLeaks), [curLeaks]);
  const singles = useMemo(() => previewSingles(state, cfg), [state, cfg]);

  function start() { const s = initialState(cfg); setState(s); setRecords([]); resetQuarter(); setPhase("diagnose"); }
  function resetQuarter() { setPredLeak(null); setPredBest(null); setChosen([]); setResult(null); }
  function restart() { setRecords([]); setPhase("intro"); }

  function toAllocate() { setPhase("allocate"); }
  function toggleChoice(id) {
    setChosen((c) => {
      if (c.includes(id)) return c.filter((x) => x !== id);
      const cost = IMAP[id].cost;
      const spent = c.reduce((a, x) => a + IMAP[x].cost, 0);
      if (spent + cost > cfg.budget) return c;
      return [...c, id];
    });
  }
  function runQuarter() {
    const r = resolveQuarter(state, chosen, cfg);
    const bestActual = singles[0];
    const wasted = r.perInterventionROI.filter((x) => x.roi < 0.5).reduce((a, x) => a + x.cost, 0);
    const rec = {
      quarter: state.quarter,
      predLeak: STAGES.find((s) => s.key === predLeak)?.label || "—",
      actualLeak: curBottleneck.label, leakCorrect: predLeak === curBottleneck.stage,
      predBest: IMAP[predBest]?.name || "—", bestActual: bestActual?.name || "—", roiCorrect: predBest === bestActual?.id,
      allocations: chosen.map((id) => IMAP[id].name),
      spend: r.spend, purchases: r.purchases, revenue: r.revenue, grossProfit: r.grossProfit,
      cac: r.cac, ltvCac: r.ltvCac, wasted,
    };
    setRecords((p) => [...p, rec]);
    setResult(r); setState(r.newState); setPhase("result");
  }
  function nextQuarter() {
    if (state.quarter > cfg.quarters) { setPhase("end"); return; }
    resetQuarter(); setPhase("diagnose");
  }

  return (
   <PlainCtx.Provider value={plain}>
    <div style={{ minHeight: "100vh", background: T.ink, color: T.text, fontFamily: T.body }}>
      <style>{FONT_IMPORT + `
        * { box-sizing: border-box; }
        input[type=range]{ -webkit-appearance:none; appearance:none; height:6px; border-radius:6px; background:${T.track}; outline:none; }
        input[type=range]::-webkit-slider-thumb{ -webkit-appearance:none; appearance:none; width:20px; height:20px; border-radius:50%; cursor:pointer; background:var(--accent); border:2px solid #14110D; box-shadow:0 0 0 3px var(--accent-soft); }
        input[type=range]::-moz-range-thumb{ width:18px; height:18px; border-radius:50%; cursor:pointer; background:var(--accent); border:2px solid #14110D; }
        @keyframes rise { from{opacity:0; transform:translateY(10px)} to{opacity:1; transform:none} }
        @keyframes slideIn { from{transform:translateX(100%)} to{transform:none} }
        .rise{ animation:rise .5s cubic-bezier(.2,.7,.3,1) both; }
        .fbar{ transition: width .7s cubic-bezier(.2,.7,.3,1); }
        .recharts-cartesian-axis-tick text{ fill:${T.muted}; font-family:${T.mono}; font-size:11px; }
      `}</style>

      <Header phase={phase} state={state} cfg={cfg} records={records} plain={plain} togglePlain={togglePlain} onToggleInstructor={() => setShowInstructor((v) => !v)} />

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 20px 64px" }}>
        {phase === "intro" && <Intro onStart={start} cfg={cfg} />}
        {phase === "diagnose" && <Diagnose state={state} cfg={cfg} leaksArr={curLeaks} bottleneck={curBottleneck} predLeak={predLeak} setPredLeak={setPredLeak} predBest={predBest} setPredBest={setPredBest} singles={singles} onNext={toAllocate} />}
        {phase === "allocate" && <Allocate state={state} cfg={cfg} leaksArr={curLeaks} bottleneck={curBottleneck} predLeak={predLeak} chosen={chosen} toggleChoice={toggleChoice} onRun={runQuarter} />}
        {phase === "result" && result && <ResultView result={result} cfg={cfg} record={records[records.length - 1]} bestActual={singles[0]} onNext={nextQuarter} lastQuarter={state.quarter > cfg.quarters} />}
        {phase === "end" && <EndView records={records} state={state} cfg={cfg} restart={restart} />}
      </div>

      {showInstructor && <InstructorPanel cfg={cfg} setCfg={setCfg} defaults={DEFAULT_CFG} onClose={() => setShowInstructor(false)} />}
    </div>
   </PlainCtx.Provider>
  );
}

/* ---- HEADER ------------------------------------------------- */
function Header({ phase, state, cfg, records, plain, togglePlain, onToggleInstructor }) {
  const show = phase !== "intro";
  const spent = records.reduce((a, r) => a + r.spend, 0);
  return (
    <div style={{ borderBottom: `1px solid ${T.border}`, background: "#17130D", position: "sticky", top: 0, zIndex: 30 }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={{ fontFamily: T.display, fontWeight: 800, fontSize: 22, letterSpacing: -0.5 }}>Funnel <span style={{ color: PLAYER }}>Fixer</span></span>
          <span style={{ color: T.muted, fontSize: 13, fontFamily: T.mono }}>Chrichton · <Term term="cro">CRO</Term> diagnosis</span>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center", fontFamily: T.mono, fontSize: 13 }}>
          {show && <Stat label="QUARTER" value={`${Math.min(state.quarter, cfg.quarters)}/${cfg.quarters}`} accent={PLAYER} />}
          {show && <Stat label="CUM PROFIT" value={gbpK(state.cumProfit)} accent={state.cumProfit >= 0 ? T.pos : T.neg} />}
          {show && <Stat label="SPENT" value={gbpK(spent)} accent={T.instructor} />}
          <PlainToggle plain={plain} toggle={togglePlain} />
          <button onClick={onToggleInstructor} title="Instructor controls" style={{ background: T.panel2, border: `1px solid ${T.border}`, color: T.instructor, borderRadius: 9, padding: "7px 11px", cursor: "pointer", fontFamily: T.body, fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 15 }}>⚙</span> Instructor</button>
        </div>
      </div>
    </div>
  );
}
function Stat({ label, value, accent }) {
  return <div style={{ textAlign: "right" }}><div style={{ color: T.muted, fontSize: 10, letterSpacing: 1 }}>{label}</div><div style={{ color: accent || T.text, fontWeight: 700, fontSize: 15 }}>{value}</div></div>;
}

/* ---- INTRO -------------------------------------------------- */
function Intro({ onStart, cfg }) {
  return (
    <div className="rise" style={{ maxWidth: 760, margin: "44px auto 0" }}>
      <h1 style={{ fontFamily: T.display, fontWeight: 800, fontSize: 46, lineHeight: 1.05, letterSpacing: -1, margin: 0 }}>
        <PT rich={<>The funnel is leaking.<br /><span style={{ color: PLAYER }}>Where do you spend?</span></>}
            plain={<>Your checkout funnel is losing customers.<br /><span style={{ color: PLAYER }}>Choose where to invest.</span></>} />
      </h1>
      <p style={{ color: T.muted, fontSize: 16, lineHeight: 1.6, marginTop: 18 }}>
        Chrichton's e-commerce <Term term="funnel">funnel</Term> loses people at every step. You have a fixed budget each quarter and a menu of fixes.{" "}
        <PT rich={<>The trap: the biggest <i>percentage</i> gap is rarely the biggest <i>money</i> leak.</>}
            plain={<>The key point: the stage with the biggest percentage gap is usually NOT the stage that loses the most money.</>} />{" "}
        Diagnose with <Term term="opportunitysizing">opportunity sizing</Term>, spend where the £ is, and watch the <Term term="bottleneck">bottleneck</Term> move.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginTop: 22 }}>
        {[["①", "Diagnose", "Read the funnel and predict the biggest money leak — before you see the £ sizing."],
        ["②", "Allocate", "Spend the quarter's budget across fixes. You can't afford everything."],
        ["③", "Run", <>See purchases, profit, <Term term="cac">CAC</Term>, <Term term="ltvcac">LTV/CAC</Term> and the <Term term="roi">ROI</Term> of each spend.</>],
        ["④", "Move on", "The bottleneck jumps to a new stage. Re-diagnose. Repeat."]].map(([n, t, d]) => (
          <div key={t} style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: "13px 14px" }}>
            <div style={{ color: PLAYER, fontFamily: T.mono, fontSize: 13 }}>{n}</div>
            <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 15, margin: "3px 0 4px" }}>{t}</div>
            <div style={{ color: T.muted, fontSize: 12, lineHeight: 1.45 }}>{d}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 24, flexWrap: "wrap" }}>
        <button onClick={onStart} style={btn(PLAYER)}>Open the dashboard →</button>
        <span style={{ color: T.muted, fontSize: 13 }}>{cfg.quarters} quarters · {gbp(cfg.budget)}/quarter · seed <b style={{ color: T.text, fontFamily: T.mono }}>{cfg.seed}</b></span>
      </div>
      <LOBadges los={["LO1", "LO3"]} />
      <TermsHint />
    </div>
  );
}

/* ---- THE FUNNEL VISUAL -------------------------------------- */
function FunnelViz({ rates, sessions, leaksArr, bottleneckKey, showLeaks, predKey, compact }) {
  const vols = volumes(rates, sessions);
  const max = vols[0].count;
  const widthPct = (c) => Math.max(8, Math.sqrt(c / max) * 100);
  const leakByStage = Object.fromEntries(leaksArr.map((l) => [l.stage, l]));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? 3 : 5 }}>
      {vols.map((v, i) => {
        const leak = i > 0 ? leakByStage[v.key] : null;
        const isBott = leak && leak.stage === bottleneckKey;
        const isPred = leak && leak.stage === predKey;
        const barColor = i === 0 ? "#3a3executes" : isBott ? "#3a2018" : T.panel2;
        const border = isBott ? T.neg : isPred ? PLAYER : T.border;
        return (
          <div key={v.key}>
            {leak && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 11, color: T.muted, fontFamily: T.mono, padding: "1px 0" }}>
                <span style={{ color: leak.rate >= leak.bench ? T.pos : T.amber }}>↓ {pct(leak.rate, 0)}</span>
                <span style={{ opacity: 0.7 }}>bench {pct(leak.bench, 0)}</span>
                <span style={{ color: leak.gap > 0 ? T.neg : T.pos }}>{pp(leak.rate - leak.bench, 0)}</span>
                {showLeaks && leak.leak > 0 && <span style={{ color: isBott ? T.neg : T.muted, fontWeight: 700 }}>· {gbpK(leak.leak)} leak/qtr</span>}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div className="fbar" style={{ width: `${widthPct(v.count)}%`, minWidth: 120, background: i === 0 ? "#2a2418" : isBott ? "#33201a" : T.panel2, border: `1.5px solid ${border}`, borderRadius: 10, padding: compact ? "7px 14px" : "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontWeight: 700, fontSize: compact ? 12.5 : 13.5, whiteSpace: "nowrap" }}>{v.label}{isBott && <span style={{ color: T.neg, fontSize: 11, marginLeft: 6 }}>● bottleneck</span>}</span>
                <span style={{ fontFamily: T.mono, fontSize: compact ? 12 : 13, color: T.text }}>{Math.round(v.count).toLocaleString()}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---- DIAGNOSE (predict) ------------------------------------- */
function Diagnose({ state, cfg, leaksArr, bottleneck, predLeak, setPredLeak, predBest, setPredBest, singles, onNext }) {
  const available = singles; // already filtered to non-deployed
  const ready = predLeak != null && predBest != null;
  return (
    <div className="rise" style={{ marginTop: 22 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: T.mono, color: PLAYER, fontSize: 13 }}>QUARTER {state.quarter}</span>
        <h2 style={{ fontFamily: T.display, fontWeight: 800, fontSize: 28, letterSpacing: -0.5, margin: 0 }}>Diagnose the funnel</h2>
      </div>
      <p style={{ color: T.muted, fontSize: 14.5, lineHeight: 1.55, marginTop: 8, maxWidth: 820 }}>
        Here's where Chrichton stands against benchmark. Before you see the £ sizing, back your read: which stage is the biggest <b style={{ color: T.text }}>money</b> leak, and which single fix has the best <Term term="roi">ROI</Term>?
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.15fr) minmax(0,1fr)", gap: 18, marginTop: 12 }}>
        <div style={card()}>
          <SectionTitle>Chrichton funnel — this quarter</SectionTitle>
          <FunnelViz rates={state.rates} sessions={cfg.sessions} leaksArr={leaksArr} bottleneckKey={null} predKey={predLeak} showLeaks={false} />
          <p style={{ color: T.muted, fontSize: 12, marginTop: 12, lineHeight: 1.5 }}>Each band's width is its volume. The arrows show the conversion rate into that stage vs benchmark. <b style={{ color: T.text }}>The £ leak is hidden</b> — that's your job to predict.</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={card()}>
            <SectionTitle>1 · Biggest money leak?</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {STAGES.map((s) => {
                const l = leaksArr.find((x) => x.stage === s.key);
                return <button key={s.key} onClick={() => setPredLeak(s.key)} style={{ ...pickRow(predLeak === s.key), display: "flex", justifyContent: "space-between" }}><span>{s.label}</span><span style={{ fontFamily: T.mono, fontSize: 12, color: T.muted }}>{pct(l.rate, 0)} vs {pct(l.bench, 0)}</span></button>;
              })}
            </div>
          </div>
          <div style={card()}>
            <SectionTitle>2 · Best-ROI single fix?</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 230, overflowY: "auto" }}>
              {available.map((p) => <button key={p.id} onClick={() => setPredBest(p.id)} style={{ ...pickRow(predBest === p.id), display: "flex", justifyContent: "space-between", gap: 8 }}><span>{IMAP[p.id].icon} {p.name}</span><span style={{ fontFamily: T.mono, fontSize: 12, color: T.muted }}>{gbp(p.cost)}</span></button>)}
            </div>
          </div>
        </div>
      </div>
      <div style={{ textAlign: "right", marginTop: 18 }}>
        <button onClick={onNext} disabled={!ready} style={{ ...btn(PLAYER), opacity: ready ? 1 : 0.45, cursor: ready ? "pointer" : "not-allowed" }}>{ready ? "Reveal the money leaks & allocate →" : "Make both predictions to continue"}</button>
      </div>
    </div>
  );
}

/* ---- ALLOCATE ----------------------------------------------- */
function Allocate({ state, cfg, leaksArr, bottleneck, predLeak, chosen, toggleChoice, onRun }) {
  const spent = chosen.reduce((a, id) => a + IMAP[id].cost, 0);
  const remaining = cfg.budget - spent;
  const predHit = predLeak === bottleneck.stage;
  return (
    <div className="rise" style={{ marginTop: 22 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: T.mono, color: PLAYER, fontSize: 13 }}>QUARTER {state.quarter}</span>
        <h2 style={{ fontFamily: T.display, fontWeight: 800, fontSize: 28, letterSpacing: -0.5, margin: 0 }}>Allocate the budget</h2>
      </div>
      <div style={{ marginTop: 10, background: predHit ? "#1f2e18" : "#2e2418", border: `1px solid ${predHit ? T.pos : T.amber}55`, borderRadius: 11, padding: "12px 15px", fontSize: 13.5, lineHeight: 1.5 }}>
        {predHit ? "✓" : "✗"} The biggest <Term term="opportunitysizing">money leak</Term> is <b style={{ color: T.neg }}>{bottleneck.label}</b> ({gbpK(bottleneck.leak)}/quarter) — you predicted <b>{STAGES.find((s) => s.key === predLeak)?.label}</b>. Notice it's not always the biggest % gap.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.1fr)", gap: 18, marginTop: 14 }}>
        <div style={card()}>
          <SectionTitle>The money leak per stage</SectionTitle>
          <FunnelViz rates={state.rates} sessions={cfg.sessions} leaksArr={leaksArr} bottleneckKey={bottleneck.stage} showLeaks={true} />
        </div>
        <div style={card()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <SectionTitle>Choose your fixes</SectionTitle>
            <div style={{ textAlign: "right" }}><div style={{ fontSize: 11, color: T.muted }}>budget left</div><div style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 17, color: remaining < 0 ? T.neg : remaining < cfg.budget * 0.2 ? T.amber : T.pos }}>{gbp(remaining)}</div></div>
          </div>
          <div style={{ height: 7, background: T.track, borderRadius: 7, overflow: "hidden", marginBottom: 14 }}><div style={{ width: `${Math.min(100, (spent / cfg.budget) * 100)}%`, height: "100%", background: PLAYER, transition: "width .3s" }} /></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {INTERVENTIONS.map((iv) => {
              const deployed = iv.type === "rate" && state.deployed.includes(iv.id);
              const on = chosen.includes(iv.id);
              const afford = on || spent + iv.cost <= cfg.budget;
              const disabled = deployed || (!on && !afford);
              return (
                <button key={iv.id} onClick={() => !deployed && toggleChoice(iv.id)} disabled={disabled} style={{ textAlign: "left", cursor: disabled ? "not-allowed" : "pointer", background: on ? T.sel : T.panel2, border: `1.5px solid ${on ? PLAYER : T.border}`, opacity: disabled && !on ? 0.5 : 1, borderRadius: 12, padding: "11px 13px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 13.5 }}>{iv.icon} {iv.name} {deployed && <span style={{ color: T.pos, fontSize: 11 }}>✓ deployed</span>}{iv.type === "acq" && <span style={{ color: T.amber, fontSize: 10, fontFamily: T.mono }}> ongoing</span>}{iv.marginCut && <span style={{ color: T.neg, fontSize: 10, fontFamily: T.mono }}> margin cut</span>}</span>
                    <span style={{ fontFamily: T.mono, fontSize: 12.5, color: on ? PLAYER : T.muted }}>{gbp(iv.cost)}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: T.muted, marginTop: 3, lineHeight: 1.4 }}>{iv.blurb}</div>
                </button>
              );
            })}
          </div>
          <button onClick={onRun} disabled={chosen.length === 0} style={{ ...btn(PLAYER), width: "100%", marginTop: 14, opacity: chosen.length ? 1 : 0.45, cursor: chosen.length ? "pointer" : "not-allowed" }}>{chosen.length ? `Run quarter ${state.quarter} ▸` : "Pick at least one fix"}</button>
        </div>
      </div>
    </div>
  );
}

/* ---- RESULT ------------------------------------------------- */
function ResultView({ result, cfg, record, bestActual, onNext, lastQuarter }) {
  const r = result;
  const dPurch = r.purchases - r.purchasesBefore;
  const roiSorted = [...r.perInterventionROI].sort((a, b) => b.roi - a.roi);
  const maxRoi = Math.max(1, ...roiSorted.map((x) => Math.abs(x.roi)));
  return (
    <div className="rise" style={{ marginTop: 22 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: T.mono, color: PLAYER, fontSize: 13 }}>QUARTER {record.quarter} RESULT</span>
        <h2 style={{ fontFamily: T.display, fontWeight: 800, fontSize: 26, letterSpacing: -0.5, margin: 0 }}>{dPurch >= 0 ? `+${Math.round(dPurch)}` : Math.round(dPurch)} purchases this quarter</h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 18, marginTop: 14 }}>
        <div style={card()}>
          <SectionTitle>The funnel after your fixes</SectionTitle>
          <FunnelViz rates={r.afterRates} sessions={r.sessions} leaksArr={r.leaks} bottleneckKey={r.bottleneck.stage} showLeaks={true} compact />
          <div style={{ marginTop: 12, background: T.panel2, borderRadius: 10, padding: "11px 13px", fontSize: 12.5, lineHeight: 1.5 }}>
            🔧 The bottleneck is now <b style={{ color: T.neg }}>{r.bottleneck.label}</b> ({gbpK(r.bottleneck.leak)}/qtr). <Term term="theoryofconstraints">Fix one stage and the constraint moves</Term> — re-diagnose next quarter.
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={card()}>
            <SectionTitle>Quarter P&L</SectionTitle>
            {[["Purchases", Math.round(r.purchases).toLocaleString(), T.text],
            ["Revenue", gbp(r.revenue), T.text],
            [`Gross margin (${pct(r.effMargin, 0)})`, gbp(r.revenue * r.effMargin), r.effMargin < cfg.margin ? T.neg : T.muted],
            ["– Spend", "-" + gbp(r.spend), T.muted]].map(([k, v, c]) => <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${T.border}`, fontSize: 13.5 }}><span style={{ color: T.muted }}>{k}</span><span style={{ fontFamily: T.mono, color: c }}>{v}</span></div>)}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "11px 0 2px", fontSize: 16, fontWeight: 700 }}><span>Gross profit</span><span style={{ fontFamily: T.mono, color: r.grossProfit >= 0 ? T.pos : T.neg }}>{gbp(r.grossProfit)}</span></div>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <MiniStat label={<Term term="cac">CAC</Term>} value={r.cac > 0 ? gbp(r.cac) : "—"} sub={r.acqSpend > 0 ? "per acquired customer" : "no paid acquisition"} accent={T.instructor} />
              <MiniStat label={<Term term="ltvcac">LTV / CAC</Term>} value={isFinite(r.ltvCac) ? r.ltvCac.toFixed(1) + "×" : "organic"} sub={isFinite(r.ltvCac) ? (r.ltvCac >= 3 ? "healthy" : "below 3 — unhealthy") : "all organic"} accent={!isFinite(r.ltvCac) ? T.pos : r.ltvCac >= 3 ? T.pos : T.neg} />
            </div>
          </div>
          <div style={card()}>
            <SectionTitle>ROI of each spend</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {roiSorted.map((x) => (
                <div key={x.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}><span>{x.icon} {x.name}</span><span style={{ fontFamily: T.mono, color: x.roi >= 1 ? T.pos : x.roi >= 0.3 ? T.amber : T.neg }}>{x.roi.toFixed(2)}× · {gbp(x.incrProfit)}</span></div>
                  <div style={{ height: 8, background: T.track, borderRadius: 8, overflow: "hidden" }}><div style={{ width: `${Math.min(100, (Math.max(0, x.roi) / maxRoi) * 100)}%`, height: "100%", background: x.roi >= 1 ? T.pos : x.roi >= 0.3 ? T.amber : T.neg }} /></div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <ScoreChip ok={record.leakCorrect} label="Biggest leak" you={record.predLeak} truth={record.actualLeak} />
              <ScoreChip ok={record.roiCorrect} label="Best-ROI bet" you={record.predBest} truth={bestActual?.name} />
            </div>
          </div>
        </div>
      </div>
      <div style={{ textAlign: "center", marginTop: 20 }}>
        <button onClick={onNext} style={btn(PLAYER)}>{lastQuarter ? "See the full debrief →" : `Plan quarter ${record.quarter + 1} →`}</button>
      </div>
    </div>
  );
}
function ScoreChip({ ok, label, you, truth }) {
  return (
    <div style={{ background: ok ? "#1f2e18" : "#2e2418", border: `1px solid ${ok ? T.pos : T.amber}55`, borderRadius: 10, padding: "9px 11px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: T.muted, marginBottom: 3 }}><span>{label}</span><span style={{ color: ok ? T.pos : T.amber, fontWeight: 700 }}>{ok ? "✓" : "✗"}</span></div>
      <div style={{ fontSize: 12 }}>You: <b>{you}</b></div>
      {!ok && <div style={{ fontSize: 11.5, color: T.muted }}>Actual: {truth}</div>}
    </div>
  );
}

/* ---- END / DEBRIEF ------------------------------------------ */
function EndView({ records, state, cfg, restart }) {
  const leakHits = records.filter((r) => r.leakCorrect).length;
  const roiHits = records.filter((r) => r.roiCorrect).length;
  const chartData = records.map((r) => ({ q: "Q" + r.quarter, profit: Math.round(r.grossProfit), ltvCac: isFinite(r.ltvCac) ? +r.ltvCac.toFixed(2) : null }));
  const cards = [
    { t: "Size it in money, not %", b: `You called the biggest money leak ${leakHits}/${records.length} times. The biggest percentage gap (checkout→purchase) is a smaller £ leak than the high-volume add-to-cart stage — opportunity sizing, not gut, finds the real fix.` },
    { t: "The moving bottleneck", b: `Every fix shifts the binding constraint to the next stage (Theory of Constraints). A good quarter two looks nothing like quarter one — you re-diagnosed each round rather than repeating the same bet.` },
    { t: "The leaky bucket", b: `Buying traffic before fixing conversion just pours more sessions through the holes — CAC climbs and LTV/CAC sinks below 3. Acquisition only pays once the funnel converts.` },
    { t: "The margin trap", b: `Free shipping lifts conversion but cuts margin on every order, for good. A “winning” quarter on purchases can still shrink profit — always read the P&L, not just the funnel.` },
  ];
  return (
    <div className="rise" style={{ marginTop: 24 }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ color: T.muted, fontFamily: T.mono, fontSize: 12, letterSpacing: 2 }}>CHRICHTON · SEED {cfg.seed}</div>
        <h1 style={{ fontFamily: T.display, fontWeight: 800, fontSize: 38, margin: "6px 0", letterSpacing: -0.5 }}>{gbp(state.cumProfit)} cumulative profit</h1>
        <div style={{ color: T.muted }}>Over {records.length} quarters · biggest-leak called <b style={{ color: PLAYER }}>{leakHits}/{records.length}</b> · best-ROI bet <b style={{ color: PLAYER }}>{roiHits}/{records.length}</b></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr)", gap: 18 }}>
        <div style={card()}>
          <SectionTitle>Profit per quarter</SectionTitle>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -6 }}>
              <CartesianGrid stroke={T.border} strokeDasharray="3 3" /><XAxis dataKey="q" tickLine={false} /><YAxis tickFormatter={(v) => gbpK(v)} tickLine={false} width={50} />
              <Tooltip contentStyle={tip} formatter={(v) => gbp(v)} /><ReferenceLine y={0} stroke={T.faint} />
              <Line type="monotone" dataKey="profit" stroke={PLAYER} strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={card()}>
          <SectionTitle><Term term="ltvcac">LTV / CAC</Term> trajectory</SectionTitle>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
              <CartesianGrid stroke={T.border} strokeDasharray="3 3" /><XAxis dataKey="q" tickLine={false} /><YAxis tickLine={false} width={36} domain={[0, "auto"]} />
              <Tooltip contentStyle={tip} formatter={(v) => v + "×"} /><ReferenceLine y={3} stroke={T.pos} strokeDasharray="5 4" label={{ value: "healthy ≥3", fill: T.pos, fontSize: 10, position: "insideTopRight" }} />
              <Line type="monotone" dataKey="ltvCac" stroke={T.instructor} strokeWidth={3} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ fontSize: 11.5, color: T.muted, marginTop: 6 }}>Quarters with no paid acquisition are organic (no CAC) and omitted from the line.</div>
        </div>
      </div>

      <div style={{ ...card(), marginTop: 18 }}>
        <SectionTitle>What this taught</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 12 }}>
          {cards.map((c) => <div key={c.t} style={{ background: T.panel2, borderRadius: 11, padding: "14px 15px", border: `1px solid ${T.border}` }}><div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 15, marginBottom: 6, color: PLAYER }}>{c.t}</div><div style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>{c.b}</div></div>)}
        </div>
      </div>

      <div style={{ ...card(), marginTop: 18, textAlign: "center" }}>
        <SectionTitle>Take your diagnosis log into class</SectionTitle>
        <p style={{ color: T.muted, fontSize: 13, lineHeight: 1.5, maxWidth: 580, margin: "0 auto 16px" }}>Per quarter: diagnosis & prediction, allocations, before/after, purchases/revenue/profit, CAC, LTV/CAC, per-intervention ROI and wasted spend — plus reflection prompts.</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => downloadFile(`funnel-fixer-${cfg.seed}.csv`, buildCSV(records, cfg), "text/csv")} style={btn(T.instructor)}>⬇ Download CSV</button>
          <button onClick={() => downloadFile(`funnel-fixer-${cfg.seed}.md`, buildMarkdown(records, cfg, state.cumProfit), "text/markdown")} style={{ ...btn("transparent"), color: T.text, border: `1px solid ${T.border}` }}>⬇ Download Markdown</button>
        </div>
      </div>
      <div style={{ textAlign: "center", marginTop: 22 }}><button onClick={restart} style={btn(PLAYER)}>Run it again ↺</button></div>
    </div>
  );
}

/* ---- INSTRUCTOR PANEL --------------------------------------- */
function InstructorPanel({ cfg, setCfg, defaults, onClose }) {
  const set = (patch) => setCfg((c) => ({ ...c, ...patch }));
  const setRate = (k, v) => setCfg((c) => ({ ...c, rates: { ...c.rates, [k]: v } }));
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
          <p style={{ color: T.muted, fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>Economic settings apply to the next quarter resolved; starting rates and seed apply on a <b style={{ color: T.text }}>new game</b>. A shared seed gives the cohort an identical run.</p>

          <PanelGroup title="Classroom">
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Seed</div>
              <div style={{ display: "flex", gap: 6 }}>
                <input value={cfg.seed} onChange={(e) => set({ seed: e.target.value })} style={{ flex: 1, background: T.panel, border: `1px solid ${T.border}`, color: T.text, borderRadius: 8, padding: "8px 10px", fontFamily: T.mono, fontSize: 13, outline: "none" }} />
                <button onClick={() => set({ seed: "FNL-" + Math.random().toString(36).slice(2, 7).toUpperCase() })} style={{ ...presetBtn, padding: "8px 10px" }}>🎲</button>
              </div>
            </div>
            <ISlide label="Budget / quarter" A={A} v={cfg.budget} min={4000} max={40000} step={1000} fmt={gbp} on={(v) => set({ budget: v })} ch={cfg.budget !== defaults.budget} />
            <ISlide label="Quarters" A={A} v={cfg.quarters} min={2} max={8} step={1} fmt={(v) => v} on={(v) => set({ quarters: v })} ch={cfg.quarters !== defaults.quarters} />
          </PanelGroup>

          <PanelGroup title="Unit economics">
            <ISlide label="Sessions / quarter" A={A} v={cfg.sessions} min={20000} max={200000} step={5000} fmt={(v) => (v / 1000) + "k"} on={(v) => set({ sessions: v })} ch={cfg.sessions !== defaults.sessions} />
            <ISlide label={<Term term="aov">AOV</Term>} A={A} v={cfg.aov} min={15} max={120} step={1} fmt={gbp} on={(v) => set({ aov: v })} ch={cfg.aov !== defaults.aov} />
            <ISlide label="Gross margin" A={A} v={cfg.margin} min={0.15} max={0.8} step={0.01} fmt={(v) => pct(v, 0)} on={(v) => set({ margin: v })} ch={cfg.margin !== defaults.margin} />
            <ISlide label="Repeat factor (LTV)" A={A} v={cfg.repeat} min={0} max={2} step={0.1} fmt={(v) => v.toFixed(1) + "×"} on={(v) => set({ repeat: v })} ch={cfg.repeat !== defaults.repeat} />
            <ISlide label="Mobile share" A={A} v={cfg.mobileShare} min={0.2} max={0.9} step={0.05} fmt={(v) => pct(v, 0)} on={(v) => set({ mobileShare: v })} ch={cfg.mobileShare !== defaults.mobileShare} />
          </PanelGroup>

          <PanelGroup title="Starting funnel rates" note="Applies on a new game. Benchmarks stay fixed as the diagnostic target.">
            {STAGES.map((s) => <ISlide key={s.key} label={s.label} A={A} v={cfg.rates[s.key]} min={0.03} max={cfg.benchmarks[s.key]} step={0.01} fmt={(v) => pct(v, 0)} on={(v) => setRate(s.key, v)} ch={cfg.rates[s.key] !== defaults.rates[s.key]} />)}
          </PanelGroup>

          <PanelGroup title="Teaching presets — one tap">
            <div style={{ display: "grid", gap: 8 }}>
              {preset("🔝 Top-heavy leak", { rates: { ...defaults.rates, view: 0.42, atc: 0.06 } })}
              {preset("🛒 Abandonment crisis", { rates: { ...defaults.rates, checkout: 0.36, purchase: 0.42 } })}
              {preset("💷 Tight budget (£8k)", { budget: 8000 })}
              {preset("📣 Cheap-traffic temptation", { aov: 70, margin: 0.58 })}
              {preset("🎲 Low noise (clean signal)", { noise: 0.02 })}
              {preset("↺ Reset funnel & economics", { rates: { ...defaults.rates }, budget: defaults.budget, aov: defaults.aov, margin: defaults.margin, sessions: defaults.sessions, noise: defaults.noise })}
            </div>
          </PanelGroup>

          <button onClick={() => setCfg(defaults)} style={{ width: "100%", marginTop: 12, background: "transparent", color: T.muted, border: `1px solid ${T.border}`, borderRadius: 10, padding: "11px", cursor: "pointer", fontFamily: T.body, fontWeight: 600, fontSize: 13 }}>↺ Reset all to defaults</button>
        </div>
      </div>
    </>
  );
}

/* ---- atoms -------------------------------------------------- */
function SectionTitle({ children }) { return <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 16.5, marginBottom: 13, letterSpacing: -0.2 }}>{children}</div>; }
function MiniStat({ label, value, sub, accent }) {
  return <div style={{ flex: 1, background: T.panel2, borderRadius: 10, padding: "11px 12px" }}><div style={{ color: T.muted, fontSize: 11 }}>{label}</div><div style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 18, color: accent, margin: "2px 0" }}>{value}</div><div style={{ color: T.muted, fontSize: 10.5, lineHeight: 1.3 }}>{sub}</div></div>;
}
function PanelGroup({ title, note, children }) {
  return <div style={{ marginTop: 18 }}><div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 13, letterSpacing: 0.3, textTransform: "uppercase", color: T.muted, marginBottom: 10 }}>{title}</div>{note && <div style={{ fontSize: 11.5, color: T.muted, marginTop: -4, marginBottom: 10, lineHeight: 1.4 }}>{note}</div>}{children}</div>;
}
function ISlide({ label, v, min, max, step, fmt, on, A, ch }) {
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><span style={{ fontSize: 13, fontWeight: 500 }}>{label}{ch && <span style={{ color: A, marginLeft: 5 }}>•</span>}</span><span style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 13, color: A }}>{fmt(v)}</span></div>
      <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => on(Number(e.target.value))} style={{ width: "100%", marginTop: 7, "--accent": A, "--accent-soft": A + "30" }} />
    </div>
  );
}
const presetBtn = { textAlign: "left", background: T.panel2, border: `1px solid ${T.border}`, color: T.text, borderRadius: 9, padding: "9px 11px", cursor: "pointer", fontFamily: T.body, fontSize: 12.5, lineHeight: 1.3 };
const tip = { background: T.panel, border: `1px solid ${T.border}`, borderRadius: 8, fontFamily: T.mono, fontSize: 12 };
const card = () => ({ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20 });
const btn = (c) => ({ background: c, color: c === "transparent" ? T.text : T.onAccent, border: "none", borderRadius: 11, padding: "13px 22px", fontFamily: T.body, fontWeight: 700, fontSize: 15, cursor: "pointer", letterSpacing: 0.2 });
const pickRow = (on) => ({ textAlign: "left", cursor: "pointer", color: T.text, background: on ? T.sel : T.panel2, border: `1.5px solid ${on ? PLAYER : T.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 13, fontWeight: 600 });
