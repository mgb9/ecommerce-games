import React from "react";
import { fieldCaseById, scoreFieldDiagnosis } from "../../engine/fieldcase.js";
import { T, PLAYER, btn, linkBtn } from "../theme.js";
import { CaseFrame, PT, Term, TermsHint, TicketCard, addOnce } from "../shared.jsx";
import { CaseOutcomes } from "../Outcomes.jsx";
import { recordFirstAttempt } from "../progress.js";
import { useSessionState } from "../session.js";
import FieldInvestigate from "./FieldInvestigate.jsx";
import FieldDiagnose from "./FieldDiagnose.jsx";
import FieldReveal from "./FieldReveal.jsx";
import ReportView from "../report/ReportView.jsx";
import { fieldReport } from "./fieldReport.js";

/* ============================================================
   The field cases — 9 "The Cold Case" and 10 "The Christmas plan":
   two questions asked of one archive of real 2015 GA exports, shown
   as static, sortable reports. The mechanic differs from the
   generated cases: instead of finding a broken segment in generated
   series, the student FLAGS rows as evidence (🚩) while reading raw,
   uncleaned data, then makes three calls: verdict, smoking gun,
   first action. `fieldId` picks the question (fieldcase.js).
   App remounts this component to work the case again; the session
   state survives a refresh. Only the first attempt is recorded (the
   data is real, so a retry replays the same case).
   ============================================================ */
export default function FieldCase({ fieldId, autoFocus, sessionKey, onRestart, onExit }) {
  const def = fieldCaseById(fieldId);
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
    const scored = scoreFieldDiagnosis(guess, flags, def);
    recordFirstAttempt(def.id, scored.fieldsCorrect, 3, guess.confidence, { calls: [scored.verdictCorrect, scored.gunCorrect, scored.remedyCorrect] });
    setResult(scored); setPhase("reveal");
  }

  return (
    <CaseFrame autoFocus={autoFocus} subtitle={`Chrichton · ${def.title.toLowerCase()}`} phase={phase} caseN={def.n} counters={[["REPORTS", viewed.length], ["FLAGS", flags.length]]}>
      {phase === "intro" && <FieldIntro def={def} onStart={() => setPhase("investigate")} onExit={onExit} />}
      {phase === "investigate" && (
        <FieldInvestigate def={def} activeReport={activeReport} openReport={openReport} viewed={viewed} flags={flags} onToggleFlag={toggleFlag} onDiagnose={() => setPhase("diagnose")} />
      )}
      {phase === "diagnose" && (
        <FieldDiagnose def={def} guess={guess} setGuess={setGuess} flags={flags} onBack={() => setPhase("investigate")} onSubmit={submit} />
      )}
      {phase === "reveal" && result && <FieldReveal def={def} guess={guess} result={result} onAgain={onRestart} onExit={onExit} onOpenReport={() => setPhase("report")} />}
      {phase === "report" && result && <ReportView model={fieldReport({ def, guess, result, flags, viewed })} sessionKey={sessionKey} onBack={() => setPhase("reveal")} />}
    </CaseFrame>
  );
}

// Each question's framing: the headline, in both Englishes, and the lede.
const INTRO = {
  "cold-case-2015": {
    rich: <>The numbers say cut Paid Search.<br /><span style={{ color: PLAYER }}>The numbers are lying.</span></>,
    plain: <>The report says one channel is best.<br /><span style={{ color: PLAYER }}>Check if the data is telling the truth.</span></>,
    lede: <>Every other case was simulated. This one is the opposite — <b style={{ color: T.text }}>real Google Analytics exports</b> from a real UK electronics retailer in 2015, exactly as they came out of the tool. Nothing is generated and nothing has been cleaned. Before you trust a single percentage, ask the detective's first question: <i>can this witness be believed?</i> Watch for <Term term="selfreferral">payment-gateway self-referrals</Term>, <Term term="testtraffic">test traffic</Term>, and check the <Term term="aov">AOV</Term> of anything that looks miraculous. Flag rows with 🚩 as you go — your evidence list is scored.</>,
  },
  "christmas-plan-2015": {
    rich: <>Top products by revenue.<br /><span style={{ color: PLAYER }}>Top for whom?</span></>,
    plain: <>The plan picks the top products by revenue.<br /><span style={{ color: PLAYER }}>Check who really buys them.</span></>,
    lede: <>The same real 2015 archive as Case 09 — six Google Analytics exports, uncleaned — and a different question: marketing's Christmas plan. It ranks products by revenue and by units, puts ad money behind the busiest pages, and targets an age group the agency calls the best converters. At a reseller, a product report read by the wrong column promotes trade orders and service contracts over anything a shopper buys. Read the row names, read “Qty / purchase”, check the <Term term="coverage">coverage</Term> of the age report, and remember what Case 09 found in these numbers. Flag rows with 🚩 as you go — your evidence list is scored.</>,
  },
};

function FieldIntro({ def, onStart, onExit }) {
  const intro = INTRO[def.id];
  return (
    <div className="rise" style={{ maxWidth: 720, margin: "44px auto 0" }}>
      <h1 style={{ fontFamily: T.display, fontWeight: 700, fontSize: "clamp(32px, 6.6vw, 48px)", lineHeight: 1.05, letterSpacing: -1.2, margin: 0 }}>
        <PT rich={intro.rich} plain={intro.plain} />
      </h1>
      <p style={{ color: T.body2, fontSize: 18.5, lineHeight: 1.6, marginTop: 18 }}>{intro.lede}</p>
      <TermsHint />
      <TicketCard ticket={def.ticket} style={{ marginTop: 20 }} />
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 22, flexWrap: "wrap" }}>
        <button onClick={onStart} style={btn(T.playerBtn)}>Open the archive →</button>
        <button onClick={onExit} style={linkBtn}>← All cases</button>
      </div>
      <CaseOutcomes outcomes={def.outcomes} style={{ marginTop: 26 }} />
    </div>
  );
}
