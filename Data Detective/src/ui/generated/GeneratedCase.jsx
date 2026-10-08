import React, { Suspense, lazy, useEffect, useMemo } from "react";
import { CASES, TOTAL_DAYS, generateCase, scoreDiagnosis, variantFor } from "../../engine/engine.js";
import { T, PLAYER, btn, linkBtn } from "../theme.js";
import { pad2 } from "../format.js";
import { CaseFrame, Eyebrow, InstructorButton, LOS, PT, Term, TermsHint, TicketCard, addOnce } from "../shared.jsx";
import { recordFirstAttempt } from "../progress.js";
import { useSessionState } from "../session.js";
import { useDateRange } from "./dateRange.js";
import { CaseOutcomes } from "../Outcomes.jsx";
import { ALL_CASES } from "../caseList.js";

// The dashboard (and its charting library, most of the bundle) loads on
// demand: the intro paints without it, and starts fetching it straight away.
const loadInvestigate = () => import("./Investigate.jsx");
const Investigate = lazy(loadInvestigate);
import Diagnose from "./Diagnose.jsx";
import ReportView from "../report/ReportView.jsx";
import { generatedReport } from "../report/generatedReport.js";
import Reveal from "./Reveal.jsx";

const initialDiagnosis = () => ({ dimension: null, segment: null, secondary: null, segmentB: null, causeType: null, startDay: Math.floor(TOTAL_DAYS / 2), confidence: null });

/* Cases 1–8: one seeded, generated case worked intro → investigate →
   diagnose → reveal. All session state lives here — mirrored to the tab's
   session under `sessionKey`, so a refresh resumes where the student was —
   and App remounts this component to start a case afresh.

   `attempt` counts tries at this case. The first uses the cohort's seed;
   each retry uses a derived seed and the NEXT variant, so the answer the
   reveal just showed is never replayed. Only the first attempt is scored. */
export default function GeneratedCase({ autoFocus, sessionKey, caseIndex, cfg, attempt = 1, onInbox, onRetry, onToggleInstructor }) {
  const def = CASES[caseIndex];
  const seed = attempt > 1 ? `${cfg.seed}·${attempt}` : cfg.seed;
  const caseData = useMemo(() => generateCase(def.id, seed, { noise: cfg.noise, variant: variantFor(def.id, cfg.seed, attempt) }), [def.id, seed, cfg, attempt]);
  const key = (name) => `${sessionKey}:${name}`;
  const [phase, setPhase] = useSessionState(key("phase"), "intro");
  const [metric, setMetric] = useSessionState(key("metric"), "conversionRate");
  const [activeReport, setActiveReport] = useSessionState(key("report"), "home");   // "home" | "realtime" | "funnel" | "orders" | dim key
  const [viewed, setViewed] = useSessionState(key("viewed"), []);                    // reports opened
  const [pivots, setPivots] = useSessionState(key("pivots"), []);                    // "primary×secondary" cross-tabs built
  const [lens, setLens] = useSessionState(key("lens"), "conversionRate");            // the metric reports are viewed by
  const [lenses, setLenses] = useSessionState(key("lenses"), []);                    // "report:metric" pairs seen
  const range = useDateRange(key("range"));
  const [diagnosis, setDiagnosis] = useSessionState(key("diagnosis"), initialDiagnosis);
  const [result, setResult] = useSessionState(key("result"), null);

  // A report is always seen through the current lens: log the pair on opening
  // a report and on switching lens (the lens carries over between reports).
  const isReport = (k) => caseData.breakdowns.some((d) => d.key === k);
  function openReport(k) { setActiveReport(k); if (k !== "home") setViewed(addOnce(k)); if (isReport(k)) setLenses(addOnce(`${k}:${lens}`)); }
  function chooseLens(m) { setLens(m); if (isReport(activeReport)) setLenses(addOnce(`${activeReport}:${m}`)); }
  function logPivot(primary, secondary) { if (secondary) setPivots(addOnce(`${primary}×${secondary}`)); }
  function submitDiagnosis() {
    const scored = scoreDiagnosis(diagnosis, caseData.truth);
    if (attempt === 1) recordFirstAttempt(caseData.id, scored.fieldsCorrect, 4, diagnosis.confidence, { calls: [scored.dimensionCorrect, scored.segmentCorrect, scored.causeTypeCorrect, scored.dateCorrect] });
    setResult(scored); setPhase("reveal");
  }

  // Instructor mode only (see App): students don't get the noise dial.
  const instructorBtn = onToggleInstructor && <InstructorButton onClick={onToggleInstructor} />;
  return (
    <CaseFrame autoFocus={autoFocus} subtitle="Chrichton · analytics" phase={phase} caseN={caseData.n} counters={[["REPORTS", viewed.length], ["PIVOTS", pivots.length]]} actions={instructorBtn}>
      {phase === "intro" && <Intro caseData={caseData} difficulty={def.difficulty} outcomes={def.outcomes} attempt={attempt} onInbox={onInbox} onStart={() => setPhase("investigate")} />}
      {phase === "investigate" && (
        <Suspense fallback={<div role="status" style={{ marginTop: 40, color: T.muted, fontSize: 16 }}>Opening the dashboard…</div>}>
          <Investigate caseData={caseData} metric={metric} setMetric={setMetric} activeReport={activeReport} openReport={openReport}
            onPivot={logPivot} viewed={viewed} pivots={pivots} range={range} lens={lens} onLens={chooseLens} onDiagnose={() => setPhase("diagnose")} />
        </Suspense>
      )}
      {phase === "diagnose" && (
        <Diagnose diagnosis={diagnosis} setDiagnosis={setDiagnosis} onBack={() => setPhase("investigate")} onSubmit={submitDiagnosis} />
      )}
      {phase === "reveal" && result && <Reveal caseData={caseData} diagnosis={diagnosis} result={result} viewed={viewed} pivots={pivots} lenses={lenses} onRetry={onRetry} onInbox={onInbox} onOpenReport={() => setPhase("report")} />}
      {phase === "report" && result && (
        <ReportView model={generatedReport({ caseData, cfg, attempt, diagnosis, result, viewed, pivots, lenses })} sessionKey={sessionKey} onBack={() => setPhase("reveal")} />
      )}
    </CaseFrame>
  );
}

/* ---- INTRO / TICKET --------------------------------------------- */
function Intro({ caseData, difficulty, outcomes, attempt, onInbox, onStart }) {
  useEffect(() => { loadInvestigate(); }, []); // prefetch while the ticket is read
  return (
    <div className="rise" style={{ maxWidth: 820, margin: "28px auto 0" }}>
      <button onClick={onInbox} style={{ ...linkBtn, padding: 0, marginBottom: 20 }}>← All cases</button>
      <Eyebrow title={LOS.LO3.full}>Case {pad2(caseData.n)} · {difficulty}</Eyebrow>
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

      <TicketCard ticket={caseData.ticket} style={{ marginTop: 20 }} />
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 22, flexWrap: "wrap" }}>
        <button onClick={onStart} style={btn(T.hdrBg)}>Open the dashboard →</button>
        <span style={{ color: T.muted, fontSize: 15.5 }}>Case {pad2(caseData.n)} of {ALL_CASES.length} · seed <b style={{ color: T.text, fontFamily: T.mono }}>{caseData.seed}</b>{attempt > 1 && <> · fresh variant (attempt {attempt}) — only your first attempt is scored</>}</span>
      </div>
      <CaseOutcomes outcomes={outcomes} style={{ marginTop: 26 }} />
    </div>
  );
}
