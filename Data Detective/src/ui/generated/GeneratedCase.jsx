import React, { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { CASES, TOTAL_DAYS, generateCase, scoreDiagnosis, variantFor } from "../../engine/engine.js";
import { FIELD_CASE } from "../../engine/fieldcase-meta.js";
import { T, PLAYER, btn, pillBtn } from "../theme.js";
import { pad2 } from "../format.js";
import { CaseFrame, Eyebrow, LOS, PT, Term, TermsHint, TicketCard, addOnce } from "../shared.jsx";
import { calibration, loadProgress, recordFirstAttempt } from "../progress.js";
import { useSessionState } from "../session.js";
import { useDateRange } from "./dateRange.js";

// The dashboard (and its charting library, most of the bundle) loads on
// demand: the intro paints without it, and starts fetching it straight away.
const loadInvestigate = () => import("./Investigate.jsx");
const Investigate = lazy(loadInvestigate);
import Diagnose from "./Diagnose.jsx";
import ReportView from "../report/ReportView.jsx";
import { generatedReport } from "../report/generatedReport.js";
import Reveal from "./Reveal.jsx";

const initialDiagnosis = () => ({ dimension: null, segment: null, secondary: null, segmentB: null, causeType: null, startDay: Math.floor(TOTAL_DAYS / 2), confidence: null });

/* Cases 1–7: one seeded, generated case worked intro → investigate →
   diagnose → reveal. All session state lives here — mirrored to the tab's
   session under `sessionKey`, so a refresh resumes where the student was —
   and App remounts this component to start a case afresh.

   `attempt` counts tries at this case. The first uses the cohort's seed;
   each retry uses a derived seed and the NEXT variant, so the answer the
   reveal just showed is never replayed. Only the first attempt is scored. */
export default function GeneratedCase({ autoFocus, sessionKey, caseIndex, cfg, attempt = 1, onSelectCase, onRetry, onToggleInstructor }) {
  const def = CASES[caseIndex];
  const seed = attempt > 1 ? `${cfg.seed}·${attempt}` : cfg.seed;
  const caseData = useMemo(() => generateCase(def.id, seed, { noise: cfg.noise, variant: variantFor(def.id, cfg.seed, attempt) }), [def.id, seed, cfg, attempt]);
  const key = (name) => `${sessionKey}:${name}`;
  const [phase, setPhase] = useSessionState(key("phase"), "intro");
  const [metric, setMetric] = useSessionState(key("metric"), "conversionRate");
  const [activeReport, setActiveReport] = useSessionState(key("report"), "home");   // "home" | "realtime" | "funnel" | "orders" | dim key
  const [viewed, setViewed] = useSessionState(key("viewed"), []);                    // reports opened
  const [pivots, setPivots] = useSessionState(key("pivots"), []);                    // "primary×secondary" cross-tabs built
  const range = useDateRange(key("range"));
  const [diagnosis, setDiagnosis] = useSessionState(key("diagnosis"), initialDiagnosis);
  const [result, setResult] = useSessionState(key("result"), null);

  function openReport(k) { setActiveReport(k); if (k !== "home") setViewed(addOnce(k)); }
  function logPivot(primary, secondary) { if (secondary) setPivots(addOnce(`${primary}×${secondary}`)); }
  function submitDiagnosis() {
    const scored = scoreDiagnosis(diagnosis, caseData.truth);
    if (attempt === 1) recordFirstAttempt(caseData.id, scored.fieldsCorrect, 4, diagnosis.confidence);
    setResult(scored); setPhase("reveal");
  }

  // Instructor mode only (see App): students don't get the noise dial.
  const instructorBtn = onToggleInstructor && (
    <button onClick={onToggleInstructor} title="Instructor controls" aria-haspopup="dialog" style={{ background: "transparent", border: `1px solid ${T.hdrBorder}`, color: T.hdrText, borderRadius: 999, padding: "7px 12px", cursor: "pointer", fontFamily: T.body, fontWeight: 600, fontSize: 14.5, display: "flex", alignItems: "center", gap: 6 }}><span aria-hidden="true" style={{ fontSize: 16.5 }}>⚙</span> Instructor</button>
  );
  return (
    <CaseFrame autoFocus={autoFocus} subtitle="Chrichton · analytics" phase={phase} caseN={caseData.n} counters={[["REPORTS", viewed.length], ["PIVOTS", pivots.length]]} actions={instructorBtn}>
      {phase === "intro" && <Intro caseData={caseData} attempt={attempt} caseIndex={caseIndex} onSelectCase={onSelectCase} onStart={() => setPhase("investigate")} />}
      {phase === "investigate" && (
        <Suspense fallback={<div role="status" style={{ marginTop: 40, color: T.muted, fontSize: 16 }}>Opening the dashboard…</div>}>
          <Investigate caseData={caseData} metric={metric} setMetric={setMetric} activeReport={activeReport} openReport={openReport}
            onPivot={logPivot} viewed={viewed} pivots={pivots} range={range} onDiagnose={() => setPhase("diagnose")} />
        </Suspense>
      )}
      {phase === "diagnose" && (
        <Diagnose diagnosis={diagnosis} setDiagnosis={setDiagnosis} onBack={() => setPhase("investigate")} onSubmit={submitDiagnosis} />
      )}
      {phase === "reveal" && result && <Reveal caseData={caseData} diagnosis={diagnosis} result={result} viewed={viewed} pivots={pivots} onRetry={onRetry} onOpenReport={() => setPhase("report")} />}
      {phase === "report" && result && (
        <ReportView model={generatedReport({ caseData, cfg, attempt, diagnosis, result, viewed, pivots })} sessionKey={sessionKey} onBack={() => setPhase("reveal")} />
      )}
    </CaseFrame>
  );
}

/* ---- INTRO / TICKET --------------------------------------------- */
const DIFFICULTY_COLOR = { Beginner: "#3A9E3A", Intermediate: "#FBB034", Advanced: "#F47920", "Field data": "#8A6D45" };
// `done` = this browser's FIRST attempt at the case, if it has played it;
// the tick is kept for a perfect first attempt.
function CasePill({ n, difficulty, on, onClick, title, done }) {
  const played = done?.first !== undefined;
  const perfect = played && done.first === done.outOf;
  return (
    <button onClick={onClick} title={title} aria-pressed={on} style={{ ...pillBtn(on), display: "flex", alignItems: "center", gap: 7 }}>
      <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 7, background: DIFFICULTY_COLOR[difficulty] || T.muted }} />
      Case {pad2(n)} · {difficulty}
      {played && <span style={{ fontFamily: T.mono, fontSize: 12.5, fontWeight: 700, color: on ? T.onAccent : perfect ? T.pos : T.muted }}>
        <span aria-hidden="true">{perfect ? "✓ " : ""}{done.first}/{done.outOf}</span><span className="sr-only">, played, first attempt {done.first} of {done.outOf}</span>
      </span>}
    </button>
  );
}
// How the student's stated confidence has matched their first attempts.
function CalibrationNote({ progress }) {
  const levels = calibration(progress);
  if (!levels.reduce((a, l) => a + l.cases, 0)) return null;
  return (
    <p style={{ fontSize: 14, color: T.muted, lineHeight: 1.55, margin: "12px 0 0" }}>
      <b style={{ color: T.text }}>Your calibration so far:</b>{" "}
      {levels.map((l) => `when you said “${l.label.toLowerCase()}”, you were fully right ${l.right} of ${l.cases} time${l.cases === 1 ? "" : "s"}`).join("; ")}.
    </p>
  );
}
function Intro({ caseData, attempt, caseIndex, onSelectCase, onStart }) {
  const [progress] = useState(loadProgress);
  useEffect(() => { loadInvestigate(); }, []); // prefetch while the ticket is read
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
        the dimension, the segment, the likely cause, and roughly when it started. Sometimes the honest answer is that nothing is broken. Watch for a{" "}
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
      <CalibrationNote progress={progress} />

      <TicketCard ticket={caseData.ticket} style={{ marginTop: 14 }} />
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 22, flexWrap: "wrap" }}>
        <button onClick={onStart} style={btn(T.hdrBg)}>Open the dashboard →</button>
        <span style={{ color: T.muted, fontSize: 15.5 }}>Case {pad2(caseData.n)} of {CASES.length + 1} · seed <b style={{ color: T.text, fontFamily: T.mono }}>{caseData.seed}</b>{attempt > 1 && <> · fresh variant (attempt {attempt})</>}</span>
      </div>
    </div>
  );
}
