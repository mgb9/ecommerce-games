import React, { useMemo } from "react";
import { dayShort, reviewTrail } from "../../engine/engine.js";
import { T, card, btn } from "../theme.js";
import { ordinal, pad2 } from "../format.js";
import { causeLabel, dimsText, segsText, generatedCaseReport, downloadText } from "../caseReport.js";
import { ResultRow, RevealHeadline, SectionTitle, Tag, useNarrow } from "../shared.jsx";

export default function Reveal({ caseData, cfg, diagnosis, result, viewed, pivots, onRestart }) {
  const truth = caseData.truth;
  const narrow = useNarrow();
  const review = useMemo(() => reviewTrail(caseData, viewed, pivots), [caseData, viewed, pivots]);
  const download = () => downloadText(`data-detective-case-${pad2(caseData.n)}.md`, generatedCaseReport({ caseData, cfg, diagnosis, result, viewed, pivots, review }));
  return (
    <div className="rise" style={{ marginTop: 22 }}>
      <RevealHeadline kicker={`CASE ${caseData.n} — SOLVED`} title={`${result.fieldsCorrect}/4 correct`} />
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "minmax(0,1fr)" : "minmax(0,1fr) minmax(0,1fr)", gap: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={card()}>
            <SectionTitle>Your diagnosis vs the truth</SectionTitle>
            <ResultRow ok={result.dimensionCorrect} label="Dimension" you={dimsText(diagnosis)} truth={dimsText(truth)} />
            <ResultRow ok={result.segmentCorrect} label="Segment" you={segsText(diagnosis)} truth={segsText(truth)} />
            <ResultRow ok={result.causeTypeCorrect} label="Cause" you={causeLabel(diagnosis.causeType)} truth={causeLabel(truth.causeType)} />
            <ResultRow ok={result.dateCorrect} label="Start" you={dayShort(diagnosis.startDay)} truth={dayShort(truth.startDay)} />
          </div>
          <TrailCard review={review} />
        </div>
        <div style={card()}>
          <SectionTitle>What actually happened</SectionTitle>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: T.text }}>{truth.explanation}</p>
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 7 }}>Timeline events, now revealed</div>
            {caseData.events.map((e, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: 14, marginBottom: 5 }}>
                <Tag tone={e.real ? "pos" : "amber"}>{e.real ? "REAL CAUSE" : "RED HERRING"}</Tag>
                <span>{e.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ ...card(), marginTop: 18, borderLeft: `6px solid ${T.player}` }}>
        <SectionTitle>The principle</SectionTitle>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6 }}>{truth.lesson}</p>
      </div>
      <div style={{ textAlign: "center", marginTop: 22, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <button onClick={onRestart} style={btn(T.playerBtn)}>Run it again ↺</button>
        <button onClick={download} style={{ ...btn("transparent"), border: `1.5px solid ${T.border}` }}>Download case report</button>
      </div>
      <p style={{ textAlign: "center", fontSize: 13.5, color: T.muted, marginTop: 10 }}>The report lists your calls, your investigation trail and reflection questions for the seminar.</p>
    </div>
  );
}

// Process feedback: where the signal was, whether the student got there,
// and what else they opened on the way. Dead ends are normal — reported,
// not penalised.
function TrailCard({ review: r }) {
  const line = (ok, children) => (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", borderBottom: `1px solid ${T.border}`, fontSize: 14.5, lineHeight: 1.5 }}>
      <span style={{ color: ok ? T.pos : T.neg, fontWeight: 700, minWidth: 14 }}><span aria-hidden="true">{ok ? "✓" : "✗"}</span><span className="sr-only">{ok ? "Yes:" : "No:"}</span></span>
      <span>{children}</span>
    </div>
  );
  const view = r.compound ? "cross-tab" : "report";
  return (
    <div style={card()}>
      <SectionTitle>How you investigated</SectionTitle>
      {line(r.found, r.found
        ? <>The signal was in <b>{r.decisive}</b> — your {ordinal(r.foundAt)} {view}.</>
        : <>The signal was in <b>{r.decisive}</b>, which you never {r.compound ? "built" : "opened"}.{r.compound ? " Each single report only shows a diluted part of the drop." : ""}</>)}
      {r.funnelStage && line(r.usedFunnel, <>{r.usedFunnel ? "You used" : "You didn't use"} <b>Funnel exploration</b>. Filtered to the broken segment, it pins the drop to the <b>{r.funnelStage}</b> step — a strong clue to the cause.</>)}
      <div style={{ fontSize: 13.5, color: T.muted, marginTop: 10, lineHeight: 1.5 }}>
        You opened {r.reportsOpened} report{r.reportsOpened === 1 ? "" : "s"} ({r.deadEnds} {r.deadEnds === 1 ? "was a dead end" : "were dead ends"}) and built {r.pivotsBuilt} cross-tab{r.pivotsBuilt === 1 ? "" : "s"}. Ruling things out is part of the job; what matters is whether each view was chosen for a reason.
      </div>
    </div>
  );
}
