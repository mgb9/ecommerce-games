import React, { useMemo, useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from "recharts";
import { REPORTS, TOTAL_DAYS, realtimeSnapshot, precedingPeriod, summariseTopline, avgRange, dayShort, dayLong } from "../../engine/engine.js";
import { T, PLAYER, SEG_COLORS, card, pillBtn, tipStyle } from "../theme.js";
import { gbp, num, pct, secs } from "../format.js";
import { Chart, Dashboard, KpiTile, SectionTitle, SideNav, useNarrow } from "../shared.jsx";
import ReportPanel from "./ReportPanel.jsx";
import FunnelView from "./FunnelView.jsx";

/* ---- date range ------------------------------------------------------
   GA-style: a current window (last 7/14/21 days) compared against either
   the first week or the equal-length period just before it. Positioning
   the window matters — one that straddles the incident start, or a
   comparison that's also affected, dilutes the delta. The state is owned
   by GeneratedCase so it survives a trip to the diagnosis screen. */
const PRESETS = [7, 14, 21].map((n) => ({ label: `Last ${n} days`, win: [TOTAL_DAYS - n, TOTAL_DAYS - 1] }));
export function useDateRange() {
  const [cur, setCur] = useState(PRESETS[0].win);
  const [cmpMode, setCmpMode] = useState("first");   // "first" week | "preceding" period
  const cmp = useMemo(() => (cmpMode === "first" ? [0, 6] : precedingPeriod(cur)), [cmpMode, cur]);
  return { cur, setCur, cmp, cmpMode, setCmpMode, cmpName: cmpMode === "first" ? "Wk1" : "prev" };
}
const winLabel = ([lo, hi]) => `${dayShort(lo)}–${dayShort(hi)}`;
function DateRangeBar({ range }) {
  const { cur, setCur, cmp, cmpMode, setCmpMode } = range;
  const active = (w) => w[0] === cur[0] && w[1] === cur[1];
  return (
    <div style={{ ...card(), padding: "12px 16px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
      <span id="dd-cur-label" style={{ fontSize: 13.5, color: T.muted }}><span aria-hidden="true">📅</span> Current</span>
      <div role="group" aria-labelledby="dd-cur-label" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{PRESETS.map((p) => <button key={p.label} onClick={() => setCur(p.win)} aria-pressed={active(p.win)} style={pillBtn(active(p.win))}>{p.label}</button>)}</div>
      <span style={{ fontFamily: T.mono, fontSize: 13.5, color: T.text }}>{winLabel(cur)}</span>
      <span style={{ width: 1, height: 20, background: T.border }} />
      <span id="dd-cmp-label" style={{ fontSize: 13.5, color: T.muted }}>Compared to</span>
      <div role="group" aria-labelledby="dd-cmp-label" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button onClick={() => setCmpMode("first")} aria-pressed={cmpMode === "first"} style={pillBtn(cmpMode === "first")}>First week</button>
        <button onClick={() => setCmpMode("preceding")} aria-pressed={cmpMode === "preceding"} style={pillBtn(cmpMode === "preceding")}>Preceding period</button>
      </div>
      <span style={{ fontFamily: T.mono, fontSize: 13.5, color: T.muted }}>{winLabel(cmp)}</span>
    </div>
  );
}

/* ---- the dashboard shell -------------------------------------------- */
const NAV_TOP = [["home", "🏠 Home overview"], ["realtime", "🟢 Realtime"], ["funnel", "🔻 Funnel exploration"]];
const NAV_GROUPS = REPORTS.map((g) => ({ group: g.group, items: g.items.map((it) => ({ key: it.dim, label: it.label })) }));

export default function Investigate({ caseData, metric, setMetric, activeReport, openReport, onPivot, viewed, pivots, range, onDiagnose }) {
  const reportDim = caseData.breakdowns.find((d) => d.key === activeReport);
  return (
    <Dashboard title="Analytics" meta={`${viewed.length} reports · ${pivots.length} pivots checked`}
      toolbar={activeReport !== "realtime" && <DateRangeBar range={range} />}
      nav={<SideNav top={NAV_TOP} groups={NAV_GROUPS} active={activeReport} viewed={viewed} onOpen={openReport} cta="Submit diagnosis →" onCta={onDiagnose} />}>
      {activeReport === "home" && <HomeOverview caseData={caseData} metric={metric} setMetric={setMetric} range={range} />}
      {activeReport === "realtime" && <RealtimeView caseData={caseData} />}
      {activeReport === "funnel" && <FunnelView caseData={caseData} range={range} />}
      {reportDim && <ReportPanel key={reportDim.key} caseData={caseData} reportDim={reportDim} onPivot={onPivot} range={range} />}
    </Dashboard>
  );
}

/* ---- HOME: GA-style KPI cards + the topline chart -------------------- */
const METRICS = [
  { id: "conversionRate", label: "Conversion rate", fmt: (v) => pct(v, 2) },
  { id: "sessions", label: "Sessions", fmt: num },
  { id: "engagementRate", label: "Engagement rate", fmt: (v) => pct(v, 1) },
  { id: "revenue", label: "Revenue", fmt: (v) => gbp(v) },
];
// Indices into SEG_COLORS chosen to avoid 2 (red) and 4 (green), which are
// reserved for the up/down delta semantics elsewhere on these cards.
const KPI_CARDS = [
  { key: "sessions", label: "Sessions", fmt: num, colorIdx: 0 },
  { key: "newUsers", label: "New users", fmt: num, colorIdx: 5 },
  { key: "engagedSessions", label: "Engaged sessions", fmt: num, colorIdx: 1 },
  { key: "engagementRate", label: "Engagement rate", fmt: (v) => pct(v, 1), colorIdx: 3 },
  { key: "avgEngagementTime", label: "Avg engagement", fmt: secs, colorIdx: 0 },
  { key: "events", label: "Events", fmt: num, colorIdx: 5 },
  { key: "purchases", label: "Conversions", fmt: num, colorIdx: 1 },
  { key: "revenue", label: "Revenue", fmt: gbp, colorIdx: 3 },
];
const DeltaTag = ({ pctChange, suffix }) => (
  <span style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 13, color: pctChange >= 0 ? T.pos : T.neg }}>
    {pctChange >= 0 ? "▲" : "▼"} {Math.abs(pctChange * 100).toFixed(0)}%{suffix && <span style={{ color: T.muted, fontWeight: 500 }}> {suffix}</span>}
  </span>
);
function KpiCard({ label, value, fmt, pctChange, data, dataKey, color, cmpName }) {
  return (
    <KpiTile label={label} value={fmt(value)}>
      <DeltaTag pctChange={pctChange} suffix={`vs ${cmpName}`} />
      <div aria-hidden="true">
        <ResponsiveContainer width="100%" height={28}>
        <LineChart data={data} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.6} dot={false} isAnimationActive={false} />
        </LineChart>
        </ResponsiveContainer>
      </div>
    </KpiTile>
  );
}

function HomeOverview({ caseData, metric, setMetric, range }) {
  const { cur, cmp, cmpName } = range;
  const m = METRICS.find((x) => x.id === metric);
  const eventDays = useMemo(() => [...new Set(caseData.events.map((e) => e.day))], [caseData]);
  const toplineSummary = useMemo(() => summariseTopline(caseData.topline, cmp, cur), [caseData, cmp, cur]);
  const baselineAvg = useMemo(() => avgRange(caseData.topline, cmp, metric), [caseData, cmp, metric]);
  const currentAvg = useMemo(() => avgRange(caseData.topline, cur, metric), [caseData, cur, metric]);
  const narrow = useNarrow();
  const chartLabel = `Line chart of ${m.label.toLowerCase()} per day over the four weeks. The comparison period (${winLabel(cmp)}) is shaded grey and averaged ${m.fmt(baselineAvg)} a day; `
    + `the current period (${winLabel(cur)}) is shaded red and averages ${m.fmt(currentAvg)} a day. Pins mark the dated events listed below the chart.`;
  return (
    <div className="rise">
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))", gap: narrow ? 10 : 14 }}>
        {KPI_CARDS.map((k) => (
          <KpiCard key={k.key} label={k.label} value={toplineSummary[k.key].late} fmt={k.fmt} pctChange={toplineSummary[k.key].pctChange} data={caseData.topline} dataKey={k.key} color={SEG_COLORS[k.colorIdx]} cmpName={cmpName} />
        ))}
      </div>
      <div style={{ ...card(), marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <SectionTitle>Overview — {cmpName === "Wk1" ? "first week" : "preceding period"} (grey) vs current (red)</SectionTitle>
            <DeltaTag pctChange={toplineSummary[metric].pctChange} suffix={`vs ${cmpName}`} />
          </div>
          <div role="group" aria-label="Chart metric" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{METRICS.map((x) => <button key={x.id} onClick={() => setMetric(x.id)} aria-pressed={metric === x.id} style={pillBtn(metric === x.id)}>{x.label}</button>)}</div>
        </div>
        <Chart label={chartLabel}>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={caseData.topline} margin={{ top: 18, right: 14, bottom: 0, left: -6 }}>
            <CartesianGrid stroke={T.border} strokeDasharray="3 3" />
            <XAxis dataKey="day" tickLine={false} tickFormatter={dayShort} interval={3} type="number" domain={[0, TOTAL_DAYS - 1]} />
            <YAxis tickLine={false} width={56} tickFormatter={m.fmt} domain={["auto", "auto"]} />
            <Tooltip contentStyle={tipStyle} formatter={(v) => [m.fmt(v), m.label]} labelFormatter={dayLong} />
            <ReferenceArea x1={cmp[0]} x2={cmp[1]} fill={T.muted} fillOpacity={0.1} />
            <ReferenceArea x1={cur[0]} x2={cur[1]} fill={PLAYER} fillOpacity={0.12} />
            <ReferenceLine y={baselineAvg} stroke={T.muted} strokeDasharray="3 3" label={{ value: `${cmpName} avg`, position: "insideTopRight", fill: T.muted, fontSize: 11.5 }} />
            {eventDays.map((d) => <ReferenceLine key={d} x={d} stroke={T.amber} strokeDasharray="4 4" label={{ value: "📌", position: "top", fontSize: 14.5 }} />)}
            <Line type="monotone" dataKey={metric} stroke={PLAYER} strokeWidth={2.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
        </Chart>
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
          {eventDays.map((d) => <div key={d} style={{ fontSize: 13, color: T.muted }}><span aria-hidden="true">📌 </span><b style={{ color: T.text }}>{dayShort(d)}</b> — {caseData.events.filter((e) => e.day === d).map((e) => e.label).join(" · ")}</div>)}
        </div>
      </div>
      <div style={{ ...card(), marginTop: 16, fontSize: 14.5, color: T.muted, lineHeight: 1.55 }}>
        Pick a report from the menu to break the data down. On any report you can add a <b style={{ color: T.text }}>secondary dimension</b> to cross-tabulate, or open <b style={{ color: T.text }}>Funnel exploration</b> to see <i>which step</i> of the checkout broke.
      </div>
    </div>
  );
}

/* ---- REALTIME: flavour only, unrelated to the incident --------------- */
function RealtimeView({ caseData }) {
  const narrow = useNarrow();
  const rt = useMemo(() => realtimeSnapshot(caseData, "live"), [caseData]);
  const bars = rt.perMinute.map((v, i) => ({ i, v }));
  const list = (title, rows) => (
    <div style={card()}>
      <SectionTitle>{title}</SectionTitle>
      {rows.slice(0, 5).map((r) => (
        <div key={r.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${T.border}`, fontSize: 14.5 }}>
          <span>{r.name}</span><span style={{ fontFamily: T.mono, color: T.muted }}>{r.users}</span>
        </div>
      ))}
    </div>
  );
  return (
    <div className="rise">
      <div style={card()}>
        <SectionTitle><span aria-hidden="true">🟢 </span>Users in the last 30 minutes</SectionTitle>
        <div style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 40 }}>{rt.active}</div>
        <div style={{ fontSize: 13, color: T.muted, margin: "4px 0 10px" }}>Users per minute</div>
        <Chart label={`Bar chart of users per minute over the last 30 minutes, steady at ${Math.min(...rt.perMinute)}–${Math.max(...rt.perMinute)} a minute.`}>
          <ResponsiveContainer width="100%" height={90}>
            <BarChart data={bars} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <Bar dataKey="v" fill={T.pos} radius={[2, 2, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </Chart>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "minmax(0,1fr)" : "1fr 1fr", gap: 16, marginTop: 16 }}>
        {list("Top countries right now", rt.countries)}
        {list("Top landing pages right now", rt.pages)}
      </div>
      <div style={{ ...card(), marginTop: 16, fontSize: 14, color: T.muted, lineHeight: 1.5 }}>
        Realtime only shows the last 30 minutes. This is useful for finding a sudden outage while it is happening. To find a slow decline over several weeks, use the historical reports.
      </div>
    </div>
  );
}
