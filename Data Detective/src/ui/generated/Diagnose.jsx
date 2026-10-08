import React from "react";
import { DIMENSIONS, DMAP, CAUSE_TYPES, TOTAL_DAYS, dayLong } from "../../engine/engine.js";
import { T, PLAYER, card, linkBtn, selStyle } from "../theme.js";
import { PickGroup, ScreenTitle, SubmitBar, useNarrow } from "../shared.jsx";

const DIM_OPTIONS = DIMENSIONS.map((d) => ({ id: d.key, label: d.label }));
const CAUSE_OPTIONS = CAUSE_TYPES.map((c) => ({ id: c.id, label: c.label }));
const fullSel = (filled) => ({ ...selStyle(filled), width: "100%", padding: "9px 11px", fontSize: 14.5 });

export default function Diagnose({ diagnosis, setDiagnosis, onBack, onSubmit }) {
  const set = (patch) => setDiagnosis((d) => ({ ...d, ...patch }));
  const cols = useNarrow() ? "minmax(0,1fr)" : "minmax(0,1fr) minmax(0,1fr)";
  const primaryDim = DMAP[diagnosis.dimension];
  const secondaryDim = DMAP[diagnosis.secondary];
  const secondaryComplete = !diagnosis.secondary || !!diagnosis.segmentB;
  const ready = diagnosis.dimension && diagnosis.segment && diagnosis.causeType && secondaryComplete;
  return (
    <div className="rise" style={{ marginTop: 22, maxWidth: 920, marginLeft: "auto", marginRight: "auto" }}>
      <ScreenTitle title="Submit your diagnosis" size={26}>
        <button onClick={onBack} style={linkBtn}>← back to the dashboard</button>
      </ScreenTitle>
      <div style={{ display: "grid", gridTemplateColumns: cols, gap: 18, marginTop: 14 }}>
        <div style={card()}>
          <PickGroup title="1 · Which dimension is the issue in?" value={diagnosis.dimension} options={DIM_OPTIONS}
            onChange={(key) => set({ dimension: key, segment: null })} />
          <PickGroup title="2 · Which segment?" value={diagnosis.segment} empty="Pick a dimension first."
            options={primaryDim ? primaryDim.segments.map((s) => ({ id: s.id, label: s.name })) : []}
            onChange={(id) => set({ segment: id })} />
        </div>
        <div style={card()}>
          <PickGroup title="3 · What's the likely cause?" value={diagnosis.causeType} options={CAUSE_OPTIONS}
            onChange={(id) => set({ causeType: id })} />
          <label htmlFor="dd-start-day" style={{ display: "block", fontSize: 15, fontWeight: 600, marginBottom: 8 }}>4 · Roughly when did it start?</label>
          <span aria-hidden="true" style={{ fontFamily: T.mono, fontWeight: 700, color: T.playerText, fontSize: 15 }}>{dayLong(diagnosis.startDay)}</span>
          <input id="dd-start-day" type="range" min={0} max={TOTAL_DAYS - 1} step={1} value={diagnosis.startDay} aria-valuetext={dayLong(diagnosis.startDay)} onChange={(e) => set({ startDay: Number(e.target.value) })} style={{ width: "100%", margin: "8px 0 5px", "--accent": PLAYER, "--accent-soft": PLAYER + "30" }} />
          <div style={{ fontSize: 13, color: T.muted }}>Doesn't need to be exact — within a few days is fine.</div>
        </div>
      </div>

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Is it a <i>combination</i> of segments? (optional)</div>
        <div style={{ fontSize: 13.5, color: T.muted, lineHeight: 1.5, marginBottom: 10 }}>If the issue only appears when you cross two dimensions (e.g. a specific browser <i>on</i> a specific device), name the second one here. Leave as “No second dimension” if it's a single segment.</div>
        <div style={{ display: "grid", gridTemplateColumns: cols, gap: 14 }}>
          <div>
            <div style={{ fontSize: 13.5, color: T.muted, marginBottom: 6 }}>Secondary dimension</div>
            <select aria-label="Secondary dimension for the diagnosis" value={diagnosis.secondary || ""} onChange={(e) => set({ secondary: e.target.value || null, segmentB: null })}
              style={fullSel(diagnosis.secondary)}>
              <option value="">No second dimension</option>
              {DIMENSIONS.filter((d) => d.key !== diagnosis.dimension).map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 13.5, color: T.muted, marginBottom: 6 }}>…and which {secondaryDim ? secondaryDim.label.toLowerCase() : "segment"}?</div>
            <select aria-label="Secondary segment for the diagnosis" value={diagnosis.segmentB || ""} disabled={!diagnosis.secondary} onChange={(e) => set({ segmentB: e.target.value || null })}
              style={{ ...fullSel(diagnosis.segmentB), cursor: diagnosis.secondary ? "pointer" : "not-allowed", opacity: diagnosis.secondary ? 1 : 0.5 }}>
              <option value="">{diagnosis.secondary ? "Pick a segment…" : "—"}</option>
              {secondaryDim && secondaryDim.segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <SubmitBar ready={ready} onSubmit={onSubmit} label="Submit diagnosis →" notReadyLabel="Pick a dimension, segment & cause to continue" />
    </div>
  );
}
