import React, { useMemo, useState } from "react";
import { DIMENSIONS, DMAP, FUNNEL_STAGES, buildFunnel } from "../../engine/engine.js";
import { T, SEG_COLORS, card, pillBtn, selStyle } from "../theme.js";
import { pct, pp, rel } from "../format.js";
import { SectionTitle } from "../shared.jsx";

/* Funnel exploration: sessions → purchase step rates, for the whole site
   or filtered to one segment / a two-dimension cell. Only the exact
   incident segment pins the drop to a single step. */
const NO_FILTER = { dim: "", seg: "" };

export default function FunnelView({ caseData, range }) {
  const [f1, setF1] = useState(NO_FILTER);
  const [f2, setF2] = useState(NO_FILTER);
  const f1Done = !!(f1.dim && f1.seg);
  const filters = useMemo(() => [f1, f2].filter((f) => f.dim && f.seg), [f1, f2]);
  const funnel = useMemo(() => buildFunnel(caseData, filters, range.cur, range.cmp), [caseData, filters, range.cur, range.cmp]);
  const maxStep = Math.max(...FUNNEL_STAGES.map((s) => funnel.summary[s.key].late));
  const overall = funnel.summary.overall;
  return (
    <div className="rise" style={card()}>
      <SectionTitle>🔻 Funnel exploration — sessions → purchase</SectionTitle>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
        <span style={{ fontSize: 13.5, color: T.muted }}>Filter to</span>
        <SegmentFilter value={f1} onChange={setF1} exclude={f2.dim} />
        {f1Done && <span style={{ color: T.muted }}>×</span>}
        {f1Done && <SegmentFilter value={f2} onChange={setF2} exclude={f1.dim} />}
        {(f1.dim || f2.dim) && <button onClick={() => { setF1(NO_FILTER); setF2(NO_FILTER); }} style={{ ...pillBtn(false), padding: "6px 10px" }}>clear</button>}
      </div>
      <div style={{ fontSize: 13, color: funnel.attributedStage ? T.amber : T.muted, marginBottom: 14, lineHeight: 1.4 }}>
        {filters.length === 0 ? "This is the whole site. A problem in one segment is hidden here, mixed in with all the healthy traffic. Add a filter to see which step fell."
          : funnel.attributedStage ? "✓ This is exactly one segment (or one Device × Browser combination). If a step broke for this group, it will show clearly below."
          : "This filter still mixes several groups together. A single broken step will not stand out until you filter to the exact segment (or Device × Browser combination)."}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {FUNNEL_STAGES.map((s, i) => {
          const st = funnel.summary[s.key];
          const worst = st.pctChange < -0.3;
          return (
            <div key={s.key}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3, fontSize: 14 }}>
                <span style={{ fontWeight: 600 }}>{i + 1}. {s.label} <span style={{ color: T.muted, fontWeight: 400, fontSize: 12.5 }}>step rate</span></span>
                <span style={{ fontFamily: T.mono }}><span style={{ color: T.muted }}>{pct(st.early, 1)} → </span><b style={{ color: worst ? T.neg : T.text }}>{pct(st.late, 1)}</b> <span style={{ color: st.pctChange < -0.1 ? T.neg : st.pctChange > 0.1 ? T.pos : T.muted, fontWeight: 700 }}>{rel(st.pctChange, 0)}</span> <span style={{ color: T.muted }}>({pp(st.late - st.early, 1)})</span></span>
              </div>
              <div style={{ height: 14, background: T.track, borderRadius: 7, overflow: "hidden" }}>
                <div style={{ width: `${Math.round((st.late / maxStep) * 100)}%`, height: "100%", background: worst ? T.neg : SEG_COLORS[0], transition: "width .3s" }} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", fontSize: 14.5 }}>
        <span style={{ color: T.muted }}>Overall conversion ({range.cmpName} → now)</span>
        <span style={{ fontFamily: T.mono }}>{pct(overall.early, 2)} → <b>{pct(overall.late, 2)}</b> <span style={{ color: overall.pctChange < 0 ? T.neg : T.pos, fontWeight: 700 }}>{rel(overall.pctChange, 0)}</span> <span style={{ color: T.muted }}>({pp(overall.late - overall.early, 2)})</span></span>
      </div>
    </div>
  );
}

function SegmentFilter({ value, onChange, exclude }) {
  return (
    <span style={{ display: "inline-flex", gap: 6 }}>
      <select aria-label="Filter dimension" value={value.dim} onChange={(e) => onChange({ dim: e.target.value, seg: "" })} style={selStyle(value.dim)}>
        <option value="">— dimension —</option>
        {DIMENSIONS.filter((d) => d.key !== exclude).map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
      </select>
      <select aria-label="Filter segment" value={value.seg} onChange={(e) => onChange({ ...value, seg: e.target.value })} disabled={!value.dim} style={{ ...selStyle(value.seg), opacity: value.dim ? 1 : 0.5 }}>
        <option value="">— segment —</option>
        {value.dim && DMAP[value.dim].segments.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </span>
  );
}
