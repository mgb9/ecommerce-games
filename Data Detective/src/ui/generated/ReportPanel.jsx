import React, { useCallback, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from "recharts";
import { DIMENSIONS, DMAP, LENSES, buildCrossTab, summariseSegments, dayShort, dayLong } from "../../engine/engine.js";
import { T, PLAYER, card, pillBtn, segColor, selStyle, tipStyle } from "../theme.js";
import { gbp, gbp2, num, pct, pp, rel, secs } from "../format.js";
import { Chart, LegendLine, SectionTitle, ShareBar, SortTh, Term, useSortable } from "../shared.jsx";
import SmallMultiples from "./SmallMultiples.jsx";

// Each segment's line has a dash pattern as well as a colour, so the chart
// doesn't rely on colour alone (WCAG 1.4.1); the legend and the table rows
// show the same line sample.
const DASHES = ["", "7 4", "2 3", "10 3 2 3", "1 3", "5 2"];
const dashOf = (i) => DASHES[i % DASHES.length];
const MAX_LINES = 6;   // more than this and the overlaid lines become small multiples

/* The metrics a report can be viewed by — its "lens". Revenue is
   sessions × conversion × average order value, so a problem can live in
   any one of them; the lens decides what the chart plots and what the
   table's Was / Now / Δ compare. Counts are per day, so periods of
   different lengths compare fairly. */
const compactGbp = (v) => (v >= 1000 ? `£${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `£${Math.round(v)}`);
const compactNum = (v) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `${Math.round(v)}`);
export const LENS_DEFS = {
  conversionRate: { label: "Conversion rate", group: "Conv. rate", fmt: (v) => pct(v, 2), cell: (v) => pct(v, 1), axis: (v) => pct(v, 0) },
  sessions: { label: "Sessions", group: "Sessions per day", fmt: num, cell: num, axis: compactNum },
  revenue: { label: "Revenue", group: "Revenue per day", fmt: gbp, cell: gbp, axis: compactGbp },
  aov: { label: "Avg order value", group: "Avg order value", fmt: gbp2, cell: gbp2, axis: (v) => `£${Math.round(v)}` },
};

/* One dimension's report: a per-segment chart of the chosen lens plus the
   sortable GA-style table, optionally cross-tabbed by a secondary
   dimension. Keyed by the dimension, so switching report resets the pivot
   (the lens is the student's, and carries over). */
export default function ReportPanel({ caseData, reportDim, onPivot, range, lens = "conversionRate", onLens = () => {} }) {
  const [secondary, setSecondary] = useState(null);
  function chooseSecondary(key) { setSecondary(key); onPivot(reportDim.key, key); }
  const breakdown = useMemo(() => (secondary ? buildCrossTab(caseData, reportDim.key, secondary) : reportDim), [caseData, reportDim, secondary]);
  const summary = useMemo(() => summariseSegments(breakdown, range.cmp, range.cur), [breakdown, range.cmp, range.cur]);
  const L = LENS_DEFS[lens];
  const lines = breakdown.segments.length <= MAX_LINES;
  const pivoted = useMemo(() => (lines ? pivotByDay(breakdown.series, breakdown.segments.map((s) => s.id), lens) : null), [breakdown, lines, lens]);
  const unit = breakdown.isCrossTab ? "combination" : "segment";

  return (
    <div className="rise" style={card()}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
        <SectionTitle>{breakdown.isCrossTab ? breakdown.label : reportDim.label} — {L.label.toLowerCase()}</SectionTitle>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13.5, color: T.muted }}>Secondary dimension</span>
          <select aria-label="Add a secondary dimension to cross-tab this report" value={secondary || ""} onChange={(e) => chooseSecondary(e.target.value || null)}
            style={{ ...selStyle(secondary), padding: "7px 10px" }}>
            <option value="">None</option>
            {DIMENSIONS.filter((d) => d.key !== reportDim.key).map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <span id={`dd-lens-${reportDim.key}`} style={{ fontSize: 13.5, color: T.muted }}>View by</span>
        <div role="group" aria-labelledby={`dd-lens-${reportDim.key}`} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {LENSES.map((k) => <button key={k} onClick={() => onLens(k)} aria-pressed={lens === k} style={{ ...pillBtn(lens === k), padding: "6px 11px", fontSize: 13.5 }}>{LENS_DEFS[k].label}</button>)}
        </div>
      </div>
      {breakdown.isCrossTab && <div style={{ fontSize: 13, color: T.amber, marginBottom: 8 }}>↳ Cross-tab: every {reportDim.label} × {DMAP[secondary].label} combination. Watch for a single cell behaving unlike the rest.</div>}
      {lines ? (
        <>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13.5, color: T.muted, margin: "2px 0 6px" }}>
            {breakdown.segments.map((s, i) => <LegendLine key={s.id} color={segColor(i)} dash={dashOf(i)} label={s.name} />)}
          </div>
          <Chart label={`Line chart of daily ${L.label.toLowerCase()}, one line per ${unit}: ${breakdown.segments.map((s) => s.name).join(", ")}. The current period is shaded red. The table below gives each one's figures.`}>
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={pivoted} margin={{ top: 6, right: 14, bottom: 0, left: -6 }}>
                <CartesianGrid stroke={T.border} strokeDasharray="3 3" />
                <XAxis dataKey="day" tickLine={false} tickFormatter={dayShort} interval={3} />
                <YAxis tickLine={false} width={52} tickFormatter={L.axis} />
                <Tooltip contentStyle={tipStyle} formatter={(v, id) => [L.fmt(v), breakdown.segments.find((s) => s.id === id)?.name || id]} labelFormatter={dayLong} />
                <ReferenceArea x1={range.cur[0]} x2={range.cur[1]} fill={PLAYER} fillOpacity={0.08} />
                {breakdown.segments.map((s, i) => <Line key={s.id} type="monotone" dataKey={s.id} stroke={segColor(i)} strokeDasharray={dashOf(i)} strokeWidth={2.3} dot={false} isAnimationActive={false} />)}
              </LineChart>
            </ResponsiveContainer>
          </Chart>
        </>
      ) : (
        <SmallMultiples breakdown={breakdown} summary={summary} lens={lens} lensDef={L} range={range} unit={unit} />
      )}
      <SegmentTable breakdown={breakdown} summary={summary} lens={lens} />
    </div>
  );
}
// Rows of { day, [segId]: value } for the multi-line chart.
function pivotByDay(seriesBySeg, segIds, key) {
  const days = seriesBySeg[segIds[0]].map((r) => r.day);
  return days.map((day, i) => { const row = { day }; for (const id of segIds) row[id] = seriesBySeg[id][i][key]; return row; });
}

/* ---- the GA-style sortable breakdown table ------------------------- */
// `group` tags let the header show metric families. The Was / Now / Δ
// columns follow the lens; their keys stay the same whichever lens is on,
// so a sort the student picked survives switching lens.
const td = (align, extra) => ({ padding: "6px 8px", textAlign: align, fontFamily: T.mono, whiteSpace: "nowrap", color: T.muted, ...extra });
const deltaColor = (d) => (d < -0.15 ? T.neg : d > 0.15 ? T.pos : T.muted);
const tableCols = (lens) => {
  const L = LENS_DEFS[lens];
  return [
    { key: "name", label: "Segment", align: "left", group: "", render: (r, segIdx, small) => (
      <th scope="row" style={{ padding: "6px 8px", display: "flex", alignItems: "center", gap: 7, textAlign: "left", fontWeight: 400 }}>
        {!small && <svg width="20" height="8" aria-hidden="true" style={{ flexShrink: 0 }}><line x1="1" y1="4" x2="19" y2="4" stroke={segColor(segIdx)} strokeWidth="2.5" strokeDasharray={dashOf(segIdx)} /></svg>}
        <span style={{ fontFamily: T.body, color: T.text }}>{r.name}</span>
      </th>) },
    { key: "sessionsLate", label: "Sessions", group: "Users", render: (r) => <td style={td("right", { color: T.text })}>{num(r.sessionsLate)}</td> },
    { key: "shareLate", label: "Share", group: "Users", render: (r) => <td style={td("right")}><ShareBar share={r.shareLate} /></td> },
    { key: "engRateLate", label: "Engagement", group: "Engagement", render: (r) => <td style={td("right")}>{pct(r.engRateLate, 1)}</td> },
    { key: "engTimeLate", label: "Avg time", group: "Engagement", render: (r) => <td style={td("right")}>{secs(r.engTimeLate)}</td> },
    { key: "eventsLate", label: "Events", group: "Engagement", render: (r) => <td style={td("right")}>{num(r.eventsLate)}</td> },
    { key: "was", label: "Was", group: L.group, render: (r) => <td style={td("right")}>{L.cell(r.lens[lens].was)}</td> },
    { key: "now", label: "Now", group: L.group, render: (r) => <td style={td("right", { color: T.text })}>{L.cell(r.lens[lens].now)}</td> },
    { key: "delta", label: "Δ", group: L.group, render: (r) => {
      const c = r.lens[lens];
      return <td style={td("right", { fontWeight: 700, color: deltaColor(c.delta) })}>{rel(c.delta, 0)}{lens === "conversionRate" && <span style={{ fontWeight: 400, color: T.muted }}> {pp(c.now - c.was, 1)}</span>}</td>;
    } },
    { key: "revenueLate", label: "Revenue", group: "Totals", render: (r) => <td style={td("right")}>{gbp(r.revenueLate)}</td> },
  ];
};
// Group-header row: consecutive columns sharing a family span one cell.
const groupsOf = (cols) => cols.reduce((gs, c) => {
  const last = gs[gs.length - 1];
  if (last && last.group === c.group) last.span++; else gs.push({ group: c.group, span: 1 });
  return gs;
}, []);

function SegmentTable({ breakdown, summary, lens }) {
  const cols = useMemo(() => tableCols(lens), [lens]);
  const valueOf = useCallback((row, key) => (key === "was" || key === "now" || key === "delta" ? row.lens[lens][key] : row[key]), [lens]);
  const sort = useSortable(summary, valueOf); // unsorted = engine default, by share desc
  const small = breakdown.segments.length > MAX_LINES;   // small multiples: no line samples to match
  return (
    <div role="region" aria-label="Segment comparison table (scrollable)" tabIndex={0} style={{ marginTop: 12, overflowX: "auto" }}>
      <div style={{ fontSize: 12.5, color: T.muted, marginBottom: 6, lineHeight: 1.5 }}>
        Comparison period vs current · click a column to sort. <b style={{ color: T.text }}>Was / Now / Δ</b> follow the metric you are viewing by; counts there are per day, so periods of different lengths compare fairly.
        {" "}Δ is the relative change (−50% means halved){lens === "conversionRate" && <>, with the absolute change in <Term term="pp">percentage points (pp)</Term> beside it</>}. Sessions and Revenue on the right are totals for the current period.
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 760 }}>
        <thead>
          <tr>{groupsOf(cols).map((g, i) => <th key={i} colSpan={g.span} style={{ textAlign: g.group === "" ? "left" : "right", padding: "2px 8px", color: T.muted, fontSize: 11.5, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>{g.group}</th>)}</tr>
          <tr>{cols.map((c) => <SortTh key={c.key} sort={sort} colKey={c.key} label={c.label} align={c.align} />)}</tr>
        </thead>
        <tbody>
          {sort.rows.map((row) => {
            const segIdx = breakdown.segments.findIndex((s) => s.id === row.id);
            return <tr key={row.id}>{cols.map((c) => <React.Fragment key={c.key}>{c.render(row, segIdx, small)}</React.Fragment>)}</tr>;
          })}
        </tbody>
      </table>
    </div>
  );
}
