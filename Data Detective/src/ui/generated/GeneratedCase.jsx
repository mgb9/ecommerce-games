import React, { useMemo, useState } from "react";
import { CASES, TOTAL_DAYS, generateCase, scoreDiagnosis } from "../../engine/engine.js";
import { FIELD_CASE } from "../../engine/fieldcase.js";
import { T, PLAYER, btn, pillBtn } from "../theme.js";
import { pad2 } from "../format.js";
import { CaseFrame, Eyebrow, LOS, PT, Term, TermsHint, TicketCard, addOnce } from "../shared.jsx";
import { loadProgress, recordResult } from "../progress.js";
import Investigate, { useDateRange } from "./Investigate.jsx";
import Diagnose from "./Diagnose.jsx";
import Reveal from "./Reveal.jsx";

const initialDiagnosis = () => ({ dimension: null, segment: null, secondary: null, segmentB: null, causeType: null, startDay: Math.floor(TOTAL_DAYS / 2) });

/* Cases 1–4: one seeded, generated case worked intro → investigate →
   diagnose → reveal. All session state lives here, and App remounts this
   component to start a case afresh — so there is no reset bookkeeping. */
export default function GeneratedCase({ autoFocus, caseIndex, cfg, onSelectCase, onRestart, onToggleInstructor }) {
  const caseData = useMemo(() => generateCase(CASES[caseIndex].id, cfg.seed, { noise: cfg.noise }), [caseIndex, cfg]);
  const [phase, setPhase] = useState("intro");
  const [metric, setMetric] = useState("conversionRate");
  const [activeReport, setActiveReport] = useState("home");   // "home" | "realtime" | "funnel" | dim key
  const [viewed, setViewed] = useState([]);                    // reports opened
  const [pivots, setPivots] = useState([]);                    // "primary×secondary" cross-tabs built
  const range = useDateRange();
  const [diagnosis, setDiagnosis] = useState(initialDiagnosis);
  const [result, setResult] = useState(null);

  function openReport(key) { setActiveReport(key); if (key !== "home") setViewed(addOnce(key)); }
  function logPivot(primary, secondary) { if (secondary) setPivots(addOnce(`${primary}×${secondary}`)); }
  function submitDiagnosis() {
    const scored = scoreDiagnosis(diagnosis, caseData.truth);
    recordResult(caseData.id, scored.fieldsCorrect, 4);
    setResult(scored); setPhase("reveal");
  }

  const instructorBtn = (
    <button onClick={onToggleInstructor} title="Instructor controls" aria-haspopup="dialog" style={{ background: "transparent", border: `1px solid ${T.hdrBorder}`, color: T.hdrText, borderRadius: 999, padding: "7px 12px", cursor: "pointer", fontFamily: T.body, fontWeight: 600, fontSize: 14.5, display: "flex", alignItems: "center", gap: 6 }}><span aria-hidden="true" style={{ fontSize: 16.5 }}>⚙</span> Instructor</button>
  );
  return (
    <CaseFrame autoFocus={autoFocus} subtitle="Chrichton · analytics" phase={phase} caseN={caseData.n} counters={[["REPORTS", viewed.length], ["PIVOTS", pivots.length]]} actions={instructorBtn}>
      {phase === "intro" && <Intro caseData={caseData} cfg={cfg} caseIndex={caseIndex} onSelectCase={onSelectCase} onStart={() => setPhase("investigate")} />}
      {phase === "investigate" && (
        <Investigate caseData={caseData} metric={metric} setMetric={setMetric} activeReport={activeReport} openReport={openReport}
          onPivot={logPivot} viewed={viewed} pivots={pivots} range={range} onDiagnose={() => setPhase("diagnose")} />
      )}
      {phase === "diagnose" && (
        <Diagnose diagnosis={diagnosis} setDiagnosis={setDiagnosis} onBack={() => setPhase("investigate")} onSubmit={submitDiagnosis} />
      )}
      {phase === "reveal" && result && <Reveal caseData={caseData} cfg={cfg} diagnosis={diagnosis} result={result} viewed={viewed} pivots={pivots} onRestart={onRestart} />}
    </CaseFrame>
  );
}

/* ---- INTRO / TICKET --------------------------------------------- */
const DIFFICULTY_COLOR = { Beginner: "#3A9E3A", Intermediate: "#FBB034", Advanced: "#F47920", "Field data": "#8A6D45" };
// `done` = this browser's best result on the case, if it has been played
// through; the tick is kept for a perfect score.
function CasePill({ n, difficulty, on, onClick, title, done }) {
  return (
    <button onClick={onClick} title={title} aria-pressed={on} style={{ ...pillBtn(on), display: "flex", alignItems: "center", gap: 7 }}>
      <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 7, background: DIFFICULTY_COLOR[difficulty] || T.muted }} />
      Case {pad2(n)} · {difficulty}
      {done && <span style={{ fontFamily: T.mono, fontSize: 12.5, fontWeight: 700, color: on ? T.onAccent : done.best === done.outOf ? T.pos : T.muted }}>
        <span aria-hidden="true">{done.best === done.outOf ? "✓ " : ""}{done.best}/{done.outOf}</span><span className="sr-only">, played, best score {done.best} of {done.outOf}</span>
      </span>}
    </button>
  );
}
function Intro({ caseData, cfg, caseIndex, onSelectCase, onStart }) {
  const [progress] = useState(loadProgress);
  return (
    <div className="rise" style={{ maxWidth: 820, margin: "48px auto 0" }}>
      <Eyebrow title={LOS.LO3.full}>Root-cause diagnosis · LO3</Eyebrow>
      <h1 style={{ fontFamily: T.display, fontWeight: 700, fontSize: "clamp(34px, 7vw, 50px)", lineHeight: 1.04, letterSpacing: -1.2, margin: "16px 0 0" }}>
        <PT rich={<>Something is off in the numbers. <span style={{ color: PLAYER }}>Find out what.</span></>}
            plain={<>A number has changed. <span style={{ color: PLAYER }}>Find out why.</span></>} />
      </h1>
      <p style={{ color: T.body2, fontSize: 19, lineHeight: 1.6, marginTop: 18 }}>
        Chrichton's <Term term="cro">CRO</Term> team gets a ticket like this most weeks. Open the dashboard, use{" "}
        <Term term="segmentation">segmentation</Term> to find where the <Term term="anomaly">anomaly</Term> really lives — then diagnose
        the dimension, the segment, the likely cause, and roughly when it started. Watch for a{" "}
        <PT rich={<><Term term="redherring">red herring</Term> that only <i>looks</i> related.</>}
            plain={<><Term term="redherring">red herring</Term> — an event that looks related but is not the real cause.</>} />
      </p>
      <TermsHint />

      <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
        {CASES.map((c, i) => <CasePill key={c.id} n={c.n} difficulty={c.difficulty} on={caseIndex === i} done={progress[c.id]} onClick={() => onSelectCase(i)} />)}
        {/* index CASES.length = the field-data case (real 2015 exports) */}
        <CasePill n={FIELD_CASE.n} difficulty={FIELD_CASE.difficulty} on={false} done={progress[FIELD_CASE.id]} onClick={() => onSelectCase(CASES.length)}
          title="Real Google Analytics exports from a real 2015 retailer — audit them" />
      </div>

      <TicketCard ticket={caseData.ticket} style={{ marginTop: 14 }} />
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 22, flexWrap: "wrap" }}>
        <button onClick={onStart} style={btn(T.hdrBg)}>Open the dashboard →</button>
        <span style={{ color: T.muted, fontSize: 15.5 }}>Case {pad2(caseData.n)} of {CASES.length + 1} · seed <b style={{ color: T.text, fontFamily: T.mono }}>{cfg.seed}</b></span>
      </div>
    </div>
  );
}
