import React, { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from "recharts";
import { DIMENSIONS, DMAP, buildCrossTab, summariseSegments, dayShort, dayLong } from "../../engine/engine.js";
import { T, PLAYER, card, segColor, selStyle, tipStyle } from "../theme.js";
import { gbp, num, pct, pp, secs } from "../format.js";
import { Chart, LegendLine, SectionTitle, ShareBar, SortTh, Term, useSortable } from "../shared.jsx";

// Each segment's line has a dash pattern as well as a colour, so the chart
// doesn't rely on colour alone (WCAG 1.4.1); the legend and the table rows
// show the same line sample.
const DASHES = ["", "7 4", "2 3", "10 3 2 3", "1 3", "5 2"];
const dashOf = (i) => DASHES[i % DASHES.length];

/* One dimension's report: a per-segment conversion chart plus the
   sortable GA-style table, optionally cross-tabbed by a secondary
   dimension. Keyed by the dimension, so switching report resets the pivot. */
export default function ReportPanel({ caseData, reportDim, onPivot, range }) {
  const [secondary, setSecondary] = useState(null);
  function chooseSecondary(key) { setSecondary(key); onPivot(reportDim.key, key); }
  const breakdown = useMemo(() => (secondary ? buildCrossTab(caseData, reportDim.key, secondary) : reportDim), [caseData, reportDim, secondary]);
  const summary = useMemo(() => summariseSegments(breakdown, range.cmp, range.cur), [breakdown, range.cmp, range.cur]);
  const pivoted = useMemo(() => (breakdown.segments.length <= 6 ? pivotByDay(breakdown.series, breakdown.segments.map((s) => s.id)) : null), [breakdown]);

  return (
    <div className="rise" style={card()}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
        <SectionTitle>{breakdown.isCrossTab ? breakdown.label : reportDim.label} — conversion rate</SectionTitle>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13.5, color: T.muted }}>Secondary dimension</span>
          <select aria-label="Add a secondary dimension to cross-tab this report" value={secondary || ""} onChange={(e) => chooseSecondary(e.target.value || null)}
            style={{ ...selStyle(secondary), padding: "7px 10px" }}>
            <option value="">None</option>
            {DIMENSIONS.filter((d) => d.key !== reportDim.key).map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
          </select>
        </div>
      </div>
      {breakdown.isCrossTab && <div style={{ fontSize: 13, color: T.amber, marginBottom: 8 }}>↳ Cross-tab: every {reportDim.label} × {DMAP[secondary].label} combination. Watch for a single cell behaving unlike the rest.</div>}
      {pivoted && (
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13.5, color: T.muted, margin: "2px 0 6px" }}>
          {breakdown.segments.map((s, i) => <LegendLine key={s.id} color={segColor(i)} dash={dashOf(i)} label={s.name} />)}
        </div>
      )}
      {pivoted ? (
        <Chart label={`Line chart of daily conversion rate, one line per ${breakdown.isCrossTab ? "combination" : "segment"}: ${breakdown.segments.map((s) => s.name).join(", ")}. The table below gives each one's figures.`}>
        <ResponsiveContainer width="100%" height={210}>
          <LineChart data={pivoted} margin={{ top: 6, right: 14, bottom: 0, left: -6 }}>
            <CartesianGrid stroke={T.border} strokeDasharray="3 3" />
            <XAxis dataKey="day" tickLine={false} tickFormatter={dayShort} interval={3} />
            <YAxis tickLine={false} width={48} tickFormatter={(v) => pct(v, 0)} />
            <Tooltip contentStyle={tipStyle} formatter={(v, id) => [pct(v, 2), breakdown.segments.find((s) => s.id === id)?.name || id]} labelFormatter={dayLong} />
            <ReferenceArea x1={range.cur[0]} x2={range.cur[1]} fill={PLAYER} fillOpacity={0.08} />
            {breakdown.segments.map((s, i) => <Line key={s.id} type="monotone" dataKey={s.id} stroke={segColor(i)} strokeDasharray={dashOf(i)} strokeWidth={2.3} dot={false} isAnimationActive={false} />)}
          </LineChart>
        </ResponsiveContainer>
        </Chart>
      ) : (
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 4 }}>{breakdown.segments.length} rows — too many to chart cleanly. Use the sortable table.</div>
      )}
      <SegmentTable breakdown={breakdown} summary={summary} />
    </div>
  );
}
// Rows of { day, [segId]: conversionRate } for the multi-line chart.
function pivotByDay(seriesBySeg, segIds) {
  const days = seriesBySeg[segIds[0]].map((r) => r.day);
  return days.map((day, i) => { const row = { day }; for (const id of segIds) row[id] = seriesBySeg[id][i].conversionRate; return row; });
}

/* ---- the GA-style sortable breakdown table ------------------------- */
// `group` tags let the header show metric families (Users / Engagement /
// Conversions). Conversion is the only family the incident actually
// moves; the rest are realistic detail and decoys.
const td = (align, extra) => ({ padding: "6px 8px", textAlign: align, fontFamily: T.mono, whiteSpace: "nowrap", color: T.muted, ...extra });
const TABLE_COLS = [
  { key: "name", label: "Segment", align: "left", group: "", render: (r, segIdx) => (
    <th scope="row" style={{ padding: "6px 8px", display: "flex", alignItems: "center", gap: 7, textAlign: "left", fontWeight: 400 }}>
      <svg width="20" height="8" aria-hidden="true" style={{ flexShrink: 0 }}><line x1="1" y1="4" x2="19" y2="4" stroke={segColor(segIdx)} strokeWidth="2.5" strokeDasharray={dashOf(segIdx)} /></svg>
      <span style={{ fontFamily: T.body, color: T.text }}>{r.name}</span>
    </th>) },
  { key: "sessionsLate", label: "Sessions", group: "Users", render: (r) => <td style={td("right", { color: T.text })}>{num(r.sessionsLate)}</td> },
  { key: "shareLate", label: "Share", group: "Users", render: (r) => <td style={td("right")}><ShareBar share={r.shareLate} /></td> },
  { key: "engRateLate", label: "Engagement", group: "Engagement", render: (r) => <td style={td("right")}>{pct(r.engRateLate, 1)}</td> },
  { key: "engTimeLate", label: "Avg time", group: "Engagement", render: (r) => <td style={td("right")}>{secs(r.engTimeLate)}</td> },
  { key: "eventsLate", label: "Events", group: "Engagement", render: (r) => <td style={td("right")}>{num(r.eventsLate)}</td> },
  { key: "avgEarly", label: "Was", group: "Conv. rate", render: (r) => <td style={td("right")}>{pct(r.avgEarly, 1)}</td> },
  { key: "avgLate", label: "Now", group: "Conv. rate", render: (r) => <td style={td("right", { color: T.text })}>{pct(r.avgLate, 1)}</td> },
  { key: "pctChange", label: "Δ", group: "Conv. rate", render: (r) => <td style={td("right", { fontWeight: 700, color: r.pctChange < -0.15 ? T.neg : r.pctChange > 0.15 ? T.pos : T.muted })}>{pp(r.pctChange, 0)}</td> },
  { key: "revenueLate", label: "Revenue", group: "Conversions", render: (r) => <td style={td("right")}>{gbp(r.revenueLate)}</td> },
];
// Group-header row: consecutive columns sharing a family span one cell.
const COL_GROUPS = TABLE_COLS.reduce((gs, c) => {
  const last = gs[gs.length - 1];
  if (last && last.group === c.group) last.span++; else gs.push({ group: c.group, span: 1 });
  return gs;
}, []);
const fieldOf = (row, key) => row[key];

function SegmentTable({ breakdown, summary }) {
  const sort = useSortable(summary, fieldOf); // unsorted = engine default, by share desc
  return (
    <div role="region" aria-label="Segment comparison table (scrollable)" tabIndex={0} style={{ marginTop: 12, overflowX: "auto" }}>
      <div style={{ fontSize: 12.5, color: T.muted, marginBottom: 6 }}>Comparison period vs current · click a column to sort. Δ is the change in <Term term="pp">percentage points (pp)</Term>. Only <b style={{ color: T.text }}>Conv. rate</b> is changed by the incident; the other columns are real detail that can mislead you.</div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 720 }}>
        <thead>
          <tr>{COL_GROUPS.map((g, i) => <th key={i} colSpan={g.span} style={{ textAlign: g.group === "" ? "left" : "right", padding: "2px 8px", color: T.muted, fontSize: 11.5, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>{g.group}</th>)}</tr>
          <tr>{TABLE_COLS.map((c) => <SortTh key={c.key} sort={sort} colKey={c.key} label={c.label} align={c.align} />)}</tr>
        </thead>
        <tbody>
          {sort.rows.map((row) => {
            const segIdx = breakdown.segments.findIndex((s) => s.id === row.id);
            return <tr key={row.id}>{TABLE_COLS.map((c) => <React.Fragment key={c.key}>{c.render(row, segIdx)}</React.Fragment>)}</tr>;
          })}
        </tbody>
      </table>
    </div>
  );
}
