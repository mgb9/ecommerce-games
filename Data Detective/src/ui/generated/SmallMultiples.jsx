import React, { useMemo, useState } from "react";
import { TOTAL_DAYS, dayShort } from "../../engine/engine.js";
import { T, PLAYER } from "../theme.js";
import { pct, rel } from "../format.js";
import { Chart } from "../shared.jsx";

/* Small multiples: one tiny chart per segment, for reports with too many
   rows to overlay as lines (most cross-tabs — up to 30 cells). Every panel
   shares ONE scale, starting at zero, so a cell that falls away from the
   rest looks like it; panels run in the table's default order (by share).
   The scale's top is set by the bulk of the data, not its wildest day: a
   tiny cell's spike is clipped and its panel says "off scale" rather than
   squashing every other panel flat. Each panel is a single unlabelled line
   — the panel's caption names it — with the comparison period shaded grey
   and the current period red, as on Home. Hovering a panel reads out the
   day under the pointer; the table below has every figure as text. */
const W = 200, H = 60;   // viewBox units; the SVG stretches to its cell
const x = (day) => (day / (TOTAL_DAYS - 1)) * W;

export default function SmallMultiples({ breakdown, summary, lens, lensDef: L, range, unit }) {
  const top = useMemo(() => {
    const all = breakdown.segments.flatMap((s) => breakdown.series[s.id].map((r) => r[lens])).sort((a, b) => a - b);
    return all[Math.floor(all.length * 0.97)] * 1.12 || 1;
  }, [breakdown, lens]);
  const y = (v) => H - (Math.min(v, top) / top) * H;
  const order = summary.map((r) => r.id);   // the engine's default: by share
  const bySeg = Object.fromEntries(summary.map((r) => [r.id, r]));
  return (
    <div>
      <div style={{ display: "flex", gap: "4px 16px", flexWrap: "wrap", alignItems: "center", fontSize: 13, color: T.muted, margin: "2px 0 8px" }}>
        <span>One panel per {unit}, all on one scale: 0 to {L.fmt(top)}.</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span aria-hidden="true" style={{ width: 14, height: 10, background: T.muted, opacity: 0.25, borderRadius: 2 }} />comparison period</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span aria-hidden="true" style={{ width: 14, height: 10, background: PLAYER, opacity: 0.25, borderRadius: 2 }} />current period</span>
      </div>
      <Chart label={`${breakdown.segments.length} small line charts of daily ${L.label.toLowerCase()}, one per ${unit}, on a shared scale from 0 to ${L.fmt(top)}. The table below gives each one's figures.`}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 106px), 1fr))", gap: 8 }}>
          {order.map((id) => <Panel key={id} name={bySeg[id].name} rows={breakdown.series[id]} row={bySeg[id]} lens={lens} L={L} range={range} top={top} y={y} />)}
        </div>
      </Chart>
    </div>
  );
}

function Panel({ name, rows, row, lens, L, range, top, y }) {
  const [hover, setHover] = useState(null);   // a day index, while the pointer is over the panel
  const points = rows.map((r) => `${x(r.day).toFixed(1)},${y(r[lens]).toFixed(1)}`).join(" ");
  const offScale = rows.some((r) => r[lens] > top);
  const delta = row.lens[lens].delta;
  function onMove(e) {
    const box = e.currentTarget.getBoundingClientRect();
    setHover(Math.max(0, Math.min(TOTAL_DAYS - 1, Math.round(((e.clientX - box.left) / box.width) * (TOTAL_DAYS - 1)))));
  }
  const band = ([lo, hi], fill) => <rect x={x(lo)} y={0} width={Math.max(x(hi) - x(lo), 1)} height={H} fill={fill} fillOpacity={0.12} />;
  return (
    <div aria-hidden="true" style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: "7px 8px 6px", background: T.panel }}>
      <div title={name} style={{ fontSize: 12.5, fontWeight: 700, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height={56} onMouseMove={onMove} onMouseLeave={() => setHover(null)} style={{ display: "block", margin: "4px 0", overflow: "hidden", cursor: "crosshair" }}>
        {band(range.cmp, T.muted)}
        {band(range.cur, PLAYER)}
        <line x1={0} y1={H} x2={W} y2={H} stroke={T.border} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <polyline points={points} fill="none" stroke={T.body2} strokeWidth={1.8} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {hover !== null && <line x1={x(hover)} y1={0} x2={x(hover)} y2={H} stroke={T.text} strokeWidth={1} strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />}
      </svg>
      <div style={{ fontSize: 11.5, fontFamily: T.mono, color: T.muted, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0 6px" }}>
        {hover !== null
          ? <span style={{ color: T.text }}>{dayShort(hover)} · {L.fmt(rows[hover][lens])}</span>
          : <><span>share {pct(row.shareLate, 0)}</span><span style={{ fontWeight: 700, color: delta < -0.15 ? T.neg : delta > 0.15 ? T.pos : T.muted }}>{rel(delta, 0)}</span></>}
      </div>
      {offScale && <div style={{ fontSize: 11.5, color: T.amber, marginTop: 2 }}>↑ some days off scale</div>}
    </div>
  );
}
