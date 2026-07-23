import React, { useState, useMemo } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea, Brush } from "recharts";
import {
  DIMENSIONS, DMAP, REPORTS, CAUSE_TYPES, CASES, GLOSSARY, TOTAL_DAYS, EARLY_WINDOW, FUNNEL_STAGES,
  generateCase, buildCrossTab, buildFunnel, realtimeSnapshot, precedingPeriod, summariseSegments, summariseTopline, scoreDiagnosis, avgRange,
  gbp, pct, pp, dayShort, dayLong,
} from "../engine/engine.js";

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Lato:ital,wght@0,300;0,400;0,700;0,900;1,400&family=JetBrains+Mono:wght@500;700&display=swap');
`;
const T = {
  ink: "#171519", panel: "#211F25", panel2: "#2A2731", border: "#3B3843",
  text: "#F5F4F6", muted: "#A5A3AB", pos: "#7DCB6A", neg: "#E2654E", amber: "#FBB034",
  player: "#F47920", instructor: "#BFA98C", sel: "#2C2933", track: "#343039", faint: "#8D8B93", onAccent: "#211F25",
  display: "'Fraunces', 'Lato', serif", body: "'Lato', 'Helvetica Neue', sans-serif", mono: "'JetBrains Mono', monospace",
};
const PLAYER = T.player;
const SEG_COLORS = ["#FBB034", "#3FB6A8", "#E2654E", "#9B8Fb0", "#7DCB6A", "#C9A06A"];

function Term({ term, children }) {
  const [open, setOpen] = useState(false);
  const def = GLOSSARY[term];
  if (!def) return <span>{children}</span>;
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }} style={{ borderBottom: `1px dotted ${T.muted}`, cursor: "help" }}>{children}</span>
      {open && <span onClick={(e) => e.stopPropagation()} style={{ position: "absolute", bottom: "135%", left: 0, zIndex: 60, width: 240, fontWeight: 400, background: "#131118", border: `1px solid ${T.instructor}66`, borderRadius: 8, padding: "9px 11px", fontSize: 11.5, color: T.text, lineHeight: 1.5, boxShadow: "0 10px 28px #000a", fontFamily: T.body }}>{def}</span>}
    </span>
  );
}
// Signals that dotted-underline words are clickable — the tooltips are the
// best ESL feature but nothing otherwise says they can be tapped.
function TermsHint() {
  return (
    <div style={{ marginTop: 14, fontSize: 12.5, color: T.muted, display: "flex", alignItems: "center", gap: 7 }}>
      <span style={{ fontSize: 14 }}>💡</span>
      <span>Tip: any word with a <span style={{ borderBottom: `1px dotted ${T.muted}` }}>dotted underline</span> is clickable — tap it for a plain-English definition.</span>
    </div>
  );
}

// Plain-language mode: a "Simpler English" toggle that swaps stylised
// flavour strings for literal ones — helps the ESL portion of the cohort
// without flattening the tone for everyone. <PT rich plain/> picks per string.
const PlainCtx = React.createContext(false);
function PT({ rich, plain }) { return React.useContext(PlainCtx) ? plain : rich; }
function usePlainMode() {
  const [plain, setPlain] = useState(() => { try { return localStorage.getItem("dd-plain") === "1"; } catch { return false; } });
  const toggle = () => setPlain((v) => { const nv = !v; try { localStorage.setItem("dd-plain", nv ? "1" : "0"); } catch {} return nv; });
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

const initialDiagnosis = () => ({ dimension: null, segment: null, secondary: null, segmentB: null, causeType: null, startDay: Math.floor(TOTAL_DAYS / 2) });

export default function App() {
  const [caseIndex, setCaseIndex] = useState(0);
  const [cfg, setCfg] = useState({ seed: "DD-2026", noise: 1.4 });
  const [caseData, setCaseData] = useState(() => generateCase(CASES[0].id, cfg.seed, { noise: cfg.noise }));
  const [phase, setPhase] = useState("intro");
  const [metric, setMetric] = useState("conversionRate");
  const [activeReport, setActiveReport] = useState("home");   // "home" | "realtime" | "funnel" | dim key
  const [log, setLog] = useState([]);                          // reports + pivots visited (for the trail)
  const [diagnosis, setDiagnosis] = useState(initialDiagnosis);
  const [result, setResult] = useState(null);
  const [showInstructor, setShowInstructor] = useState(false);
  const [curWindow, setCurWindow] = useState([TOTAL_DAYS - 7, TOTAL_DAYS - 1]); // current date range (last 7 days)
  const [cmpMode, setCmpMode] = useState("first");            // "first" week | "preceding" period
  const cmpWindow = cmpMode === "first" ? [0, 6] : precedingPeriod(curWindow);

  function regenerate(newCfg, newCaseIndex) {
    const c = newCfg || cfg;
    const idx = newCaseIndex ?? caseIndex;
    setCfg(c); setCaseIndex(idx); setCaseData(generateCase(CASES[idx].id, c.seed, { noise: c.noise }));
    setPhase("intro"); setActiveReport("home"); setLog([]); setDiagnosis(initialDiagnosis()); setResult(null); setMetric("conversionRate");
    setCurWindow([TOTAL_DAYS - 7, TOTAL_DAYS - 1]); setCmpMode("first");
  }
  function selectCase(idx) { regenerate(cfg, idx); }
  function openReport(key) { setActiveReport(key); if (key !== "home") setLog((l) => (l.includes(key) ? l : [...l, key])); }
  function logPivot(primary, sec) { if (sec) setLog((l) => { const t = `${primary}×${sec}`; return l.includes(t) ? l : [...l, t]; }); }
  function submitDiagnosis() {
    const score = scoreDiagnosis(diagnosis, caseData.truth);
    setResult(score); setPhase("reveal");
  }

  const reportsViewed = log.filter((x) => !x.includes("×"));
  const pivotsUsed = log.filter((x) => x.includes("×"));
  const [plain, togglePlain] = usePlainMode();

  return (
   <PlainCtx.Provider value={plain}>
    <div style={{ minHeight: "100vh", background: T.ink, color: T.text, fontFamily: T.body }}>
      <style>{FONT_IMPORT + `
        * { box-sizing: border-box; }
        input[type=range]{ -webkit-appearance:none; appearance:none; height:6px; border-radius:6px; background:${T.track}; outline:none; }
        input[type=range]::-webkit-slider-thumb{ -webkit-appearance:none; appearance:none; width:20px; height:20px; border-radius:50%; cursor:pointer; background:var(--accent); border:2px solid #171519; box-shadow:0 0 0 3px var(--accent-soft); }
        input[type=range]::-moz-range-thumb{ width:18px; height:18px; border-radius:50%; cursor:pointer; background:var(--accent); border:2px solid #171519; }
        @keyframes rise { from{opacity:0; transform:translateY(10px)} to{opacity:1; transform:none} }
        @keyframes slideIn { from{transform:translateX(100%)} to{transform:none} }
        .rise{ animation:rise .5s cubic-bezier(.2,.7,.3,1) both; }
        .recharts-cartesian-axis-tick text{ fill:${T.muted}; font-family:${T.mono}; font-size:11px; }
      `}</style>

      <Header phase={phase} caseData={caseData} reportsViewed={reportsViewed} pivotsUsed={pivotsUsed} plain={plain} togglePlain={togglePlain} onToggleInstructor={() => setShowInstructor((v) => !v)} />

      <div style={{ maxWidth: phase === "investigate" ? 1380 : 1180, margin: "0 auto", padding: "0 20px 64px" }}>
        {phase === "intro" && <Intro caseData={caseData} cfg={cfg} caseIndex={caseIndex} onSelectCase={selectCase} onStart={() => { setPhase("investigate"); setActiveReport("home"); }} />}
        {phase === "investigate" && (
          <Investigate caseData={caseData} metric={metric} setMetric={setMetric} activeReport={activeReport} openReport={openReport}
            onPivot={logPivot} reportsViewed={reportsViewed} pivotsUsed={pivotsUsed} onDiagnose={() => setPhase("diagnose")}
            curWindow={curWindow} setCurWindow={setCurWindow} cmpWindow={cmpWindow} cmpMode={cmpMode} setCmpMode={setCmpMode} />
        )}
        {phase === "diagnose" && (
          <Diagnose caseData={caseData} diagnosis={diagnosis} setDiagnosis={setDiagnosis}
            onBack={() => setPhase("investigate")} onSubmit={submitDiagnosis} />
        )}
        {phase === "reveal" && result && <Reveal caseData={caseData} diagnosis={diagnosis} result={result} reportsViewed={reportsViewed} pivotsUsed={pivotsUsed} onRestart={() => regenerate(cfg)} />}
      </div>

      {showInstructor && <InstructorPanel cfg={cfg} onApply={regenerate} onClose={() => setShowInstructor(false)} />}
    </div>
   </PlainCtx.Provider>
  );
}

/* ---- HEADER --------------------------------------------------- */
function Header({ phase, caseData, reportsViewed, pivotsUsed, plain, togglePlain, onToggleInstructor }) {
  const show = phase !== "intro";
  const wide = phase === "investigate";
  return (
    <div style={{ borderBottom: `1px solid ${T.border}`, background: "#1A181D", position: "sticky", top: 0, zIndex: 30 }}>
      <div style={{ maxWidth: wide ? 1380 : 1180, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={{ fontFamily: T.display, fontWeight: 700, fontSize: 22, letterSpacing: -0.5 }}>Data <span style={{ color: PLAYER }}>Detective</span></span>
          <span style={{ color: T.muted, fontSize: 13, fontFamily: T.mono }}>Chrichton · root-cause diagnosis</span>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center", fontFamily: T.mono, fontSize: 13 }}>
          {show && <Stat label="CASE" value={`${caseData.n}`} accent={PLAYER} />}
          {(phase === "investigate" || phase === "diagnose") && <Stat label="REPORTS" value={`${(reportsViewed || []).length}`} accent={T.instructor} />}
          {(phase === "investigate" || phase === "diagnose") && <Stat label="PIVOTS" value={`${(pivotsUsed || []).length}`} accent={T.instructor} />}
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

/* ---- INTRO / TICKET --------------------------------------------- */
const DIFFICULTY_COLOR = { Standard: T.pos, Advanced: T.neg, Expert: T.amber };
function Intro({ caseData, cfg, caseIndex, onSelectCase, onStart }) {
  const t = caseData.ticket;
  return (
    <div className="rise" style={{ maxWidth: 720, margin: "44px auto 0" }}>
      <h1 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 44, lineHeight: 1.08, letterSpacing: -1, margin: 0 }}>
        <PT rich={<>Something's wrong with the numbers.<br /><span style={{ color: PLAYER }}>Find out what.</span></>}
            plain={<>A number has changed.<br /><span style={{ color: PLAYER }}>Find out why.</span></>} />
      </h1>
      <p style={{ color: T.muted, fontSize: 16, lineHeight: 1.6, marginTop: 18 }}>
        Chrichton's <Term term="cro">CRO</Term> team gets a ticket like this most weeks. Your job: open the dashboard, use{" "}
        <Term term="segmentation">segmentation</Term> to find where the <Term term="anomaly">anomaly</Term> really is. Then submit a
        diagnosis: the dimension, the segment, the likely cause, and roughly when it started. Watch for events that{" "}
        <PT rich={<><i>look</i> related but are really a <Term term="redherring">red herring</Term>.</>}
            plain={<>look related but are not the real cause (a <Term term="redherring">red herring</Term>).</>} />
      </p>
      <LOBadges los={["LO3"]} />
      <TermsHint />

      <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
        {CASES.map((c, i) => (
          <button key={c.id} onClick={() => onSelectCase(i)} style={{ ...pillBtn(caseIndex === i), display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 7, height: 7, borderRadius: 7, background: DIFFICULTY_COLOR[c.difficulty] || T.muted }} />
            Case {c.n} · {c.difficulty}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 14, background: "#131118", border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", color: T.muted, fontSize: 12, fontFamily: T.mono, marginBottom: 8 }}>
          <span>{t.channel}</span><span>{t.from}</span>
        </div>
        <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 17, marginBottom: 6 }}>{t.subject}</div>
        <div style={{ color: T.text, fontSize: 14, lineHeight: 1.55 }}>{t.body}</div>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 22, flexWrap: "wrap" }}>
        <button onClick={onStart} style={btn(PLAYER)}>Open the dashboard →</button>
        <span style={{ color: T.muted, fontSize: 13 }}>Case {caseData.n} of {CASES.length} · seed <b style={{ color: T.text, fontFamily: T.mono }}>{cfg.seed}</b></span>
      </div>
    </div>
  );
}

/* ---- shared chart helpers --------------------------------------- */
const secs = (v) => `${Math.round(v)}s`;
const num = (v) => Math.round(v).toLocaleString();
const METRICS = [
  { id: "conversionRate", label: "Conversion rate", fmt: (v) => pct(v, 2) },
  { id: "sessions", label: "Sessions", fmt: num },
  { id: "engagementRate", label: "Engagement rate", fmt: (v) => pct(v, 1) },
  { id: "revenue", label: "Revenue", fmt: (v) => gbp(v) },
];
// Indices into SEG_COLORS chosen to avoid 2 (red) and 4 (green), which are
// reserved for the up/down delta semantics elsewhere on these cards.
const KPI_CARDS = [
  { key: "sessions", label: "Sessions", fmt: num, colorIdx: 0 },
  { key: "newUsers", label: "New users", fmt: num, colorIdx: 5 },
  { key: "engagedSessions", label: "Engaged sessions", fmt: num, colorIdx: 1 },
  { key: "engagementRate", label: "Engagement rate", fmt: (v) => pct(v, 1), colorIdx: 3 },
  { key: "avgEngagementTime", label: "Avg engagement", fmt: secs, colorIdx: 0 },
  { key: "events", label: "Events", fmt: num, colorIdx: 5 },
  { key: "purchases", label: "Conversions", fmt: num, colorIdx: 1 },
  { key: "revenue", label: "Revenue", fmt: gbp, colorIdx: 3 },
];
function pivotByDay(seriesByseg, segIds) {
  const days = seriesByseg[segIds[0]].map((r) => r.day);
  return days.map((day, i) => { const row = { day }; for (const id of segIds) row[id] = seriesByseg[id][i].conversionRate; return row; });
}
const tipStyle = { background: T.panel, border: `1px solid ${T.border}`, borderRadius: 8, fontFamily: T.mono, fontSize: 12 };
const DeltaTag = ({ pctChange, suffix }) => (
  <span style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 11.5, color: pctChange >= 0 ? T.pos : T.neg }}>
    {pctChange >= 0 ? "▲" : "▼"} {Math.abs(pctChange * 100).toFixed(0)}%{suffix && <span style={{ color: T.muted, fontWeight: 500 }}> {suffix}</span>}
  </span>
);

/* ---- GA-style KPI overview cards ----------------------------------- */
function KpiCard({ label, value, fmt, pctChange, data, dataKey, color, cmpName = "Wk1" }) {
  return (
    <div style={{ ...card(), padding: "14px 16px" }}>
      <div style={{ color: T.muted, fontSize: 10.5, letterSpacing: 0.4, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 21, margin: "3px 0 3px" }}>{fmt(value)}</div>
      <DeltaTag pctChange={pctChange} suffix={`vs ${cmpName}`} />
      <ResponsiveContainer width="100%" height={28}>
        <LineChart data={data} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.6} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---- the GA-style sortable breakdown table -------------------------- */
// GA-style report table. `group` tags let the header show metric families
// (Users / Engagement / Conversions). Conversion is the only family the
// incident actually moves; the rest are realistic detail and decoys.
const td = (align, extra) => ({ padding: "6px 8px", textAlign: align, fontFamily: T.mono, whiteSpace: "nowrap", color: T.muted, ...extra });
const TABLE_COLS = [
  { key: "name", label: "Segment", align: "left", group: "", render: (r, segIdx) => (
    <td style={{ padding: "6px 8px", display: "flex", alignItems: "center", gap: 7 }}>
      <span style={{ width: 8, height: 8, borderRadius: 8, background: SEG_COLORS[segIdx % SEG_COLORS.length], flexShrink: 0 }} />
      <span style={{ fontFamily: T.body, color: T.text }}>{r.name}</span>
    </td>) },
  { key: "sessionsLate", label: "Sessions", group: "Users", render: (r) => <td style={td("right", { color: T.text })}>{num(r.sessionsLate)}</td> },
  { key: "shareLate", label: "Share", group: "Users", render: (r) => (
    <td style={td("right")}><div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 30, height: 5, borderRadius: 5, background: T.track, overflow: "hidden" }}><div style={{ width: `${Math.round(r.shareLate * 100)}%`, height: "100%", background: T.instructor }} /></div>
      <span>{pct(r.shareLate, 0)}</span></div></td>) },
  { key: "engRateLate", label: "Engagement", group: "Engagement", render: (r) => <td style={td("right")}>{pct(r.engRateLate, 1)}</td> },
  { key: "engTimeLate", label: "Avg time", group: "Engagement", render: (r) => <td style={td("right")}>{secs(r.engTimeLate)}</td> },
  { key: "eventsLate", label: "Events", group: "Engagement", render: (r) => <td style={td("right")}>{num(r.eventsLate)}</td> },
  { key: "avgEarly", label: "Was", group: "Conv. rate", render: (r) => <td style={td("right")}>{pct(r.avgEarly, 1)}</td> },
  { key: "avgLate", label: "Now", group: "Conv. rate", render: (r) => <td style={td("right", { color: T.text })}>{pct(r.avgLate, 1)}</td> },
  { key: "pctChange", label: "Δ", group: "Conv. rate", render: (r) => <td style={td("right", { fontWeight: 700, color: r.pctChange < -0.15 ? T.neg : r.pctChange > 0.15 ? T.pos : T.muted })}>{pp(r.pctChange, 0)}</td> },
  { key: "revenueLate", label: "Revenue", group: "Conversions", render: (r) => <td style={td("right")}>{gbp(r.revenueLate)}</td> },
];
function SegmentTable({ breakdown, summary }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("desc");
  const rows = useMemo(() => {
    if (!sortKey) return summary; // engine default: sorted by share desc
    return [...summary].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const cmp = typeof av === "string" ? av.localeCompare(bv) : av - bv;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [summary, sortKey, sortDir]);
  function onSort(key) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }
  // group-header row spans
  const groups = [];
  for (const c of TABLE_COLS) { const last = groups[groups.length - 1]; if (last && last.group === c.group) last.span++; else groups.push({ group: c.group, span: 1 }); }
  return (
    <div role="region" aria-label="Segment comparison table (scrollable)" tabIndex={0} style={{ marginTop: 12, overflowX: "auto" }}>
      <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>Comparison period vs current · click a column to sort. Δ is the change in <Term term="pp">percentage points (pp)</Term>. Only <b style={{ color: T.text }}>Conv. rate</b> is changed by the incident; the other columns are real detail that can mislead you.</div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 720 }}>
        <thead>
          <tr>{groups.map((g, i) => <th key={i} colSpan={g.span} style={{ textAlign: g.group === "" ? "left" : "right", padding: "2px 8px", color: T.faint, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>{g.group}</th>)}</tr>
          <tr>
            {TABLE_COLS.map((c) => (
              <th key={c.key} onClick={() => onSort(c.key)} style={{ textAlign: c.align || "right", padding: "4px 8px", borderBottom: `1px solid ${T.border}`, color: sortKey === c.key ? PLAYER : T.muted, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", userSelect: "none" }}>
                {c.label}{sortKey === c.key ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const segIdx = breakdown.segments.findIndex((s) => s.id === row.id);
            return <tr key={row.id}>{TABLE_COLS.map((c) => <React.Fragment key={c.key}>{c.render(row, segIdx)}</React.Fragment>)}</tr>;
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---- INVESTIGATE: GA-style left-nav + report panel ---------------- */
function LeftNav({ caseData, activeReport, openReport, reportsViewed, onDiagnose }) {
  const navItem = (key, label, indent) => {
    const on = activeReport === key;
    const seen = reportsViewed.includes(key);
    return (
      <button key={key} onClick={() => openReport(key)} style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 8, padding: indent ? "7px 10px 7px 22px" : "8px 10px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: T.body, fontSize: 13, fontWeight: on ? 700 : 500, background: on ? T.sel : "transparent", color: on ? PLAYER : T.text }}>
        <span style={{ flex: 1 }}>{label}</span>
        {seen && key !== "home" && <span style={{ color: T.pos, fontSize: 11 }}>✓</span>}
      </button>
    );
  };
  return (
    <div style={{ position: "sticky", top: 70, alignSelf: "start", display: "flex", flexDirection: "column", gap: 2 }}>
      {navItem("home", "🏠 Home overview")}
      {navItem("realtime", "🟢 Realtime")}
      {navItem("funnel", "🔻 Funnel exploration")}
      {REPORTS.map((g) => (
        <div key={g.group} style={{ marginTop: 10 }}>
          <div style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: T.muted, padding: "2px 10px 4px" }}>{g.group}</div>
          {g.items.map((it) => navItem(it.dim, it.label, true))}
        </div>
      ))}
      <button onClick={onDiagnose} style={{ ...btn(PLAYER), width: "100%", marginTop: 18, padding: "11px 14px", fontSize: 13.5 }}>Submit diagnosis →</button>
    </div>
  );
}

const winLabel = ([lo, hi]) => `${dayShort(lo)}–${dayShort(hi)}`;
// GA-style date-range bar: presets for the current window + what it's
// compared against. Positioning the window matters — a window that straddles
// the incident start, or a comparison that's also affected, dilutes the delta.
function DateRangeBar({ curWindow, setCurWindow, cmpWindow, cmpMode, setCmpMode }) {
  const presets = [
    { label: "Last 7 days", win: [TOTAL_DAYS - 7, TOTAL_DAYS - 1] },
    { label: "Last 14 days", win: [TOTAL_DAYS - 14, TOTAL_DAYS - 1] },
    { label: "Last 21 days", win: [TOTAL_DAYS - 21, TOTAL_DAYS - 1] },
  ];
  const active = (w) => w[0] === curWindow[0] && w[1] === curWindow[1];
  return (
    <div style={{ ...card(), padding: "12px 16px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, color: T.muted }}>📅 Current</span>
      <div style={{ display: "flex", gap: 6 }}>{presets.map((p) => <button key={p.label} onClick={() => setCurWindow(p.win)} style={pillBtn(active(p.win))}>{p.label}</button>)}</div>
      <span style={{ fontFamily: T.mono, fontSize: 12, color: T.text }}>{winLabel(curWindow)}</span>
      <span style={{ width: 1, height: 20, background: T.border }} />
      <span style={{ fontSize: 12, color: T.muted }}>Compared to</span>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={() => setCmpMode("first")} style={pillBtn(cmpMode === "first")}>First week</button>
        <button onClick={() => setCmpMode("preceding")} style={pillBtn(cmpMode === "preceding")}>Preceding period</button>
      </div>
      <span style={{ fontFamily: T.mono, fontSize: 12, color: T.muted }}>{winLabel(cmpWindow)}</span>
    </div>
  );
}

function HomeOverview({ caseData, metric, setMetric, curWindow, setCurWindow, cmpWindow, cmpMode }) {
  const m = METRICS.find((x) => x.id === metric);
  const eventDays = useMemo(() => [...new Set(caseData.events.map((e) => e.day))], [caseData]);
  const toplineSummary = useMemo(() => summariseTopline(caseData.topline, cmpWindow, curWindow), [caseData, cmpWindow, curWindow]);
  const baselineAvg = useMemo(() => avgRange(caseData.topline, cmpWindow, metric), [caseData, cmpWindow, metric]);
  const cmpName = cmpMode === "first" ? "Wk1" : "prev";
  return (
    <div className="rise">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14 }}>
        {KPI_CARDS.map((k) => (
          <KpiCard key={k.key} label={k.label} value={toplineSummary[k.key].late} fmt={k.fmt} pctChange={toplineSummary[k.key].pctChange} data={caseData.topline} dataKey={k.key} color={SEG_COLORS[k.colorIdx]} cmpName={cmpName} />
        ))}
      </div>
      <div style={{ ...card(), marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <SectionTitle>Overview — {cmpName === "Wk1" ? "first week" : "preceding period"} (grey) vs current (amber)</SectionTitle>
            <DeltaTag pctChange={toplineSummary[metric].pctChange} suffix={`vs ${cmpName}`} />
          </div>
          <div style={{ display: "flex", gap: 6 }}>{METRICS.map((x) => <button key={x.id} onClick={() => setMetric(x.id)} style={pillBtn(metric === x.id)}>{x.label}</button>)}</div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={caseData.topline} margin={{ top: 18, right: 14, bottom: 0, left: -6 }}>
            <CartesianGrid stroke={T.border} strokeDasharray="3 3" />
            <XAxis dataKey="day" tickLine={false} tickFormatter={dayShort} interval={3} type="number" domain={[0, TOTAL_DAYS - 1]} />
            <YAxis tickLine={false} width={56} tickFormatter={m.fmt} domain={["auto", "auto"]} />
            <Tooltip contentStyle={tipStyle} formatter={(v) => [m.fmt(v), m.label]} labelFormatter={dayLong} />
            <ReferenceArea x1={cmpWindow[0]} x2={cmpWindow[1]} fill={T.muted} fillOpacity={0.1} />
            <ReferenceArea x1={curWindow[0]} x2={curWindow[1]} fill={PLAYER} fillOpacity={0.12} />
            <ReferenceLine y={baselineAvg} stroke={T.muted} strokeDasharray="3 3" label={{ value: `${cmpName} avg`, position: "insideTopRight", fill: T.muted, fontSize: 10 }} />
            {eventDays.map((d) => <ReferenceLine key={d} x={d} stroke={T.amber} strokeDasharray="4 4" label={{ value: "📌", position: "top", fontSize: 13 }} />)}
            <Line type="monotone" dataKey={metric} stroke={PLAYER} strokeWidth={2.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
          {eventDays.map((d) => <div key={d} style={{ fontSize: 11.5, color: T.muted }}>📌 <b style={{ color: T.text }}>{dayShort(d)}</b> — {caseData.events.filter((e) => e.day === d).map((e) => e.label).join(" · ")}</div>)}
        </div>
      </div>
      <div style={{ ...card(), marginTop: 16, fontSize: 13, color: T.muted, lineHeight: 1.55 }}>
        Pick a report on the left to break the data down. On any report you can add a <b style={{ color: T.text }}>secondary dimension</b> to cross-tabulate, or open <b style={{ color: T.text }}>Funnel exploration</b> to see <i>which step</i> of the checkout broke.
      </div>
    </div>
  );
}

function ReportPanel({ caseData, reportDim, onPivot, cmpWindow, curWindow, cmpName }) {
  const [secondary, setSecondaryLocal] = useState(null);
  // reset the pivot when the primary report changes
  React.useEffect(() => { setSecondaryLocal(null); }, [reportDim.key]);
  function chooseSecondary(key) { setSecondaryLocal(key); onPivot(reportDim.key, key); }
  const breakdown = useMemo(() => (secondary ? buildCrossTab(caseData, reportDim.key, secondary) : reportDim), [caseData, reportDim, secondary]);
  const summary = useMemo(() => summariseSegments(breakdown, cmpWindow, curWindow), [breakdown, cmpWindow, curWindow]);
  const pivoted = useMemo(() => (breakdown.segments.length <= 6 ? pivotByDay(breakdown.series, breakdown.segments.map((s) => s.id)) : null), [breakdown]);
  const secondaryOptions = DIMENSIONS.filter((d) => d.key !== reportDim.key);

  return (
    <div className="rise" style={card()}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
        <SectionTitle>{breakdown.isCrossTab ? breakdown.label : reportDim.label} — conversion rate</SectionTitle>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: T.muted }}>Secondary dimension</span>
          <select aria-label="Add a secondary dimension to cross-tab this report" value={secondary || ""} onChange={(e) => chooseSecondary(e.target.value || null)}
            style={{ background: T.panel2, color: secondary ? PLAYER : T.text, border: `1px solid ${secondary ? PLAYER : T.border}`, borderRadius: 8, padding: "7px 10px", fontFamily: T.body, fontSize: 12.5, fontWeight: 600, cursor: "pointer", outline: "none" }}>
            <option value="">None</option>
            {secondaryOptions.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
          </select>
        </div>
      </div>
      {breakdown.isCrossTab && <div style={{ fontSize: 11.5, color: T.amber, marginBottom: 8 }}>↳ Cross-tab: every {reportDim.label} × {DMAP[secondary].label} combination. Watch for a single cell behaving unlike the rest.</div>}
      {pivoted ? (
        <ResponsiveContainer width="100%" height={210}>
          <LineChart data={pivoted} margin={{ top: 6, right: 14, bottom: 0, left: -6 }}>
            <CartesianGrid stroke={T.border} strokeDasharray="3 3" />
            <XAxis dataKey="day" tickLine={false} tickFormatter={dayShort} interval={3} />
            <YAxis tickLine={false} width={48} tickFormatter={(v) => pct(v, 0)} />
            <Tooltip contentStyle={tipStyle} formatter={(v, id) => [pct(v, 2), breakdown.segments.find((s) => s.id === id)?.name || id]} labelFormatter={dayLong} />
            <ReferenceArea x1={curWindow[0]} x2={curWindow[1]} fill={PLAYER} fillOpacity={0.08} />
            {breakdown.segments.map((s, i) => <Line key={s.id} type="monotone" dataKey={s.id} stroke={SEG_COLORS[i % SEG_COLORS.length]} strokeWidth={2.3} dot={false} isAnimationActive={false} />)}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div style={{ fontSize: 11.5, color: T.muted, marginBottom: 4 }}>{breakdown.segments.length} rows — too many to chart cleanly. Use the sortable table.</div>
      )}
      <SegmentTable breakdown={breakdown} summary={summary} cmpName={cmpName} />
    </div>
  );
}

/* ---- FUNNEL EXPLORATION ------------------------------------------- */
function FunnelView({ caseData, cmpWindow, curWindow, cmpName }) {
  const [f1, setF1] = useState({ dim: "", seg: "" });
  const [f2, setF2] = useState({ dim: "", seg: "" });
  const filters = [];
  if (f1.dim && f1.seg) filters.push({ dim: f1.dim, seg: f1.seg });
  if (f2.dim && f2.seg) filters.push({ dim: f2.dim, seg: f2.seg });
  const funnel = useMemo(() => buildFunnel(caseData, filters, curWindow, cmpWindow), [caseData, JSON.stringify(filters), curWindow, cmpWindow]);
  const segSel = (val, set, exclude) => (
    <span style={{ display: "inline-flex", gap: 6 }}>
      <select aria-label="Filter dimension" value={val.dim} onChange={(e) => set({ dim: e.target.value, seg: "" })} style={selStyle(val.dim)}>
        <option value="">— dimension —</option>
        {DIMENSIONS.filter((d) => d.key !== exclude).map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
      </select>
      <select aria-label="Filter segment" value={val.seg} onChange={(e) => set({ ...val, seg: e.target.value })} disabled={!val.dim} style={{ ...selStyle(val.seg), opacity: val.dim ? 1 : 0.5 }}>
        <option value="">— segment —</option>
        {val.dim && DMAP[val.dim].segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </span>
  );
  const maxStep = Math.max(...FUNNEL_STAGES.map((s) => funnel.summary[s.key].late));
  return (
    <div className="rise" style={card()}>
      <SectionTitle>🔻 Funnel exploration — sessions → purchase</SectionTitle>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: T.muted }}>Filter to</span>
        {segSel(f1, setF1, f2.dim)}
        {f1.dim && f1.seg && <span style={{ color: T.muted }}>×</span>}
        {f1.dim && f1.seg && segSel(f2, setF2, f1.dim)}
        {(f1.dim || f2.dim) && <button onClick={() => { setF1({ dim: "", seg: "" }); setF2({ dim: "", seg: "" }); }} style={{ ...pillBtn(false), padding: "6px 10px" }}>clear</button>}
      </div>
      <div style={{ fontSize: 11.5, color: filters.length ? (funnel.attributedStage ? T.amber : T.muted) : T.muted, marginBottom: 14, lineHeight: 1.4 }}>
        {filters.length === 0 ? "This is the whole site. A problem in one segment is hidden here, mixed in with all the healthy traffic. Add a filter to see which step fell."
          : funnel.attributedStage ? "✓ This is exactly one segment (or one Device × Browser combination). If a step broke for this group, it will show clearly below."
          : "This filter still mixes several groups together. A single broken step will not stand out until you filter to the exact segment (or Device × Browser combination)."}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {FUNNEL_STAGES.map((s, i) => {
          const st = funnel.summary[s.key];
          const worst = st.pctChange < -0.3;
          return (
            <div key={s.key}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3, fontSize: 12.5 }}>
                <span style={{ fontWeight: 600 }}>{i + 1}. {s.label} <span style={{ color: T.muted, fontWeight: 400, fontSize: 11 }}>step rate</span></span>
                <span style={{ fontFamily: T.mono }}><span style={{ color: T.muted }}>{pct(st.early, 1)} → </span><b style={{ color: worst ? T.neg : T.text }}>{pct(st.late, 1)}</b> <span style={{ color: st.pctChange < -0.1 ? T.neg : st.pctChange > 0.1 ? T.pos : T.muted, fontWeight: 700 }}>{pp(st.pctChange, 0)}</span></span>
              </div>
              <div style={{ height: 14, background: T.track, borderRadius: 7, overflow: "hidden" }}>
                <div style={{ width: `${Math.round((st.late / maxStep) * 100)}%`, height: "100%", background: worst ? T.neg : SEG_COLORS[0], transition: "width .3s" }} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
        <span style={{ color: T.muted }}>Overall conversion ({cmpName} → now)</span>
        <span style={{ fontFamily: T.mono }}>{pct(funnel.summary.overall.early, 2)} → <b>{pct(funnel.summary.overall.late, 2)}</b> <span style={{ color: funnel.summary.overall.pctChange < 0 ? T.neg : T.pos, fontWeight: 700 }}>{pp(funnel.summary.overall.pctChange, 1)}</span></span>
      </div>
    </div>
  );
}

function RealtimeView({ caseData }) {
  const rt = useMemo(() => realtimeSnapshot(caseData, "live"), [caseData]);
  const bars = rt.perMinute.map((v, i) => ({ i, v }));
  const list = (title, rows) => (
    <div style={card()}>
      <SectionTitle>{title}</SectionTitle>
      {rows.slice(0, 5).map((r) => (
        <div key={r.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${T.border}`, fontSize: 13 }}>
          <span>{r.name}</span><span style={{ fontFamily: T.mono, color: T.muted }}>{r.users}</span>
        </div>
      ))}
    </div>
  );
  return (
    <div className="rise">
      <div style={card()}>
        <SectionTitle>🟢 Users in the last 30 minutes</SectionTitle>
        <div style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 40 }}>{rt.active}</div>
        <div style={{ fontSize: 11.5, color: T.muted, margin: "4px 0 10px" }}>Users per minute</div>
        <ResponsiveContainer width="100%" height={90}>
          <BarChart data={bars} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <Bar dataKey="v" fill={T.pos} radius={[2, 2, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        {list("Top countries right now", rt.countries)}
        {list("Top landing pages right now", rt.pages)}
      </div>
      <div style={{ ...card(), marginTop: 16, fontSize: 12.5, color: T.muted, lineHeight: 1.5 }}>
        Realtime only shows the last 30 minutes. This is useful for finding a sudden outage while it is happening. To find a slow decline over several weeks, use the historical reports on the left.
      </div>
    </div>
  );
}

function Investigate({ caseData, metric, setMetric, activeReport, openReport, onPivot, reportsViewed, pivotsUsed, onDiagnose, curWindow, setCurWindow, cmpWindow, cmpMode, setCmpMode }) {
  const special = activeReport === "home" || activeReport === "realtime" || activeReport === "funnel";
  const reportDim = special ? null : caseData.breakdowns.find((d) => d.key === activeReport);
  const cmpName = cmpMode === "first" ? "Wk1" : "prev";
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 24, letterSpacing: -0.5, margin: 0 }}>Analytics</h2>
        <div style={{ fontSize: 12, color: T.muted, fontFamily: T.mono }}>{reportsViewed.length} reports · {pivotsUsed.length} pivots checked</div>
      </div>
      {activeReport !== "realtime" && <div style={{ marginTop: 12 }}><DateRangeBar curWindow={curWindow} setCurWindow={setCurWindow} cmpWindow={cmpWindow} cmpMode={cmpMode} setCmpMode={setCmpMode} /></div>}
      <div style={{ display: "grid", gridTemplateColumns: "210px minmax(0,1fr)", gap: 20, marginTop: 14, alignItems: "start" }}>
        <LeftNav caseData={caseData} activeReport={activeReport} openReport={openReport} reportsViewed={reportsViewed} onDiagnose={onDiagnose} />
        <div>
          {activeReport === "home" && <HomeOverview caseData={caseData} metric={metric} setMetric={setMetric} curWindow={curWindow} setCurWindow={setCurWindow} cmpWindow={cmpWindow} cmpMode={cmpMode} />}
          {activeReport === "realtime" && <RealtimeView caseData={caseData} />}
          {activeReport === "funnel" && <FunnelView caseData={caseData} cmpWindow={cmpWindow} curWindow={curWindow} cmpName={cmpName} />}
          {reportDim && <ReportPanel key={reportDim.key} caseData={caseData} reportDim={reportDim} onPivot={onPivot} cmpWindow={cmpWindow} curWindow={curWindow} cmpName={cmpName} />}
        </div>
      </div>
    </div>
  );
}

/* ---- DIAGNOSE ------------------------------------------------------ */
function PickGroup({ title, options, value, onChange, empty }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}>{title}</div>
      {options.length === 0 ? <div style={{ color: T.muted, fontSize: 12.5, padding: "8px 0" }}>{empty}</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {options.map((o) => <button key={o.id} onClick={() => onChange(o.id)} style={{ ...pickRow(value === o.id), textAlign: "left" }}>{o.name}</button>)}
        </div>
      )}
    </div>
  );
}
function Diagnose({ caseData, diagnosis, setDiagnosis, onBack, onSubmit }) {
  const primaryDim = DMAP[diagnosis.dimension];
  const secondaryDim = DMAP[diagnosis.secondary];
  const secOptions = DIMENSIONS.filter((d) => d.key !== diagnosis.dimension);
  const secondaryComplete = !diagnosis.secondary || !!diagnosis.segmentB;
  const ready = diagnosis.dimension && diagnosis.segment && diagnosis.causeType && secondaryComplete;
  return (
    <div className="rise" style={{ marginTop: 22, maxWidth: 920, marginLeft: "auto", marginRight: "auto" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 26, letterSpacing: -0.5, margin: 0 }}>Submit your diagnosis</h2>
        <button onClick={onBack} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 14 }}>← back to the dashboard</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 18, marginTop: 14 }}>
        <div style={card()}>
          <PickGroup title="1 · Which dimension is the issue in?" value={diagnosis.dimension}
            options={DIMENSIONS.map((d) => ({ id: d.key, name: d.label }))}
            onChange={(key) => setDiagnosis((d) => ({ ...d, dimension: key, segment: null }))} />
          <PickGroup title="2 · Which segment?" value={diagnosis.segment} empty="Pick a dimension first."
            options={primaryDim ? primaryDim.segments.map((s) => ({ id: s.id, name: s.name })) : []}
            onChange={(id) => setDiagnosis((d) => ({ ...d, segment: id }))} />
        </div>
        <div style={card()}>
          <PickGroup title="3 · What's the likely cause?" value={diagnosis.causeType} options={CAUSE_TYPES.map((c) => ({ id: c.id, name: c.label }))}
            onChange={(id) => setDiagnosis((d) => ({ ...d, causeType: id }))} />
          <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}>4 · Roughly when did it start?</div>
          <span style={{ fontFamily: T.mono, fontWeight: 700, color: PLAYER, fontSize: 13.5 }}>{dayLong(diagnosis.startDay)}</span>
          <input type="range" min={0} max={TOTAL_DAYS - 1} step={1} value={diagnosis.startDay} onChange={(e) => setDiagnosis((d) => ({ ...d, startDay: Number(e.target.value) }))} style={{ width: "100%", margin: "8px 0 5px", "--accent": PLAYER, "--accent-soft": PLAYER + "30" }} />
          <div style={{ fontSize: 11.5, color: T.muted }}>Doesn't need to be exact — within a few days is fine.</div>
        </div>
      </div>

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>Is it a <i>combination</i> of segments? (optional)</div>
        <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5, marginBottom: 10 }}>If the issue only appears when you cross two dimensions (e.g. a specific browser <i>on</i> a specific device), name the second one here. Leave as “No second dimension” if it's a single segment.</div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 14 }}>
          <div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 6 }}>Secondary dimension</div>
            <select aria-label="Secondary dimension for the diagnosis" value={diagnosis.secondary || ""} onChange={(e) => setDiagnosis((d) => ({ ...d, secondary: e.target.value || null, segmentB: null }))}
              style={{ width: "100%", background: T.panel2, color: diagnosis.secondary ? PLAYER : T.text, border: `1px solid ${diagnosis.secondary ? PLAYER : T.border}`, borderRadius: 8, padding: "9px 11px", fontFamily: T.body, fontSize: 13, fontWeight: 600, cursor: "pointer", outline: "none" }}>
              <option value="">No second dimension</option>
              {secOptions.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 6 }}>…and which {secondaryDim ? secondaryDim.label.toLowerCase() : "segment"}?</div>
            <select aria-label="Secondary segment for the diagnosis" value={diagnosis.segmentB || ""} disabled={!diagnosis.secondary} onChange={(e) => setDiagnosis((d) => ({ ...d, segmentB: e.target.value || null }))}
              style={{ width: "100%", background: T.panel2, color: diagnosis.segmentB ? PLAYER : T.text, border: `1px solid ${diagnosis.segmentB ? PLAYER : T.border}`, borderRadius: 8, padding: "9px 11px", fontFamily: T.body, fontSize: 13, fontWeight: 600, cursor: diagnosis.secondary ? "pointer" : "not-allowed", opacity: diagnosis.secondary ? 1 : 0.5, outline: "none" }}>
              <option value="">{diagnosis.secondary ? "Pick a segment…" : "—"}</option>
              {secondaryDim && secondaryDim.segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 18 }}>
        <button onClick={onSubmit} disabled={!ready} style={{ ...btn(PLAYER), opacity: ready ? 1 : 0.45, cursor: ready ? "pointer" : "not-allowed" }}>{ready ? "Submit diagnosis →" : "Pick a dimension, segment & cause to continue"}</button>
      </div>
    </div>
  );
}

/* ---- REVEAL --------------------------------------------------------- */
function Reveal({ caseData, diagnosis, result, reportsViewed, pivotsUsed, onRestart }) {
  const truth = caseData.truth;
  const dimLabel = (key) => DMAP[key]?.label || key || "—";
  const segLabel = (dimKey, segId) => DMAP[dimKey]?.segments.find((s) => s.id === segId)?.name || segId || "—";
  const causeLabel = (id) => CAUSE_TYPES.find((c) => c.id === id)?.label || id;
  const dimsText = (o) => o.secondary ? `${dimLabel(o.dimension)} × ${dimLabel(o.secondary)}` : dimLabel(o.dimension);
  const segsText = (o) => o.secondary ? `${segLabel(o.dimension, o.segment)} / ${segLabel(o.secondary, o.segmentB)}` : segLabel(o.dimension, o.segment);
  return (
    <div className="rise" style={{ marginTop: 22 }}>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{ color: T.muted, fontFamily: T.mono, fontSize: 12, letterSpacing: 2 }}>CASE {caseData.n} — SOLVED</div>
        <h1 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 38, margin: "6px 0", letterSpacing: -0.5 }}>{result.fieldsCorrect}/4 correct</h1>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 18 }}>
        <div style={card()}>
          <SectionTitle>Your diagnosis vs the truth</SectionTitle>
          <FieldRow ok={result.dimensionCorrect} label="Dimension" you={dimsText(diagnosis)} truth={dimsText(truth)} />
          <FieldRow ok={result.segmentCorrect} label="Segment" you={segsText(diagnosis)} truth={segsText(truth)} />
          <FieldRow ok={result.causeTypeCorrect} label="Cause" you={causeLabel(diagnosis.causeType)} truth={causeLabel(truth.causeType)} />
          <FieldRow ok={result.dateCorrect} label="Start" you={dayShort(diagnosis.startDay)} truth={dayShort(truth.startDay)} />
          <div style={{ marginTop: 12, fontSize: 11.5, color: T.muted }}>You opened {reportsViewed.length} reports and built {pivotsUsed.length} cross-tab pivots before diagnosing.</div>
        </div>
        <div style={card()}>
          <SectionTitle>What actually happened</SectionTitle>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, color: T.text }}>{truth.explanation}</p>
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 7 }}>Timeline events, now revealed</div>
            {caseData.events.map((e, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: 12.5, marginBottom: 5 }}>
                <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: e.real ? "#1f2e18" : "#2A2731", color: e.real ? T.pos : T.amber }}>{e.real ? "REAL CAUSE" : "RED HERRING"}</span>
                <span>{e.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ textAlign: "center", marginTop: 22 }}><button onClick={onRestart} style={btn(PLAYER)}>Run it again ↺</button></div>
    </div>
  );
}
function FieldRow({ ok, label, you, truth }) {
  return (
    <div style={{ padding: "9px 0", borderBottom: `1px solid ${T.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: T.muted, fontSize: 12.5 }}>{label}</span>
        <span style={{ color: ok ? T.pos : T.neg, fontWeight: 700, fontSize: 13 }}>{ok ? "✓" : "✗"}</span>
      </div>
      <div style={{ fontSize: 13.5, marginTop: 2 }}>You said <b>{you}</b>{!ok && <span style={{ color: T.muted }}> · actually <b style={{ color: T.text }}>{truth}</b></span>}</div>
    </div>
  );
}

/* ---- INSTRUCTOR PANEL ----------------------------------------------- */
function InstructorPanel({ cfg, onApply, onClose }) {
  const [seed, setSeed] = useState(cfg.seed);
  const [noise, setNoise] = useState(cfg.noise);
  const A = T.instructor;
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "#0008", zIndex: 40 }} />
      <div style={{ position: "fixed", top: 0, right: 0, height: "100%", width: 330, maxWidth: "92vw", background: "#1D1B21", borderLeft: `1px solid ${A}55`, zIndex: 50, overflowY: "auto", animation: "slideIn .25s ease both", boxShadow: "-20px 0 50px #0007" }}>
        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontFamily: T.display, fontWeight: 700, fontSize: 19, color: A }}>⚙ Instructor</span>
            <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
          </div>
          <p style={{ color: T.muted, fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>Applies to a <b style={{ color: T.text }}>new case</b> — a shared seed gives a cohort an identical dashboard.</p>
          <div style={{ marginTop: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Seed</div>
            <div style={{ display: "flex", gap: 6 }}>
              <input value={seed} onChange={(e) => setSeed(e.target.value)} style={{ flex: 1, background: T.panel, border: `1px solid ${T.border}`, color: T.text, borderRadius: 8, padding: "8px 10px", fontFamily: T.mono, fontSize: 13, outline: "none" }} />
              <button onClick={() => setSeed("DD-" + Math.random().toString(36).slice(2, 7).toUpperCase())} style={{ background: T.panel2, border: `1px solid ${T.border}`, color: T.text, borderRadius: 8, padding: "8px 10px", cursor: "pointer" }}>🎲</button>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 13, fontWeight: 500 }}>Noise level</span><span style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 13, color: A }}>{noise.toFixed(1)}×</span></div>
            <input type="range" min={0.2} max={2} step={0.1} value={noise} onChange={(e) => setNoise(Number(e.target.value))} style={{ width: "100%", marginTop: 7, "--accent": A, "--accent-soft": A + "30" }} />
            <div style={{ fontSize: 11, color: T.muted, marginTop: 5 }}>Low = obvious signal for a first walkthrough. High = brutal, harder to tell signal from noise.</div>
          </div>
          <button onClick={() => onApply({ seed, noise })} style={{ width: "100%", background: A, color: T.onAccent, border: "none", borderRadius: 10, padding: "11px", cursor: "pointer", fontFamily: T.body, fontWeight: 700, fontSize: 13.5 }}>Apply & start a new case</button>
        </div>
      </div>
    </>
  );
}

/* ---- atoms ------------------------------------------------------------ */
function SectionTitle({ children }) { return <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 16, marginBottom: 12, letterSpacing: -0.2 }}>{children}</div>; }
const card = () => ({ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20 });
const btn = (c) => ({ background: c, color: c === "transparent" ? T.text : T.onAccent, border: "none", borderRadius: 11, padding: "13px 22px", fontFamily: T.body, fontWeight: 700, fontSize: 15, cursor: "pointer", letterSpacing: 0.2 });
const pillBtn = (on) => ({ padding: "8px 13px", borderRadius: 9, cursor: "pointer", fontFamily: T.body, fontWeight: 600, fontSize: 12.5, border: `1.5px solid ${on ? PLAYER : T.border}`, background: on ? PLAYER : "transparent", color: on ? T.onAccent : T.text });
const pickRow = (on) => ({ cursor: "pointer", color: T.text, background: on ? T.sel : T.panel2, border: `1.5px solid ${on ? PLAYER : T.border}`, borderRadius: 10, padding: "9px 12px", fontSize: 13, fontWeight: 600 });
const selStyle = (filled) => ({ background: T.panel2, color: filled ? PLAYER : T.text, border: `1px solid ${filled ? PLAYER : T.border}`, borderRadius: 8, padding: "6px 9px", fontFamily: T.body, fontSize: 12.5, fontWeight: 600, cursor: "pointer", outline: "none" });
