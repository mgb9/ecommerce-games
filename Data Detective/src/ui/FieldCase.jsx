import React, { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  FIELD_DATA, FIELD_CASE, FIELD_VERDICTS, FIELD_GUNS, FIELD_REMEDIES,
  FIELD_EXPLANATION, FIELD_REPORTS, FIELD_REPORT_META, scoreFieldDiagnosis,
} from "../engine/fieldcase.js";
import { gbp, pct } from "../engine/engine.js";
import { T, PLAYER, card, btn, pickRow, tipStyle, SectionTitle, Term, TermsHint, LOBadges, PT, Stat, PlainToggle } from "./App.jsx";

/* ============================================================
   Case 5 — "The Cold Case". Real 2015 GA exports as static,
   sortable reports. The mechanic differs from cases 1–4: instead
   of finding a broken segment in generated series, the student
   FLAGS rows as evidence (🚩) while reading raw, uncleaned data,
   then makes three calls: verdict, smoking gun, first action.
   ============================================================ */

const fmtDur = (s) => `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, "0")}s`;
const fint = (v) => Math.round(v).toLocaleString("en-GB");
const CELL_FMT = {
  int: (v) => fint(v),
  pct0: (v) => pct(v, 0),
  pct1: (v) => pct(v, 1),
  pct2: (v) => pct(v, 2),
  num2: (v) => v.toFixed(2),
  secs: (v) => fmtDur(v),
  gbp: (v) => gbp(v),
  gbp2: (v) => "£" + v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
};

// resolve a column's raw value for sorting + display (share/aov are derived)
function colValue(row, col, shareTotal) {
  if (col.type === "share") return shareTotal > 0 ? row.sessions / shareTotal : 0;
  if (col.type === "gbpAov") return row.trans > 0 ? row.revenue / row.trans : 0;
  return row[col.key];
}
function renderCell(row, col, shareTotal) {
  const v = colValue(row, col, shareTotal);
  if (col.type === "share") {
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 30, height: 5, borderRadius: 5, background: T.track, overflow: "hidden" }}>
          <div style={{ width: `${Math.min(100, Math.round(v * 100))}%`, height: "100%", background: T.instructor }} />
        </div>
        <span>{pct(v, 0)}</span>
      </div>
    );
  }
  if (col.type === "gbpAov") return row.trans > 0 ? gbp(v) : "—";
  return CELL_FMT[col.type](v);
}

/* ---- the sortable report table with the flag column ---------------- */
function FieldTable({ reportKey, rows, cols, flags, onToggleFlag }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("desc");
  const shareTotal = useMemo(() => rows.reduce((a, r) => a + (r.sessions || 0), 0), [rows]);
  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const col = cols.find((c) => c.key === sortKey);
    return [...rows].sort((a, b) => {
      const cmp = colValue(a, col, shareTotal) - colValue(b, col, shareTotal);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, cols, sortKey, sortDir, shareTotal]);
  function onSort(key) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }
  return (
    <div role="region" aria-label="Report data table (scrollable)" tabIndex={0} style={{ marginTop: 12, overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 760 }}>
        <thead>
          <tr>
            <th style={{ width: 34 }} aria-label="Flag as evidence" />
            <th style={{ textAlign: "left", padding: "4px 8px", borderBottom: `1px solid ${T.border}`, color: T.muted, fontWeight: 600 }}>Row</th>
            {cols.map((c) => (
              <th key={c.key} onClick={() => onSort(c.key)}
                style={{ textAlign: "right", padding: "4px 8px", borderBottom: `1px solid ${T.border}`, color: sortKey === c.key ? PLAYER : T.muted, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", userSelect: "none" }}>
                {c.label}{sortKey === c.key ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const flagged = flags.includes(row.id);
            const aggregate = row.id.endsWith("-other") || row.id.endsWith("-total");
            return (
              <tr key={row.id} style={{ background: flagged ? PLAYER + "14" : "transparent" }}>
                <td style={{ padding: "4px 2px 4px 8px" }}>
                  <button onClick={() => onToggleFlag(row.id)} title={flagged ? "Remove from evidence" : "Flag as evidence"}
                    aria-label={`${flagged ? "Unflag" : "Flag"} ${row.name}`} aria-pressed={flagged}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, opacity: flagged ? 1 : 0.32, filter: flagged ? "none" : "grayscale(1)", padding: 2 }}>🚩</button>
                </td>
                <td style={{ padding: "6px 8px", maxWidth: 340 }}>
                  <span title={row.name} style={{ fontFamily: aggregate ? T.body : T.mono, fontSize: aggregate ? 12 : 11.5, color: aggregate ? T.muted : T.text, fontStyle: aggregate ? "italic" : "normal", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</span>
                </td>
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

/* ---- overview: KPI cards + the daily sessions series ---------------- */
function FieldOverview() {
  const t = FIELD_DATA.channels.total;
  const kpis = [
    { label: "Sessions", value: fint(t.sessions) },
    { label: "New users", value: fint(t.newUsers) },
    { label: "Bounce rate", value: pct(t.bounce, 1) },
    { label: "Pages / session", value: t.pages.toFixed(2) },
    { label: "Avg session", value: fmtDur(t.dur) },
    { label: "Conv rate", value: pct(t.conv, 2) },
    { label: "Transactions", value: fint(t.trans) },
    { label: "Revenue", value: gbp(t.revenue) },
  ];
  return (
    <div className="rise">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14 }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ ...card(), padding: "14px 16px" }}>
            <div style={{ color: T.muted, fontSize: 10.5, letterSpacing: 0.4, textTransform: "uppercase" }}>{k.label}</div>
            <div style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 21, marginTop: 3 }}>{k.value}</div>
          </div>
        ))}
      </div>
      <div style={{ ...card(), marginTop: 16 }}>
        <SectionTitle>Sessions per day — {FIELD_CASE.period}</SectionTitle>
        <ResponsiveContainer width="100%" height={230}>
          <LineChart data={FIELD_DATA.daily} margin={{ top: 8, right: 14, bottom: 0, left: -6 }}>
            <CartesianGrid stroke={T.border} strokeDasharray="3 3" />
            <XAxis dataKey="date" tickLine={false} interval={6} />
            <YAxis tickLine={false} width={52} tickFormatter={fint} />
            <Tooltip contentStyle={tipStyle} formatter={(v) => [fint(v), "Sessions"]} />
            <Line type="monotone" dataKey="sessions" stroke={PLAYER} strokeWidth={2.2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
        <div style={{ marginTop: 10, fontSize: 12.5, color: T.muted, lineHeight: 1.55 }}>
          No sudden cliffs here — this case is not about WHEN something broke. The question is whether the numbers in the reports can be believed at all. Open the reports on the left, read the row names as carefully as the figures, and 🚩 flag anything you would put in front of the board.
        </div>
      </div>
      <div style={{ ...card(), marginTop: 16, fontSize: 13, lineHeight: 1.6 }}>
        <span style={{ color: T.muted }}>The claim under audit — </span>
        <i>“Referral converts at 16% against Paid Search's 1.2% — cut the AdWords budget and invest in referral partnerships.”</i>
        <span style={{ color: T.muted }}> Sixteen percent. In consumer electronics. Ask yourself what kind of “visitor” converts one time in six, check that source's <Term term="aov">AOV</Term>, and remember this property has no <Term term="exclusionlist">referral exclusion list</Term> and no filters for <Term term="testtraffic">test traffic</Term> — nobody set them up.</span>
      </div>
    </div>
  );
}

/* ---- investigate ----------------------------------------------------- */
function FieldInvestigate({ activeReport, openReport, viewed, flags, onToggleFlag, onDiagnose }) {
  const meta = FIELD_REPORT_META[activeReport];
  const navItem = (key, label, indent) => {
    const on = activeReport === key;
    return (
      <button key={key} onClick={() => openReport(key)} style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 8, padding: indent ? "7px 10px 7px 22px" : "8px 10px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: T.body, fontSize: 13, fontWeight: on ? 700 : 500, background: on ? T.sel : "transparent", color: on ? PLAYER : T.text }}>
        <span style={{ flex: 1 }}>{label}</span>
        {viewed.includes(key) && key !== "overview" && <span style={{ color: T.pos, fontSize: 11 }}>✓</span>}
      </button>
    );
  };
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 24, letterSpacing: -0.5, margin: 0 }}>Analytics — 2015 archive</h2>
        <div style={{ fontSize: 12, color: T.muted, fontFamily: T.mono }}>{FIELD_CASE.period} · 🚩 {flags.length} flagged</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "210px minmax(0,1fr)", gap: 20, marginTop: 14, alignItems: "start" }}>
        <div style={{ position: "sticky", top: 70, alignSelf: "start", display: "flex", flexDirection: "column", gap: 2 }}>
          {navItem("overview", "🏠 Overview")}
          {FIELD_REPORTS.map((g) => (
            <div key={g.group} style={{ marginTop: 10 }}>
              <div style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: T.muted, padding: "2px 10px 4px" }}>{g.group}</div>
              {g.items.map((it) => navItem(it.key, it.label, true))}
            </div>
          ))}
          <button onClick={onDiagnose} style={{ ...btn(PLAYER), width: "100%", marginTop: 18, padding: "11px 14px", fontSize: 13.5 }}>Present findings →</button>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 8, lineHeight: 1.5, padding: "0 4px" }}>Flag rows with 🚩 first — your evidence list is part of the score.</div>
        </div>
        <div>
          {activeReport === "overview" ? <FieldOverview /> : (
            <div className="rise" style={card()}>
              <SectionTitle>{meta.title}</SectionTitle>
              <div style={{ fontSize: 11.5, color: T.muted, lineHeight: 1.5 }}>{meta.note} Click a column to sort. 🚩 flags a row as evidence.</div>
              <FieldTable reportKey={activeReport} rows={FIELD_DATA[activeReport].rows.concat(FIELD_DATA[activeReport].total ? [FIELD_DATA[activeReport].total] : [])} cols={meta.cols} flags={flags} onToggleFlag={onToggleFlag} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- diagnose --------------------------------------------------------- */
function FieldPickGroup({ title, options, value, onChange }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {options.map((o) => (
          <button key={o.id} onClick={() => onChange(o.id)} style={{ ...pickRow(value === o.id), textAlign: "left", lineHeight: 1.45, fontWeight: 500 }}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}
function rowName(id) {
  for (const key of ["channels", "sourceMedium", "device", "age", "landingPages", "products"]) {
    const hit = FIELD_DATA[key].rows.find((r) => r.id === id) || (FIELD_DATA[key].total?.id === id ? FIELD_DATA[key].total : null);
    if (hit) return hit.name;
  }
  return id;
}
function FieldDiagnose({ guess, setGuess, flags, onBack, onSubmit }) {
  const ready = guess.verdict && guess.gun && guess.remedy;
  return (
    <div className="rise" style={{ marginTop: 22, maxWidth: 980, marginLeft: "auto", marginRight: "auto" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 26, letterSpacing: -0.5, margin: 0 }}>Present your findings</h2>
        <button onClick={onBack} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 14 }}>← back to the reports</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1fr)", gap: 18, marginTop: 14 }}>
        <div style={card()}>
          <FieldPickGroup title="1 · Your verdict to the board" options={FIELD_VERDICTS} value={guess.verdict} onChange={(id) => setGuess((g) => ({ ...g, verdict: id }))} />
          <FieldPickGroup title="2 · The smoking gun — the one row that proves the revenue figure cannot be trusted" options={FIELD_GUNS} value={guess.gun} onChange={(id) => setGuess((g) => ({ ...g, gun: id }))} />
          <FieldPickGroup title="3 · The first action" options={FIELD_REMEDIES} value={guess.remedy} onChange={(id) => setGuess((g) => ({ ...g, remedy: id }))} />
        </div>
        <div style={{ ...card(), alignSelf: "start" }}>
          <SectionTitle>🚩 Your evidence ({flags.length})</SectionTitle>
          {flags.length === 0 ? (
            <div style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.5 }}>Nothing flagged. You can still submit, but a verdict without evidence is just an opinion — go back and flag the rows that prove your case.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {flags.map((id) => (
                <div key={id} title={rowName(id)} style={{ fontFamily: T.mono, fontSize: 11, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>· {rowName(id)}</div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div style={{ textAlign: "center", marginTop: 18 }}>
        <button onClick={onSubmit} disabled={!ready} style={{ ...btn(PLAYER), opacity: ready ? 1 : 0.45, cursor: ready ? "pointer" : "not-allowed" }}>{ready ? "Submit findings →" : "Make all three calls to continue"}</button>
      </div>
    </div>
  );
}

/* ---- reveal ------------------------------------------------------------ */
function FieldFieldRow({ ok, label, you, truth }) {
  return (
    <div style={{ padding: "9px 0", borderBottom: `1px solid ${T.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: T.muted, fontSize: 12.5 }}>{label}</span>
        <span style={{ color: ok ? T.pos : T.neg, fontWeight: 700, fontSize: 13 }}>{ok ? "✓" : "✗"}</span>
      </div>
      <div style={{ fontSize: 13, marginTop: 2, lineHeight: 1.5 }}>You said <b>{you}</b>{!ok && <span style={{ color: T.muted }}> · actually <b style={{ color: T.text }}>{truth}</b></span>}</div>
    </div>
  );
}
function FieldReveal({ guess, result, onAgain, onExit }) {
  const label = (opts, id) => opts.find((o) => o.id === id)?.label || "—";
  const short = (s) => (s.length > 110 ? s.slice(0, 107) + "…" : s);
  return (
    <div className="rise" style={{ marginTop: 22 }}>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{ color: T.muted, fontFamily: T.mono, fontSize: 12, letterSpacing: 2 }}>CASE 5 — CLOSED</div>
        <h1 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 38, margin: "6px 0", letterSpacing: -0.5 }}>
          {result.fieldsCorrect}/3 calls · {result.cluesFound}/{result.clueTotal} clues found
        </h1>
        {result.coreFound < result.coreTotal && <div style={{ color: T.amber, fontSize: 13 }}>You missed {result.coreTotal - result.coreFound} of the {result.coreTotal} core clues — the ones the whole case turns on.</div>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 18 }}>
        <div style={card()}>
          <SectionTitle>Your calls vs the truth</SectionTitle>
          <FieldFieldRow ok={result.verdictCorrect} label="Verdict" you={short(label(FIELD_VERDICTS, guess.verdict))} truth={short(label(FIELD_VERDICTS, "measurement-broken"))} />
          <FieldFieldRow ok={result.gunCorrect} label="Smoking gun" you={label(FIELD_GUNS, guess.gun)} truth={label(FIELD_GUNS, "gun-sandbox")} />
          <FieldFieldRow ok={result.remedyCorrect} label="First action" you={short(label(FIELD_REMEDIES, guess.remedy))} truth={short(label(FIELD_REMEDIES, "rem-exclusions"))} />
          <div style={{ marginTop: 12, fontSize: 11.5, color: T.muted }}>These were real exports from a real retailer's Google Analytics — every number you just argued about actually happened in autumn 2015.</div>
        </div>
        <div style={card()}>
          <SectionTitle>What actually happened</SectionTitle>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, color: T.text, marginTop: 0 }}>{FIELD_EXPLANATION}</p>
        </div>
      </div>
      <div style={{ ...card(), marginTop: 18 }}>
        <SectionTitle>The clue chain — what you found, what you missed</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {result.clueDetail.map((c) => (
            <div key={c.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: c.found ? "#1f2e18" : "#2A2731", color: c.found ? T.pos : T.neg, whiteSpace: "nowrap", marginTop: 1 }}>{c.found ? "FLAGGED" : "MISSED"}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{c.label}{c.core && <span style={{ color: T.amber, fontWeight: 600, fontSize: 11 }}> · core clue</span>}</div>
                <div style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.55, marginTop: 2 }}>{c.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ textAlign: "center", marginTop: 22, display: "flex", gap: 12, justifyContent: "center" }}>
        <button onClick={onAgain} style={btn(PLAYER)}>Work the case again ↺</button>
        <button onClick={onExit} style={{ ...btn("transparent"), border: `1.5px solid ${T.border}` }}>Back to the generated cases</button>
      </div>
    </div>
  );
}

/* ---- shell ------------------------------------------------------------- */
export default function FieldCase({ plain, togglePlain, onExit }) {
  const [phase, setPhase] = useState("intro");
  const [activeReport, setActiveReport] = useState("overview");
  const [viewed, setViewed] = useState([]);
  const [flags, setFlags] = useState([]);
  const [guess, setGuess] = useState({ verdict: null, gun: null, remedy: null });
  const [result, setResult] = useState(null);

  function openReport(key) { setActiveReport(key); if (key !== "overview") setViewed((v) => (v.includes(key) ? v : [...v, key])); }
  function toggleFlag(id) { setFlags((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id])); }
  function submit() { setResult(scoreFieldDiagnosis(guess, flags)); setPhase("reveal"); }
  function restart() { setPhase("intro"); setActiveReport("overview"); setViewed([]); setFlags([]); setGuess({ verdict: null, gun: null, remedy: null }); setResult(null); }

  const wide = phase === "investigate";
  const t = FIELD_CASE.ticket;
  return (
    <div>
      <div style={{ borderBottom: `1px solid ${T.border}`, background: "#1A181D", position: "sticky", top: 0, zIndex: 30 }}>
        <div style={{ maxWidth: wide ? 1380 : 1180, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span style={{ fontFamily: T.display, fontWeight: 700, fontSize: 22, letterSpacing: -0.5 }}>Data <span style={{ color: PLAYER }}>Detective</span></span>
            <span style={{ color: T.muted, fontSize: 13, fontFamily: T.mono }}>Chrichton · the cold case</span>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center", fontFamily: T.mono, fontSize: 13 }}>
            {phase !== "intro" && <Stat label="CASE" value="5" accent={PLAYER} />}
            {(phase === "investigate" || phase === "diagnose") && <Stat label="REPORTS" value={`${viewed.length}`} accent={T.instructor} />}
            {(phase === "investigate" || phase === "diagnose") && <Stat label="FLAGS" value={`${flags.length}`} accent={T.instructor} />}
            <PlainToggle plain={plain} toggle={togglePlain} />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: wide ? 1380 : 1180, margin: "0 auto", padding: "0 20px 64px" }}>
        {phase === "intro" && (
          <div className="rise" style={{ maxWidth: 720, margin: "44px auto 0" }}>
            <h1 style={{ fontFamily: T.display, fontWeight: 700, fontSize: 44, lineHeight: 1.08, letterSpacing: -1, margin: 0 }}>
              <PT rich={<>The numbers say cut Paid Search.<br /><span style={{ color: PLAYER }}>The numbers are lying.</span></>}
                  plain={<>The report says one channel is best.<br /><span style={{ color: PLAYER }}>Check if the data is telling the truth.</span></>} />
            </h1>
            <p style={{ color: T.muted, fontSize: 16, lineHeight: 1.6, marginTop: 18 }}>
              Cases 1–4 gave you clean data with one broken segment. This one is the opposite — <b style={{ color: T.text }}>real Google Analytics exports</b> from a real UK electronics retailer in 2015, exactly as they came out of the tool. Nothing is generated and nothing has been cleaned. Before you trust a single percentage, ask the detective's first question: <i>can this witness be believed?</i> Watch for <Term term="selfreferral">payment-gateway self-referrals</Term>, <Term term="testtraffic">test traffic</Term>, and check the <Term term="aov">AOV</Term> of anything that looks miraculous. Flag rows with 🚩 as you go — your evidence list is scored.
            </p>
            <LOBadges los={["LO3"]} />
            <TermsHint />
            <div style={{ marginTop: 20, background: "#131118", border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: T.muted, fontSize: 12, fontFamily: T.mono, marginBottom: 8 }}>
                <span>{t.channel}</span><span>{t.from}</span>
              </div>
              <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 17, marginBottom: 6 }}>{t.subject}</div>
              <div style={{ color: T.text, fontSize: 14, lineHeight: 1.55 }}>{t.body}</div>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 22, flexWrap: "wrap" }}>
              <button onClick={() => setPhase("investigate")} style={btn(PLAYER)}>Open the archive →</button>
              <button onClick={onExit} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 14 }}>← back to cases 1–4</button>
            </div>
          </div>
        )}
        {phase === "investigate" && (
          <FieldInvestigate activeReport={activeReport} openReport={openReport} viewed={viewed} flags={flags} onToggleFlag={toggleFlag} onDiagnose={() => setPhase("diagnose")} />
        )}
        {phase === "diagnose" && (
          <FieldDiagnose guess={guess} setGuess={setGuess} flags={flags} onBack={() => setPhase("investigate")} onSubmit={submit} />
        )}
        {phase === "reveal" && result && (
          <FieldReveal guess={guess} result={result} onAgain={restart} onExit={onExit} />
        )}
      </div>
    </div>
  );
}
