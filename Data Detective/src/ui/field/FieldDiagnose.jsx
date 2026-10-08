import React from "react";
import { FIELD_VERDICTS, FIELD_GUNS, FIELD_REMEDIES, FIELD_ROW_NAMES } from "../../engine/fieldcase.js";
import { T, card, linkBtn } from "../theme.js";
import { PickGroup, ScreenTitle, SectionTitle, SubmitBar, useNarrow } from "../shared.jsx";

export default function FieldDiagnose({ guess, setGuess, flags, onBack, onSubmit }) {
  const pick = (field) => (id) => setGuess((g) => ({ ...g, [field]: id }));
  const ready = guess.verdict && guess.gun && guess.remedy;
  const narrow = useNarrow();
  return (
    <div className="rise" style={{ marginTop: 22, maxWidth: 980, marginLeft: "auto", marginRight: "auto" }}>
      <ScreenTitle title="Present your findings" size={26}>
        <button onClick={onBack} style={linkBtn}>← back to the reports</button>
      </ScreenTitle>
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "minmax(0,1fr)" : "minmax(0,1.5fr) minmax(0,1fr)", gap: 18, marginTop: 14 }}>
        <div style={card()}>
          <PickGroup long title="1 · Your verdict to the board" options={FIELD_VERDICTS} value={guess.verdict} onChange={pick("verdict")} />
          <PickGroup long title="2 · The smoking gun — the one row that proves the revenue figure cannot be trusted" options={FIELD_GUNS} value={guess.gun} onChange={pick("gun")} />
          <PickGroup long title="3 · The first action" options={FIELD_REMEDIES} value={guess.remedy} onChange={pick("remedy")} />
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
      <SubmitBar ready={ready} onSubmit={onSubmit} label="Submit findings →" notReadyLabel="Make all three calls to continue" />
    </div>
  );
}
