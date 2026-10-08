import React from "react";
import { T, card, btn } from "../theme.js";
import { ConfidenceVerdict, Explanation, ResultRow, RevealHeadline, SectionTitle, Tag, useNarrow } from "../shared.jsx";
import { confidenceText } from "../report/labels.js";
import { SkillsPractised } from "../Outcomes.jsx";
import { confidenceLine, replyName } from "../outcomesModel.js";

const label = (opts, id) => opts.find((o) => o.id === id)?.label || "—";
const short = (s) => (s.length > 110 ? s.slice(0, 107) + "…" : s);

// The reveal of a field case (`def`: its truths, clues and explanation).
export default function FieldReveal({ def, guess, result, onAgain, onExit, onOpenReport }) {
  const narrow = useNarrow();
  return (
    <div className="rise" style={{ marginTop: 22 }}>
      <RevealHeadline kicker={`CASE ${def.n} — CLOSED`} title={`${result.fieldsCorrect}/3 calls · ${result.cluesFound}/${result.clueTotal} clues found`}>
        {result.coreFound < result.coreTotal && <div style={{ color: T.amber, fontSize: 14.5 }}>You missed {result.coreTotal - result.coreFound} of the {result.coreTotal} core clues — the ones the whole case turns on.</div>}
      </RevealHeadline>
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "minmax(0,1fr)" : "minmax(0,1fr) minmax(0,1fr)", gap: 18 }}>
        <div style={card()}>
          <SectionTitle>Your calls vs the truth</SectionTitle>
          <ResultRow long ok={result.verdictCorrect} label="Verdict" you={short(label(def.verdicts, guess.verdict))} truth={short(label(def.verdicts, def.verdictTruth))} />
          <ResultRow long ok={result.gunCorrect} label="Smoking gun" you={label(def.guns, guess.gun)} truth={label(def.guns, def.gunTruth)} />
          <ResultRow long ok={result.remedyCorrect} label="First action" you={short(label(def.remedies, guess.remedy))} truth={short(label(def.remedies, def.remedyTruth))} />
          <ConfidenceVerdict confidence={guess.confidence} label={confidenceText(guess.confidence)} allCorrect={result.allCorrect} score={result.fieldsCorrect} outOf={3} />
          <div style={{ marginTop: 12, fontSize: 13, color: T.muted }}>These were real exports from a real retailer's Google Analytics — every number you just argued about actually happened in autumn 2015.</div>
        </div>
        <div style={card()}>
          <SectionTitle>What actually happened</SectionTitle>
          <Explanation explanation={def.explanation} />
        </div>
      </div>
      <div style={{ ...card(), marginTop: 18 }}>
        <SectionTitle>The clue chain — what you found, what you missed</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {result.clueDetail.map((c) => (
            <div key={c.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <Tag tone={c.found ? "pos" : "neg"} style={{ marginTop: 1 }}>{c.found ? "FLAGGED" : "MISSED"}</Tag>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 700 }}>{c.label}{c.core && <span style={{ color: T.amber, fontWeight: 600, fontSize: 12.5 }}> · core clue</span>}</div>
                <div style={{ fontSize: 14, color: T.muted, lineHeight: 1.55, marginTop: 2 }}>{c.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ ...card(), marginTop: 18, borderLeft: `6px solid ${T.player}` }}>
        <SectionTitle>The principle</SectionTitle>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6 }}>{def.lesson}</p>
      </div>
      <SkillsPractised outcomes={def.outcomes} replyTo={replyName(def.ticket.from)} confidence={confidenceLine(guess.confidence, result.fieldsCorrect, 3)} style={{ marginTop: 18 }} />
      <div style={{ textAlign: "center", marginTop: 22, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <button onClick={onAgain} style={btn(T.playerBtn)}>Work the case again ↺</button>
        <button onClick={onOpenReport} style={{ ...btn("transparent"), border: `1.5px solid ${T.border}` }}>Open your case report (PDF)</button>
        <button onClick={onExit} style={{ ...btn("transparent"), border: `1.5px solid ${T.border}` }}>Back to the case inbox</button>
      </div>
      <p style={{ textAlign: "center", fontSize: 13.5, color: T.muted, marginTop: 10 }}>Your case report has your calls, the evidence you flagged, the clue chain and reflection questions you can answer before saving it as a PDF. The data is real, so working the case again replays it — only your first attempt's score is kept.</p>
    </div>
  );
}
