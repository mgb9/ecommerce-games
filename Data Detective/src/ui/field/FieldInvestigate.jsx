import React, { useCallback, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { FIELD_DATA, FIELD_CASE, FIELD_REPORTS, FIELD_REPORT_META, FIELD_REPORT_ROWS } from "../../engine/fieldcase.js";
import { T, PLAYER, card, tipStyle } from "../theme.js";
import { gbp, minSec, num, pct } from "../format.js";
import { Chart, Dashboard, KpiTile, SectionTitle, ShareBar, SideNav, SortTh, Term, useNarrow, useSortable } from "../shared.jsx";

const NAV_TOP = [["overview", "🏠 Overview"]];

export default function FieldInvestigate({ activeReport, openReport, viewed, flags, onToggleFlag, onDiagnose }) {
  const meta = FIELD_REPORT_META[activeReport];
  return (
    <Dashboard title="Analytics — 2015 archive" meta={`${FIELD_CASE.period} · 🚩 ${flags.length} flagged`}
      nav={
        <SideNav top={NAV_TOP} groups={FIELD_REPORTS} active={activeReport} viewed={viewed} onOpen={openReport} cta="Present findings →" onCta={onDiagnose}>
          <div style={{ fontSize: 12.5, color: T.muted, marginTop: 8, lineHeight: 1.5, padding: "0 4px" }}>Flag rows with 🚩 first — your evidence list is part of the score.</div>
        </SideNav>
      }>
      {activeReport === "overview" ? <FieldOverview /> : (
        <div className="rise" style={card()}>
          <SectionTitle>{meta.title}</SectionTitle>
          <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.5 }}>{meta.note} Click a column to sort. 🚩 flags a row as evidence.</div>
          {/* keyed: each report's columns differ, so its sort must not carry over */}
          <FieldTable key={activeReport} rows={FIELD_REPORT_ROWS[activeReport]} cols={meta.cols} flags={flags} onToggleFlag={onToggleFlag} />
        </div>
      )}
    </Dashboard>
  );
}

/* ---- overview: KPI cards + the daily sessions series ---------------- */
function FieldOverview() {
  const narrow = useNarrow();
  const t = FIELD_DATA.channels.total;
  const daily = FIELD_DATA.daily.map((d) => d.sessions);
  const kpis = [
    { label: "Sessions", value: num(t.sessions) },
    { label: "New users", value: num(t.newUsers) },
    { label: "Bounce rate", value: pct(t.bounce, 1) },
    { label: "Pages / session", value: t.pages.toFixed(2) },
    { label: "Avg session", value: minSec(t.dur) },
    { label: "Conv rate", value: pct(t.conv, 2) },
    { label: "Transactions", value: num(t.trans) },
    { label: "Revenue", value: gbp(t.revenue) },
  ];
  return (
    <div className="rise">
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))", gap: narrow ? 10 : 14 }}>
        {kpis.map((k) => <KpiTile key={k.label} label={k.label} value={k.value} />)}
      </div>
      <div style={{ ...card(), marginTop: 16 }}>
        <SectionTitle>Sessions per day — {FIELD_CASE.period}</SectionTitle>
        <Chart label={`Line chart of sessions per day across ${daily.length} days, ranging between ${num(Math.min(...daily))} and ${num(Math.max(...daily))} a day, with no sudden cliff.`}>
        <ResponsiveContainer width="100%" height={230}>
          <LineChart data={FIELD_DATA.daily} margin={{ top: 8, right: 14, bottom: 0, left: -6 }}>
            <CartesianGrid stroke={T.border} strokeDasharray="3 3" />
            <XAxis dataKey="date" tickLine={false} interval={6} />
            <YAxis tickLine={false} width={52} tickFormatter={num} />
            <Tooltip contentStyle={tipStyle} formatter={(v) => [num(v), "Sessions"]} />
            <Line type="monotone" dataKey="sessions" stroke={PLAYER} strokeWidth={2.2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
        </Chart>
        <div style={{ marginTop: 10, fontSize: 14, color: T.muted, lineHeight: 1.55 }}>
          No sudden cliffs here — this case is not about WHEN something broke. The question is whether the numbers in the reports can be believed at all. Open the reports from the menu, read the row names as carefully as the figures, and 🚩 flag anything you would put in front of the board.
        </div>
      </div>
      <div style={{ ...card(), marginTop: 16, fontSize: 14.5, lineHeight: 1.6 }}>
        <span style={{ color: T.muted }}>The claim under audit — </span>
        <i>“Referral converts at 16% against Paid Search's 1.2% — cut the AdWords budget and invest in referral partnerships.”</i>
        <span style={{ color: T.muted }}> Sixteen percent. In consumer electronics. Ask yourself what kind of “visitor” converts one time in six, check that source's <Term term="aov">AOV</Term>, and remember this property has no <Term term="exclusionlist">referral exclusion list</Term> and no filters for <Term term="testtraffic">test traffic</Term> — nobody set them up.</span>
      </div>
    </div>
  );
}

/* ---- the sortable report table with the flag column ---------------- */
const CELL_FMT = {
  int: num,
  pct0: (v) => pct(v, 0),
  pct1: (v) => pct(v, 1),
  pct2: (v) => pct(v, 2),
  num2: (v) => v.toFixed(2),
  secs: minSec,
  gbp: (v) => gbp(v),
  gbp2: (v) => "£" + v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
};
// A column's raw value, for sorting and display (share and AOV are derived).
function colValue(row, col, shareTotal) {
  if (col.type === "share") return shareTotal > 0 ? row.sessions / shareTotal : 0;
  if (col.type === "gbpAov") return row.trans > 0 ? row.revenue / row.trans : 0;
  return row[col.key];
}
function renderCell(row, col, shareTotal) {
  const v = colValue(row, col, shareTotal);
  if (col.type === "share") return <ShareBar share={v} />;
  if (col.type === "gbpAov") return row.trans > 0 ? gbp(v) : "—";
  return CELL_FMT[col.type](v);
}

function FieldTable({ rows, cols, flags, onToggleFlag }) {
  const shareTotal = useMemo(() => rows.reduce((a, r) => a + (r.sessions || 0), 0), [rows]);
  const valueOf = useCallback((row, key) => colValue(row, cols.find((c) => c.key === key), shareTotal), [cols, shareTotal]);
  const sort = useSortable(rows, valueOf);
  return (
    <div role="region" aria-label="Report data table (scrollable)" tabIndex={0} style={{ marginTop: 12, overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 760 }}>
        <thead>
          <tr>
            <th style={{ width: 34 }} aria-label="Flag as evidence" />
            <th style={{ textAlign: "left", padding: "4px 8px", borderBottom: `1px solid ${T.border}`, color: T.muted, fontWeight: 600 }}>Row</th>
            {cols.map((c) => <SortTh key={c.key} sort={sort} colKey={c.key} label={c.label} />)}
          </tr>
        </thead>
        <tbody>
          {sort.rows.map((row) => {
            const flagged = flags.includes(row.id);
            const aggregate = row.id.endsWith("-other") || row.id.endsWith("-total");
            return (
              <tr key={row.id} style={{ background: flagged ? PLAYER + "14" : "transparent" }}>
                <td style={{ padding: "4px 2px 4px 8px" }}>
                  <button onClick={() => onToggleFlag(row.id)} title={flagged ? "Remove from evidence" : "Flag as evidence"}
                    aria-label={`${flagged ? "Unflag" : "Flag"} ${row.name}`} aria-pressed={flagged}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 15.5, opacity: flagged ? 1 : 0.32, filter: flagged ? "none" : "grayscale(1)", padding: 2 }}>🚩</button>
                </td>
                <th scope="row" style={{ padding: "6px 8px", maxWidth: 340, textAlign: "left", fontWeight: 400 }}>
                  <span title={row.name} style={{ fontFamily: aggregate ? T.body : T.mono, fontSize: aggregate ? 13.5 : 13, color: aggregate ? T.muted : T.text, fontStyle: aggregate ? "italic" : "normal", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</span>
                </th>
                {cols.map((c) => (
                  <td key={c.key} style={{ padding: "6px 8px", textAlign: "right", fontFamily: T.mono, whiteSpace: "nowrap", color: c.key === "sessions" || c.key === "qty" ? T.text : T.muted }}>
                    {renderCell(row, c, shareTotal)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
