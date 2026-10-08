import React from "react";
import { FIELD_CASE, scoreFieldDiagnosis } from "../../engine/fieldcase.js";
import { T, PLAYER, btn, linkBtn } from "../theme.js";
import { CaseFrame, LOBadges, PT, Term, TermsHint, TicketCard, addOnce } from "../shared.jsx";
import { recordFirstAttempt } from "../progress.js";
import { useSessionState } from "../session.js";
import FieldInvestigate from "./FieldInvestigate.jsx";
import FieldDiagnose from "./FieldDiagnose.jsx";
import FieldReveal from "./FieldReveal.jsx";
import ReportView from "../report/ReportView.jsx";
import { fieldReport } from "./fieldReport.js";

/* ============================================================
   Case 8 — "The Cold Case". Real 2015 GA exports as static,
   sortable reports. The mechanic differs from cases 1–7: instead
   of finding a broken segment in generated series, the student
   FLAGS rows as evidence (🚩) while reading raw, uncleaned data,
   then makes three calls: verdict, smoking gun, first action.
   App remounts this component to work the case again; the session state
   survives a refresh. Only the first attempt is recorded (the data is real,
   so a retry replays the same case).
   ============================================================ */
export default function FieldCase({ autoFocus, sessionKey, onRestart, onExit }) {
  const key = (name) => `${sessionKey}:${name}`;
  const [phase, setPhase] = useSessionState(key("phase"), "intro");
  const [activeReport, setActiveReport] = useSessionState(key("report"), "overview");
  const [viewed, setViewed] = useSessionState(key("viewed"), []);
  const [flags, setFlags] = useSessionState(key("flags"), []);
  const [guess, setGuess] = useSessionState(key("guess"), { verdict: null, gun: null, remedy: null, confidence: null });
  const [result, setResult] = useSessionState(key("result"), null);

  function openReport(key) { setActiveReport(key); if (key !== "overview") setViewed(addOnce(key)); }
  function toggleFlag(id) { setFlags((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id])); }
  function submit() {
    const scored = scoreFieldDiagnosis(guess, flags);
    recordFirstAttempt(FIELD_CASE.id, scored.fieldsCorrect, 3, guess.confidence);
    setResult(scored); setPhase("reveal");
  }

  return (
    <CaseFrame autoFocus={autoFocus} subtitle="Chrichton · the cold case" phase={phase} caseN={FIELD_CASE.n} counters={[["REPORTS", viewed.length], ["FLAGS", flags.length]]}>
      {phase === "intro" && <FieldIntro onStart={() => setPhase("investigate")} onExit={onExit} />}
      {phase === "investigate" && (
        <FieldInvestigate activeReport={activeReport} openReport={openReport} viewed={viewed} flags={flags} onToggleFlag={toggleFlag} onDiagnose={() => setPhase("diagnose")} />
      )}
      {phase === "diagnose" && (
        <FieldDiagnose guess={guess} setGuess={setGuess} flags={flags} onBack={() => setPhase("investigate")} onSubmit={submit} />
      )}
      {phase === "reveal" && result && <FieldReveal guess={guess} result={result} onAgain={onRestart} onExit={onExit} onOpenReport={() => setPhase("report")} />}
      {phase === "report" && result && <ReportView model={fieldReport({ guess, result, flags, viewed })} sessionKey={sessionKey} onBack={() => setPhase("reveal")} />}
    </CaseFrame>
  );
}

function FieldIntro({ onStart, onExit }) {
  return (
    <div className="rise" style={{ maxWidth: 720, margin: "44px auto 0" }}>
      <h1 style={{ fontFamily: T.display, fontWeight: 700, fontSize: "clamp(32px, 6.6vw, 48px)", lineHeight: 1.05, letterSpacing: -1.2, margin: 0 }}>
        <PT rich={<>The numbers say cut Paid Search.<br /><span style={{ color: PLAYER }}>The numbers are lying.</span></>}
            plain={<>The report says one channel is best.<br /><span style={{ color: PLAYER }}>Check if the data is telling the truth.</span></>} />
      </h1>
      <p style={{ color: T.body2, fontSize: 18.5, lineHeight: 1.6, marginTop: 18 }}>
        Cases 1–7 were simulated. This one is the opposite — <b style={{ color: T.text }}>real Google Analytics exports</b> from a real UK electronics retailer in 2015, exactly as they came out of the tool. Nothing is generated and nothing has been cleaned. Before you trust a single percentage, ask the detective's first question: <i>can this witness be believed?</i> Watch for <Term term="selfreferral">payment-gateway self-referrals</Term>, <Term term="testtraffic">test traffic</Term>, and check the <Term term="aov">AOV</Term> of anything that looks miraculous. Flag rows with 🚩 as you go — your evidence list is scored.
      </p>
      <LOBadges los={["LO3"]} />
      <TermsHint />
      <TicketCard ticket={FIELD_CASE.ticket} style={{ marginTop: 20 }} />
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 22, flexWrap: "wrap" }}>
        <button onClick={onStart} style={btn(T.playerBtn)}>Open the archive →</button>
        <button onClick={onExit} style={linkBtn}>← back to cases 1–7</button>
      </div>
    </div>
  );
}
