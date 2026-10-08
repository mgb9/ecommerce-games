import React from "react";
import { FIELD_ROW_NAMES } from "../../engine/fieldcase.js";
import { T, card, linkBtn } from "../theme.js";
import { PickGroup, ScreenTitle, SectionTitle, SubmitBar, useNarrow } from "../shared.jsx";
import { CONFIDENCE } from "../progress.js";

const CONFIDENCE_OPTIONS = CONFIDENCE.map((c) => ({ id: c.id, label: `${c.label} — ${c.hint}` }));

// The three calls of a field case (`def`: its verdicts, guns, remedies and
// the titles that frame them), plus the evidence flagged so far.
export default function FieldDiagnose({ def, guess, setGuess, flags, onBack, onSubmit }) {
  const pick = (field) => (id) => setGuess((g) => ({ ...g, [field]: id }));
  const ready = guess.verdict && guess.gun && guess.remedy && guess.confidence;
  const narrow = useNarrow();
  return (
    <div className="rise" style={{ marginTop: 22, maxWidth: 980, marginLeft: "auto", marginRight: "auto" }}>
      <ScreenTitle title="Present your findings" size={26}>
        <button onClick={onBack} style={linkBtn}>← back to the reports</button>
      </ScreenTitle>
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "minmax(0,1fr)" : "minmax(0,1.5fr) minmax(0,1fr)", gap: 18, marginTop: 14 }}>
        <div style={card()}>
          <PickGroup long title={def.verdictTitle} options={def.verdicts} value={guess.verdict} onChange={pick("verdict")} />
          <PickGroup long title={def.gunTitle} options={def.guns} value={guess.gun} onChange={pick("gun")} />
          <PickGroup long title="3 · The first action" options={def.remedies} value={guess.remedy} onChange={pick("remedy")} />
          <PickGroup title="4 · How sure are you that all three calls are right?" options={CONFIDENCE_OPTIONS} value={guess.confidence} onChange={pick("confidence")} />
        </div>
        <div style={{ ...card(), alignSelf: "start" }}>
          <SectionTitle>🚩 Your evidence ({flags.length})</SectionTitle>
          {flags.length === 0 ? (
            <div style={{ fontSize: 14, color: T.muted, lineHeight: 1.5 }}>Nothing flagged. You can still submit, but a verdict without evidence is just an opinion — go back and flag the rows that prove your case.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {flags.map((id) => {
                const name = FIELD_ROW_NAMES[id] ?? id;
                return <div key={id} title={name} style={{ fontFamily: T.mono, fontSize: 12.5, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>· {name}</div>;
              })}
            </div>
          )}
        </div>
      </div>
      <SubmitBar ready={ready} onSubmit={onSubmit} label="Submit findings →" notReadyLabel="Make all three calls, and say how sure you are" />
    </div>
  );
}
