import React, { useMemo } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from "recharts";
import { REPORTS, TOTAL_DAYS, realtimeSnapshot, summariseTopline, avgRange, dayShort, dayLong } from "../../engine/engine.js";
import { PRESETS } from "./dateRange.js";
import { T, PLAYER, SEG_COLORS, card, pillBtn, tipStyle } from "../theme.js";
import { gbp, num, pct, secs } from "../format.js";
import { Chart, Dashboard, KpiTile, LegendLine, SectionTitle, SideNav, useNarrow } from "../shared.jsx";
import ReportPanel from "./ReportPanel.jsx";
import FunnelView from "./FunnelView.jsx";

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
const NAV_TOP = [["home", "🏠 Home overview"], ["realtime", "🟢 Realtime"], ["funnel", "🔻 Funnel exploration"], ["orders", "🧾 Back-office orders"]];
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
      {activeReport === "orders" && <OrdersView caseData={caseData} range={range} />}
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

/* ---- BACK-OFFICE ORDERS: the ground truth ------------------------------
   Orders from the order database, not from analytics. Analytics normally
   records about 96% of them (ad blockers and cookie refusals hide the
   rest). Comparing the two is how an analyst tells a broken shop from a
   broken tag. Present in every case, so its existence gives nothing away. */
function OrdersView({ caseData, range }) {
  const { cur, cmp, cmpName } = range;
  const narrow = useNarrow();
  const sum = useMemo(() => summariseTopline(caseData.topline, cmp, cur), [caseData, cmp, cur]);
  const coverage = (win) => { const rows = caseData.topline.filter((r) => r.day >= win[0] && r.day <= win[1]); return rows.reduce((a, r) => a + r.purchases, 0) / rows.reduce((a, r) => a + r.orders, 0); };
  const covCmp = coverage(cmp), covCur = coverage(cur);
  const label = `Line chart of daily back-office orders and analytics conversions over the four weeks. In the comparison period (${winLabel(cmp)}) analytics recorded ${pct(covCmp, 0)} of orders; in the current period (${winLabel(cur)}), ${pct(covCur, 0)}.`;
  return (
    <div className="rise">
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "minmax(0,1fr)" : "repeat(3,minmax(0,1fr))", gap: narrow ? 10 : 14 }}>
        <KpiTile label="Orders (back office)" value={num(sum.orders.late)}><DeltaTag pctChange={sum.orders.pctChange} suffix={`vs ${cmpName}`} /></KpiTile>
        <KpiTile label="Conversions (analytics)" value={num(sum.purchases.late)}><DeltaTag pctChange={sum.purchases.pctChange} suffix={`vs ${cmpName}`} /></KpiTile>
        <KpiTile label="Orders seen by analytics" value={`${pct(covCmp, 0)} → ${pct(covCur, 0)}`}><span style={{ fontSize: 13, color: T.muted }}>{cmpName} → current</span></KpiTile>
      </div>
      <div style={{ ...card(), marginTop: 16 }}>
        <SectionTitle>🧾 Back-office orders vs analytics conversions</SectionTitle>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13.5, color: T.muted, marginBottom: 6 }}>
          <LegendLine color={T.text} label="Orders (order database)" />
          <LegendLine color={PLAYER} dash="6 4" label="Conversions (analytics)" />
        </div>
        <Chart label={label}>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={caseData.topline} margin={{ top: 8, right: 14, bottom: 0, left: -6 }}>
              <CartesianGrid stroke={T.border} strokeDasharray="3 3" />
              <XAxis dataKey="day" tickLine={false} tickFormatter={dayShort} interval={3} type="number" domain={[0, TOTAL_DAYS - 1]} />
              <YAxis tickLine={false} width={48} tickFormatter={num} />
              <Tooltip contentStyle={tipStyle} formatter={(v, k) => [num(v), k === "orders" ? "Orders (back office)" : "Conversions (analytics)"]} labelFormatter={dayLong} />
              <ReferenceArea x1={cur[0]} x2={cur[1]} fill={PLAYER} fillOpacity={0.08} />
              <Line type="monotone" dataKey="orders" stroke={T.text} strokeWidth={2.3} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="purchases" stroke={PLAYER} strokeWidth={2.3} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </Chart>
        <p style={{ fontSize: 14, color: T.muted, lineHeight: 1.55, margin: "10px 0 0" }}>
          Back-office orders come from the order database, not from analytics. Analytics normally records about 96% of them — ad blockers and cookie refusals hide the rest. The order system can't tell you which device, browser or campaign an order came from; analytics can.
        </p>
      </div>
    </div>
  );
}
